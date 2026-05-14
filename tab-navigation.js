/* Tab Navigation – Schuss Challenge Redesign */
(function () {
  'use strict';

  const TABS = ['start', 'training', 'challenges', 'freunde', 'profil'];
  let currentTab = 'start';
  let initialized = false;

  /* ── Header configs ── */
  function renderHeader(tabId) {
    const left = document.getElementById('ahTitleBlock');
    const actions = document.getElementById('ahActions');
    if (!left || !actions) return;

    const username = (typeof StorageManager !== 'undefined' && StorageManager.getRaw('username')) || 'Schütze';

    const configs = {
      start: {
        left: `<div class="ah-greeting-title">Hallo, ${escapeHtml(username)}! 👋</div>
               <div class="ah-greeting-sub">Bereit für dein nächstes Training?</div>`,
        right: `<button class="ah-icon-btn" id="updatesButton" onclick="if(window.UpdatesSystem) window.UpdatesSystem.toggleUpdates();" title="Updates" style="position:relative;">
                  <svg viewBox="0 0 24 24" style="width:20px;height:20px;stroke:currentColor;fill:none;stroke-width:2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                  <div id="updatesDropdown" style="display:none;position:absolute;top:52px;right:0;width:min(320px,calc(100vw - 40px));max-height:400px;background:linear-gradient(180deg,#1e293b 0%,#0f172a 100%);border-radius:16px;border:1px solid rgba(255,255,255,0.1);box-shadow:0 10px 40px rgba(0,0,0,0.5);overflow-y:auto;z-index:10000;opacity:0;transform:translateY(-10px);transition:all 0.2s;"><div style="padding:16px;"><div style="color:#fff;font-weight:700;font-size:1rem;margin-bottom:12px;">🔔 UPDATES</div><div id="updatesDropdownContent"></div></div></div>
                </button>`
      },
      training: {
        left: `<div class="ah-page-title">Training</div>
               <div class="ah-page-sub">Verbessere dich. Jeden Schuss.</div>`,
        right: `<button class="ah-icon-btn" onclick="filterTraining()" title="Filter">
                  <svg viewBox="0 0 24 24" style="width:18px;height:18px;stroke:currentColor;fill:none;stroke-width:2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
                </button>
                <button class="ah-add-btn" onclick="openDuelSetup()" title="Neues Training">
                  <svg viewBox="0 0 24 24" style="width:18px;height:18px;stroke:currentColor;fill:none;stroke-width:2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                </button>`
      },
      challenges: {
        left: `<div class="ah-page-title">Challenges</div>
               <div class="ah-page-sub">Fordere Freunde heraus!</div>`,
        right: `<button class="ah-icon-btn" title="Filter">
                  <svg viewBox="0 0 24 24" style="width:18px;height:18px;stroke:currentColor;fill:none;stroke-width:2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
                </button>
                <button class="ah-add-btn" onclick="openDuelSetup()" title="Neue Challenge">
                  <svg viewBox="0 0 24 24" style="width:18px;height:18px;stroke:currentColor;fill:none;stroke-width:2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                </button>`
      },
      freunde: {
        left: `<div class="ah-page-title" style="display:flex;align-items:center;gap:8px;">Freunde
                 <svg viewBox="0 0 24 24" style="width:22px;height:22px;stroke:rgba(255,255,255,0.5);fill:none;stroke-width:2;margin-bottom:2px;"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
               </div>
               <div class="ah-page-sub">Trainiere zusammen. Fordere dich heraus.</div>`,
        right: `<button class="ah-icon-btn" onclick="if(window.FriendsSystem) window.FriendsSystem.showFriendsOverlay();" title="Freund hinzufügen">
                  <svg viewBox="0 0 24 24" style="width:18px;height:18px;stroke:currentColor;fill:none;stroke-width:2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
                </button>
                <button class="ah-icon-btn" title="Suchen">
                  <svg viewBox="0 0 24 24" style="width:18px;height:18px;stroke:currentColor;fill:none;stroke-width:2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                </button>`
      },
      profil: {
        left: `<div class="ah-page-title">Profil</div>
               <div class="ah-page-sub">Deine Statistiken. Dein Fortschritt.</div>`,
        right: `<button class="ah-icon-btn" onclick="if(window.toggleProfileMenu) window.toggleProfileMenu();" title="Einstellungen">
                  <svg viewBox="0 0 24 24" style="width:18px;height:18px;stroke:currentColor;fill:none;stroke-width:2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                </button>
                <button class="ah-icon-btn" onclick="if(window.UpdatesSystem) window.UpdatesSystem.toggleUpdates();" title="Benachrichtigungen">
                  <svg viewBox="0 0 24 24" style="width:18px;height:18px;stroke:currentColor;fill:none;stroke-width:2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                </button>`
      }
    };

    const cfg = configs[tabId] || configs.start;
    left.innerHTML = cfg.left;
    actions.innerHTML = cfg.right;
  }

  function escapeHtml(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  /* ── Tab switching ── */
  window.switchTab = function (tabId) {
    if (!TABS.includes(tabId)) return;
    if (tabId === currentTab && initialized) return;
    currentTab = tabId;

    TABS.forEach(t => {
      const panel = document.getElementById('tab' + cap(t));
      const btn = document.querySelector('.bn-tab[data-tab="' + t + '"]');
      if (panel) panel.classList.remove('active', 'tab-enter');
      if (btn) btn.classList.remove('active');
    });

    const panel = document.getElementById('tab' + cap(tabId));
    const btn = document.querySelector('.bn-tab[data-tab="' + tabId + '"]');
    if (panel) {
      panel.classList.add('active');
      requestAnimationFrame(() => panel.classList.add('tab-enter'));
    }
    if (btn) btn.classList.add('active');

    renderHeader(tabId);
    updateFABVisibility(tabId);
    document.body.className = document.body.className.replace(/\btab-\S+/g, '').trim();
    document.body.classList.add('tab-' + tabId);

    /* Tab-specific refresh */
    try {
      if (tabId === 'start')     refreshStartTab();
      if (tabId === 'training')  refreshTrainingTab();
      if (tabId === 'challenges') refreshChallengesTab();
      if (tabId === 'freunde')   refreshFreundeTab();
      if (tabId === 'profil')    refreshProfilTab();
    } catch(e) { /* silently ignore refresh errors */ }
  };

  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  function updateFABVisibility(tabId) {
    const fab = document.getElementById('btnOpenDuelSetup');
    if (!fab) return;
    fab.style.display = (tabId === 'start' || tabId === 'training') ? '' : 'none';
  }

  /* ── Inner tabs ── */
  window.switchInnerTab = function(groupId, tabId) {
    const group = document.getElementById(groupId);
    if (!group) return;
    group.querySelectorAll('.it-tab').forEach(t => t.classList.remove('active'));
    group.querySelectorAll('.it-panel').forEach(p => p.style.display = 'none');
    const activeBtn = group.querySelector('.it-tab[data-itab="' + tabId + '"]');
    const activePanel = group.querySelector('.it-panel[data-itab="' + tabId + '"]');
    if (activeBtn) activeBtn.classList.add('active');
    if (activePanel) activePanel.style.display = '';
  };

  /* ── Refresh functions ── */
  function refreshStartTab() {
    if (window.refreshPremiumDashboard) window.refreshPremiumDashboard();
    refreshStartGoalCard();
    refreshStartStats();
    refreshLastTraining();
  }

  function refreshStartGoalCard() {
    const sessions = getQuickTrainingSessions();
    const progress = sessions.length > 0 ? sessions[0].avg || 0 : 0;
    const goal = 95;
    const pct = Math.min(100, Math.round((progress / goal) * 100));

    const titleEl = document.getElementById('gcGoalTitle');
    const textEl = document.getElementById('gcProgressText');
    const barEl = document.getElementById('gcBarFill');
    const pctEl = document.getElementById('gcRingPct');
    const ringFill = document.getElementById('gcRingFill');

    if (titleEl) titleEl.textContent = 'Treffe ' + goal + '+ Ringe';
    if (textEl) textEl.textContent = progress.toFixed(1) + ' / ' + goal + ' Ringe';
    if (barEl) barEl.style.width = pct + '%';
    if (pctEl) pctEl.textContent = pct + '%';
    if (ringFill) {
      const circ = 163;
      ringFill.style.strokeDashoffset = circ - (circ * pct / 100);
    }
  }

  function refreshStartStats() {
    const sessions = getQuickTrainingSessions();
    const weekSessions = sessions.filter(s => {
      const d = new Date(s.date || s.timestamp || 0);
      const now = new Date();
      return (now - d) < 7 * 24 * 3600 * 1000;
    });
    const weekAvg = weekSessions.length > 0
      ? (weekSessions.reduce((a,s) => a + (s.avg || 0), 0) / weekSessions.length).toFixed(1)
      : '–';

    const el1 = document.getElementById('stWeekAvg');
    const el2 = document.getElementById('stTotalTrainings');
    if (el1) el1.textContent = weekAvg;
    if (el2) el2.textContent = sessions.length;

    const state = (typeof StorageManager !== 'undefined') ? JSON.parse(StorageManager.getRaw('gameState') || 'null') : null;
    const wins = state ? (state.stats && state.stats.wins || 0) : 0;
    const el3 = document.getElementById('stChallengesWon');
    if (el3) el3.textContent = wins;
  }

  function refreshLastTraining() {
    const sessions = getQuickTrainingSessions();
    const container = document.getElementById('lastTrainingContainer');
    if (!container) return;

    if (sessions.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🎯</div><div>Noch kein Training erfasst</div></div>';
      return;
    }
    const s = sessions[0];
    const avg = (s.avg || 0).toFixed(1);
    const scoreClass = parseFloat(avg) >= 95 ? '' : parseFloat(avg) >= 90 ? 'yellow' : 'orange';
    const dateStr = formatDate(s.date || s.timestamp);

    container.innerHTML = `
      <div class="last-training-card">
        <div class="ltc-top">
          <div class="ltc-target-placeholder">🎯</div>
          <div class="ltc-info">
            <div class="ltc-discipline">${escapeHtml(s.discipline || 'Luftgewehr · 10m')}</div>
            <div class="ltc-date">${dateStr}</div>
          </div>
          <div class="ltc-score-badge">
            <div class="ltc-score-val" style="color:${scoreClass==='yellow'?'#ffc840':scoreClass==='orange'?'#ff9500':'var(--accent)'}">${avg}</div>
            <div class="ltc-score-lbl">Ringe</div>
          </div>
        </div>
        <div class="ltc-stats">
          <div class="ltc-stat"><div class="ltc-stat-val">${s.shots || s.count || '–'}</div><div class="ltc-stat-lbl">Schüsse</div></div>
          <div class="ltc-stat"><div class="ltc-stat-val">${avg}</div><div class="ltc-stat-lbl">Ø Ringe</div></div>
          <div class="ltc-stat"><div class="ltc-stat-val">${(s.best || s.max || avg)}</div><div class="ltc-stat-lbl">Beste Serie</div></div>
        </div>
        <div class="ltc-footer">
          <button class="ltc-link" onclick="switchTab('training')">Ergebnis ansehen <svg viewBox="0 0 24 24" style="width:14px;height:14px;stroke:currentColor;fill:none;stroke-width:2.5"><polyline points="9 18 15 12 9 6"/></svg></button>
        </div>
      </div>`;
  }

  function refreshTrainingTab() {
    const sessions = getQuickTrainingSessions();
    refreshTrainingStats(sessions);
    refreshTrainingList(sessions);
  }

  function refreshTrainingStats(sessions) {
    const all = sessions;
    const week = all.filter(s => (Date.now() - new Date(s.date || s.timestamp || 0)) < 7*24*3600*1000);
    const avg = all.length > 0 ? (all.reduce((a,s) => a+(s.avg||0),0)/all.length).toFixed(1) : '–';
    const best = all.length > 0 ? Math.max(...all.map(s=>s.avg||0)).toFixed(1) : '–';
    const bestSession = all.length > 0 ? all.reduce((a,s) => (s.avg||0)>(a.avg||0)?s:a, all[0]) : null;

    const setEl = (id, v) => { const el=document.getElementById(id); if(el) el.textContent = v; };
    setEl('tAvgRinge', avg);
    setEl('tBestTraining', best);
    setEl('tBestDate', bestSession ? formatDate(bestSession.date || bestSession.timestamp) : '–');
    setEl('tWeekCount', week.length);
    setEl('tTotalCount', all.length);
  }

  function refreshTrainingList(sessions) {
    const container = document.getElementById('trainingListContainer');
    if (!container) return;
    if (sessions.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📋</div><div>Noch keine Trainingseinheiten</div></div>';
      return;
    }
    container.innerHTML = sessions.slice(0, 20).map(s => {
      const avg = (s.avg || 0).toFixed(1);
      const scoreClass = parseFloat(avg) >= 95 ? '' : parseFloat(avg) >= 90 ? 'yellow' : 'orange';
      const dateStr = formatDate(s.date || s.timestamp);
      return `<div class="ts-card">
        <div class="ts-target">🎯</div>
        <div class="ts-info">
          <div class="ts-header">
            <span class="ts-discipline">${escapeHtml(s.discipline || 'Luftgewehr – 10m')}</span>
            <span class="ts-score ${scoreClass}">${avg}</span>
          </div>
          <div class="ts-date">${dateStr}</div>
          <div class="ts-stats">Schüsse: ${s.shots||s.count||'–'} | Ø Ringe: ${avg} | Beste Serie: ${s.best||s.max||avg}</div>
        </div>
        <svg class="ts-chevron" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
      </div>`;
    }).join('');
  }

  function refreshChallengesTab() {
    /* Daily challenge UI is already mounted in #dailyChallengeUIMount */
  }

  function refreshFreundeTab() {
    const container = document.getElementById('inlineFriendsList');
    if (!container) return;
    if (window.FriendsSystem && typeof window.FriendsSystem.renderInline === 'function') {
      window.FriendsSystem.renderInline(container);
    } else {
      /* Fallback: show existing friends data */
      const friends = window.FriendsSystem && window.FriendsSystem.getFriends ? window.FriendsSystem.getFriends() : [];
      if (friends.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">👥</div><div>Noch keine Freunde hinzugefügt</div></div>';
      } else {
        container.innerHTML = friends.map(f => buildFriendRow(f)).join('');
      }
    }
    refreshFreundeStats();
  }

  function buildFriendRow(f) {
    const statusClass = f.isOnline ? 'online' : f.status === 'away' ? 'away' : 'offline';
    const statusText = f.isOnline ? 'Online' : f.status === 'away' ? 'Abwesend' : 'Offline';
    const name = escapeHtml(f.username || f.name || 'Unbekannt');
    const best = f.bestScore || f.score || '–';
    const avg = f.avgScore || f.avgRinge || '–';
    return `<div class="friend-row">
      <div class="fr-avatar-wrap">
        <div class="fr-avatar">${(f.avatar || name.charAt(0)).replace(/[<>&"]/g,'')}</div>
        <span class="fr-status-dot ${statusClass}"></span>
      </div>
      <div class="fr-info">
        <div class="fr-name">${name}</div>
        <div class="fr-status-text ${statusClass}">${statusText}</div>
        <div class="fr-avg">Ø Ringe: ${avg}</div>
      </div>
      <div class="fr-best">
        <div class="fr-best-val">${best}</div>
        <div class="fr-best-lbl">Bestes Training</div>
      </div>
      <button class="fr-chat-btn"><svg viewBox="0 0 24 24" style="width:16px;height:16px;stroke:rgba(255,255,255,0.4);fill:none;stroke-width:1.8"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></button>
      <svg class="fr-chevron" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
    </div>`;
  }

  function refreshFreundeStats() {
    const friends = window.FriendsSystem && window.FriendsSystem.getFriends ? window.FriendsSystem.getFriends() : [];
    const el = document.getElementById('friendsCount');
    if (el) el.textContent = friends.length;
    const badge = document.getElementById('fhcCountBadge');
    if (badge) badge.textContent = friends.length;
  }

  function refreshProfilTab() {
    const username = (typeof StorageManager !== 'undefined' && StorageManager.getRaw('username')) || 'Schütze';
    const state = (typeof StorageManager !== 'undefined') ? JSON.parse(StorageManager.getRaw('gameState') || 'null') : null;
    const avatar = (typeof StorageManager !== 'undefined' && StorageManager.getRaw('avatar')) || '🎯';

    const nameEl = document.getElementById('ptProfileName');
    if (nameEl) nameEl.textContent = username;
    const avatarEl = document.getElementById('ptProfileAvatar');
    if (avatarEl) avatarEl.textContent = avatar;

    if (state) {
      const stats = state.stats || {};
      const xp = state.xp || 0;
      const streak = state.streak || state.currentStreak || 0;

      const setEl = (id,v) => { const e=document.getElementById(id); if(e) e.textContent=v; };
      setEl('ptStatGames', stats.games || 0);
      setEl('ptStatWins', stats.wins || 0);
      setEl('ptStatStreak', streak);

      /* XP / Level */
      const level = Math.floor(xp / 250) + 1;
      const xpInLevel = xp % 250;
      const xpPct = Math.round((xpInLevel / 250) * 100);
      setEl('ptLevel', 'Level ' + level);
      setEl('ptXpText', xp.toLocaleString('de') + ' / ' + ((level) * 250).toLocaleString('de') + ' XP');
      const bar = document.getElementById('ptXpBar');
      if (bar) bar.style.width = xpPct + '%';
    }

    /* Training stats */
    const sessions = getQuickTrainingSessions();
    const avg = sessions.length > 0 ? (sessions.reduce((a,s)=>a+(s.avg||0),0)/sessions.length).toFixed(1) : '–';
    const setEl = (id,v) => { const e=document.getElementById(id); if(e) e.textContent=v; };
    setEl('ptStatTrainings', sessions.length);
    setEl('ptAvgRinge', avg);

    /* Club */
    const club = (typeof StorageManager !== 'undefined' && StorageManager.getRaw('clubName')) || '';
    const clubEl = document.getElementById('ptClub');
    if (clubEl) clubEl.textContent = club ? '📍 ' + club : '';
    const emailEl = document.getElementById('ptEmail');
    if (emailEl) {
      const email = (typeof StorageManager !== 'undefined' && StorageManager.getRaw('userEmail')) || '';
      emailEl.textContent = email;
    }
  }

  /* ── Helpers ── */
  function getQuickTrainingSessions() {
    try {
      if (window.QuickTrainingSystem && typeof window.QuickTrainingSystem.getHistory === 'function') {
        return window.QuickTrainingSystem.getHistory() || [];
      }
      const raw = localStorage.getItem('quickTrainingHistory') || localStorage.getItem('qt_history') || '[]';
      return JSON.parse(raw) || [];
    } catch(e) { return []; }
  }

  function formatDate(d) {
    if (!d) return '–';
    try {
      const date = new Date(d);
      if (isNaN(date)) return '–';
      return date.toLocaleDateString('de-DE', { day: 'numeric', month: 'short', year: 'numeric' })
        + ' · ' + date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    } catch(e) { return '–'; }
  }

  /* ── Init ── */
  function init() {
    if (initialized) return;
    initialized = true;
    renderHeader('start');
    updateFABVisibility('start');
    document.body.classList.add('tab-start');

    /* Defer first refresh to let other systems load */
    setTimeout(() => {
      try { refreshStartTab(); } catch(e) {}
    }, 500);
    setTimeout(() => {
      try { refreshTrainingTab(); } catch(e) {}
    }, 800);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 0);
  }
  /* Also re-init after all deferred scripts load */
  window.addEventListener('load', () => { try { refreshStartTab(); } catch(e) {} });

})();
