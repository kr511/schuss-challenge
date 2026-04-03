/**
 * Schussduell - Initialization Script
 * Runs after all IIFE modules have been loaded
 * Properly initializes all systems in the correct order
 */

(function() {
  'use strict';

  console.log('[init.js] Starting Schussduell initialization...');

  // Wait for DOM to be ready
  function initWhenReady() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initWhenReady);
      return;
    }

    // Verify all critical modules are loaded
    const requiredModules = {
      'StorageManager': StorageManager,
      'Sfx': Sfx,
      'Haptics': Haptics,
      'Sounds': Sounds,
      'ImageCompare': ImageCompare,
      'AdaptiveBotSystem': AdaptiveBotSystem,
      'EnhancedAnalytics': EnhancedAnalytics,
      'EnhancedAchievements': EnhancedAchievements,
      'TrainingModes': TrainingModes
    };

    const missing = [];
    for (const [name, module] of Object.entries(requiredModules)) {
      if (typeof module === 'undefined') {
        missing.push(name);
      }
    }

    if (missing.length > 0) {
      console.error('[init.js] ERROR: Missing modules:', missing);
      // Don't halt — use fallback mode
    }

    // Initialize systems that need explicit init() calls
    const systemsToInit = [
      { name: 'FeatureFallback', obj: FeatureFallback },
      { name: 'ContextualOCR', obj: ContextualOCR },
      { name: 'MultiScoreDetection', obj: MultiScoreDetection },
      { name: 'EnhancedAnalytics', obj: EnhancedAnalytics },
      { name: 'EnhancedAchievements', obj: EnhancedAchievements },
      { name: 'TrainingModes', obj: TrainingModes },
      { name: 'MobileFeatures', obj: MobileFeatures },
      { name: 'AdaptiveBotSystem', obj: AdaptiveBotSystem }
    ];

    systemsToInit.forEach(({ name, obj }) => {
      if (typeof obj !== 'undefined' && typeof obj.init === 'function') {
        try {
          obj.init();
          console.log(`[init.js] ✓ ${name} initialized`);
        } catch (e) {
          console.warn(`[init.js] ⚠ ${name} init failed:`, e.message);
        }
      }
    });

    // Initialize DOM cache (if app.js defined it)
    if (typeof initDOMCache === 'function') {
      initDOMCache();
      console.log('[init.js] ✓ DOM cache initialized');
    }

    // Initialize Firebase when ready
    if (typeof initFirebase === 'function') {
      initFirebase();
      console.log('[init.js] ✓ Firebase initialized');
    }

    // Load streaks on startup
    if (typeof loadAllStreaks === 'function') {
      loadAllStreaks();
      console.log('[init.js] ✓ Streaks loaded');
    }

    // Register Service Worker for PWA offline support
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js', { scope: '/' })
        .then(reg => {
          console.log(`[init.js] ✓ Service Worker registered: ${reg.scope}`);
        })
        .catch(err => {
          console.warn('[init.js] Service Worker registration failed:', err);
        });
    }

    console.log('[init.js] ✅ Schussduell initialization complete');
  }

  // Start initialization when DOM is ready
  initWhenReady();
})();
