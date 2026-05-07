/* Schussduell - Supabase Logout Control */
(function () {
  'use strict';

  var LOGOUT_ID = 'schussLogoutButton';
  var LOCAL_MODE_KEYS = ['sd_local_play', 'sd_local_mode'];

  function $(id) {
    return document.getElementById(id);
  }

  function removeFloatingButton() {
    var button = $(LOGOUT_ID);
    if (button && button.parentElement) button.remove();
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
    removeFloatingButton();

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

  function init() {
    removeFloatingButton();
  }

  window.SchussLogout = {
    logout: logout,
    refresh: removeFloatingButton
  };

  window.addEventListener('supabaseAuthReady', removeFloatingButton);
  window.addEventListener('supabaseSessionChanged', removeFloatingButton);

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
