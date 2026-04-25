/**
 * QA Smoke Suite
 *
 * This file is intentionally lightweight. Production duel setup behavior lives in
 * duel-setup-runtime.js. The index.html script tag is kept for backwards
 * compatibility and to run cheap browser-side smoke checks.
 */
(function () {
  'use strict';

  const hasBrowserDom = typeof window !== 'undefined' && typeof document !== 'undefined';
  const root = typeof globalThis !== 'undefined' ? globalThis : {};

  const ASSET_VERSION = '4.5';
  const REQUIRED_GLOBALS = [
    'StorageManager',
    'BattleBalance'
  ];

  function loadDuelSetupRuntimeIfNeeded() {
    if (!hasBrowserDom) return false;
    if (window.DuelSetupRuntime?.initialized) return true;
    if (document.querySelector('script[src*="duel-setup-runtime.js"]')) return true;

    const script = document.createElement('script');
    script.src = `duel-setup-runtime.js?v=${ASSET_VERSION}`;
    script.async = false;
    script.defer = true;
    script.onload = () => console.info('✅ DuelSetupRuntime loaded by QA compatibility loader');
    script.onerror = () => console.warn('⚠️ DuelSetupRuntime konnte nicht geladen werden');
    document.head.appendChild(script);
    return true;
  }

  function assertRequiredDom() {
    if (!hasBrowserDom) {
      console.warn('⚠️ QA Smoke: Browser-DOM nicht verfügbar, DOM-Checks werden übersprungen.');
      return false;
    }

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
    if (!hasBrowserDom) {
      console.warn('⚠️ QA Smoke: Browser-DOM nicht verfügbar, Global-Checks werden übersprungen.');
      return false;
    }

    const missing = REQUIRED_GLOBALS.filter((name) => typeof window[name] === 'undefined');
    if (missing.length) {
      console.warn('⚠️ QA Smoke: fehlende globale Module:', missing.join(', '));
      return false;
    }

    console.info('✅ QA Smoke: Kernmodule geladen');
    return true;
  }

  function assertBalanceConfig() {
    if (!hasBrowserDom) {
      console.warn('⚠️ QA Smoke: Browser-DOM nicht verfügbar, Balance-Checks werden übersprungen.');
      return false;
    }

    if (!window.BattleBalance?.BALANCE_TARGETS) {
      console.warn('⚠️ QA Smoke: BattleBalance.BALANCE_TARGETS fehlt');
      return false;
    }

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
    if (!hasBrowserDom) {
      console.warn('⚠️ QA Smoke: Browser-DOM nicht verfügbar, Checks werden übersprungen.');
      return false;
    }

    loadDuelSetupRuntimeIfNeeded();

    const domOk = assertRequiredDom();
    const globalsOk = assertRequiredGlobals();
    const balanceOk = assertBalanceConfig();

    return domOk && globalsOk && balanceOk;
  }

  if (hasBrowserDom) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', runSmokeChecks);
    } else {
      runSmokeChecks();
    }
  } else {
    runSmokeChecks();
  }

  root.QASmokeSuite = {
    run: runSmokeChecks,
    assertRequiredDom,
    assertRequiredGlobals,
    assertBalanceConfig
  };
})();
