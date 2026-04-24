/**
 * Duel Setup Runtime Controller
 *
 * Centralizes the production duel setup sheet behavior that previously lived in
 * qa-test-suite.js as a last-minute runtime patch.
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
    lg40: { weapon: 'lg', label: 'LG 40', shots: 40, dist: '10', desc: '40 Schuss · 10 m' },
    lg60: { weapon: 'lg', label: 'LG 60', shots: 60, dist: '10', desc: '60 Schuss · 10 m' },
    kk50: { weapon: 'kk', label: 'KK 50m', shots: 60, dist: '50', desc: '60 Schuss · 50 m' },
    kk100: { weapon: 'kk', label: 'KK 100m', shots: 60, dist: '100', desc: '60 Schuss · 100 m' },
    kk3x20: { weapon: 'kk', label: 'KK 3×20', shots: 60, dist: '50', desc: '3 × 20 Schuss' }
  };

  const difficulties = {
    easy: { label: '😊 Einfach', desc: 'Einstieg' },
    real: { label: '🎯 Mittel', desc: 'Solider Gegner' },
    hard: { label: '💪 Elite', desc: 'Sehr stark' },
    elite: { label: '💫 Profi', desc: 'Extrem schwer' }
  };

  function byId(id) {
    return document.getElementById(id);
  }

  function applyLayoutGuards() {
    let style = byId('duelSetupRuntimeStyle');
    if (!style) {
      style = document.createElement('style');
      style.id = 'duelSetupRuntimeStyle';
      document.head.appendChild(style);
    }

    style.textContent = `
      html,
      body {
        overflow-x: hidden !important;
      }

      #duelSetupSheetOverlay {
        position: fixed !important;
        inset: 0 !important;
        width: 100vw !important;
        max-width: 100vw !important;
        height: 100dvh !important;
        background: rgba(2, 4, 3, .92) !important;
        z-index: 9000 !important;
      }

      #duelSetupSheet {
        position: fixed !important;
        left: 0 !important;
        right: 0 !important;
        width: 100vw !important;
        max-width: 100vw !important;
        box-sizing: border-box !important;
        margin: 0 !important;
        background: #121214 !important;
        padding-bottom: calc(34px + env(safe-area-inset-bottom)) !important;
        -webkit-font-smoothing: antialiased !important;
      }

      #btnOpenDuelSetup {
        left: 50% !important;
        right: auto !important;
        transform: translateX(-50%) !important;
      }
    `;
  }

  function optionStyle(active) {
    return [
      'border-radius:16px',
      'padding:13px 12px',
      'border:' + (active ? '2px solid rgba(122,176,48,.95)' : '1px solid rgba(255,255,255,.13)'),
      'background:' + (active ? 'linear-gradient(135deg,rgba(122,176,48,.28),rgba(0,195,255,.18))' : 'rgba(255,255,255,.055)'),
      'color:#fff',
      'font-weight:800',
      'text-align:left',
      'cursor:pointer',
      'box-shadow:' + (active ? '0 0 22px rgba(122,176,48,.18)' : 'none')
    ].join(';');
  }

  function syncGameState() {
    const disc = disciplines[state.discipline] || disciplines.lg40;
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

  function getAvailableDisciplines() {
    return Object.entries(disciplines).filter(([, disc]) => disc.weapon === state.weapon);
  }

  function startButtonHtml() {
    return '<button onclick="DuelSetupRuntime.startDuel()" style="width:100%;background:linear-gradient(135deg,#00c3ff 0%,#7ab030 100%);border:0;border-radius:22px;padding:18px 20px;color:#061006;font-size:1.12rem;font-weight:950;letter-spacing:.16em;box-shadow:0 10px 35px rgba(122,176,48,.35);">🎯 DUELL STARTEN</button>';
  }

  function renderSettings(mode) {
    state.mode = mode === 'multiplayer' ? 'multiplayer' : 'bot';
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

    const availableDisciplines = getAvailableDisciplines();
    if (!availableDisciplines.some(([key]) => key === state.discipline)) {
      state.discipline = state.weapon === 'lg' ? 'lg40' : 'kk50';
    }

    const activeDiscipline = disciplines[state.discipline] || disciplines.lg40;
    const activeDifficulty = difficulties[state.difficulty] || difficulties.easy;

    settings.innerHTML = `
      <button onclick="DuelSetupRuntime.showModeSelection()" style="background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.15);color:rgba(255,255,255,.72);border-radius:14px;padding:12px 16px;margin-bottom:22px;font-weight:800;font-size:1rem;">← Zurück zur Modus-Auswahl</button>
      <h2 style="color:#fff;margin:0 0 18px 0;font-size:1.55rem;font-weight:900;letter-spacing:.03em;">DUELL EINSTELLUNGEN</h2>
      <section style="margin-bottom:18px;">
        <div style="color:rgba(255,255,255,.45);font-size:.74rem;font-weight:900;letter-spacing:.12em;text-transform:uppercase;margin-bottom:9px;">Waffe</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <button onclick="DuelSetupRuntime.setWeapon('lg')" style="${optionStyle(state.weapon === 'lg')}"><div style="font-size:1.05rem;margin-bottom:4px;">🌬️ Luftgewehr</div><div style="font-size:.72rem;color:rgba(255,255,255,.55);font-weight:600;">10 Meter</div></button>
          <button onclick="DuelSetupRuntime.setWeapon('kk')" style="${optionStyle(state.weapon === 'kk')}"><div style="font-size:1.05rem;margin-bottom:4px;">🎯 Kleinkaliber</div><div style="font-size:.72rem;color:rgba(255,255,255,.55);font-weight:600;">50 / 100 m</div></button>
        </div>
      </section>
      <section style="margin-bottom:18px;">
        <div style="color:rgba(255,255,255,.45);font-size:.74rem;font-weight:900;letter-spacing:.12em;text-transform:uppercase;margin-bottom:9px;">Disziplin</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          ${availableDisciplines.map(([key, disc]) => `<button onclick="DuelSetupRuntime.setDiscipline('${key}')" style="${optionStyle(state.discipline === key)}"><div style="font-size:.98rem;margin-bottom:4px;">${disc.label}</div><div style="font-size:.7rem;color:rgba(255,255,255,.55);font-weight:600;">${disc.desc}</div></button>`).join('')}
        </div>
      </section>
      <section style="margin-bottom:18px;">
        <div style="color:rgba(255,255,255,.45);font-size:.74rem;font-weight:900;letter-spacing:.12em;text-transform:uppercase;margin-bottom:9px;">Schwierigkeit</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          ${Object.entries(difficulties).map(([key, diff]) => `<button onclick="DuelSetupRuntime.setDifficulty('${key}')" style="${optionStyle(state.difficulty === key)}"><div style="font-size:.95rem;margin-bottom:4px;">${diff.label}</div><div style="font-size:.7rem;color:rgba(255,255,255,.55);font-weight:600;">${diff.desc}</div></button>`).join('')}
        </div>
      </section>
      <div style="border:1px solid rgba(122,176,48,.22);background:rgba(122,176,48,.08);border-radius:18px;padding:14px 16px;margin-bottom:18px;color:rgba(255,255,255,.78);font-size:.88rem;line-height:1.45;"><b style="color:#fff;">Aktiv:</b> ${activeDiscipline.label} · ${activeDifficulty.label} · ${activeDiscipline.shots} Schuss</div>
      ${startButtonHtml()}
    `;

    syncGameState();
    applyLayoutGuards();
    if (sheet) sheet.scrollTop = 0;
  }

  function openSheet() {
    const overlay = byId('duelSetupSheetOverlay');
    const sheet = byId('duelSetupSheet');
    const modeSelection = byId('gameModeSelection');
    const settings = byId('duelSettingsContent');
    if (!overlay || !sheet) return;

    if (modeSelection) modeSelection.style.display = 'block';
    if (settings) settings.style.display = 'none';
    overlay.style.display = 'block';
    overlay.style.opacity = '1';
    sheet.style.bottom = '0';
    document.body.style.overflow = 'hidden';
    applyLayoutGuards();
  }

  function closeSheet(event) {
    const overlay = byId('duelSetupSheetOverlay');
    const sheet = byId('duelSetupSheet');
    if (event && sheet && event.target !== overlay) return;

    if (sheet) sheet.style.bottom = '-100%';
    if (overlay) {
      overlay.style.opacity = '0';
      setTimeout(() => {
        overlay.style.display = 'none';
      }, 250);
    }
    document.body.style.overflow = '';
  }

  function showModeSelection() {
    const modeSelection = byId('gameModeSelection');
    const settings = byId('duelSettingsContent');
    if (modeSelection) modeSelection.style.display = 'block';
    if (settings) settings.style.display = 'none';
    applyLayoutGuards();
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
    setWeapon(weapon) {
      state.weapon = weapon === 'kk' ? 'kk' : 'lg';
      state.discipline = state.weapon === 'lg' ? 'lg40' : 'kk50';
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

  console.info('✅ DuelSetupRuntime active');
})();
