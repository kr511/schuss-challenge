/**
 * Gemini AI compatibility shim.
 *
 * The app currently uses local OCR/image analysis only. This file intentionally
 * exposes a tiny no-op surface so the legacy <script src="gemini-ai.js"> tag
 * never produces a 404 or blocks the rest of the app during startup.
 */
(function () {
  'use strict';

  if (window.GeminiAI) return;

  const disabledMessage = 'Gemini AI ist in dieser App-Konfiguration deaktiviert.';

  window.GeminiAI = {
    enabled: false,
    available: false,
    reason: disabledMessage,
    async init() {
      return false;
    },
    async analyze() {
      return { ok: false, reason: disabledMessage };
    },
    async scoreTarget() {
      return { ok: false, reason: disabledMessage };
    },
    getStatus() {
      return {
        enabled: false,
        available: false,
        reason: disabledMessage
      };
    }
  };

  console.info('[GeminiAI] Disabled compatibility shim loaded.');
})();
