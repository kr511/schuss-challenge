/**
 * Schussduell - Main Entry Point
 * ES Module entry point that initializes all systems and exposes functions to window scope
 */

// Import all modules (they attach to window via IIFEs)
// Note: These are global scripts, we import them to ensure execution order
import '../haptics.js';
import '../sounds.js';
import '../image-compare-brain.js';
import '../gemini-ai.js';
import '../image-compare.js';
import '../feature-fallback.js';
import '../physics-engine.js';
import '../adaptive-bot.js';
import '../contextual-ocr.js';
import '../multi-score-detection.js';
import '../enhanced-achievements.js';
import '../enhanced-analytics.js';
import '../training-modes.js';
import '../mobile-features.js';
import '../storage-manager.js';
import '../tutorial.js';
import '../app.js';

// Wait for DOM ready then initialize
function init() {
  console.log('[main.js] Initializing Schussduell...');

  // Ensure all global objects are available
  if (typeof window.Sfx === 'undefined') {
    console.warn('[main.js] Sfx not loaded yet, waiting...');
  }

  // Initialize systems that need explicit init
  if (typeof window.FeatureFallback !== 'undefined' && window.FeatureFallback.init) {
    window.FeatureFallback.init();
  }

  if (typeof window.AdaptiveBotSystem !== 'undefined' && window.AdaptiveBotSystem.init) {
    window.AdaptiveBotSystem.init();
  }

  if (typeof window.EnhancedAnalytics !== 'undefined' && window.EnhancedAnalytics.init) {
    window.EnhancedAnalytics.init();
  }

  if (typeof window.EnhancedAchievements !== 'undefined' && window.EnhancedAchievements.init) {
    window.EnhancedAchievements.init();
  }

  if (typeof window.TrainingModes !== 'undefined' && window.TrainingModes.init) {
    window.TrainingModes.init();
  }

  if (typeof window.MobileFeatures !== 'undefined' && window.MobileFeatures.init) {
    window.MobileFeatures.init();
  }

  if (typeof window.ContextualOCR !== 'undefined' && window.ContextualOCR.init) {
    window.ContextualOCR.init();
  }

  if (typeof window.MultiScoreDetection !== 'undefined' && window.MultiScoreDetection.init) {
    window.MultiScoreDetection.init();
  }

  // Expose all functions that are called inline in HTML to window scope
  // These are defined in app.js
  exposeAppFunctions();

  // Expose ImageCompare methods
  exposeImageCompareFunctions();

  console.log('[main.js] Schussduell initialized successfully');
}

function exposeAppFunctions() {
  // Functions from app.js that are called via inline onclick handlers
  const appFunctions = [
    'saveWelcomeName',
    'startBattle',
    'doBattleFire',
    'calcResult',
    'quickResult',
    'toggleProfileMenu',
    'switchWeapon',
    'selDiff',
    'selShots',
    'showScreen',
    'loadLeaderboard',
    'restartGame',
    'endBattleEarly',
    'skipProbe',
    'toggleBurst',
    'toggleMute',
    'hardResetProgress',
    'switchProfileTab',
    'setPerfWeapon',
    'toggleSoundSetting',
    'handleOverlayClick',
    'selDist',
    'onPlayerInput',
    'onPlayerInpInt',
    'renderSunGrid',
    'updateXPCorner',
    'updateProfileMenu',
    'pushProfileToFirebase',
    'updateWinStreak',
    'showGameOver'
  ];

  // Wait a tick for app.js to fully execute and define its globals
  setTimeout(() => {
    appFunctions.forEach(fnName => {
      if (typeof window[fnName] === 'function') {
        // Already on window, ensure it's properly bound
        window[fnName] = window[fnName];
      } else {
        console.warn(`[main.js] Function ${fnName} not found on window`);
      }
    });
  }, 0);
}

function exposeImageCompareFunctions() {
  // Wait for ImageCompare to be ready
  const checkInterval = setInterval(() => {
    if (typeof window.ImageCompare !== 'undefined') {
      clearInterval(checkInterval);

      // Ensure ImageCompare.open is available globally
      if (window.ImageCompare.open) {
        console.log('[main.js] ImageCompare loaded and ready');
      }
    }
  }, 100);

  // Timeout after 5 seconds
  setTimeout(() => {
    clearInterval(checkInterval);
    if (typeof window.ImageCompare === 'undefined') {
      console.error('[main.js] ImageCompare failed to load');
    }
  }, 5000);
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  // DOM already loaded
  init();
}

// Re-export for any module consumers
export default {
  init
};
