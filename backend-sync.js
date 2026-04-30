/* Schussduell – Backend Sync */
(function () {
  'use strict';

  var WORKER_BASE = ['localhost', '127.0.0.1', '0.0.0.0'].includes(window.location.hostname)
    ? ''
    : 'https://schuss-challenge.eliaskummel.workers.dev';

  var workerAuthBlocked = false;
  var authWarningShown = false;

  function isLocalMode() {
    return window.SchussduellLocalMode === true ||
      window.SchussduellLocalPlay === true ||
      localStorage.getItem('sd_local_mode') === '1' ||
      localStorage.getItem('sd_local_play') === '1';
  }

  function getToken() {
    var session = window.SupabaseSession;
    return (session && session.access_token) ? session.access_token : '';
  }

  function isReady() {
    return !workerAuthBlocked && !isLocalMode() && Boolean(getToken());
  }

  function disableWorkerSync(status) {
    workerAuthBlocked = true;
    if (!authWarningShown) {
      authWarningShown = true;
      console.warn('[BackendSync] Worker Sync pausiert: API antwortet mit HTTP ' + status + '. Supabase-Freunde laufen weiter.');
    }
  }

  function apiFetch(path, opts) {
    if (!isReady()) return Promise.resolve(null);
    var url = /^https?:\/\//i.test(path) ? path : WORKER_BASE + path;
    var token = getToken();
    var headers = Object.assign(
      { 'Content-Type': 'application/json' },
      token ? { Authorization: 'Bearer ' + token } : {}
    );
    return fetch(url, Object.assign({}, opts, { headers: headers }))
      .then(function (res) {
        if (res.status === 401 || res.status === 403) {
          disableWorkerSync(res.status);
          return null;
        }
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .catch(function (err) {
        try {
          window.dispatchEvent(new CustomEvent('schuetzen:online-warning', {
            detail: { reason: 'Online-Sync gerade nicht erreichbar. Lokales Training funktioniert weiter.' }
          }));
        } catch (_e) { /* noop */ }
        throw err;
      });
  }

  function syncGameSession(data) {
    if (!isReady()) return;
    apiFetch('/api/sessions', {
      method: 'POST',
      body: JSON.stringify({
        mode: data.mode || 'bot_fight',
        score: Number(data.score) || 0,
        shotsFired: Math.max(1, Number(data.shotsFired) || 1),
        durationSeconds: Math.max(0, Number(data.durationSeconds) || 0)
      })
    }).catch(function (err) {
      console.warn('[BackendSync] session sync failed:', err && err.message ? err.message : err);
    });
  }

  function syncAchievement(type) {
    if (!isReady() || !type) return;
    apiFetch('/api/achievements', {
      method: 'POST',
      body: JSON.stringify({ type: String(type) })
    }).catch(function (err) {
      console.warn('[BackendSync] achievement sync failed:', err && err.message ? err.message : err);
    });
  }

  function syncActivity(discipline, difficulty) {
    if (!isReady() || !discipline || !difficulty) return;
    apiFetch('/api/activity/start', {
      method: 'POST',
      body: JSON.stringify({ discipline: String(discipline), difficulty: String(difficulty) })
    }).catch(function (err) {
      console.warn('[BackendSync] activity sync failed:', err && err.message ? err.message : err);
    });
  }

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

  function onAuthReady(event) {
    if (!event || (event.detail && event.detail.local)) return;
    var name = localStorage.getItem('sd_username') || localStorage.getItem('username') || '';
    if (name) syncProfile(name);
  }

  window.addEventListener('supabaseAuthReady', onAuthReady);
  window.addEventListener('supabaseSessionChanged', function (event) {
    if (event && event.detail && !event.detail.local && event.detail.session) onAuthReady(event);
  });

  if (window.SupabaseSession && !isLocalMode()) {
    setTimeout(function () { onAuthReady({ detail: { session: window.SupabaseSession } }); }, 300);
  }

  window.SupabaseBackendSync = {
    syncGameSession: syncGameSession,
    syncAchievement: syncAchievement,
    syncActivity: syncActivity,
    syncProfile: syncProfile,
    isReady: isReady,
    isWorkerAuthBlocked: function () { return workerAuthBlocked; }
  };
})();
