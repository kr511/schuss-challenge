/**
 * Gemini AI compatibility shim.
 *
 * The app currently uses local OCR/image analysis only. This file intentionally
 * exposes a small no-op surface so the legacy <script src="gemini-ai.js"> tag
 * never produces a 404 or blocks startup.
 */
(function () {
  'use strict';

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
