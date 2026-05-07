/* ─── PROFILE UI ────────────────────────────
 *
 * Profil-Overlay, Avatar-Picker, Tab-Navigation und Schützenpass-Header.
 * Abhängigkeiten: xp-system.js, stats-storage.js, effects.js,
 * auth-ui.js, StorageManager, G, DOM, RANKS (alle call-time).
 */

function getHeaderStreakValue() {
  const lgStreak = Number(localStorage.getItem('sd_lg_streak') || 0) || 0;
  const kkStreak = Number(localStorage.getItem('sd_kk_streak') || 0) || 0;
  const legacyStreak = Number(localStorage.getItem('sd_win_streak') || 0) || 0;
  return Math.max(lgStreak, kkStreak, legacyStreak);
}

function updateSchuetzenpass() {
  const { rank, idx } = getRank(G.xp);
  const nextRank = RANKS[idx + 1] || null;
  const xpInRank = G.xp - rank.min;
  const xpNeeded = nextRank ? (nextRank.min - rank.min) : 1;
  const pct = nextRank ? Math.min(100, (xpInRank / xpNeeded) * 100) : 100;

  DOM.spRankName.textContent = rank.icon + ' ' + rank.name;
  DOM.spRankCur.textContent = rank.name;
  DOM.spRankNext.textContent = nextRank ? '→ ' + nextRank.name : '✦ MAX';
  DOM.spFillBar.style.width = pct + '%';
  DOM.spXpCur.textContent = G.xp - rank.min;
  DOM.spXpNext.textContent = nextRank ? (nextRank.min - rank.min) : '∞';

  // Update profile button, menu & XP corner
  updateProfileMenu();
  updateXPCorner();
}

/* ─── PROFILE OVERLAY ────────────────────── */
function toggleProfileMenu() {
  const ov = DOM.profileOverlay || document.getElementById('profileOverlay');
  const icon = DOM.profileIcon || document.getElementById('profileIcon');
  if (!ov) return;

  // Premium Blur Elements
  const dash = document.getElementById('premiumDashboard');
  const hdrLogo = document.querySelector('.hdr-top .logo');
  const startBtn = document.getElementById('btnOpenDuelSetup');
  const transition = 'filter 0.3s ease, opacity 0.3s ease';

  const isActive = ov.classList.contains('active');
  if (isActive) {
    ov.classList.remove('active');
    if (icon) icon.classList.remove('active');
    document.body.style.overflow = '';
    if (window.innerWidth <= 768 && document.body.style.position === 'fixed') {
      const scrollY = Math.abs(parseInt(document.body.style.top, 10) || 0);
      document.body.style.position = '';
      document.body.style.top = '';
      // BUGFIX: Beim Öffnen wird body.style.width = '100%' gesetzt
      // (siehe unten), aber beim Schließen wurde es nie zurückgesetzt.
      // Das ließ den Body-Layout-Shift (insb. wenn vorher auto/0 war)
      // permanent stehen — sichtbar als horizontales Scroll-Glitch.
      document.body.style.width = '';
      requestAnimationFrame(() => { window.scrollTo(0, scrollY); });
    }

    // Un-blur
    if (dash) { dash.style.filter = ''; }
    if (hdrLogo) { hdrLogo.style.filter = ''; }
    if (startBtn) { startBtn.style.opacity = '1'; }
  } else {
    refreshDebugToolsVisibility();
    refreshProfileSheet();
    ov.classList.add('active');
    if (icon) icon.classList.add('active');

    document.body.style.overflow = 'hidden';
    if (window.innerWidth <= 768) {
      const scrollY = window.scrollY || window.pageYOffset;
      document.body.style.top = `-${scrollY}px`;
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
    }

    // Blur
    if (dash) { dash.style.transition = transition; dash.style.filter = 'blur(10px) brightness(0.6)'; }
    if (hdrLogo) { hdrLogo.style.transition = transition; hdrLogo.style.filter = 'blur(10px) brightness(0.6)'; }
    if (startBtn) { startBtn.style.transition = transition; startBtn.style.opacity = '0'; }

    // Chart + Sound-Button erst nach Paint initialisieren
    requestAnimationFrame(() => requestAnimationFrame(() => {
      renderPerformanceChart();
      initSoundToggleBtn();
    }));
  }
}

function handleOverlayClick(e) {
  const sheet = DOM.profileSheet || document.getElementById('profileSheet');
  if (sheet && !sheet.contains(e.target)) {
    toggleProfileMenu();
  }
}

function switchProfileTab(tab) {
  document.querySelectorAll('.ps-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  const panels = document.querySelectorAll('.ps-panel');
  panels.forEach(p => p.classList.toggle('active', p.id === 'psPanel-' + tab));

  if (tab === 'sun') renderSunGrid();
  if (tab === 'history') renderHistory();
  if (tab === 'debug') refreshDebugPanel();
  if (tab === 'settings') refreshSettingsPanelUI();
  if (tab === 'stats') {
    requestAnimationFrame(() => renderPerformanceChart());
    if (typeof EnhancedAnalytics !== 'undefined') EnhancedAnalytics.renderUI();
  }
}

function refreshSettingsPanelUI() {
  if (window.ProfileSettings && typeof window.ProfileSettings.refresh === 'function') {
    window.ProfileSettings.refresh();
  }
  initSoundToggleBtn();
  updateAuthUI(getSupabaseUserSafe());
  updateAccountSyncStatus();
}

function refreshProfileSheet() {
  const { rank, idx } = getRank(G.xp);
  const nextRank = RANKS[idx + 1] || null;
  const xpInRank = G.xp - rank.min;
  const xpNeeded = nextRank ? (nextRank.min - rank.min) : 1;
  const pct = nextRank ? Math.min(100, (xpInRank / xpNeeded) * 100) : 100;

  // Gespeicherten Avatar laden
  const savedAvatar = StorageManager.getRaw('profileAvatar') || '🎯';

  // Hero
  const el = id => (SC_DOM?.byId ? SC_DOM.byId(id) : document.getElementById(id));
  if (el('psAvatarIcon')) el('psAvatarIcon').textContent = savedAvatar;
  if (el('psRankIcon')) el('psRankIcon').textContent = rank.icon;
  if (el('psRankName')) el('psRankName').textContent = rank.name;
  if (el('psLevel')) el('psLevel').textContent = idx + 1;
  if (el('psTotalXP')) el('psTotalXP').textContent = G.xp;
  if (el('psUsername')) el('psUsername').textContent = G.username || 'Schütze';

  // Avatar-Picker vorausfüllen
  const nameInput = el('profileNameInput');
  if (nameInput) nameInput.value = G.username || '';
  initAvatarPicker(savedAvatar);

  // XP bar
  if (el('psXpCur')) el('psXpCur').textContent = xpInRank;
  if (el('psXpNext')) el('psXpNext').textContent = nextRank ? (nextRank.min - rank.min) : '∞';
  if (el('psXpFill')) el('psXpFill').style.width = pct + '%';

  // Legacy header button
  if (DOM.profileIcon) DOM.profileIcon.textContent = rank.icon;
  if (DOM.profileRank) DOM.profileRank.textContent = rank.name;

  // Stats
  const stats = loadGameStats();
  const wins = stats.wins || 0;
  const losses = stats.losses || 0;
  const games = wins + losses + (stats.draws || 0);
  const wr = games > 0 ? Math.round((wins / games) * 100) : null;

  const setEl = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
  setEl('psStat-wins', wins);
  setEl('psStat-losses', losses);
  setEl('psStat-games', games);
  setEl('psStat-winrate', wr !== null ? wr + '%' : '–');

  const bestLG = parseInt(localStorage.getItem('sd_lg_best') || '0') || 0;
  const bestKK = parseInt(localStorage.getItem('sd_kk_best') || '0') || 0;
  const bestAll = Math.max(bestLG, bestKK);
  setEl('psStat-streak', bestAll > 0 ? '🔥 ' + bestAll : '–');
  const curLG = Number(localStorage.getItem('sd_lg_streak') || 0) || 0;
  const curKK = Number(localStorage.getItem('sd_kk_streak') || 0) || 0;
  const curLegacy = Number(localStorage.getItem('sd_win_streak') || 0) || 0;
  const curAll = Math.max(curLG, curKK, curLegacy);
  setEl('psStat-curStreak', '🔥 ' + curAll);

  const lgStats = loadWeaponStats('lg');
  const kkStats = loadWeaponStats('kk');
  setEl('psLGDetail', `${lgStats.wins} Siege · ${lgStats.wins + lgStats.losses} Spiele`);
  setEl('psKKDetail', `${kkStats.wins} Siege · ${kkStats.wins + kkStats.losses} Spiele`);
  setEl('psLGXP', (lgStats.xp || 0) + ' ✨');
  setEl('psKKXP', (kkStats.xp || 0) + ' ✨');
  updateAccountSyncStatus();

  // Active tab refresh
  const activeTab = document.querySelector('.ps-tab.active');
  if (activeTab) {
    const t = activeTab.dataset.tab;
    if (t === 'sun') renderSunGrid();
    if (t === 'history') renderHistory();
    if (t === 'debug') renderDebugPanel();
    if (t === 'settings') refreshSettingsPanelUI();
  }

  // Update Header Streak Badge
  const streak = getHeaderStreakValue();
  const streakMount = document.getElementById('hdrStreakMount');
  if (streakMount) {
    streakMount.innerHTML = `
          <div class="hdr-streak-badge">
            <span class="fire-ico">🔥</span>
            <span>${streak}</span>
          </div>
        `;
  }
}

/* ─── PROFIL BEARBEITEN (Name + Avatar) ─────────── */
function initAvatarPicker(currentAvatar) {
  const options = document.querySelectorAll('.avatar-option');
  options.forEach(opt => {
    const isActive = opt.dataset.avatar === currentAvatar;
    opt.style.borderColor = isActive ? '#7ab030' : 'transparent';
    opt.style.background = isActive ? 'rgba(122,176,48,0.15)' : 'transparent';
    opt.style.transform = isActive ? 'scale(1.15)' : 'scale(1)';

    opt.onclick = () => {
      const newAvatar = opt.dataset.avatar;
      StorageManager.setRaw('profileAvatar', newAvatar);

      // UI aktualisieren
      const psAvatarIcon = document.getElementById('psAvatarIcon');
      if (psAvatarIcon) psAvatarIcon.textContent = newAvatar;

      // Avatar-Picker aktualisieren
      options.forEach(o => {
        o.style.borderColor = o.dataset.avatar === newAvatar ? '#7ab030' : 'transparent';
        o.style.background = o.dataset.avatar === newAvatar ? 'rgba(122,176,48,0.15)' : 'transparent';
        o.style.transform = o.dataset.avatar === newAvatar ? 'scale(1.15)' : 'scale(1)';
      });

      // Dashboard-Initial aktualisieren
      const pdProfileInitial = document.getElementById('pdProfileInitial');
      if (pdProfileInitial) pdProfileInitial.textContent = newAvatar;

      triggerHaptic();
    };
  });
}

function applyProfileNameChange(newName, options = {}) {
  const notify = options.notify !== false;
  const cleanName = String(newName || '').trim().substring(0, 15);
  if (!cleanName) {
    if (notify) alert('Bitte gib einen Namen ein.');
    return false;
  }

  const oldName = G.username;
  G.username = cleanName;
  StorageManager.setRaw('username', cleanName);

  // UI überall aktualisieren
  const psUsername = document.getElementById('psUsername');
  if (psUsername) psUsername.textContent = cleanName;

  const pdUserName = document.getElementById('pdUserName');
  if (pdUserName) pdUserName.textContent = cleanName;

  const pdProfileInitial = document.getElementById('pdProfileInitial');
  if (pdProfileInitial) pdProfileInitial.textContent = cleanName.charAt(0).toUpperCase();

  const profileNameInput = document.getElementById('profileNameInput');
  if (profileNameInput && profileNameInput.value !== cleanName) profileNameInput.value = cleanName;

  syncProfileWithBackend(null, { reason: 'profile_name_changed' });

  triggerHaptic();
  if (notify) alert(`Name von "${oldName}" zu "${cleanName}" geändert.`);
  return true;
}

window.applyProfileNameChange = applyProfileNameChange;

window.changeProfileName = function() {
  const nameInput = document.getElementById('profileNameInput');
  if (!nameInput) return;
  applyProfileNameChange(nameInput.value, { notify: true });
};
