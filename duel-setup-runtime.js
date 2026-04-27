/**
 * Duel Setup Runtime Controller
 *
 * Production controller for the Duell Setup bottom sheet.
 */
(function () {
  'use strict';

  if (window.DuelSetupRuntime?.initialized) return;

  const ASSET_VERSION = '4.5';

  const state = {
    mode: 'bot',
    weapon: 'lg',
    discipline: 'lg40',
    difficulty: 'easy'
  };

  const scrollLock = {
    locked: false,
    scrollY: 0,
    lastTouchY: 0,
    touchGuardsAttached: false,
    bodyStyles: {},
    htmlStyles: {}
  };

  const disciplines = {
    lg40: { weapon: 'lg', label: 'LG 40', shots: 40, dist: '10', desc: '40 Schuss · 10 m', icon: 'target' },
    lg60: { weapon: 'lg', label: 'LG 60', shots: 60, dist: '10', desc: '60 Schuss · 10 m', icon: 'target' },
    kk50: { weapon: 'kk', label: 'KK 50m', shots: 60, dist: '50', desc: '60 Schuss · 50 m', icon: 'target' },
    kk100: { weapon: 'kk', label: 'KK 100m', shots: 60, dist: '100', desc: '60 Schuss · 100 m', icon: 'target' },
    kk3x20: { weapon: 'kk', label: 'KK 3×20', shots: 60, dist: '50', desc: '3 × 20 Schuss', icon: 'cluster' }
  };

  const disciplineByWeapon = {
    lg: ['lg40', 'lg60'],
    kk: ['kk50', 'kk100', 'kk3x20']
  };

  const defaultDisciplineByWeapon = {
    lg: 'lg40',
    kk: 'kk50'
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
    const href = `duel-setup.css?v=${ASSET_VERSION}`;
    const existing = document.querySelector('link[href*="duel-setup.css"]');

    if (existing) {
      if (!existing.getAttribute('href')?.includes(`v=${ASSET_VERSION}`)) {
        existing.setAttribute('href', href);
      }
      return;
    }

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
  }

  function ensureRuntimePolishStyles() {
    if (document.getElementById('duelSetupRuntimePolish')) return;

    const style = document.createElement('style');
    style.id = 'duelSetupRuntimePolish';
    style.textContent = `
      .duel-discipline-content{display:flex;flex-direction:column;gap:4px;min-width:0}
      .duel-discipline-meta{display:block;color:rgba(230,238,244,.54);font-size:.72rem;font-weight:700;line-height:1.15}
      .duel-discipline.selected .duel-discipline-meta{color:rgba(230,255,190,.68)}
      .duel-summary-line.duel-summary-note{color:rgba(230,238,244,.54);font-size:.78rem;margin-top:3px}
      .duel-start-btn.is-starting{opacity:.78;pointer-events:none;filter:saturate(.8)}
      .duel-start-error{margin-top:10px;padding:10px 12px;border-radius:12px;border:1px solid rgba(255,90,90,.38);background:rgba(255,60,60,.10);color:#ffd3d3;font-size:.8rem;font-weight:800;line-height:1.3}
    `;
    document.head.appendChild(style);
  }

  function applyLayoutGuards() {
    ensureStylesheet();
    ensureRuntimePolishStyles();
    document.documentElement.style.setProperty('overflow-x', 'hidden', 'important');
    document.body.style.setProperty('overflow-x', 'hidden', 'important');
  }

  function getSheet() {
    return byId('duelSetupSheet');
  }

  function getOverlay() {
    return byId('duelSetupSheetOverlay');
  }

  function getVisibleDisciplineKeys() {
    return disciplineByWeapon[state.weapon] || disciplineByWeapon.lg;
  }

  function ensureValidDisciplineForWeapon() {
    const visibleKeys = getVisibleDisciplineKeys();
    if (!visibleKeys.includes(state.discipline)) {
      state.discipline = defaultDisciplineByWeapon[state.weapon] || visibleKeys[0] || 'lg40';
    }
  }

  function saveScrollStyles() {
    const body = document.body;
    const html = document.documentElement;

    scrollLock.bodyStyles = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
      overflow: body.style.overflow,
      height: body.style.height,
      overscrollBehavior: body.style.overscrollBehavior,
      touchAction: body.style.touchAction
    };

    scrollLock.htmlStyles = {
      overflow: html.style.overflow,
      height: html.style.height,
      overscrollBehavior: html.style.overscrollBehavior,
      touchAction: html.style.touchAction
    };
  }

  function restoreScrollStyles() {
    const body = document.body;
    const html = document.documentElement;

    Object.entries(scrollLock.bodyStyles).forEach(([key, value]) => {
      body.style[key] = value || '';
    });

    Object.entries(scrollLock.htmlStyles).forEach(([key, value]) => {
      html.style[key] = value || '';
    });
  }

  function prepareSheetScroll() {
    const sheet = getSheet();
    if (!sheet) return;

    sheet.style.overflowY = 'auto';
    sheet.style.webkitOverflowScrolling = 'touch';
    sheet.style.overscrollBehavior = 'contain';
    sheet.style.touchAction = 'pan-y';
  }

  function lockPageScroll() {
    prepareSheetScroll();
    if (scrollLock.locked) return;

    const body = document.body;
    const html = document.documentElement;
    scrollLock.scrollY = window.scrollY || html.scrollTop || body.scrollTop || 0;
    saveScrollStyles();

    html.style.overflow = 'hidden';
    html.style.height = '100%';
    html.style.overscrollBehavior = 'none';
    html.style.touchAction = 'none';

    body.style.position = 'fixed';
    body.style.top = `-${scrollLock.scrollY}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.width = '100%';
    body.style.height = '100%';
    body.style.overflow = 'hidden';
    body.style.overscrollBehavior = 'none';
    body.style.touchAction = 'none';
    body.classList.add('duel-scroll-lock-active');

    scrollLock.locked = true;
  }

  function unlockPageScroll() {
    if (!scrollLock.locked) return;

    document.body.classList.remove('duel-scroll-lock-active');
    restoreScrollStyles();
    window.scrollTo(0, scrollLock.scrollY || 0);
    scrollLock.locked = false;
  }

  function handleOverlayTouchStart(event) {
    scrollLock.lastTouchY = event.touches && event.touches.length ? event.touches[0].clientY : 0;
  }

  function handleOverlayTouchMove(event) {
    if (!scrollLock.locked) return;

    const sheet = getSheet();
    if (!sheet) return;

    if (!sheet.contains(event.target)) {
      event.preventDefault();
      return;
    }

    const currentY = event.touches && event.touches.length ? event.touches[0].clientY : scrollLock.lastTouchY;
    const deltaY = currentY - scrollLock.lastTouchY;
    scrollLock.lastTouchY = currentY;

    const canScroll = sheet.scrollHeight > sheet.clientHeight + 1;
    const atTop = sheet.scrollTop <= 0;
    const atBottom = Math.ceil(sheet.scrollTop + sheet.clientHeight) >= sheet.scrollHeight;

    if (!canScroll || (atTop && deltaY > 0) || (atBottom && deltaY < 0)) {
      event.preventDefault();
    }
  }

  function attachOverlayTouchGuards() {
    const overlay = getOverlay();
    if (!overlay || scrollLock.touchGuardsAttached) return;

    overlay.addEventListener('touchstart', handleOverlayTouchStart, { passive: true });
    overlay.addEventListener('touchmove', handleOverlayTouchMove, { passive: false });
    scrollLock.touchGuardsAttached = true;
  }

  function closeOverlayImmediately() {
    const overlay = getOverlay();
    const sheet = getSheet();

    if (sheet) {
      sheet.classList.remove('is-open');
      sheet.style.bottom = '-100%';
    }

    if (overlay) {
      overlay.style.opacity = '0';
      overlay.style.display = 'none';
    }

    unlockPageScroll();
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
    ensureValidDisciplineForWeapon();
    return disciplines[state.discipline] || disciplines.lg40;
  }

  function getActiveDifficulty() {
    return difficulties[state.difficulty] || difficulties.easy;
  }

  function syncGameState() {
    ensureValidDisciplineForWeapon();
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
    ensureValidDisciplineForWeapon();
    const visibleEntries = getVisibleDisciplineKeys()
      .map((key) => [key, disciplines[key]])
      .filter((entry) => Boolean(entry[1]));

    return `
      <section class="duel-section">
        <div class="duel-section-title"><span class="duel-section-icon">◎</span>3. DISZIPLIN</div>
        <div class="duel-option-grid disciplines" data-weapon="${escapeHtml(state.weapon)}">
          ${visibleEntries.map(([key, disc]) => `
            <button class="duel-discipline ${state.discipline === key ? 'selected' : ''}" onclick="DuelSetupRuntime.setDiscipline('${key}')" type="button">
              ${renderCheck()}
              ${disc.icon === 'cluster' ? clusterIconHtml() : targetIconHtml()}
              <span class="duel-discipline-content">
                <span class="duel-discipline-label">${escapeHtml(disc.label)}</span>
                <span class="duel-discipline-meta">${escapeHtml(disc.desc)}</span>
              </span>
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
              <button class="duel-difficulty ${diff.cls} ${state.difficulty === key ? 'selected' : ''}" onclick="DuelSetupRuntime.setDifficulty('${key}')" type="button" title="${escapeHtml(diff.desc)}">
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
            <div class="duel-summary-line duel-summary-note">Werte sind Bot-Zielbereiche, keine Änderung an der Balance.</div>
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
        <div id="duelStartError" class="duel-start-error" style="display:none"></div>
      </div>
    `;
  }

  function showStartError(message) {
    const errorEl = byId('duelStartError');
    if (!errorEl) {
      alert(message);
      return;
    }

    errorEl.textContent = message;
    errorEl.style.display = 'block';
  }

  function renderSettings(mode) {
    if (mode) state.mode = mode === 'multiplayer' ? 'multiplayer' : 'bot';
    if (state.mode === 'multiplayer') {
      state.mode = 'bot';
      setTimeout(() => alert('Multiplayer ist noch nicht stabil. Ich öffne den Bot-Modus.'), 0);
    }

    ensureValidDisciplineForWeapon();
    const modeSelection = byId('gameModeSelection');
    const settings = byId('duelSettingsContent');
    const sheet = getSheet();
    if (!settings) return;

    if (modeSelection) modeSelection.style.display = 'none';
    settings.style.display = 'block';
    settings.style.visibility = 'visible';
    settings.style.opacity = '1';
    settings.innerHTML = renderOverview();

    syncGameState();
    applyLayoutGuards();
    prepareSheetScroll();
    if (sheet) sheet.scrollTop = 0;
  }

  function openSheet() {
    const overlay = getOverlay();
    const sheet = getSheet();
    if (!overlay || !sheet) return;

    applyLayoutGuards();
    renderSettings(state.mode);
    attachOverlayTouchGuards();
    overlay.style.display = 'block';
    overlay.style.opacity = '1';
    sheet.style.bottom = '0';
    sheet.classList.add('is-open');
    lockPageScroll();
  }

  function closeSheet(event) {
    const overlay = getOverlay();
    const sheet = getSheet();
    if (event && sheet && event.target !== overlay) return;

    if (sheet) {
      sheet.classList.remove('is-open');
      sheet.style.bottom = '-100%';
    }
    if (overlay) {
      overlay.style.opacity = '0';
      setTimeout(() => {
        overlay.style.display = 'none';
      }, 250);
    }
    setTimeout(unlockPageScroll, 260);
  }

  function showModeSelection() {
    renderSettings(state.mode);
  }

  function startDuel() {
    syncGameState();
    applyLayoutGuards();

    const startButton = document.querySelector('.duel-start-btn');
    if (startButton) {
      startButton.classList.add('is-starting');
      startButton.textContent = '🎯 STARTE...';
    }

    if (typeof window.startBattle !== 'function') {
      if (startButton) {
        startButton.classList.remove('is-starting');
        startButton.textContent = '🎯 DUELL STARTEN';
      }
      showStartError('Startfunktion startBattle() wurde nicht gefunden. Duell konnte nicht gestartet werden.');
      return false;
    }

    try {
      window.startBattle();
      closeOverlayImmediately();
      return true;
    } catch (e) {
      console.error('[DuelSetupRuntime] startBattle failed:', e);
      if (startButton) {
        startButton.classList.remove('is-starting');
        startButton.textContent = '🎯 DUELL STARTEN';
      }
      showStartError('Duell konnte nicht gestartet werden. Bitte erneut versuchen.');
      return false;
    }
  }

  const api = {
    initialized: true,
    version: ASSET_VERSION,
    openSheet,
    closeSheet,
    renderSettings,
    showModeSelection,
    startDuel,
    lockPageScroll,
    unlockPageScroll,
    setMode(mode) {
      state.mode = mode === 'multiplayer' ? 'multiplayer' : 'bot';
      renderSettings(state.mode);
    },
    setWeapon(weapon) {
      state.weapon = weapon === 'kk' ? 'kk' : 'lg';
      ensureValidDisciplineForWeapon();
      renderSettings(state.mode);
    },
    setDiscipline(discipline) {
      if (disciplines[discipline]) {
        state.discipline = discipline;
        state.weapon = disciplines[discipline].weapon;
      }
      ensureValidDisciplineForWeapon();
      renderSettings(state.mode);
    },
    setDifficulty(difficulty) {
      state.difficulty = difficulties[difficulty] ? difficulty : 'easy';
      renderSettings(state.mode);
    },
    getVisibleDisciplineKeys,
    getState() {
      return { ...state, visibleDisciplines: getVisibleDisciplineKeys(), scrollLocked: scrollLock.locked };
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

  window.addEventListener('resize', () => {
    applyLayoutGuards();
    if (scrollLock.locked) prepareSheetScroll();
  });
  window.addEventListener('orientationchange', () => setTimeout(() => {
    applyLayoutGuards();
    if (scrollLock.locked) prepareSheetScroll();
  }, 200));
  window.addEventListener('pagehide', unlockPageScroll);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) unlockPageScroll();
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyLayoutGuards);
  } else {
    applyLayoutGuards();
  }

  console.info('✅ DuelSetupRuntime overview active', ASSET_VERSION);
})();
