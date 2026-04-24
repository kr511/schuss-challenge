/* Duel Setup Hotfix */
(function () {
  'use strict';

  function byId(id) { return document.getElementById(id); }

  var originalOpen = window.openDuelSetup;
  var originalClose = window.closeDuelSetup;
  var state = { mode: 'bot', weapon: 'lg', discipline: 'lg40', difficulty: 'easy' };

  var disciplines = {
    lg40: { weapon: 'lg', label: 'LG 40', shots: 40, dist: '10', desc: '40 Schuss · 10 m' },
    lg60: { weapon: 'lg', label: 'LG 60', shots: 60, dist: '10', desc: '60 Schuss · 10 m' },
    kk50: { weapon: 'kk', label: 'KK 50m', shots: 60, dist: '50', desc: '60 Schuss · 50 m' },
    kk100: { weapon: 'kk', label: 'KK 100m', shots: 60, dist: '100', desc: '60 Schuss · 100 m' },
    kk3x20: { weapon: 'kk', label: 'KK 3×20', shots: 60, dist: '50', desc: '3 × 20 Schuss' }
  };

  var difficulties = {
    easy: { label: '😊 Einfach', desc: 'Guter Einstieg' },
    real: { label: '🎯 Mittel', desc: 'Solider Gegner' },
    hard: { label: '💪 Elite', desc: 'Sehr stark' },
    elite: { label: '💫 Profi', desc: 'Extrem schwer' }
  };

  function btnCss(active) {
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

  function fixLayout() {
    document.documentElement.style.overflowX = 'hidden';
    document.body.style.overflowX = 'hidden';
    document.body.style.width = '100%';

    var overlay = byId('duelSetupSheetOverlay');
    var sheet = byId('duelSetupSheet');
    var startButton = byId('btnOpenDuelSetup');

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

  function syncState() {
    var disc = disciplines[state.discipline] || disciplines.lg40;
    if (typeof window.G !== 'undefined') {
      window.G.weapon = disc.weapon;
      window.G.discipline = state.discipline;
      window.G.diff = state.difficulty;
      window.G.dist = disc.dist;
      window.G.shots = disc.shots;
      window.G.maxShots = disc.shots;
      window.G.playerShotsLeft = disc.shots;
      window.G.botShotsLeft = disc.shots;
      window.G.is3x20 = state.discipline === 'kk3x20';
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
        StorageManager.setRaw('last_discipline', state.discipline);
        StorageManager.setRaw('last_diff', state.difficulty);
      }
    } catch (e) {
      console.warn('[DuelFix] Storage sync failed', e);
    }
  }

  function cardButton(action, key, title, sub, active) {
    return '<button type="button" data-action="' + action + '" data-key="' + key + '" style="' + btnCss(active) + '">' +
      '<div style="font-size:1rem;margin-bottom:4px">' + title + '</div>' +
      '<div style="font-size:.72rem;color:rgba(255,255,255,.55);font-weight:600">' + sub + '</div>' +
      '</button>';
  }

  function bindSettingsEvents(settings) {
    Array.from(settings.querySelectorAll('[data-action]')).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var action = btn.getAttribute('data-action');
        var key = btn.getAttribute('data-key');
        if (action === 'back') window.showGameModeSelection();
        if (action === 'weapon') window.duelFixSetWeapon(key);
        if (action === 'discipline') window.duelFixSetDiscipline(key);
        if (action === 'difficulty') window.duelFixSetDifficulty(key);
        if (action === 'start') window.duelFixStart();
      });
    });
  }

  function renderSettings(mode) {
    state.mode = mode || state.mode || 'bot';
    if (state.mode === 'multiplayer') {
      state.mode = 'bot';
      alert('Multiplayer ist noch nicht stabil. Ich öffne den Bot-Modus.');
    }

    var modeSelection = byId('gameModeSelection');
    var settings = byId('duelSettingsContent');
    if (modeSelection) modeSelection.style.display = 'none';
    if (!settings) return;

    if (!disciplines[state.discipline] || disciplines[state.discipline].weapon !== state.weapon) {
      state.discipline = state.weapon === 'lg' ? 'lg40' : 'kk50';
    }

    var disc = disciplines[state.discipline];
    var diff = difficulties[state.difficulty] || difficulties.easy;
    var discButtons = Object.keys(disciplines)
      .filter(function (key) { return disciplines[key].weapon === state.weapon; })
      .map(function (key) {
        var d = disciplines[key];
        return cardButton('discipline', key, d.label, d.desc, state.discipline === key);
      }).join('');

    var diffButtons = Object.keys(difficulties).map(function (key) {
      var d = difficulties[key];
      return cardButton('difficulty', key, d.label, d.desc, state.difficulty === key);
    }).join('');

    settings.style.display = 'block';
    settings.style.opacity = '1';
    settings.style.visibility = 'visible';
    settings.innerHTML =
      '<button type="button" data-action="back" data-key="" style="background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.15);color:rgba(255,255,255,.72);border-radius:14px;padding:12px 16px;margin-bottom:22px;font-weight:800;font-size:1rem">← Zurück zur Modus-Auswahl</button>' +
      '<h2 style="color:#fff;margin:0 0 18px 0;font-size:1.55rem;font-weight:900;letter-spacing:.03em">DUELL EINSTELLUNGEN</h2>' +
      '<div style="margin-bottom:18px"><div style="color:rgba(255,255,255,.45);font-size:.75rem;font-weight:900;letter-spacing:.12em;text-transform:uppercase;margin-bottom:9px">Waffe</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">' +
        cardButton('weapon', 'lg', '🌬️ Luftgewehr', '10 Meter', state.weapon === 'lg') +
        cardButton('weapon', 'kk', '🎯 Kleinkaliber', '50 / 100 Meter', state.weapon === 'kk') +
      '</div></div>' +
      '<div style="margin-bottom:18px"><div style="color:rgba(255,255,255,.45);font-size:.75rem;font-weight:900;letter-spacing:.12em;text-transform:uppercase;margin-bottom:9px">Disziplin</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">' + discButtons + '</div></div>' +
      '<div style="margin-bottom:20px"><div style="color:rgba(255,255,255,.45);font-size:.75rem;font-weight:900;letter-spacing:.12em;text-transform:uppercase;margin-bottom:9px">Schwierigkeit</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">' + diffButtons + '</div></div>' +
      '<div style="border:1px solid rgba(122,176,48,.22);background:rgba(122,176,48,.08);border-radius:18px;padding:14px 16px;margin-bottom:18px;color:rgba(255,255,255,.76);font-size:.88rem;line-height:1.45"><b style="color:#fff">Aktiv:</b> ' + disc.label + ' · ' + diff.label + ' · ' + disc.shots + ' Schuss</div>' +
      '<button type="button" data-action="start" data-key="" style="width:100%;background:linear-gradient(135deg,#00c3ff 0%,#7ab030 100%);border:0;border-radius:22px;padding:18px 20px;color:#061006;font-size:1.15rem;font-weight:950;letter-spacing:.18em;box-shadow:0 10px 35px rgba(122,176,48,.35)">🎯 DUELL STARTEN</button>';

    bindSettingsEvents(settings);
    syncState();
    fixLayout();
  }

  function openFallback() {
    var overlay = byId('duelSetupSheetOverlay');
    var sheet = byId('duelSetupSheet');
    var modeSelection = byId('gameModeSelection');
    var settings = byId('duelSettingsContent');
    if (!overlay || !sheet) return;
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
    if (typeof originalOpen === 'function') {
      try { originalOpen.apply(this, arguments); }
      catch (e) { console.warn('[DuelFix] Original open failed, fallback active', e); openFallback(); }
    } else {
      openFallback();
    }
    setTimeout(fixLayout, 50);
  };

  window.closeDuelSetup = function closeDuelSetup(event) {
    if (typeof originalClose === 'function') {
      try { originalClose.apply(this, arguments); return; }
      catch (e) { console.warn('[DuelFix] Original close failed, fallback active', e); }
    }
    var overlay = byId('duelSetupSheetOverlay');
    var sheet = byId('duelSetupSheet');
    if (!overlay || !sheet) return;
    if (event && event.target !== overlay) return;
    overlay.style.opacity = '0';
    sheet.style.bottom = '-100%';
    document.body.style.overflow = '';
    setTimeout(function () { overlay.style.display = 'none'; }, 350);
  };

  window.showGameModeSelection = function showGameModeSelection() {
    var modeSelection = byId('gameModeSelection');
    var settings = byId('duelSettingsContent');
    if (modeSelection) modeSelection.style.display = 'block';
    if (settings) settings.style.display = 'none';
    fixLayout();
  };

  window.selectGameMode = function selectGameMode(mode) { renderSettings(mode || 'bot'); };
  window.duelFixSetWeapon = function duelFixSetWeapon(weapon) { state.weapon = weapon === 'kk' ? 'kk' : 'lg'; state.discipline = state.weapon === 'lg' ? 'lg40' : 'kk50'; renderSettings(state.mode); };
  window.duelFixSetDiscipline = function duelFixSetDiscipline(discipline) { if (disciplines[discipline]) { state.discipline = discipline; state.weapon = disciplines[discipline].weapon; } renderSettings(state.mode); };
  window.duelFixSetDifficulty = function duelFixSetDifficulty(difficulty) { state.difficulty = difficulties[difficulty] ? difficulty : 'easy'; renderSettings(state.mode); };

  window.duelFixStart = function duelFixStart() {
    syncState();
    var candidates = ['startBattle', 'startDuel', 'beginBattle', 'beginDuel', 'startMatch', 'beginMatch', 'startGame', 'startBotBattle', 'startBotDuel'];
    for (var i = 0; i < candidates.length; i++) {
      var name = candidates[i];
      if (typeof window[name] === 'function') {
        try { window[name](); return; }
        catch (e) { console.error('[DuelFix] Start failed:', name, e); }
      }
    }
    var startButton = Array.from(document.querySelectorAll('button')).find(function (btn) {
      return btn !== document.activeElement && /start|duell/i.test(btn.textContent || '') && btn.onclick;
    });
    if (startButton) {
      try { startButton.click(); return; }
      catch (e) { console.error('[DuelFix] Fallback button failed', e); }
    }
    alert('Duell-Einstellungen sind gesetzt, aber keine Startfunktion wurde gefunden.');
  };

  window.addEventListener('resize', fixLayout);
  window.addEventListener('orientationchange', function () { setTimeout(fixLayout, 200); });
})();
