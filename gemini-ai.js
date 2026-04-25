/**
 * Gemini AI compatibility shim.
 *
 * The app currently uses local OCR/image analysis only. This file intentionally
 * exposes a small no-op surface so the legacy <script src="gemini-ai.js"> tag
 * never produces a 404 or blocks startup.
 *
 * Until index.html is cleaned up, this shim also loads extracted helper modules.
 * The actual local-mode and profile-scroll logic lives in separate files.
 */
(function () {
  'use strict';

  function loadScriptOnce(src) {
    var base = src.split('?')[0];
    if (document.querySelector('script[src^="' + base + '"]')) return;
    var script = document.createElement('script');
    script.src = src;
    script.defer = true;
    (document.head || document.documentElement).appendChild(script);
  }

  loadScriptOnce('local-entry.js?v=1.2');
  loadScriptOnce('profile-scroll-fix.js?v=1.0');

  if (window.GeminiAI) return;

  var disabledMessage = 'Gemini AI ist in dieser App-Konfiguration deaktiviert.';

  window.GeminiAI = {
    enabled: false,
    available: false,
    reason: disabledMessage,
    init: async function () { return false; },
    analyze: async function () { return { ok: false, reason: disabledMessage }; },
    scoreTarget: async function () { return { ok: false, reason: disabledMessage }; },
    getStatus: function () {
      return { enabled: false, available: false, reason: disabledMessage };
    }
  };

  console.info('[GeminiAI] Disabled compatibility shim loaded.');
})();
