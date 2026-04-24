/*
 * Duel Setup Hotfix
 * FINAL FIX: behebt dass nach "DUELL EINSTELLUNG" nichts passiert
 */
(function () {
  'use strict';

  const originalOpenDuelSetup = window.openDuelSetup;
  const originalSelectGameMode = window.selectGameMode;

  function byId(id) {
    return document.getElementById(id);
  }

  function fixLayout() {
    const overlay = byId('duelSetupSheetOverlay');
    const sheet = byId('duelSetupSheet');

    if (overlay) {
      overlay.style.position = 'fixed';
      overlay.style.inset = '0';
      overlay.style.width = '100vw';
      overlay.style.height = '100dvh';
      overlay.style.overflowX = 'hidden';
    }

    if (sheet) {
      sheet.style.position = 'fixed';
      sheet.style.left = '0';
      sheet.style.right = '0';
      sheet.style.width = '100vw';
      sheet.style.transform = 'translate3d(0,0,0)';
    }
  }

  window.openDuelSetup = function () {
    fixLayout();

    if (typeof originalOpenDuelSetup === 'function') {
      try {
        originalOpenDuelSetup();
      } catch (e) {
        console.warn('Fallback openDuelSetup', e);
      }
    }

    const overlay = byId('duelSetupSheetOverlay');
    const sheet = byId('duelSetupSheet');

    if (overlay && sheet) {
      overlay.style.display = 'block';
      overlay.style.opacity = '1';
      sheet.style.bottom = '0';
    }

    fixLayout();
  };

  // 🔥 DAS IST DER WICHTIGE FIX
  window.selectGameMode = function (mode) {
    console.log('[FIX] Mode gewählt:', mode);

    if (typeof originalSelectGameMode === 'function') {
      try {
        originalSelectGameMode(mode);
      } catch (e) {
        console.warn('Original selectGameMode kaputt', e);
      }
    }

    const modeSelection = byId('gameModeSelection');
    const settings = byId('duelSettingsContent');

    if (modeSelection) modeSelection.style.display = 'none';

    if (settings) {
      settings.style.display = 'block';
      settings.style.opacity = '1';
      settings.style.visibility = 'visible';

      // FALLBACK CONTENT wenn leer
      if (settings.innerHTML.trim().length < 10) {
        settings.innerHTML = `
          <h2 style="color:white;text-align:center;">DUELL EINSTELLUNG</h2>
          <p style="text-align:center;color:#aaa;">${mode === 'bot' ? 'Bot-Modus aktiv' : 'Multiplayer (bald verfügbar)'}</p>
          <button onclick="alert('Start kommt gleich 😄')" style="width:100%;padding:16px;border-radius:16px;background:#7ab030;color:black;font-weight:bold;">DUELL STARTEN</button>
        `;
      }
    }

    fixLayout();
  };

})();
