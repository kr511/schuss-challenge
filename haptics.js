// ─── haptics.js ──────────────────────────────────────────────────────────────
// Vibrations-Feedback für Schussduell.
// Nutzt die Vibration API (Android Chrome/Firefox). Auf iOS/Desktop still.
// Alle Funktionen sind global verfügbar und sicher (kein Fehler wenn API fehlt).

const Haptics = (() => {
  const ok = () => navigator.vibrate && typeof navigator.vibrate === 'function';

  return {
    // Einzelner Schuss — kurzes, scharfes Feedback
    shot() {
      if (ok()) navigator.vibrate(18);
    },

    // Treffer im Zentrum (X-Ring / 10er) — stärker
    bullseye() {
      if (ok()) navigator.vibrate([12, 30, 22]);
    },

    // Danebenschuss (Ring 1–4) — sanftes Feedback
    miss() {
      if (ok()) navigator.vibrate(8);
    },

    // Sieg — freudiges Muster
    win() {
      if (ok()) navigator.vibrate([40, 60, 40, 60, 80]);
    },

    // Niederlage — langsames, schweres Muster
    lose() {
      if (ok()) navigator.vibrate([80, 40, 80]);
    },

    // Unentschieden — neutrales Doppel-Tap
    draw() {
      if (ok()) navigator.vibrate([30, 50, 30]);
    },

    // Positions-Wechsel im 3×20 — mittleres Feedback
    positionChange() {
      if (ok()) navigator.vibrate([20, 40, 20, 40, 20]);
    },

    // Achievement freigeschaltet — besonderes Muster
    achievement() {
      if (ok()) navigator.vibrate([15, 25, 15, 25, 60]);
    },

    // Eingabefehler — kurzes Doppel-Tap
    inputError() {
      if (ok()) navigator.vibrate([10, 20, 10]);
    },

    // Timer-Warnung (letzte 10 Sekunden) — wiederholtes Pochen
    timerWarning() {
      if (ok()) navigator.vibrate([15, 200, 15]);
    },

    // Generisch: beliebiges Muster
    custom(pattern) {
      if (ok()) navigator.vibrate(pattern);
    }
  };
})();
