/**
 * Duel Setup Runtime Controller
 *
 * Production controller for the Duell Setup bottom sheet.
 */
(function () {
  'use strict';

  if (window.DuelSetupRuntime?.initialized) return;

  const state = {
    mode: 'bot',
    weapon: 'lg',
    discipline: 'lg40',
    difficulty: 'easy'
  };

  const disciplines = {
    lg40: { weapon: 'lg', label: 'LG 40', shots: 40, dist: '10', desc: '40 Schuss · 10 m', icon: 'target' },
    lg60: { weapon: 'lg', label: 'LG 60', shots: 60, dist: '10', desc: '60 Schuss · 10 m', icon: 'target' },
    kk50: { weapon: 'kk', label: 'KK 50m', shots: 60, dist: '50', desc: '60 Schuss · 50 m', icon: 'target' },
    kk100: { weapon: 'kk', label: 'KK 100m', shots: 60, dist: '100', desc: '60 Schuss · 100 m', icon: 'target' },
    kk3x20: { weapon: 'kk', label: 'KK 3×20', shots: 60, dist: '50', desc: '3 × 20 Schuss', icon: 'cluster' }
  };

  const difficultyOrder = ['easy', 'real', 'hard', 'elite'];
  const difficulties = {
    easy: { label: 'Einfach', icon: '☺', cls: 'easy', stars: 1, desc: 'Einstieg' },
    real: { label: 'Mittel', icon: '◎', cls: 'real', stars: 3, desc: 'Solider Gegner' },
    hard: { label: 'Elite', icon: '💪', cls: 'hard', stars: 4, desc: 'Sehr stark' },
    elite: { label: 'Profi', icon: '✦', cls: 'elite', stars: 5, desc: 'Extrem schwer' }
  };

  function byId(id) {
    return document.getElementById(id);
  }

  function ensureStylesheet() {
    if (document.querySelector('link[href*="duel-setup.css"]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'duel-setup.css?v=3.8';
    document.head.appendChild(link);
  }

  function applyLayoutGuards() {
    ensureStylesheet();
    document.documentElement.style.setProperty('overflow-x', 'hidden', 'important');
    document.body.style.setProperty('overflow-x', 'hidden', 'important');
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function getActiveDiscipline() {
    return disciplines[state.discipline] || disciplines.lg40;
  }

  function getActiveDifficulty() {
    return difficulties[state.difficulty] || difficulties.easy;
  }

  function syncGameState() {
    const disc = getActiveDiscipline();
    if (typeof G !== 'undefined') {
      G.weapon = disc.weapon;
      G.discipline = state.discipline;
      G.diff = state.difficulty;
      G.dist = disc.dist;
      G.shots = disc.shots;
      G.maxShots = disc.shots;
      G.playerShotsLeft = disc.shots;
      G.botShotsLeft = disc.shots;
      G.is3x20 = state.discipline === 'kk3x20';
    }
  }

  function getTargetLabel() {
    const target = window.BattleBalance?.getBalanceTarget?.(state.discipline, state.difficulty) ||
      window.BattleBalance?.BALANCE_TARGETS?.[state.discipline]?.[state.difficulty];

    if (!target) return '—';
    if (target.floor !== undefined) return `≥${target.floor}`;
    if (target.min !== undefined && target.max !== undefined) return `${target.min}–${target.max}`;
    return '—';
  }

  function renderCheck() {
    return '<span class="duel-check" aria-hidden="true">✓</span>';
  }

  function targetIconHtml() {
    return '<span class="duel-target-icon" aria-hidden="true"><span></span></span>';
  }

  function clusterIconHtml() {
    return '<span style="font-size:2rem;color:#65717e;line-height:1;" aria-hidden="true">◉◉◉</span>';
  }

  function starsHtml(count) {
    return `<span class="duel-stars" aria-hidden="true">${Array.from({ length: 5 }, (_, idx) => (
      `<span class="duel-star ${idx < count ? 'filled' : ''}">★</span>`
    )).join('')}</span>`;
  }

  function renderHeader() {
    return `
      <div class="duel-runtime-header">
        <div class="duel-brand-row">
          <div class="duel-brand-mark"><span class="duel-brand-dot"></span></div>
          <div>
            <h2 class="duel-title">SCHUSS<span>DUELL</span></h2>
            <div class="duel-subtitle">Duell Setup Übersicht</div>
          </div>
        </div>
        <div class="duel-shield" aria-hidden="true">⌖</div>
      </div>
    `;
  }

  function renderModeSection() {
    const modes = [
      { key: 'bot', icon: '🤖', title: 'Gegen Bot', sub: 'Fordere den Bot heraus' },
      { key: 'multiplayer', icon: '👥', title: 'Multiplayer', sub: 'Spiele gegen andere' }
    ];

    return `
      <section class="duel-section">
        <div class="duel-section-title"><span class="duel-section-icon">🎮</span>1. SPIELMODUS</div>
        <div class="duel-option-grid two">
          ${modes.map((mode) => `
            <button class="duel-card ${state.mode === mode.key ? 'selected' : ''}" onclick="DuelSetupRuntime.setMode('${mode.key}')" type="button">
              ${renderCheck()}
              <span class="duel-card-icon" aria-hidden="true">${mode.icon}</span>
              <span>
                <span class="duel-card-title">${escapeHtml(mode.title)}</span>
                <span class="duel-card-sub">${escapeHtml(mode.sub)}</span>
              </span>
            </button>
          `).join('')}
        </div>
      </section>
    `;
  }

  function renderWeaponSection() {
    const weapons = [
      { key: 'lg', icon: '≋', label: 'Luftgewehr' },
      { key: 'kk', icon: '🎯', label: 'Kleinkaliber' }
    ];

    return `
      <section class="duel-section">
        <div class="duel-section-title"><span class="duel-section-icon">⌁</span>2. WAFFE</div>
        <div class="duel-option-grid two">
          ${weapons.map((weapon) => `
            <button class="duel-pill ${state.weapon === weapon.key ? 'selected' : ''}" onclick="DuelSetupRuntime.setWeapon('${weapon.key}')" type="button">
              ${renderCheck()}
              <span class="duel-pill-icon" aria-hidden="true">${weapon.icon}</span>
              <span>${escapeHtml(weapon.label)}</span>
            </button>
          `).join('')}
        </div>
      </section>
    `;
  }

  function renderDisciplineSection() {
    return `
      <section class="duel-section">
        <div class="duel-section-title"><span class="duel-section-icon">◎</span>3. DISZIPLIN</div>
        <div class="duel-option-grid disciplines">
          ${Object.entries(disciplines).map(([key, disc]) => `
            <button class="duel-discipline ${state.discipline === key ? 'selected' : ''}" onclick="DuelSetupRuntime.setDiscipline('${key}')" type="button">
              ${renderCheck()}
              ${disc.icon === 'cluster' ? clusterIconHtml() : targetIconHtml()}
              <span class="duel-discipline-label">${escapeHtml(disc.label)}</span>
            </button>
          `).join('')}
        </div>
      </section>
    `;
  }

  function renderDifficultySection() {
    return `
      <section class="duel-section">
        <div class="duel-section-title"><span class="duel-section-icon">▥</span>4. SCHWIERIGKEIT</div>
        <div class="duel-option-grid difficulties">
          ${difficultyOrder.map((key) => {
            const diff = difficulties[key];
            return `
              <button class="duel-difficulty ${diff.cls} ${state.difficulty === key ? 'selected' : ''}" onclick="DuelSetupRuntime.setDifficulty('${key}')" type="button">
                ${renderCheck()}
                <span class="duel-difficulty-icon" aria-hidden="true">${diff.icon}</span>
                <span class="duel-difficulty-label">${escapeHtml(diff.label)}</span>
                ${starsHtml(diff.stars)}
              </button>
            `;
          }).join('')}
        </div>
      </section>
    `;
  }

  function renderSummarySection() {
    const disc = getActiveDiscipline();
    const diff = getActiveDifficulty();
    const target = getTargetLabel();

    return `
      <section class="duel-section">
        <div class="duel-section-title"><span class="duel-section-icon">▣</span>5. AKTIVE AUSWAHL</div>
        <div class="duel-summary-card">
          <div class="duel-summary-target" aria-hidden="true"></div>
          <div class="duel-summary-text">
            <div class="duel-summary-main">
              <span class="lime">${escapeHtml(disc.label)}</span><span class="dot">·</span><span class="lime">${escapeHtml(diff.label)}</span><span class="dot">·</span><span class="cyan">${disc.shots} Schuss</span>
            </div>
            <div class="duel-summary-line">🤖 Bot-Zielbereich: <b>${escapeHtml(target)}</b></div>
            <div class="duel-summary-line">📏 Entfernung: <b>${escapeHtml(disc.dist)} m</b></div>
          </div>
        </div>
        <div class="duel-hint"><span class="duel-hint-icon">i</span><span>Wähle Waffenart, Disziplin und Schwierigkeit für dein Duell.</span></div>
        <button class="duel-start-btn" onclick="DuelSetupRuntime.startDuel()" type="button">🎯 DUELL STARTEN</button>
      </section>
    `;
  }

  function renderOverview() {
    return `
      <div class="duel-runtime">
        <div class="duel-grabber" aria-hidden="true"></div>
        ${renderHeader()}
        ${renderModeSection()}
        ${renderWeaponSection()}
        ${renderDisciplineSection()}
        ${renderDifficultySection()}
        ${renderSummarySection()}
      </div>
    `;
  }

  function renderSettings(mode) {
    if (mode) state.mode = mode === 'multiplayer' ? 'multiplayer' : 'bot';
    if (state.mode === 'multiplayer') {
      state.mode = 'bot';
      setTimeout(() => alert('Multiplayer ist noch nicht stabil. Ich öffne den Bot-Modus.'), 0);
    }

    const modeSelection = byId('gameModeSelection');
    const settings = byId('duelSettingsContent');
    const sheet = byId('duelSetupSheet');
    if (!settings) return;

    if (modeSelection) modeSelection.style.display = 'none';
    settings.style.display = 'block';
    settings.style.visibility = 'visible';
    settings.style.opacity = '1';
    settings.innerHTML = renderOverview();

    syncGameState();
    applyLayoutGuards();
    if (sheet) sheet.scrollTop = 0;
  }

  function openSheet() {
    const overlay = byId('duelSetupSheetOverlay');
    const sheet = byId('duelSetupSheet');
    if (!overlay || !sheet) return;

    overlay.style.display = 'block';
    overlay.style.opacity = '1';
    sheet.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    renderSettings(state.mode);
  }

  function closeSheet(event) {
    const overlay = byId('duelSetupSheetOverlay');
    const sheet = byId('duelSetupSheet');
    if (event && sheet && event.target !== overlay) return;

    if (sheet) sheet.classList.remove('is-open');
    if (overlay) {
      overlay.style.opacity = '0';
      setTimeout(() => {
        overlay.style.display = 'none';
      }, 250);
    }
    document.body.style.overflow = '';
  }

  function showModeSelection() {
    renderSettings(state.mode);
  }

  function startDuel() {
    syncGameState();
    applyLayoutGuards();

    const candidates = ['startBattle', 'startDuel', 'beginBattle', 'beginDuel', 'startMatch', 'beginMatch', 'startGame', 'startBotBattle', 'startBotDuel'];
    for (const name of candidates) {
      if (typeof window[name] === 'function') {
        try {
          window[name]();
          return;
        } catch (e) {
          console.error('[DuelSetupRuntime] start failed:', name, e);
        }
      }
    }

    alert('Einstellungen gesetzt. Startfunktion ist noch nicht eindeutig gefunden.');
  }

  const api = {
    initialized: true,
    openSheet,
    closeSheet,
    renderSettings,
    showModeSelection,
    startDuel,
    setMode(mode) {
      state.mode = mode === 'multiplayer' ? 'multiplayer' : 'bot';
      renderSettings(state.mode);
    },
    setWeapon(weapon) {
      state.weapon = weapon === 'kk' ? 'kk' : 'lg';
      if (state.weapon === 'lg' && disciplines[state.discipline]?.weapon !== 'lg') state.discipline = 'lg40';
      if (state.weapon === 'kk' && disciplines[state.discipline]?.weapon !== 'kk') state.discipline = 'kk50';
      renderSettings(state.mode);
    },
    setDiscipline(discipline) {
      if (disciplines[discipline]) {
        state.discipline = discipline;
        state.weapon = disciplines[discipline].weapon;
      }
      renderSettings(state.mode);
    },
    setDifficulty(difficulty) {
      state.difficulty = difficulties[difficulty] ? difficulty : 'easy';
      renderSettings(state.mode);
    },
    getState() {
      return { ...state };
    }
  };

  window.DuelSetupRuntime = api;

  // Legacy HTML handlers kept for existing inline onclick attributes.
  window.openDuelSetup = openSheet;
  window.closeDuelSetup = closeSheet;
  window.selectGameMode = (mode) => renderSettings(mode || 'bot');
  window.showGameModeSelection = showModeSelection;
  window.duelRuntimeFixSetWeapon = api.setWeapon;
  window.duelRuntimeFixSetDiscipline = api.setDiscipline;
  window.duelRuntimeFixSetDifficulty = api.setDifficulty;
  window.duelRuntimeFixStart = startDuel;

  document.addEventListener('click', function (event) {
    const botButton = event.target.closest && event.target.closest('#modeBotBtn');
    const multiButton = event.target.closest && event.target.closest('#modeMultiBtn');
    if (botButton || multiButton) {
      event.preventDefault();
      event.stopImmediatePropagation();
      renderSettings(botButton ? 'bot' : 'multiplayer');
    }
  }, true);

  window.addEventListener('resize', applyLayoutGuards);
  window.addEventListener('orientationchange', () => setTimeout(applyLayoutGuards, 200));

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyLayoutGuards);
  } else {
    applyLayoutGuards();
  }

  console.info('✅ DuelSetupRuntime overview active');
})();
