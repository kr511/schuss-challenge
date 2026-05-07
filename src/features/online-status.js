/**
 * Kleiner Online-Status-Hinweis.
 *
 * Zeigt keinen Blocker: lokales Training bleibt nutzbar, wenn Supabase,
 * Worker oder Netzwerk gerade fehlen.
 */
(function () {
  'use strict';

  if (typeof document === 'undefined' || typeof window === 'undefined') return;

  const HOST_ID = 'onlineStatusBanner';
  const STATE = { mounted: false, visible: false, dismissed: false, kind: '' };

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

  function ensureMount() {
    let el = document.getElementById(HOST_ID);
    if (!el) {
      el = document.createElement('div');
      el.id = HOST_ID;
      el.setAttribute('role', 'status');
      el.setAttribute('aria-live', 'polite');
      el.style.cssText = [
        'position:fixed',
        'left:50%',
        'transform:translateX(-50%)',
        'bottom:calc(env(safe-area-inset-bottom, 0px) + 82px)',
        'z-index:9990',
        'max-width:min(420px, calc(100vw - 32px))',
        'background:rgba(20,28,18,0.97)',
        'color:#e8f1d6',
        'border:1px solid rgba(255,180,0,0.42)',
        'border-radius:14px',
        'padding:10px 12px',
        'font-size:0.82rem',
        'line-height:1.35',
        'box-shadow:0 10px 30px rgba(0,0,0,0.45)',
        'display:none',
        'gap:10px',
        'align-items:flex-start',
        'pointer-events:auto',
      ].join(';');
      document.body.appendChild(el);
    }
    return el;
  }

  function hide() {
    const el = document.getElementById(HOST_ID);
    if (el) el.style.display = 'none';
    STATE.visible = false;
    STATE.kind = '';
  }

  function show(message, options = {}) {
    if (STATE.dismissed) return;
    const el = ensureMount();
    const title = options.title || 'Cloud-Sync wartet kurz';
    const icon = options.icon || '!';
    STATE.mounted = true;
    STATE.visible = true;
    STATE.kind = options.kind || 'generic';
    el.style.display = 'flex';
    el.innerHTML = `
      <div style="font-size:1rem;line-height:1;">${escHtml(icon)}</div>
      <div style="flex:1;min-width:0;">
        <div style="font-weight:700;color:#ffd699;margin-bottom:2px;">${escHtml(title)}</div>
        <div style="color:rgba(232,241,214,0.85);">${escHtml(message || 'Training und Freunde funktionieren weiter.')}</div>
      </div>
      <button type="button" data-osb-close aria-label="Hinweis schliessen"
        style="background:transparent;color:rgba(255,255,255,0.65);border:0;font-size:1.1rem;cursor:pointer;padding:2px 6px;">x</button>
    `;
    const close = el.querySelector('[data-osb-close]');
    if (close) {
      close.addEventListener('click', () => {
        STATE.dismissed = true;
        hide();
      }, { once: true });
    }
  }

  function readWorkerStatus() {
    const sync = window.SupabaseBackendSync;
    if (!sync) return null;
    try {
      if (typeof sync.readAuthBlockStatus === 'function') return sync.readAuthBlockStatus();
      if (typeof sync.authStateDebug === 'function') return sync.authStateDebug();
      if (typeof sync.isWorkerAuthBlocked === 'function' && sync.isWorkerAuthBlocked()) {
        return { blocked: true, failedAttempts: 1, tokenExists: true };
      }
    } catch (_e) {}
    return null;
  }

  function shouldShowWorkerWarning(status) {
    if (!status || isLocalMode()) return false;
    if (status.authInitializing || !status.tokenExists || status.tokenChanged) return false;
    if (!status.blocked && !status.warningEligible) return false;
    if (status.warningEligible === true) return true;
    return Number(status.failedAttempts || 0) >= 3;
  }

  function evaluate() {
    try {
      if (isLocalMode()) {
        hide();
        return;
      }

      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        show('Du bist gerade offline. Lokales Training funktioniert trotzdem weiter.', {
          kind: 'offline',
          title: 'Offline',
          icon: '!'
        });
        return;
      }

      const workerStatus = readWorkerStatus();
      if (shouldShowWorkerWarning(workerStatus)) {
        show('Optionaler Cloud-Sync wartet auf frischen Login. Training und Freunde funktionieren weiter.', {
          kind: 'worker-auth',
          title: 'Cloud-Sync wartet kurz',
          icon: '!'
        });
        return;
      }

      if (STATE.visible && !STATE.dismissed) hide();
    } catch (_e) {
      // Der Hinweis darf selbst nie die App blockieren.
    }
  }

  function bindEvents() {
    window.addEventListener('offline', evaluate);
    window.addEventListener('online', () => {
      STATE.dismissed = false;
      evaluate();
    });
    window.addEventListener('supabaseAuthReady', () => {
      STATE.dismissed = false;
      setTimeout(evaluate, 0);
    });
    window.addEventListener('supabaseReady', () => {
      STATE.dismissed = false;
      setTimeout(evaluate, 0);
    });
    window.addEventListener('supabaseSessionChanged', () => {
      STATE.dismissed = false;
      setTimeout(evaluate, 0);
    });
    window.addEventListener('schuetzen:backend-sync-auth-blocked', evaluate);
    window.addEventListener('schuetzen:backend-sync-auth-restored', () => {
      STATE.dismissed = false;
      hide();
      setTimeout(evaluate, 0);
    });
    window.addEventListener('schuetzen:online-warning', (event) => {
      if (isLocalMode()) return;
      const reason = event && event.detail && event.detail.reason;
      show(reason || 'Online-Funktionen sind gerade nicht verfuegbar. Lokales Training funktioniert weiter.', {
        kind: 'generic',
        title: 'Online-Verbindung wartet',
        icon: '!'
      });
    });
  }

  function init() {
    bindEvents();
    setTimeout(evaluate, 1500);
    setInterval(evaluate, 30000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }

  window.OnlineStatus = Object.freeze({ show, hide, evaluate, readWorkerStatus });
})();
