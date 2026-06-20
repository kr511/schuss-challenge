/* Tab Navigation – Schuss Challenge Redesign */
(function () {
  'use strict';

  const TABS = ['start', 'training', 'challenges', 'freunde', 'profil'];
  let currentTab = 'start';
  let initialized = false;
  let filterDiscipline = 'alle';
  let filterPeriod = 'gesamt';
  let friendSortMode = 'online';
  try { friendSortMode = localStorage.getItem('sd_friend_sort') === 'offline' ? 'offline' : 'online'; } catch (_e) {}

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
        right: `<button class="ah-icon-btn" onclick="filterTraining()" title="Filter" style="position:relative;">
                  <svg viewBox="0 0 24 24" style="width:18px;height:18px;stroke:currentColor;fill:none;stroke-width:2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
                  <span id="trainingFilterBadge" style="display:none;position:absolute;top:4px;right:4px;background:var(--accent);color:#000;font-size:0.55rem;font-weight:700;border-radius:8px;padding:1px 4px;line-height:1.4;"></span>
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
        right: `<button class="ah-icon-btn" onclick="if(window.FriendsSystem) window.FriendsSystem.showFriendsOverlay();" title="Freund hinzufügen" aria-label="Freund per Code hinzufügen">
                  <svg viewBox="0 0 24 24" width="22" height="22" style="width:22px;height:22px;flex:0 0 auto;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
                </button>
                <button class="ah-icon-btn" id="friendSearchBtn" onclick="if(window.FriendSearch&&window.FriendSearch.open){window.FriendSearch.open();}" title="Suchen" aria-label="Spieler suchen">
                  <svg viewBox="0 0 24 24" width="22" height="22" style="width:22px;height:22px;flex:0 0 auto;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                </button>`
      },
      profil: {
        left: `<div class="ah-page-title">Profil</div>
               <div class="ah-page-sub">Deine Statistiken. Dein Fortschritt.</div>`,
        right: `<button class="ah-icon-btn" onclick="if(window.ProfileSettings) window.ProfileSettings.open(); else if(window.toggleProfileMenu) window.toggleProfileMenu();" title="Einstellungen" aria-label="Einstellungen">
                  <svg viewBox="0 0 24 24" style="width:18px;height:18px;stroke:currentColor;fill:none;stroke-width:2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                </button>
                <button class="ah-icon-btn" onclick="if(window.UpdatesSystem) window.UpdatesSystem.toggleUpdates();" title="Benachrichtigungen" aria-label="Benachrichtigungen">
                  <svg viewBox="0 0 24 24" style="width:18px;height:18px;stroke:currentColor;fill:none;stroke-width:2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                </button>`
      }
    };

    const cfg = configs[tabId] || configs.start;
    left.innerHTML = cfg.left;
    actions.innerHTML = cfg.right;
    if (tabId === 'profil') {
      const settingsButton = actions.querySelector('[title="Einstellungen"]');
      const updatesButton = actions.querySelector('[title="Benachrichtigungen"]');
      if (settingsButton && updatesButton) {
        settingsButton.style.order = '';
        updatesButton.style.order = '';
        actions.insertBefore(updatesButton, settingsButton);
      }
    }
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
    // Tab buttons live inside `group`; panels are siblings of `group` inside
    // the same parent container (.page-content), so query the parent scope.
    const scope = group.parentElement || group;
    group.querySelectorAll('.it-tab').forEach(t => t.classList.remove('active'));
    scope.querySelectorAll('.it-panel').forEach(p => p.style.display = 'none');
    const activeBtn = group.querySelector('.it-tab[data-itab="' + tabId + '"]');
    const activePanel = scope.querySelector('.it-panel[data-itab="' + tabId + '"]');
    if (activeBtn) activeBtn.classList.add('active');
    if (activePanel) activePanel.style.display = '';
  };

  /* ── Refresh functions ── */
  function refreshStartTab() {
    if (window.refreshPremiumDashboard) window.refreshPremiumDashboard();
    refreshStartGoalCard();
    refreshStartStats();
    refreshLastTraining();
    refreshStartChallenges();
  }

  function refreshStartChallenges() {
    const container = document.getElementById('activeChallengesStart');
    if (!container) return;

    const api = window.DailyChallenge;
    if (!api || typeof api.getPreviewState !== 'function') {
      container.innerHTML = '<div class="daily-preview-card daily-preview-empty">Tagesaufgaben werden geladen…</div>';
      return;
    }

    let preview;
    try {
      preview = api.getPreviewState();
    } catch (_e) {
      container.innerHTML = '<div class="daily-preview-card daily-preview-empty">Tagesaufgaben konnten nicht geladen werden.</div>';
      return;
    }

    const challenges = Array.isArray(preview && preview.challenges) ? preview.challenges.slice(0, 3) : [];
    if (challenges.length !== 3) {
      container.innerHTML = '<div class="daily-preview-card daily-preview-empty">Heute sind noch keine Aufgaben verfügbar.</div>';
      return;
    }

    const completedCount = challenges.filter(challenge => challenge.completed).length;
    const resetCountdown = escapeHtml(preview.resetCountdown || '00:00');
    const rows = challenges.map(challenge => {
      const target = Math.max(1, Number(challenge.target) || 1);
      const progress = Math.max(0, Math.min(target, Number(challenge.progress) || 0));
      const progressPercent = challenge.completed ? 100 : Math.min(100, Math.round((progress / target) * 100));
      const progressLabel = challenge.completed ? 'Erledigt' : progress + ' / ' + target;
      const reward = Math.max(0, Number(challenge.xpReward) || 0);
      const description = escapeHtml(challenge.description || 'Tagesaufgabe');

      return '<div class="daily-preview-row ' + (challenge.completed ? 'is-complete' : '') + '">'
        + '<div class="daily-preview-row-head">'
        + '<div class="daily-preview-title">' + description + '</div>'
        + '<div class="daily-preview-reward">+' + reward + ' XP</div>'
        + '</div>'
        + '<div class="daily-preview-row-foot">'
        + '<div class="daily-preview-progress-track" aria-hidden="true">'
        + '<div class="daily-preview-progress-fill" style="width:' + progressPercent + '%"></div>'
        + '</div>'
        + '<div class="daily-preview-progress">' + progressLabel + '</div>'
        + '</div>'
        + '</div>';
    }).join('');

    container.innerHTML = '<button class="daily-preview-card" type="button" onclick="switchTab(\'challenges\')"'
      + ' aria-label="Tagesaufgaben öffnen. ' + completedCount + ' von 3 erledigt.">'
      + '<div class="daily-preview-summary">'
      + '<div class="cp-icon" aria-hidden="true">🎯</div>'
      + '<div class="cp-info">'
      + '<div class="cp-title">Tagesaufgaben</div>'
      + '<div class="cp-meta">' + completedCount + ' von 3 erledigt · Neu in ' + resetCountdown + ' h</div>'
      + '</div>'
      + '</div>'
      + '<div class="daily-preview-list">' + rows + '</div>'
      + '</button>';
  }

  /* ── Persönliches 24-Stunden-Ziel ── */
  function formatGoalRemaining(ms) {
    const totalMinutes = Math.max(0, Math.ceil(ms / 60000));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return hours + 'h ' + String(minutes).padStart(2, '0') + 'm';
  }

  function refreshStartGoalCard() {
    const titleEl   = document.getElementById('gcGoalTitle');
    const textEl    = document.getElementById('gcProgressText');
    const barEl     = document.getElementById('gcBarFill');
    const pctEl     = document.getElementById('gcRingPct');
    const ringFill  = document.getElementById('gcRingFill');
    const achievedEl= document.getElementById('gcAchieved');

    const goal = window.DailyGoal && window.DailyGoal.get ? window.DailyGoal.get() : null;
    if (!goal) {
      if (titleEl) titleEl.textContent = 'Neues 24h-Ziel setzen';
      if (textEl) textEl.textContent = 'Waffe, Disziplin und Ringzahl wählen';
      if (barEl) barEl.style.width = '0%';
      if (pctEl) pctEl.textContent = '0%';
      if (ringFill) ringFill.style.strokeDashoffset = 163;
      if (achievedEl) achievedEl.style.display = 'none';
      return;
    }

    const progress = window.DailyGoal.getProgress(goal, getTrainingSessions());
    const pct = Math.min(100, Math.round((progress / goal.targetRings) * 100));
    const config = window.DailyGoal.CONFIG[goal.discipline];
    const justAchieved = progress >= goal.targetRings && !goal.achieved;

    if (titleEl) titleEl.textContent = config.name + ': ' + goal.targetRings + ' Ringe';
    if (textEl) textEl.textContent = progress + ' / ' + goal.targetRings + ' · noch ' + formatGoalRemaining(goal.expiresAt - Date.now());
    if (barEl) barEl.style.width = pct + '%';
    if (pctEl) pctEl.textContent = pct + '%';
    if (ringFill) {
      const circ = 163;
      ringFill.style.strokeDashoffset = circ - (circ * pct / 100);
    }

    /* XP genau einmal pro Ziel vergeben. */
    if (justAchieved) {
      const awarded = window.DailyGoal.markAchieved(goal);
      if (awarded && typeof window.awardFlatXP === 'function') window.awardFlatXP(50);
      if (achievedEl) { achievedEl.style.display = ''; achievedEl.className = 'gc-achieved gc-achieved-new'; achievedEl.textContent = '🎯 Tagesziel erreicht! +50 XP'; }
    } else if (achievedEl) {
      if (goal.achieved && progress >= goal.targetRings) {
        achievedEl.style.display = '';
        achievedEl.className = 'gc-achieved';
        achievedEl.textContent = '🎯 Tagesziel erreicht!';
      } else {
        achievedEl.style.display = 'none';
      }
    }
  }

  function refreshStartStats() {
    const sessions = getTrainingSessions();
    const weekSessions = sessions.filter(s => {
      const d = new Date(s.date || s.timestamp || 0);
      const now = new Date();
      return (now - d) < 7 * 24 * 3600 * 1000;
    });
    const weekAverageValue = window.StatsStorage
      ? window.StatsStorage.average(weekSessions.map(s => s.avg))
      : null;
    const weekAvg = weekAverageValue == null ? '–' : weekAverageValue.toFixed(1);

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
    const sessions = getTrainingSessions();
    const container = document.getElementById('lastTrainingContainer');
    if (!container) return;

    if (sessions.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🎯</div><div>Noch kein Training erfasst</div></div>';
      return;
    }
    const s = sessions[0];
    const total = Number(s.total || 0).toFixed(1);
    const avg = Number.isFinite(s.avg) ? s.avg.toFixed(2) : '–';
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
            <div class="ltc-score-val" style="color:var(--accent)">${total}</div>
            <div class="ltc-score-lbl">Ringe</div>
          </div>
        </div>
        <div class="ltc-stats">
          <div class="ltc-stat"><div class="ltc-stat-val">${s.shots || s.count || '–'}</div><div class="ltc-stat-lbl">Schüsse</div></div>
          <div class="ltc-stat"><div class="ltc-stat-val">${avg}</div><div class="ltc-stat-lbl">Ø pro Schuss</div></div>
          <div class="ltc-stat"><div class="ltc-stat-val">${Number.isFinite(s.best) ? s.best.toFixed(1) : '–'}</div><div class="ltc-stat-lbl">Bester Treffer</div></div>
        </div>
        <div class="ltc-footer">
          <button class="ltc-link" onclick="switchTab('training')">Ergebnis ansehen <svg viewBox="0 0 24 24" style="width:14px;height:14px;stroke:currentColor;fill:none;stroke-width:2.5"><polyline points="9 18 15 12 9 6"/></svg></button>
        </div>
      </div>`;
  }

  function refreshTrainingTab() {
    const sessions = getTrainingSessions();
    const filtered = getFilteredSessions(sessions);
    refreshTrainingStats(filtered);
    refreshTrainingList(filtered);
    refreshTrainingStatistiken(filtered);
    updateFilterBadge(sessions.length, filtered.length);
  }

  function refreshTrainingStatistiken(sessions) {
    /* Konstanz: stddev of last 10 sessions */
    const last10 = sessions.slice(0, 10);
    let konstanz = '–';
    if (last10.length >= 3) {
      const avgs = last10.map(s => s.avg || 0);
      const mean = avgs.reduce((a,b)=>a+b,0) / avgs.length;
      const variance = avgs.reduce((a,b)=>a+(b-mean)*(b-mean),0) / avgs.length;
      const stddev = Math.sqrt(variance);
      const consistency = Math.max(0, 100 - stddev * 10);
      konstanz = Math.round(consistency) + '%';
    }
    const setEl = (id, v) => { const e=document.getElementById(id); if(e) e.textContent = v; };
    setEl('sKonstanz', konstanz);

    /* Avg duration */
    const durations = sessions.filter(s => s.duration).map(s => s.duration);
    const avgDur = durations.length > 0
      ? Math.round(durations.reduce((a,b)=>a+b,0) / durations.length / 60) + 'm'
      : '–';
    setEl('sAvgDuration', avgDur);

    /* Top shot */
    const knownBestShots = sessions.map(s => s.best).filter(Number.isFinite);
    const best = knownBestShots.length ? Math.max(...knownBestShots) : null;
    setEl('sTopShot', best == null ? '–' : best.toFixed(1));

    /* Discipline breakdown */
    const lg = sessions.filter(s => /luftgewehr|lg/i.test(s.discipline || s.weapon || ''));
    const kk = sessions.filter(s => /kleinkaliber|kk/i.test(s.discipline || s.weapon || ''));
    const lgAvg = lg.length > 0 ? (lg.reduce((a,s)=>a+(s.avg||0),0)/lg.length).toFixed(1) : '–';
    const kkAvg = kk.length > 0 ? (kk.reduce((a,s)=>a+(s.avg||0),0)/kk.length).toFixed(1) : '–';
    setEl('dLGAvg', lgAvg);
    setEl('dKKAvg', kkAvg);
    setEl('dLGMeta', lg.length + ' Trainings' + (lgAvg !== '–' ? ' · Ø ' + lgAvg : ''));
    setEl('dKKMeta', kk.length + ' Trainings' + (kkAvg !== '–' ? ' · Ø ' + kkAvg : ''));

    /* Hide chart empty if data exists */
    const emptyEl = document.getElementById('perfChart2Empty');
    if (emptyEl) emptyEl.style.display = sessions.length > 0 ? 'none' : 'flex';
  }

  function refreshTrainingStats(sessions) {
    const all = sessions;
    const week = all.filter(s => (Date.now() - new Date(s.date || s.timestamp || 0)) < 7*24*3600*1000);
    const avgValue = window.StatsStorage ? window.StatsStorage.average(all.map(s => s.avg)) : null;
    const validAverages = all.filter(s => Number.isFinite(s.avg));
    const avg = avgValue == null ? '–' : avgValue.toFixed(2);
    const bestSession = validAverages.length > 0 ? validAverages.reduce((a,s) => s.avg > a.avg ? s : a, validAverages[0]) : null;
    const best = bestSession ? bestSession.avg.toFixed(2) : '–';

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
      const avg = Number.isFinite(s.avg) ? s.avg.toFixed(2) : '–';
      const total = Number(s.total || 0).toFixed(1);
      const dateStr = formatDate(s.date || s.timestamp);
      return `<div class="ts-card">
        <div class="ts-target">🎯</div>
        <div class="ts-info">
          <div class="ts-header">
            <span class="ts-discipline">${escapeHtml(s.discipline || 'Luftgewehr – 10m')}</span>
            <span class="ts-score">${total}</span>
          </div>
          <div class="ts-date">${dateStr}</div>
          <div class="ts-stats">Schüsse: ${s.shots||s.count||'–'} | Ø pro Schuss: ${avg} | Bester Treffer: ${Number.isFinite(s.best) ? s.best.toFixed(1) : '–'}</div>
        </div>
        <svg class="ts-chevron" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
      </div>`;
    }).join('');
  }

  function refreshChallengesTab() {
    /* Daily challenge UI is already mounted in #dailyChallengeUI — trigger re-render */
    if (window.DailyChallenge && typeof window.DailyChallenge.init === 'function') {
      try { window.DailyChallenge.init(); } catch(_e) {}
    }
    refreshChallengesStats();
    refreshInvitationCounts();
    refreshInvitationLists();
    refreshCompletedChallenges();
  }

  function refreshChallengesStats() {
    const state = (typeof StorageManager !== 'undefined') ? JSON.parse(StorageManager.getRaw('gameState') || 'null') : null;
    const stats = (state && state.stats) || {};
    const wins = stats.wins || 0;
    const losses = stats.losses || 0;
    const games = stats.games || (wins + losses);
    const winRate = games > 0 ? Math.round((wins / games) * 100) + '%' : '–';
    const setEl = (id, v) => { const e=document.getElementById(id); if(e) e.textContent = v; };
    setEl('chWins', wins);
    setEl('chLosses', losses);
    setEl('chWinRate', winRate);
  }

  function refreshInvitationCounts() {
    const incoming = (window.FriendsSystem && window.FriendsSystem.getIncomingRequests)
      ? (window.FriendsSystem.getIncomingRequests() || []).length : 0;
    const outgoing = (window.FriendsSystem && window.FriendsSystem.getOutgoingRequests)
      ? (window.FriendsSystem.getOutgoingRequests() || []).length : 0;
    const pending = (window.AsyncChallenge && window.AsyncChallenge.getPending)
      ? (window.AsyncChallenge.getPending() || []).length : 0;
    const setEl = (id, v) => { const e=document.getElementById(id); if(e) e.textContent = v; };
    setEl('invIncomingCount', incoming);
    setEl('invOutgoingCount', outgoing);
    setEl('invPendingCount', pending);
  }

  function refreshInvitationLists() {
    const acState = (window.AsyncChallenge && typeof window.AsyncChallenge.getState === 'function')
      ? window.AsyncChallenge.getState() : null;
    const incoming = acState ? (acState.availableChallenges || []) : [];
    const outgoing = acState ? (acState.myChallenges || []) : [];

    const inEl = document.getElementById('incomingInvitations');
    if (inEl) {
      if (!inEl.dataset.acceptBound) {
        inEl.dataset.acceptBound = '1';
        inEl.addEventListener('click', (ev) => {
          const btn = ev.target.closest('.rr-btn.accept[data-challenge-id]');
          if (!btn) return;
          if (window.AsyncChallenge && typeof window.AsyncChallenge.acceptChallenge === 'function') {
            window.AsyncChallenge.acceptChallenge(btn.dataset.challengeId);
          }
        });
      }
      if (incoming.length === 0) {
        inEl.innerHTML = '<div class="empty-state" style="padding:24px 16px;"><div class="empty-state-icon">📥</div><div>Keine eingehenden Einladungen</div><div style="font-size:0.7rem;color:rgba(255,255,255,0.25);margin-top:4px;">Wenn Freunde dich herausfordern, erscheint es hier</div></div>';
      } else {
        inEl.innerHTML = incoming.map(c => buildChallengeInviteRow(c, 'incoming')).join('');
      }
    }
    const outEl = document.getElementById('outgoingInvitations');
    if (outEl) {
      if (outgoing.length === 0) {
        outEl.innerHTML = '<div class="empty-state" style="padding:24px 16px;"><div class="empty-state-icon">📤</div><div>Du hast keine offenen Einladungen gesendet</div></div>';
      } else {
        outEl.innerHTML = outgoing.map(c => buildChallengeInviteRow(c, 'outgoing')).join('');
      }
    }

    /* Update counts */
    const setEl = (id, v) => { const e=document.getElementById(id); if(e) e.textContent=v; };
    setEl('invIncomingCount', incoming.length);
    setEl('invOutgoingCount', outgoing.length);
    setEl('invPendingCount', incoming.length + outgoing.length);
  }

  function buildChallengeInviteRow(c, type) {
    const name = escapeHtml(c.opponentName || c.creatorName || c.username || 'Unbekannt');
    const disc = escapeHtml(c.disciplineName || c.discipline || 'Duell');
    const date = formatDate(c.createdAt || c.timestamp);
    const id = escapeHtml(String(c.id || c.challengeId || ''));
    const action = type === 'incoming'
      ? `<button class="rr-btn accept" data-challenge-id="${id}">Annehmen</button>`
      : `<span style="font-size:0.7rem;color:rgba(255,255,255,0.3);">Wartet auf Antwort</span>`;
    return `<div class="request-row">
      <div class="rr-avatar">⚔️</div>
      <div class="rr-info">
        <div class="rr-name">${name}</div>
        <div class="rr-meta">${disc} · ${date}</div>
      </div>
      <div class="rr-actions">${action}</div>
    </div>`;
  }

  function refreshCompletedChallenges() {
    const container = document.getElementById('completedChallenges');
    if (!container) return;
    let history = [];
    try {
      const raw = localStorage.getItem('sd_history') || '[]';
      history = JSON.parse(raw);
      if (!Array.isArray(history)) history = [];
    } catch(_e) { history = []; }

    if (history.length === 0) {
      container.innerHTML = '<div class="empty-state" style="padding:32px 16px;"><div class="empty-state-icon">🏆</div><div>Noch keine abgeschlossenen Challenges</div><div style="font-size:0.7rem;color:rgba(255,255,255,0.25);margin-top:4px;">Deine Erfolge erscheinen hier</div></div>';
      return;
    }
    container.innerHTML = history.slice(0, 20).map(entry => {
      const isWin = entry.result === 'win';
      const isLoss = entry.result === 'lose' || entry.result === 'loss';
      const resultIcon = isWin ? '🏆' : isLoss ? '💔' : '🤝';
      const resultClass = isWin ? 'accent' : isLoss ? '' : '';
      const discName = escapeHtml(entry.disciplineName || entry.discipline || 'Duell');
      const playerPts = parseFloat(entry.playerPts || 0).toFixed(0);
      const botPts = parseFloat(entry.botPts || 0).toFixed(0);
      const dateStr = formatDate(entry.timestamp || entry.date);
      const diffName = escapeHtml(entry.diffName || entry.diff || '');
      return `<div class="request-row" style="gap:12px;">
        <div class="rr-avatar" style="font-size:1.3rem;">${resultIcon}</div>
        <div class="rr-info" style="flex:1;">
          <div class="rr-name">${discName}${diffName ? ' · ' + diffName : ''}</div>
          <div class="rr-meta">${dateStr}</div>
        </div>
        <div style="text-align:right;flex-shrink:0;">
          <div style="font-size:1rem;font-weight:700;color:${isWin?'var(--accent)':isLoss?'#ff4a4a':'rgba(255,255,255,0.5)'};">${playerPts} – ${botPts}</div>
          <div style="font-size:0.65rem;color:rgba(255,255,255,0.3);">Ringe</div>
        </div>
      </div>`;
    }).join('');
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
        container.innerHTML = getFriendsForDisplay(friends).map(f => buildFriendRow(f)).join('');
      }
    }
    const sortButton = document.getElementById('friendsSortBtn');
    if (sortButton) sortButton.textContent = friendSortMode === 'online' ? 'Online zuerst' : 'Offline zuerst';
    refreshFreundeStats();
  }

  // Für andere Module (z.B. friend-profile-view.js nach removeFriend) verfügbar machen.
  window.refreshFreundeTab = refreshFreundeTab;

  function isFriendOnline(friend) {
    const socialState = window.FriendsSystem && window.FriendsSystem.getState
      ? window.FriendsSystem.getState()
      : {};
    const presence = socialState.onlineStatusByUserId && socialState.onlineStatusByUserId[friend.userId];
    const lastSeen = Number(presence && presence.lastSeen) || 0;
    return !!(presence && presence.online && lastSeen > 0 && Date.now() - lastSeen < 120000);
  }

  function getFriendsForDisplay(friends) {
    const direction = friendSortMode === 'online' ? -1 : 1;
    return (friends || []).map(friend => ({ ...friend, isOnline: isFriendOnline(friend) }))
      .sort((a, b) => {
        if (a.isOnline !== b.isOnline) return a.isOnline ? direction : -direction;
        return String(a.username || '').localeCompare(String(b.username || ''), 'de');
      });
  }

  window.toggleFriendSort = function () {
    friendSortMode = friendSortMode === 'online' ? 'offline' : 'online';
    try { localStorage.setItem('sd_friend_sort', friendSortMode); } catch (_e) {}
    refreshFreundeTab();
  };

  function buildFriendRow(f) {
    const statusClass = f.isOnline ? 'online' : f.status === 'away' ? 'away' : 'offline';
    const statusText = f.isOnline ? 'Online' : f.status === 'away' ? 'Abwesend' : 'Offline';
    const name = escapeHtml(f.username || f.name || 'Unbekannt');
    const best = f.bestScore || f.score || '–';
    const avg = f.avgScore || f.avgRinge || '–';
    const fid = f.userId ? ` data-friend-id="${escapeHtml(f.userId)}" role="button" tabindex="0"` : '';
    return `<div class="friend-row"${fid}>
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
      <button class="fr-chat-btn" data-chat-btn="1" aria-label="Nachricht"><svg viewBox="0 0 24 24" style="width:22px;height:22px;stroke:rgba(255,255,255,0.72);fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></button>
      <svg class="fr-chevron" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
    </div>`;
  }

  function refreshFreundeStats() {
    const friends = window.FriendsSystem && window.FriendsSystem.getFriends ? window.FriendsSystem.getFriends() : [];
    const el = document.getElementById('friendsCount');
    if (el) el.textContent = friends.length;
    const badge = document.getElementById('fhcCountBadge');
    if (badge) badge.textContent = friends.length;

    /* Friend code */
    const codeEl = document.getElementById('myFriendCode');
    if (codeEl) {
      let code = '';
      if (window.FriendsSystem && typeof window.FriendsSystem.getFriendCode === 'function') {
        try { code = window.FriendsSystem.getFriendCode() || ''; } catch(e) {}
      }
      if (!code && typeof StorageManager !== 'undefined') {
        code = StorageManager.getRaw('friendCode') || '';
      }
      if (!/^[A-Z2-9]{6}$/.test(String(code).toUpperCase())) code = '';
      codeEl.textContent = code || 'Nur mit Anmeldung';
    }

    /* Pending requests */
    refreshFriendRequests();
    refreshBlockedUsers();

    /* Friend stats aggregation */
    const friendAverages = friends.map(f => Number(f.avgScore ?? f.avgRinge)).filter(Number.isFinite);
    const fStatAvg = document.getElementById('fStatAvg');
    if (fStatAvg) {
      fStatAvg.textContent = friendAverages.length > 0
        ? (friendAverages.reduce((sum, value) => sum + value, 0) / friendAverages.length).toFixed(1).replace('.', ',')
        : '–';
    }

    /* Own stats for the 3 remaining tiles */
    const ownSessions = getTrainingSessions();
    const ownWeek = ownSessions.filter(s => (Date.now() - new Date(s.date || s.timestamp || 0)) < 7*24*3600*1000);
    const statEl = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
    statEl('fStatTrainings', ownWeek.length);

    statEl('fStatDuels', ownSessions.length);

    const gsRaw2 = (typeof StorageManager !== 'undefined') ? StorageManager.getRaw('gameState') : null;
    const gs2 = gsRaw2 ? JSON.parse(gsRaw2) : null;
    statEl('fStatStreak', gs2 ? (gs2.streak || gs2.currentStreak || 0) : 0);
  }

  function refreshFriendRequests() {
    const incoming = (window.FriendsSystem && window.FriendsSystem.getIncomingRequests)
      ? (window.FriendsSystem.getIncomingRequests() || []) : [];
    const outgoing = (window.FriendsSystem && window.FriendsSystem.getOutgoingRequests)
      ? (window.FriendsSystem.getOutgoingRequests() || []) : [];

    const inBadge = document.getElementById('incomingRequestsBadge');
    const outBadge = document.getElementById('outgoingRequestsBadge');
    if (inBadge) inBadge.textContent = incoming.length;
    if (outBadge) outBadge.textContent = outgoing.length;

    const inContainer = document.getElementById('incomingFriendRequests');
    if (inContainer) {
      if (incoming.length === 0) {
        inContainer.innerHTML = '<div class="empty-state" style="padding:24px 16px;"><div class="empty-state-icon">📥</div><div>Keine eingehenden Anfragen</div></div>';
      } else {
        inContainer.innerHTML = incoming.map(r => buildRequestRow(r, 'incoming')).join('');
      }
    }
    const outContainer = document.getElementById('outgoingFriendRequests');
    if (outContainer) {
      if (outgoing.length === 0) {
        outContainer.innerHTML = '<div class="empty-state" style="padding:24px 16px;"><div class="empty-state-icon">📤</div><div>Keine gesendeten Anfragen</div></div>';
      } else {
        outContainer.innerHTML = outgoing.map(r => buildRequestRow(r, 'outgoing')).join('');
      }
    }
  }

  function buildRequestRow(r, type) {
    const name = escapeHtml(r.username || r.name || 'Unbekannt');
    const avatar = (r.avatar || name.charAt(0)).replace(/[<>&"]/g, '');
    const meta = r.sentAt ? formatDate(r.sentAt) : (r.code ? 'Code: ' + escapeHtml(r.code) : 'Schütze');
    const actions = type === 'incoming'
      ? `<button class="rr-btn accept" onclick="acceptFriendRequest('${escapeHtml(r.id||r.userId||'')}')">Annehmen</button>
         <button class="rr-btn decline" onclick="declineFriendRequest('${escapeHtml(r.id||r.userId||'')}')">Ablehnen</button>`
      : `<button class="rr-btn cancel" onclick="cancelFriendRequest('${escapeHtml(r.id||r.userId||'')}')">Abbrechen</button>`;
    return `<div class="request-row">
      <div class="rr-avatar">${avatar}</div>
      <div class="rr-info">
        <div class="rr-name">${name}</div>
        <div class="rr-meta">${meta}</div>
      </div>
      <div class="rr-actions">${actions}</div>
    </div>`;
  }

  function refreshBlockedUsers() {
    const blocked = (window.FriendsSystem && window.FriendsSystem.getBlockedUsers)
      ? (window.FriendsSystem.getBlockedUsers() || []) : [];
    const container = document.getElementById('blockedUsersList');
    if (!container) return;
    if (blocked.length === 0) {
      container.innerHTML = '<div class="empty-state" style="padding:32px 16px;"><div class="empty-state-icon">🚫</div><div>Keine blockierten Nutzer</div><div style="font-size:0.7rem;color:rgba(255,255,255,0.25);margin-top:4px;">Alles in Ordnung – du hast niemanden blockiert</div></div>';
    } else {
      container.innerHTML = blocked.map(u => {
        const name = escapeHtml(u.username || u.name || 'Unbekannt');
        return `<div class="request-row">
          <div class="rr-avatar">${(u.avatar || name.charAt(0)).replace(/[<>&"]/g,'')}</div>
          <div class="rr-info">
            <div class="rr-name">${name}</div>
            <div class="rr-meta">Blockiert</div>
          </div>
          <div class="rr-actions"><button class="rr-btn cancel" onclick="unblockUser('${escapeHtml(u.id||u.userId||'')}')">Entsperren</button></div>
        </div>`;
      }).join('');
    }
  }

  /* Public helpers for request actions */
  window.acceptFriendRequest = function(id) {
    if (window.FriendsSystem && window.FriendsSystem.acceptRequest) {
      window.FriendsSystem.acceptRequest(id);
      setTimeout(refreshFriendRequests, 200);
    }
  };
  window.declineFriendRequest = function(id) {
    if (window.FriendsSystem && window.FriendsSystem.declineRequest) {
      window.FriendsSystem.declineRequest(id);
      setTimeout(refreshFriendRequests, 200);
    }
  };
  window.cancelFriendRequest = function(id) {
    if (window.FriendsSystem && window.FriendsSystem.cancelRequest) {
      window.FriendsSystem.cancelRequest(id);
      setTimeout(refreshFriendRequests, 200);
    }
  };
  window.unblockUser = function(id) {
    if (window.FriendsSystem && window.FriendsSystem.unblock) {
      window.FriendsSystem.unblock(id);
      setTimeout(refreshBlockedUsers, 200);
    }
  };

  function refreshProfilTab() {
    if (window.ProfileClub && typeof window.ProfileClub.render === 'function') {
      try { window.ProfileClub.render(); } catch (_e) { /* non-blocking */ }
    }
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
      setEl('ptStatGames', stats.games || ((stats.wins || 0) + (stats.losses || 0) + (stats.draws || 0)));
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
    const sessions = getTrainingSessions();
    const avgValue = window.StatsStorage ? window.StatsStorage.average(sessions.map(s => s.avg)) : null;
    const avg = avgValue == null ? '–' : avgValue.toFixed(2);
    const setEl = (id,v) => { const e=document.getElementById(id); if(e) e.textContent=v; };
    setEl('ptStatTrainings', sessions.length);
    setEl('ptAvgRinge', avg);

    /* Personal bests */
    const knownShots = sessions.map(s => s.best).filter(Number.isFinite);
    const knownAverages = sessions.map(s => s.avg).filter(Number.isFinite);
    const bestShot = knownShots.length ? Math.max(...knownShots) : null;
    const bestAvg = knownAverages.length ? Math.max(...knownAverages) : null;
    setEl('ptBestSerie', bestShot == null ? '–' : bestShot.toFixed(1));
    setEl('ptBestAvg', bestAvg == null ? '–' : bestAvg.toFixed(2));

    let bestGame = 0;
    try {
      const hist = JSON.parse(localStorage.getItem('sd_history') || '[]');
      if (Array.isArray(hist) && hist.length > 0) {
        bestGame = Math.max(...hist.map(e => parseFloat(e.playerPts || 0)));
      }
    } catch(_e) {}
    setEl('ptMostRinge', bestGame > 0 ? Math.round(bestGame).toString() : '–');

    /* Auszeichnungen (müssen verdient werden) */
    renderProfileAchievements();

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

  /* Rendert die verdienten Auszeichnungen ins Profil. Gesperrte erscheinen
     ausgegraut mit Schloss; verdiente farbig. Quelle: window.getProfileAchievements
     (echtes, im Spielverlauf freigeschaltetes SUN-Achievement-System). */
  function renderProfileAchievements() {
    const host = document.getElementById('ptAchievements');
    if (!host) return;

    let list = [];
    try {
      if (typeof window.getProfileAchievements === 'function') {
        list = window.getProfileAchievements() || [];
      }
    } catch (_e) { list = []; }

    if (!Array.isArray(list) || list.length === 0) {
      host.innerHTML = '<div style="color:rgba(255,255,255,0.4);font-size:0.8rem;padding:8px 2px;">'
        + 'Noch keine Auszeichnungen – spiele Duelle und reiche Scheibenfotos ein, um sie zu verdienen.</div>';
      return;
    }

    const earned = list.filter(a => a.earned);
    const locked = list.filter(a => !a.earned);
    const ordered = earned.concat(locked);
    const tones = ['unlocked', 'blue', 'purple', 'gold'];

    host.innerHTML = ordered.map((a, i) => {
      const name = escapeHtml(a.name || '');
      const icon = a.icon || '🏅';
      if (a.earned) {
        const tone = tones[i % tones.length];
        return '<div class="achievement-badge">'
          + '<div class="ab-hex ' + tone + '">' + icon + '</div>'
          + '<div class="ab-name">' + name + '</div>'
          + '</div>';
      }
      return '<div class="achievement-badge">'
        + '<div class="ab-hex" style="filter:grayscale(1);opacity:0.4;">🔒</div>'
        + '<div class="ab-name" style="opacity:0.55;">' + name + '</div>'
        + '</div>';
    }).join('');
  }

  /* ── Helpers ── */
  function getTrainingSessions() {
    if (window.StatsStorage && typeof window.StatsStorage.readHistory === 'function') {
      return window.StatsStorage.readHistory().map(normalizeHistoryTraining).filter(Boolean);
    }
    try {
      const raw = localStorage.getItem('sd_history') || '[]';
      const history = JSON.parse(raw);
      if (!Array.isArray(history)) return [];
      return history
        .map(normalizeHistoryTraining)
        .filter(Boolean)
        .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    } catch(e) { return []; }
  }

  function normalizeHistoryTraining(entry) {
    const normalized = entry && Object.prototype.hasOwnProperty.call(entry, 'totalScore')
      ? entry
      : (window.StatsStorage && window.StatsStorage.normalizeHistoryEntry
        ? window.StatsStorage.normalizeHistoryEntry(entry)
        : null);
    if (!normalized) return null;
    return {
      id: normalized.id,
      timestamp: normalized.timestamp,
      date: normalized.date,
      discipline: normalized.disciplineName,
      disciplineId: normalized.discipline,
      weapon: normalized.weapon,
      total: normalized.totalScore,
      avg: normalized.averagePerShot,
      best: normalized.bestShot,
      max: normalized.bestShot,
      count: normalized.shots,
      shots: normalized.shots,
      duration: normalized.duration,
      result: normalized.result,
      source: 'duel_history',
    };
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

  /* ── Goal editor ── */
  window.openGoalEditor = function() {
    const panel = document.getElementById('goalEditorPanel');
    if (!panel || !window.DailyGoal) return;
    const goal = window.DailyGoal.get();
    const weaponSelect = document.getElementById('goalWeaponSelect');
    if (weaponSelect) weaponSelect.value = goal ? goal.weapon : 'lg';
    window.updateGoalDisciplines(goal && goal.discipline);
    const input = document.getElementById('goalCustomInput');
    if (input) input.value = goal ? goal.targetRings : '';
    panel.classList.add('tff-open');
  };

  window.closeGoalEditor = function() {
    const panel = document.getElementById('goalEditorPanel');
    if (panel) panel.classList.remove('tff-open');
  };

  window.updateGoalDisciplines = function(selectedId) {
    if (!window.DailyGoal) return;
    const weapon = document.getElementById('goalWeaponSelect');
    const discipline = document.getElementById('goalDisciplineSelect');
    if (!weapon || !discipline) return;
    const options = window.DailyGoal.disciplinesFor(weapon.value);
    discipline.innerHTML = options.map(item => '<option value="' + item.id + '">' + escapeHtml(item.name) + '</option>').join('');
    if (selectedId && options.some(item => item.id === selectedId)) discipline.value = selectedId;
    window.updateGoalTargetLimit();
  };

  window.updateGoalTargetLimit = function() {
    const discipline = document.getElementById('goalDisciplineSelect');
    const input = document.getElementById('goalCustomInput');
    const hint = document.getElementById('goalTargetHint');
    const config = discipline && window.DailyGoal && window.DailyGoal.CONFIG[discipline.value];
    if (!config) return;
    if (input) input.max = String(config.max);
    if (hint) hint.textContent = config.shots + ' Schuss · maximal ' + config.max + ' Ringe';
  };

  window.saveDailyGoalFromEditor = function() {
    const weapon = document.getElementById('goalWeaponSelect');
    const discipline = document.getElementById('goalDisciplineSelect');
    const input = document.getElementById('goalCustomInput');
    if (!weapon || !discipline || !input || !window.DailyGoal) return;
    try {
      window.DailyGoal.create({
        weapon: weapon.value,
        discipline: discipline.value,
        targetRings: input.value,
      });
      refreshStartGoalCard();
      window.closeGoalEditor();
    } catch (_e) {
      input.focus();
      input.setCustomValidity('Bitte eine ganze Ringzahl im gültigen Bereich eingeben.');
      input.reportValidity();
      input.addEventListener('input', function clearGoalValidity() { input.setCustomValidity(''); }, { once: true });
    }
  };

  /* ── FriendsSystem shims ── */
  function patchFriendsSystem() {
    const FS = window.FriendsSystem;
    if (!FS || typeof FS.getState !== 'function') return;

    if (!FS.getFriends) FS.getFriends = function() {
      try { return FS.getState().friends || []; } catch(_e) { return []; }
    };
    if (!FS.getIncomingRequests) FS.getIncomingRequests = function() {
      try { return FS.getState().pendingRequests || []; } catch(_e) { return []; }
    };
    if (!FS.getOutgoingRequests) FS.getOutgoingRequests = function() {
      try { return FS.getState().sentRequests || []; } catch(_e) { return []; }
    };
    if (!FS.getFriendCode) FS.getFriendCode = function() {
      try { return FS.getState().userCode || ''; } catch(_e) { return ''; }
    };
    if (!FS.getBlockedUsers) FS.getBlockedUsers = function() { return []; };
    if (!FS.cancelRequest) FS.cancelRequest = function() {};
    if (!FS.unblock) FS.unblock = function() {};
    if (!FS.renderInline) FS.renderInline = function(container) {
      if (!container) return;
      const friends = getFriendsForDisplay(FS.getFriends());
      if (friends.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">👥</div><div>Noch keine Freunde hinzugefügt</div></div>';
      } else {
        container.innerHTML = friends.map(f => buildFriendRow(f)).join('');
      }
    };
  }

  /* ── Training filter ── */
  window.filterTraining = function() {
    const panel = document.getElementById('trainingFilterPanel');
    if (!panel) return;
    const isOpen = panel.classList.contains('tff-open');
    if (isOpen) {
      panel.classList.remove('tff-open');
    } else {
      /* Sync button states before opening */
      panel.querySelectorAll('.tf-btn[data-type="discipline"]').forEach(b => {
        b.classList.toggle('active', b.dataset.value === filterDiscipline);
      });
      panel.querySelectorAll('.tf-btn[data-type="period"]').forEach(b => {
        b.classList.toggle('active', b.dataset.value === filterPeriod);
      });
      panel.classList.add('tff-open');
    }
  };

  window.closeTrainingFilter = function() {
    const panel = document.getElementById('trainingFilterPanel');
    if (panel) panel.classList.remove('tff-open');
  };

  window.setTrainingFilter = function(type, value) {
    if (type === 'discipline') filterDiscipline = value;
    if (type === 'period') filterPeriod = value;
    const panel = document.getElementById('trainingFilterPanel');
    if (panel) {
      panel.querySelectorAll('.tf-btn[data-type="discipline"]').forEach(b => {
        b.classList.toggle('active', b.dataset.value === filterDiscipline);
      });
      panel.querySelectorAll('.tf-btn[data-type="period"]').forEach(b => {
        b.classList.toggle('active', b.dataset.value === filterPeriod);
      });
    }
    refreshTrainingTab();
    window.closeTrainingFilter();
  };

  window.resetTrainingFilter = function() {
    filterDiscipline = 'alle';
    filterPeriod = 'gesamt';
    window.setTrainingFilter('discipline', 'alle');
  };

  function getFilteredSessions(sessions) {
    return sessions.filter(s => {
      if (filterDiscipline !== 'alle') {
        const d = (s.discipline || s.weapon || '').toLowerCase();
        if (filterDiscipline === 'lg' && !/luftgewehr|lg|air/.test(d)) return false;
        if (filterDiscipline === 'kk' && !/kleinkaliber|kk/.test(d)) return false;
      }
      if (filterPeriod !== 'gesamt') {
        const ts = new Date(s.date || s.timestamp || 0);
        const now = new Date();
        if (filterPeriod === 'heute') {
          if (ts.toDateString() !== now.toDateString()) return false;
        } else if (filterPeriod === 'woche') {
          if ((now - ts) > 7 * 24 * 3600 * 1000) return false;
        } else if (filterPeriod === 'monat') {
          if ((now - ts) > 30 * 24 * 3600 * 1000) return false;
        }
      }
      return true;
    });
  }

  function updateFilterBadge(total, filtered) {
    const badge = document.getElementById('trainingFilterBadge');
    if (!badge) return;
    const hasFilter = filterDiscipline !== 'alle' || filterPeriod !== 'gesamt';
    badge.style.display = hasFilter ? '' : 'none';
    badge.textContent = filtered + '/' + total;
  }

  window.addEventListener('dailyChallengesUpdated', () => {
    try { refreshStartChallenges(); } catch (_e) {}
  });

  /* ── Init ── */
  function init() {
    if (initialized) return;
    initialized = true;
    renderHeader('start');
    updateFABVisibility('start');
    document.body.classList.add('tab-start');

    try { patchFriendsSystem(); } catch(e) {}

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
  /* Re-init after all deferred scripts load; patch FriendsSystem once available */
  window.addEventListener('load', () => {
    try { refreshStartTab(); } catch(e) {}
    try { patchFriendsSystem(); } catch(e) {}
  });

})();
