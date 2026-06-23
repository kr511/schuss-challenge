/*
 * App Bugfix Overrides
 *
 * Diese Datei enthält kleine, risikoarme Bugfixes für bestehende globale
 * Funktionen aus app.js. Sie wird nach app.js geladen und überschreibt nur
 * gezielte Funktionen, ohne die große app.js komplett ersetzen zu müssen.
 */
(function () {
  'use strict';

  window.toggleMute = function toggleMute() {
    if (typeof Sfx === 'undefined') return;

    Sfx.init();
    Sfx.muted = !Sfx.muted;

    const muteBtn = document.getElementById('muteBtn');
    if (muteBtn) {
      muteBtn.textContent = Sfx.muted ? '🔇' : '🔊';
    }

    if (!Sfx.muted) Sfx.play('click');
  };

  window.loadXP = function loadXP() {
    if (typeof G === 'undefined' || typeof StorageManager === 'undefined') return;

    if (typeof StorageManager.getNumber === 'function') {
      G.xp = StorageManager.getNumber('xp', 0);
      return;
    }

    const rawXP = Number(StorageManager.getRaw('xp', 0));
    G.xp = Number.isFinite(rawXP) ? rawXP : 0;
  };

  window.saveXP = function saveXP() {
    if (typeof G === 'undefined' || typeof StorageManager === 'undefined') return;

    const safeXP = Math.max(0, Math.floor(Number(G.xp) || 0));
    G.xp = safeXP;
    StorageManager.setRaw('xp', String(safeXP));

    if (typeof scheduleCloudSync === 'function') {
      scheduleCloudSync('xp_changed');
    }
  };
})();
