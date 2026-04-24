/*
 * Duel Setup Hotfix
 *
 * Stabilisiert den "DUELL STARTEN"-Flow auf Mobile. Der Fix greift nur beim
 * Öffnen/Schließen des Bottom-Sheets ein und lässt die originale Duell-Logik
 * aus app.js weiterlaufen.
 */
(function () {
  'use strict';

  const originalOpenDuelSetup = window.openDuelSetup;
  const originalCloseDuelSetup = window.closeDuelSetup;
  const originalShowGameModeSelection = window.showGameModeSelection;

  function byId(id) {
    return document.getElementById(id);
  }

  function lockHorizontalOverflow() {
    document.documentElement.style.overflowX = 'hidden';
    document.body.style.overflowX = 'hidden';
    document.body.style.width = '100%';
  }

  function fixSheetLayout() {
    const overlay = byId('duelSetupSheetOverlay');
    const sheet = byId('duelSetupSheet');
    const startButton = byId('btnOpenDuelSetup');

    lockHorizontalOverflow();

    if (overlay) {
      overlay.style.position = 'fixed';
      overlay.style.inset = '0';
      overlay.style.width = '100vw';
      overlay.style.maxWidth = '100vw';
      overlay.style.height = '100dvh';
      overlay.style.overflowX = 'hidden';
      overlay.style.zIndex = '9000';
    }

    if (sheet) {
      sheet.style.position = 'fixed';
      sheet.style.left = '0';
      sheet.style.right = '0';
      sheet.style.width = '100vw';
      sheet.style.maxWidth = '100vw';
      sheet.style.boxSizing = 'border-box';
      sheet.style.margin = '0';
      sheet.style.transform = 'translate3d(0, 0, 0)';
      sheet.style.overflowX = 'hidden';
    }

    if (startButton) {
      startButton.style.left = '50%';
      startButton.style.right = 'auto';
      startButton.style.transform = 'translateX(-50%)';
    }
  }

  function safeFallbackOpen() {
    const overlay = byId('duelSetupSheetOverlay');
    const sheet = byId('duelSetupSheet');
    const modeSelection = byId('gameModeSelection');
    const settingsContent = byId('duelSettingsContent');

    if (!overlay || !sheet) {
      console.error('[DuelSetup] Missing required elements', {
        overlay: !!overlay,
        sheet: !!sheet
      });
      return;
    }

    if (modeSelection) modeSelection.style.display = 'block';
    if (settingsContent) settingsContent.style.display = 'none';

    overlay.style.display = 'block';
    document.body.style.overflow = 'hidden';

    requestAnimationFrame(function () {
      overlay.style.opacity = '1';
      sheet.style.bottom = '0';
      fixSheetLayout();
    });
  }

  window.openDuelSetup = function openDuelSetup() {
    fixSheetLayout();

    if (typeof originalOpenDuelSetup === 'function') {
      try {
        originalOpenDuelSetup.apply(this, arguments);
      } catch (error) {
        console.error('[DuelSetup] Original open failed, using fallback:', error);
        safeFallbackOpen();
      }
    } else {
      safeFallbackOpen();
    }

    requestAnimationFrame(fixSheetLayout);
    setTimeout(fixSheetLayout, 80);
  };

  window.closeDuelSetup = function closeDuelSetup(event) {
    if (typeof originalCloseDuelSetup === 'function') {
      try {
        originalCloseDuelSetup.apply(this, arguments);
        return;
      } catch (error) {
        console.error('[DuelSetup] Original close failed, using fallback:', error);
      }
    }

    const overlay = byId('duelSetupSheetOverlay');
    const sheet = byId('duelSetupSheet');

    if (!overlay || !sheet) return;
    if (event && event.target !== overlay) return;

    overlay.style.opacity = '0';
    sheet.style.bottom = '-100%';
    sheet.style.transform = 'translate3d(0, 0, 0)';
    document.body.style.overflow = '';

    setTimeout(function () {
      overlay.style.display = 'none';
    }, 350);
  };

  window.showGameModeSelection = function showGameModeSelection() {
    if (typeof originalShowGameModeSelection === 'function') {
      originalShowGameModeSelection.apply(this, arguments);
      requestAnimationFrame(fixSheetLayout);
      return;
    }

    const modeSelection = byId('gameModeSelection');
    const settingsContent = byId('duelSettingsContent');

    if (modeSelection) modeSelection.style.display = 'block';
    if (settingsContent) settingsContent.style.display = 'none';
  };

  window.addEventListener('resize', fixSheetLayout);
  window.addEventListener('orientationchange', function () {
    setTimeout(fixSheetLayout, 200);
  });
})();
