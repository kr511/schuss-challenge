/* Premium Dashboard Friends Button */
(function () {
  'use strict';

  var BUTTON_ID = 'pdFriendsQuickButton';
  var STYLE_ID = 'pdFriendsQuickButtonStyle';
  var retryTimer = null;

  function onReady(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn, { once: true });
    else fn();
  }

  function getFriendsState() {
    try {
      if (window.FriendsSystem && typeof window.FriendsSystem.getState === 'function') {
        return window.FriendsSystem.getState();
      }
    } catch (e) {}
    return { friends: [], pendingRequests: [], sentRequests: [], userCode: null, initialized: false };
  }

  function count(list) {
    return Array.isArray(list) ? list.length : 0;
  }

  function addStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent =
      '#' + BUTTON_ID + '{margin:0 0 20px 0}' +
      '#' + BUTTON_ID + ' .fb-card{width:100%;border:1px solid rgba(0,195,255,.18);border-top:1px solid rgba(255,255,255,.12);background:linear-gradient(135deg,rgba(0,195,255,.16),rgba(122,176,48,.12) 48%,rgba(10,12,15,.72));border-radius:18px;padding:14px 15px;box-shadow:0 10px 28px rgba(0,0,0,.42),0 0 28px rgba(0,195,255,.08);display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:12px;color:#fff;cursor:pointer;text-align:left;transition:transform .16s ease,border-color .16s ease,box-shadow .16s ease;-webkit-tap-highlight-color:transparent}' +
      '#' + BUTTON_ID + ' .fb-card:active{transform:scale(.985);border-color:rgba(122,176,48,.45);box-shadow:0 7px 20px rgba(0,0,0,.38)}' +
      '#' + BUTTON_ID + ' .fb-icon{width:42px;height:42px;border-radius:15px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.1);display:flex;align-items:center;justify-content:center;font-size:1.35rem;box-shadow:inset 0 1px 1px rgba(255,255,255,.06)}' +
      '#' + BUTTON_ID + ' .fb-title{font-weight:900;font-size:.98rem;letter-spacing:.01em;line-height:1.15}' +
      '#' + BUTTON_ID + ' .fb-sub{font-size:.68rem;color:rgba(255,255,255,.5);margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
      '#' + BUTTON_ID + ' .fb-meta{display:flex;flex-direction:column;align-items:flex-end;gap:5px}' +
      '#' + BUTTON_ID + ' .fb-pill{font-size:.64rem;color:rgba(255,255,255,.72);background:rgba(255,255,255,.075);border:1px solid rgba(255,255,255,.1);border-radius:999px;padding:4px 8px;font-weight:800;white-space:nowrap}' +
      '#' + BUTTON_ID + ' .fb-arrow{color:#7ab030;font-size:1.15rem;font-weight:900;line-height:1}' +
      '#' + BUTTON_ID + ' .fb-badge{min-width:18px;height:18px;border-radius:9px;background:#ff3b30;color:#fff;font-size:.62rem;font-weight:900;display:inline-flex;align-items:center;justify-content:center;padding:0 5px;margin-left:6px;box-shadow:0 3px 10px rgba(255,59,48,.35)}';
    document.head.appendChild(style);
  }

  function showToast(text) {
    var toast = document.createElement('div');
    toast.textContent = text;
    toast.style.cssText = 'position:fixed;left:50%;bottom:96px;transform:translateX(-50%);z-index:12000;background:rgba(15,23,42,.94);color:#fff;border:1px solid rgba(255,255,255,.12);border-radius:999px;padding:10px 14px;font-size:.78rem;font-weight:800;box-shadow:0 10px 28px rgba(0,0,0,.45);';
    document.body.appendChild(toast);
    setTimeout(function () { toast.remove(); }, 1800);
  }

  function openFriends() {
    if (window.FriendsSystem && typeof window.FriendsSystem.showFriendsOverlay === 'function') {
      try {
        window.FriendsSystem.showFriendsOverlay();
        if (typeof triggerHaptic === 'function') triggerHaptic();
        return;
      } catch (e) {
        console.warn('[FriendsButton] Overlay konnte nicht geöffnet werden:', e);
      }
    }

    showToast('👥 Freunde werden geladen...');
    if (retryTimer) clearTimeout(retryTimer);
    retryTimer = setTimeout(function () {
      if (window.FriendsSystem && typeof window.FriendsSystem.showFriendsOverlay === 'function') {
        window.FriendsSystem.showFriendsOverlay();
      }
    }, 900);
  }

  function render() {
    addStyles();
    var dashboard = document.getElementById('premiumDashboard');
    if (!dashboard) return;

    var existing = document.getElementById(BUTTON_ID);
    if (!existing) {
      existing = document.createElement('div');
      existing.id = BUTTON_ID;
      var highscore = document.getElementById('pdCompactChallengeHighscore');
      var badges = document.getElementById('pdBadgesGrid');
      if (highscore) highscore.insertAdjacentElement('afterend', existing);
      else if (badges && badges.parentElement) badges.parentElement.insertBefore(existing, badges);
      else dashboard.appendChild(existing);
    }

    var state = getFriendsState();
    var friends = count(state.friends);
    var pending = count(state.pendingRequests);
    var code = state.userCode || '------';
    var sub = state.initialized ? ('Code ' + code + ' · ' + friends + ' Freunde') : 'Freunde öffnen · Code wird geladen';
    var badge = pending > 0 ? '<span class="fb-badge">' + (pending > 9 ? '9+' : pending) + '</span>' : '';

    existing.innerHTML =
      '<button type="button" class="fb-card" aria-label="Freunde öffnen">' +
        '<div class="fb-icon">👥</div>' +
        '<div style="min-width:0"><div class="fb-title">Freunde' + badge + '</div><div class="fb-sub">' + sub + '</div></div>' +
        '<div class="fb-meta"><div class="fb-pill">Öffnen</div><div class="fb-arrow">›</div></div>' +
      '</button>';

    var btn = existing.querySelector('.fb-card');
    if (btn) btn.onclick = openFriends;
  }

  function hookFriendsInit() {
    if (!window.FriendsSystem || window.FriendsSystem.__dashboardButtonHooked) return;
    var originalInit = window.FriendsSystem.init;
    if (typeof originalInit === 'function') {
      window.FriendsSystem.init = function () {
        var result = originalInit.apply(this, arguments);
        if (result && typeof result.then === 'function') result.then(function () { setTimeout(render, 0); });
        else setTimeout(render, 0);
        return result;
      };
    }
    window.FriendsSystem.__dashboardButtonHooked = true;
  }

  onReady(function () {
    render();
    setTimeout(function () { hookFriendsInit(); render(); }, 500);
    setTimeout(function () { hookFriendsInit(); render(); }, 1500);
    setTimeout(function () { hookFriendsInit(); render(); }, 3000);
    setInterval(function () { hookFriendsInit(); render(); }, 30000);
  });
})();
