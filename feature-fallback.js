/*
 * Feature Detection & Fallback System
 * Also loads extracted compatibility helpers that used to live in gemini-ai.js.
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
})();

const FeatureFallback = (function () {
  'use strict';

  const featureStatus = {
    adaptiveBot: false,
    contextualOCR: false,
    multiScoreDetection: false,
    allFeaturesReady: false
  };

  const CONFIG = {
    enableFallbacks: true,
    logFeatureStatus: true,
    autoDisableOnError: true
  };

  function init() {
    console.log('🛡️ Feature Fallback System initialisiert');
    checkAllFeatures();
    setupErrorHandlers();
    setupFeatureListeners();
  }

  function setupFeatureListeners() {
    if (!CONFIG.enableFallbacks) return;

    window.addEventListener('featureReady', function (event) {
      const name = event.detail && event.detail.name;
      if (name && Object.prototype.hasOwnProperty.call(featureStatus, name)) {
        featureStatus[name] = true;
        updateReadyState();
        if (CONFIG.logFeatureStatus) console.log(`✅ Feature "${name}" ist bereit`);
      }
    });

    setTimeout(checkAllFeatures, 5000);
  }

  function updateReadyState() {
    featureStatus.allFeaturesReady = [
      featureStatus.adaptiveBot,
      featureStatus.contextualOCR,
      featureStatus.multiScoreDetection
    ].every(Boolean);
  }

  function checkAllFeatures() {
    featureStatus.adaptiveBot = checkFeature('AdaptiveBotSystem', function (mod) {
      return typeof mod.getStatistics === 'function' && typeof mod.getDifficultyRecommendation === 'function';
    });
    featureStatus.contextualOCR = checkFeature('ContextualOCR', function (mod) {
      return typeof mod.getStatistics === 'function' && typeof mod.CONFIG === 'object';
    });
    featureStatus.multiScoreDetection = checkFeature('MultiScoreDetection', function (mod) {
      return !!(mod.CONFIG && typeof mod.CONFIG.enableRegionDetection === 'boolean');
    });
    updateReadyState();

    if (CONFIG.logFeatureStatus) console.log('📊 Feature Status:', featureStatus);
    window.dispatchEvent(new CustomEvent('featureStatusChanged', { detail: { ...featureStatus } }));
  }

  function checkFeature(globalName, predicate) {
    try {
      const mod = window[globalName];
      return !!(mod && predicate(mod));
    } catch (error) {
      console.warn(`⚠️ ${globalName} Fehler:`, error);
      return false;
    }
  }

  function setupErrorHandlers() {
    if (!CONFIG.enableFallbacks) return;

    window.addEventListener('error', function (event) {
      const message = event.error && event.error.message ? event.error.message : '';
      const stack = event.error && event.error.stack ? event.error.stack : '';

      if (message.includes('AdaptiveBot') || stack.includes('adaptive-bot')) handleFeatureError('adaptiveBot');
      else if (message.includes('ContextualOCR') || stack.includes('contextual-ocr')) handleFeatureError('contextualOCR');
      else if (message.includes('MultiScoreDetection') || stack.includes('multi-score-detection')) handleFeatureError('multiScoreDetection');
    });

    window.addEventListener('unhandledrejection', function (event) {
      if (CONFIG.logFeatureStatus) console.error('🚨 Unhandled Promise Rejection:', event.reason);
    });
  }

  function handleFeatureError(featureName) {
    console.error(`❌ Fehler im Feature: ${featureName}`);
    if (CONFIG.autoDisableOnError) disableFeature(featureName);
    setTimeout(checkAllFeatures, 1000);
  }

  function disableFeature(featureName) {
    try {
      if (featureName === 'adaptiveBot' && window.AdaptiveBotSystem && typeof window.AdaptiveBotSystem.setEnabled === 'function') {
        window.AdaptiveBotSystem.setEnabled(false);
      }
      if (featureName === 'contextualOCR' && window.ContextualOCR && window.ContextualOCR.CONFIG) {
        window.ContextualOCR.CONFIG.enableContextualCorrections = false;
      }
      if (featureName === 'multiScoreDetection' && window.MultiScoreDetection && window.MultiScoreDetection.CONFIG) {
        window.MultiScoreDetection.CONFIG.enableRegionDetection = false;
      }
    } catch (error) {
      console.warn('Feature konnte nicht deaktiviert werden:', error);
    }
  }

  function runSelfTest() {
    checkAllFeatures();
    return {
      adaptiveBot: featureStatus.adaptiveBot ? 'funktionsfähig' : 'nicht verfügbar',
      contextualOCR: featureStatus.contextualOCR ? 'funktionsfähig' : 'nicht verfügbar',
      multiScoreDetection: featureStatus.multiScoreDetection ? 'funktionsfähig' : 'nicht verfügbar'
    };
  }

  return {
    init,
    checkAllFeatures,
    runSelfTest,
    getFeatureStatus: () => ({ ...featureStatus }),
    CONFIG,
    isFeatureAvailable: function (featureName) {
      return !!featureStatus[featureName];
    },
    safelyExecute: function (featureName, fn, fallback) {
      try {
        return this.isFeatureAvailable(featureName) ? fn() : (fallback ? fallback() : undefined);
      } catch (error) {
        handleFeatureError(featureName);
        return fallback ? fallback() : undefined;
      }
    }
  };
})();

if (typeof window !== 'undefined') {
  document.addEventListener('DOMContentLoaded', function () {
    FeatureFallback.init();
  });
}
