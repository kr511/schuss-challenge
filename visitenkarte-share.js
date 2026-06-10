/**
 * Visitenkarte teilen (Prototyp)
 *
 * Kleiner Dashboard-Button, der den Link zur eigenen Schützen-Visitenkarte
 * (visitenkarte.html?id=…) teilt bzw. kopiert. Als ID wird bevorzugt die
 * public_id aus api_profiles verwendet (Worker-API-Profil), als Fallback die
 * Supabase-User-ID (visitenkarte.html kann beides aufloesen).
 *
 * window.VisitenkarteShare
 */
(function (root) {
  'use strict';

  var PANEL_ID = 'visitenkarteSharePanel';
  // Feature-Flag: Button standardmaessig UNSICHTBAR; share() bleibt nutzbar.
  // Sichtbar machen: VisitenkarteShare.enableUI() bzw. Flag '1'.
  var UI_FLAG_KEY = 'sd_ff_visitenkarte_ui';

  function uiEnabled() {
    try {
      return root.localStorage && root.localStorage.getItem(UI_FLAG_KEY) === '1';
    } catch (_e) {
      return false;
    }
  }

  function setUIEnabled(on) {
    try {
      if (on) root.localStorage.setItem(UI_FLAG_KEY, '1');
      else root.localStorage.removeItem(UI_FLAG_KEY);
    } catch (_e) { /* noop */ }
    if (typeof document !== 'undefined') {
      if (on) mount();
      else unmountPanel();
    }
    return !!on;
  }

  function unmountPanel() {
    var panel = document.getElementById(PANEL_ID);
    if (panel && panel.parentNode) panel.parentNode.removeChild(panel);
  }

  function toast(msg, type) {
    if (root.FriendsSystem && typeof root.FriendsSystem.showToast === 'function') {
      root.FriendsSystem.showToast(msg, type || 'info');
    } else {
      console.log('[Visitenkarte]', msg);
    }
  }

  function getSession() {
    try {
      if (root.SupabaseAuth && typeof root.SupabaseAuth.getSession === 'function') {
        return root.SupabaseAuth.getSession();
      }
    } catch (_e) { /* noop */ }
    return root.SupabaseSession || null;
  }

  async function resolveCardId() {
    var session = getSession();
    var userId = session && session.user && session.user.id;
    if (!userId) return null;

    var client = root.SupabaseAuth && root.SupabaseAuth.client;
    if (client && typeof client.from === 'function') {
      try {
        var result = await client
          .from('api_profiles')
          .select('public_id, privacy_settings')
          .eq('user_id', userId)
          .maybeSingle();
        if (!result.error && result.data && result.data.public_id) {
          if (result.data.privacy_settings !== 'public') {
            toast('Hinweis: Dein API-Profil steht auf privat — die Karte zeigt dann nur Basisdaten.', 'info');
          }
          return result.data.public_id;
        }
      } catch (e) {
        console.warn('[Visitenkarte] public_id-Lookup fehlgeschlagen:', e);
      }
    }
    return userId;
  }

  async function share() {
    var id = await resolveCardId();
    if (!id) {
      toast('Bitte zuerst einloggen, um deine Visitenkarte zu teilen.', 'error');
      return;
    }

    var url = new URL('visitenkarte.html', location.href);
    url.searchParams.set('id', id);
    var link = url.toString();

    if (navigator.share) {
      try {
        await navigator.share({ title: 'Meine Schützen-Visitenkarte', url: link });
        return;
      } catch (_e) { /* abgebrochen -> Fallback Clipboard */ }
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(link);
        toast('Visitenkarten-Link kopiert! 📇', 'success');
        return;
      } catch (_e) { /* noop */ }
    }
    toast('Link: ' + link, 'info');
  }

  function mount() {
    if (!uiEnabled()) { unmountPanel(); return; }
    var dashboard = document.getElementById('premiumDashboard');
    if (!dashboard || document.getElementById(PANEL_ID)) return;

    var panel = document.createElement('div');
    panel.id = PANEL_ID;
    panel.innerHTML =
      '<button type="button" style="width:100%;margin:12px 0 0 0;padding:13px 16px;border-radius:14px;border:1px solid rgba(255,215,130,.3);' +
      'background:rgba(255,215,130,.10);color:#ffd782;font-weight:800;font-size:.82rem;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px">' +
      '📇 Visitenkarte teilen</button>';
    panel.querySelector('button').addEventListener('click', share);

    var anchor = document.getElementById('rivalSystemPanel') || document.getElementById('pdCompactChallengeHighscore');
    if (anchor) anchor.insertAdjacentElement('afterend', panel);
    else dashboard.appendChild(panel);
  }

  function hookDashboardRefresh() {
    var original = root.refreshPremiumDashboard;
    if (typeof original !== 'function' || original.__visitenkarteWrapped) return;
    var wrapped = function () {
      var result = original.apply(this, arguments);
      setTimeout(mount, 0);
      return result;
    };
    wrapped.__visitenkarteWrapped = true;
    root.refreshPremiumDashboard = wrapped;
  }

  function init() {
    if (typeof document === 'undefined') return;
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () { mount(); hookDashboardRefresh(); });
    } else {
      mount();
      hookDashboardRefresh();
    }
  }

  root.VisitenkarteShare = {
    share: share,
    mount: mount,
    uiEnabled: uiEnabled,
    enableUI: function () { return setUIEnabled(true); },
    disableUI: function () { return setUIEnabled(false); }
  };

  init();
})(typeof window !== 'undefined' ? window : globalThis);
