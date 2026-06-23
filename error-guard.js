/**
 * Globaler Error-Guard — Sicherheitsnetz für die gesamte App.
 *
 * Fängt nicht abgefangene Fehler (`error`) und Promise-Rejections
 * (`unhandledrejection`) zentral ab, damit ein einzelnes fehlerhaftes Modul
 * nicht die ganze Erfahrung lahmlegt:
 *
 *  - Netzwerk-/Fetch-Fehler werden in den bestehenden, nicht-blockierenden
 *    Online-Status-Hinweis (`schuetzen:online-warning`) umgeleitet, statt als
 *    "Uncaught (in promise)" die Konsole zu fluten. Lokales Training läuft weiter.
 *  - Abgebrochene Anfragen (AbortError, z. B. Such-Debounce) werden still
 *    geschluckt — das ist erwartbares Verhalten.
 *  - Bekanntes Browser-Rauschen (ResizeObserver-Loop, Cross-Origin "Script error.")
 *    wird unterdrückt.
 *  - Echte Programmierfehler bleiben in der Konsole sichtbar (kein stilles
 *    Verschlucken), werden aber dedupliziert, damit Fehlerschleifen die Konsole
 *    nicht zumüllen.
 *
 * Wird als allererstes Script geladen, damit auch Boot-Fehler erfasst werden.
 */
(function () {
  'use strict';

  if (typeof window === 'undefined') return;
  if (window.__schuetzenErrorGuard) return; // Doppel-Initialisierung verhindern
  window.__schuetzenErrorGuard = true;

  var MAX_HISTORY = 25;       // Ring-Puffer für die Debug-Ansicht
  var DEDUP_WINDOW_MS = 3000; // Gleiche Meldung in diesem Fenster nur einmal loggen
  var history = [];
  var lastLogged = Object.create(null);

  function safe(fn) {
    try { return fn(); } catch (_e) { return undefined; }
  }

  function describe(reason) {
    if (reason === null || reason === undefined) return String(reason);
    if (reason instanceof Error) return (reason.name || 'Error') + ': ' + (reason.message || '');
    if (typeof reason === 'object') return safe(function () { return JSON.stringify(reason); }) || '[object]';
    return String(reason);
  }

  function reasonText(reason) {
    if (!reason) return '';
    if (typeof reason === 'string') return reason;
    return String(reason.message || reason.reason || reason.name || '');
  }

  function reasonName(reason) {
    return (reason && typeof reason === 'object' && reason.name) ? String(reason.name) : '';
  }

  // Abgebrochene Anfragen sind erwartbar und kein Fehler.
  function isAbortError(reason) {
    if (reasonName(reason) === 'AbortError') return true;
    return /\baborted\b|\bcancell?ed\b/i.test(reasonText(reason));
  }

  // Erkennt Netzwerk-/Fetch-Fehler über Browser-Grenzen hinweg.
  function isNetworkError(reason) {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return true;
    var name = reasonName(reason);
    var text = reasonText(reason);
    if (name === 'NetworkError') return true;
    if (name === 'TypeError' && /fetch|network/i.test(text)) return true;
    return /failed to fetch|networkerror|load failed|network request failed|connection appears to be offline|err_internet_disconnected|err_network/i
      .test(text);
  }

  // Bekanntes, harmloses Browser-Rauschen ohne Aussagekraft.
  function isBenignNoise(message, event) {
    if (/resizeobserver loop/i.test(message)) return true;
    // Cross-Origin-Skripte liefern nur "Script error." ohne Stack — nicht verwertbar.
    if (message === 'Script error.' && event && !event.filename) return true;
    return false;
  }

  function record(type, message) {
    history.push({ type: type, message: String(message).slice(0, 500), t: Date.now() });
    if (history.length > MAX_HISTORY) history.shift();
  }

  // Dedupliziertes Logging: gleiche Meldung max. einmal pro Zeitfenster.
  function logOnce(level, prefix, detail, extra) {
    var key = level + '|' + describe(detail);
    var now = Date.now();
    if (lastLogged[key] && (now - lastLogged[key]) < DEDUP_WINDOW_MS) return;
    lastLogged[key] = now;
    var logger = (typeof console !== 'undefined' && console[level]) ? console[level] : null;
    if (!logger) return;
    safe(function () {
      if (extra !== undefined) logger(prefix, detail, extra);
      else logger(prefix, detail);
    });
  }

  function notifyOnlineWarning(message) {
    safe(function () {
      window.dispatchEvent(new CustomEvent('schuetzen:online-warning', {
        detail: { reason: message, source: 'error-guard' }
      }));
    });
  }

  function handleRejection(event) {
    safe(function () {
      var reason = event ? event.reason : undefined;

      if (isAbortError(reason)) {
        if (event && typeof event.preventDefault === 'function') event.preventDefault();
        return;
      }

      if (isNetworkError(reason)) {
        record('network', describe(reason));
        notifyOnlineWarning('Online-Funktionen sind gerade nicht erreichbar. Lokales Training funktioniert weiter.');
        logOnce('warn', '[ErrorGuard] Netzwerkfehler abgefangen (App läuft weiter):', reason);
        if (event && typeof event.preventDefault === 'function') event.preventDefault();
        return;
      }

      record('rejection', describe(reason));
      logOnce('error', '[ErrorGuard] Unbehandelte Promise-Rejection:', reason);
      // preventDefault hält die Konsole sauber; wir haben den Fehler bereits geloggt.
      if (event && typeof event.preventDefault === 'function') event.preventDefault();
    });
  }

  function handleError(event) {
    safe(function () {
      if (!event) return;
      var message = event.message || (event.error && event.error.message) || '';
      if (isBenignNoise(message, event)) {
        if (typeof event.preventDefault === 'function') event.preventDefault();
        return;
      }
      var location = event.filename
        ? (' (' + event.filename + ':' + (event.lineno || 0) + ':' + (event.colno || 0) + ')')
        : '';
      record('error', (message || describe(event.error)) + location);
      // Kein preventDefault: echte Fehler bleiben für DevTools voll sichtbar.
      logOnce('error', '[ErrorGuard] Unbehandelter Fehler:', event.error || message, location || undefined);
    });
  }

  window.addEventListener('error', handleError, true);
  window.addEventListener('unhandledrejection', handleRejection);

  window.ErrorGuard = Object.freeze({
    isNetworkError: isNetworkError,
    isAbortError: isAbortError,
    isBenignNoise: isBenignNoise,
    /** Manuelles Melden eines abgefangenen Fehlers aus try/catch-Blöcken. */
    report: function (reason, context) {
      record('manual', (context ? context + ': ' : '') + describe(reason));
      logOnce('warn', '[ErrorGuard] ' + (context || 'Gemeldeter Fehler') + ':', reason);
    },
    /** Liefert eine Kopie der zuletzt erfassten Fehler (für die Debug-Ansicht). */
    getErrors: function () { return history.slice(); }
  });
})();
