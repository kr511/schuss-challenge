/* Schussduell – Supabase Logout Control */
(function () {
  'use strict';

  var LOGOUT_ID = 'schussLogoutButton';
  var STYLE_ID = 'schussLogoutStyle';
  var MOUNT_IDS = ['pdProfileBtn', 'profileIcon'];
  var LOCAL_MODE_KEYS = ['sd_local_play', 'sd_local_mode'];

  function $(id) {
    return document.getElementById(id);
  }

  function hasSession() {
    return Boolean(window.SupabaseSession && window.SupabaseSession.access_token);
  }

  function isLocalMode() {
    return window.SchussduellLocalMode === true ||
      window.SchussduellLocalPlay === true ||
      LOCAL_MODE_KEYS.some(function (key) { return localStorage.getItem(key) === '1'; });
  }

  function shouldShowLogout() {
    return hasSession() && !isLocalMode();
  }

  function injectStyle() {
    if ($(STYLE_ID)) return;
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = '#schussLogoutButton{position:fixed;top:76px;right:18px;z-index:10050;background:rgba(239,68,68,.14);border:1px solid rgba(239,68,68,.35);color:#fecaca;border-radius:14px;padding:11px 14px;font-family:Outfit,-apple-system,BlinkMacSystemFont,sans-serif;font-size:13px;font-weight:800;letter-spacing:.02em;box-shadow:0 12px 30px rgba(0,0,0,.35);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);cursor:pointer;display:none}#schussLogoutButton:hover{background:rgba(239,68,68,.22);color:#fff}#schussLogoutButton.is-visible{display:block}@media(max-width:520px){#schussLogoutButton{top:72px;right:14px;padding:10px 12px;font-size:12px}}';
    document.head.appendChild(style);
  }

  function clearLocalAuthFlags() {
    LOCAL_MODE_KEYS.forEach(function (key) {
      try { localStorage.removeItem(key); } catch (e) {}
      try { sessionStorage.removeItem(key); } catch (e) {}
    });
    window.SupabaseSession = null;
    window.SchussduellLocalMode = false;
    window.SchussduellLocalPlay = false;
    window.getSupabaseHeaders = function () { return {}; };
  }

  async function logout() {
    var button = $(LOGOUT_ID);
    if (button) {
      button.disabled = true;
      button.textContent = '⏳ Melde ab…';
    }

    try {
      if (window.SupabaseAuth && typeof window.SupabaseAuth.signOut === 'function') {
        await window.SupabaseAuth.signOut();
      } else if (window.SupabaseClient && window.SupabaseClient.auth && typeof window.SupabaseClient.auth.signOut === 'function') {
        await window.SupabaseClient.auth.signOut();
      }
    } catch (err) {
      console.warn('[Logout] Supabase signOut failed:', err);
    }

    clearLocalAuthFlags();
    window.location.replace(window.location.origin + window.location.pathname);
  }

  function createButton() {
    injectStyle();
    var button = $(LOGOUT_ID);
    if (!button) {
      button = document.createElement('button');
      button.id = LOGOUT_ID;
      button.type = 'button';
      button.textContent = '🚪 Abmelden';
      button.addEventListener('click', function (event) {
        event.preventDefault();
        event.stopPropagation();
        logout();
      });
      document.body.appendChild(button);
    }
    return button;
  }

  function toggleButton(forceVisible) {
    var button = createButton();
    var visible = typeof forceVisible === 'boolean' ? forceVisible : shouldShowLogout();
    button.classList.toggle('is-visible', visible);
    if (!visible) {
      button.disabled = false;
      button.textContent = '🚪 Abmelden';
    }
  }

  function attachProfileHooks() {
    MOUNT_IDS.forEach(function (id) {
      var mount = $(id);
      if (!mount || mount.dataset.logoutHooked === '1') return;
      mount.dataset.logoutHooked = '1';
      mount.addEventListener('click', function () {
        if (!shouldShowLogout()) return;
        setTimeout(function () { toggleButton(true); }, 0);
      });
    });

    document.addEventListener('click', function (event) {
      var button = $(LOGOUT_ID);
      if (!button || !button.classList.contains('is-visible')) return;
      if (button.contains(event.target)) return;
      if (MOUNT_IDS.some(function (id) { var el = $(id); return el && el.contains(event.target); })) return;
      toggleButton(false);
    });
  }

  function init() {
    createButton();
    toggleButton(false);
    attachProfileHooks();
    setTimeout(function () { toggleButton(false); attachProfileHooks(); }, 800);
  }

  window.SchussLogout = {
    logout: logout,
    refresh: function () { toggleButton(false); attachProfileHooks(); }
  };

  window.addEventListener('supabaseAuthReady', function () { toggleButton(false); attachProfileHooks(); });
  window.addEventListener('supabaseSessionChanged', function () { toggleButton(false); attachProfileHooks(); });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
