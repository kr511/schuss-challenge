/*
 * Duel Setup Hotfix
 *
 * Stabilisiert den "DUELL STARTEN"-Flow auf Mobile. Einige Geräte interpretieren
 * die ursprünglichen inline Bottom-Sheet-Styles so, dass das Sheet beim Öffnen
 * horizontal verspringt. Dieser Hotfix fixiert das Sheet bewusst am Viewport.
 */
(function () {
  'use strict';

  function byId(id) {
    return document.getElementById(id);
  }

  function lockHorizontalOverflow() {
    document.documentElement.style.overflowX = 'hidden';
    document.body.style.overflowX = 'hidden';
    document.body.style.width = '100%';
  }

  function prepareOverlayAndSheet(overlay, sheet) {
    overlay.style.position = 'fixed';
    overlay.style.inset = '0';
    overlay.style.width = '100vw';
    overlay.style.maxWidth = '100vw';
    overlay.style.height = '100dvh';
    overlay.style.overflowX = 'hidden';
    overlay.style.zIndex = '9000';
    overlay.style.display = 'block';
    overlay.style.opacity = '0';

    sheet.style.position = 'fixed';
    sheet.style.left = '0';
    sheet.style.right = '0';
    sheet.style.bottom = '-100%';
    sheet.style.width = '100vw';
    sheet.style.maxWidth = '100vw';
    sheet.style.boxSizing = 'border-box';
    sheet.style.margin = '0';
    sheet.style.transform = 'translate3d(0, 0, 0)';
    sheet.style.overflowX = 'hidden';
  }

  window.openDuelSetup = function openDuelSetup() {
    const overlay = byId('duelSetupSheetOverlay');
    const sheet = byId('duelSetupSheet');
    const modeSelection = byId('gameModeSelection');
    const settingsContent = byId('duelSettingsContent');
    const startButton = byId('btnOpenDuelSetup');

    if (!overlay || !sheet) {
      console.error('[DuelSetup] Missing required elements', {
        overlay: !!overlay,
        sheet: !!sheet
      });
      return;
    }

    lockHorizontalOverflow();
    prepareOverlayAndSheet(overlay, sheet);

    if (startButton) {
      startButton.style.transform = 'translateX(-50%)';
      startButton.style.left = '50%';
      startButton.style.right = 'auto';
    }

    if (modeSelection) modeSelection.style.display = 'block';
    if (settingsContent) settingsContent.style.display = 'none';

    document.body.style.overflow = 'hidden';

    requestAnimationFrame(function () {
      overlay.style.opacity = '1';
      sheet.style.bottom = '0';
      sheet.style.transform = 'translate3d(0, 0, 0)';
    });
  };

  window.closeDuelSetup = function closeDuelSetup(event) {
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
    const modeSelection = byId('gameModeSelection');
    const settingsContent = byId('duelSettingsContent');

    if (modeSelection) modeSelection.style.display = 'block';
    if (settingsContent) settingsContent.style.display = 'none';
  };
})();
