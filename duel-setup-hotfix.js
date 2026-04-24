/*
 * Duel Setup Hotfix v2
 *
 * Vollständiger Mobile-Fix für den Duell-Flow:
 * - verhindert horizontales Wegspringen
 * - öffnet das Bottom-Sheet zuverlässig
 * - baut die Duell-Einstellungen sichtbar neu auf
 * - setzt G.weapon / G.discipline / G.diff / G.shots robust
 * - startet über die vorhandene App-Startfunktion, falls vorhanden
 */
(function () {
  'use strict';

  const originalOpenDuelSetup = window.openDuelSetup;
  const originalCloseDuelSetup = window.closeDuelSetup;

  const FIX = {
    mode: 'bot',
    weapon: 'lg',
    discipline: 'lg40',
    difficulty: 'easy'
  };

  const DISCIPLINES = {
    lg40: { weapon: 'lg', label: 'LG 40', shots: 40, dist: '10', desc: '40 Schuss · 10 m' },
    lg60: { weapon: 'lg', label: 'LG 60', shots: 60, dist: '10', desc: '60 Schuss · 10 m' },
    kk50: { weapon: 'kk', label: 'KK 50m', shots: 60, dist: '50', desc: '60 Schuss · 50 m' },
    kk100: { weapon: 'kk', label: 'KK 100m', shots: 60, dist: '100', desc: '60 Schuss · 100 m' },
    kk3x20: { weapon: 'kk', label: 'KK 3×20', shots: 60, dist: '50', desc: '3 × 20 Schuss' }
  };

  const DIFFICULTIES = {
    easy: { label: '😊 Einfach', desc: 'Guter Einstieg' },
    real: { label: '🎯 Mittel', desc: 'Solider Gegner' },
    hard: { label: '💪 Elite', desc: 'Sehr stark' },
    elite: { label: '💫 Profi', desc: 'Extrem schwer' }
  };

  function byId(id) {
    return document.getElementById(id);
  }

  function cssButton(active) {
    return [
      'border-radius:16px',
      'padding:14px 12px',
      'border:' + (active ? '2px solid rgba(122,176,48,.9)' : '1px solid rgba(255,255,255,.12)'),
      'background:' + (active ? 'linear-gradient(135deg,rgba(122,176,48,.28),rgba(0,195,255,.18))' : 'rgba(255,255,255,.055)'),
      'color:#fff',
      'font-weight:800',
      'text-align:left',
      'cursor:pointer',
      'box-shadow:' + (active ? '0 0 22px rgba(122,176,48,.18)' : 'none')
    ].join(';');
  }

  function lockHorizontalOverflow() {
    document.documentElement.style.overflowX = 'hidden';
    document.body.style.overflowX = 'hidden';
    document.body.style.width = '100%';
  }

  function fixLayout() {
    const overlay = byId('duelSetupSheetOverlay');
    const sheet = byId('duelSetupSheet');
    const startButton = byId('btnOpenDuelSetup');

    lockHorizontalOverflow();

    if (overlay) {
      overlay.style.position = 'fixed';
      overlay.style.inset = '0';
      overlay.style.width = '100vw';
      overlay.style.maxWidth = '100vw';
      overlay.style.height = '100dvh';
      overlay.style.overflowX = 'hidden';
      overlay.style.zIndex = '9000';
    }

    if (sheet) {
      sheet.style.position = 'fixed';
      sheet.style.left = '0';
      sheet.style.right = '0';
      sheet.style.bottom = sheet.style.bottom || '-100%';
      sheet.style.width = '100vw';
      sheet.style.maxWidth = '100vw';
      sheet.style.boxSizing = 'border-box';
      sheet.style.margin = '0';
      sheet.style.transform = 'translate3d(0,0,0)';
      sheet.style.overflowX = 'hidden';
      sheet.style.paddingBottom = 'calc(34px + env(safe-area-inset-bottom))';
    }

    if (startButton) {
      startButton.style.left = '50%';
      startButton.style.right = 'auto';
      startButton.style.transform = 'translateX(-50%)';
    }
  }

  function syncGlobalState() {
    const disc = DISCIPLINES[FIX.discipline] || DISCIPLINES.lg40;

    if (typeof window.G !== 'undefined') {
      window.G.weapon = disc.weapon;
      window.G.discipline = FIX.discipline;
      window.G.diff = FIX.difficulty;
      window.G.dist = disc.dist;
      window.G.shots = disc.shots;
      window.G.maxShots = disc.shots;
      window.G.playerShotsLeft = disc.shots;
      window.G.botShotsLeft = disc.shots;
      window.G.is3x20 = FIX.discipline === 'kk3x20';

      if (window.G.is3x20) {
        window.G.positions = ['Kniend', 'Liegend', 'Stehend'];
        window.G.posIcons = ['🦵', '🛏️', '🧍'];
        window.G.posIdx = 0;
        window.G.posShots = 0;
        window.G.perPos = 20;
        window.G.posResults = [];
      }
    }

    try {
      if (typeof StorageManager !== 'undefined') {
        StorageManager.setRaw('last_weapon', disc.weapon);
        StorageManager.setRaw('last_discipline', FIX.discipline);
        StorageManager.setRaw('last_diff', FIX.difficulty);
      }
    } catch (e) {
      console.warn('[DuelFix] Storage sync failed', e);
    }
  }

  function renderSettings(mode) {
    FIX.mode = mode || FIX.mode || 'bot';

    if (FIX.mode === 'multiplayer') {
      FIX.mode = 'bot';
      alert('Multiplayer ist noch nicht stabil. Ich öffne den Bot-Modus.');
    }

    const modeSelection = byId('gameModeSelection');
    const settings = byId('duelSettingsContent');

    if (modeSelection) modeSelection.style.display = 'none';
    if (!settings) {
      console.error('[DuelFix] duelSettingsContent fehlt');
      return;
    }

    const availableDisciplines = Object.entries(DISCIPLINES).filter(([, d]) => d.weapon === FIX.weapon);
    if (!availableDisciplines.some(([key]) => key === FIX.discipline)) {
      FIX.discipline = FIX.weapon === 'lg' ? 'lg40' : 'kk50';
    }

    const disc = DISCIPLINES[FIX.discipline];
    const difficulty = DIFFICULTIES[FIX.difficulty] || DIFFICULTIES.easy;

    settings.style.display = 'block';
    settings.style.opacity = '1';
    settings.style.visibility = 'visible';

    settings.innerHTML = `
      <button onclick="showGameModeSelection()" style="background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.15);color:rgba(255,255,255,.72);border-radius:14px;padding:12px 16px;margin-bottom:22px;font-weight:800;font-size:1rem;">← Zurück zur Modus-Auswahl</button>

      <h2 style="color:#fff;margin:0 0 18px 0;font-size:1.55rem;font-weight:900;letter-spacing:.03em;">DUELL EINSTELLUNGEN</h2>

      <div style="margin-bottom:18px;">
        <div style="color:rgba(255,255,255,.45);font-size:.75rem;font-weight:900;letter-spacing:.12em;text-transform:uppercase;margin-bottom:9px;">Waffe</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <button onclick="duelFixSetWeapon('lg')" style="${cssButton(FIX.weapon === 'lg')}">
            <div style="font-size:1.35rem;margin-bottom:4px;">🌬️ Luftgewehr</div>
            <div style="font-size:.75rem;color:rgba(255,255,255,.55);font-weight:600;">10 Meter</div>
          </button>
          <button onclick="duelFixSetWeapon('kk')" style="${cssButton(FIX.weapon === 'kk')}">
            <div style="font-size:1.35rem;margin-bottom:4px;">🎯 Kleinkaliber</div>
            <div style="font-size:.75rem;color:rgba(255,255,255,.55);font-weight:600;">50 / 100 Meter</div>
          </button>
        </div>
      </div>

      <div style="margin-bottom:18px;">
        <div style="color:rgba(255,255,255,.45);font-size:.75rem;font-weight:900;letter-spacing:.12em;text-transform:uppercase;margin-bottom:9px;">Disziplin</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          ${availableDisciplines.map(([key, value]) => `
            <button onclick="duelFixSetDiscipline('${key}')" style="${cssButton(FIX.discipline === key)}">
              <div style="font-size:1rem;margin-bottom:4px;">${value.label}</div>
              <div style="font-size:.72rem;color:rgba(255,255,255,.55);font-weight:600;">${value.desc}</div>
            </button>
          `).join('')}
        </div>
      </div>

      <div style="margin-bottom:20px;">
        <div style="color:rgba(255,255,255,.45);font-size:.75rem;font-weight:900;letter-spacing:.12em;text-transform:uppercase;margin-bottom:9px;">Schwierigkeit</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          ${Object.entries(DIFFICULTIES).map(([key, value]) => `
            <button onclick="duelFixSetDifficulty('${key}')" style="${cssButton(FIX.difficulty === key)}">
              <div style="font-size:.98rem;margin-bottom:4px;">${value.label}</div>
              <div style="font-size:.72rem;color:rgba(255,255,255,.55);font-weight:600;">${value.desc}</div>
            </button>
          `).join('')}
        </div>
      </div>

      <div style="border:1px solid rgba(122,176,48,.22);background:rgba(122,176,48,.08);border-radius:18px;padding:14px 16px;margin-bottom:18px;color:rgba(255,255,255,.76);font-size:.88rem;line-height:1.45;">
        <b style="color:#fff;">Aktiv:</b> ${disc.label} · ${difficulty.label} · ${disc.shots} Schuss
      </div>

      <button onclick="duelFixStart()" style="width:100%;background:linear-gradient(135deg,#00c3ff 0%,#7ab030 100%);border:0;border-radius:22px;padding:18px 20px;color:#061006;font-size:1.15rem;font-weight:950;letter-spacing:.18em;box-shadow:0 10px 35px rgba(122,176,48,.35);">
        🎯 DUELL STARTEN
      </button>
    `;

    syncGlobalState();
    fixLayout();
  }

  function openFallback() {
    const overlay = byId('duelSetupSheetOverlay');
    const sheet = byId('duelSetupSheet');
    const modeSelection = byId('gameModeSelection');
    const settings = byId('duelSettingsContent');

    if (!overlay || !sheet) {
      console.error('[DuelFix] Overlay oder Sheet fehlt', { overlay: !!overlay, sheet: !!sheet });
      return;
    }

    if (modeSelection) modeSelection.style.display = 'block';
    if (settings) settings.style.display = 'none';

    overlay.style.display = 'block';
    overlay.style.opacity = '1';
    sheet.style.bottom = '0';
    document.body.style.overflow = 'hidden';
    fixLayout();
  }

  window.openDuelSetup = function openDuelSetup() {
    fixLayout();

    if (typeof originalOpenDuelSetup === 'function') {
      try {
        originalOpenDuelSetup.apply(this, arguments);
      } catch (e) {
        console.warn('[DuelFix] Original openDuelSetup defekt, Fallback aktiv:', e);
        openFallback();
      }
    } else {
      openFallback();
    }

    setTimeout(fixLayout, 50);
  };

  window.closeDuelSetup = function closeDuelSetup(event) {
    if (typeof originalCloseDuelSetup === 'function') {
      try {
        originalCloseDuelSetup.apply(this, arguments);
        return;
      } catch (e) {
        console.warn('[DuelFix] Original closeDuelSetup defekt, Fallback aktiv:', e);
      }
    }

    const overlay = byId('duelSetupSheetOverlay');
    const sheet = byId('duelSetupSheet');
    if (!overlay || !sheet) return;
    if (event && event.target !== overlay) return;

    overlay.style.opacity = '0';
    sheet.style.bottom = '-100%';
    document.body.style.overflow = '';
    setTimeout(function () { overlay.style.display = 'none'; }, 350);
  };

  window.showGameModeSelection = function showGameModeSelection() {
    const modeSelection = byId('gameModeSelection');
    const settings = byId('duelSettingsContent');
    if (modeSelection) modeSelection.style.display = 'block';
    if (settings) settings.style.display = 'none';
    fixLayout();
  };

  window.selectGameMode = function selectGameMode(mode) {
    renderSettings(mode || 'bot');
  };

  window.duelFixSetWeapon = function duelFixSetWeapon(weapon) {
    FIX.weapon = weapon === 'kk' ? 'kk' : 'lg';
    FIX.discipline = FIX.weapon === 'lg' ? 'lg40' : 'kk50';
    renderSettings(FIX.mode);
  };

  window.duelFixSetDiscipline = function duelFixSetDiscipline(discipline) {
    if (DISCIPLINES[discipline]) {
      FIX.discipline = discipline;
      FIX.weapon = DISCIPLINES[discipline].weapon;
    }
    renderSettings(FIX.mode);
  };

  window.duelFixSetDifficulty = function duelFixSetDifficulty(difficulty) {
    FIX.difficulty = DIFFICULTIES[difficulty] ? difficulty : 'easy';
    renderSettings(FIX.mode);
  };

  window.duelFixStart = function duelFixStart() {
    syncGlobalState();

    const candidates = [
      'startBattle',
      'startDuel',
      'beginBattle',
      'beginDuel',
      'startMatch',
      'beginMatch',
      'startGame',
      'startBotBattle',
      'startBotDuel'
    ];

    for (const name of candidates) {
      if (typeof window[name] === 'function') {
        console.log('[DuelFix] Starte über', name, JSON.stringify(FIX));
        try {
          window[name]();
          return;
        } catch (e) {
          console.error('[DuelFix] Startfunktion fehlgeschlagen:', name, e);
        }
      }
    }

    const startLikeButton = Array.from(document.querySelectorAll('button')).find(function (btn) {
      return btn !== document.activeElement && /start|duell/i.test(btn.textContent || '') && btn.onclick;
    });

    if (startLikeButton) {
      try {
        startLikeButton.click();
        return;
      } catch (e) {
        console.error('[DuelFix] Fallback-Button konnte nicht geklickt werden:', e);
      }
    }

    alert('Duell-Einstellungen sind gesetzt, aber keine Startfunktion wurde gefunden. Nächster Fix: Startfunktion in app.js anbinden.');
  };

  window.addEventListener('resize', fixLayout);
  window.addEventListener('orientationchange', function () {
    setTimeout(fixLayout, 200);
  });
})();
