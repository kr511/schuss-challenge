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
  const STATE = { mounted: false, visible: false, dismissed: false };

  function escHtml(value) {
    if (value === null || value === undefined) return '';
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
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
        'bottom:90px',
        'z-index:9990',
        'max-width:min(420px, calc(100vw - 32px))',
        'background:rgba(20,28,18,0.97)',
        'color:#e8f1d6',
        'border:1px solid rgba(255,180,0,0.45)',
        'border-radius:14px',
        'padding:10px 12px',
        'font-size:0.82rem',
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
  }

  function show(message) {
    if (STATE.dismissed) return;
    const el = ensureMount();
    STATE.mounted = true;
    STATE.visible = true;
    el.style.display = 'flex';
    el.innerHTML = `
      <div style="font-size:1rem;line-height:1;">!</div>
      <div style="flex:1;min-width:0;">
        <div style="font-weight:700;color:#ffd699;margin-bottom:2px;">Online-Funktionen gerade nicht verfügbar</div>
        <div style="color:rgba(232,241,214,0.85);">${escHtml(message || 'Lokales Training, Schnelltraining und Trainings-Challenges funktionieren weiter.')}</div>
      </div>
      <button type="button" data-osb-close aria-label="Hinweis schliessen"
        style="background:transparent;color:rgba(255,255,255,0.65);border:0;font-size:1.1rem;cursor:pointer;padding:2px 6px;">×</button>
    `;
    const close = el.querySelector('[data-osb-close]');
    if (close) {
      close.addEventListener('click', () => {
        STATE.dismissed = true;
        hide();
      }, { once: true });
    }
  }

  function evaluate() {
    try {
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        show('Du bist gerade offline. Lokales Training funktioniert trotzdem weiter.');
        return;
      }
      const sync = window.SupabaseBackendSync;
      if (sync && typeof sync.isWorkerAuthBlocked === 'function' && sync.isWorkerAuthBlocked()) {
        show('Server gerade nicht erreichbar. Lokales Training funktioniert weiter.');
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
    window.addEventListener('schuetzen:online-warning', (event) => {
      const reason = event && event.detail && event.detail.reason;
      show(reason || 'Online-Funktionen sind gerade nicht verfügbar. Lokales Training funktioniert weiter.');
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

  window.OnlineStatus = Object.freeze({ show, hide, evaluate });
})();
