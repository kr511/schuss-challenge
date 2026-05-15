/* Friend Profile Overlay — opens detailed profile on friend-row tap */
(function () {
  'use strict';

  const OVERLAY_ID = 'friendProfileOverlay';
  const HISTORY_STATE = 'friendProfile';
  const ANIM_MS = 320;

  const state = {
    isOpen: false,
    friend: null,
    ownStats: null,
    closingFromPop: false,
    popHandler: null,
    scrollY: 0,
  };

  function esc(value) {
    const div = document.createElement('div');
    div.textContent = value == null ? '' : String(value);
    return div.innerHTML;
  }

  function toast(msg, type) {
    if (window.FriendsSystem && typeof window.FriendsSystem.showToast === 'function') {
      window.FriendsSystem.showToast(msg, type || 'info');
    } else if (typeof window.alert === 'function') {
      window.alert(msg);
    }
  }

  function haptic(kind) {
    if (window.MobileFeatures && typeof window.MobileFeatures.triggerHaptic === 'function') {
      window.MobileFeatures.triggerHaptic(kind || 'light');
    }
  }

  function findFriend(friendId) {
    if (!window.FriendsSystem || typeof window.FriendsSystem.getFriends !== 'function') return null;
    const friends = window.FriendsSystem.getFriends() || [];
    return friends.find(f => f && f.userId === friendId) || null;
  }

  function formatDate(timestamp) {
    if (!timestamp) return '';
    const d = new Date(timestamp);
    if (Number.isNaN(d.getTime())) return '';
    const months = ['Jan', 'Feb', 'März', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sept', 'Okt', 'Nov', 'Dez'];
    return months[d.getMonth()] + ' ' + d.getFullYear();
  }

  function statusInfo(f) {
    if (f && f.isOnline) return { cls: 'online', text: 'Online' };
    if (f && f.status === 'away') return { cls: 'away', text: 'Abwesend' };
    return { cls: 'offline', text: 'Offline' };
  }

  /* ─── Own stats for compare section ─── */
  function getOwnStats() {
    const stats = { avgRinge: null, trainings: 0, duelsWon: 0, streak: 0 };
    try {
      const raw = localStorage.getItem('sd_quick_training_log');
      const sessions = raw ? JSON.parse(raw) : [];
      if (Array.isArray(sessions) && sessions.length) {
        stats.trainings = sessions.length;
        const avgs = sessions.map(s => Number(s && s.avg)).filter(v => Number.isFinite(v) && v > 0);
        if (avgs.length) stats.avgRinge = avgs.reduce((a, b) => a + b, 0) / avgs.length;
      }
    } catch (_e) { /* ignore */ }

    try {
      const raw = localStorage.getItem('sd_history');
      const hist = raw ? JSON.parse(raw) : [];
      if (Array.isArray(hist)) {
        stats.duelsWon = hist.filter(h => h && (h.won === true || h.result === 'win')).length;
      }
    } catch (_e) { /* ignore */ }

    try {
      if (window.gameState && Number.isFinite(window.gameState.streak)) {
        stats.streak = window.gameState.streak;
      } else {
        const s = localStorage.getItem('sd_streak');
        if (s != null) stats.streak = Number(s) || 0;
      }
    } catch (_e) { /* ignore */ }

    return stats;
  }

  /* ─── Render helpers ─── */
  function renderHeader() {
    return (
      '<div class="fp-header">' +
        '<button class="fp-back-btn" data-fp-back aria-label="Zurück">' +
          '<svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>' +
        '</button>' +
        '<div class="fp-header-title">Profil</div>' +
        '<button class="fp-menu-btn" data-fp-menu aria-label="Menü">' +
          '<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>' +
        '</button>' +
        '<div class="fp-menu-popover" data-fp-menu-popover>' +
          '<button class="fp-menu-item" data-fp-action="block">Blockieren</button>' +
          '<button class="fp-menu-item fp-menu-danger" data-fp-action="report">Melden</button>' +
          '<button class="fp-menu-item" data-fp-action="close-menu">Schließen</button>' +
        '</div>' +
      '</div>'
    );
  }

  function renderHero(f) {
    const name = esc(f.username || 'Unbekannt');
    const status = statusInfo(f);
    const initial = (f.username || '?').charAt(0).toUpperCase();
    const avatarHtml = f.avatarUrl
      ? '<img src="' + esc(f.avatarUrl) + '" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">'
      : esc(initial);
    const memberSince = formatDate(f.addedAt);

    return (
      '<div class="profile-hero-card" style="position:relative;">' +
        '<div class="ph-avatar-wrap">' +
          '<div class="ph-avatar">' + avatarHtml + '</div>' +
        '</div>' +
        '<div class="ph-info">' +
          '<div class="fp-subtitle">Freundesprofil</div>' +
          '<div class="ph-name-row">' +
            '<span class="ph-name">' + name + '</span>' +
          '</div>' +
          '<div class="ph-email" style="display:flex;align-items:center;gap:6px;">' +
            '<span class="fr-status-dot ' + status.cls + '" style="position:static;width:8px;height:8px;display:inline-block;"></span>' +
            '<span class="fr-status-text ' + status.cls + '" style="margin:0;">' + status.text + '</span>' +
          '</div>' +
          (memberSince
            ? '<div class="ph-club" data-fp-member>📅 Mitglied seit ' + esc(memberSince) + '</div>'
            : '') +
          '<div class="ph-club" data-fp-club style="display:none;"></div>' +
        '</div>' +
      '</div>'
    );
  }

  function renderActions() {
    return (
      '<div class="fp-actions">' +
        '<button class="fp-action-btn fp-message" data-fp-action="message">' +
          '<svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>' +
          '<span>Nachricht</span>' +
        '</button>' +
        '<button class="fp-action-btn fp-duel" data-fp-action="duel">' +
          '<svg viewBox="0 0 24 24"><path d="M14.5 17.5L3 6V3h3l11.5 11.5"/><path d="M13 19l6-6"/><path d="M16 16l4 4"/><path d="M19 21l2-2"/></svg>' +
          '<span>Duell</span>' +
        '</button>' +
        '<button class="fp-action-btn fp-friend-toggle" data-fp-action="remove-friend">' +
          '<svg viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><polyline points="17 11 19 13 23 9"/></svg>' +
          '<span>Freund</span>' +
        '</button>' +
      '</div>'
    );
  }

  function renderStatTiles(f) {
    const avg = (f.avgScore || f.avgRinge);
    const avgText = (avg != null && avg !== '–' && Number.isFinite(Number(avg)))
      ? Number(avg).toFixed(1)
      : '–';
    const best = f.bestScore || f.score;
    const bestText = (best != null && best !== '–') ? String(best) : '–';

    return (
      '<div class="stat-tiles-4">' +
        '<div class="stat-tile">' +
          '<div class="st-icon green"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg></div>' +
          '<div class="st-label">Ø Ringe</div>' +
          '<div class="st-value">' + avgText + '</div>' +
          '<div class="st-delta" style="font-size:0.6rem;color:rgba(255,255,255,0.3);">Saison</div>' +
        '</div>' +
        '<div class="stat-tile">' +
          '<div class="st-icon blue"><svg viewBox="0 0 24 24"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/></svg></div>' +
          '<div class="st-label">Bestes</div>' +
          '<div class="st-value">' + bestText + '</div>' +
          '<div class="st-delta" style="font-size:0.6rem;color:rgba(255,255,255,0.3);">Training</div>' +
        '</div>' +
        '<div class="stat-tile">' +
          '<div class="st-icon purple"><svg viewBox="0 0 24 24"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/></svg></div>' +
          '<div class="st-label">Duelle</div>' +
          '<div class="st-value" data-fp-stat="duels">–</div>' +
          '<div class="st-delta" style="font-size:0.6rem;color:rgba(255,255,255,0.3);">Gewonnen</div>' +
        '</div>' +
        '<div class="stat-tile">' +
          '<div class="st-icon orange"><svg viewBox="0 0 24 24"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg></div>' +
          '<div class="st-label">Tage</div>' +
          '<div class="st-value" data-fp-stat="streak">–</div>' +
          '<div class="st-delta" style="font-size:0.6rem;color:rgba(255,255,255,0.3);">In Folge</div>' +
        '</div>' +
      '</div>'
    );
  }

  function renderCompare(f, own) {
    if (!own) return '';
    const friendAvg = Number(f.avgScore || f.avgRinge);
    const friendBest = Number(f.bestScore || f.score);
    const hasAnyFriendStat = Number.isFinite(friendAvg) || Number.isFinite(friendBest);
    if (!hasAnyFriendStat) return '';

    const myAvg = Number(own.avgRinge);
    const meName = (window.StorageManager && typeof window.StorageManager.getRaw === 'function')
      ? (window.StorageManager.getRaw('username') || 'Du')
      : 'Du';
    const friendName = esc(f.username || 'Freund');
    const meInitial = esc((meName || '?').charAt(0).toUpperCase());
    const friendInitial = esc((f.username || '?').charAt(0).toUpperCase());

    function barRow(label, meVal, themVal, formatter) {
      const me = Number(meVal);
      const them = Number(themVal);
      const meOk = Number.isFinite(me) && me > 0;
      const themOk = Number.isFinite(them) && them > 0;
      if (!meOk && !themOk) return '';
      const max = Math.max(meOk ? me : 0, themOk ? them : 0) || 1;
      const mePct = meOk ? Math.max(4, Math.round((me / max) * 50)) : 0;
      const themPct = themOk ? Math.max(4, Math.round((them / max) * 50)) : 0;
      const fmt = formatter || (v => (Number.isFinite(v) ? v.toFixed(1) : '–'));
      return (
        '<div class="fp-bar-row">' +
          '<div class="fp-bar-row-vals">' +
            '<span class="fp-val-me">' + (meOk ? esc(fmt(me)) : '–') + '</span>' +
            '<span class="fp-bar-row-label">' + esc(label) + '</span>' +
            '<span class="fp-val-them">' + (themOk ? esc(fmt(them)) : '–') + '</span>' +
          '</div>' +
          '<div class="fp-bar-track">' +
            '<div class="fp-bar-me" style="width:' + mePct + '%"></div>' +
            '<div class="fp-bar-them" style="width:' + themPct + '%"></div>' +
          '</div>' +
        '</div>'
      );
    }

    const bars =
      barRow('Ø Ringe', myAvg, friendAvg) +
      barRow('Bestes Training', own.bestRinge, friendBest, v => String(Math.round(v))) +
      barRow('Duelle gewonnen', own.duelsWon, null, v => String(Math.round(v))) +
      barRow('Tage in Folge', own.streak, null, v => String(Math.round(v)));

    if (!bars) return '';

    return (
      '<div>' +
        '<div class="section-hdr" style="margin-bottom:12px;">' +
          '<span class="section-title">Vergleich</span>' +
        '</div>' +
        '<div class="fp-compare">' +
          '<div class="fp-compare-heads">' +
            '<div class="fp-compare-head fp-compare-me">' +
              '<div class="fp-compare-avatar">' + meInitial + '</div>' +
              '<div class="fp-compare-info">' +
                '<div class="fp-compare-label">' + esc(meName) + '</div>' +
                '<div class="fp-compare-value">' + (Number.isFinite(myAvg) && myAvg > 0 ? myAvg.toFixed(1) : '–') + '</div>' +
              '</div>' +
            '</div>' +
            '<div class="fp-compare-vs">VS</div>' +
            '<div class="fp-compare-head fp-compare-them">' +
              '<div class="fp-compare-info">' +
                '<div class="fp-compare-label">' + friendName + '</div>' +
                '<div class="fp-compare-value">' + (Number.isFinite(friendAvg) && friendAvg > 0 ? friendAvg.toFixed(1) : '–') + '</div>' +
              '</div>' +
              '<div class="fp-compare-avatar">' + friendInitial + '</div>' +
            '</div>' +
          '</div>' +
          bars +
        '</div>' +
      '</div>'
    );
  }

  function renderBody(f, own) {
    const compare = renderCompare(f, own);
    return (
      '<div class="fp-body">' +
        renderHero(f) +
        renderActions() +
        renderStatTiles(f) +
        compare +
      '</div>'
    );
  }

  function render() {
    const ov = document.getElementById(OVERLAY_ID);
    if (!ov || !state.friend) return;
    ov.innerHTML = '<div class="fp-sheet">' + renderHeader() + renderBody(state.friend, state.ownStats) + '</div>';
  }

  /* ─── Actions wiring ─── */
  function handleMenuToggle(ov) {
    const pop = ov.querySelector('[data-fp-menu-popover]');
    if (pop) pop.classList.toggle('fp-menu-open');
  }

  function closeMenu(ov) {
    const pop = ov.querySelector('[data-fp-menu-popover]');
    if (pop) pop.classList.remove('fp-menu-open');
  }

  function wireActions() {
    const ov = document.getElementById(OVERLAY_ID);
    if (!ov) return;

    ov.addEventListener('click', (e) => {
      const backBtn = e.target.closest('[data-fp-back]');
      if (backBtn) {
        haptic('light');
        if (history.state && history.state[HISTORY_STATE]) history.back();
        else close('user');
        return;
      }
      const menuBtn = e.target.closest('[data-fp-menu]');
      if (menuBtn) {
        handleMenuToggle(ov);
        return;
      }
      const actionEl = e.target.closest('[data-fp-action]');
      if (!actionEl) {
        // tap outside menu closes it
        closeMenu(ov);
        return;
      }

      const action = actionEl.dataset.fpAction;
      const friend = state.friend;
      if (!friend) return;

      switch (action) {
        case 'message':
          haptic('light');
          toast('Nachrichten kommen bald 💬', 'info');
          break;
        case 'duel':
          haptic('medium');
          try {
            if (window.FriendsSystem && typeof window.FriendsSystem.challengeFriend === 'function') {
              window.FriendsSystem.challengeFriend(friend.userId);
            }
          } catch (err) {
            toast('Duell konnte nicht erstellt werden', 'error');
            console.error('[FriendProfileView] duel failed', err);
          }
          close('user');
          break;
        case 'remove-friend':
          if (window.confirm('Möchtest du ' + (friend.username || 'diesen Freund') + ' wirklich entfernen?')) {
            haptic('medium');
            try {
              const p = window.FriendsSystem && typeof window.FriendsSystem.removeFriend === 'function'
                ? window.FriendsSystem.removeFriend(friend.userId)
                : null;
              if (p && typeof p.then === 'function') {
                p.catch(err => {
                  console.error('[FriendProfileView] remove failed', err);
                  toast('Konnte Freund nicht entfernen', 'error');
                });
              }
            } catch (err) {
              console.error('[FriendProfileView] remove failed', err);
              toast('Konnte Freund nicht entfernen', 'error');
            }
            close('user');
            setTimeout(() => {
              if (typeof window.refreshFreundeTab === 'function') {
                try { window.refreshFreundeTab(); } catch (_e) { /* ignore */ }
              }
            }, 50);
          }
          closeMenu(ov);
          break;
        case 'block':
          closeMenu(ov);
          toast('Blockieren kommt bald 🚫', 'info');
          break;
        case 'report':
          closeMenu(ov);
          toast('Melden kommt bald ⚠️', 'info');
          break;
        case 'close-menu':
          closeMenu(ov);
          break;
        default:
          break;
      }
    });
  }

  /* ─── Open / Close ─── */
  function open(friendId) {
    if (!friendId) return;
    if (state.isOpen && state.friend && state.friend.userId === friendId) return;

    if (!window.FriendsSystem) {
      toast('Freunde werden noch geladen…', 'info');
      return;
    }
    const friend = findFriend(friendId);
    if (!friend) {
      toast('Freund nicht gefunden', 'error');
      return;
    }

    const ov = document.getElementById(OVERLAY_ID);
    if (!ov) return;

    state.friend = friend;
    state.ownStats = getOwnStats();
    state.isOpen = true;

    render();

    ov.style.display = 'block';
    state.scrollY = window.scrollY || window.pageYOffset || 0;
    document.body.classList.add('fp-scroll-lock');
    if (window.innerWidth <= 768) {
      document.body.style.top = '-' + state.scrollY + 'px';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
    }

    requestAnimationFrame(() => {
      ov.classList.add('fp-open');
    });

    wireActions();
    haptic('medium');

    // Browser-Back-Integration
    state.closingFromPop = false;
    try {
      history.pushState({ [HISTORY_STATE]: true }, '');
    } catch (_e) { /* ignore */ }

    state.popHandler = function () {
      if (!state.isOpen) return;
      state.closingFromPop = true;
      close('pop');
    };
    window.addEventListener('popstate', state.popHandler);
  }

  function close(via) {
    const ov = document.getElementById(OVERLAY_ID);
    if (!ov || !state.isOpen) return;

    state.isOpen = false;
    ov.classList.remove('fp-open');

    setTimeout(() => {
      ov.style.display = 'none';
      ov.innerHTML = '';
    }, ANIM_MS);

    document.body.classList.remove('fp-scroll-lock');
    const scrollY = state.scrollY || 0;
    if (window.innerWidth <= 768) {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      requestAnimationFrame(() => window.scrollTo(0, scrollY));
    }

    if (state.popHandler) {
      window.removeEventListener('popstate', state.popHandler);
      state.popHandler = null;
    }

    // Wenn User selbst geschlossen hat (Back-Button), History-Entry aufräumen
    if (via === 'user' && !state.closingFromPop) {
      try {
        if (history.state && history.state[HISTORY_STATE]) history.back();
      } catch (_e) { /* ignore */ }
    }

    state.friend = null;
    state.ownStats = null;
    state.closingFromPop = false;
  }

  /* ─── Click delegation on friend list ─── */
  function setupDelegation() {
    document.addEventListener('click', (e) => {
      // Klick auf Chat-Button (oder andere data-chat-btn-Elemente) ignorieren
      if (e.target.closest('[data-chat-btn]')) return;
      const row = e.target.closest('#inlineFriendsList .friend-row[data-friend-id]');
      if (!row) return;
      const fid = row.getAttribute('data-friend-id');
      if (!fid) return;
      open(fid);
    });
  }

  function init() {
    setupDelegation();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }

  window.FriendProfileView = { open: open, close: () => close('user') };
})();
