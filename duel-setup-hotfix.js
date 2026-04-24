/*
 * Duel Setup Hotfix
 *
 * Macht den "DUELL STARTEN"-Button robuster, falls die ursprünglichen
 * Bottom-Sheet-Funktionen aus app.js nicht sauber geladen werden oder einzelne
 * DOM-Elemente fehlen. Diese Datei muss nach app.js geladen werden.
 */
(function () {
  'use strict';

  function byId(id) {
    return document.getElementById(id);
  }

  window.openDuelSetup = function openDuelSetup() {
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
    });
  };

  window.closeDuelSetup = function closeDuelSetup(event) {
    const overlay = byId('duelSetupSheetOverlay');
    const sheet = byId('duelSetupSheet');

    if (!overlay || !sheet) return;
    if (event && event.target !== overlay) return;

    overlay.style.opacity = '0';
    sheet.style.bottom = '-100%';
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
