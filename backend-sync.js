/* Schussduell – Backend Sync
 *
 * Verbindet das Frontend nach einem Spiel mit dem Cloudflare Worker API.
 * Fire-and-forget: Fehler blockieren nie den Game-Loop.
 *
 * Exponiert: window.SupabaseBackendSync
 */
(function () {
  'use strict';

  var WORKER_BASE = ['localhost', '127.0.0.1', '0.0.0.0'].includes(window.location.hostname)
    ? ''
    : 'https://schuss-challenge.eliaskummel.workers.dev';

  function isLocalMode() {
    return window.SchussduellLocalMode === true ||
      window.SchussduellLocalPlay === true ||
      localStorage.getItem('sd_local_mode') === '1' ||
      localStorage.getItem('sd_local_play') === '1';
  }

  function getToken() {
    if (window.SupabaseRuntime && typeof window.SupabaseRuntime.getAccessToken === 'function') {
      return window.SupabaseRuntime.getAccessToken() || '';
    }
    var session = window.SupabaseSession;
    return (session && session.access_token) ? session.access_token : '';
  }

  function isReady() {
    return !isLocalMode() && Boolean(getToken());
  }

  function apiFetch(path, opts) {
    if (window.SchussApi && typeof window.SchussApi.fetch === 'function') {
      return window.SchussApi.fetch(path, opts);
    }
    var url = /^https?:\/\//i.test(path) ? path : WORKER_BASE + path;
    var token = getToken();
    var headers = Object.assign(
      { 'Content-Type': 'application/json' },
      token ? { Authorization: 'Bearer ' + token } : {}
    );
    return fetch(url, Object.assign({}, opts, { headers: headers }))
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      });
  }

  // ── Spielsitzung speichern ───────────────────────────────────────────────
  function syncGameSession(data) {
    if (!isReady()) return;
    var payload = {
      mode: data.mode || 'bot_fight',
      score: Number(data.score) || 0,
      shotsFired: Math.max(1, Number(data.shotsFired) || 1),
      durationSeconds: Math.max(0, Number(data.durationSeconds) || 0)
    };
    apiFetch('/api/sessions', {
      method: 'POST',
      body: JSON.stringify(payload)
    }).catch(function (err) {
      console.warn('[BackendSync] session sync failed:', err && err.message ? err.message : err);
    });
  }

  // ── Achievement speichern ────────────────────────────────────────────────
  function syncAchievement(type) {
    if (!isReady() || !type) return;
    apiFetch('/api/achievements', {
      method: 'POST',
      body: JSON.stringify({ type: String(type) })
    }).catch(function (err) {
      console.warn('[BackendSync] achievement sync failed:', err && err.message ? err.message : err);
    });
  }

  // ── Live-Aktivität setzen ────────────────────────────────────────────────
  function syncActivity(discipline, difficulty) {
    if (!isReady() || !discipline || !difficulty) return;
    apiFetch('/api/activity/start', {
      method: 'POST',
      body: JSON.stringify({
        discipline: String(discipline),
        difficulty: String(difficulty)
      })
    }).catch(function (err) {
      console.warn('[BackendSync] activity sync failed:', err && err.message ? err.message : err);
    });
  }

  // ── Profil-Namen synchronisieren ────────────────────────────────────────
  function syncProfile(displayName) {
    if (!isReady() || !displayName) return;
    apiFetch('/api/profile', {
      method: 'POST',
      body: JSON.stringify({
        displayName: String(displayName).trim().slice(0, 80),
        privacySettings: 'public'
      })
    }).catch(function (err) {
      console.warn('[BackendSync] profile sync failed:', err && err.message ? err.message : err);
    });
  }

  // ── Initiale Profilsynchronisation nach Auth ─────────────────────────────
  function onAuthReady(event) {
    if (!event || (event.detail && event.detail.local)) return;
    var name = localStorage.getItem('sd_username') || localStorage.getItem('username') || '';
    if (name) syncProfile(name);
  }

  window.addEventListener('supabaseAuthReady', onAuthReady);
  window.addEventListener('supabaseSessionChanged', function (event) {
    if (event && event.detail && !event.detail.local && event.detail.session) {
      onAuthReady(event);
    }
  });

  window.SupabaseBackendSync = {
    syncGameSession: syncGameSession,
    syncAchievement: syncAchievement,
    syncActivity: syncActivity,
    syncProfile: syncProfile,
    isReady: isReady
  };
})();
