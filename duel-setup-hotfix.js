/*
 * Duel Setup Hotfix compatibility layer.
 *
 * The production flow now lives in duel-setup-runtime.js. This file intentionally
 * does not override openDuelSetup/selectGameMode/startBattle anymore. It remains
 * as a safe no-op because updates.js still loads this legacy filename on older
 * pages/caches.
 */
(function () {
  'use strict';

  function loadScriptOnce(src) {
    var base = src.split('?')[0];
    if (document.querySelector('script[src^="' + base + '"]')) return;
    var script = document.createElement('script');
    script.src = src;
    script.defer = true;
    document.head.appendChild(script);
  }

  // Keep the compact dashboard behavior from the previous compatibility file.
  loadScriptOnce('dashboard-compact-panel.js?v=1.0');

  if (window.DuelSetupRuntime && window.DuelSetupRuntime.initialized) {
    console.info('[DuelFix] Runtime already active; legacy hotfix skipped.');
    return;
  }

  function loadRuntimeOnce() {
    if (window.DuelSetupRuntime && window.DuelSetupRuntime.initialized) return;
    if (document.querySelector('script[src*="duel-setup-runtime.js"]')) return;

    var script = document.createElement('script');
    script.src = 'duel-setup-runtime.js?v=4.5';
    script.defer = true;
    script.onload = function () { console.info('[DuelFix] Runtime loaded by legacy compatibility layer.'); };
    script.onerror = function () { console.warn('[DuelFix] Could not load duel-setup-runtime.js'); };
    document.head.appendChild(script);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadRuntimeOnce, { once: true });
  } else {
    loadRuntimeOnce();
  }
})();
