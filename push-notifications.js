// Push-Benachrichtigungen – Einwilligung, lokale Benachrichtigungen via Service Worker
(function () {
  'use strict';

  var KEY = 'sd_push_consent';
  var SUPPORTED = typeof Notification !== 'undefined' && 'serviceWorker' in navigator;

  function _read() {
    try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (_) { return null; }
  }

  function _write(granted) {
    try { localStorage.setItem(KEY, JSON.stringify({ granted: !!granted, ts: Date.now() })); } catch (_) {}
  }

  function hasDecided() { return _read() !== null; }

  function isGranted() {
    var c = _read();
    return !!(c && c.granted && typeof Notification !== 'undefined' && Notification.permission === 'granted');
  }

  async function requestAndStore() {
    if (!SUPPORTED) { _write(false); return false; }
    var perm = await Notification.requestPermission().catch(function () { return 'denied'; });
    var granted = perm === 'granted';
    _write(granted);
    return granted;
  }

  function decline() { _write(false); }

  async function showLocal(title, body, opts) {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    try {
      var reg = await navigator.serviceWorker.ready;
      reg.showNotification(title, Object.assign({
        body: body,
        icon: './icon-192.png',
        badge: './icon-192.png',
        vibrate: [180, 80, 180],
      }, opts || {}));
    } catch (_e) {}
  }

  window.PushNotifications = {
    supported: SUPPORTED,
    hasDecided: hasDecided,
    isGranted: isGranted,
    requestAndStore: requestAndStore,
    decline: decline,
    showLocal: showLocal,
  };
})();
