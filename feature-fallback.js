/* Feature Detection & Supabase Bridge Loader */
(function () {
  'use strict';

  function hasScript(src) {
    var base = String(src).split('?')[0];
    return !!document.querySelector('script[src^="' + base + '"]');
  }

  function loadScript(src) {
    if (hasScript(src)) return Promise.resolve();
    return new Promise(function (resolve, reject) {
      var script = document.createElement('script');
      script.src = src;
      script.async = false;
      script.defer = true;
      script.onload = resolve;
      script.onerror = function () { reject(new Error('Could not load ' + src)); };
      (document.head || document.documentElement).appendChild(script);
    });
  }

  function loadAll(list) {
    return list.reduce(function (chain, src) {
      return chain.then(function () { return loadScript(src); });
    }, Promise.resolve());
  }

  function restartSupabaseFeatures() {
    setTimeout(function () {
      try {
        if (window.SupabaseSession) {
          window.dispatchEvent(new CustomEvent('supabaseAuthReady', {
            detail: { session: window.SupabaseSession, reloaded: true }
          }));
        }
      } catch (e) {}

      try {
        if (window.SupabaseSocial && typeof window.SupabaseSocial.refreshAll === 'function') {
          window.SupabaseSocial.refreshAll().catch(function (error) {
            console.warn('[FeatureFallback] SupabaseSocial refresh failed:', error);
          });
        }
      } catch (e) {}

      try {
        if (window.FriendsSystem && typeof window.FriendsSystem.init === 'function') {
          window.FriendsSystem.init(true).catch(function (error) {
            console.warn('[FeatureFallback] FriendsSystem init failed:', error);
          });
        }
      } catch (e) {}

      try {
        if (window.AsyncChallenge && typeof window.AsyncChallenge.init === 'function') {
          window.AsyncChallenge.init().catch(function (error) {
            console.warn('[FeatureFallback] AsyncChallenge init failed:', error);
          });
        }
      } catch (e) {}
    }, 500);
  }

  loadAll([
    'local-entry.js?v=1.3',
    'profile-scroll-fix.js?v=1.1',
    'debug-panel.js?v=1.0',
    'supabase-client.js?v=1.3',
    'supabase-social.js?v=1.2',
    'backend-sync.js?v=1.0'
  ]).then(restartSupabaseFeatures).catch(function (error) {
    console.warn('[FeatureFallback] Zusatz-Scripts konnten nicht vollständig geladen werden:', error);
  });
})();

const FeatureFallback = (function () {
  'use strict';

  const featureStatus = {
    adaptiveBot: false,
    contextualOCR: false,
    multiScoreDetection: false,
    allFeaturesReady: false
  };

  function checkFeature(globalName, predicate) {
    try {
      const mod = window[globalName];
      return !!(mod && predicate(mod));
    } catch (error) {
      console.warn('Feature check failed:', globalName, error);
      return false;
    }
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
    featureStatus.allFeaturesReady = featureStatus.adaptiveBot && featureStatus.contextualOCR && featureStatus.multiScoreDetection;
    window.dispatchEvent(new CustomEvent('featureStatusChanged', { detail: { ...featureStatus } }));
    return { ...featureStatus };
  }

  function init() {
    console.log('🛡️ Feature Fallback System initialisiert');
    checkAllFeatures();
    setTimeout(checkAllFeatures, 5000);
  }

  return {
    init,
    checkAllFeatures,
    runSelfTest: checkAllFeatures,
    getFeatureStatus: function () { return { ...featureStatus }; },
    CONFIG: { enableFallbacks: true, logFeatureStatus: true, autoDisableOnError: true },
    isFeatureAvailable: function (featureName) { return !!featureStatus[featureName]; },
    safelyExecute: function (featureName, fn, fallback) {
      try { return this.isFeatureAvailable(featureName) ? fn() : (fallback ? fallback() : undefined); }
      catch (error) { console.warn('Feature execution failed:', featureName, error); return fallback ? fallback() : undefined; }
    }
  };
})();

if (typeof window !== 'undefined') {
  document.addEventListener('DOMContentLoaded', function () {
    FeatureFallback.init();
  });
}
