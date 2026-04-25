(function () {
  'use strict';

  var MODE_KEYS = ['sd_local_mode', 'sd_local_play'];
  var observerStarted = false;

  function hasLocalMode() {
    return MODE_KEYS.some(function (key) { return localStorage.getItem(key) === '1'; });
  }

  function setLocalMode() {
    MODE_KEYS.forEach(function (key) { localStorage.setItem(key, '1'); });
  }

  function appUrl() {
    return window.location.origin + window.location.pathname;
  }

  function prepareLocalState() {
    setLocalMode();
    if (!localStorage.getItem('username')) localStorage.setItem('username', 'Gast');
    if (!localStorage.getItem('sd_username')) localStorage.setItem('sd_username', 'Gast');

    window.SchussduellLocalMode = true;
    window.SchussduellLocalPlay = true;
    window.SupabaseSession = null;
    window.getAuthHeaders = function () { return {}; };
  }

  function removeAuthGate() {
    var gate = document.getElementById('authGate');
    if (gate && gate.parentElement) gate.remove();
  }

  function addEarlyHideStyle() {
    if (document.getElementById('localEntryAuthHide')) return;
    var style = document.createElement('style');
    style.id = 'localEntryAuthHide';
    style.textContent = '#authGate{display:none!important;visibility:hidden!important;pointer-events:none!important;}';
    (document.head || document.documentElement).appendChild(style);
  }

  function startGateObserver() {
    if (observerStarted) return;
    observerStarted = true;

    if (!hasLocalMode()) return;
    addEarlyHideStyle();
    removeAuthGate();

    var observer = new MutationObserver(function () {
      if (hasLocalMode()) removeAuthGate();
    });

    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  function enterLocal(reload) {
    prepareLocalState();
    addEarlyHideStyle();
    removeAuthGate();

    try {
      window.dispatchEvent(new CustomEvent('supabaseAuthReady', {
        detail: { session: null, local: true }
      }));
    } catch (e) {
      console.warn('[LocalEntry] Could not dispatch local auth event:', e);
    }

    if (reload) {
      setTimeout(function () {
        window.location.replace(appUrl() + '?local=1');
      }, 80);
    }
  }

  function addButton() {
    var form = document.getElementById('agForm');
    if (!form || document.getElementById('agLocalEntry')) return false;

    var button = document.createElement('button');
    button.id = 'agLocalEntry';
    button.type = 'button';
    button.textContent = '👤 Ohne Anmeldung spielen';
    button.style.cssText = 'width:100%;padding:12px;margin-top:10px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.14);border-radius:10px;color:#f3f4f6;font-size:14px;font-weight:800;cursor:pointer;';
    button.addEventListener('click', function () { enterLocal(true); });

    var hint = document.createElement('div');
    hint.textContent = 'Fortschritt wird lokal auf diesem Gerät gespeichert.';
    hint.style.cssText = 'font-size:12px;line-height:1.35;color:#6b7280;text-align:center;margin-top:9px;';

    form.appendChild(button);
    form.appendChild(hint);
    return true;
  }

  function boot() {
    window.startSchussduellLocalMode = function () { enterLocal(true); };

    if (hasLocalMode()) {
      enterLocal(false);
      startGateObserver();
      return;
    }

    var tries = 0;
    var timer = setInterval(function () {
      tries += 1;
      if (addButton() || tries > 100) clearInterval(timer);
    }, 100);
  }

  if (hasLocalMode()) {
    prepareLocalState();
    addEarlyHideStyle();
  }

  startGateObserver();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
