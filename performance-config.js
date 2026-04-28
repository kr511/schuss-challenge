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
  const STORAGE_CACHE_PREFIX = 'perf_cache_';

  function getPersistentCacheKey(key) {
    return STORAGE_CACHE_PREFIX + String(key);
  }

  function canUseStorageManager() {
    return typeof StorageManager !== 'undefined' &&
      StorageManager &&
      typeof StorageManager.get === 'function' &&
      typeof StorageManager.set === 'function' &&
      typeof StorageManager.remove === 'function';
  }

  function writePersistentCache(key, entry) {
    if (!canUseStorageManager()) return false;
    return StorageManager.set(getPersistentCacheKey(key), entry);
  }

  function readPersistentCache(key) {
    if (!canUseStorageManager()) return null;
    return StorageManager.get(getPersistentCacheKey(key), null);
  }

  function removePersistentCache(key) {
    if (!canUseStorageManager()) return false;
    return StorageManager.remove(getPersistentCacheKey(key));
  }

  /**
   * Load module on demand with error handling
   */
  function loadModule(moduleName) {
    if (lazyModules.loaded[moduleName]) return Promise.resolve();
    
    const moduleMap = {
      'geminiAI': 'gemini-ai.js',
      'contextualOCR': 'src/vision/contextual-ocr.js',
      'multiScore': 'src/vision/multi-score-detection.js'
    };

    return new Promise((resolve, reject) => {
      if (!moduleMap[moduleName]) {
        reject(new Error(`Unknown module: ${moduleName}`));
        return;
      }

      const existingScript = document.querySelector(`script[src*="${moduleMap[moduleName]}"]`);
      if (existingScript) {
        // Das Modul ist bereits in index.html eingebunden. Nicht doppelt ausführen.
        if (existingScript.dataset.loaded === 'true') {
          lazyModules.loaded[moduleName] = true;
          resolve();
          return;
        }

        existingScript.addEventListener('load', () => {
          existingScript.dataset.loaded = 'true';
          lazyModules.loaded[moduleName] = true;
          resolve();
        }, { once: true });
        existingScript.addEventListener('error', () => {
          reject(new Error(`Failed to load ${moduleName}`));
        }, { once: true });
        return;
      }

      const script = document.createElement('script');
      script.src = moduleMap[moduleName];
      script.async = true;
      
      script.onload = () => {
        script.dataset.loaded = 'true';
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
      'icon-192.png',
      'icon-512.png'
    ];

    criticalImages.forEach(img => {
      if (document.querySelector(`link[rel="preload"][href="${img}"]`)) return;

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
      const entry = {
        data,
        timestamp: Date.now()
      };

      assetCache.set(key, entry);

      // Optional: also cache to StorageManager for small data
      if (typeof data === 'string' && data.length < 50000) {
        writePersistentCache(key, entry);
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
    if (cached) {
      const age = Date.now() - cached.timestamp;
      if (age <= CACHE_DURATION) return cached.data;
      assetCache.delete(key);
    }

    try {
      const stored = readPersistentCache(key);
      if (!stored || typeof stored.timestamp !== 'number') return null;

      const age = Date.now() - stored.timestamp;
      if (age > CACHE_DURATION) {
        removePersistentCache(key);
        return null;
      }

      assetCache.set(key, stored);
      return stored.data;
    } catch (e) {
      console.warn('Cache read failed:', e);
      return null;
    }
  }

  /**
   * Monitor performance metrics
   */
  function reportMetrics() {
    if (!window.performance) return null;

    const navigation = window.performance.getEntriesByType &&
      window.performance.getEntriesByType('navigation')[0];

    if (navigation) {
      const metrics = {
        domLoaded: Math.round(navigation.domContentLoadedEventEnd),
        pageLoaded: Math.round(navigation.loadEventEnd),
        resourcesLoaded: Math.round(navigation.responseEnd - navigation.fetchStart)
      };

      console.log('📊 Performance Metrics:', metrics);
      return metrics;
    }

    if (!window.performance.timing) return null;

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
      const isSlowConnection = Boolean(connection.saveData) ||
        effectiveType === 'slow-2g' ||
        effectiveType === '2g' ||
        effectiveType === '3g';
      
      document.body.classList.toggle('slow-network', isSlowConnection);
      if (isSlowConnection) {
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
