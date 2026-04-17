/**
 * Feature Detection & Fallback System
 * Stellt sicher, dass neue Features nicht die bestehende Funktionalität beeinträchtigen
 */

const FeatureFallback = (function() {
  'use strict';
  
  // Status der Features
  const featureStatus = {
    adaptiveBot: false,
    contextualOCR: false,
    multiScoreDetection: false,
    allFeaturesReady: false
  };
  
  // Konfiguration
  const CONFIG = {
    enableFallbacks: true,
    logFeatureStatus: true,
    autoDisableOnError: true
  };
  
  /**
   * Initialisiert das Fallback-System
   */
  function init() {
    console.log('🛡️ Feature Fallback System initialisiert');
    checkAllFeatures();
    setupErrorHandlers();
    
    // Event-basierte Feature-Erkennung statt Polling
    if (CONFIG.enableFallbacks) {
      setupFeatureListeners();
    }
  }
  
  /**
   * Event-basierte Feature-Erkennung (ersetzt 30s-Polling)
   */
  function setupFeatureListeners() {
    // Features können sich via CustomEvent melden
    window.addEventListener('featureReady', function(e) {
      const name = e.detail && e.detail.name;
      if (name && featureStatus.hasOwnProperty(name)) {
        featureStatus[name] = true;
        console.log(`✅ Feature "${name}" ist bereit`);
      }
      // Prüfe ob jetzt alle ready sind
      featureStatus.allFeaturesReady = [featureStatus.adaptiveBot, featureStatus.contextualOCR, featureStatus.multiScoreDetection].every(s => s === true);
      if (featureStatus.allFeaturesReady) {
        console.log('✅ Alle Features ready');
      }
    });
    
    // Safety-Net: Einmaliger Timeout nach 5s falls kein Event kommt
    setTimeout(function() {
      if (!featureStatus.allFeaturesReady) {
        checkAllFeatures();
        console.log('⏱️ Fallback-Check nach 5s:', featureStatus);
      }
    }, 5000);
  }
  
  /**
   * Prüft alle Features
   */
  function checkAllFeatures() {
    featureStatus.adaptiveBot = checkAdaptiveBot();
    featureStatus.contextualOCR = checkContextualOCR();
    featureStatus.multiScoreDetection = checkMultiScoreDetection();
    
    // FIX: allFeaturesReady nur über die drei Feature-Keys berechnen
    featureStatus.allFeaturesReady = [featureStatus.adaptiveBot, featureStatus.contextualOCR, featureStatus.multiScoreDetection].every(status => status === true);
    
    if (CONFIG.logFeatureStatus) {
      console.log('📊 Feature Status:', featureStatus);
    }
    
    // Event auslösen
    window.dispatchEvent(new CustomEvent('featureStatusChanged', { 
      detail: { ...featureStatus } 
    }));
  }
  
  /**
   * Prüft Adaptive Bot System
   */
  function checkAdaptiveBot() {
    try {
      if (typeof AdaptiveBotSystem === 'undefined') return false;
      
      // Teste grundlegende Funktionen
      const stats = AdaptiveBotSystem.getStatistics();
      const recommendation = AdaptiveBotSystem.getDifficultyRecommendation();
      
      return typeof stats === 'object' && typeof recommendation === 'object';
    } catch (error) {
      console.warn('⚠️ Adaptive Bot System Fehler:', error);
      return false;
    }
  }
  
  /**
   * Prüft Contextual OCR
   */
  function checkContextualOCR() {
    try {
      if (typeof ContextualOCR === 'undefined') return false;
      
      // Teste grundlegende Funktionen
      const stats = ContextualOCR.getStatistics();
      const config = ContextualOCR.CONFIG;
      
      return typeof stats === 'object' && typeof config === 'object';
    } catch (error) {
      console.warn('⚠️ Contextual OCR Fehler:', error);
      return false;
    }
  }
  
  /**
   * Prüft Multi-Score Detection
   */
  function checkMultiScoreDetection() {
    try {
      if (typeof MultiScoreDetection === 'undefined') return false;
      
      // Teste grundlegende Funktionen
      const config = MultiScoreDetection.CONFIG;
      
      return typeof config === 'object' && typeof config.enableRegionDetection === 'boolean';
    } catch (error) {
      console.warn('⚠️ Multi-Score Detection Fehler:', error);
      return false;
    }
  }
  
  /**
   * Setup Error Handler für alle neuen Features
   */
  function setupErrorHandlers() {
    if (!CONFIG.enableFallbacks) return;
    
    // Globaler Error Handler
    window.addEventListener('error', function(event) {
      if (CONFIG.logFeatureStatus) {
        console.error('🚨 Globaler Fehler:', event.error);
      }
      
      // Prüfe, ob Fehler von neuen Features kommt
      const errorMessage = event.error?.message || '';
      const errorStack = event.error?.stack || '';
      
      if (errorMessage.includes('AdaptiveBot') || errorStack.includes('adaptive-bot')) {
        handleFeatureError('adaptiveBot');
      } else if (errorMessage.includes('ContextualOCR') || errorStack.includes('contextual-ocr')) {
        handleFeatureError('contextualOCR');
      } else if (errorMessage.includes('MultiScoreDetection') || errorStack.includes('multi-score-detection')) {
        handleFeatureError('multiScoreDetection');
      }
    });
    
    // Unhandled Promise Rejection Handler
    window.addEventListener('unhandledrejection', function(event) {
      if (CONFIG.logFeatureStatus) {
        console.error('🚨 Unhandled Promise Rejection:', event.reason);
      }
    });
  }
  
  /**
   * Behandelt Feature-spezifische Fehler
   */
  function handleFeatureError(featureName) {
    console.error(`❌ Fehler im Feature: ${featureName}`);
    
    if (CONFIG.autoDisableOnError) {
      // Deaktiviere das fehlerhafte Feature
      disableFeature(featureName);
      
      // Benachrichtige den Benutzer
      showFeatureErrorNotification(featureName);
    }
    
    // Prüfe alle Features neu
    setTimeout(function() {
      checkAllFeatures();
    }, 1000);
  }
  
  /**
   * Deaktiviert ein Feature
   */
  function disableFeature(featureName) {
    switch (featureName) {
      case 'adaptiveBot':
        if (typeof AdaptiveBotSystem !== 'undefined') {
          AdaptiveBotSystem.setEnabled(false);
          console.log('🔄 Adaptive Bot System deaktiviert');
        }
        break;
        
      case 'contextualOCR':
        if (typeof ContextualOCR !== 'undefined' && ContextualOCR.CONFIG) {
          ContextualOCR.CONFIG.enableContextualCorrections = false;
          console.log('🔄 Contextual OCR deaktiviert');
        }
        break;
        
      case 'multiScoreDetection':
        if (typeof MultiScoreDetection !== 'undefined' && MultiScoreDetection.CONFIG) {
          MultiScoreDetection.CONFIG.enableRegionDetection = false;
          console.log('🔄 Multi-Score Detection deaktiviert');
        }
        break;
    }
  }
  
  /**
   * Zeigt Fehler-Benachrichtigung an
   */
  function showFeatureErrorNotification(featureName) {
    const featureNames = {
      adaptiveBot: 'Adaptive Bot-Schwierigkeit',
      contextualOCR: 'Kontextuelle OCR',
      multiScoreDetection: 'Multi-Score-Erkennung'
    };
    
    const message = `⚠️ Das Feature "${featureNames[featureName]}" wurde aufgrund eines Fehlers deaktiviert. Die App funktioniert weiterhin normal.`;
    
    // Zeige Benachrichtigung (falls UI verfügbar)
    if (typeof DOM !== 'undefined' && DOM.lastShotTxt) {
      DOM.lastShotTxt.innerHTML = `<span style="color: #ff6b6b;">${message}</span>`;
      setTimeout(() => {
        if (DOM.lastShotTxt) DOM.lastShotTxt.innerHTML = '';
      }, 5000);
    }
    
    console.warn(message);
  }
  
  /**
   * Führt Selbsttest der Features durch
   */
  function runSelfTest() {
    console.log('🔬 Führe Selbsttest der Features durch...');
    
    const testResults = {
      adaptiveBot: testAdaptiveBot(),
      contextualOCR: testContextualOCR(),
      multiScoreDetection: testMultiScoreDetection()
    };
    
    console.log('📋 Selbsttest-Ergebnisse:', testResults);
    return testResults;
  }
  
  /**
   * Testet Adaptive Bot System
   */
  function testAdaptiveBot() {
    try {
      if (typeof AdaptiveBotSystem === 'undefined') return 'nicht verfügbar';
      
      const stats = AdaptiveBotSystem.getStatistics();
      const recommendation = AdaptiveBotSystem.getDifficultyRecommendation();
      
      return stats && recommendation ? 'funktionsfähig' : 'Fehler bei Tests';
    } catch (error) {
      return `Fehler: ${error.message}`;
    }
  }
  
  /**
   * Testet Contextual OCR
   */
  function testContextualOCR() {
    try {
      if (typeof ContextualOCR === 'undefined') return 'nicht verfügbar';
      
      const stats = ContextualOCR.getStatistics();
      return stats && typeof stats.totalAttempts === 'number' ? 'funktionsfähig' : 'Fehler bei Statistiken';
    } catch (error) {
      return `Fehler: ${error.message}`;
    }
  }
  
  /**
   * Testet Multi-Score Detection
   */
  function testMultiScoreDetection() {
    try {
      if (typeof MultiScoreDetection === 'undefined') return 'nicht verfügbar';
      
      const config = MultiScoreDetection.CONFIG;
      return config && typeof config.enableRegionDetection === 'boolean' ? 'funktionsfähig' : 'Fehler bei Konfiguration';
    } catch (error) {
      return `Fehler: ${error.message}`;
    }
  }
  
  /**
   * Öffentliche API
   */
  return {
    init,
    checkAllFeatures,
    runSelfTest,
    getFeatureStatus: () => ({ ...featureStatus }),
    CONFIG,
    
    // Helfer-Funktionen für andere Module
    isFeatureAvailable: function(featureName) {
      return featureStatus[featureName] || false;
    },
    
    safelyExecute: function(featureName, fn, fallback) {
      try {
        if (this.isFeatureAvailable(featureName)) {
          return fn();
        } else {
          console.warn(`⚠️ Feature ${featureName} nicht verfügbar, verwende Fallback`);
          return fallback ? fallback() : undefined;
        }
      } catch (error) {
        console.error(`❌ Fehler in Feature ${featureName}:`, error);
        handleFeatureError(featureName);
        return fallback ? fallback() : undefined;
      }
    }
  };
})();

// Initialisierung
if (typeof window !== 'undefined') {
  document.addEventListener('DOMContentLoaded', function() {
    FeatureFallback.init();
  });
}