/* Local play entry for Schussduell.
 *
 * This file owns the local/offline play mode. Auth code should call
 * SchussduellLocalEntry.enter({ reload: true }) instead of duplicating local
 * state handling.
 */
(function () {
  'use strict';

  var MODE_KEYS = ['sd_local_mode', 'sd_local_play'];
  var observerStarted = false;

  function isTruthy(value) {
    return value === '1' || value === 'true';
  }

  function hasLocalMode() {
    return MODE_KEYS.some(function (key) { return isTruthy(localStorage.getItem(key)); });
  }

  function setLocalMode() {
    MODE_KEYS.forEach(function (key) { localStorage.setItem(key, '1'); });
  }

  function clearLocalMode() {
    MODE_KEYS.forEach(function (key) { localStorage.removeItem(key); });
    window.SchussduellLocalMode = false;
    window.SchussduellLocalPlay = false;
  }

  function appUrl() {
    var path = window.location.pathname || '/';
    if (!path.endsWith('/') && !/\.[a-z0-9]+$/i.test(path)) path += '/';
    return window.location.origin + path;
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

  function removeEarlyHideStyle() {
    var style = document.getElementById('localEntryAuthHide');
    if (style && style.parentElement) style.remove();
  }

  function dispatchLocalReady() {
    try {
      window.dispatchEvent(new CustomEvent('supabaseAuthReady', {
        detail: { session: null, local: true }
      }));
    } catch (e) {
      console.warn('[LocalEntry] Could not dispatch local auth event:', e);
    }
  }

  function enter(options) {
    options = options || {};
    prepareLocalState();
    addEarlyHideStyle();
    removeAuthGate();
    dispatchLocalReady();

    if (options.reload) {
      setTimeout(function () {
        window.location.replace(appUrl() + '?local=1');
      }, 80);
    }
  }

  function exit(options) {
    options = options || {};
    clearLocalMode();
    removeEarlyHideStyle();
    if (options.reload) {
      setTimeout(function () { window.location.replace(appUrl()); }, 80);
    }
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

  function addButton() {
    var form = document.getElementById('agForm');
    if (!form || document.getElementById('agLocalEntry') || document.getElementById('agLocal')) return false;

    var button = document.createElement('button');
    button.id = 'agLocalEntry';
    button.type = 'button';
    button.textContent = '👤 Ohne Anmeldung spielen';
    button.style.cssText = 'width:100%;padding:12px;margin-top:10px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.14);border-radius:10px;color:#f3f4f6;font-size:14px;font-weight:800;cursor:pointer;';
    button.addEventListener('click', function () { enter({ reload: true }); });

    var hint = document.createElement('div');
    hint.textContent = 'Fortschritt wird lokal auf diesem Gerät gespeichert.';
    hint.style.cssText = 'font-size:12px;line-height:1.35;color:#6b7280;text-align:center;margin-top:9px;';

    form.appendChild(button);
    form.appendChild(hint);
    return true;
  }

  function boot() {
    window.startSchussduellLocalMode = function () { enter({ reload: true }); };
    window.exitSchussduellLocalMode = function () { exit({ reload: true }); };

    if (hasLocalMode()) {
      enter({ reload: false });
      startGateObserver();
      return;
    }

    var tries = 0;
    var timer = setInterval(function () {
      tries += 1;
      if (addButton() || tries > 100) clearInterval(timer);
    }, 100);
  }

  window.SchussduellLocalEntry = {
    hasLocalMode: hasLocalMode,
    enter: enter,
    exit: exit,
    addButton: addButton,
    prepareLocalState: prepareLocalState
  };

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
