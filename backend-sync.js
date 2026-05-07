/* Schussduell - Backend Sync */
(function () {
  'use strict';

  var testConfig = window.__SCHUSS_BACKEND_SYNC_TEST_CONFIG__ || {};
  var WORKER_BASE = ['localhost', '127.0.0.1', '0.0.0.0'].includes(window.location.hostname)
    ? ''
    : 'https://schuss-challenge.eliaskummel.workers.dev';

  var AUTH_STABLE_MS = Number(testConfig.AUTH_STABLE_MS ?? 1250);
  var INITIAL_PROFILE_SYNC_DELAY_MS = Number(testConfig.INITIAL_PROFILE_SYNC_DELAY_MS ?? AUTH_STABLE_MS + 250);
  var WORKER_AUTH_RETRY_MS = Number(testConfig.WORKER_AUTH_RETRY_MS ?? 700);
  var WORKER_AUTH_MAX_RETRIES = Number(testConfig.WORKER_AUTH_MAX_RETRIES ?? 1);
  var AUTH_BLOCK_SHORT_RETRY_MS = Number(testConfig.AUTH_BLOCK_SHORT_RETRY_MS ?? 20 * 1000);
  var AUTH_BLOCK_RETRY_MS = Number(testConfig.AUTH_BLOCK_RETRY_MS ?? 90 * 1000);
  var AUTH_BLOCK_REPEAT_WINDOW_MS = Number(testConfig.AUTH_BLOCK_REPEAT_WINDOW_MS ?? 5 * 60 * 1000);
  var AUTH_BLOCK_WARNING_FAILURES = Number(testConfig.AUTH_BLOCK_WARNING_FAILURES ?? 3);

  var workerAuthBlocked = false;
  var authWarningShown = false;
  var syncProfilePending = false;
  var syncProfileRetryTimer = null;
  var lastAuthBlockAt = 0;
  var tokenAtAuthBlock = '';
  var retryAt = 0;
  var lastStatus = 0;
  var lastEndpoint = '';
  var firstAuthFailureAt = 0;
  var failedAuthAttempts = 0;
  var authReadySeen = false;
  var lastAuthEventAt = 0;
  var lastAuthEventName = '';
  var lastTokenFingerprint = '';
  var lastTokenChangeAt = 0;
  var lastDisableReason = '';
  var lastRetryCount = 0;

  function now() {
    return Date.now();
  }

  function wait(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, Math.max(0, ms || 0)); });
  }

  function debugSync(message, detail, warn) {
    try {
      var logger = warn && console.warn ? console.warn : (console.info || console.log);
      if (logger) logger.call(console, '[BackendSync] ' + message, detail || {});
    } catch (_e) {}
  }

  function safeStorageGet(key) {
    try {
      return localStorage.getItem(key);
    } catch (_e) {
      return null;
    }
  }

  function isLocalMode() {
    return window.SchussduellLocalMode === true ||
      window.SchussduellLocalPlay === true ||
      safeStorageGet('sd_local_mode') === '1' ||
      safeStorageGet('sd_local_play') === '1';
  }

  function getSession() {
    var session = window.SupabaseSession || null;
    if (!session && window.SupabaseAuth && typeof window.SupabaseAuth.getSession === 'function') {
      try {
        session = window.SupabaseAuth.getSession() || null;
      } catch (_e) {}
    }
    return session;
  }

  function getToken() {
    var session = getSession();
    return (session && session.access_token) ? String(session.access_token) : '';
  }

  function tokenFingerprint(token) {
    if (!token) return '';
    var hash = 0;
    for (var i = 0; i < token.length; i += 1) {
      hash = ((hash * 31) + token.charCodeAt(i)) >>> 0;
    }
    return String(token.length) + ':' + hash.toString(36);
  }

  function syncTokenState(reason) {
    var token = getToken();
    var fingerprint = tokenFingerprint(token);
    if (fingerprint && fingerprint !== lastTokenFingerprint) {
      var hadPreviousToken = !!lastTokenFingerprint;
      lastTokenFingerprint = fingerprint;
      lastTokenChangeAt = now();
      debugSync(hadPreviousToken || reason === 'TOKEN_REFRESHED' ? 'token refresh' : 'token observed', {
        reason: reason || 'token_state',
        tokenExists: true,
        tokenChanged: hadPreviousToken
      });
      if (hadPreviousToken && workerAuthBlocked) {
        resetAuthBlock(reason || 'token_changed');
      }
    }
    if (!fingerprint && lastTokenFingerprint) {
      lastTokenFingerprint = '';
      lastTokenChangeAt = 0;
    }
    return token;
  }

  function releaseAuthCooldown(reason) {
    if (!workerAuthBlocked && !retryAt && !tokenAtAuthBlock) return;
    workerAuthBlocked = false;
    authWarningShown = false;
    tokenAtAuthBlock = '';
    retryAt = 0;
    try {
      window.dispatchEvent(new CustomEvent('schuetzen:backend-sync-auth-restored', {
        detail: { reason: reason || 'retry_window' }
      }));
    } catch (_e) { /* noop */ }
    debugSync('sync auth cooldown released', { reason: reason || 'retry_window' });
  }

  function resetAuthBlock(reason) {
    var hadState = workerAuthBlocked || authWarningShown || lastAuthBlockAt || tokenAtAuthBlock ||
      retryAt || lastStatus || lastEndpoint || failedAuthAttempts;
    workerAuthBlocked = false;
    authWarningShown = false;
    lastAuthBlockAt = 0;
    tokenAtAuthBlock = '';
    retryAt = 0;
    lastStatus = 0;
    lastEndpoint = '';
    firstAuthFailureAt = 0;
    failedAuthAttempts = 0;
    lastDisableReason = '';
    lastRetryCount = 0;
    if (!hadState) return;
    try {
      window.dispatchEvent(new CustomEvent('schuetzen:backend-sync-auth-restored', {
        detail: { reason: reason || 'reset' }
      }));
    } catch (_e) { /* noop */ }
    debugSync('sync auth block reset', { reason: reason || 'reset' });
  }

  function getReadiness() {
    var local = isLocalMode();
    var token = syncTokenState();
    var tokenExists = !!token;
    var authInitializing = window.SupabaseAuthInitializing === true;
    var elapsedSinceTokenChange = lastTokenChangeAt ? now() - lastTokenChangeAt : Number.POSITIVE_INFINITY;
    var tokenStable = tokenExists && elapsedSinceTokenChange >= AUTH_STABLE_MS;

    if (local) {
      releaseAuthCooldown('local_mode');
      return {
        ready: false,
        reason: 'local-mode',
        local: true,
        tokenExists: tokenExists,
        authInitializing: false,
        tokenStable: tokenStable,
        retryInMs: 0
      };
    }

    if (!tokenExists) {
      return {
        ready: false,
        reason: authInitializing ? 'auth-initializing' : 'missing-token',
        local: false,
        tokenExists: false,
        authInitializing: authInitializing,
        tokenStable: false,
        retryInMs: 0
      };
    }

    if (authInitializing && !authReadySeen) {
      return {
        ready: false,
        reason: 'auth-initializing',
        local: false,
        tokenExists: true,
        authInitializing: true,
        tokenStable: tokenStable,
        retryInMs: 0
      };
    }

    if (!tokenStable) {
      return {
        ready: false,
        reason: 'token-not-stable',
        local: false,
        tokenExists: true,
        authInitializing: authInitializing,
        tokenStable: false,
        retryInMs: Math.max(0, AUTH_STABLE_MS - elapsedSinceTokenChange)
      };
    }

    if (workerAuthBlocked) {
      var currentTokenFingerprint = tokenFingerprint(token);
      if (tokenAtAuthBlock && currentTokenFingerprint && currentTokenFingerprint !== tokenAtAuthBlock) {
        resetAuthBlock('token_changed');
      } else if (retryAt && now() >= retryAt) {
        releaseAuthCooldown('retry_window');
      } else {
        return {
          ready: false,
          reason: 'auth-cooldown',
          local: false,
          tokenExists: true,
          authInitializing: authInitializing,
          tokenStable: true,
          retryInMs: retryAt ? Math.max(0, retryAt - now()) : 0
        };
      }
    }

    return {
      ready: true,
      reason: 'ready',
      local: false,
      tokenExists: true,
      authInitializing: authInitializing,
      tokenStable: true,
      retryInMs: 0
    };
  }

  function isReady() {
    return getReadiness().ready;
  }

  function disableWorkerSync(status, endpoint, reason, retryCount) {
    var current = now();
    var token = getToken();
    var fingerprint = tokenFingerprint(token);

    if (!firstAuthFailureAt || current - firstAuthFailureAt > AUTH_BLOCK_REPEAT_WINDOW_MS) {
      firstAuthFailureAt = current;
      failedAuthAttempts = 0;
    }

    failedAuthAttempts += 1;
    workerAuthBlocked = true;
    lastAuthBlockAt = current;
    tokenAtAuthBlock = fingerprint;
    lastStatus = Number(status) || 0;
    lastEndpoint = endpoint || '';
    lastDisableReason = reason || 'worker-auth';
    lastRetryCount = Number(retryCount) || 0;
    retryAt = current + (failedAuthAttempts >= AUTH_BLOCK_WARNING_FAILURES
      ? AUTH_BLOCK_RETRY_MS
      : AUTH_BLOCK_SHORT_RETRY_MS);

    authWarningShown = true;
    console.warn('[BackendSync] Optionaler Worker-Sync deaktiviert sich temporaer nach HTTP ' + status + ' (' + (endpoint || 'unknown') + '). Supabase-Login und lokales Training laufen weiter.', {
      retryCount: lastRetryCount,
      failedAttempts: failedAuthAttempts,
      tokenExists: !!token,
      syncDisabledReason: lastDisableReason
    });

    try {
      window.dispatchEvent(new CustomEvent('schuetzen:backend-sync-auth-blocked', {
        detail: readAuthBlockStatus()
      }));
    } catch (_e) { /* noop */ }
  }

  function readAuthBlockStatus() {
    var readiness = getReadiness();
    var token = getToken();
    var currentFingerprint = tokenFingerprint(token);
    var tokenChanged = !!(tokenAtAuthBlock && currentFingerprint && currentFingerprint !== tokenAtAuthBlock);
    var retryInMs = retryAt ? Math.max(0, retryAt - now()) : 0;
    return {
      blocked: workerAuthBlocked && retryInMs > 0,
      softBlocked: workerAuthBlocked,
      warningEligible: !readiness.local && failedAuthAttempts >= AUTH_BLOCK_WARNING_FAILURES && workerAuthBlocked,
      lastStatus: lastStatus,
      lastEndpoint: lastEndpoint,
      blockedAt: lastAuthBlockAt,
      retryAt: retryAt,
      retryInMs: retryInMs,
      failedAttempts: failedAuthAttempts,
      tokenExists: !!token,
      tokenChanged: tokenChanged,
      authReady: authReadySeen,
      authInitializing: readiness.authInitializing,
      tokenStable: readiness.tokenStable,
      readiness: readiness.reason,
      lastAuthEvent: lastAuthEventName,
      lastAuthEventAt: lastAuthEventAt,
      syncDisabledReason: lastDisableReason,
      retryCount: lastRetryCount
    };
  }

  function scheduleProfileRetry(displayName, delay) {
    if (!displayName) return;
    if (syncProfileRetryTimer) clearTimeout(syncProfileRetryTimer);
    syncProfileRetryTimer = setTimeout(function () {
      syncProfileRetryTimer = null;
      syncProfile(displayName);
    }, Math.max(0, delay || AUTH_STABLE_MS + 50));
  }

  function readAuthSessionClient() {
    if (window.SupabaseClient && window.SupabaseClient.auth) return window.SupabaseClient;
    try {
      if (window.SupabaseAuth && window.SupabaseAuth.client && window.SupabaseAuth.client.auth) {
        return window.SupabaseAuth.client;
      }
    } catch (_e) {}
    return null;
  }

  async function refreshSessionSnapshot(reason) {
    var authClient = readAuthSessionClient();
    if (!authClient || !authClient.auth || typeof authClient.auth.getSession !== 'function') {
      return getToken();
    }

    try {
      var previousToken = getToken();
      var res = await authClient.auth.getSession();
      if (res && res.error) {
        debugSync('session restore failed', {
          reason: reason || 'session_restore',
          message: res.error.message || String(res.error),
          tokenExists: !!previousToken
        }, true);
        return previousToken;
      }
      var session = res && res.data && res.data.session ? res.data.session : null;
      if (session && session.access_token) {
        window.SupabaseSession = session;
        syncTokenState(reason || 'session_restored');
        debugSync('session restored', {
          reason: reason || 'session_restored',
          tokenExists: true,
          tokenChanged: previousToken !== session.access_token
        });
        if (previousToken !== session.access_token) {
          try {
            window.dispatchEvent(new CustomEvent('supabaseSessionChanged', {
              detail: {
                session: session,
                event: 'SESSION_RESTORED',
                tokenChanged: true,
                source: 'backend-sync'
              }
            }));
          } catch (_e) { /* noop */ }
        }
      }
    } catch (err) {
      debugSync('session restore failed', {
        reason: reason || 'session_restore',
        message: err && err.message ? err.message : String(err || 'unknown'),
        tokenExists: !!getToken()
      }, true);
    }
    return getToken();
  }

  async function apiFetch(path, opts, retryCount) {
    if (!isReady()) return null;
    var url = /^https?:\/\//i.test(path) ? path : WORKER_BASE + path;
    var token = getToken();
    var existingHeaders = (opts && opts.headers) || {};
    var headers = Object.assign(
      { 'Content-Type': 'application/json' },
      existingHeaders,
      token ? { Authorization: 'Bearer ' + token } : {}
    );

    try {
      var res = await fetch(url, Object.assign({}, opts, { headers: headers }));
      if (res.status === 401 || res.status === 403) {
        var nextRetryCount = Number(retryCount) || 0;
        debugSync('worker sync failed', {
          endpoint: path,
          status: res.status,
          retryCount: nextRetryCount,
          tokenExists: !!token
        }, true);

        if (nextRetryCount < WORKER_AUTH_MAX_RETRIES) {
          debugSync('retrying worker sync', {
            endpoint: path,
            status: res.status,
            retryCount: nextRetryCount + 1,
            delayMs: WORKER_AUTH_RETRY_MS,
            tokenExists: !!token
          });
          await wait(WORKER_AUTH_RETRY_MS);
          await refreshSessionSnapshot('worker_auth_retry');
          if (isReady()) return apiFetch(path, opts, nextRetryCount + 1);
        }

        disableWorkerSync(res.status, path, 'http_' + res.status + '_after_retry', nextRetryCount);
        return null;
      }
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.status === 204 ? null : res.json();
    } catch (err) {
      try {
        window.dispatchEvent(new CustomEvent('schuetzen:backend-sync-error', {
          detail: {
            endpoint: path,
            message: err && err.message ? err.message : String(err || 'unknown'),
            optional: true
          }
        }));
      } catch (_e) { /* noop */ }
      throw err;
    }
  }

  function syncGameSession(data) {
    if (!isReady()) return false;
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
    return true;
  }

  function syncAchievement(type) {
    if (!isReady() || !type) return false;
    apiFetch('/api/achievements', {
      method: 'POST',
      body: JSON.stringify({ type: String(type) })
    }).catch(function (err) {
      console.warn('[BackendSync] achievement sync failed:', err && err.message ? err.message : err);
    });
    return true;
  }

  function syncActivity(discipline, difficulty) {
    if (!isReady() || !discipline || !difficulty) return false;
    apiFetch('/api/activity/start', {
      method: 'POST',
      body: JSON.stringify({ discipline: String(discipline), difficulty: String(difficulty) })
    }).catch(function (err) {
      console.warn('[BackendSync] activity sync failed:', err && err.message ? err.message : err);
    });
    return true;
  }

  function syncProfile(displayName) {
    if (!displayName) return false;
    var readiness = getReadiness();
    if (!readiness.ready) {
      if (!readiness.local && readiness.tokenExists && readiness.retryInMs > 0 && readiness.reason !== 'auth-cooldown') {
        scheduleProfileRetry(displayName, readiness.retryInMs + 25);
      }
      return false;
    }
    if (syncProfilePending) return false;
    syncProfilePending = true;
    apiFetch('/api/profile', {
      method: 'POST',
      body: JSON.stringify({
        displayName: String(displayName).trim().slice(0, 80),
        privacySettings: 'public'
      })
    }).catch(function (err) {
      console.warn('[BackendSync] profile sync failed:', err && err.message ? err.message : err);
    }).finally(function () {
      syncProfilePending = false;
    });
    return true;
  }

  function syncStoredProfileName() {
    var name = safeStorageGet('sd_username') || safeStorageGet('username') || '';
    if (name) scheduleProfileRetry(name, INITIAL_PROFILE_SYNC_DELAY_MS);
  }

  function onAuthReady(event) {
    var detail = event && event.detail ? event.detail : {};
    if (detail.local) {
      authReadySeen = true;
      lastAuthEventAt = now();
      lastAuthEventName = 'local';
      resetAuthBlock('local_mode');
      debugSync('auth ok', {
        event: 'local',
        local: true,
        tokenExists: false
      });
      return;
    }

    authReadySeen = true;
    lastAuthEventAt = now();
    lastAuthEventName = detail.event || event.type || 'auth_ready';
    syncTokenState(lastAuthEventName);
    debugSync('auth ok', {
      event: lastAuthEventName,
      tokenExists: !!getToken(),
      sessionRestored: lastAuthEventName === 'INITIAL_SESSION'
    });
    resetAuthBlock(lastAuthEventName);
    syncStoredProfileName();
  }

  window.addEventListener('supabaseAuthReady', onAuthReady);
  window.addEventListener('supabaseReady', onAuthReady);
  window.addEventListener('supabaseSessionChanged', function (event) {
    if (event && event.detail && event.detail.local) {
      onAuthReady(event);
      return;
    }
    if (event && event.detail && event.detail.session) onAuthReady(event);
  });

  window.SupabaseBackendSync = {
    syncGameSession: syncGameSession,
    syncAchievement: syncAchievement,
    syncActivity: syncActivity,
    syncProfile: syncProfile,
    isReady: isReady,
    resetAuthBlock: resetAuthBlock,
    isWorkerAuthBlocked: function () {
      return readAuthBlockStatus().blocked;
    },
    readAuthBlockStatus: readAuthBlockStatus,
    authStateDebug: readAuthBlockStatus
  };
})();
