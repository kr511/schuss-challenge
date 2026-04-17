/**
 * Mobile Features System
 * Push-Benachrichtigungen, Haptisches Feedback und mobile Optimierungen
 */

const MobileFeatures = (function() {
  'use strict';
  
  // Konfiguration
  const CONFIG = {
    pushNotifications: {
      enabled: false,
      permissionRequested: false,
      defaultSettings: {
        trainingReminders: true,
        achievementNotifications: true,
        streakWarnings: true,
        dailyChallenges: true
      }
    },
    
    hapticFeedback: {
      enabled: true,
      patterns: {
        shot: [10, 20, 10],        // Kurzes Vibrieren beim Schuss
        hit: [50],                 // Längeres Vibrieren beim Treffer
        miss: [100, 50, 100],      // Doppel-Vibration beim Fehlschuss
        achievement: [100, 50, 100, 50, 100], // Feierliches Muster
        buttonPress: [20],         // Kurzes Feedback bei Button-Klick
        error: [200, 100, 200],    // Fehler-Muster
        warning: [100, 200, 100]   // Warn-Muster
      }
    },
    
    offlineMode: {
      enabled: true,
      cacheVersion: '1.0',
      maxCacheSize: 50 * 1024 * 1024 // 50MB
    },
    
    pwaFeatures: {
      backgroundSync: true,
      periodicSync: false // Benötigt spezielle Permissions
    }
  };
  
  // Status-Variablen
  let mobileState = {
    pushPermission: 'default',
    serviceWorker: null,
    isOnline: navigator.onLine,
    lastSync: null
  };
  
  /**
   * Initialisiert Mobile Features
   */
  function init() {
    console.log('📱 Mobile Features System initialisiert');
    
    // Prüfe mobile Fähigkeiten
    checkMobileCapabilities();
    
    // Initialisiere Service Worker
    initServiceWorker();
    
    // Initialisiere Push-Notifications
    initPushNotifications();
    
    // Initialisiere Haptisches Feedback
    initHapticFeedback();
    
    // Initialisiere Offline-Modus
    initOfflineMode();
    

    
    // Event-Listener für Online/Offline
    setupConnectivityListeners();
  }
  
  /**
   * Prüft mobile Fähigkeiten
   */
  function checkMobileCapabilities() {
    const capabilities = {
      isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
      hasVibration: 'vibrate' in navigator,
      hasNotifications: 'Notification' in window,
      hasServiceWorker: 'serviceWorker' in navigator,
      hasWebXR: 'xr' in navigator,
      connection: navigator.connection || navigator.mozConnection || navigator.webkitConnection,
      deviceMemory: navigator.deviceMemory,
      hardwareConcurrency: navigator.hardwareConcurrency
    };
    
    console.log('📱 Mobile Capabilities:', capabilities);
    return capabilities;
  }
  
  /**
   * Service Worker Initialisierung
   */
  function initServiceWorker() {
    if (!CONFIG.offlineMode.enabled || !('serviceWorker' in navigator)) {
      console.log('⚠️ Service Worker nicht verfügbar');
      return;
    }
    
    navigator.serviceWorker.getRegistration()
      .then(registration => registration || navigator.serviceWorker.register('./sw.js?v=2.7'))
      .then(registration => {
        mobileState.serviceWorker = registration;
        console.log('✅ Service Worker registriert:', registration.scope);
        
        // Background Sync initialisieren
        if ('sync' in registration) {
          initBackgroundSync(registration);
        }
      })
      .catch(error => {
        console.error('❌ Service Worker Registration fehlgeschlagen:', error);
      });
  }
  
  /**
   * Push-Notifications Initialisierung
   */
  function initPushNotifications() {
    if (!CONFIG.pushNotifications.enabled || !('Notification' in window)) {
      console.log('⚠️ Push-Notifications nicht verfügbar');
      return;
    }
    
    // Prüfe aktuellen Permission-Status
    updatePushPermissionStatus();
    
    // Event-Listener für Permission-Änderungen
    if ('permissions' in navigator) {
      navigator.permissions.query({ name: 'notifications' })
        .then(permissionStatus => {
          permissionStatus.onchange = function() {
            updatePushPermissionStatus();
          };
        });
    }
  }
  
  /**
   * Aktualisiert Push-Permission Status
   */
  function updatePushPermissionStatus() {
    if (!('Notification' in window)) return;
    
    mobileState.pushPermission = Notification.permission;
    
    if (Notification.permission === 'granted') {
      CONFIG.pushNotifications.enabled = true;
      subscribeToPushNotifications();
    } else if (Notification.permission === 'denied') {
      CONFIG.pushNotifications.enabled = false;
    }
    
    console.log('🔔 Push-Permission Status:', mobileState.pushPermission);
  }
  
  /**
   * Fordert Push-Permission an
   */
  async function requestPushPermission() {
    if (!('Notification' in window)) {
      console.warn('⚠️ Notifications nicht unterstützt');
      return false;
    }
    
    if (Notification.permission === 'granted') {
      return true;
    }
    
    if (Notification.permission === 'denied') {
      console.warn('🔔 Benachrichtigungen wurden abgelehnt');
      return false;
    }
    
    try {
      const permission = await Notification.requestPermission();
      updatePushPermissionStatus();
      return permission === 'granted';
    } catch (error) {
      console.error('❌ Fehler beim Anfordern der Permission:', error);
      return false;
    }
  }
  
  /**
   * Abonniert Push-Notifications
   */
  function subscribeToPushNotifications() {
    if (!mobileState.serviceWorker) {
      console.warn('⚠️ Service Worker nicht verfügbar für Push');
      return;
    }
    
    // Dies würde normalerweise mit einem Push-Service wie Firebase oder einem eigenen Server gemacht werden
    // Für Demo-Zwecke simulieren wir Push-Notifications lokal
    console.log('🔔 Push-Notifications abonniert (lokal)');
  }
  
  /**
   * Sendet eine Push-Benachrichtigung
   */
  function sendNotification(title, options = {}) {
    if (!CONFIG.pushNotifications.enabled || Notification.permission !== 'granted') {
      console.log('🔔 Push-Notifications deaktiviert oder keine Permission');
      return false;
    }
    
    const defaultOptions = {
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      vibrate: [200, 100, 200],
      tag: 'schussduell-notification',
      requireInteraction: false,
      silent: false
    };
    
    const notificationOptions = { ...defaultOptions, ...options };
    
    try {
      const notification = new Notification(title, notificationOptions);
      
      // Event-Listener für Notification-Interaktionen
      notification.onclick = function() {
        window.focus();
        notification.close();
        
        // Öffne App oder spezifische Seite
        if (options.actionUrl) {
          window.location.href = options.actionUrl;
        }
      };
      
      console.log('🔔 Benachrichtigung gesendet:', title);
      return true;
    } catch (error) {
      console.error('❌ Fehler beim Senden der Benachrichtigung:', error);
      return false;
    }
  }
  
  /**
   * Sendet spezifische Benachrichtigungen
   */
  function sendTrainingReminder() {
    sendNotification('🏃 Training Zeit!', {
      body: 'Dein tägliches Training wartet! Verbessere deine Skills.',
      tag: 'training-reminder',
      vibrate: CONFIG.hapticFeedback.patterns.achievement,
      actions: [
        { action: 'start-training', title: 'Training starten' },
        { action: 'dismiss', title: 'Später' }
      ]
    });
  }
  
  function sendAchievementNotification(achievement) {
    sendNotification(`🏆 ${achievement.name} freigeschaltet!`, {
      body: achievement.description,
      tag: 'achievement-unlocked',
      vibrate: CONFIG.hapticFeedback.patterns.achievement,
      image: achievement.icon || '/icon-192.png',
      data: { achievementId: achievement.id }
    });
  }
  
  function sendStreakWarning(streakCount) {
    sendNotification('⚠️ Serie gefährdet!', {
      body: `Deine ${streakCount}-Spiele-Serie endet bald. Spiele jetzt um sie fortzusetzen!`,
      tag: 'streak-warning',
      vibrate: CONFIG.hapticFeedback.patterns.warning,
      requireInteraction: true
    });
  }
  
  function sendDailyChallenge(challenge) {
    sendNotification('🎯 Tägliche Herausforderung!', {
      body: challenge.description,
      tag: 'daily-challenge',
      vibrate: CONFIG.hapticFeedback.patterns.buttonPress,
      actions: [
        { action: 'accept-challenge', title: 'Annehmen' },
        { action: 'view-details', title: 'Details' }
      ],
      data: { challengeId: challenge.id }
    });
  }
  
  /**
   * Haptisches Feedback Initialisierung
   */
  function initHapticFeedback() {
    if (!CONFIG.hapticFeedback.enabled || !('vibrate' in navigator)) {
      console.log('⚠️ Haptisches Feedback nicht verfügbar');
      return;
    }
    
    console.log('📳 Haptisches Feedback initialisiert');
  }
  
  /**
   * Löst haptisches Feedback aus
   */
  function triggerHaptic(patternName, intensity = 1.0) {
    if (!CONFIG.hapticFeedback.enabled || !('vibrate' in navigator)) {
      return false;
    }
    
    const pattern = CONFIG.hapticFeedback.patterns[patternName];
    if (!pattern) {
      console.warn('Unbekanntes Haptic-Pattern:', patternName);
      return false;
    }
    
    // Skaliere Pattern basierend auf Intensität
    const scaledPattern = pattern.map(duration => Math.round(duration * intensity));
    
    try {
      navigator.vibrate(scaledPattern);
      console.log('📳 Haptisches Feedback:', patternName, scaledPattern);
      return true;
    } catch (error) {
      console.error('❌ Fehler beim Haptic-Feedback:', error);
      return false;
    }
  }
  
  /**
   * Spezifische Haptic-Feedback-Funktionen
   */
  function hapticShot() {
    return triggerHaptic('shot', 0.8);
  }
  
  function hapticHit() {
    return triggerHaptic('hit', 1.0);
  }
  
  function hapticMiss() {
    return triggerHaptic('miss', 1.2);
  }
  
  function hapticAchievement() {
    return triggerHaptic('achievement', 1.5);
  }
  
  function hapticButtonPress() {
    return triggerHaptic('buttonPress', 0.6);
  }
  
  function hapticError() {
    return triggerHaptic('error', 1.3);
  }
  
  function hapticWarning() {
    return triggerHaptic('warning', 1.1);
  }
  
  /**
   * Offline-Modus Initialisierung
   */
  function initOfflineMode() {
    if (!CONFIG.offlineMode.enabled) {
      console.log('📴 Offline-Modus deaktiviert');
      return;
    }
    
    console.log('📴 Offline-Modus initialisiert');
    
    // Cache wichtige Assets
    cacheCriticalAssets();
    
    // Sync-Daten initialisieren
    initSyncData();
  }
  
  /**
   * Cacht kritische Assets für Offline-Nutzung
   */
  function cacheCriticalAssets() {
    if (!caches) {
      console.warn('⚠️ Cache API nicht verfügbar');
      return;
    }
    
    const criticalAssets = [
      '/',
      '/index.html',
      '/icon-192.png',
      '/icon-512.png',
      '/manifest.json'
    ];
    
    caches.open('schussduell-critical-v1')
      .then(cache => {
        return cache.addAll(criticalAssets);
      })
      .then(() => {
        console.log('✅ Kritische Assets gecacht');
      })
      .catch(error => {
        console.error('❌ Fehler beim Cachen:', error);
      });
  }
  
  /**
   * Initialisiert Sync-Daten
   */
  function initSyncData() {
    // Speichere lokale Daten für spätere Synchronisation
    const syncData = {
      pendingSync: [],
      lastSync: Date.now(),
      deviceInfo: {
        userAgent: navigator.userAgent,
        timestamp: Date.now()
      }
    };
    
    localStorage.setItem('sd_sync_data', JSON.stringify(syncData));
  }
  

  
  /**
   * Connectivity-Listener einrichten
   */
  function setupConnectivityListeners() {
    window.addEventListener('online', () => {
      mobileState.isOnline = true;
      console.log('🌐 Online - Sync starten');
      syncData();
      
      // Benachrichtigung über Online-Status
      sendNotification('🌐 Wieder online!', {
        body: 'Deine Daten werden synchronisiert.',
        tag: 'back-online',
        vibrate: CONFIG.hapticFeedback.patterns.buttonPress
      });
    });
    
    window.addEventListener('offline', () => {
      mobileState.isOnline = false;
      console.log('📴 Offline - Lokaler Modus aktiv');
      
      // Benachrichtigung über Offline-Status
      sendNotification('📴 Offline-Modus', {
        body: 'Du bist offline. Deine Fortschritte werden lokal gespeichert.',
        tag: 'gone-offline',
        vibrate: CONFIG.hapticFeedback.patterns.warning
      });
    });
  }
  
  /**
   * Synchronisiert Daten wenn online
   */
  function syncData() {
    if (!mobileState.isOnline) return;
    
    const syncData = JSON.parse(localStorage.getItem('sd_sync_data') || '{}');
    if (syncData.pendingSync && syncData.pendingSync.length > 0) {
      console.log('🔄 Synchronisiere', syncData.pendingSync.length, 'Einträge');
      
      // Hier würde die eigentliche Sync-Logik implementiert
      // Für Demo: Markiere als synchronisiert
      syncData.pendingSync = [];
      syncData.lastSync = Date.now();
      
      localStorage.setItem('sd_sync_data', JSON.stringify(syncData));
      
      // Erfolgsmeldung
      sendNotification('✅ Sync erfolgreich', {
        body: 'Alle deine Daten wurden synchronisiert.',
        tag: 'sync-success',
        vibrate: CONFIG.hapticFeedback.patterns.achievement
      });
    }
  }
  
  /**
   * Background Sync Initialisierung
   */
  function initBackgroundSync(registration) {
    if (!('sync' in registration)) {
      console.log('⚠️ Background Sync nicht verfügbar');
      return;
    }
    
    // Sync-Event-Listener
    registration.addEventListener('sync', event => {
      if (event.tag === 'background-sync') {
        event.waitUntil(
          syncData().catch(error => {
            console.error('❌ Background Sync fehlgeschlagen:', error);
          })
        );
      }
    });
    
    console.log('🔄 Background Sync initialisiert');
  }
  
  /**
   * Registriert Background Sync
   */
  function registerBackgroundSync() {
    if (!mobileState.serviceWorker || !('sync' in mobileState.serviceWorker)) {
      return Promise.reject('Background Sync nicht verfügbar');
    }
    
    return mobileState.serviceWorker.sync.register('background-sync')
      .then(() => {
        console.log('🔄 Background Sync registriert');
      })
      .catch(error => {
        console.error('❌ Fehler bei Background Sync Registration:', error);
      });
  }
  
  /**
   * Erweiterte mobile Features
   */
  const advancedFeatures = {
    // Battery Status API
    getBatteryStatus: function() {
      if (!('getBattery' in navigator)) {
        return Promise.resolve({ supported: false });
      }
      
      return navigator.getBattery().then(battery => {
        return {
          supported: true,
          level: Math.round(battery.level * 100),
          charging: battery.charging,
          chargingTime: battery.chargingTime,
          dischargingTime: battery.dischargingTime
        };
      });
    },
    
    // Ambient Light API
    getAmbientLight: function() {
      if (!('AmbientLightSensor' in window)) {
        return Promise.resolve({ supported: false });
      }
      
      return new Promise((resolve, reject) => {
        const sensor = new AmbientLightSensor();
        sensor.start();
        
        sensor.onreading = () => {
          resolve({
            supported: true,
            illuminance: sensor.illuminance
          });
          sensor.stop();
        };
        
        sensor.onerror = (error) => {
          reject({ supported: true, error: error });
        };
      });
    },
    
    // Device Orientation
    getDeviceOrientation: function() {
      return new Promise((resolve) => {
        if (!window.DeviceOrientationEvent) {
          resolve({ supported: false });
          return;
        }
        
        const handleOrientation = (event) => {
          resolve({
            supported: true,
            alpha: event.alpha,
            beta: event.beta,
            gamma: event.gamma,
            absolute: event.absolute
          });
          
          window.removeEventListener('deviceorientation', handleOrientation);
        };
        
        window.addEventListener('deviceorientation', handleOrientation);
        
        // Timeout nach 5 Sekunden
        setTimeout(() => {
          window.removeEventListener('deviceorientation', handleOrientation);
          resolve({ supported: false, timeout: true });
        }, 5000);
      });
    }
  };
  
  /**
   * Öffentliche API
   */
  return {
    init,
    
    // Push-Notifications
    requestPushPermission,
    sendNotification,
    sendTrainingReminder,
    sendAchievementNotification,
    sendStreakWarning,
    sendDailyChallenge,
    
    // Haptic Feedback
    triggerHaptic,
    hapticShot,
    hapticHit,
    hapticMiss,
    hapticAchievement,
    hapticButtonPress,
    hapticError,
    hapticWarning,
    

    
    // Sync
    syncData,
    registerBackgroundSync,
    
    // Advanced Features
    getBatteryStatus: advancedFeatures.getBatteryStatus,
    getAmbientLight: advancedFeatures.getAmbientLight,
    getDeviceOrientation: advancedFeatures.getDeviceOrientation,
    
    // Status
    getMobileState: () => ({ ...mobileState }),
    checkMobileCapabilities,
    
    // Konfiguration
    CONFIG
  };
})();

// Initialisierung
if (typeof window !== 'undefined') {
  document.addEventListener('DOMContentLoaded', function() {
    MobileFeatures.init();
  });
}
