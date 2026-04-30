/**
 * Online-Status-Hinweis.
 *
 * Zeigt einen kleinen, freundlichen Banner, wenn die Online-Funktionen
 * (Supabase / Worker / Netzwerk) gerade nicht erreichbar sind. Lokales
 * Training läuft trotzdem weiter — das ist die Kernaussage des Banners.
 *
 * Trigger:
 *  - browser-Event `offline`
 *  - browser-Event `online` (Banner ausblenden)
 *  - explizites globales Event `schuetzen:online-warning` (mit { reason })
 *  - poll: window.SupabaseBackendSync.isWorkerAuthBlocked() → true
 *
 * Bewusst kein Modal, kein Blocker. Nur ein dismissbarer Hinweis.
 */
(function () {
  'use strict';

  if (typeof document === 'undefined' || typeof window === 'undefined') return;

  const HOST_ID = 'onlineStatusBanner';
  const STATE = { mounted: false, visible: false, dismissed: false };

  function ensureMount() {
    let el = document.getElementById(HOST_ID);
    if (!el) {
      el = document.createElement('div');
      el.id = HOST_ID;
      el.setAttribute('role', 'status');
      el.setAttribute('aria-live', 'polite');
      el.style.cssText = [
        'position:fixed', 'left:50%', 'transform:translateX(-50%)',
        'bottom:90px', 'z-index:9990',
        'max-width:min(420px, calc(100vw - 32px))',
        'background:rgba(20,28,18,0.96)', 'color:#e8f1d6',
        'border:1px solid rgba(255,180,0,0.45)', 'border-radius:14px',
        'padding:10px 12px', 'font-size:0.82rem',
        'box-shadow:0 10px 30px rgba(0,0,0,0.45)',
        'display:none', 'gap:10px', 'align-items:flex-start',
        'pointer-events:auto'
      ].join(';');
      document.body.appendChild(el);
    }
    return el;
  }

  function show(message) {
    if (STATE.dismissed) return;
    const el = ensureMount();
    STATE.mounted = true;
    STATE.visible = true;
    el.style.display = 'flex';
    el.innerHTML = `
      <div style="font-size:1.1rem;line-height:1;">📡</div>
      <div style="flex:1;min-width:0;">
        <div style="font-weight:700;color:#ffd699;margin-bottom:2px;">Online-Funktionen gerade nicht verfügbar</div>
        <div style="color:rgba(232,241,214,0.85);">${escHtml(message || 'Lokales Training, Schnelltraining und Trainings-Challenges funktionieren weiter.')}</div>
      </div>
      <button type="button" data-osb-close
        style="background:transparent;color:rgba(255,255,255,0.65);border:0;font-size:1.1rem;cursor:pointer;padding:2px 6px;">✕</button>
    `;
    const close = el.querySelector('[data-osb-close]');
    if (close) close.addEventListener('click', () => {
      STATE.dismissed = true;
      hide();
    });
  }

  function hide() {
    if (!STATE.mounted) return;
    const el = document.getElementById(HOST_ID);
    if (el) el.style.display = 'none';
    STATE.visible = false;
  }

  function escHtml(s) {
    if (s === null || s === undefined) return '';
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function evaluate() {
    try {
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        show('Du bist gerade offline. Lokales Training funktioniert trotzdem weiter.');
        return;
      }
      const sync = window.SupabaseBackendSync;
      if (sync && typeof sync.isWorkerAuthBlocked === 'function' && sync.isWorkerAuthBlocked()) {
        show('Server gerade nicht erreichbar. Lokales Training funktioniert weiter.');
        return;
      }
      // Alles ok — aber wir verstecken nur, wenn der User noch nicht aktiv weggeklickt hat.
      if (STATE.visible && !STATE.dismissed) hide();
    } catch (_e) {
      // Stille Fehler — Banner soll niemals selbst Crash auslösen.
    }
  }

  function bindEvents() {
    window.addEventListener('offline', () => evaluate());
    window.addEventListener('online', () => {
      // Online wieder → Banner darf wieder erscheinen, falls nötig.
      STATE.dismissed = false;
      evaluate();
    });
    window.addEventListener('schuetzen:online-warning', (event) => {
      const reason = (event && event.detail && event.detail.reason) || '';
      show(reason || 'Online-Funktionen sind gerade nicht verfügbar. Lokales Training funktioniert weiter.');
    });
  }

  function init() {
    bindEvents();
    // Erste Auswertung nach kurzer Verzögerung, damit Sync-Module ggf. schon Status melden konnten.
    setTimeout(evaluate, 1500);
    // Sanftes Polling: alle 30 s Status checken (sehr günstig).
    setInterval(evaluate, 30000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }

  window.OnlineStatus = Object.freeze({
    show, hide, evaluate,
  });
})();
