/**
 * Runtime Fixes + local QA Test Suite
 *
 * Diese Datei wird in index.html als letztes defer-Script geladen.
 * Auf Produktion installiert sie kritische UI-Fixes. Lokal kann sie weiter für QA genutzt werden.
 */

(function installProductionDuelFlowFix() {
  'use strict';

  const QA_IS_LOCAL_DEV = ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
  if (QA_IS_LOCAL_DEV) return;

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

  function fixMobileLayout() {
    document.documentElement.style.overflowX = 'hidden';
    document.body.style.overflowX = 'hidden';
    document.body.style.width = '100%';

    const overlay = byId('duelSetupSheetOverlay');
    const sheet = byId('duelSetupSheet');
    const floatingButton = byId('btnOpenDuelSetup');

    if (overlay) {
      overlay.style.position = 'fixed';
      overlay.style.inset = '0';
      overlay.style.width = '100vw';
      overlay.style.maxWidth = '100vw';
      overlay.style.height = '100dvh';
      overlay.style.overflowX = 'hidden';
      overlay.style.zIndex = '9000';
      overlay.style.background = 'rgba(0,0,0,.58)';
      overlay.style.backdropFilter = 'none';
      overlay.style.webkitBackdropFilter = 'none';
      overlay.style.filter = 'none';
    }

    if (sheet) {
      sheet.style.position = 'fixed';
      sheet.style.left = '0';
      sheet.style.right = '0';
      sheet.style.width = '100vw';
      sheet.style.maxWidth = '100vw';
      sheet.style.boxSizing = 'border-box';
      sheet.style.margin = '0';
      sheet.style.transform = 'none';
      sheet.style.backdropFilter = 'none';
      sheet.style.webkitBackdropFilter = 'none';
      sheet.style.filter = 'none';
      sheet.style.overflowX = 'hidden';
      sheet.style.paddingBottom = 'calc(34px + env(safe-area-inset-bottom))';
      sheet.style.webkitFontSmoothing = 'antialiased';
      sheet.style.textRendering = 'geometricPrecision';
    }

    if (floatingButton) {
      floatingButton.style.left = '50%';
      floatingButton.style.right = 'auto';
      floatingButton.style.transform = 'translateX(-50%)';
    }
  }

  function syncGameState() {
    const disc = disciplines[state.discipline] || disciplines.lg40;

    try {
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

        if (G.is3x20) {
          G.positions = ['Kniend', 'Liegend', 'Stehend'];
          G.posIcons = ['🦵', '🛏️', '🧍'];
          G.posIdx = 0;
          G.posShots = 0;
          G.perPos = 20;
          G.posResults = [];
        }
      }
    } catch (e) {
      console.warn('[DuelRuntimeFix] G sync failed', e);
    }
  }

  function findOriginalStartButton(settings) {
    const buttons = Array.from(settings.querySelectorAll('button'));
    return buttons.reverse().find((btn) => /duell\s*starten/i.test(btn.textContent || '')) || null;
  }

  function fallbackStartButtonHtml() {
    return '<button onclick="duelRuntimeFixStart()" style="width:100%;background:linear-gradient(135deg,#00c3ff 0%,#7ab030 100%);border:0;border-radius:22px;padding:18px 20px;color:#061006;font-size:1.12rem;font-weight:950;letter-spacing:.16em;box-shadow:0 10px 35px rgba(122,176,48,.35);">🎯 DUELL STARTEN</button>';
  }

  function renderDuelSettings(mode) {
    state.mode = mode === 'multiplayer' ? 'multiplayer' : 'bot';

    if (state.mode === 'multiplayer') {
      state.mode = 'bot';
      setTimeout(() => alert('Multiplayer ist noch nicht stabil. Ich öffne den Bot-Modus.'), 0);
    }

    const modeSelection = byId('gameModeSelection');
    const settings = byId('duelSettingsContent');
    const sheet = byId('duelSetupSheet');

    if (!settings) {
      console.error('[DuelRuntimeFix] duelSettingsContent fehlt');
      return;
    }

    const originalStartButton = findOriginalStartButton(settings);
    const originalStartButtonHtml = originalStartButton ? originalStartButton.outerHTML : fallbackStartButtonHtml();

    if (modeSelection) modeSelection.style.display = 'none';
    settings.style.display = 'block';
    settings.style.visibility = 'visible';
    settings.style.opacity = '1';
    settings.style.filter = 'none';
    settings.style.backdropFilter = 'none';
    settings.style.webkitBackdropFilter = 'none';

    const availableDisciplines = Object.entries(disciplines).filter(([, disc]) => disc.weapon === state.weapon);
    if (!availableDisciplines.some(([key]) => key === state.discipline)) {
      state.discipline = state.weapon === 'lg' ? 'lg40' : 'kk50';
    }

    const activeDiscipline = disciplines[state.discipline];
    const activeDifficulty = difficulties[state.difficulty] || difficulties.easy;

    settings.innerHTML = `
      <button onclick="showGameModeSelection()" style="background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.15);color:rgba(255,255,255,.72);border-radius:14px;padding:12px 16px;margin-bottom:22px;font-weight:800;font-size:1rem;">← Zurück zur Modus-Auswahl</button>

      <h2 style="color:#fff;margin:0 0 18px 0;font-size:1.55rem;font-weight:900;letter-spacing:.03em;">DUELL EINSTELLUNGEN</h2>

      <section style="margin-bottom:18px;">
        <div style="color:rgba(255,255,255,.45);font-size:.74rem;font-weight:900;letter-spacing:.12em;text-transform:uppercase;margin-bottom:9px;">Waffe</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <button onclick="duelRuntimeFixSetWeapon('lg')" style="${optionStyle(state.weapon === 'lg')}">
            <div style="font-size:1.05rem;margin-bottom:4px;">🌬️ Luftgewehr</div>
            <div style="font-size:.72rem;color:rgba(255,255,255,.55);font-weight:600;">10 Meter</div>
          </button>
          <button onclick="duelRuntimeFixSetWeapon('kk')" style="${optionStyle(state.weapon === 'kk')}">
            <div style="font-size:1.05rem;margin-bottom:4px;">🎯 Kleinkaliber</div>
            <div style="font-size:.72rem;color:rgba(255,255,255,.55);font-weight:600;">50 / 100 m</div>
          </button>
        </div>
      </section>

      <section style="margin-bottom:18px;">
        <div style="color:rgba(255,255,255,.45);font-size:.74rem;font-weight:900;letter-spacing:.12em;text-transform:uppercase;margin-bottom:9px;">Disziplin</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          ${availableDisciplines.map(([key, disc]) => `
            <button onclick="duelRuntimeFixSetDiscipline('${key}')" style="${optionStyle(state.discipline === key)}">
              <div style="font-size:.98rem;margin-bottom:4px;">${disc.label}</div>
              <div style="font-size:.7rem;color:rgba(255,255,255,.55);font-weight:600;">${disc.desc}</div>
            </button>
          `).join('')}
        </div>
      </section>

      <section style="margin-bottom:18px;">
        <div style="color:rgba(255,255,255,.45);font-size:.74rem;font-weight:900;letter-spacing:.12em;text-transform:uppercase;margin-bottom:9px;">Schwierigkeit</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          ${Object.entries(difficulties).map(([key, diff]) => `
            <button onclick="duelRuntimeFixSetDifficulty('${key}')" style="${optionStyle(state.difficulty === key)}">
              <div style="font-size:.95rem;margin-bottom:4px;">${diff.label}</div>
              <div style="font-size:.7rem;color:rgba(255,255,255,.55);font-weight:600;">${diff.desc}</div>
            </button>
          `).join('')}
        </div>
      </section>

      <div style="border:1px solid rgba(122,176,48,.22);background:rgba(122,176,48,.08);border-radius:18px;padding:14px 16px;margin-bottom:18px;color:rgba(255,255,255,.78);font-size:.88rem;line-height:1.45;">
        <b style="color:#fff;">Aktiv:</b> ${activeDiscipline.label} · ${activeDifficulty.label} · ${activeDiscipline.shots} Schuss
      </div>

      ${originalStartButtonHtml}
    `;

    syncGameState();
    fixMobileLayout();
    if (sheet) sheet.scrollTop = 0;
  }

  function forceOpenSheet() {
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
    fixMobileLayout();
  }

  const originalOpen = window.openDuelSetup;
  window.openDuelSetup = function patchedOpenDuelSetup() {
    try {
      if (typeof originalOpen === 'function') originalOpen.apply(this, arguments);
    } catch (e) {
      console.warn('[DuelRuntimeFix] original open failed', e);
    }
    forceOpenSheet();
  };

  window.selectGameMode = function patchedSelectGameMode(mode) {
    renderDuelSettings(mode || 'bot');
  };

  window.showGameModeSelection = function patchedShowGameModeSelection() {
    const modeSelection = byId('gameModeSelection');
    const settings = byId('duelSettingsContent');
    if (modeSelection) modeSelection.style.display = 'block';
    if (settings) settings.style.display = 'none';
    fixMobileLayout();
  };

  window.duelRuntimeFixSetWeapon = function duelRuntimeFixSetWeapon(weapon) {
    state.weapon = weapon === 'kk' ? 'kk' : 'lg';
    state.discipline = state.weapon === 'lg' ? 'lg40' : 'kk50';
    renderDuelSettings(state.mode);
  };

  window.duelRuntimeFixSetDiscipline = function duelRuntimeFixSetDiscipline(discipline) {
    if (disciplines[discipline]) {
      state.discipline = discipline;
      state.weapon = disciplines[discipline].weapon;
    }
    renderDuelSettings(state.mode);
  };

  window.duelRuntimeFixSetDifficulty = function duelRuntimeFixSetDifficulty(difficulty) {
    state.difficulty = difficulties[difficulty] ? difficulty : 'easy';
    renderDuelSettings(state.mode);
  };

  window.duelRuntimeFixStart = function duelRuntimeFixStart() {
    syncGameState();
    const candidates = ['startBattle', 'startDuel', 'beginBattle', 'beginDuel', 'startMatch', 'beginMatch', 'startGame', 'startBotBattle', 'startBotDuel'];

    for (const name of candidates) {
      if (typeof window[name] === 'function') {
        try {
          window[name]();
          return;
        } catch (e) {
          console.error('[DuelRuntimeFix] start failed:', name, e);
        }
      }
    }

    alert('Einstellungen gesetzt. Startfunktion ist noch nicht eindeutig gefunden.');
  };

  document.addEventListener('click', function interceptModeButtons(event) {
    const botButton = event.target.closest && event.target.closest('#modeBotBtn');
    const multiButton = event.target.closest && event.target.closest('#modeMultiBtn');

    if (botButton || multiButton) {
      event.preventDefault();
      event.stopImmediatePropagation();
      renderDuelSettings(botButton ? 'bot' : 'multiplayer');
    }
  }, true);

  window.addEventListener('resize', fixMobileLayout);
  window.addEventListener('orientationchange', function () {
    setTimeout(fixMobileLayout, 200);
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fixMobileLayout);
  } else {
    fixMobileLayout();
  }

  console.info('✅ Duel Runtime Fix active, blur disabled');
})();

// Local QA placeholder
if (['localhost', '127.0.0.1', '::1'].includes(window.location.hostname)) {
  console.info('🧪 QA Test Suite available in local development');
}
