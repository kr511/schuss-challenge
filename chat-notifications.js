/* Chat Notifications — Web Push subscription management */
(function () {
  'use strict';

  const VAPID_PUBLIC = 'yaoRlpNiN6DXOzoq3ZZISQUpvfGvTM4Pn1uQIdIblamdzPx6ilnh3jf6GCJ3UFq-XYpFS9SxLkOw_eu9FQLNtg';

  function urlBase64ToUint8Array(b64) {
    const padding = '='.repeat((4 - b64.length % 4) % 4);
    const base = (b64 + padding).replace(/-/g, '+').replace(/_/g, '/');
    const raw = atob(base);
    const arr = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
    return arr;
  }

  function isSupported() {
    return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  }

  function getPermission() {
    return ('Notification' in window) ? Notification.permission : 'unsupported';
  }

  async function getToken() {
    const session = (window.SupabaseAuth && typeof window.SupabaseAuth.getSession === 'function'
      ? window.SupabaseAuth.getSession() : null) || window.SupabaseSession;
    return session && session.access_token ? session.access_token : null;
  }

  async function saveSubscription(sub) {
    const token = await getToken();
    if (!token) return;
    const json = sub.toJSON();
    const keys = json.keys || {};
    try {
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
        body: JSON.stringify({ endpoint: sub.endpoint, p256dh: keys.p256dh, authKey: keys.auth }),
      });
    } catch (err) {
      console.warn('[ChatNotif] save failed:', err && err.message);
    }
  }

  async function subscribe() {
    if (!isSupported()) return false;
    try {
      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC),
        });
      }
      await saveSubscription(sub);
      return true;
    } catch (err) {
      console.warn('[ChatNotif] subscribe failed:', err && err.message);
      return false;
    }
  }

  async function requestPermission() {
    if (!isSupported()) return 'unsupported';
    const current = Notification.permission;
    if (current === 'granted') { await subscribe(); return 'granted'; }
    if (current === 'denied')  return 'denied';
    const perm = await Notification.requestPermission();
    if (perm === 'granted') await subscribe();
    return perm;
  }

  function tryAutoSubscribe() {
    if (!isSupported()) return;
    if (Notification.permission === 'granted') subscribe();
  }

  window.ChatNotifications = {
    requestPermission,
    getPermission,
    subscribe,
    isSupported,
  };

  window.addEventListener('supabaseReady', (e) => {
    if (e && e.detail && e.detail.session && e.detail.session.user && e.detail.session.user.id) {
      setTimeout(tryAutoSubscribe, 1500);
    }
  });
})();
