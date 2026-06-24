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
    workerProfile: null,
    activeTab: 'stats',
    activityData: null,
    activityLoading: false,
    closingFromPop: false,
    popHandler: null,
    scrollY: 0,
  };

  async function fetchWorkerProfile(publicId) {
    if (!publicId) return null;
    try {
      const res = await fetch('/api/profile/' + encodeURIComponent(publicId));
      if (!res.ok) return null;
      return await res.json();
    } catch (_e) { return null; }
  }

  async function fetchFriendActivity(publicId) {
    if (!publicId) return null;
    try {
      const res = await fetch('/api/profile/' + encodeURIComponent(publicId) + '/activity');
      if (!res.ok) return null;
      const data = await res.json();
      return data.activity || [];
    } catch (_e) { return null; }
  }

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

  function getOwnStats() {
    const stats = { avgRinge: null, bestRinge: null, trainings: 0, duelsWon: 0, streak: 0 };
    try {
      const raw = localStorage.getItem('sd_history');
      const hist = raw ? JSON.parse(raw) : [];
      if (Array.isArray(hist)) {
        stats.trainings = hist.length;
        stats.duelsWon = hist.filter(h => h && (h.won === true || h.result === 'win')).length;
        const scores = hist
          .map(h => Number(h && (h.playerPts ?? h.playerScore ?? h.score)))
          .filter(v => Number.isFinite(v) && v > 0);
        if (scores.length) {
          stats.avgRinge = scores.reduce((a, b) => a + b, 0) / scores.length;
          stats.bestRinge = scores.reduce((a, b) => Math.max(a, b), scores[0]);
        }
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

  function getH2HRecord(friendId) {
    try {
      const raw = localStorage.getItem('sd_history');
      const hist = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(hist)) return null;
      const relevant = hist.filter(h => h && (h.opponentId === friendId || h.friendId === friendId));
      if (!relevant.length) return null;
      const wins = relevant.filter(h => h.won === true || h.result === 'win').length;
      return { wins, losses: relevant.length - wins };
    } catch (_e) { return null; }
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
          (memberSince ? '<div class="ph-club" data-fp-member>📅 Mitglied seit ' + esc(memberSince) + '</div>' : '') +
          '<div class="ph-club" data-fp-club style="display:none;"></div>' +
        '</div>' +
      '</div>'
    );
  }

  function renderActions(f) {
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

  function renderTabs() {
    const tabs = [
      { id: 'stats', label: 'Statistik' },
      { id: 'achievements', label: 'Erfolge' },
      { id: 'activity', label: 'Aktivität' },
    ];
    return (
      '<div class="fp-tab-bar">' +
        tabs.map(t =>
          '<button class="fp-tab-btn' + (state.activeTab === t.id ? ' fp-tab-active' : '') + '" data-fp-tab="' + t.id + '">' +
            t.label +
          '</button>'
        ).join('') +
      '</div>'
    );
  }

  function renderH2H(f) {
    const rec = getH2HRecord(f.userId);
    if (!rec) return '';
    const name = esc(f.username || 'Freund');
    return (
      '<div class="fp-h2h-banner">' +
        '<span class="fp-h2h-me">Du</span>' +
        '<div class="fp-h2h-score">' +
          '<span class="fp-h2h-wins">' + rec.wins + '</span>' +
          '<span class="fp-h2h-sep">:</span>' +
          '<span class="fp-h2h-losses">' + rec.losses + '</span>' +
        '</div>' +
        '<span class="fp-h2h-them">' + name + '</span>' +
      '</div>'
    );
  }

  function renderStatTiles(f) {
    const avg = Number(f.avgScore || f.avgRinge);
    const avgText = Number.isFinite(avg) && avg > 0 ? avg.toFixed(1) : '–';
    const best = Number(f.bestScore || f.score);
    const bestText = Number.isFinite(best) && best > 0 ? String(Math.round(best)) : '–';

    const bs = (state.workerProfile && state.workerProfile.bestStats) || {};
    const winRate = typeof bs.winRate === 'number' ? Math.round(bs.winRate * 100) + '%' : '–';
    const totalGames = Number.isFinite(bs.totalGames) && bs.totalGames > 0 ? String(bs.totalGames) : '–';
    const streak = Number.isFinite(bs.currentStreak) && bs.currentStreak > 0 ? String(bs.currentStreak) : '–';
    const duelsWon = Number.isFinite(bs.wins) && bs.wins > 0 ? String(bs.wins) : '–';

    return (
      '<div class="stat-tiles-6">' +
        tile('green',
          '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>',
          'Ø Ringe', avgText, 'Saison') +
        tile('blue',
          '<svg viewBox="0 0 24 24"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/></svg>',
          'Bestes', bestText, 'Training') +
        tile('purple',
          '<svg viewBox="0 0 24 24"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/></svg>',
          'Duelle', duelsWon, 'Gewonnen') +
        tile('orange',
          '<svg viewBox="0 0 24 24"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>',
          'Streak', streak, 'Tage') +
        tile('cyan',
          '<svg viewBox="0 0 24 24"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>',
          'Siegquote', winRate, 'Duelle') +
        tile('red',
          '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
          'Spiele', totalGames, 'Gesamt') +
      '</div>'
    );
  }

  function tile(color, iconSvg, label, value, sub) {
    return (
      '<div class="stat-tile">' +
        '<div class="st-icon ' + color + '">' + iconSvg + '</div>' +
        '<div class="st-label">' + esc(label) + '</div>' +
        '<div class="st-value">' + esc(value) + '</div>' +
        '<div class="st-delta">' + esc(sub) + '</div>' +
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
      const meOk = Number.isFinite(me) && me >= 0;
      const themOk = Number.isFinite(them) && them >= 0;
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

  function renderAchievements(wp) {
    const bs = (wp && wp.bestStats) || {};
    const bestScore = Number(bs.bestScore) || 0;
    const totalGames = Number(bs.totalGames) || 0;
    const winRate = typeof bs.winRate === 'number' ? bs.winRate : 0;

    const allBadges = [
      { emoji: '⚡', name: 'Schnellstarter', desc: 'Erste Partie gespielt', unlocked: true },
      { emoji: '🎯', name: 'Scharfschütze', desc: 'Score ≥ 390 erreicht', unlocked: bestScore >= 390 },
      { emoji: '🔥', name: 'Auf Achse', desc: '10+ Partien gespielt', unlocked: totalGames >= 10 },
      { emoji: '🏆', name: 'Duell-Profi', desc: '60%+ Siegquote', unlocked: winRate >= 0.6 },
      { emoji: '💎', name: 'Meisterschütze', desc: 'Privat', unlocked: false },
      { emoji: '🔰', name: 'Veteran', desc: 'Privat', unlocked: false },
      { emoji: '🎖️', name: 'Turnierprofi', desc: 'Privat', unlocked: false },
      { emoji: '🌟', name: 'Legende', desc: 'Privat', unlocked: false },
    ];

    const hasAny = allBadges.some(b => b.unlocked);

    return (
      '<div class="fp-achievements">' +
        '<div class="fp-achievements-grid">' +
          allBadges.map(b =>
            '<div class="fp-badge' + (b.unlocked ? ' fp-badge-unlocked' : ' fp-badge-locked') + '">' +
              '<div class="fp-badge-icon">' +
                (b.unlocked ? b.emoji : '<svg viewBox="0 0 24 24" width="22" height="22"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>') +
              '</div>' +
              '<div class="fp-badge-name">' + esc(b.name) + '</div>' +
              '<div class="fp-badge-desc">' + esc(b.desc) + '</div>' +
            '</div>'
          ).join('') +
        '</div>' +
        (!hasAny && !wp ? '<div class="fp-empty-state">Keine Daten verfügbar.</div>' : '') +
        '<div class="fp-privacy-note">🔒 Einige Erfolge sind privat und werden nicht angezeigt.</div>' +
      '</div>'
    );
  }

  function renderActivityPanel() {
    const data = state.activityData;
    const loading = state.activityLoading;

    if (loading) {
      return '<div class="fp-activity"><div class="fp-loading-spinner"></div></div>';
    }

    if (!data || data.length === 0) {
      return (
        '<div class="fp-activity">' +
          '<div class="fp-empty-state">' +
            '<div style="font-size:2rem;margin-bottom:8px;">📭</div>' +
            '<div>Noch keine Aktivität sichtbar.</div>' +
          '</div>' +
        '</div>'
      );
    }

    const totalSessions = data.reduce((s, d) => s + d.count, 0);
    const activeDays = data.length;
    const maxPerDay = data.reduce((m, d) => Math.max(m, d.count), 0);

    const sessions = [];
    for (const entry of data.slice(-5).reverse()) {
      const d = new Date(entry.date);
      const label = d.toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short' });
      sessions.push('<div class="fp-session-row">' +
        '<span class="fp-session-date">' + esc(label) + '</span>' +
        '<span class="fp-session-count">' + entry.count + ' Partie' + (entry.count !== 1 ? 'n' : '') + '</span>' +
        '</div>');
    }

    return (
      '<div class="fp-activity">' +
        '<div class="fp-activity-tiles">' +
          '<div class="fp-activity-tile">' +
            '<div class="fp-at-value">' + totalSessions + '</div>' +
            '<div class="fp-at-label">Partien</div>' +
          '</div>' +
          '<div class="fp-activity-tile">' +
            '<div class="fp-at-value">' + activeDays + '</div>' +
            '<div class="fp-at-label">Aktive Tage</div>' +
          '</div>' +
          '<div class="fp-activity-tile">' +
            '<div class="fp-at-value">' + maxPerDay + '</div>' +
            '<div class="fp-at-label">Max. pro Tag</div>' +
          '</div>' +
        '</div>' +
        '<div id="fpHeatmapMount" class="fp-heatmap-wrap"></div>' +
        '<div class="fp-session-list">' +
          '<div class="fp-section-label">Letzte Sessions</div>' +
          sessions.join('') +
        '</div>' +
      '</div>'
    );
  }

  function renderTabContent(f, own) {
    switch (state.activeTab) {
      case 'stats':
        return renderH2H(f) + renderStatTiles(f) + renderCompare(f, own);
      case 'achievements':
        return renderAchievements(state.workerProfile);
      case 'activity':
        return renderActivityPanel();
      default:
        return '';
    }
  }

  function renderBody(f, own) {
    return (
      '<div class="fp-body">' +
        renderHero(f) +
        renderActions(f) +
        renderTabs() +
        '<div class="fp-tab-content" id="fpTabContent">' +
          renderTabContent(f, own) +
        '</div>' +
      '</div>'
    );
  }

  function render() {
    const ov = document.getElementById(OVERLAY_ID);
    if (!ov || !state.friend) return;
    ov.innerHTML = '<div class="fp-sheet">' + renderHeader() + renderBody(state.friend, state.ownStats) + '</div>';
    mountHeatmapIfNeeded();
  }

  function updateTabContent() {
    const el = document.getElementById('fpTabContent');
    if (!el || !state.friend) return;
    el.innerHTML = renderTabContent(state.friend, state.ownStats);
    mountHeatmapIfNeeded();
  }

  function mountHeatmapIfNeeded() {
    if (state.activeTab !== 'activity') return;
    const mount = document.getElementById('fpHeatmapMount');
    if (!mount || !state.activityData || !state.activityData.length) return;
    if (window.TrainingHeatmap && typeof window.TrainingHeatmap.render === 'function') {
      const sessions = state.activityData.map(d => ({
        date: d.date,
        count: d.count,
      }));
      window.TrainingHeatmap.render(sessions, 'fpHeatmapMount');
    }
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

  function switchTab(tab) {
    if (state.activeTab === tab) return;
    state.activeTab = tab;

    const ov = document.getElementById(OVERLAY_ID);
    if (!ov) return;
    ov.querySelectorAll('.fp-tab-btn').forEach(btn => {
      btn.classList.toggle('fp-tab-active', btn.dataset.fpTab === tab);
    });

    if (tab === 'activity' && !state.activityData && !state.activityLoading) {
      const publicId = state.friend && (state.friend.publicId || state.friend.public_id);
      if (publicId) {
        state.activityLoading = true;
        updateTabContent();
        fetchFriendActivity(publicId).then(data => {
          state.activityData = data || [];
          state.activityLoading = false;
          updateTabContent();
        });
        return;
      }
    }

    updateTabContent();
    haptic('light');
  }

  function wireActions() {
    const ov = document.getElementById(OVERLAY_ID);
    if (!ov || ov._fpWired) return;
    ov._fpWired = true;

    ov.addEventListener('click', (e) => {
      const tabBtn = e.target.closest('[data-fp-tab]');
      if (tabBtn) {
        switchTab(tabBtn.dataset.fpTab);
        return;
      }

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
        closeMenu(ov);
        return;
      }

      const action = actionEl.dataset.fpAction;
      const friend = state.friend;
      if (!friend) return;

      switch (action) {
        case 'message':
          haptic('light');
          if (window.ChatView && typeof window.ChatView.open === 'function') {
            window.ChatView.open(friend);
          } else {
            toast('Chat wird geladen…', 'info');
          }
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
    state.workerProfile = null;
    state.activeTab = 'stats';
    state.activityData = null;
    state.activityLoading = false;
    state.isOpen = true;

    render();

    const publicId = friend.publicId || friend.public_id;
    if (publicId) {
      fetchWorkerProfile(publicId).then(wp => {
        if (state.isOpen && state.friend && state.friend.userId === friendId) {
          state.workerProfile = wp;
          if (state.activeTab === 'stats') {
            updateTabContent();
          }
        }
      });
    }

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

    if (via === 'user' && !state.closingFromPop) {
      try {
        if (history.state && history.state[HISTORY_STATE]) history.back();
      } catch (_e) { /* ignore */ }
    }

    state.friend = null;
    state.ownStats = null;
    state.workerProfile = null;
    state.activityData = null;
    state.closingFromPop = false;
  }

  /* ─── Click delegation on friend list ─── */
  function setupDelegation() {
    document.addEventListener('click', (e) => {
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
