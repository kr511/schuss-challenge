/**
 * Performance Configuration & Lazy Loading Handler
 * Optimizes asset loading and caching strategies
 */
const PerformanceConfig = (function() {
  'use strict';

  // Module lazy loading queue
  const lazyModules = {
    geminiAI: false,
    contextualOCR: false,
    multiScore: false,
    loaded: {}
  };

  // Asset cache with timestamps
  const assetCache = new Map();
  const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Load module on demand with error handling
   */
  function loadModule(moduleName) {
    if (lazyModules.loaded[moduleName]) return Promise.resolve();
    
    const moduleMap = {
      'geminiAI': 'gemini-ai.js',
      'contextualOCR': 'contextual-ocr.js',
      'multiScore': 'multi-score-detection.js'
    };

    return new Promise((resolve, reject) => {
      if (!moduleMap[moduleName]) {
        reject(new Error(`Unknown module: ${moduleName}`));
        return;
      }

      const script = document.createElement('script');
      script.src = moduleMap[moduleName];
      script.async = true;
      
      script.onload = () => {
        lazyModules.loaded[moduleName] = true;
        console.log(`✅ Lazy loaded: ${moduleName}`);
        resolve();
      };

      script.onerror = () => {
        console.error(`❌ Failed to load ${moduleName}`);
        reject(new Error(`Failed to load ${moduleName}`));
      };

      document.head.appendChild(script);
    });
  }

  /**
   * Preload resources for better UX
   */
  function preloadCriticalAssets() {
    // Preload critical images
    const criticalImages = [
      'gold_toolbox.png',
      'icon-192.png',
      'icon-512.png'
    ];

    criticalImages.forEach(img => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = img;
      document.head.appendChild(link);
    });
  }

  /**
   * Cache asset in IndexedDB for offline access
   */
  async function cacheAsset(key, data) {
    try {
      assetCache.set(key, {
        data,
        timestamp: Date.now()
      });
      // Optional: also cache to localStorage for small data
      if (typeof data === 'string' && data.length < 50000) {
        localStorage.setItem(`cache_${key}`, JSON.stringify({
          data,
          timestamp: Date.now()
        }));
      }
    } catch (e) {
      console.warn('Cache failed:', e);
    }
  }

  /**
   * Retrieve cached asset if valid
   */
  function getCachedAsset(key) {
    const cached = assetCache.get(key);
    if (!cached) return null;

    const age = Date.now() - cached.timestamp;
    if (age > CACHE_DURATION) {
      assetCache.delete(key);
      return null;
    }

    return cached.data;
  }

  /**
   * Monitor performance metrics
   */
  function reportMetrics() {
    if (!window.performance || !window.performance.timing) return;

    const timing = window.performance.timing;
    const metrics = {
      domLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
      pageLoaded: timing.loadEventEnd - timing.navigationStart,
      resourcesLoaded: timing.responseEnd - timing.fetchStart
    };

    console.log('📊 Performance Metrics:', metrics);
    return metrics;
  }

  /**
   * Disable animations on slow connections
   */
  function detectSlowConnection() {
    if ('connection' in navigator) {
      const connection = navigator.connection;
      const effectiveType = connection.effectiveType;
      const isSlowConnection = effectiveType === '4g' || effectiveType === '3g' || effectiveType === '2g';
      
      if (isSlowConnection) {
        document.body.classList.add('slow-network');
        console.warn('⚠️ Slow connection detected - reducing animations');
      }
      
      return isSlowConnection;
    }
    return false;
  }

  return {
    loadModule,
    preloadCriticalAssets,
    cacheAsset,
    getCachedAsset,
    reportMetrics,
    detectSlowConnection
  };
})();

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  PerformanceConfig.preloadCriticalAssets();
  PerformanceConfig.detectSlowConnection();
  
  // Report metrics after 3 seconds (when everything is loaded)
  setTimeout(() => PerformanceConfig.reportMetrics(), 3000);
});
