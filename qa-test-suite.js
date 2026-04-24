/**
 * QA Smoke Suite
 *
 * This file is intentionally lightweight. Production duel setup behavior lives in
 * duel-setup-runtime.js. The index.html script tag is kept for backwards
 * compatibility and to run cheap browser-side smoke checks.
 */
(function () {
  'use strict';

  const REQUIRED_GLOBALS = [
    'StorageManager',
    'BattleBalance'
  ];

  function loadDuelSetupRuntimeIfNeeded() {
    if (window.DuelSetupRuntime?.initialized) return;
    if (document.querySelector('script[src*="duel-setup-runtime.js"]')) return;

    const script = document.createElement('script');
    script.src = 'duel-setup-runtime.js?v=3.6';
    script.defer = true;
    script.onload = () => console.info('✅ DuelSetupRuntime loaded by QA compatibility loader');
    script.onerror = () => console.warn('⚠️ DuelSetupRuntime konnte nicht geladen werden');
    document.head.appendChild(script);
  }

  function assertRequiredDom() {
    const requiredIds = [
      'btnOpenDuelSetup',
      'duelSetupSheetOverlay',
      'duelSetupSheet',
      'gameModeSelection',
      'duelSettingsContent'
    ];

    const missing = requiredIds.filter((id) => !document.getElementById(id));
    if (missing.length) {
      console.warn('⚠️ QA Smoke: fehlende Duel-Setup-DOM-Elemente:', missing.join(', '));
      return false;
    }

    console.info('✅ QA Smoke: Duel-Setup-DOM vorhanden');
    return true;
  }

  function assertRequiredGlobals() {
    const missing = REQUIRED_GLOBALS.filter((name) => typeof window[name] === 'undefined');
    if (missing.length) {
      console.warn('⚠️ QA Smoke: fehlende globale Module:', missing.join(', '));
      return false;
    }

    console.info('✅ QA Smoke: Kernmodule geladen');
    return true;
  }

  function assertBalanceConfig() {
    if (!window.BattleBalance?.BALANCE_TARGETS) return false;

    const expected = {
      lg40: ['easy', 'real', 'hard', 'elite'],
      lg60: ['easy', 'real', 'hard', 'elite'],
      kk50: ['easy', 'real', 'hard', 'elite'],
      kk100: ['easy', 'real', 'hard', 'elite'],
      kk3x20: ['easy', 'real', 'hard', 'elite']
    };

    const missing = [];
    for (const [discipline, difficulties] of Object.entries(expected)) {
      for (const difficulty of difficulties) {
        if (!window.BattleBalance.BALANCE_TARGETS[discipline]?.[difficulty]) {
          missing.push(`${discipline}/${difficulty}`);
        }
      }
    }

    if (missing.length) {
      console.warn('⚠️ QA Smoke: fehlende Balance-Ziele:', missing.join(', '));
      return false;
    }

    console.info('✅ QA Smoke: Balance-Ziele vollständig');
    return true;
  }

  function runSmokeChecks() {
    loadDuelSetupRuntimeIfNeeded();
    assertRequiredDom();
    assertRequiredGlobals();
    assertBalanceConfig();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runSmokeChecks);
  } else {
    runSmokeChecks();
  }

  window.QASmokeSuite = {
    run: runSmokeChecks,
    assertRequiredDom,
    assertRequiredGlobals,
    assertBalanceConfig
  };
})();
