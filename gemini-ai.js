/**
 * Legacy placeholder.
 *
 * Gemini/Google-KI wurde aus Schuss Challenge entfernt.
 * Diese Datei bleibt nur vorübergehend als leerer Kompatibilitäts-Stub bestehen,
 * falls ältere gecachte index.html-Versionen sie noch laden.
 *
 * Wichtig: Dieser Stub lädt keinen API-Key, ruft keine externe Gemini-API auf
 * und sendet keine Bilddaten an Google.
 */
(function () {
  'use strict';

  window.GeminiCoach = {
    async analyzePhoto() {
      return {
        score: null,
        tips: 'KI-Fotoanalyse wurde entfernt. Nutze die lokale Foto-/OCR-Auswertung.',
        shots: [],
        error: 'gemini_removed'
      };
    },
    isAvailable() {
      return false;
    },
    async loadApiKey() {
      return null;
    },
    setApiKey() {
      return null;
    },
    generateEnhancedCoachingPrompt() {
      return '';
    }
  };
})();
