/* ─── AUDIO ENGINE (Procedural Web Audio) ── */
const Sfx = {
  ctx: null,
  muted: false,
  init() {
    if (!this.ctx) {
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContext();
      } catch (e) { console.warn('Web Audio API not supported'); }
    } else if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  },
  play(type, data = null) {
    if (this.muted || !this.ctx) return;
    const t = this.ctx.currentTime;
    const g = this.ctx.createGain();
    g.connect(this.ctx.destination);

    const osc = this.ctx.createOscillator();
    osc.connect(g);

    if (type === 'click') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, t);
      osc.frequency.exponentialRampToValueAtTime(300, t + 0.05);
      g.gain.setValueAtTime(0.7, t);
      g.gain.exponentialRampToValueAtTime(0.01, t + 0.05);
      osc.start(t);
      osc.stop(t + 0.05);
    }
    else if (type === 'start') { // Tiefer Swoosh für Duell Start
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(100, t);
      osc.frequency.exponentialRampToValueAtTime(350, t + 0.4);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.8, t + 0.1);
      g.gain.exponentialRampToValueAtTime(0.01, t + 0.4);
      osc.start(t);
      osc.stop(t + 0.4);
    }
    else if (type === 'shootLG') { // Luftdruck Zischen + Knall
      const noise = this.ctx.createBufferSource();
      const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.2, this.ctx.sampleRate);
      const o = buffer.getChannelData(0);
      for (let i = 0; i < buffer.length; i++) o[i] = (Math.random() * 2 - 1) * 0.5;
      noise.buffer = buffer;
      const noiseFilter = this.ctx.createBiquadFilter();
      noiseFilter.type = 'highpass';
      noiseFilter.frequency.value = 1000;

      noise.connect(noiseFilter);
      noiseFilter.connect(g);

      osc.type = 'square';
      osc.frequency.setValueAtTime(150, t);
      osc.frequency.exponentialRampToValueAtTime(40, t + 0.1);

      g.gain.setValueAtTime(0.9, t);
      g.gain.exponentialRampToValueAtTime(0.01, t + 0.15);

      noise.start(t);
      osc.start(t);
      osc.stop(t + 0.15);
    }
    else if (type === 'shootKK') { // KK Scharfer Knall
      const noise = this.ctx.createBufferSource();
      const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.3, this.ctx.sampleRate);
      const o = buffer.getChannelData(0);
      for (let i = 0; i < buffer.length; i++) o[i] = (Math.random() * 2 - 1) * 0.8;
      noise.buffer = buffer;

      const noiseFilter = this.ctx.createBiquadFilter();
      noiseFilter.type = 'lowpass';
      noiseFilter.frequency.setValueAtTime(4000, t);
      noiseFilter.frequency.exponentialRampToValueAtTime(500, t + 0.2);

      noise.connect(noiseFilter);
      noiseFilter.connect(g);

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(200, t);
      osc.frequency.exponentialRampToValueAtTime(50, t + 0.15);

      g.gain.setValueAtTime(1, t);
      g.gain.exponentialRampToValueAtTime(0.01, t + 0.25);

      noise.start(t);
      osc.start(t);
      osc.stop(t + 0.25);
    }
    else if (type === 'hit') {
      // data is score (0 to 10.9)
      const pts = data || 0;
      osc.type = 'sine';

      if (pts >= 10.0) {
        osc.frequency.setValueAtTime(1200, t); // Helles Ding
        osc.frequency.exponentialRampToValueAtTime(800, t + 0.3);
        g.gain.setValueAtTime(0.6, t);
        g.gain.exponentialRampToValueAtTime(0.01, t + 0.4);
      } else if (pts >= 9.0) {
        osc.frequency.setValueAtTime(800, t);
        osc.frequency.exponentialRampToValueAtTime(600, t + 0.2);
        g.gain.setValueAtTime(0.5, t);
        g.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
      } else if (pts >= 6.0) {
        osc.frequency.setValueAtTime(400, t);
        g.gain.setValueAtTime(0.4, t);
        g.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
      } else {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(150, t); // Dumpferes Tocken
        g.gain.setValueAtTime(0.3, t);
        g.gain.linearRampToValueAtTime(0.01, t + 0.1);
      }
      osc.start(t);
      osc.stop(t + 0.4);
    }
    else if (type === 'win') {
      osc.disconnect(); // BUG-FIX: Haupt-Oscillator nicht benötigt, vom Graph trennen
      const notes = [440, 554, 659, 880]; // A Major Arpeggio
      g.gain.setValueAtTime(0.5, t);
      notes.forEach((freq, i) => {
        const o = this.ctx.createOscillator();
        o.type = 'sine';
        o.frequency.value = freq;
        o.connect(g);
        o.start(t + i * 0.1);
        o.stop(t + i * 0.1 + 0.3);
      });
      g.gain.linearRampToValueAtTime(0.01, t + 0.6);
    }
    else if (type === 'lose') {
      osc.disconnect(); // BUG-FIX: Haupt-Oscillator nicht benötigt, vom Graph trennen
      const notes = [300, 250, 200]; // Descending
      g.gain.setValueAtTime(0.5, t);
      notes.forEach((freq, i) => {
        const o = this.ctx.createOscillator();
        o.type = 'triangle';
        o.frequency.value = freq;
        o.connect(g);
        o.start(t + i * 0.2);
        o.stop(t + i * 0.2 + 0.4);
      });
      g.gain.linearRampToValueAtTime(0.01, t + 0.8);
    }
    else if (type === 'draw') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(300, t);
      osc.frequency.setValueAtTime(400, t + 0.2);
      g.gain.setValueAtTime(0.3, t);
      g.gain.linearRampToValueAtTime(0.01, t + 0.4);
      osc.start(t);
      osc.stop(t + 0.4);
    }
  }
};

function toggleMute() {
  Sfx.init();
  Sfx.muted = !Sfx.muted;
  document.getElementById('muteBtn').textContent = Sfx.muted ? '🔇' : '🔊';
  if (!Sfx.muted) Sfx.play('click');
}

/* ─── DATA MIGRATION v3 ─── */
// Alte Daten-Keys bereinigen ohne Username zu löschen
// v3: neue Schwierigkeitsnamen (Elite/Profi) + KK-Zehntel-Fix
if (!localStorage.getItem('sd_reset_v3')) {
  const keepName = StorageManager.getRaw('username');
  const keepXP = StorageManager.getRaw('xp');
  StorageManager.clearAll(['username', 'xp']);
  StorageManager.setRaw('reset_v3', 'true');
  if (keepName) StorageManager.setRaw('username', keepName);
  if (keepXP) StorageManager.setRaw('xp', keepXP);
}

/* ─── STATE ──────────────────────────────── */
const G = {
  dist: '10', diff: 'easy',
  weapon: 'lg',          // 'lg' | 'kk'
  username: StorageManager.getRaw('username', ''),
  lbScope: StorageManager.getRaw('lb_scope', 'global'),
  lbPeriod: StorageManager.getRaw('lb_period', 'alltime'),
  discipline: 'lg40',    // 'lg40' | 'lg60' | 'kk50' | 'kk100' | 'kk3x20'
  shots: 40,             // Schussanzahl (aus Disziplin oder manuell)
  burst: false,          // 5er-Salve Modus
  targetShots: [],       // Sichtbare Treffer auf der Scheibe
  botShots: [], botPlan: null, botTotal: 0, botTotalInt: 0, _botTotalTenths: 0,
  playerTotal: 0, playerTotalInt: 0, _playerTotalTenths: 0,
  playerShotsLeft: 40, botShotsLeft: 40, maxShots: 40,
  xp: 0,                 // XP-Stand
  streak: 0,             // Aktueller Streak (für Firebase)
  // 3×20 position tracking
  is3x20: false,
  positions: [],         // ['Kniend','Liegend','Stehend']
  posIcons: [],          // emoji per position
  posIdx: 0,             // aktueller Positions-Index
  posShots: 0,           // Schüsse in aktueller Position
  perPos: 20,            // Schüsse pro Position
  posResults: [],        // Summe pro Position [{total, int, shots}]
  // Timer & Bot-Auto-Shoot
  _botInterval: null,    // setTimeout handle für Auto-Bot
  _timerInterval: null,  // setInterval handle für Countdown
  _timerSecsLeft: 0,     // verbleibende Sekunden
  _botStartTimeout: null, // setTimeout für verzögerter Bot-Start nach Probe
  dnf: false,            // Did Not Finish (Zeit abgelaufen)
  playerShots: [],       // Spieler-Treffer für Analytics
  currentDetectedShots: [], // NEU: Letzte erkannte Schüsse aus Foto
  _gameStartTime: 0,     // Für Spieldauer-Berechnung
  _lastPlayerShotAt: 0,  // Zeitstempel des letzten Spieler-Schusses
  // Probezeit
  probeActive: false,    // Probezeit ist aktiv
  probeSecsLeft: 0,      // Verbleibende Sekunden in Probezeit
  botStarted: false,     // Bot hat bereits zu schießen angefangen
  // 3x20 Übergangsphasen (Positionswechsel / Umbau / Probe)
  transitionSecsLeft: 0, // verbleibende Sekunden in Übergangsphase
  transitionLabel: '',   // Label für aktuelle Übergangsphase
};

// Shot Log Auto-Scroll mit Debounce (verhindert Race Conditions bei schnellen Schüssen)
// BUG-FIX #4: Double rAF sorgt dafür dass DOM-Layout aktualisiert wird bevor scrollHeight gelesen wird
let _shotLogScrollPending = false;
function autoScrollShotLog() {
  if (_shotLogScrollPending) return;
  _shotLogScrollPending = true;
  // Erster rAF: Browser beginnt Layout-Update
  requestAnimationFrame(() => {
    // Zweiter rAF: scrollHeight ist jetzt aktuell
    requestAnimationFrame(() => {
      if (DOM.shotLogWrap) {
        DOM.shotLogWrap.scrollTo({
          top: DOM.shotLogWrap.scrollHeight,
          behavior: 'smooth'
        });
      }
      // Debounce verkürzt auf 50ms (ausreichend für Burst-Modus)
      setTimeout(() => { _shotLogScrollPending = false; }, 50);
    });
  });
}

/* ─── DISZIPLIN CONFIG ───────────────────── */
const DISC = {
  // Luftgewehr
  lg40: {
    name: 'LG 40', weapon: 'lg', shots: 40, dist: '10', is3x20: false,
    timeMins: 50, desc: '40 Schuss · 50 Min', icon: '🎯',
    info: '<b>LG 40</b> – Klassische Luftgewehr-Disziplin. 40 Schuss auf 10 m. Zeitlimit: 50 Minuten.'
  },
  lg60: {
    name: 'LG 60', weapon: 'lg', shots: 60, dist: '10', is3x20: false,
    timeMins: 70, desc: '60 Schuss · 70 Min', icon: '⭐',
    info: '<b>LG 60</b> – Erweiterte Luftgewehr-Disziplin. 60 Schuss auf 10 m. Zeitlimit: 70 Minuten.'
  },
  // KK
  kk50: {
    name: 'KK 50m', weapon: 'kk', shots: 60, dist: '50', is3x20: false,
    timeMins: 50, desc: '60 Schuss · 50 Min', icon: '🎯',
    info: '<b>KK 60 / 50m</b> – 60 Schuss KK auf 50 Meter. Zeitlimit: 50 Minuten.'
  },
  kk100: {
    name: 'KK 100m', weapon: 'kk', shots: 60, dist: '100', is3x20: false,
    timeMins: 70, desc: '60 Schuss · 70 Min', icon: '🎯',
    info: '<b>KK 60 / 100m</b> – 60 Schuss KK auf 100 Meter. Extreme Präzision. Zeitlimit: 70 Minuten.'
  },
  kk3x20: {
    name: 'KK 3×20', weapon: 'kk', shots: 60, dist: '50', is3x20: true,
    timeMins: 105, desc: '3 x 20 Schuss · 105 Min', icon: '🏆',
    positions: ['Kniend', 'Liegend', 'Stehend'], posIcons: ['🦵', '🛏️', '🧍'],
    info: '<b>KK 3×20</b> – Je 20 Schuss kniend, liegend und stehend mit KK auf 50 m. Zeitlimit: 105 Minuten inkl. Positionswechsel.'
  },
};

// Disziplinen pro Waffe
const WEAPON_DISCS = {
  lg: ['lg40', 'lg60'],
  kk: ['kk50', 'kk100', 'kk3x20'],
};
const LEADERBOARD_DISCIPLINE_ROOT = 'leaderboard_disciplines_v1';
const ACCOUNT_LINK_ROOT = 'account_links_v1';
const SEASON_ROOT = 'seasons_v1';
const ADMIN_ACCOUNTS_ROOT = 'admin_accounts_v1';

function normalizeLeaderboardScope(scope) {
  if (scope === 'global') return 'global';
  return Object.prototype.hasOwnProperty.call(DISC, scope) ? scope : 'global';
}

function normalizeLeaderboardPeriod(period) {
  return period === 'season' ? 'season' : 'alltime';
}

function getActiveLeaderboardScope() {
  const nextScope = normalizeLeaderboardScope(G.lbScope);
  if (nextScope !== G.lbScope) G.lbScope = nextScope;
  return nextScope;
}

function getActiveLeaderboardPeriod() {
  const nextPeriod = normalizeLeaderboardPeriod(G.lbPeriod);
  if (nextPeriod !== G.lbPeriod) G.lbPeriod = nextPeriod;
  return nextPeriod;
}

function getLeaderboardScopeLabel(scope = getActiveLeaderboardScope()) {
  return scope === 'global' ? 'Global' : (DISC[scope]?.name || scope);
}

function getCurrentSeasonInfo(now = Date.now()) {
  const date = new Date(now);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const seasonId = `${year}-${month}`;
  const startAt = new Date(year, date.getMonth(), 1).getTime();
  const endAt = new Date(year, date.getMonth() + 1, 1).getTime() - 1;
  const label = date.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
  return { id: seasonId, label, startAt, endAt };
}

function getCurrentSeasonId(now = Date.now()) {
  return getCurrentSeasonInfo(now).id;
}

/* ─── CONFIG ─────────────────────────────── */
const DIST_INFO = {
  lg: {
    '10': '<b>10 Meter</b> – Luftgewehr-Standarddistanz. Höchste Präzision gefordert.'
  },
  kk: {
    '50': '<b>50 Meter</b> – KK-Standarddistanz. Klassische Königsdisziplin!',
    '100': '<b>100 Meter</b> – Extreme KK-Distanz. Maximale Konzentration und Technik gefordert!'
  }
};

// Lebendige Dist-Info: wird von Disziplin überschrieben wenn vorhanden
function getDistInfo() { return DIST_INFO[G.weapon]?.[G.dist] || ''; }

const SIGMA = { '10': 18, '50': 46, '100': 72 };
const DIFF = {
  easy: {
    mult: 0.33, noise: 5, lbl: '😊 EINFACH', cls: 'easy',
    info: '<b>Einfach</b> – Solider Einstieg. ~360–375 Pkt. Schaffbar mit Konzentration!'
  },
  real: {
    mult: 0.30, noise: 3.0, lbl: '🎯 MITTEL', cls: 'real',
    info: '<b>Mittel</b> – Fast nur 9er und 10er. ~380–390 Pkt. Kein Spaziergang!'
  },
  hard: {
    mult: 0.28, noise: 0.5, lbl: '💪 ELITE', cls: 'hard',
    info: '<b>Elite</b> – Trifft sehr präzise. ~395–405 Pkt. Kaum zu schlagen!'
  },
  elite: {
    mult: 0.25, noise: 0.08, lbl: '💫 PROFI', cls: 'elite',
    info: '<b>Profi</b> – Immer ≥410 Zehntel. Extrem präzise. Viel Glück!'
  }
};

// ─── TÄGLICHE LOGIN-BELohnungen ─────────────────────
function getLocalDayStart(timestamp) {
  const date = new Date(timestamp);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function initDailyLoginRewards() {
  const rawLastVisit = Number(localStorage.getItem('sd_last_visit') || '0');
  const lastVisit = Number.isFinite(rawLastVisit) ? rawLastVisit : 0;
  const today = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;

  // Wenn kein letzter Besuch gespeichert, heute als ersten Besuch markieren
  if (lastVisit === 0) {
    localStorage.setItem('sd_last_visit', today.toString());
    localStorage.setItem('sd_login_streak', '1');
    awardLoginReward(1);
    return;
  }

  // Prüfen, ob seit letztem Besuch ein Tag vergangen ist
  const daysDiff = Math.round((getLocalDayStart(today) - getLocalDayStart(lastVisit)) / oneDay);

  if (daysDiff <= 0) {
    // Heute schon belohnt bekommen
    return;
  } else if (daysDiff === 1) {
    // Aufeinanderfolgender Tag
    const currentStreak = parseInt(localStorage.getItem('sd_login_streak') || '0');
    const newStreak = currentStreak + 1;
    localStorage.setItem('sd_login_streak', newStreak.toString());
    localStorage.setItem('sd_last_visit', today.toString());
    awardLoginReward(newStreak);
  } else {
    // Streak unterbrochen (mehr als 1 Tag Lücke)
    localStorage.setItem('sd_last_visit', today.toString());
    localStorage.setItem('sd_login_streak', '1');
    awardLoginReward(1); // Belohnung für den Neustart
  }
}

function awardLoginReward(streak) {
  let rewardXP = streak > 1 ? 5 : 0; // Kein XP am 1. Tag, 5 XP als Basis danach
  let hasMysteryBonus = false;

  // Streak-Boni (nur der höchste Bonus zählt)
  if (streak >= 30) rewardXP += 50;      // Monatsbonus
  else if (streak >= 14) rewardXP += 20; // Zweiwochenbonus
  else if (streak >= 7) rewardXP += 10;  // Wochenbonus

  // Zufällige Mystery-Belohnung alle 10 Tage
  if (streak % 10 === 0 && Math.random() < 0.3) {
    rewardXP += 25; // Mystery-Bonus
    hasMysteryBonus = true;
  }

  const gained = awardFlatXP(rewardXP);
  if (gained <= 0) return;

  const labelParts = [];
  if (streak > 1) labelParts.push(`${streak}-Tag-Streak`);
  if (hasMysteryBonus) labelParts.push('Mystery-Bonus');

  const suffix = labelParts.length ? ` (${labelParts.join(' · ')})` : '';
  showLoginBonus(`+${gained} XP${suffix}`);
}

function showLoginBonus(message) {
  // Erstelle eine temporäre Benachrichtigung
  const bonusEl = document.createElement('div');
  bonusEl.className = 'login-bonus-popup';
  bonusEl.innerHTML = `
        <div class="login-bonus-content">
          <div class="login-bonus-icon">🎁</div>
          <div class="login-bonus-text">${message}</div>
        </div>
      `;

  document.body.appendChild(bonusEl);

  // Animation: Einblenden, warten, Ausblenden
  setTimeout(() => {
    bonusEl.style.opacity = '1';
    bonusEl.style.transform = 'translateY(0)';
  }, 10);

  setTimeout(() => {
    bonusEl.style.opacity = '0';
    bonusEl.style.transform = 'translateY(-20px)';
  }, 2500);

  setTimeout(() => {
    if (bonusEl.parentElement) {
      bonusEl.parentElement.removeChild(bonusEl);
    }
  }, 3000);
}

// Disziplinspezifische Schwierigkeits-Infos
const DIFF_INFO_BY_DISC = {
  // LG 60 hat höhere Punktwerte (60 Schuss, Zehntel)
  lg60: {
    easy: '<b>Einfach</b> – Solider Einstieg. ~575–585 Pkt. Schaffbar mit Konzentration!',
    real: '<b>Mittel</b> – Fast nur 9er und 10er. ~590–605 Pkt. Kein Spaziergang!',
    hard: '<b>Elite</b> – Trifft sehr präzise. ~610–618 Pkt. Kaum zu schlagen!',
    elite: '<b>Profi</b> – Schießt immer ≥620 Pkt. Extrem präzise. Viel Glück!'
  },
  // KK 50m / 100m: 60 Schuss Liegend mit Zehntel-Wertung
  kk50: {
    easy: '<b>Einfach</b> – Solider Einstieg. ~580–588 Zehntel. Schaffbar mit Konzentration!',
    real: '<b>Mittel</b> – Starke Präzision. ~590–600 Zehntel. Kein Spaziergang!',
    hard: '<b>Elite</b> – Trifft sehr präzise. ~602–610 Zehntel. Kaum zu schlagen!',
    elite: '<b>Profi</b> – Schießt ≥612 Zehntel. Extrem präzise. Viel Glück!'
  },
  kk100: {
    easy: '<b>Einfach</b> – Solider Einstieg. ~580–588 Zehntel. Schaffbar mit Konzentration!',
    real: '<b>Mittel</b> – Starke Präzision. ~590–600 Zehntel. Kein Spaziergang!',
    hard: '<b>Elite</b> – Trifft sehr präzise. ~602–610 Zehntel. Kaum zu schlagen!',
    elite: '<b>Profi</b> – Schießt ≥612 Zehntel. Extrem präzise. Viel Glück!'
  },
  // KK 3×20: Gesamt 60 Schuss, nur ganze Zahlen
  kk3x20: {
    easy: '<b>Einfach</b> – Solider Einstieg. Gesamt ~530–542 Ringe. Schaffbar mit Konzentration!',
    real: '<b>Mittel</b> – Fast nur 9er und 10er. Gesamt ~544–555 Ringe. Kein Spaziergang!',
    hard: '<b>Elite</b> – Trifft sehr präzise. Gesamt ~557–565 Ringe. Kaum zu schlagen!',
    elite: '<b>Profi</b> – Gesamt ≥567 Ringe. Extrem präzise. Viel Glück!'
  }
};

// Hilfsfunktion zum Abrufen der disziplinspezifischen Schwierigkeits-Info
function getDiffInfo(diff) {
  if (typeof BattleBalance !== 'undefined') {
    const info = BattleBalance.getDifficultyInfo(G.discipline, diff);
    if (info) return info;
  }
  const discSpecificInfos = DIFF_INFO_BY_DISC[G.discipline];
  if (discSpecificInfos && discSpecificInfos[diff]) {
    return discSpecificInfos[diff];
  }
  return DIFF[diff]?.info || '';
}

/** KK 3×20: nur ganze Ringe, keine Zehntel in UI/Vergleich (KK 50/100m verhalten sich wie LG) */
function isKK3x20WholeRingsOnly() {
  return G.is3x20 && G.weapon === 'kk';
}

const WEAPON_CFG = {
  lg: {
    icon: '🌬️', name: 'Luftgewehr', badgeCls: 'lg', defaultDist: '10',
    allowedDists: ['10'],
    setupTag: (disc, dist) => `◆ LUFTGEWEHR · ${(DISC[disc]?.name || disc).toUpperCase()} · ${dist} METER ◆`
  },
  kk: {
    icon: '🎯', name: 'Kleinkaliber', badgeCls: 'kk', defaultDist: '50',
    allowedDists: ['50', '100'],
    setupTag: (disc, dist) => `◆ KLEINKALIBER · ${(DISC[disc]?.name || disc).toUpperCase()} · ${dist} METER ◆`
  }
};

/* ─── XP / RANKS ─────────────────────────── */
const XP_PER_WIN = { easy: 10, real: 20, hard: 40, elite: 75 };
const RANKS = [
  { name: 'Anfänger', min: 0, max: 99, icon: '🎯' },
  { name: 'Schütze', min: 100, max: 299, icon: '🔫' },
  { name: 'Fortgeschr.', min: 300, max: 599, icon: '⭐' },
  { name: 'Meister', min: 600, max: 999, icon: '🏅' },
  { name: 'Großmeister', min: 1000, max: 1999, icon: '🏆' },
  { name: 'Legende', min: 2000, max: Infinity, icon: '💫' }
];

function getRank(xp) {
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (xp >= RANKS[i].min) return { rank: RANKS[i], idx: i };
  }
  return { rank: RANKS[0], idx: 0 };
}

function loadXP() {
  G.xp = StorageManager.get('xp', 0) || 0;
}

function saveXP() {
  StorageManager.set('xp', G.xp);
  scheduleCloudSync('xp_changed');
}

function awardXP(diff) {
  const gained = XP_PER_WIN[diff] || 10;
  const { idx: oldIdx } = getRank(G.xp);
  G.xp += gained;
  saveXP();

  if (G.weapon) {
    const ws = loadWeaponStats(G.weapon);
    ws.xp = (ws.xp || 0) + gained;
    saveWeaponStats(G.weapon, ws);
  }

  updateSchuetzenpass();
  showXPPop(gained);

  // Daily Bonus erst beim 1. Duell-Abschluss prüfen
  if (typeof initDailyLoginRewards === 'function') initDailyLoginRewards();

  // Rank Check
  const { rank: newRank, idx: newIdx } = getRank(G.xp);
  if (newIdx > oldIdx) {
    showLevelUp(newRank);
  } else {
    if (typeof Sounds !== 'undefined') setTimeout(() => Sounds.xp(), 500);
  }

  // Auto-sync zu Firebase (mit null-check)
  if (fbReady && fbDb) pushProfileToFirebase();
  return gained;
}

function awardFlatXP(amount) {
  const gained = Math.max(0, Math.floor(Number(amount) || 0));
  if (gained <= 0) return 0;

  const { idx: oldIdx } = getRank(G.xp);
  G.xp += gained;
  saveXP();

  if (G.weapon) {
    const ws = loadWeaponStats(G.weapon);
    ws.xp = (ws.xp || 0) + gained;
    saveWeaponStats(G.weapon, ws);
  }

  updateSchuetzenpass();
  showXPPop(gained);

  const { rank: newRank, idx: newIdx } = getRank(G.xp);
  if (newIdx > oldIdx) {
    showLevelUp(newRank);
  } else if (typeof Sounds !== 'undefined') {
    setTimeout(() => Sounds.xp(), 300);
  }

  // Auto-sync zu Firebase (mit null-check)
  if (fbReady && fbDb) pushProfileToFirebase();
  return gained;
}

function showLevelUp(rank) {
  const overlay = document.getElementById('levelUpOverlay');
  const badge = document.getElementById('luBadge');
  const name = document.getElementById('luRankName');
  if (!overlay) return;

  badge.textContent = rank.icon;
  name.textContent = rank.name;
  overlay.classList.add('active');

  spawnConfetti();
  triggerHaptic();

  if (typeof Sounds !== 'undefined') Sounds.levelUp();
}

window.closeLevelUp = function () {
  const overlay = document.getElementById('levelUpOverlay');
  if (overlay) overlay.classList.remove('active');
};

function showXPPop(amount) {
  const el = document.createElement('div');
  el.className = 'xp-pop';
  el.textContent = '+' + amount + ' XP';
  el.style.left = (Math.random() * 40 + 30) + '%';
  el.style.top = '35%';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1700);
}

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
  const isActive = ov.classList.contains('active');
  if (isActive) {
    ov.classList.remove('active');
    if (icon) icon.classList.remove('active');
    // BUG-FIX #2: Overflow SOFORT wiederherstellen (vor rAF, verhindert iOS Scroll-Lock)
    document.body.style.overflow = '';
    if (window.innerWidth <= 768 && document.body.style.position === 'fixed') {
      const scrollY = Math.abs(parseInt(document.body.style.top, 10) || 0);
      document.body.style.position = '';
      document.body.style.top = '';
      // requestAnimationFrame um sicherzustellen dass position entfernt wurde
      requestAnimationFrame(() => {
        window.scrollTo(0, scrollY);
      });
    }
  } else {
    refreshDebugToolsVisibility();
    refreshProfileSheet();
    ov.classList.add('active');
    if (icon) icon.classList.add('active');
    // Body scroll lock
    document.body.style.overflow = 'hidden';
    // iOS Safari fallback: position fixed + scroll position speichern
    if (window.innerWidth <= 768) {
      const scrollY = window.scrollY || window.pageYOffset;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
    }
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
  if (tab === 'lb') {
    // NEU: Modernes Leaderboard laden falls verfügbar
    if (typeof LeaderboardModern !== 'undefined') {
      LeaderboardModern.load();
    } else {
      loadLeaderboard();
    }
  }
  if (tab === 'history') renderHistory();
  if (tab === 'friends') {
    if (typeof FriendsUI !== 'undefined') {
      FriendsUI.renderProfileTab();
    }
  }
  if (tab === 'debug') refreshDebugPanel();
  if (tab === 'stats') {
    requestAnimationFrame(() => renderPerformanceChart());
    if (typeof EnhancedAnalytics !== 'undefined') EnhancedAnalytics.renderUI();
  }
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
  const el = id => document.getElementById(id);
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
    if (t === 'lb') loadLeaderboard(true);
    if (t === 'history') renderHistory();
    if (t === 'debug') renderDebugPanel();
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

/* ─── BOT-ZUSTANDS-ANZEIGE IM BATTLE ─────────── */
let _botStatusUpdateInterval = null;

function updateBotStatusCard() {
  const card = document.getElementById('botStatusCard');
  if (!card) return;

  // Prüfen ob AdaptiveBotSystem verfügbar ist
  if (typeof AdaptiveBotSystem === 'undefined' || typeof AdaptiveBotSystem.getBotFullStatus !== 'function') {
    card.style.display = 'none';
    return;
  }

  const fullStatus = AdaptiveBotSystem.getBotFullStatus();
  if (!fullStatus) {
    card.style.display = 'none';
    return;
  }

  // Karte anzeigen
  card.style.display = 'block';

  const { personality, mood, stressLevel, fatigue, focus, stateSuffix, stateIcon, progressionText, isImproving, isDegrading } = fullStatus;

  // Elemente aktualisieren
  const iconEl = document.getElementById('botStatusIcon');
  const titleEl = document.getElementById('botStatusTitle');
  const descEl = document.getElementById('botStatusDesc');
  const focusBar = document.getElementById('botFocusBar');
  const focusPct = document.getElementById('botFocusPct');
  const badgeEl = document.getElementById('botPersonalityBadge');

  // Haupt-Icon: Persönlichkeits-Icon + Zustands-Icon
  const mainIcon = stateIcon || personality.icon;
  if (iconEl) iconEl.textContent = mainIcon;

  // Titel: Persönlichkeit + optionaler Zustand
  if (titleEl) {
    titleEl.textContent = personality.name + (stateSuffix ? ` ${stateSuffix}` : '');
    titleEl.style.color = personality.levelColor;
  }

  // Beschreibung: Fehlermuster oder Fortschrittstext
  if (descEl) {
    if (progressionText) {
      descEl.textContent = progressionText;
    } else {
      descEl.textContent = personality.errorPattern;
    }
    descEl.style.color = 'rgba(255,255,255,0.45)';
  }

  // Persönlichkeits-Badge (Level-Anzeige)
  if (badgeEl) {
    badgeEl.textContent = personality.levelText;
    badgeEl.style.color = personality.levelColor;
    badgeEl.style.borderColor = personality.levelColor + '66';
    badgeEl.style.background = personality.levelGlow;
  }

  // Focus-Balken
  if (focusBar) {
    focusBar.style.width = focus + '%';
    focusBar.style.background = `linear-gradient(90deg, ${personality.levelColor}, ${personality.levelColor}88)`;
  }
  if (focusPct) focusPct.textContent = Math.round(focus);

  // Card-Border-Animation für besondere Zustände
  const isExtreme = mood === 'in_the_zone' || mood === 'stressed';
  card.style.borderColor = isExtreme ? personality.levelColor + '44' : 'rgba(255,255,255,0.06)';
  card.style.boxShadow = isExtreme ? `0 0 15px ${personality.levelGlow}, inset 0 0 10px ${personality.levelGlow}` : 'none';

  // Pulsierender Effekt für extreme Zustände
  if (isExtreme) {
    card.style.animation = 'botStatusPulse 2s ease-in-out infinite';
  } else {
    card.style.animation = 'none';
  }
}

// Pulsierende Animation per CSS (einmalig injizieren)
(function injectBotStatusCSS() {
  if (document.getElementById('botStatusCSS')) return;
  const style = document.createElement('style');
  style.id = 'botStatusCSS';
  style.textContent = `
    @keyframes botStatusPulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.02); }
    }
  `;
  document.head.appendChild(style);
})();

// Bot-Status während des Duells regelmäßig aktualisieren
function startBotStatusUpdates() {
  if (_botStatusUpdateInterval) clearInterval(_botStatusUpdateInterval);
  updateBotStatusCard(); // Sofort initial anzeigen
  _botStatusUpdateInterval = setInterval(updateBotStatusCard, 2000); // Alle 2s aktualisieren
}

function stopBotStatusUpdates() {
  if (_botStatusUpdateInterval) {
    clearInterval(_botStatusUpdateInterval);
    _botStatusUpdateInterval = null;
  }
  const card = document.getElementById('botStatusCard');
  if (card) card.style.display = 'none';
}
window.signInWithGoogle = async function() {
  if (!fbReady || !fbAuth) {
    alert('Firebase Auth ist noch nicht bereit. Bitte warte einen Moment.');
    return;
  }

  const btn = document.getElementById('googleLoginBtn');
  if (btn) {
    btn.textContent = '⏳ Anmeldung läuft...';
    btn.disabled = true;
  }

  try {
    // Prüfen ob bereits ein Google-Nutzer angemeldet ist
    const currentUser = fbAuth.currentUser;
    if (currentUser && currentUser.providerData.some(p => p.providerId === 'google.com')) {
      alert('Du bist bereits mit Google angemeldet.');
      updateGoogleLoginUI(currentUser);
      return;
    }

    // GoogleAuthProvider erstellen
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    let result;
    // Auf Mobile besser: signInWithPopup, auf Desktop auch
    try {
      result = await fbAuth.signInWithPopup(provider);
    } catch (popupError) {
      // Fallback: Redirect für Mobile/WebView
      console.warn('Popup failed, trying redirect:', popupError);
      await fbAuth.signInWithRedirect(provider);
      return; // Redirect passiert, Seite wird neu geladen
    }

    const user = result.user;
    const credential = firebase.auth.GoogleAuthProvider.credentialFromResult(result);

    // Falls vorher anonym → Daten migrieren
    const wasAnonymous = currentUser && currentUser.isAnonymous;
    if (wasAnonymous) {
      // Anonymen Account mit Google verknüpfen
      try {
        await currentUser.linkWithCredential(credential);
        console.debug('✅ Anonymen Account mit Google verknüpft');
      } catch (linkError) {
        // Wenn Verknüpfung fehlschlägt (z.B. Google existiert bereits)
        if (linkError.code === 'auth/credential-already-in-use') {
          // Bestehenden Google-Account nehmen und Daten übertragen
          console.warn('Google Account existiert bereits, wechsle dazu');
          await fbAuth.signInWithCredential(credential);
        } else {
          console.error('Account link error:', linkError);
        }
      }
    }

    // Username vom Google-Profil übernehmen falls noch nicht gesetzt
    const displayName = user.displayName;
    if (displayName && (!G.username || G.username === 'Schütze')) {
      G.username = displayName.substring(0, 15);
      StorageManager.setRaw('username', G.username);
    }

    // Google-Profil-Bild als Avatar speichern falls vorhanden
    if (user.photoURL) {
      StorageManager.setRaw('googlePhotoURL', user.photoURL);
    }

    updateGoogleLoginUI(user);
    updateAccountSyncStatus();

    // Daten zu Firebase syncen
    pushProfileToFirebase();

    // Erfolg-Feedback
    if (btn) {
      btn.textContent = '✅ Angemeldet!';
      setTimeout(() => {
        btn.style.display = 'none';
        document.getElementById('googleLogoutBtn').style.display = 'block';
      }, 1500);
    }

    alert(`✅ Willkommen, ${displayName || G.username}!\n\nDein Konto ist jetzt mit Google verknüpft.\nDeine bisherigen Daten wurden übernommen.`);

  } catch (error) {
    console.error('Google Sign-In Error:', error);
    const errorMsg = error.code === 'auth/popup-closed-by-user'
      ? 'Anmeldung abgebrochen.'
      : error.code === 'auth/popup-blocked'
        ? 'Pop-up wurde blockiert. Bitte erlaube Pop-ups für diese Seite.'
        : `Anmeldung fehlgeschlagen: ${error.message}`;
    alert(errorMsg);

    if (btn) {
      btn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/><path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/><path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/><path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/></svg>
        Mit Google anmelden`;
      btn.disabled = false;
    }
  }
};

window.signOutGoogle = async function() {
  if (!confirm('Möchtest du dich wirklich von Google abmelden?\n\nDeine Daten bleiben erhalten, aber der Sync läuft nur noch über den Sync-Code.')) {
    return;
  }

  try {
    await fbAuth.signOut();
    fbUser = null;

    // UI zurücksetzen
    document.getElementById('googleLoginBtn').style.display = 'flex';
    document.getElementById('googleLogoutBtn').style.display = 'none';
    document.getElementById('googleLoginInfo').style.display = 'none';

    // Zurück zu anonym
    const user = await ensureFirebaseAnonymousAuth();
    fbUser = user;
    updateAccountSyncStatus();

    alert('✅ Von Google abgemeldet. Anonymer Modus aktiv.');
  } catch (error) {
    console.error('Sign-Out Error:', error);
    alert('Abmeldung fehlgeschlagen: ' + error.message);
  }
};

/* ═══════════════════════════════════════════════
   EMAIL/PASSWORT AUTHENTIFIZIERUNG
   ═══════════════════════════════════════════════ */

window.registerWithEmail = async function(email, password) {
  if (!fbReady || !fbAuth) {
    throw new Error('Firebase Auth ist noch nicht bereit.');
  }

  if (!email || !password) {
    throw new Error('Bitte E-Mail und Passwort ausfüllen.');
  }

  if (password.length < 6) {
    throw new Error('Passwort muss mindestens 6 Zeichen haben.');
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new Error('Bitte eine gültige E-Mail-Adresse eingeben.');
  }

  try {
    const userCredential = await fbAuth.createUserWithEmailAndPassword(email, password);
    const user = userCredential.user;

    // Display Name setzen (aus vorhandenem Username oder E-Mail)
    const displayName = G.username || email.split('@')[0];
    if (displayName) {
      await user.updateProfile({ displayName: displayName.substring(0, 15) });
    }

    // Bestehende lokale Daten mit neuem Konto verknüpfen
    await linkLocalDataToFirebase(user);

    console.debug('✅ Neues Konto erstellt:', user.email);
    return user;
  } catch (error) {
    console.error('Registration Error:', error);
    let message = 'Registrierung fehlgeschlagen.';
    
    switch (error.code) {
      case 'auth/email-already-in-use':
        message = 'Diese E-Mail-Adresse ist bereits registriert. Bitte melde dich stattdessen an.';
        break;
      case 'auth/invalid-email':
        message = 'Die E-Mail-Adresse ist ungültig.';
        break;
      case 'auth/weak-password':
        message = 'Das Passwort ist zu schwach (mind. 6 Zeichen).';
        break;
      case 'auth/network-request-failed':
        message = 'Netzwerkfehler. Bitte überprüfe deine Internetverbindung.';
        break;
      default:
        message = error.message;
    }
    
    throw new Error(message);
  }
};

window.signInWithEmail = async function(email, password) {
  if (!fbReady || !fbAuth) {
    throw new Error('Firebase Auth ist noch nicht bereit.');
  }

  if (!email || !password) {
    throw new Error('Bitte E-Mail und Passwort ausfüllen.');
  }

  try {
    const userCredential = await fbAuth.signInWithEmailAndPassword(email, password);
    const user = userCredential.user;

    // Username vom Firebase-Profil übernehmen falls noch nicht gesetzt
    if (user.displayName && (!G.username || G.username === 'Schütze')) {
      G.username = user.displayName.substring(0, 15);
      StorageManager.setRaw('username', G.username);
    }

    // Bestehende lokale Daten mit Konto verknüpfen
    await linkLocalDataToFirebase(user);

    console.debug('✅ Angemeldet:', user.email);
    return user;
  } catch (error) {
    console.error('Login Error:', error);
    let message = 'Anmeldung fehlgeschlagen.';
    
    switch (error.code) {
      case 'auth/user-not-found':
        message = 'Kein Konto mit dieser E-Mail-Adresse gefunden. Bitte registriere dich zuerst.';
        break;
      case 'auth/wrong-password':
        message = 'Falsches Passwort. Bitte überprüfe deine Eingabe.';
        break;
      case 'auth/invalid-email':
        message = 'Die E-Mail-Adresse ist ungültig.';
        break;
      case 'auth/too-many-requests':
        message = 'Zu viele fehlgeschlagene Anmeldeversuche. Bitte versuche es später erneut.';
        break;
      case 'auth/network-request-failed':
        message = 'Netzwerkfehler. Bitte überprüfe deine Internetverbindung.';
        break;
      default:
        message = error.message;
    }
    
    throw new Error(message);
  }
};

window.logoutEmail = async function() {
  if (!fbAuth) {
    throw new Error('Firebase Auth ist nicht verfügbar.');
  }

  if (!confirm('Möchtest du dich wirklich abmelden?\n\nDeine Daten bleiben erhalten und werden beim nächsten Anmelden synchronisiert.')) {
    return;
  }

  try {
    // Lokale Daten vor dem Logout speichern
    const localData = {
      username: G.username,
      xp: G.xp,
      streak: G.streak,
      weapon: G.weapon,
      discipline: G.discipline
    };
    StorageManager.setRaw('pre_logout_data', JSON.stringify(localData));

    await fbAuth.signOut();
    fbUser = null;
    fbAccountId = '';

    // UI zurücksetzen
    updateAuthUI(null);

    // Zurück zu anonymous auth
    const user = await ensureFirebaseAnonymousAuth();
    fbUser = user;
    updateAccountSyncStatus();
    updateXPCorner();
    updateProfileMenu();

    console.debug('✅ Abgemeldet');
    return true;
  } catch (error) {
    console.error('Logout Error:', error);
    throw new Error('Abmeldung fehlgeschlagen: ' + error.message);
  }
};

// Lokale Daten mit Firebase-Konto verknüpfen
async function linkLocalDataToFirebase(user) {
  if (!user || !fbDb) return;

  try {
    // Account-ID auflösen
    await resolveFirebaseAccountId(user);

    // Cloud-User bootstrappen
    await bootstrapCloudUser(user, { force: false });

    // Bestehende lokale Daten zu Firebase syncen
    await pushProfileToFirebase();

    // UI aktualisieren
    fbUser = user;
    updateAuthUI(user);
    updateAccountSyncStatus();
    updateSchuetzenpass();

    // Profil-Bild speichern falls vorhanden
    if (user.photoURL) {
      StorageManager.setRaw('profilePhotoURL', user.photoURL);
    }

    console.debug('✅ Lokale Daten mit Firebase-Konto verknüpft:', user.email || user.displayName);
  } catch (error) {
    console.warn('Data linking warning:', error?.code || error?.message || error);
    // Nicht kritisch - Login funktioniert trotzdem
  }
}

// Zentrale UI-Aktualisierung für Auth-State
function updateAuthUI(user) {
  // Google UI
  updateGoogleLoginUI(user);
  
  // Email Auth UI
  const emailAuthContainer = document.getElementById('emailAuthContainer');
  const authFormContainer = document.getElementById('authFormContainer');
  
  if (emailAuthContainer && authFormContainer) {
    if (user && !user.isAnonymous) {
      // User ist angemeldet
      emailAuthContainer.style.display = 'block';
      authFormContainer.style.display = 'none';
      
      // User Info aktualisieren
      const initial = (user.displayName || user.email || 'A').charAt(0).toUpperCase();
      document.getElementById('authUserAvatar').textContent = initial;
      document.getElementById('authUserName').textContent = user.displayName || 'Nutzer';
      document.getElementById('authUserEmail').textContent = user.email || '';
      
      // Sync-Status aktualisieren
      const syncStatusText = document.getElementById('syncStatusText');
      if (syncStatusText) {
        syncStatusText.innerHTML = `
          <div style="font-weight:600;margin-bottom:2px;">Angemeldet als ${user.email || user.displayName}</div>
          <div style="opacity:0.7;">☁️ Cloud-Sync aktiv</div>
        `;
      }
      
    } else {
      // User ist nicht angemeldet (anonym)
      emailAuthContainer.style.display = 'none';
      authFormContainer.style.display = 'block';
      
      const syncStatusText = document.getElementById('syncStatusText');
      if (syncStatusText) {
        syncStatusText.innerHTML = 'Lokaler Modus · Melde dich an für Sync';
      }
    }
  }

  // Profil-Icon aktualisieren
  const profileIcon = document.getElementById('profileIcon');
  if (profileIcon) {
    if (user && !user.isAnonymous) {
      profileIcon.style.visibility = 'visible';
      profileIcon.style.background = 'linear-gradient(135deg, #00c3ff 0%, #7ab030 100%)';
      profileIcon.style.color = '#000';
    } else {
      profileIcon.style.visibility = 'hidden';
      profileIcon.style.background = '';
      profileIcon.style.color = '';
    }
  }

  // Dashboard greeting aktualisieren
  if (typeof updatePDGreeting === 'function') {
    setTimeout(updatePDGreeting, 200);
  }
}

/* ═══════════════════════════════════════════════
   AUTH UI HANDLER (Email/Passwort)
   ═══════════════════════════════════════════════ */

window.switchAuthTab = function(tab) {
  const loginTab = document.getElementById('authTabLogin');
  const registerTab = document.getElementById('authTabRegister');
  const loginForm = document.getElementById('authLoginForm');
  const registerForm = document.getElementById('authRegisterForm');
  
  if (!loginTab || !registerTab || !loginForm || !registerForm) return;
  
  hideAuthMessage();
  
  if (tab === 'login') {
    loginTab.style.background = 'linear-gradient(135deg,#00c3ff 0%,#7ab030 100%)';
    loginTab.style.color = '#000';
    registerTab.style.background = 'transparent';
    registerTab.style.color = 'rgba(255,255,255,0.5)';
    loginForm.style.display = 'flex';
    registerForm.style.display = 'none';
  } else {
    registerTab.style.background = 'linear-gradient(135deg,#00c3ff 0%,#7ab030 100%)';
    registerTab.style.color = '#000';
    loginTab.style.background = 'transparent';
    loginTab.style.color = 'rgba(255,255,255,0.5)';
    registerForm.style.display = 'flex';
    loginForm.style.display = 'none';
  }
};

window.showAuthMessage = function(text, type = 'error') {
  const msg = document.getElementById('authMessage');
  if (!msg) return;
  
  msg.textContent = text;
  msg.style.display = 'block';
  
  if (type === 'error') {
    msg.style.background = 'rgba(240,96,80,0.15)';
    msg.style.border = '1px solid rgba(240,96,80,0.3)';
    msg.style.color = '#f06050';
  } else {
    msg.style.background = 'rgba(122,176,48,0.15)';
    msg.style.border = '1px solid rgba(122,176,48,0.3)';
    msg.style.color = '#7ab030';
  }
};

window.hideAuthMessage = function() {
  const msg = document.getElementById('authMessage');
  if (msg) msg.style.display = 'none';
};

window.setAuthLoading = function(loading, btnId = 'authLoginBtn') {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  
  if (loading) {
    btn.disabled = true;
    btn.innerHTML = '<span style="display:inline-block;width:14px;height:14px;border:2px solid rgba(0,0,0,0.2);border-top-color:#000;border-radius:50%;animation:spin 0.6s linear infinite;"></span> Wird verarbeitet...';
  } else {
    btn.disabled = false;
    if (btnId === 'authLoginBtn') {
      btn.textContent = '🚀 Anmelden';
    } else {
      btn.textContent = '✨ Konto erstellen';
    }
  }
};

window.handleAuthLogin = async function() {
  const email = document.getElementById('authLoginEmail').value.trim();
  const password = document.getElementById('authLoginPassword').value;
  
  hideAuthMessage();
  
  if (!email || !password) {
    return showAuthMessage('❌ Bitte E-Mail und Passwort ausfüllen.');
  }
  
  setAuthLoading(true, 'authLoginBtn');
  
  try {
    const user = await signInWithEmail(email, password);
    showAuthMessage('✅ Erfolgreich angemeldet!', 'success');
    
    // Formular zurücksetzen
    document.getElementById('authLoginEmail').value = '';
    document.getElementById('authLoginPassword').value = '';
    
    // Erfolg-Feedback
    setTimeout(() => {
      hideAuthMessage();
    }, 2000);
    
  } catch (error) {
    showAuthMessage(error.message);
  } finally {
    setAuthLoading(false, 'authLoginBtn');
  }
};

window.handleAuthRegister = async function() {
  const email = document.getElementById('authRegisterEmail').value.trim();
  const password = document.getElementById('authRegisterPassword').value;
  const passwordConfirm = document.getElementById('authRegisterPasswordConfirm').value;
  
  hideAuthMessage();
  
  if (!email || !password || !passwordConfirm) {
    return showAuthMessage('❌ Bitte alle Felder ausfüllen.');
  }
  
  if (password !== passwordConfirm) {
    return showAuthMessage('❌ Passwörter stimmen nicht überein.');
  }
  
  if (password.length < 6) {
    return showAuthMessage('❌ Passwort muss mindestens 6 Zeichen haben.');
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return showAuthMessage('❌ Bitte eine gültige E-Mail-Adresse eingeben.');
  }
  
  setAuthLoading(true, 'authRegisterBtn');
  
  try {
    const user = await registerWithEmail(email, password);
    showAuthMessage('✅ Konto erstellt! Deine Daten werden synchronisiert.', 'success');
    
    // Formular zurücksetzen
    document.getElementById('authRegisterEmail').value = '';
    document.getElementById('authRegisterPassword').value = '';
    document.getElementById('authRegisterPasswordConfirm').value = '';
    
    // Erfolg-Feedback
    setTimeout(() => {
      hideAuthMessage();
    }, 2000);
    
  } catch (error) {
    showAuthMessage(error.message);
  } finally {
    setAuthLoading(false, 'authRegisterBtn');
  }
};

// Enter-Taste Unterstützung für Login-Formular
function initAuthFormListeners() {
  const loginPassword = document.getElementById('authLoginPassword');
  const registerPasswordConfirm = document.getElementById('authRegisterPasswordConfirm');
  
  if (loginPassword) {
    loginPassword.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleAuthLogin();
    });
  }
  
  if (registerPasswordConfirm) {
    registerPasswordConfirm.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleAuthRegister();
    });
  }
}

// Spinner Animation CSS
function injectAuthSpinnerCSS() {
  if (document.getElementById('auth-spinner-style')) return;
  
  const style = document.createElement('style');
  style.id = 'auth-spinner-style';
  style.textContent = `
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
}

function updateGoogleLoginUI(user) {
  const loginBtn = document.getElementById('googleLoginBtn');
  const logoutBtn = document.getElementById('googleLogoutBtn');
  const loginInfo = document.getElementById('googleLoginInfo');
  const userName = document.getElementById('googleUserName');
  const userEmail = document.getElementById('googleUserEmail');
  const avatar = document.getElementById('googleAvatar');

  // Wenn kein user oder kein Google Provider
  const isGoogleUser = user && user.providerData && user.providerData.some(p => p.providerId === 'google.com');

  if (!isGoogleUser) {
    // Nicht mit Google angemeldet
    if (loginBtn) loginBtn.style.display = 'flex';
    if (logoutBtn) logoutBtn.style.display = 'none';
    if (loginInfo) loginInfo.style.display = 'none';
    return;
  }

  // Mit Google angemeldet
  if (loginBtn) loginBtn.style.display = 'none';
  if (logoutBtn) logoutBtn.style.display = 'block';
  if (loginInfo) loginInfo.style.display = 'block';

  if (userName) userName.textContent = user.displayName || 'Google Nutzer';
  if (userEmail) userEmail.textContent = user.email || '';

  if (avatar && user.photoURL) {
    avatar.src = user.photoURL;
    avatar.style.display = 'block';
    StorageManager.setRaw('googlePhotoURL', user.photoURL);
  }
}

// Auth-State Observer einrichten
function setupGoogleAuthObserver() {
  if (!fbAuth) return;

  fbAuth.onAuthStateChanged(user => {
    if (user) {
      fbUser = user;
      updateGoogleLoginUI(user);
      updateAccountSyncStatus();
      bootstrapCloudUser(user).catch(console.warn);
    } else {
      fbUser = null;
      updateGoogleLoginUI(null);
      updateAccountSyncStatus();
    }
  });
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

window.changeProfileName = function() {
  const nameInput = document.getElementById('profileNameInput');
  if (!nameInput) return;

  const newName = nameInput.value.trim().substring(0, 15);
  if (!newName) {
    alert('Bitte gib einen Namen ein.');
    return;
  }

  const oldName = G.username;
  G.username = newName;
  StorageManager.setRaw('username', newName);

  // UI überall aktualisieren
  const psUsername = document.getElementById('psUsername');
  if (psUsername) psUsername.textContent = newName;

  const pdUserName = document.getElementById('pdUserName');
  if (pdUserName) pdUserName.textContent = newName;

  const pdProfileInitial = document.getElementById('pdProfileInitial');
  if (pdProfileInitial) pdProfileInitial.textContent = newName.charAt(0).toUpperCase();

  // Firebase sync
  if (fbReady && fbDb) {
    pushProfileToFirebase();
  }

  triggerHaptic();
  alert(`Name von "${oldName}" zu "${newName}" geändert.`);
};

function spawnConfetti() {
  const colors = ['#ff9600', '#1cb0f6', '#90d838', '#ff4500', '#ffd700', '#ffffff'];
  for (let i = 0; i < 50; i++) {
    const c = document.createElement('div');
    c.className = 'confetti';
    c.style.left = Math.random() * 100 + 'vw';
    c.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    c.style.animationDelay = Math.random() * 2 + 's';
    document.body.appendChild(c);
    setTimeout(() => c.remove(), 4000);
  }
}

function triggerHaptic() {
  if ('vibrate' in navigator) {
    navigator.vibrate([30, 20, 30]);
  }
}

/* ─── GAME STATS (localStorage) ─────────── */
function loadGameStats() {
  try { return JSON.parse(localStorage.getItem('sd_gamestats') || '{}'); }
  catch (e) { return {}; }
}

function saveGameStats(s) {
  StorageManager.set('gamestats', s);
  scheduleCloudSync('gamestats_changed');
}

const FEEDBACK_MIN_DUELS = 3;
const FEEDBACK_MAX_DUELS = 5;
let _feedbackPromptTimeout = null;

function getTotalDuels(stats = null) {
  const gs = stats || loadGameStats();
  return (gs.wins || 0) + (gs.losses || 0) + (gs.draws || 0);
}

function randomFeedbackInterval() {
  return FEEDBACK_MIN_DUELS + Math.floor(Math.random() * (FEEDBACK_MAX_DUELS - FEEDBACK_MIN_DUELS + 1));
}

function loadFeedbackMeta() {
  try { return JSON.parse(localStorage.getItem('sd_feedback_meta') || '{}'); }
  catch (e) { return {}; }
}

function saveFeedbackMeta(meta) {
  StorageManager.set('feedback_meta', meta);
  scheduleCloudSync('feedback_meta_changed');
}

function ensureFeedbackSchedule() {
  const totalDuels = getTotalDuels();
  const meta = loadFeedbackMeta();
  if (!Number.isInteger(meta.nextAt) || meta.nextAt <= 0) {
    meta.nextAt = totalDuels + randomFeedbackInterval();
    saveFeedbackMeta(meta);
  }
}

function shouldShowFeedback(totalDuels) {
  if (totalDuels < FEEDBACK_MIN_DUELS) return false;
  const meta = loadFeedbackMeta();
  if (!Number.isInteger(meta.nextAt) || meta.nextAt <= 0) {
    meta.nextAt = totalDuels + randomFeedbackInterval();
    saveFeedbackMeta(meta);
    return false;
  }
  return totalDuels >= meta.nextAt;
}

function scheduleNextFeedback(totalDuels) {
  const meta = loadFeedbackMeta();
  meta.lastPromptAt = totalDuels;
  meta.nextAt = totalDuels + randomFeedbackInterval();
  saveFeedbackMeta(meta);
}

function clearPendingFeedbackPrompt() {
  if (_feedbackPromptTimeout) {
    clearTimeout(_feedbackPromptTimeout);
    _feedbackPromptTimeout = null;
  }
}

function scheduleFeedbackPrompt(totalDuels) {
  clearPendingFeedbackPrompt();
  _feedbackPromptTimeout = setTimeout(() => {
    _feedbackPromptTimeout = null;
    const overScreen = document.getElementById('screenOver');
    if (!overScreen || !overScreen.classList.contains('active')) return;
    showFeedbackScreen(totalDuels);
  }, 800);
}

function showFeedbackScreen(totalDuels, duelData) {
  clearPendingFeedbackPrompt();
  if (DOM.feedbackCount) DOM.feedbackCount.textContent = `◆ DUELL #${totalDuels} ◆`;
  // If duel data provided, populate the v2 feedback screen
  if (duelData) {
    fbSetDuel(duelData);
  }
  showScreen('screenFeedback');
}

// ═══════════════════════════════════════════════
// FEEDBACK v2 – Duel Result + Emoji + Tags + Comment
// ═══════════════════════════════════════════════
let fbRating = null;
let fbTags = [];
let fbDuelData = null; // { discipline, opponent, result, score }

function fbSetDuel(data) {
  fbDuelData = data;
  fbRating = null;
  fbTags = [];
  const meta = FB_RESULT_META[data.result] || FB_RESULT_META.draw;
  // Result icon
  const iconEl = document.getElementById('fbResultIcon');
  if (iconEl) iconEl.innerHTML = meta.icon;
  // Title
  const titleEl = document.getElementById('fbResultTitle');
  const name = escHtml(data.opponent || data.discipline);
  if (titleEl) titleEl.innerHTML = `${name} — <span style="color:${meta.color}">${meta.text}</span>`;
  // Score
  const scoreEl = document.getElementById('fbResultScore');
  if (scoreEl) scoreEl.textContent = data.score || '';
  // Reset UI
  fbResetEmojiUI();
  fbResetTagsUI();
  document.getElementById('fbComment').value = '';
  fbUpdateCounter();
  fbUpdateSubmitBtn();
}

const FB_RESULT_META = {
  win: { icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26Z" fill="#39FF14"/></svg>', text: 'Sieg!', color: '#39FF14' },
  loss: { icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M6 6L18 18M18 6L6 18" stroke="#FF4444" stroke-width="3" stroke-linecap="round"/></svg>', text: 'Niederlage', color: '#FF4444' },
  draw: { icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M5 12H19" stroke="#FFAA00" stroke-width="3" stroke-linecap="round"/></svg>', text: 'Unentschieden', color: '#FFAA00' },
};

function fbSetRating(idx) {
  fbRating = idx;
  fbUpdateEmojiUI();
  fbUpdateSubmitBtn();
}

function fbUpdateEmojiUI() {
  document.querySelectorAll('.fb-emoji-item').forEach(el => {
    const i = parseInt(el.dataset.idx);
    const btn = el.querySelector('.fb-emoji-btn');
    const label = el.querySelector('span');
    if (i === fbRating) {
      btn.style.cssText = 'width:58px;height:58px;background:rgba(15,35,10,.8);border:2px solid #39FF14;border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:28px;cursor:pointer;transition:all .15s ease;';
      label.style.color = '#39FF14';
      label.style.fontWeight = '700';
    } else {
      btn.style.cssText = 'width:52px;height:52px;background:rgba(30,45,20,.6);border:1.5px solid rgba(122,176,48,.2);border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:24px;cursor:pointer;';
      label.style.color = 'rgba(90,140,60,.5)';
      label.style.fontWeight = '600';
    }
  });
}

function fbResetEmojiUI() {
  fbRating = null;
  fbUpdateEmojiUI();
}

function fbToggleTag(el) {
  const tag = el.dataset.tag;
  if (fbTags.includes(tag)) {
    fbTags = fbTags.filter(t => t !== tag);
    el.style.cssText = 'background:rgba(30,45,20,.6);border:1px solid rgba(122,176,48,.2);color:rgba(122,176,48,.5);font-size:.75rem;font-weight:600;padding:7px 14px;border-radius:20px;cursor:pointer;';
  } else {
    fbTags.push(tag);
    el.style.cssText = 'background:rgba(15,35,10,.8);border:1px solid rgba(57,255,20,.35);color:#39FF14;font-size:.75rem;font-weight:600;padding:7px 14px;border-radius:20px;cursor:pointer;';
  }
}

function fbResetTagsUI() {
  fbTags = [];
  document.querySelectorAll('.fb-tag').forEach(el => {
    el.style.cssText = 'background:rgba(30,45,20,.6);border:1px solid rgba(122,176,48,.2);color:rgba(122,176,48,.5);font-size:.75rem;font-weight:600;padding:7px 14px;border-radius:20px;cursor:pointer;';
  });
}

function fbUpdateCounter() {
  const comment = document.getElementById('fbComment').value;
  const counter = document.getElementById('fbCounter');
  if (counter) counter.textContent = `${comment.length} / 300`;
}

function fbUpdateSubmitBtn() {
  const btn = document.getElementById('fbSubmitBtn');
  if (btn) {
    if (fbRating !== null) {
      btn.style.opacity = '1';
      btn.style.pointerEvents = 'auto';
    } else {
      btn.style.opacity = '.35';
      btn.style.pointerEvents = 'none';
    }
  }
}

function fbSubmit() {
  if (fbRating === null) return;
  const comment = document.getElementById('fbComment').value || '';
  const score = fbRating + 1; // 1-5 scale
  const totalDuels = getTotalDuels();

  // Sende vollständiges Feedback an Worker API (für Admin-Dashboard)
  const safeUsername = sanitizeUsername(G.username || 'Anonym');
  const userEmail = typeof StorageManager !== 'undefined' ? (StorageManager.getRaw('userEmail') || `${safeUsername}@schuss-challenge.local`) : `${safeUsername}@schuss-challenge.local`;
  const emojiLabels = ['😤 Schlecht', '😐 Okay', '😄 Gut', '🤩 Super', '🔥 Episch'];
  const tags = fbTags || [];

  // Duell-Ergebnis zusammenbauen
  const duelResult = fbDuelData || {};
  const resultTitle = duelResult.title || `${G.weapon || 'LG'} ${duelResult.result || 'Unbekannt'}`;
  const resultScore = duelResult.score || duelResult.myScore || 'N/A';

  fetch('https://schuss-challenge.eliaskummel.workers.dev/api/feedback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: userEmail,
      feedbackType: score >= 4 ? 'general' : score === 3 ? 'general' : 'bug',
      title: `${emojiLabels[fbRating] || 'Feedback'} - ${resultTitle}`,
      message: `⭐ Bewertung: ${score}/5 (${emojiLabels[fbRating] || 'N/A'})\n🏆 Duell: ${resultTitle}\n📊 Score: ${resultScore}\n🏷️ Tags: ${tags.length > 0 ? tags.join(', ') : 'Keine'}\n💬 Kommentar: ${comment || 'Keiner'}\n👤 Spieler: ${safeUsername}\n🔫 Waffe: ${G.weapon || 'N/A'}\n🎯 Disziplin: ${G.discipline || 'N/A'}`
    })
  }).catch(err => console.warn('Feedback an Worker fehlgeschlagen:', err));

  // Save to localStorage (compat with existing feedback system)
  let entries = [];
  try { entries = JSON.parse(localStorage.getItem('sd_feedback_entries') || '[]'); } catch (e) { entries = []; }
  if (!Array.isArray(entries)) entries = [];
  entries.unshift({ score, totalDuels, weapon: G.weapon, discipline: fbDuelData?.discipline || G.discipline, ts: Date.now(), tags: fbTags, comment });
  while (entries.length > 100) entries.pop();
  try { localStorage.setItem('sd_feedback_entries', JSON.stringify(entries)); } catch (e) { console.warn('[Feedback] localStorage Fehler:', e.message); }

  console.debug('[Feedback]', { rating: fbRating + 1, tags: fbTags, comment, duel: fbDuelData });

  // Thank you animation
  const card = document.getElementById('screenFeedback');
  if (card) {
    // Show brief thank you, then go back
    if (typeof Sounds !== 'undefined') Sounds.win();
    setTimeout(() => {
      scheduleNextFeedback(totalDuels);
      showScreen('screenSetup');
    }, 1500);
  }
}

function submitSiteFeedback(rating) {
  clearPendingFeedbackPrompt();
  const score = parseInt(rating);
  const totalDuels = getTotalDuels();

  // Sende Feedback an Worker API (für Admin-Dashboard)
  const safeUsername = sanitizeUsername(G.username || 'Anonym');
  const userEmail = typeof StorageManager !== 'undefined' ? (StorageManager.getRaw('userEmail') || `${safeUsername}@schuss-challenge.local`) : `${safeUsername}@schuss-challenge.local`;
  
  fetch('https://schuss-challenge.eliaskummel.workers.dev/api/feedback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: userEmail,
      feedbackType: 'general',
      title: `⭐ ${score}/5 Sterne - ${G.weapon || 'LG'} ${G.discipline || ''}`,
      message: `Score: ${score}/5\nWaffe: ${G.weapon || 'unknown'}\nDisziplin: ${G.discipline || 'unknown'}\nSchwierigkeit: ${G.diff || 'unknown'}\nSpieler: ${safeUsername}`
    })
  }).catch(err => console.warn('Feedback an Worker fehlgeschlagen:', err));

  if (Number.isInteger(score) && score >= 1 && score <= 5) {
    // ... (existing logic for saving)
    let entries = [];
    try {
      entries = JSON.parse(localStorage.getItem('sd_feedback_entries') || '[]');
      if (!Array.isArray(entries)) entries = [];
    } catch (e) { entries = []; }
    entries.unshift({
      score,
      totalDuels,
      weapon: G.weapon,
      discipline: G.discipline,
      ts: Date.now()
    });
    while (entries.length > 100) entries.pop();
    try { localStorage.setItem('sd_feedback_entries', JSON.stringify(entries)); } catch (e) { console.warn('[Feedback] localStorage Fehler:', e.message); }

    {
      const safeUsername = sanitizeUsername(G.username || 'Anonym');
      const userHash = safeUsername
        ? safeUsername.split('').reduce((a, c) => ((a << 5) - a + c.charCodeAt(0)) | 0, 0)
          .toString(36).replace('-', 'n')
        : 'anon';
      const emojis = { 1: '😡', 2: '🙁', 3: '😐', 4: '🙂', 5: '🤩' };
      const entry = {
        score,
        emoji: emojis[score] || '?',
        totalDuels,
        weapon: G.weapon || 'unknown',
        discipline: G.discipline || 'unknown',
        diff: G.diff || 'unknown',
        username: safeUsername,
        userHash,
        uid: getFirebaseOwnerId(),
        authUid: fbUser?.uid || '',
        accountId: getFirebaseOwnerId(),
        ts: Date.now(),
        date: new Date().toLocaleDateString('de-DE', {
          day: '2-digit', month: '2-digit', year: 'numeric',
          hour: '2-digit', minute: '2-digit'
        })
      };
      entry.key = `${entry.ts}_${getFirebaseOwnerId() || userHash}`;
      queueFeedbackEntry(entry);
    }

    // Show thank you message
    const card = document.querySelector('.fb-card');
    if (card) {
      card.innerHTML = `
            <div class="fb-title" style="color: #90d838;">DANKE! 🎉</div>
            <div class="fb-sub">Dein Feedback hilft uns sehr.</div>
            <div style="font-size: 4rem; margin: 20px 0;">🙌</div>
          `;
      if (typeof Sounds !== 'undefined') Sounds.win();
      setTimeout(() => {
        scheduleNextFeedback(totalDuels);
        showScreen('screenSetup');
      }, 2000);
      return;
    }
  }

  scheduleNextFeedback(totalDuels);
  showScreen('screenSetup');
  // Dashboard mit frischen Daten aktualisieren
  if (typeof refreshPremiumDashboard === 'function') setTimeout(refreshPremiumDashboard, 200);
}

function skipSiteFeedback() {
  clearPendingFeedbackPrompt();
  const totalDuels = getTotalDuels();
  scheduleNextFeedback(totalDuels);
  showScreen('screenSetup');
}

function loadWeaponStats(w) {
  try { return JSON.parse(localStorage.getItem(`sd_wstats_${w}`) || '{"wins":0,"losses":0,"draws":0}'); }
  catch (e) { return { wins: 0, losses: 0, draws: 0 }; }
}

function saveWeaponStats(w, s) {
  StorageManager.set(`wstats_${w}`, s);
  scheduleCloudSync(`weapon_stats_${w}`);
}

function todayIdLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function readJsonStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : fallback;
  } catch (e) {
    return fallback;
  }
}

function writeJsonStorage(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { console.warn('[Storage] localStorage Fehler:', e.message); }
}

function showEngagementToast(message, durationMs = 4200) {
  if (!message) return;
  const toast = document.createElement('div');
  toast.className = 'engagement-toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('active'));
  setTimeout(() => {
    toast.classList.remove('active');
    setTimeout(() => toast.remove(), 220);
  }, Math.max(1200, durationMs));
}

const RookiePlan = (function () {
  const STORAGE_KEY = 'sd_rookie_plan_v1';
  const PLAN_REWARD_XP = 120;
  const STEPS = [
    { id: 'profile', title: 'Tag 1 · Profil anlegen', check: (m) => m.hasUsername },
    { id: 'first_duel', title: 'Tag 2 · Erstes Duell spielen', check: (m) => m.totalDuels >= 1 },
    { id: 'first_win', title: 'Tag 3 · Ersten Sieg holen', check: (m) => m.wins >= 1 },
    { id: 'both_weapons', title: 'Tag 4 · LG + KK testen', check: (m) => m.lgGames >= 1 && m.kkGames >= 1 },
    { id: 'daily_mission', title: 'Tag 5 · 1 Daily-Mission erledigen', check: (m) => m.dailyCompleted >= 1 },
    { id: 'streak_3', title: 'Tag 6 · 3er-Streak erreichen', check: (m) => m.bestStreak >= 3 },
    { id: 'five_duels', title: 'Tag 7 · 5 Duelle insgesamt', check: (m) => m.totalDuels >= 5 }
  ];

  let state = {
    introSeen: false,
    lastDoneCount: 0,
    completedAt: 0,
    rewardClaimed: false
  };

  function loadState() {
    const raw = StorageManager.get('rookie_plan_v1', {});
    state = {
      introSeen: !!raw.introSeen,
      lastDoneCount: Math.max(0, Number(raw.lastDoneCount) || 0),
      completedAt: Number(raw.completedAt) || 0,
      rewardClaimed: !!raw.rewardClaimed
    };
  }

  function saveState() {
    StorageManager.set('rookie_plan_v1', state);
  }

  function getMetrics() {
    const gs = loadGameStats();
    const totalDuels = (gs.wins || 0) + (gs.losses || 0) + (gs.draws || 0);
    const wins = gs.wins || 0;
    const lg = loadWeaponStats('lg');
    const kk = loadWeaponStats('kk');
    const lgGames = (lg.wins || 0) + (lg.losses || 0) + (lg.draws || 0);
    const kkGames = (kk.wins || 0) + (kk.losses || 0) + (kk.draws || 0);
    const bestStreak = Math.max(
      Number(localStorage.getItem('sd_lg_best') || 0) || 0,
      Number(localStorage.getItem('sd_kk_best') || 0) || 0
    );
    const dailyState = StorageManager.get('daily_challenge', {});
    const dailyCompleted = Array.isArray(dailyState.challenges)
      ? dailyState.challenges.filter(c => c && c.completed).length
      : 0;

    return {
      hasUsername: !!(G.username || StorageManager.getRaw('username')),
      totalDuels,
      wins,
      lgGames,
      kkGames,
      bestStreak,
      dailyCompleted
    };
  }

  function evaluate() {
    const metrics = getMetrics();
    const steps = STEPS.map(s => ({ ...s, done: !!s.check(metrics) }));
    const doneCount = steps.filter(s => s.done).length;
    return { metrics, steps, doneCount, total: STEPS.length, completed: doneCount === STEPS.length };
  }

  function render(evalResult = null) {
    const mount = document.getElementById('rookiePlanMount');
    if (!mount) return;

    // Only show in profile sheet
    const isProfileVisible = document.getElementById('profileOverlay')?.classList.contains('active');
    if (!isProfileVisible && !evalResult) return;

    if (!(G.username || localStorage.getItem('sd_username'))) {
      mount.innerHTML = '';
      return;
    }

    const res = evalResult || evaluate();
    const pct = Math.round((res.doneCount / res.total) * 100);
    const doneBadge = res.completed ? '🏁 Woche abgeschlossen' : '🧭 Rookie-Woche';
    const hint = res.completed
      ? 'Stark! Du hast den kompletten Einstieg abgeschlossen.'
      : 'Kurze Sessions mit klaren Zielen bringen dich am schnellsten voran.';

    mount.innerHTML = `
          <div class="rookie-plan-card profile-mode">
            <div class="rookie-plan-head">
              <div class="rookie-plan-title">${doneBadge}</div>
              <div class="rookie-plan-progress">${res.doneCount} / ${res.total}</div>
            </div>
            <div class="rookie-plan-bar">
              <div class="rookie-plan-bar-fill" style="width:${pct}%"></div>
            </div>
            <div class="rookie-plan-list">
              ${res.steps.map((s, i) => `
                <div class="rookie-plan-item ${s.done ? 'done' : ''}">
                  <div class="rookie-plan-dot">${s.done ? '✓' : (i + 1)}</div>
                  <div class="rookie-plan-text">${s.title}</div>
                </div>
              `).join('')}
            </div>
          </div>
        `;
  }

  function showIntroIfNeeded(force = false) {
    const overlay = document.getElementById('rookieIntroOverlay');
    if (!overlay) return;
    if (!(G.username || localStorage.getItem('sd_username'))) return;
    if (state.introSeen && !force) return;
    overlay.classList.add('active');
  }

  function hideIntro() {
    const overlay = document.getElementById('rookieIntroOverlay');
    if (overlay) overlay.classList.remove('active');
  }

  function dismissIntro(started) {
    state.introSeen = true;
    saveState();
    hideIntro();
    if (started) {
      showEngagementToast('Rookie-Woche gestartet. Schritt für Schritt zum sicheren Flow.');
    }
    evaluateAndRender(true);
  }

  function evaluateAndRender(silent = false) {
    const res = evaluate();
    const prevDone = state.lastDoneCount || 0;

    if (res.doneCount > prevDone && !silent) {
      showEngagementToast(`Rookie-Fortschritt: ${res.doneCount}/${res.total} abgeschlossen.`);
    }

    state.lastDoneCount = res.doneCount;

    if (res.completed && !state.rewardClaimed) {
      state.rewardClaimed = true;
      state.completedAt = Date.now();
      const gained = awardFlatXP(PLAN_REWARD_XP);
      if (!silent && gained > 0) {
        showEngagementToast(`Rookie-Woche geschafft! +${gained} XP Bonus.`);
      }
    }

    saveState();
    render(res);
  }

  function init() {
    loadState();
    evaluateAndRender(true);
  }

  return {
    init,
    evaluateAndRender,
    showIntroIfNeeded,
    dismissIntro
  };
})();

const HealthyEngagement = (function () {
  const STORAGE_KEY = 'sd_healthy_engagement_v1';
  const BREAK_INTERVAL_SECS = 20 * 60;
  const MAX_BREAK_HINTS_PER_DAY = 3;
  const RETURN_REMINDER_HOURS = 18;

  let state = {
    dateId: '',
    activeSecsToday: 0,
    pauseHintsShownToday: 0,
    lastReminderDateId: '',
    lastVisitAt: 0,
    lastBattleStartAt: 0,
    snoozeUntil: 0
  };

  function normalizeForToday() {
    const today = todayIdLocal();
    if (state.dateId !== today) {
      state.dateId = today;
      state.activeSecsToday = 0;
      state.pauseHintsShownToday = 0;
      state.snoozeUntil = 0;
    }
  }

  function loadState() {
    const raw = StorageManager.get('healthy_engagement_v1', {});
    state = {
      dateId: typeof raw.dateId === 'string' ? raw.dateId : '',
      activeSecsToday: Math.max(0, Number(raw.activeSecsToday) || 0),
      pauseHintsShownToday: Math.max(0, Number(raw.pauseHintsShownToday) || 0),
      lastReminderDateId: typeof raw.lastReminderDateId === 'string' ? raw.lastReminderDateId : '',
      lastVisitAt: Math.max(0, Number(raw.lastVisitAt) || 0),
      lastBattleStartAt: Math.max(0, Number(raw.lastBattleStartAt) || 0),
      snoozeUntil: Math.max(0, Number(raw.snoozeUntil) || 0)
    };
    normalizeForToday();
  }

  function saveState() {
    StorageManager.set('healthy_engagement_v1', state);
  }

  function hideBreakOverlay() {
    const overlay = document.getElementById('healthyBreakOverlay');
    if (overlay) overlay.classList.remove('active');
  }

  function showBreakOverlay() {
    if (Date.now() < state.snoozeUntil) return;
    if (state.pauseHintsShownToday >= MAX_BREAK_HINTS_PER_DAY) return;

    const overlay = document.getElementById('healthyBreakOverlay');
    const txt = document.getElementById('healthyBreakText');
    if (!overlay || !txt) return;

    const mins = Math.round(state.activeSecsToday / 60);
    txt.textContent = `Du bist heute schon ${mins} Minuten im Fokus. 2 Minuten Pause helfen Konzentration und Trefferbild.`;
    overlay.classList.add('active');
    state.pauseHintsShownToday += 1;
    saveState();
  }

  function maybeShowBreakHint() {
    const thresholdHits = Math.floor(state.activeSecsToday / BREAK_INTERVAL_SECS);
    if (thresholdHits > state.pauseHintsShownToday) {
      showBreakOverlay();
    }
  }

  function maybeShowReturnReminder() {
    const today = todayIdLocal();
    if (state.lastReminderDateId === today) return;

    const lastPlayedAt = Math.max(0, Number(localStorage.getItem('sd_last_played_at') || 0));
    if (!lastPlayedAt) return;

    const hoursAway = (Date.now() - lastPlayedAt) / 3600000;
    if (hoursAway < RETURN_REMINDER_HOURS) return;

    showEngagementToast('Willkommen zurück! Eine kurze Session reicht heute schon für Fortschritt.');
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification('🎯 Schussduell erinnert dich', {
          body: 'Deine Rookie-Woche und Tagesmission warten auf dich.',
          tag: 'sd-gentle-reminder'
        });
      } catch (e) { console.warn('[Rookie] Reminder speichern fehlgeschlagen:', e.message); }
    }
    state.lastReminderDateId = today;
    saveState();
  }

  function onBattleStart() {
    normalizeForToday();
    state.lastBattleStartAt = Date.now();
    saveState();
  }

  function onMatchFinished(durationSecs) {
    normalizeForToday();
    const elapsedByStart = state.lastBattleStartAt > 0
      ? Math.floor((Date.now() - state.lastBattleStartAt) / 1000)
      : 0;
    const elapsed = Math.max(
      0,
      Number.isFinite(durationSecs) ? Math.floor(durationSecs) : 0,
      elapsedByStart
    );

    state.lastBattleStartAt = 0;
    if (elapsed > 0) {
      state.activeSecsToday += elapsed;
      localStorage.setItem('sd_last_played_at', String(Date.now()));
      maybeShowBreakHint();
    }
    saveState();
  }

  function takeBreak() {
    state.snoozeUntil = Date.now() + (2 * 60 * 1000);
    saveState();
    hideBreakOverlay();
    showEngagementToast('Top. 2 Minuten Pause aktiviert.');
  }

  function continuePlay() {
    state.snoozeUntil = Date.now() + (10 * 60 * 1000);
    saveState();
    hideBreakOverlay();
    showEngagementToast('Alles klar. Nächster Pausenhinweis in ca. 10 Minuten.');
  }

  function init() {
    loadState();
    maybeShowReturnReminder();
    state.lastVisitAt = Date.now();
    saveState();
  }

  return {
    init,
    onBattleStart,
    onMatchFinished,
    takeBreak,
    continuePlay,
    hideBreakOverlay
  };
})();

window.startRookieOnboarding = function () {
  RookiePlan.dismissIntro(true);
};

window.dismissRookieOnboarding = function () {
  RookiePlan.dismissIntro(false);
};

window.healthyTakeBreak = function () {
  HealthyEngagement.takeBreak();
};

window.healthyContinuePlay = function () {
  HealthyEngagement.continuePlay();
};

function recordGameResult(result, diff, weapon, playerPts, botPts) {
  // Global stats
  const gs = loadGameStats();
  gs.wins = (gs.wins || 0) + (result === 'win' ? 1 : 0);
  gs.losses = (gs.losses || 0) + (result === 'lose' ? 1 : 0);
  gs.draws = (gs.draws || 0) + (result === 'draw' ? 1 : 0);
  saveGameStats(gs);

  // Weapon stats
  const ws = loadWeaponStats(weapon);
  ws.wins = (ws.wins || 0) + (result === 'win' ? 1 : 0);
  ws.losses = (ws.losses || 0) + (result === 'lose' ? 1 : 0);
  ws.draws = (ws.draws || 0) + (result === 'draw' ? 1 : 0);
  saveWeaponStats(weapon, ws);

  // History
  addHistoryEntry(result, diff, weapon, playerPts, botPts);

  // Check SUN achievements
  checkSunAchievements();

  // NEU: Adaptive Bot System - Spiel aufzeichnen
  if (typeof AdaptiveBotSystem !== 'undefined' && AdaptiveBotSystem.isEnabled()) {
    AdaptiveBotSystem.trackGame(playerPts, botPts, G.discipline, diff, weapon);
  }

  // NEU: Erweiterte Analytics - Spiel-Daten hinzufügen
  if (typeof EnhancedAnalytics !== 'undefined') {
    // XP berechnen (nur bei Sieg)
    const earnedXP = (result === 'win' && !G?.dnf) ? (XP_PER_WIN[diff] || 10) : 0;

    const gameData = {
      result: result,
      playerScore: playerPts,
      botScore: botPts,
      scoreDifference: playerPts - botPts,
      discipline: G.discipline,
      disciplineName: DISC[G.discipline]?.name || G.discipline,
      weapon: weapon,
      difficulty: diff,
      xpEarned: earnedXP, // NEU: XP speichern
      shots: G.playerShots || [], // Spieler-Schüsse falls verfügbar
      shotsLeft: G.playerShotsLeft,
      maxDeficit: Math.max(0, botPts - playerPts), // Größter Rückstand
      duration: Math.floor((Date.now() - G._gameStartTime) / 1000), // Spieldauer in Sek.
      timestamp: Date.now()
    };

    EnhancedAnalytics.addGameData(gameData);

    // NEU: Daily Challenge Fortschritt tracken
    if (typeof DailyChallenge !== 'undefined') {
      const stats = {
        currentStreak: G.streak || 0,
        gamesPlayed: (gs.wins || 0) + (gs.losses || 0) + (gs.draws || 0)
      };
      DailyChallenge.trackGame(gameData, stats);
    }

    // StreakTracker: 1 Duell = +1 Streak (Mo-Fr ab 12:00)
    if (typeof StreakTracker !== 'undefined') {
      const streakResult = StreakTracker.recordGame();
      if (streakResult.streakIncreased && streakResult.milestone) {
        console.debug('[Streak] Milestone erreicht:', streakResult.milestone);
      }
    }

    // NEU: Adaptive Bot - Spieler-Schwächen analysieren
    if (typeof AdaptiveBotSystem !== 'undefined' && G.playerShots.length > 0) {
      // Gruppierung für den Spieler berechnen
      const grouping = calculateGrouping(G.playerShots);
      AdaptiveBotSystem.trackPlayerResult(grouping);
    }
  }

  // NEU: Haptisches Feedback bei wichtigen Ereignissen
  if (typeof MobileFeatures !== 'undefined') {
    if (result === 'win') {
      MobileFeatures.hapticHit();
    } else if (result === 'lose') {
      MobileFeatures.hapticMiss();
    }

    // Bei neuen Rekorden oder besonderen Leistungen
    const bestLG = parseInt(localStorage.getItem('sd_lg_best') || '0') || 0;
    const bestKK = parseInt(localStorage.getItem('sd_kk_best') || '0') || 0;
    const personalBest = Math.max(bestLG, bestKK);
    if (playerPts > personalBest) {
      MobileFeatures.hapticAchievement();
    }
  }

  // Auto-Sync zu Firebase nach jedem Spiel (Streak + Stats aktuell halten)
  // Kleines Delay damit updateWinStreak() zuerst den Cache aktualisiert
  setTimeout(() => pushProfileToFirebase(), 300);
}

function calculateGrouping(shots) {
  if (!shots || shots.length === 0) return null;
  let totalX = 0, totalY = 0;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

  shots.forEach(s => {
    totalX += s.dx;
    totalY += s.dy;
    if (s.dx < minX) minX = s.dx;
    if (s.dx > maxX) maxX = s.dx;
    if (s.dy < minY) minY = s.dy;
    if (s.dy > maxY) maxY = s.dy;
  });

  const centerX = totalX / shots.length;
  const centerY = totalY / shots.length;
  let totalDist = 0;
  shots.forEach(s => {
    const dx = s.dx - centerX;
    const dy = s.dy - centerY;
    totalDist += Math.sqrt(dx * dx + dy * dy);
  });

  return {
    extremeSpread: Math.sqrt(Math.pow(maxX - minX, 2) + Math.pow(maxY - minY, 2)),
    meanRadius: totalDist / shots.length,
    centerOffsetX: centerX,
    centerOffsetY: centerY
  };
}

/* ─── HISTORY ────────────────────────────── */
function buildHistoryEntry(result, diff, weapon, playerPts, botPts) {
  const DIFF_NAMES = { easy: 'Einfach', real: 'Mittel', hard: 'Elite', elite: 'Profi' };
  const WEAPON_NAMES = { lg: 'Luftgewehr', kk: 'Kleinkaliber' };
  const timestamp = Date.now();
  const discipline = G.discipline || 'unknown';

  return {
    id: `${timestamp}_${discipline}_${result}`,
    timestamp,
    result,
    diff,
    weapon,
    discipline,
    disciplineName: DISC[discipline]?.name || discipline,
    playerPts,
    botPts,
    diffName: DIFF_NAMES[diff] || diff,
    weaponName: WEAPON_NAMES[weapon] || weapon,
    date: new Date(timestamp).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
  };
}

function addHistoryEntry(result, diff, weapon, playerPts, botPts) {
  try {
    const hist = StorageManager.get('history', []);
    if (!Array.isArray(hist)) return;
    const historyEntry = buildHistoryEntry(result, diff, weapon, playerPts, botPts);
    hist.unshift(historyEntry);
    if (hist.length > 30) hist.splice(30);
    StorageManager.set('history', hist);
    scheduleCloudSync('history_changed');
    return historyEntry;
  } catch (e) { console.warn('[History] History-Eintrag speichern fehlgeschlagen:', e.message); }
  return null;
}


/* ════ PREMIUM DASHBOARD DATA BINDING ════ */
function refreshPremiumDashboard() {
  // 1. Greeting Name
  const username = StorageManager.getRaw('username') || "";
  const pdUserName = document.getElementById('pdUserName');
  if (pdUserName && username) pdUserName.innerText = username;

  const pdProfileInitial = document.getElementById('pdProfileInitial');
  if (pdProfileInitial && username) pdProfileInitial.innerText = username.charAt(0).toUpperCase();

  // 2. Score & XP
  const xp = StorageManager.get('xp', 0);

  // ══ XP PROGRESS BAR RENDERING ══
  const xpBarContainer = document.getElementById('pdXPBarContainer');
  if (xpBarContainer) {
    const rankInfo = getRank(xp);
    const curRank = rankInfo.rank;
    const nextRank = RANKS[rankInfo.idx + 1] || curRank;

    let pct = 0;
    let xpDiff = xp - curRank.min;
    let range = (nextRank.min === curRank.min) ? 1000 : (nextRank.min - curRank.min);
    if (nextRank !== curRank) {
      pct = Math.min(100, Math.max(0, (xpDiff / range) * 100));
    } else {
      pct = 100; // Legende
    }

    xpBarContainer.innerHTML = `
      <div style="background:linear-gradient(145deg, rgba(255,255,255,0.05) 0%, rgba(20,25,30,0.6) 100%); backdrop-filter:blur(20px); border:1px solid rgba(255,255,255,0.1); border-radius:18px; padding:16px; box-shadow:0 8px 32px rgba(0,0,0,0.4);">
        <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:10px;">
          <div>
            <div style="font-size:0.75rem; color:rgba(255,255,255,0.4); font-weight:600; letter-spacing:0.05em; margin-bottom:4px;">RANG FORTSCHRITT</div>
            <div style="font-size:1.1rem; font-weight:700; color:#fff;">${curRank.icon} ${curRank.name}</div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:0.9rem; font-weight:700; color:#7ab030;">${xp} <span style="font-size:0.7rem; color:rgba(255,255,255,0.4); font-weight:500;">/ ${nextRank.min === Infinity ? '∞' : nextRank.min} XP</span></div>
          </div>
        </div>
        <div style="height:10px; background:rgba(255,255,255,0.08); border-radius:5px; overflow:hidden; position:relative; box-shadow:inset 0 1px 3px rgba(0,0,0,0.3);">
          <div style="height:100%; width:${pct}%; background:linear-gradient(90deg, #7ab030, #a0d84a); border-radius:5px; transition:width 1s cubic-bezier(0.4, 0, 0.2, 1); box-shadow:0 0 12px rgba(122,176,48,0.5);"></div>
        </div>
      </div>
    `;
  }

  const statScore = document.querySelector('.pd-stats-row .pd-stat-val[style*="color:var(--accent)"]');
  if (statScore) statScore.innerText = xp + ' XP';

  // 3. Stats Today (EnhancedAnalytics)
  let hits = 0;
  let accSum = 0;
  let count = 0;
  let historyV2 = [];
  try {
    const analytics = JSON.parse(localStorage.getItem('sd_enhanced_analytics') || '{}');
    historyV2 = Array.isArray(analytics.games) ? analytics.games : [];
  } catch (e) { console.warn('[Analytics] Analytics-Daten laden fehlgeschlagen:', e.message); }

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  historyV2.forEach(game => {
    if (game.timestamp && game.timestamp >= startOfDay.getTime()) {
      if (game.shotsLeft && game.shotsLeft < 40) {
        const shotsFired = 40 - game.shotsLeft;
        hits += shotsFired;
      } else if (game.shots) {
        hits += game.shots.length;
      } else {
        hits += 40; // Default fallback if finished
      }
      if (game.playerPts > 0) {
        const pts = game.playerPts;
        count++;
        accSum += (pts / 40);
      }
    }
  });

  // HIDE OVERVIEW UNTIL FIRST DUEL
  const overviewHeader = document.getElementById('pdOverviewHeader');
  const mainStatsRow = document.getElementById('pdMainStatsRow');
  const recentListHeader = document.getElementById('pdRecentListHeader');
  const recentList = document.getElementById('pdRecentList');

  if (historyV2.length === 0) {
    if (overviewHeader) overviewHeader.style.display = 'none';
    if (mainStatsRow) mainStatsRow.style.display = 'none';
    if (recentListHeader) recentListHeader.style.display = 'none';
    if (recentList) recentList.style.display = 'none';
  } else {
    if (overviewHeader) overviewHeader.style.display = 'block';
    if (mainStatsRow) mainStatsRow.style.display = 'flex';
    if (recentListHeader) recentListHeader.style.display = 'block';
    if (recentList) recentList.style.display = 'flex';
  }

  const statHits = document.querySelector('.pd-stats-row > div:nth-child(1) .pd-stat-val');
  if (statHits) statHits.innerHTML = hits + ' <span style="font-size:0.7em;color:var(--text-muted)">Schuss</span>';

  const statAcc = document.querySelector('.pd-stats-row > div:nth-child(2) .pd-stat-val');
  if (count > 0 && statAcc) {
    statAcc.innerText = (accSum / count).toFixed(1) + ' Ø';
  } else if (statAcc) {
    statAcc.innerText = '- Ø';
  }

  // 4.5. Side Metrics (Streak & Games Today)
  const pdCurLG = Number(localStorage.getItem('sd_lg_streak') || 0) || 0;
  const pdCurKK = Number(localStorage.getItem('sd_kk_streak') || 0) || 0;
  const pdCurLegacy = Number(localStorage.getItem('sd_win_streak') || 0) || 0;
  const pdCurAll = Math.max(pdCurLG, pdCurKK, pdCurLegacy);
  const elSideStreak = document.getElementById('pdSideStreak');
  if (elSideStreak) elSideStreak.innerText = pdCurAll > 0 ? '🔥 ' + pdCurAll : '🔥 0';
  const elSideStreakBar = document.getElementById('pdSideStreakBar');
  if (elSideStreakBar) elSideStreakBar.style.width = Math.min(pdCurAll * 10, 100) + '%';

  // StreakTracker Integration – Dashboard aktualisieren
  if (typeof StreakTracker !== 'undefined') {
    const stats = StreakTracker.getStreakStats();
    const elSideStreak = document.getElementById('pdSideStreak');
    if (elSideStreak && stats.current > 0) {
      elSideStreak.innerText = '🔥 ' + stats.current;
    }
    if (elSideStreakBar && stats.current > 0) {
      elSideStreakBar.style.width = Math.min(stats.current * 10, 100) + '%';
    }
  }

  let gamesTodayCount = historyV2.filter(g => g.timestamp && g.timestamp >= startOfDay.getTime()).length;
  const elSideGamesToday = document.getElementById('pdSideGamesToday');
  if (elSideGamesToday) elSideGamesToday.innerText = gamesTodayCount;
  const elSideGamesTodayBar = document.getElementById('pdSideGamesTodayBar');
  if (elSideGamesTodayBar) elSideGamesTodayBar.style.width = Math.min(gamesTodayCount * 10, 100) + '%';

  // 4.6. Calculate and display statistics (Siege, Siegquote, Gesamt XP)
  // NUR die letzten 3 Duelle zählen für diese Statistiken
  const sortedForStats = [...historyV2].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  const latest3ForStats = sortedForStats.slice(0, 3);

  const totalWins = latest3ForStats.filter(g => g.result === 'win' || g.result === 'Sieg').length;
  const totalGames = latest3ForStats.length;
  const winRate = totalGames > 0 ? ((totalWins / totalGames) * 100).toFixed(0) : 0;

  // Gesamt XP: Nur aus den letzten 3 Duellen
  const totalXP = latest3ForStats.reduce((sum, g) => {
    // Verwende gespeichertes xpEarned falls vorhanden, sonst berechne es
    if (Number.isFinite(g.xpEarned)) {
      return sum + g.xpEarned;
    }
    // Fallback für alte Einträge
    const isWin = g.result === 'win' || g.result === 'Sieg';
    if (!isWin) return sum; // Niederlage = 0 XP
    const diff = g.difficulty || 'easy';
    const xpGained = XP_PER_WIN[diff] || 10;
    return sum + xpGained;
  }, 0);

  const elPdStatWins = document.getElementById('pdStatWins');
  if (elPdStatWins) elPdStatWins.innerText = totalWins;

  const elPdStatWinrate = document.getElementById('pdStatWinrate');
  if (elPdStatWinrate) elPdStatWinrate.innerText = totalGames > 0 ? winRate + '%' : '–';

  const elPdStatScore = document.getElementById('pdStatScore');
  if (elPdStatScore) elPdStatScore.innerText = totalXP + ' XP';

  // ══ 4. DYNAMISCHE ERFOLGS-BADGES ══
  const badgesGrid = document.getElementById('pdBadgesGrid');
  if (badgesGrid && typeof EnhancedAchievements !== 'undefined') {
    const overview = EnhancedAchievements.getAchievementOverview();
    const allAchievements = EnhancedAchievements.ACHIEVEMENTS || {};
    const achievementKeys = Object.keys(allAchievements);

    // Wähle die 4 interessantesten Badges aus:
    // 1. Höchstes freigeschaltetes Achievement
    // 2. Nächstes kurz vor dem Abschluss stehendes
    // 3. Streak-basiertes Achievement
    // 4. Präzisions-basiertes Achievement

    const unlockedAchievements = achievementKeys
      .filter(key => {
        const prog = JSON.parse(localStorage.getItem('sd_enhanced_achievements') || '{}');
        return prog[allAchievements[key].id]?.unlocked;
      })
      .map(key => allAchievements[key]);

    const lockedAchievements = achievementKeys
      .filter(key => {
        const prog = JSON.parse(localStorage.getItem('sd_enhanced_achievements') || '{}');
        return !prog[allAchievements[key].id]?.unlocked;
      })
      .map(key => allAchievements[key]);

    // Badge-Auswahl: max. 2 freigeschaltete + 2 gesperrte (Fortschritt anzeigen)
    const displayBadges = [
      ...unlockedAchievements.slice(0, 2),
      ...lockedAchievements.slice(0, 2)
    ];

    // Falls weniger als 4 Achievements vorhanden, mit Platzhaltern auffüllen
    while (displayBadges.length < 4) {
      displayBadges.push({
        icon: '🔒',
        name: 'Noch nicht\nfreigeschaltet',
        description: 'Spiele mehr Duelle',
        xp: 0,
        tier: 1,
        category: 'locked'
      });
    }

    const badgeColors = {
      streak: { bg: 'rgba(122,176,48,0.12)', border: 'rgba(122,176,48,0.25)', top: 'rgba(122,176,48,0.4)', text: '#7ab030', glow: 'rgba(122,176,48,0.2)' },
      precision: { bg: 'rgba(0,195,255,0.12)', border: 'rgba(0,195,255,0.25)', top: 'rgba(0,195,255,0.4)', text: '#00c3ff', glow: 'rgba(0,195,255,0.2)' },
      comeback: { bg: 'rgba(255,107,53,0.12)', border: 'rgba(255,107,53,0.25)', top: 'rgba(255,107,53,0.4)', text: '#ff6b35', glow: 'rgba(255,107,53,0.2)' },
      consistency: { bg: 'rgba(156,39,176,0.12)', border: 'rgba(156,39,176,0.25)', top: 'rgba(156,39,176,0.4)', text: '#9c27b0', glow: 'rgba(156,39,176,0.2)' },
      specialization: { bg: 'rgba(255,215,0,0.12)', border: 'rgba(255,215,0,0.25)', top: 'rgba(255,215,0,0.4)', text: '#ffd700', glow: 'rgba(255,215,0,0.2)' },
      speed: { bg: 'rgba(255,152,0,0.12)', border: 'rgba(255,152,0,0.25)', top: 'rgba(255,152,0,0.4)', text: '#ff9800', glow: 'rgba(255,152,0,0.2)' },
      locked: { bg: 'rgba(255,255,255,0.06)', border: 'rgba(255,255,255,0.08)', top: 'rgba(255,255,255,0.15)', text: 'rgba(255,255,255,0.4)', glow: 'transparent' }
    };

    badgesGrid.innerHTML = displayBadges.map((badge, idx) => {
      const isUnlocked = unlockedAchievements.includes(badge);
      const colors = badgeColors[badge.category] || badgeColors.locked;
      const nameLines = badge.name.length > 12
        ? badge.name.substring(0, 12).split(' ').slice(0, -1).join('<br>') + '<br>' + badge.name.substring(12).split(' ').slice(1).join(' ')
        : badge.name.replace(/ /g, '<br>');
      const progressText = isUnlocked
        ? 'Freigeschaltet'
        : `+${badge.xp} XP`;

      return `
        <div style="background:linear-gradient(145deg, ${colors.bg} 0%, rgba(20,25,30,0.7) 100%);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);border:1px solid ${colors.border};border-top:1px solid ${colors.top};border-radius:14px;padding:12px 6px;text-align:center;box-shadow:0 6px 20px rgba(0,0,0,0.3), inset 0 1px 1px ${colors.glow};${!isUnlocked ? 'opacity:0.6;' : ''}">
          <div style="font-size:1.7rem;margin-bottom:5px;${!isUnlocked ? 'filter:grayscale(1);' : ''}">${badge.icon}</div>
          <div style="font-size:0.62rem;font-weight:600;color:#fff;line-height:1.15;margin-bottom:3px;">${nameLines}</div>
          <div style="font-size:0.58rem;color:${colors.text};font-weight:500;">${progressText}</div>
        </div>
      `;
    }).join('');
  } else if (badgesGrid) {
    // Fallback wenn EnhancedAchievements nicht verfügbar
    badgesGrid.innerHTML = `
      <div style="background:linear-gradient(145deg, rgba(122,176,48,0.12) 0%, rgba(20,25,30,0.7) 100%);backdrop-filter:blur(16px);border:1px solid rgba(122,176,48,0.25);border-radius:14px;padding:12px 6px;text-align:center;">
        <div style="font-size:1.7rem;margin-bottom:5px;">🎯</div>
        <div style="font-size:0.62rem;font-weight:600;color:#fff;">Spiele ein<br>Duell</div>
        <div style="font-size:0.58rem;color:#7ab030;">Erste Erfolge</div>
      </div>
    `.repeat(4);
  }

  // ══ 5. STREAK-BANNER MIT ECHTEN DATEN + COUNTDOWN ══
  const streakBanner = document.getElementById('streakBanner');
  if (streakBanner && typeof DailyChallenge !== 'undefined') {
    const dailyState = DailyChallenge.getState ? DailyChallenge.getState() : null;
    const streakCount = dailyState?.streak || 0;
    const allCompleted = dailyState?.challenges?.every(c => c.completed) || false;
    const claimed = dailyState?.toolboxDroppedForDate === dailyState?.dateId || false;

    let streakColor1 = '#ff6b35';
    let streakColor2 = '#ff9500';
    let streakIcon = '🔥';
    let streakLabel = 'Tages-Streak';

    if (streakCount >= 14) {
      streakColor1 = '#ffd700'; streakColor2 = '#ffaa00'; streakIcon = '👑'; streakLabel = 'Meister-Streak';
    } else if (streakCount >= 7) {
      streakColor1 = '#7ab030'; streakColor2 = '#a0d84a'; streakIcon = '⚡'; streakLabel = 'Wochen-Streak';
    } else if (streakCount >= 3) {
      streakColor1 = '#00c3ff'; streakColor2 = '#7ab030'; streakIcon = '🔥'; streakLabel = 'Aufbau-Streak';
    }

    // Countdown bis Reset
    const now = new Date();
    const nextMidnight = new Date(now);
    nextMidnight.setHours(24, 0, 0, 0);
    const msLeft = Math.max(0, nextMidnight.getTime() - now.getTime());
    const minsLeft = Math.floor(msLeft / 60000);
    const hLeft = Math.floor(minsLeft / 60);
    const mLeft = minsLeft % 60;
    const countdownStr = `${String(hLeft).padStart(2, '0')}:${String(mLeft).padStart(2, '0')}`;

    const streakPct = Math.min(streakCount * 10, 100);

    streakBanner.innerHTML = `
      <div style="background:linear-gradient(145deg, rgba(45,50,55,0.35) 0%, rgba(10,12,15,0.7) 100%);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,0.06);border-radius:14px;padding:14px 16px;box-shadow:0 6px 20px rgba(0,0,0,0.4);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <div style="display:flex;align-items:center;gap:10px;">
            <div style="font-size:1.8rem;">${streakIcon}</div>
            <div>
              <div style="font-size:0.65rem;color:rgba(255,255,255,0.4);font-weight:600;letter-spacing:0.05em;">${streakLabel.toUpperCase()}</div>
              <div style="font-size:1.3rem;font-weight:700;color:#fff;">${streakCount} Tage</div>
            </div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:0.6rem;color:rgba(255,255,255,0.35);margin-bottom:2px;">Reset in</div>
            <div style="font-size:0.9rem;font-weight:600;color:rgba(255,255,255,0.6);font-variant-numeric:tabular-nums;" id="streakCountdownTimer">${countdownStr}</div>
          </div>
        </div>
        <div style="height:4px;background:rgba(255,255,255,0.08);border-radius:4px;overflow:hidden;">
          <div style="height:100%;width:${streakPct}%;background:linear-gradient(90deg,${streakColor1},${streakColor2});border-radius:4px;transition:width 0.5s ease;"></div>
        </div>
        ${allCompleted && claimed ? '<div style="font-size:0.6rem;color:#7ab030;margin-top:6px;text-align:center;">✅ Heute alle Missionen erfüllt!</div>' : ''}
      </div>
    `;
  }

  // StreakProgressBar aktualisieren
  const streakProgressBar = document.getElementById('streakProgressBar');
  if (streakProgressBar) {
    const dailyState2 = typeof DailyChallenge !== 'undefined' && DailyChallenge.getState ? DailyChallenge.getState() : null;
    const streakCount2 = dailyState2?.streak || 0;
    const streakPct2 = Math.min(streakCount2 * 10, 100);
    const inner = streakProgressBar.querySelector('div');
    if (inner) inner.style.width = streakPct2 + '%';
  }

  // 6. Last 3 Duels dynamic rendering
  const last3Container = document.getElementById('pdLast3Duels');
  if (last3Container && historyV2.length > 0) {
    // historyV2 is already sorted or we sort it here to be safe
    const sorted = [...historyV2].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    const latest3 = sorted.slice(0, 3);

    let l3Html = '';
    latest3.forEach(game => {
      const isWin = game.result === 'win' || game.result === 'Sieg';
      const color = isWin ? '#7ab030' : '#f06050';
      const label = escHtml(isWin ? '✓ Sieg' : '✗ Niederlage');
      const diff = escHtml(game.difficulty || 'Mittel');

      // Disziplin-Name korrekt auflösen: "LG 40", "LG 60", "KK 50m", "KK 100m", "KK 3×20"
      let displayDisc = '';
      if (game.discipline && DISC[game.discipline]) {
        displayDisc = DISC[game.discipline].name;
      } else if (game.disciplineName) {
        displayDisc = escHtml(game.disciplineName);
      } else {
        // Fallback: Versuche aus weapon + shotsCount zu rekonstruieren
        const weapon = (game.weapon || 'lg').toLowerCase();
        const shotsCount = game.shotsCount || 40;
        let discKey = `${weapon}${shotsCount}`;
        
        // Spezielle Fälle für KK
        if (weapon === 'kk' && shotsCount === 60) {
          // Standard ist KK 50m, aber wir prüfen auch auf 100m
          discKey = 'kk50';
        }
        
        if (DISC[discKey]) {
          displayDisc = DISC[discKey].name;
        } else {
          // Letzter Fallback
          const weaponUpper = weapon.toUpperCase();
          displayDisc = `${weaponUpper} ${shotsCount}`;
        }
      }

      // XP anzeigen - verwende gespeichertes xpEarned falls vorhanden
      let xpText = '';
      if (Number.isFinite(game.xpEarned)) {
        // Verwende gespeicherte XP
        xpText = game.xpEarned > 0 ? `+${game.xpEarned} XP` : '0 XP';
      } else {
        // Fallback für alte Einträge
        if (isWin) {
          const xpGained = XP_PER_WIN[diff] || 10;
          xpText = `+${xpGained} XP`;
        } else {
          xpText = '0 XP';
        }
      }

      l3Html += `
        <div style="display:flex;flex-direction:column;gap:4px;padding:8px 10px;background:rgba(255,255,255,0.03);border-radius:10px;border-left:3px solid ${color};">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <div><span style="color:#fff;font-weight:500;font-size:0.8rem;">${displayDisc}</span> <span style="font-size:0.65rem;color:rgba(255,255,255,0.35);">${diff}</span></div>
            <div style="font-size:0.75rem;font-weight:600;color:${color};">${label}</div>
          </div>
          <div style="font-size:0.65rem;font-weight:500;color:rgba(255,255,255,0.5);">${xpText}</div>
        </div>
      `;
    });
    last3Container.innerHTML = l3Html;
  } else if (last3Container) {
    last3Container.innerHTML = `<div style="padding:10px; text-align:center; color:rgba(255,255,255,0.2); font-size:0.75rem;">Noch keine Duelle absolviert</div>`;
  }

  // ══ DAILY MISSIONS RENDERING ══
  const questsContainer = document.getElementById('pdQuestsContainer');
  if (questsContainer) {
    let dailyState = { challenges: [] };
    try {
      const stored = localStorage.getItem('sd_daily_challenge');
      if (stored) dailyState = JSON.parse(stored);
    } catch (e) { console.warn('[Daily] Daily-Challenge laden fehlgeschlagen:', e.message); }

    let questHtml = `
      <div style="font-size:1.05rem; font-weight:600; color:#fff; margin-bottom:12px; display:flex; justify-content:space-between; align-items:center;">
        <span>Tägliche Missionen</span>
        <span style="font-size:0.7rem; color:rgba(255,255,255,0.4); font-weight:400;">Resets um 00:00</span>
      </div>
      <div style="background:linear-gradient(145deg, rgba(30,35,40,0.5) 0%, rgba(10,12,15,0.8) 100%); backdrop-filter:blur(20px); border:1px solid rgba(255,255,255,0.08); border-radius:18px; padding:6px; box-shadow:0 12px 40px rgba(0,0,0,0.5);">
    `;

    if (Array.isArray(dailyState.challenges) && dailyState.challenges.length > 0) {
      dailyState.challenges.forEach((c, idx) => {
        let icon = '🎯';
        if (c.id.includes('win')) icon = '🥇';
        else if (c.id.includes('play')) icon = '🔫';
        else if (c.id.includes('score')) icon = '⭐';
        else if (c.id.includes('shot')) icon = '⚡';

        let desc = "Mission wird geladen...";
        let target = 1;
        if (typeof DailyChallenge !== 'undefined' && typeof DailyChallenge.getChallengeRef === 'function') {
          const ref = DailyChallenge.getChallengeRef(c.id);
          if (ref) {
            desc = ref.desc;
            target = ref.target;
          }
        }

        const isLast = idx === dailyState.challenges.length - 1;
        const pct = Math.min(100, Math.floor((c.progress / target) * 100));

        questHtml += `
          <div style="display:flex; align-items:center; gap:14px; padding:12px 14px; ${!isLast ? 'border-bottom:1px solid rgba(255,255,255,0.05);' : ''}">
            <div style="width:40px; height:40px; border-radius:10px; background:rgba(255,255,255,0.05); display:flex; align-items:center; justify-content:center; font-size:1.4rem; flex-shrink:0;">
              ${c.completed ? '✅' : icon}
            </div>
            <div style="flex:1;">
              <div style="font-size:0.82rem; font-weight:500; color:${c.completed ? 'rgba(255,255,255,0.5)' : '#fff'}; margin-bottom:6px; line-height:1.3;">
                ${desc}
              </div>
              <div style="height:4px; background:rgba(255,255,255,0.08); border-radius:2px; overflow:hidden;">
                <div style="height:100%; width:${pct}%; background:${c.completed ? '#7ab030' : 'linear-gradient(90deg, #00c3ff, #0088ff)'}; border-radius:2px; transition:width 0.8s ease;"></div>
              </div>
            </div>
            <div style="font-size:0.75rem; font-weight:700; color:${c.completed ? '#7ab030' : 'rgba(255,255,255,0.3)'}; min-width:35px; text-align:right;">
              ${c.completed ? 'ERLEDIGT' : c.progress + '/' + target}
            </div>
          </div>
        `;
      });
    } else {
      questHtml += `
        <div style="padding:20px; text-align:center; color:rgba(255,255,255,0.4); font-size:0.85rem;">
          Aktuell keine Missionen verfügbar. Starte ein Duell!
        </div>
      `;
    }

    questHtml += `</div>`;
    questsContainer.innerHTML = questHtml;
  }

  // 5. Recent Sessions List
  if (recentList && historyV2.length > 0) {
    let listHtml = '';
    const recentGames = historyV2.slice(Math.max(historyV2.length - 2, 0)).reverse();
    recentGames.forEach(game => {
      const diff = escHtml(game.difficulty || 'Mittel');

      // Disziplin-Name korrekt auflösen (gleiche Logik wie oben)
      let displayDisc = '';
      if (game.discipline && DISC[game.discipline]) {
        displayDisc = DISC[game.discipline].name;
      } else if (game.disciplineName) {
        displayDisc = escHtml(game.disciplineName);
      } else {
        const weapon = (game.weapon || 'lg').toLowerCase();
        const shotsCount = game.shotsCount || 40;
        let discKey = `${weapon}${shotsCount}`;
        if (weapon === 'kk' && shotsCount === 60) discKey = 'kk50';
        if (DISC[discKey]) {
          displayDisc = DISC[discKey].name;
        } else {
          displayDisc = `${weapon.toUpperCase()} ${shotsCount}`;
        }
      }
      let timeAgo = "Kürzlich";
      if (game.timestamp) {
        const mins = Math.floor((Date.now() - game.timestamp) / 60000);
        if (mins < 60) timeAgo = 'vor ' + mins + ' Min.';
        else if (mins < 1440) timeAgo = 'vor ' + Math.floor(mins / 60) + ' Std.';
        else timeAgo = 'vor ' + Math.floor(mins / 1440) + ' Tg.';
      }
      listHtml += `
            <div class="pd-recent-item">
              <div><span style="color:var(--text-main);font-weight:500;">${displayDisc}</span> <span style="color:var(--text-muted);font-size:0.8rem;">(${game.playerPts || 0} Ring)</span></div>
              <div style="color:var(--text-dim);font-size:0.8rem;">${timeAgo}</div>
            </div>`;
    });
    recentList.innerHTML = listHtml;
  }
}

function renderHistory() {
  const el = document.getElementById('psHistoryList');
  if (!el) return;
  try {
    const hist = JSON.parse(localStorage.getItem('sd_history') || '[]');
    if (hist.length === 0) {
      el.innerHTML = '<div class="ps-history-empty">Noch keine Duelle gespeichert.<br>Spiel ein Duell, um den Verlauf zu sehen!</div>';
      return;
    }
    el.innerHTML = hist.map(h => {
      const resLabel = h.result === 'win' ? 'S' : h.result === 'lose' ? 'N' : 'U';
      const pPts = h.playerPts !== null ? parseFloat(h.playerPts).toFixed(1) : '–';
      const bPts = h.botPts !== null ? parseFloat(h.botPts).toFixed(1) : '–';
      const weaponUpper = (h.weapon || (h.weaponName === 'Luftgewehr' ? 'lg' : h.weaponName === 'Kleinkaliber' ? 'kk' : h.weaponName) || 'LG').toUpperCase();
      let discUpper = escHtml((h.disciplineName || h.discipline || '').toString().toUpperCase());
      if (discUpper.startsWith(weaponUpper)) {
        discUpper = discUpper.substring(weaponUpper.length).trim();
      }
      const finalTitle = `${weaponUpper} ${discUpper} · ${escHtml(h.diffName || h.diff || 'Mittel')}`;

      return `<div class="ps-history-item">
            <div class="phi-result ${escHtml(h.result)}">${resLabel}</div>
            <div class="phi-info">
              <div class="phi-title">${finalTitle}</div>
              <div class="phi-sub">${escHtml(h.date)}</div>
            </div>
            <div class="phi-score ${escHtml(h.result)}">${pPts} <span style="opacity:.4;font-size:.7em">vs</span> ${bPts}</div>
          </div>`;
    }).join('');
  } catch (e) {
    el.innerHTML = '<div class="ps-history-empty">Verlauf konnte nicht geladen werden.</div>';
  }
}

/* ─── SUN SYSTEM ─────────────────────────── */
/* ─── LEISTUNGSKURVE (Chart.js) ─────────────────────────────────────── */
let _perfChart = null;   // Chart.js Instanz (wird bei jedem Redraw zerstört)
let _perfWeapon = 'lg';   // aktiver Toggle: 'lg' | 'kk'

function setPerfWeapon(w) {
  _perfWeapon = w;
  document.getElementById('perfToggleLG')?.classList.toggle('active', w === 'lg');
  document.getElementById('perfToggleKK')?.classList.toggle('active', w === 'kk');
  renderPerformanceChart();
}

// Datum-String aus sd_history → kurzes "DD.MM." Format
function _fmtChartDate(raw) {
  if (!raw) return '?';
  // Format aus addHistoryEntry: "12.02., 14:30" oder "12.2.2026, 14:30"
  // Wir wollen nur "12.02."
  const m = raw.match(/^(\d{1,2})\.(\d{1,2})/);
  if (m) return m[1].padStart(2, '0') + '.' + m[2].padStart(2, '0') + '.';
  return raw.slice(0, 6);
}

function renderPerformanceChart() {
  const canvas = document.getElementById('perfChart');
  const emptyEl = document.getElementById('perfChartEmpty');
  if (!canvas) return;

  // Immer alten Chart zerstören – verhindert Overlay-Bugs bei Resize/Toggle
  if (_perfChart) { _perfChart.destroy(); _perfChart = null; }

  // Daten laden, filtern, auf 15 begrenzen, älteste links
  let hist = [];
  try { hist = JSON.parse(localStorage.getItem('sd_history') || '[]'); } catch (e) { console.warn('[History] History laden fehlgeschlagen:', e.message); }

  const filtered = hist
    .filter(h => h.weapon === _perfWeapon && h.playerPts !== null)
    .slice(0, 15)
    .reverse();

  // Empty-State — zeige auch wenn keine Daten, aber mit Hinweis
  if (filtered.length === 0) {
    canvas.style.display = 'none';
    if (emptyEl) {
      emptyEl.style.display = 'flex';
      // Zeige ob überhaupt History-Daten vorhanden sind
      const totalHist = hist.length;
      const otherWeapon = _perfWeapon === 'lg' ? 'KK' : 'LG';
      const otherCount = hist.filter(h => h.weapon !== _perfWeapon && h.playerPts !== null).length;
      emptyEl.innerHTML = totalHist === 0
        ? 'Noch keine Daten.<br><span style="font-size:.6rem;opacity:.5;">Spiel ein Duell und gib dein Ergebnis ein!</span>'
        : `Keine ${_perfWeapon.toUpperCase()}-Daten.<br><span style="font-size:.6rem;opacity:.5;">${otherCount} ${otherWeapon}-Einträge vorhanden → Toggle wechseln</span>`;
    }
    return;
  }
  canvas.style.display = '';
  if (emptyEl) emptyEl.style.display = 'none';

  const isKK = _perfWeapon === 'kk';
  const accent = isKK ? '#f0c840' : '#7ab030';
  const accentRgb = isKK ? '240,200,64' : '122,176,48';

  // Werte: KK = Ganzzahl, LG = eine Nachkommastelle
  const labels = filtered.map(h => _fmtChartDate(h.date));
  const values = filtered.map(h =>
    isKK ? Math.round(parseFloat(h.playerPts))
      : Math.round(parseFloat(h.playerPts) * 10) / 10
  );

  // Sinnvolle Y-Achsen-Grenzen
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const pad = Math.max((maxVal - minVal) * 0.15, isKK ? 3 : 2);
  const yMin = Math.floor(minVal - pad);
  const yMax = Math.ceil(maxVal + pad);

  // Gewinn/Verlust-Punkt-Farben
  const pointColors = filtered.map(h => {
    if (h.result === 'win') return '#7ab030';
    if (h.result === 'lose') return '#f06050';
    return accent;
  });

  // Gradient-Fill — feste Höhe 160 damit er auch vor erstem Paint funktioniert
  let ctx2d;
  try {
    ctx2d = canvas.getContext('2d');
  } catch (e) {
    console.warn('[Chart] Canvas getContext fehlgeschlagen:', e.message);
    canvas.style.display = 'none';
    if (emptyEl) {
      emptyEl.style.display = 'flex';
      emptyEl.innerHTML = 'Chart nicht verfügbar.<br><span style="font-size:.6rem;opacity:.5;">Chart.js konnte nicht geladen werden.</span>';
    }
    return;
  }
  const boxH = canvas.parentElement?.offsetHeight || 160;
  const grad = ctx2d.createLinearGradient(0, 0, 0, boxH);
  grad.addColorStop(0, `rgba(${accentRgb},.22)`);
  grad.addColorStop(1, `rgba(${accentRgb},0)`);

  try {
  _perfChart = new Chart(ctx2d, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: isKK ? 'KK (Ringe)' : 'LG (Zehntel)',
        data: values,
        borderColor: accent,
        borderWidth: 2.5,
        pointBackgroundColor: pointColors,
        pointBorderColor: 'rgba(0,0,0,.4)',
        pointBorderWidth: 1,
        pointRadius: 5,
        pointHoverRadius: 7,
        pointHoverBorderWidth: 2,
        fill: true,
        backgroundColor: grad,
        tension: 0.38,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 400, easing: 'easeOutQuart' },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(8,16,4,.95)',
          borderColor: accent,
          borderWidth: 1,
          titleColor: 'rgba(255,255,255,.45)',
          bodyColor: accent,
          titleFont: { family: 'Outfit', size: 10, weight: '400' },
          bodyFont: { family: 'DM Mono', size: 14, weight: '700' },
          padding: 11,
          displayColors: false,
          callbacks: {
            title: items => filtered[items[0].dataIndex]?.date || items[0].label,
            label: item => isKK
              ? ` ${item.raw} Ringe`
              : ` ${item.raw.toFixed(1)} Zehntel`,
            afterLabel: item => {
              const h = filtered[item.dataIndex];
              if (!h) return '';
              const res = h.result === 'win' ? '✓ Sieg' : h.result === 'lose' ? '✗ Niederlage' : '= Unentschieden';
              return ` ${res} · ${h.diffName || h.diff || ''}`;
            }
          }
        }
      },
      scales: {
        x: {
          ticks: {
            color: 'rgba(255,255,255,.22)',
            font: { family: 'Outfit', size: 9 },
            maxRotation: 0,
            autoSkip: true,
            maxTicksLimit: 8,
          },
          grid: { color: 'rgba(255,255,255,.04)' },
          border: { color: 'rgba(255,255,255,.07)' },
        },
        y: {
          suggestedMin: yMin,
          suggestedMax: yMax,
          ticks: {
            color: 'rgba(255,255,255,.25)',
            font: { family: 'DM Mono', size: 9 },
            maxTicksLimit: 5,
            callback: v => isKK ? v : v.toFixed(1),
          },
          grid: { color: 'rgba(255,255,255,.05)' },
          border: { color: 'rgba(255,255,255,.07)' },
        }
      }
    }
  });
  } catch (e) {
    console.warn('[Chart] Chart.js Erstellung fehlgeschlagen:', e.message);
    canvas.style.display = 'none';
    if (emptyEl) {
      emptyEl.style.display = 'flex';
      emptyEl.innerHTML = 'Chart nicht verfügbar.<br><span style="font-size:.6rem;opacity:.5;">Chart.js konnte nicht initialisiert werden.</span>';
    }
  }
}

function getBestStreak() {
  const lgBest = STREAK_CACHE.lg?.best || 0;
  const kkBest = STREAK_CACHE.kk?.best || 0;
  return Math.max(lgBest, kkBest);
}

const SUN_ACHIEVEMENTS = [
  // Basic
  { id: 'first_game', group: 'basic', icon: '🎯', name: 'Erster Schuss', desc: '1 Duell gespielt', check: () => (loadGameStats().wins || 0) + (loadGameStats().losses || 0) + (loadGameStats().draws || 0) >= 1 },
  { id: 'first_win', group: 'basic', icon: '🏆', name: 'Erster Sieg', desc: '1 Duell gewonnen', check: () => (loadGameStats().wins || 0) >= 1 },
  { id: 'five_games', group: 'basic', icon: '🔢', name: 'Fünf Duelle', desc: '5 Spiele gespielt', check: () => (loadGameStats().wins || 0) + (loadGameStats().losses || 0) + (loadGameStats().draws || 0) >= 5 },
  { id: 'xp_100', group: 'basic', icon: '⭐', name: '100 XP', desc: '100 XP verdient', check: () => G.xp >= 100 },
  { id: 'streak_3', group: 'basic', icon: '🔥', name: 'Heiß!', desc: '3er Siegesserie', check: () => getBestStreak() >= 3 },
  // Battle
  { id: 'beat_hard', group: 'battle', icon: '💀', name: 'Harter Brocken', desc: 'Elite-Bot besiegt', check: () => !!(localStorage.getItem('sd_beat_hard')) },
  { id: 'beat_elite', group: 'battle', icon: '💫', name: 'Legende', desc: 'Profi-Bot besiegt', check: () => !!(localStorage.getItem('sd_beat_elite')) },
  { id: 'ten_wins', group: 'battle', icon: '🥇', name: '10 Siege', desc: '10 Duelle gewonnen', check: () => (loadGameStats().wins || 0) >= 10 },
  { id: 'twenty_five_wins', group: 'battle', icon: '🎖️', name: '25 Siege', desc: '25 Duelle gewonnen', check: () => (loadGameStats().wins || 0) >= 25 },
  { id: 'both_weapons', group: 'battle', icon: '⚔️', name: 'Allrounder', desc: 'LG & KK je 1 Sieg', check: () => (loadWeaponStats('lg').wins || 0) >= 1 && (loadWeaponStats('kk').wins || 0) >= 1 },
  { id: 'streak_7', group: 'battle', icon: '🌟', name: 'Unaufhaltsam', desc: '7er Siegesserie', check: () => getBestStreak() >= 7 },
  // Master
  { id: 'xp_500', group: 'master', icon: '🏅', name: 'Meister', desc: '500 XP verdient', check: () => G.xp >= 500 },
  { id: 'xp_1000', group: 'master', icon: '🏆', name: 'Großmeister', desc: '1000 XP verdient', check: () => G.xp >= 1000 },
  { id: 'streak_14', group: 'master', icon: '🔥🔥', name: '14er Streak', desc: '14er Siegesserie', check: () => getBestStreak() >= 14 },
  { id: 'fifty_games', group: 'master', icon: '🎖️', name: '50 Duelle', desc: '50 Spiele gespielt', check: () => (loadGameStats().wins || 0) + (loadGameStats().losses || 0) + (loadGameStats().draws || 0) >= 50 },
  { id: 'one_hundred_games', group: 'master', icon: '💯', name: 'Hundert Duelle', desc: '100 Spiele gespielt', check: () => (loadGameStats().wins || 0) + (loadGameStats().losses || 0) + (loadGameStats().draws || 0) >= 100 },
  { id: 'xp_2000', group: 'master', icon: '💫', name: 'Legende', desc: '2000 XP – Legendenstatus', check: () => G.xp >= 2000 },
  { id: 'xp_5000', group: 'master', icon: '👑', name: 'König', desc: '5000 XP – Wahre Größe', check: () => G.xp >= 5000 },
];

function checkSunAchievements() {
  const earned = getSunEarned();
  let newEarned = false;
  SUN_ACHIEVEMENTS.forEach(a => {
    if (!earned[a.id] && a.check()) {
      earned[a.id] = Date.now();
      newEarned = true;
      showSunPop(a);
    }
  });
  if (newEarned) saveSunEarned(earned);
}

function getSunEarned() {
  try { return JSON.parse(localStorage.getItem('sd_sun') || '{}'); }
  catch (e) { return {}; }
}

function saveSunEarned(e) {
  try { localStorage.setItem('sd_sun', JSON.stringify(e)); } catch (e) { console.warn('[Sun] Sun-Daten speichern fehlgeschlagen:', e.message); }
}

function showSunPop(achievement) {
  if (typeof Sounds !== 'undefined') Sounds.achievement();
  if (typeof Haptics !== 'undefined') Haptics.achievement();
  const el = document.createElement('div');
  el.style.cssText = `position:fixed;bottom:90px;left:50%;transform:translateX(-50%);
        background:linear-gradient(135deg,rgba(60,50,10,.95),rgba(80,70,15,.95));
        border:1px solid rgba(200,160,40,.5);border-radius:12px;padding:12px 18px;
        display:flex;align-items:center;gap:10px;z-index:9999;
        box-shadow:0 4px 24px rgba(0,0,0,.6);animation:sheetUp .3s ease;
        font-family:'Outfit',sans-serif;max-width:280px;`;
  el.innerHTML = `<span style="font-size:1.6rem">${achievement.icon}</span>
        <div><div style="font-size:.65rem;letter-spacing:.2em;text-transform:uppercase;color:rgba(220,180,80,.6);font-weight:700;">⭐ SUN-Stern verdient!</div>
        <div style="font-size:.85rem;font-weight:700;color:#ffc840;margin-top:2px;">${achievement.name}</div>
        <div style="font-size:.65rem;color:rgba(200,180,100,.5);margin-top:1px;">${achievement.desc}</div></div>`;
  document.body.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .4s'; setTimeout(() => el.remove(), 400); }, 3000);
}

function renderSunGrid() {
  const earned = getSunEarned();
  const groups = { basic: 'sunGrid-basic', battle: 'sunGrid-battle', master: 'sunGrid-master' };
  let totalEarned = 0;

  Object.entries(groups).forEach(([group, gridId]) => {
    const grid = document.getElementById(gridId);
    if (!grid) return;
    const items = SUN_ACHIEVEMENTS.filter(a => a.group === group);
    grid.innerHTML = items.map(a => {
      const isEarned = !!earned[a.id];
      if (isEarned) totalEarned++;
      return `<div class="sun-card ${isEarned ? 'earned' : 'locked'}">
            ${isEarned ? '<span class="sun-check">✓</span>' : ''}
            <div class="sun-icon">${a.icon}</div>
            <div class="sun-name">${a.name}</div>
            <div class="sun-desc">${a.desc}</div>
          </div>`;
    }).join('');
  });

  const total = SUN_ACHIEVEMENTS.length;
  const el = document.getElementById('sunTotalVal');
  if (el) el.textContent = `${totalEarned} / ${total}`;

  // Stars (5 stars, each = total/5 achievements)
  const starsRow = document.getElementById('sunStarsRow');
  if (starsRow) {
    const perStar = total / 5;
    starsRow.querySelectorAll('.sun-star').forEach((s, i) => {
      s.classList.toggle('lit', totalEarned >= Math.round((i + 1) * perStar));
    });
  }
}

function updateProfileMenu() {
  if (!DOM.profileMenu) return;
  const { rank } = getRank(G.xp);
  const bestStreak = Math.max(
    parseInt(localStorage.getItem('sd_lg_best') || '0') || 0,
    parseInt(localStorage.getItem('sd_kk_best') || '0') || 0
  );
  if (DOM.profileIcon) DOM.profileIcon.textContent = rank.icon;
  if (DOM.profileRank) DOM.profileRank.textContent = rank.name;
  if (DOM.pmRank) DOM.pmRank.textContent = rank.icon + ' ' + rank.name;
  if (DOM.pmLevel) DOM.pmLevel.textContent = (getRank(G.xp).idx + 1);
  if (DOM.pmXP) DOM.pmXP.textContent = G.xp;
  if (DOM.pmStreak) DOM.pmStreak.textContent = bestStreak > 0 ? '🔥 ' + bestStreak : '–';
}

/* ─── FIREBASE ───────────────────────────────────────────────────────
   SICHERHEITSHINWEIS: Der API-Key ist für Web-Apps öffentlich sichtbar.
   Schutz erfolgt ausschließlich über Firebase Security Rules (nicht über
   den Key selbst). Stelle sicher, dass in der Firebase Console folgende
   Realtime Database Rules gesetzt sind:

   {
     "rules": {
       "leaderboard_v2": {
         ".read": true,
         ".write": "newData.child('username').isString()"
       },
       "$other": {
         ".read": false,
         ".write": false
       }
     }
   }

   Außerdem: In der Firebase Console → Authentication → Settings →
   "Authorized domains" nur deine eigene Domain eintragen (kein localhost
   in Produktion). Das verhindert Missbrauch des Keys von fremden Domains.
─────────────────────────────────────────────────────────────────────── */
const FB_CONFIG = {
  apiKey: "AIzaSyDiwpW30GJW8da04A8ga9zOlj72PLXrUUk",
  authDomain: "burnished-block-402111.firebaseapp.com",
  databaseURL: "https://burnished-block-402111-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "burnished-block-402111",
  storageBucket: "burnished-block-402111.firebasestorage.app",
  messagingSenderId: "884784314045",
  appId: "1:884784314045:web:03c1af3dd3d91bfb2569d4"
};

let fbApp = null, fbDb = null, fbAuth = null, fbUser = null, fbReady = false;
let fbAccountId = '';
let fbAuthListenerBound = false;
let fbCloudBootstrapUid = '';
let fbCloudProfileCache = null;
let fbCloudSyncTimer = null;
let fbCloudFlushPromise = null;
let debugRemoteState = null;
let debugRemoteFetchInFlight = false;
let debugFeedbackState = null;
let debugFeedbackFetchInFlight = false;
const LEADERBOARD_CACHE_KEY = 'sd_lb_cache_v1';
const CLOUD_SYNC_SCHEMA_VERSION = 1;
const CLOUD_SYNC_META_KEY = 'cloud_sync_meta_v1';
const CLOUD_SYNC_QUEUE_KEY = 'cloud_sync_queue_v1';
const CLOUD_SYNC_KEYS = [
  'username',
  'xp',
  'gamestats',
  'history',
  'feedback_meta',
  'lg_streak',
  'lg_best',
  'kk_streak',
  'kk_best',
  'wstats_lg',
  'wstats_kk',
  'rookie_plan_v1',
  'healthy_engagement_v1',
  'adaptive_data',
  'daily_challenge',
  'tutorial_done',
  'sound',
  'lb_scope',
  'lb_period',
  'enhanced_analytics',
  'enhanced_achievements',
  'sun'
];

function sanitizeUsername(rawName) {
  const fallbackName = String(rawName ?? '').trim() || 'Anonym';
  return fallbackName.substring(0, 15).replace(/[.#$/\[\]]/g, '_');
}

function getFirebaseProfileKey(username) {
  return sanitizeUsername(username);
}

function getFirebaseOwnerId() {
  return fbAccountId || fbUser?.uid || '';
}

function getFirebaseOwnerPath(suffix = '') {
  const ownerId = getFirebaseOwnerId();
  if (!ownerId) return '';
  return suffix ? `users/${ownerId}/${suffix}` : `users/${ownerId}`;
}

function getFirebaseOwnerDedupe(prefix = 'owner') {
  const ownerId = getFirebaseOwnerId();
  return ownerId ? `${prefix}:${ownerId}` : '';
}

function getLeaderboardCacheKey(scope = getActiveLeaderboardScope(), period = getActiveLeaderboardPeriod()) {
  return `${LEADERBOARD_CACHE_KEY}_${normalizeLeaderboardPeriod(period)}_${normalizeLeaderboardScope(scope)}`;
}

function getCachedLeaderboardEntries(scope = getActiveLeaderboardScope(), period = getActiveLeaderboardPeriod()) {
  try {
    const cached = JSON.parse(localStorage.getItem(getLeaderboardCacheKey(scope, period)) || '[]');
    return Array.isArray(cached) ? cached.filter(entry => entry && typeof entry === 'object') : [];
  } catch (error) {
    console.warn('Leaderboard cache read failed:', error);
    return [];
  }
}

function getShortOwnerId(value) {
  const text = String(value || '');
  return text ? `${text.slice(0, 6)}...${text.slice(-4)}` : '–';
}

function updateAccountSyncStatus() {
  const node = document.getElementById('accountSyncStatus');
  const iconEl = document.getElementById('syncStatusIcon');
  const textEl = document.getElementById('syncStatusText');
  if (!node) return;

  if (!fbReady) {
    if (iconEl) iconEl.textContent = '⚠️';
    if (textEl) textEl.textContent = 'Firebase ist aktuell nicht aktiv. Sync ist nicht möglich.';
    return;
  }

  const ownerId = getFirebaseOwnerId();
  const authUid = fbUser?.uid || '';
  const meta = loadCloudSyncMeta();
  const queue = loadCloudSyncQueue();
  const isLinked = !!ownerId && !!authUid && ownerId !== authUid;
  const backoffUntil = Number(meta.queueBackoffUntil) || 0;
  const retryText = backoffUntil > Date.now()
    ? ` · Retry ${new Date(backoffUntil).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
    : '';

  if (!authUid) {
    if (iconEl) iconEl.textContent = '🔄';
    if (textEl) textEl.textContent = 'Firebase Authentifizierung läuft...';
    return;
  }

  const modeText = isLinked ? 'mit anderem Gerät verknüpft' : 'lokales Hauptkonto';
  const syncStatus = queue.length > 0 ? `${queue.length} Änderungen in Warteschlange` : 'Alle Daten synchron';
  const syncIcon = queue.length > 0 ? '📤' : '✅';

  if (iconEl) iconEl.textContent = syncIcon;
  if (textEl) {
    textEl.innerHTML = `
      <div style="font-weight:600;margin-bottom:2px;">Konto ${getShortOwnerId(ownerId || authUid)}</div>
      <div style="opacity:0.7;">${modeText}</div>
      <div style="opacity:0.6;font-size:0.7rem;margin-top:2px;">${syncStatus}${retryText}</div>
    `;
  }
}

// Cloud-Sync manuell anstoßen
window.forceCloudSync = async function() {
  if (!fbReady || !fbDb) {
    alert('Firebase ist aktuell nicht aktiv.');
    return;
  }

  const btn = event?.target;
  if (btn) {
    btn.textContent = '⏳ Sync läuft...';
    btn.disabled = true;
  }

  try {
    await pushProfileToFirebase();
    await flushFirebaseSyncQueue();

    updateAccountSyncStatus();

    if (btn) {
      btn.textContent = '✅ Synchronisiert!';
      setTimeout(() => { btn.textContent = '🔄 Jetzt synchronisieren'; btn.disabled = false; }, 2000);
    }
  } catch (error) {
    console.error('Force sync failed:', error);
    if (btn) {
      btn.textContent = '❌ Fehlgeschlagen';
      setTimeout(() => { btn.textContent = '🔄 Jetzt synchronisieren'; btn.disabled = false; }, 2000);
    }
    alert('Synchronisierung fehlgeschlagen: ' + (error?.message || 'Unbekannter Fehler'));
  }
};

function isDebugToolsEnabled() {
  try {
    const params = new URLSearchParams(window.location.search || '');
    if (params.get('debug') === '1' || params.get('debug') === 'true') return true;
  } catch (error) {
    console.warn('Debug query read failed:', error);
  }
  return StorageManager.getRaw('debug_tools_v1', '0') === '1';
}

function refreshDebugToolsVisibility() {
  const enabled = isDebugToolsEnabled();
  const debugTab = document.querySelector('.ps-tab[data-tab="debug"]');
  const debugPanel = document.getElementById('psPanel-debug');
  if (debugTab) debugTab.style.display = enabled ? '' : 'none';
  if (debugPanel) debugPanel.style.display = enabled ? '' : 'none';

  if (!enabled) {
    const activeDebugTab = document.querySelector('.ps-tab.active[data-tab="debug"]');
    if (activeDebugTab) switchProfileTab('stats');
  }
}

function setDebugToolsEnabled(enabled) {
  StorageManager.setRaw('debug_tools_v1', enabled ? '1' : '0');
  refreshDebugToolsVisibility();
  if (enabled) {
    refreshDebugPanel();
    switchProfileTab('debug');
  }
}

function enableDebugTools() {
  setDebugToolsEnabled(true);
}

function disableDebugTools() {
  setDebugToolsEnabled(false);
}

function cacheLeaderboardEntries(entries, scope = getActiveLeaderboardScope(), period = getActiveLeaderboardPeriod()) {
  try {
    localStorage.setItem(getLeaderboardCacheKey(scope, period), JSON.stringify(Array.isArray(entries) ? entries.slice(0, 50) : []));
  } catch (error) {
    console.warn('Leaderboard cache write failed:', error);
  }
}

function renderCachedLeaderboard(scope = getActiveLeaderboardScope(), period = getActiveLeaderboardPeriod()) {
  const cachedEntries = getCachedLeaderboardEntries(scope, period);
  if (!cachedEntries.length) return false;
  renderLeaderboard(cachedEntries, scope, period);
  return true;
}

function getLeaderboardPath(scope = getActiveLeaderboardScope(), period = getActiveLeaderboardPeriod()) {
  const normalizedScope = normalizeLeaderboardScope(scope);
  const normalizedPeriod = normalizeLeaderboardPeriod(period);
  if (normalizedPeriod === 'season') {
    const seasonId = getCurrentSeasonId();
    return normalizedScope === 'global'
      ? `${SEASON_ROOT}/${seasonId}/leaderboard_v1`
      : `${SEASON_ROOT}/${seasonId}/disciplines/${normalizedScope}`;
  }
  return normalizedScope === 'global'
    ? 'leaderboard_v2'
    : `${LEADERBOARD_DISCIPLINE_ROOT}/${normalizedScope}`;
}

function formatLeaderboardScore(value, discipline = null) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return '0';
  if (discipline === 'kk3x20') return `${Math.round(numericValue)}`;
  return numericValue.toFixed(1);
}

function getDisciplineGames(discipline) {
  if (!discipline) return [];
  try {
    const raw = JSON.parse(localStorage.getItem('sd_enhanced_analytics') || '{}');
    const games = Array.isArray(raw?.games) ? raw.games : [];
    return games.filter((game) => (
      game &&
      game.discipline === discipline &&
      Number.isFinite(Number(game.playerScore))
    ));
  } catch (error) {
    console.warn('Enhanced analytics read failed:', error);
    return [];
  }
}

function buildDisciplineLeaderboardEntry(discipline) {
  const key = Object.prototype.hasOwnProperty.call(DISC, discipline) ? discipline : null;
  if (!key || !G.username) return null;

  const games = getDisciplineGames(key);
  if (!games.length) return null;

  const scores = games
    .map((game) => Number(game.playerScore))
    .filter((score) => Number.isFinite(score));

  if (!scores.length) return null;

  const wins = games.filter((game) => game.result === 'win' || game.playerWon === true).length;
  const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  const bestScore = Math.max(...scores);
  const { rank } = getRank(G.xp);

  return {
    uid: getFirebaseOwnerId(),
    authUid: fbUser?.uid || '',
    name: sanitizeUsername(G.username || 'Anonym'),
    username: sanitizeUsername(G.username || 'Anonym'),
    discipline: key,
    disciplineName: DISC[key].name,
    rank: rank.name,
    rankIcon: rank.icon,
    weapon: DISC[key].weapon,
    totalGames: scores.length,
    wins,
    winRate: scores.length ? wins / scores.length : 0,
    averageScore,
    bestScore,
    score: bestScore,
    date: new Date().toLocaleDateString('de-DE')
  };
}

function buildStructuredMatchHistory() {
  try {
    const hist = StorageManager.get('history', []);
    if (!Array.isArray(hist) || !hist.length) return {};

    const matches = {};
    hist.slice(0, 30).forEach((entry, index) => {
      if (!entry || typeof entry !== 'object') return;

      const timestamp = Number(entry.timestamp) || 0;
      const discipline = typeof entry.discipline === 'string' ? entry.discipline : 'unknown';
      const fallbackKey = `${timestamp || Date.now()}_${discipline}_${index}`;
      const key = String(entry.id || fallbackKey).replace(/[.#$/\[\]]/g, '_');

      matches[key] = {
        id: key,
        timestamp: timestamp || Date.now(),
        result: typeof entry.result === 'string' ? entry.result : 'unknown',
        diff: typeof entry.diff === 'string' ? entry.diff : 'unknown',
        weapon: entry.weapon === 'kk' ? 'kk' : 'lg',
        discipline,
        disciplineName: typeof entry.disciplineName === 'string' ? entry.disciplineName : (DISC[discipline]?.name || discipline),
        playerPts: Number(entry.playerPts) || 0,
        botPts: Number(entry.botPts) || 0,
        diffName: typeof entry.diffName === 'string' ? entry.diffName : entry.diff,
        weaponName: typeof entry.weaponName === 'string' ? entry.weaponName : entry.weapon,
        date: typeof entry.date === 'string' ? entry.date : ''
      };
    });

    return matches;
  } catch (error) {
    console.warn('History snapshot build failed:', error);
    return {};
  }
}

function getStructuredHistoryList() {
  const matches = buildStructuredMatchHistory();
  return Object.values(matches).filter(Boolean).sort((a, b) => (Number(b.timestamp) || 0) - (Number(a.timestamp) || 0));
}

function buildSeasonLeaderboardEntry(discipline = null) {
  const seasonInfo = getCurrentSeasonInfo();
  const matches = getStructuredHistoryList().filter((entry) => {
    const timestamp = Number(entry.timestamp) || 0;
    if (timestamp < seasonInfo.startAt || timestamp > seasonInfo.endAt) return false;
    if (discipline) return entry.discipline === discipline;
    return true;
  });

  if (!matches.length || !G.username) return null;

  const wins = matches.filter((entry) => entry.result === 'win').length;
  const draws = matches.filter((entry) => entry.result === 'draw').length;
  const losses = matches.filter((entry) => entry.result === 'lose').length;
  const scores = matches.map((entry) => Number(entry.playerPts) || 0);
  const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  const bestScore = Math.max(...scores);
  const seasonPoints = wins * 3 + draws;
  const sortScore = seasonPoints * 100000 + Math.round(averageScore * 10);
  const { rank } = getRank(G.xp);

  return {
    uid: getFirebaseOwnerId(),
    name: sanitizeUsername(G.username || 'Anonym'),
    username: sanitizeUsername(G.username || 'Anonym'),
    seasonId: seasonInfo.id,
    seasonLabel: seasonInfo.label,
    discipline: discipline || 'global',
    disciplineName: discipline ? (DISC[discipline]?.name || discipline) : 'Global',
    rank: rank.name,
    rankIcon: rank.icon,
    weapon: discipline ? (DISC[discipline]?.weapon || G.weapon) : G.weapon,
    totalGames: matches.length,
    wins,
    draws,
    losses,
    seasonPoints,
    averageScore,
    bestScore,
    score: sortScore,
    date: new Date().toLocaleDateString('de-DE')
  };
}

function queueSeasonLeaderboardEntries(reason = 'season_sync') {
  const ownerId = getFirebaseOwnerId();
  if (!ownerId || !G.username) return false;

  const seasonInfo = getCurrentSeasonInfo();
  enqueueFirebaseSet(
    `${SEASON_ROOT}/${seasonInfo.id}/meta`,
    seasonInfo,
    `season-meta:${seasonInfo.id}`,
    { requiresAuth: false }
  );

  let wroteAnyEntry = false;
  const globalEntry = buildSeasonLeaderboardEntry(null);
  enqueueFirebaseSet(
    `${SEASON_ROOT}/${seasonInfo.id}/leaderboard_v1/${ownerId}`,
    globalEntry,
    `season:${seasonInfo.id}:global:${ownerId}`,
    { requiresAuth: !!fbUser }
  );
  if (globalEntry) wroteAnyEntry = true;

  Object.keys(DISC).forEach((discipline) => {
    const entry = buildSeasonLeaderboardEntry(discipline);
    enqueueFirebaseSet(
      `${SEASON_ROOT}/${seasonInfo.id}/disciplines/${discipline}/${ownerId}`,
      entry,
      `season:${seasonInfo.id}:${discipline}:${ownerId}`,
      { requiresAuth: !!fbUser }
    );
    if (entry) wroteAnyEntry = true;
  });

  return wroteAnyEntry;
}

function queueDisciplineLeaderboardEntries(reason = 'discipline_leaderboard_sync') {
  if (!G.username) return false;

  let wroteAnyEntry = false;
  const leaderboardKey = getFirebaseOwnerId() || getFirebaseProfileKey(G.username);
  Object.keys(DISC).forEach((discipline) => {
    const entry = buildDisciplineLeaderboardEntry(discipline);
    enqueueFirebaseSet(
      `${LEADERBOARD_DISCIPLINE_ROOT}/${discipline}/${leaderboardKey}`,
      entry,
      `leaderboard:${discipline}:${leaderboardKey}`,
      { requiresAuth: !!fbUser }
    );
    if (entry) wroteAnyEntry = true;
  });

  return wroteAnyEntry;
}

function queueStructuredMatchHistory(reason = 'matches_sync') {
  const ownerPath = getFirebaseOwnerPath('matches');
  const ownerId = getFirebaseOwnerId();
  if (!fbUser || !ownerPath || !ownerId) return false;
  enqueueFirebaseSet(
    ownerPath,
    buildStructuredMatchHistory(),
    `matches:${ownerId}`,
    { requiresAuth: true }
  );
  return true;
}

function updateLeaderboardScopeControl() {
  const select = document.getElementById('lbScopeSelect');
  const periodSelect = document.getElementById('lbPeriodSelect');
  if (!select && !periodSelect) return;

  if (select && !select.options.length) {
    select.innerHTML = [
      '<option value="global">Global</option>',
      ...Object.entries(DISC).map(([key, cfg]) => `<option value="${key}">${cfg.name}</option>`)
    ].join('');
  }

  const scope = getActiveLeaderboardScope();
  const period = getActiveLeaderboardPeriod();
  if (select) select.value = scope;
  if (periodSelect) {
    periodSelect.innerHTML = [
      '<option value="alltime">All-Time</option>',
      `<option value="season">Saison ${getCurrentSeasonInfo().label}</option>`
    ].join('');
  }
  if (periodSelect) periodSelect.value = period;

  const label = document.getElementById('lbScopeLabel');
  if (label) {
    const periodText = period === 'season' ? ` · ${getCurrentSeasonInfo().label}` : '';
    label.textContent = `${getLeaderboardScopeLabel(scope)}${periodText}`;
  }

  const hint = document.getElementById('lbScopeHint');
  const title = document.getElementById('lbCardTitle');
  if (title) {
    title.textContent = period === 'season'
      ? `Rangliste · Saison ${getCurrentSeasonInfo().label}`
      : 'Rangliste · Score = XP + Streak×5';
  }
  if (hint) {
    if (period === 'season') {
      hint.textContent = scope === 'global'
        ? `Saisonwertung ${getCurrentSeasonInfo().label}: Punkte = Siege x 3 + Unentschieden.`
        : `${getLeaderboardScopeLabel(scope)} in ${getCurrentSeasonInfo().label}: Saisonpunkte mit Best- und Durchschnittswert.`;
    } else {
      hint.textContent = scope === 'global'
        ? 'Global nutzt Score = XP + Streak x 5.'
        : `${getLeaderboardScopeLabel(scope)} nutzt die persoenliche Bestleistung als Sortierung.`;
    }
  }
}

function setLeaderboardScope(scope, options = {}) {
  const normalizedScope = normalizeLeaderboardScope(scope);
  G.lbScope = normalizedScope;
  StorageManager.setRaw('lb_scope', normalizedScope);
  updateLeaderboardScopeControl();
  if (options.reload === false) return normalizedScope;
  loadLeaderboard(true);
  return normalizedScope;
}

function setLeaderboardPeriod(period, options = {}) {
  const normalizedPeriod = normalizeLeaderboardPeriod(period);
  G.lbPeriod = normalizedPeriod;
  StorageManager.setRaw('lb_period', normalizedPeriod);
  updateLeaderboardScopeControl();
  if (options.reload === false) return normalizedPeriod;
  loadLeaderboard(true);
  return normalizedPeriod;
}

function normalizePairCode(code) {
  return String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
}

function generatePairCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}

function getAccountLinkMapPath(uid) {
  return `${ACCOUNT_LINK_ROOT}/by_uid/${uid}`;
}

function getAccountPairCodePath(code) {
  return `${ACCOUNT_LINK_ROOT}/pair_codes/${normalizePairCode(code)}`;
}

async function resolveFirebaseAccountId(user, options = {}) {
  if (!user || !fbDb) return '';
  const authUid = user.uid;
  const force = options.force === true;
  if (fbAccountId && !force) return fbAccountId;

  try {
    const mappingSnap = await fbDb.ref(getAccountLinkMapPath(authUid)).once('value');
    const existing = mappingSnap.val();
    const mappedAccountId = typeof existing?.accountId === 'string' && existing.accountId ? existing.accountId : '';
    if (mappedAccountId) {
      fbAccountId = mappedAccountId;
      return mappedAccountId;
    }

    fbAccountId = authUid;
    await fbDb.ref(getAccountLinkMapPath(authUid)).set({
      accountId: authUid,
      authUid,
      linkedAt: Date.now(),
      source: 'self',
      pairCode: '',
      createdByUid: ''
    });
    return fbAccountId;
  } catch (error) {
    console.warn('Account resolution failed:', error?.code || error?.message || error);
    fbAccountId = authUid;
    return fbAccountId;
  }
}

async function generateAccountLinkCode() {
  if (!fbReady) return null;
  const user = fbUser || await ensureFirebaseAnonymousAuth();
  if (!user || !fbDb) return null;

  const accountId = await resolveFirebaseAccountId(user);
  if (!accountId) return null;

  let code = generatePairCode();
  let attempts = 0;
  while (attempts < 5) {
    const existing = await fbDb.ref(getAccountPairCodePath(code)).once('value');
    if (!existing.exists()) break;
    code = generatePairCode();
    attempts += 1;
  }

  const payload = {
    accountId,
    authUid: user.uid,
    username: sanitizeUsername(G.username || 'Anonym'),
    createdAt: Date.now(),
    expiresAt: Date.now() + (15 * 60 * 1000)
  };

  await fbDb.ref(getAccountPairCodePath(code)).set(payload);
  return { code, expiresAt: payload.expiresAt, accountId };
}

async function connectDeviceWithLinkCode(rawCode) {
  const code = normalizePairCode(rawCode || prompt('Sync-Code eingeben (6-8 Zeichen):'));
  if (!code || code.length < 4) {
    if (code) alert('Der Code muss mindestens 4 Zeichen haben.');
    return false;
  }

  if (!fbReady) {
    alert('Firebase ist aktuell nicht aktiv. Bitte warte einen Moment oder lade die Seite neu.');
    return false;
  }

  const user = fbUser || await ensureFirebaseAnonymousAuth();
  if (!user || !fbDb) {
    alert('Firebase-Authentifizierung fehlgeschlagen. Bitte versuche es erneut.');
    return false;
  }

  try {
    const linkSnap = await fbDb.ref(getAccountPairCodePath(code)).once('value');
    const link = linkSnap.val();
    if (!link || !link.accountId) {
      alert('❌ Sync-Code nicht gefunden.\n\nBitte überprüfe den Code und versuche es erneut.');
      return false;
    }
    if (Number(link.expiresAt) < Date.now()) {
      await fbDb.ref(getAccountPairCodePath(code)).remove().catch(() => { });
      alert('❌ Sync-Code ist abgelaufen (15 Min).\n\nBitte erzeugen einen neuen Code auf dem Hauptgerät.');
      return false;
    }

    await fbDb.ref(getAccountLinkMapPath(user.uid)).set({
      accountId: link.accountId,
      authUid: user.uid,
      linkedAt: Date.now(),
      source: 'pair_code',
      pairCode: code,
      createdByUid: link.authUid || ''
    });
    await fbDb.ref(getAccountPairCodePath(code)).remove().catch(() => { });

    fbAccountId = link.accountId;
    fbCloudBootstrapUid = '';
    await bootstrapCloudUser(user, { force: true });
    updateAccountSyncStatus();
    refreshDebugPanel();

    // Erfolg-Meldung mit Details
    alert(`✅ Gerät erfolgreich verbunden!\n\nKonto: ${link.username || getShortOwnerId(link.accountId)}\nSync läuft jetzt automatisch.`);
    return true;
  } catch (error) {
    console.error('Device connection error:', error);
    alert(`❌ Verbindung fehlgeschlagen.\n\nFehler: ${error?.message || 'Unbekannter Fehler'}\nBitte versuche es erneut.`);
    return false;
  }
}

async function showAccountSyncCode() {
  if (!fbReady) {
    alert('Firebase ist noch nicht bereit. Bitte warte einen Moment.');
    return;
  }

  try {
    const data = await generateAccountLinkCode();
    if (!data) {
      alert('Sync-Code konnte nicht erzeugt werden.\n\nBitte versuche es erneut.');
      return;
    }

    // In die Zwischenablage kopieren
    let clipboardSuccess = false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(data.code);
        clipboardSuccess = true;
      }
    } catch (error) {
      console.warn('Clipboard write failed:', error);
    }

    const expiresAt = new Date(data.expiresAt);
    const expiresTime = expiresAt.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });

    // Schönes Modal/Overlay statt alert
    const overlay = document.createElement('div');
    overlay.id = 'syncCodeOverlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);backdrop-filter:blur(8px);z-index:100000;display:flex;align-items:center;justify-content:center;';
    overlay.innerHTML = `
      <div style="background:linear-gradient(145deg, rgba(30,35,40,0.95) 0%, rgba(15,18,20,0.98) 100%);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,0.1);border-radius:20px;padding:24px;max-width:380px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,0.5);">
        <div style="text-align:center;margin-bottom:20px;">
          <div style="font-size:2.5rem;margin-bottom:10px;">🔗</div>
          <div style="font-size:1.1rem;font-weight:700;color:#fff;margin-bottom:5px;">Sync-Code erzeugt</div>
          <div style="font-size:0.75rem;color:rgba(255,255,255,0.5);">Gültig bis ${expiresTime} Uhr</div>
        </div>

        <div style="background:rgba(0,0,0,0.3);border:1px solid rgba(122,176,48,0.3);border-radius:12px;padding:16px;text-align:center;margin-bottom:16px;">
          <div style="font-size:1.8rem;font-weight:800;color:#7ab030;letter-spacing:0.15em;font-family:'DM Mono',monospace;" id="syncCodeDisplay">${data.code}</div>
        </div>

        <div style="font-size:0.7rem;color:rgba(255,255,255,0.4);margin-bottom:16px;line-height:1.4;">
          ${clipboardSuccess ? '✅ Code wurde in die Zwischenablage kopiert!' : '⚠️ Code manuell kopieren und auf dem anderen Gerät eingeben.'}
        </div>

        <div style="display:flex;gap:8px;">
          <button onclick="document.getElementById('syncCodeOverlay')?.remove()" style="flex:1;padding:12px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);border-radius:10px;color:#fff;font-weight:600;font-size:0.85rem;cursor:pointer;">
            Schließen
          </button>
          <button onclick="navigator.clipboard?.writeText('${escHtml(data.code)}');this.textContent='✅ Kopiert!';setTimeout(()=>this.textContent='Kopieren',1500)" style="flex:1;padding:12px;background:linear-gradient(135deg,#00c3ff,#7ab030);border:none;border-radius:10px;color:#000;font-weight:700;font-size:0.85rem;cursor:pointer;">
            📋 Kopieren
          </button>
        </div>
      </div>
    `;
    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
    document.body.appendChild(overlay);

  } catch (error) {
    console.warn('Sync code generation failed:', error);
    alert('Sync-Code konnte nicht erzeugt werden.\n\nFehler: ' + (error?.message || 'Unbekannt'));
  }
}

function loadCloudSyncMeta() {
  const raw = StorageManager.get(CLOUD_SYNC_META_KEY, {});
  return {
    lastLocalChangeAt: Number(raw.lastLocalChangeAt) || 0,
    lastAppliedAt: Number(raw.lastAppliedAt) || 0,
    lastQueuedAt: Number(raw.lastQueuedAt) || 0,
    lastQueueFlushAt: Number(raw.lastQueueFlushAt) || 0,
    lastQueueErrorAt: Number(raw.lastQueueErrorAt) || 0,
    lastQueueErrorCode: typeof raw.lastQueueErrorCode === 'string' ? raw.lastQueueErrorCode : '',
    queueBackoffUntil: Number(raw.queueBackoffUntil) || 0,
    lastLocalReason: typeof raw.lastLocalReason === 'string' ? raw.lastLocalReason : '',
    schemaVersion: CLOUD_SYNC_SCHEMA_VERSION
  };
}

function saveCloudSyncMeta(meta) {
  StorageManager.set(CLOUD_SYNC_META_KEY, {
    ...loadCloudSyncMeta(),
    ...(meta || {}),
    schemaVersion: CLOUD_SYNC_SCHEMA_VERSION
  });
}

function loadCloudSyncQueue() {
  const queue = StorageManager.get(CLOUD_SYNC_QUEUE_KEY, []);
  return Array.isArray(queue)
    ? queue
      .filter(item => item && typeof item === 'object' && typeof item.path === 'string')
      .map(item => ({
        ...item,
        attempts: Number(item.attempts) || 0,
        nextAttemptAt: Number(item.nextAttemptAt) || 0,
        lastErrorAt: Number(item.lastErrorAt) || 0,
        lastErrorCode: typeof item.lastErrorCode === 'string' ? item.lastErrorCode : ''
      }))
    : [];
}

function saveCloudSyncQueue(queue) {
  StorageManager.set(CLOUD_SYNC_QUEUE_KEY, Array.isArray(queue) ? queue : []);
}

function markCloudStateDirty(reason = 'local_change') {
  saveCloudSyncMeta({
    lastLocalChangeAt: Date.now(),
    lastLocalReason: reason
  });
}

function collectCloudSnapshot() {
  const values = {};
  CLOUD_SYNC_KEYS.forEach((key) => {
    const rawValue = localStorage.getItem(StorageManager.PREFIX + key);
    values[key] = rawValue === null ? null : rawValue;
  });

  return {
    schemaVersion: CLOUD_SYNC_SCHEMA_VERSION,
    updatedAt: Date.now(),
    username: sanitizeUsername(StorageManager.getRaw('username', G.username || 'Anonym')),
    values
  };
}

function applyCloudSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== 'object' || !snapshot.values || typeof snapshot.values !== 'object') return false;

  let changed = false;
  CLOUD_SYNC_KEYS.forEach((key) => {
    if (!Object.prototype.hasOwnProperty.call(snapshot.values, key)) return;

    const nextValue = snapshot.values[key];
    const storageKey = StorageManager.PREFIX + key;
    const currentValue = localStorage.getItem(storageKey);

    if (nextValue === null) {
      if (currentValue !== null) {
        localStorage.removeItem(storageKey);
        changed = true;
      }
      return;
    }

    const normalizedValue = String(nextValue);
    if (currentValue !== normalizedValue) {
      localStorage.setItem(storageKey, normalizedValue);
      changed = true;
    }
  });

  return changed;
}

function buildCloudProfile() {
  const { rank } = getRank(G.xp);
  const gameStats = loadGameStats();
  const lgStats = loadWeaponStats('lg');
  const kkStats = loadWeaponStats('kk');
  const ownerId = getFirebaseOwnerId();

  return {
    uid: ownerId,
    authUid: fbUser?.uid || '',
    username: sanitizeUsername(G.username || StorageManager.getRaw('username', 'Anonym')),
    createdAt: Number(fbCloudProfileCache?.createdAt) || Date.now(),
    updatedAt: Date.now(),
    lastSeenAt: Date.now(),
    favoriteDiscipline: G.discipline || 'lg40',
    preferredWeapon: G.weapon || 'lg',
    rankSnapshot: {
      xp: Number(G.xp) || 0,
      rank: rank.name,
      rankIcon: rank.icon
    },
    statsSummary: {
      totalDuels: getTotalDuels(gameStats),
      wins: Number(gameStats.wins || 0),
      losses: Number(gameStats.losses || 0),
      draws: Number(gameStats.draws || 0),
      lgGames: Number((lgStats.wins || 0) + (lgStats.losses || 0) + (lgStats.draws || 0)),
      kkGames: Number((kkStats.wins || 0) + (kkStats.losses || 0) + (kkStats.draws || 0))
    }
  };
}

function refreshStateFromLocalStorage() {
  const savedName = StorageManager.getRaw('username', '');
  G.username = savedName ? sanitizeUsername(savedName) : '';
  loadXP();
  loadAllStreaks();
  updateSchuetzenpass();
  updateProfileMenu();

  if (DOM.psUsername) DOM.psUsername.textContent = G.username || 'Anonym';
  if (DOM.profileOverlay?.classList.contains('active')) refreshProfileSheet();
  updateLeaderboardScopeControl();
  refreshDebugToolsVisibility();

  if (DOM.diffInfoTxt && typeof AdaptiveBotSystem !== 'undefined' && typeof AdaptiveBotSystem.getCurrentDifficulty === 'function') {
    const syncedDiff = AdaptiveBotSystem.getCurrentDifficulty(G.discipline);
    if (syncedDiff && DIFF[syncedDiff]) setDifficulty(syncedDiff, { persist: false });
  }

  const welcomeOverlay = document.getElementById('welcomeOverlay');
  if (welcomeOverlay && G.username) welcomeOverlay.classList.remove('active');

  if (typeof RookiePlan !== 'undefined') {
    RookiePlan.evaluateAndRender(true);
    RookiePlan.showIntroIfNeeded(false);
  }
}

function enqueueFirebaseSet(path, value, dedupeKey = null, options = {}) {
  const queue = loadCloudSyncQueue();
  const task = {
    type: 'set',
    path,
    value,
    dedupeKey: dedupeKey || '',
    requiresAuth: options.requiresAuth !== false,
    queuedAt: Date.now(),
    attempts: Number(options.attempts) || 0,
    nextAttemptAt: Number(options.nextAttemptAt) || 0,
    lastErrorAt: Number(options.lastErrorAt) || 0,
    lastErrorCode: typeof options.lastErrorCode === 'string' ? options.lastErrorCode : ''
  };

  if (task.dedupeKey) {
    const existingIndex = queue.findIndex(item => item && item.dedupeKey === task.dedupeKey);
    if (existingIndex >= 0) queue.splice(existingIndex, 1, task);
    else queue.push(task);
  } else {
    queue.push(task);
  }

  saveCloudSyncQueue(queue);
  saveCloudSyncMeta({ lastQueuedAt: Date.now() });
}

async function flushFirebaseSyncQueue() {
  if (fbCloudFlushPromise) return fbCloudFlushPromise;
  if (!fbReady || !fbDb) return false;

  fbCloudFlushPromise = (async () => {
    const queue = loadCloudSyncQueue();
    if (!queue.length) return true;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return false;

    const pending = [];
    const now = Date.now();
    let queueErrorCode = '';
    let queueBackoffUntil = 0;
    for (const task of queue) {
      if (!task || task.type !== 'set' || typeof task.path !== 'string') continue;
      if (Number(task.nextAttemptAt) > now) {
        pending.push(task);
        queueBackoffUntil = Math.max(queueBackoffUntil, Number(task.nextAttemptAt) || 0);
        continue;
      }
      if (task.requiresAuth && !fbUser) {
        pending.push(task);
        continue;
      }

      try {
        await fbDb.ref(task.path).set(task.value);
      } catch (error) {
        console.warn('Firebase queue write failed:', task.path, error?.code || error?.message || error);
        const attempts = (Number(task.attempts) || 0) + 1;
        const backoffMs = Math.min(60000, 1000 * Math.pow(2, Math.min(attempts, 6)));
        const nextAttemptAt = Date.now() + backoffMs;
        queueErrorCode = error?.code || error?.message || 'queue_write_failed';
        queueBackoffUntil = Math.max(queueBackoffUntil, nextAttemptAt);
        pending.push({
          ...task,
          attempts,
          nextAttemptAt,
          lastErrorAt: Date.now(),
          lastErrorCode: queueErrorCode
        });
      }
    }

    saveCloudSyncQueue(pending);
    saveCloudSyncMeta({
      lastQueueFlushAt: Date.now(),
      lastQueueErrorAt: queueErrorCode ? Date.now() : 0,
      lastQueueErrorCode: queueErrorCode,
      queueBackoffUntil
    });
    if (queueBackoffUntil > Date.now()) scheduleFirebaseQueueFlush(Math.max(1500, queueBackoffUntil - Date.now()));
    return pending.length === 0;
  })().finally(() => {
    fbCloudFlushPromise = null;
  });

  return fbCloudFlushPromise;
}

function scheduleFirebaseQueueFlush(delay = 600) {
  if (fbCloudSyncTimer) clearTimeout(fbCloudSyncTimer);
  fbCloudSyncTimer = setTimeout(() => {
    fbCloudSyncTimer = null;
    flushFirebaseSyncQueue();
  }, delay);
}

function queueCloudSnapshot(reason = 'cloud_snapshot') {
  const ownerPath = getFirebaseOwnerPath('cloud');
  const ownerId = getFirebaseOwnerId();
  if (!fbUser || !ownerPath || !ownerId) return false;
  enqueueFirebaseSet(
    ownerPath,
    collectCloudSnapshot(),
    `cloud:${ownerId}`,
    { requiresAuth: true }
  );
  return true;
}

function queueCloudProfile(reason = 'profile_sync') {
  const ownerPath = getFirebaseOwnerPath('profile');
  const ownerId = getFirebaseOwnerId();
  if (!fbUser || !ownerPath || !ownerId) return false;
  const profile = buildCloudProfile();
  fbCloudProfileCache = profile;
  enqueueFirebaseSet(
    ownerPath,
    profile,
    `profile:${ownerId}`,
    { requiresAuth: true }
  );
  return true;
}

function queueLeaderboardEntry(reason = 'leaderboard_sync') {
  if (!G.username) return false;

  const entry = buildFirebaseEntry();
  entry.name = sanitizeUsername(entry.name);
  entry.username = sanitizeUsername(entry.username);
  entry.uid = getFirebaseOwnerId();
  entry.authUid = fbUser?.uid || '';

  const leaderboardKey = getFirebaseOwnerId() || getFirebaseProfileKey(entry.username);
  enqueueFirebaseSet(
    `leaderboard_v2/${leaderboardKey}`,
    entry,
    `leaderboard:${leaderboardKey}`,
    { requiresAuth: !!fbUser }
  );
  return true;
}

// Cloud-Sync Debounce (verhindert Firebase-Überflutung bei schnellen Aktionen)
// BUG-FIX #6: Unterschiedliche Debounce-Zeiten für kritische vs. normale Events
let _cloudSyncDebounceTimers = {};
const CLOUD_SYNC_DEBOUNCE_MS = 2000;
const CLOUD_SYNC_DEBOUNCE_CRITICAL = 500; // Für XP/Ergebnisse

function scheduleCloudSync(reason = 'local_change', options = {}) {
  // Debounce für häufige Calls
  if (_cloudSyncDebounceTimers[reason]) {
    clearTimeout(_cloudSyncDebounceTimers[reason]);
  }

  // BUG-FIX #6: Kritische Events schneller syncen
  const isCritical = options.critical || 
    reason.includes('xp') || 
    reason.includes('battle') || 
    reason.includes('streak');
  const delay = options.immediate ? 0 
    : isCritical ? CLOUD_SYNC_DEBOUNCE_CRITICAL 
    : CLOUD_SYNC_DEBOUNCE_MS;

  return new Promise((resolve) => {
    _cloudSyncDebounceTimers[reason] = setTimeout(() => {
      delete _cloudSyncDebounceTimers[reason];
      doScheduleCloudSync(reason, options).then(resolve);
    }, delay);
  });
}

function doScheduleCloudSync(reason = 'local_change', options = {}) {
  markCloudStateDirty(reason);

  if (fbUser) {
    queueCloudSnapshot(reason);
    queueCloudProfile(reason);
    queueStructuredMatchHistory(reason);
    if (G.username) queueLeaderboardEntry(reason);
    if (G.username) queueDisciplineLeaderboardEntries(reason);
    if (G.username) queueSeasonLeaderboardEntries(reason);
  } else if (fbReady) {
    ensureFirebaseAnonymousAuth().then((user) => {
      if (!user) return;
      fbUser = user;
      resolveFirebaseAccountId(user)
        .then(() => {
          queueCloudSnapshot(reason);
          queueCloudProfile(reason);
          queueStructuredMatchHistory(reason);
          if (G.username) queueLeaderboardEntry(reason);
          if (G.username) queueDisciplineLeaderboardEntries(reason);
          if (G.username) queueSeasonLeaderboardEntries(reason);
          if (options.immediate) flushFirebaseSyncQueue();
          else scheduleFirebaseQueueFlush(options.delay ?? 800);
        });
    });
  }

  if (options.immediate) return Promise.resolve(true);

  scheduleFirebaseQueueFlush(options.delay ?? 800);
  return Promise.resolve(true);
}

function queueFeedbackEntry(entry) {
  if (!entry || typeof entry !== 'object') return;
  const ownerId = getFirebaseOwnerId();
  const key = entry.key || `${entry.ts || Date.now()}_${ownerId || entry.userHash || 'anon'}`;
  const payload = {
    ...entry,
    uid: ownerId || entry.uid || '',
    authUid: fbUser?.uid || entry.authUid || '',
    username: sanitizeUsername(entry.username || G.username || 'Anonym'),
    accountId: ownerId || entry.accountId || ''
  };
  delete payload.key;

  enqueueFirebaseSet(`feedback_v1/${key}`, payload, null, { requiresAuth: false });
  scheduleFirebaseQueueFlush(400);
}

function formatDebugTimestamp(ts) {
  const value = Number(ts);
  if (!Number.isFinite(value) || value <= 0) return '–';
  return new Date(value).toLocaleString('de-DE');
}

function summarizeFeedbackEntries(entries) {
  const safeEntries = Array.isArray(entries) ? entries.filter(entry => entry && typeof entry === 'object') : [];
  const total = safeEntries.length;
  const avgScore = total
    ? (safeEntries.reduce((sum, entry) => sum + (Number(entry.score) || 0), 0) / total)
    : 0;

  const byDiscipline = {};
  safeEntries.forEach((entry) => {
    const key = typeof entry.discipline === 'string' && entry.discipline ? entry.discipline : 'unknown';
    if (!byDiscipline[key]) byDiscipline[key] = { count: 0, avg: 0, sum: 0 };
    byDiscipline[key].count += 1;
    byDiscipline[key].sum += Number(entry.score) || 0;
  });

  const disciplineRows = Object.entries(byDiscipline)
    .map(([discipline, value]) => ({
      discipline,
      label: DISC[discipline]?.name || discipline,
      count: value.count,
      avg: value.count ? value.sum / value.count : 0
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  const latest = safeEntries
    .slice()
    .sort((a, b) => (Number(b.ts) || 0) - (Number(a.ts) || 0))
    .slice(0, 5);

  return {
    total,
    avgScore,
    latest,
    disciplineRows,
    lastTs: latest.length ? Number(latest[0].ts) || 0 : 0
  };
}

function renderDebugFeedbackSection() {
  if (!debugFeedbackState) {
    return '<div class="ps-history-item"><div class="phi-info"><div class="phi-title">Feedback</div><div class="phi-meta">Noch nicht geladen.</div></div></div>';
  }

  const state = debugFeedbackState;
  const summary = summarizeFeedbackEntries(state.entries);
  const summaryLine = state.error
    ? `Feedback-Read fehlgeschlagen: ${state.error}`
    : state.mode === 'remote'
      ? `Remote-Feedback: ${summary.total} Einträge · Ø ${summary.avgScore.toFixed(2)} · Letztes ${formatDebugTimestamp(summary.lastTs)}`
      : state.mode === 'restricted'
        ? 'Remote-Feedback ist nur für Admin-Konten lesbar.'
        : `Lokale Vorschau: ${summary.total} Einträge · Ø ${summary.avgScore.toFixed(2)}`;

  const disciplineHtml = summary.disciplineRows.length
    ? summary.disciplineRows.map((row) => `
            <div class="ps-history-item">
              <div class="phi-info">
                <div class="phi-title">${escHtml(row.label)}</div>
                <div class="phi-meta">${row.count} Feedbacks · Ø ${row.avg.toFixed(2)}</div>
              </div>
            </div>
          `).join('')
    : '<div class="ps-history-item"><div class="phi-info"><div class="phi-title">Disziplinen</div><div class="phi-meta">Noch keine Daten.</div></div></div>';

  const latestHtml = summary.latest.length
    ? summary.latest.map((entry) => {
      const score = Number(entry.score) || 0;
      const username = entry.username || 'Anonym';
      const disciplineLabel = DISC[entry.discipline]?.name || entry.discipline || 'unknown';
      const detail = [
        `${score}/5`,
        disciplineLabel,
        entry.diff || 'n/a',
        formatDebugTimestamp(entry.ts)
      ].join(' · ');
      return `
              <div class="ps-history-item">
                <div class="phi-info">
                  <div class="phi-title">${escHtml(username)}</div>
                  <div class="phi-meta">${escHtml(detail)}</div>
                </div>
              </div>
            `;
    }).join('')
    : '<div class="ps-history-item"><div class="phi-info"><div class="phi-title">Letzte Einträge</div><div class="phi-meta">Noch keine Daten.</div></div></div>';

  return `
        <div class="sun-section-title" style="color:rgba(150,180,220,.4);">◇ Feedback-Dashboard</div>
        <div class="ps-history-item">
          <div class="phi-info">
            <div class="phi-title">Status</div>
            <div class="phi-meta">${escHtml(summaryLine)}</div>
          </div>
        </div>
        ${disciplineHtml}
        ${latestHtml}
      `;
}

function renderDebugPanel() {
  const mount = document.getElementById('psDebugMount');
  if (!mount) return;

  if (!isDebugToolsEnabled()) {
    mount.innerHTML = '<div class="ps-history-empty">Debug-Tools sind deaktiviert.</div>';
    return;
  }

  const meta = loadCloudSyncMeta();
  const queue = loadCloudSyncQueue();
  const history = StorageManager.get('history', []);
  const feedbackEntries = StorageManager.get('feedback_entries', []);
  const analyticsRaw = StorageManager.get('enhanced_analytics', {});
  const analyticsGames = Array.isArray(analyticsRaw?.games) ? analyticsRaw.games : [];
  const scope = getActiveLeaderboardScope();
  const period = getActiveLeaderboardPeriod();
  const ownerId = getFirebaseOwnerId();
  const authUid = fbUser?.uid || '';
  const remote = debugRemoteState;
  const currentDisciplineEntry = Object.prototype.hasOwnProperty.call(DISC, G.discipline)
    ? buildDisciplineLeaderboardEntry(G.discipline)
    : null;
  const seasonInfo = getCurrentSeasonInfo();
  const backoffUntil = Number(meta.queueBackoffUntil) || 0;
  const currentScopeLabel = `${getLeaderboardScopeLabel(scope)} · ${period === 'season' ? seasonInfo.label : 'All-Time'}`;

  mount.innerHTML = `
        <div class="ps-stats-grid">
          <div class="ps-stat-card">
            <div class="ps-sc-label">Firebase</div>
            <div class="ps-sc-val">${fbReady ? 'AN' : 'AUS'}</div>
            <div class="ps-sc-sub">${fbUser ? 'Auth aktiv' : 'keine Auth'}</div>
          </div>
          <div class="ps-stat-card">
            <div class="ps-sc-label">Queue</div>
            <div class="ps-sc-val">${queue.length}</div>
            <div class="ps-sc-sub">ausstehende Writes</div>
          </div>
          <div class="ps-stat-card">
            <div class="ps-sc-label">Matches</div>
            <div class="ps-sc-val">${Array.isArray(history) ? history.length : 0}</div>
            <div class="ps-sc-sub">lokal gespeichert</div>
          </div>
          <div class="ps-stat-card">
            <div class="ps-sc-label">Analytics</div>
            <div class="ps-sc-val">${analyticsGames.length}</div>
            <div class="ps-sc-sub">Spiele im Analytics-Speicher</div>
          </div>
          <div class="ps-stat-card">
            <div class="ps-sc-label">Feedback</div>
            <div class="ps-sc-val">${debugFeedbackState ? summarizeFeedbackEntries(debugFeedbackState.entries).total : feedbackEntries.length}</div>
            <div class="ps-sc-sub">${debugFeedbackState?.mode === 'remote' ? 'remote gelesen' : 'lokale Vorschau'}</div>
          </div>
        </div>

        <div class="sun-section-title" style="color:rgba(150,180,220,.4);">◇ Sync-Status</div>
        <div class="ps-history-item">
          <div class="phi-info">
            <div class="phi-title">User</div>
            <div class="phi-meta">Username: ${escHtml(G.username || '–')} · Konto: ${escHtml(ownerId || '–')} · Auth: ${escHtml(authUid || '–')}</div>
          </div>
        </div>
        <div class="ps-history-item">
          <div class="phi-info">
            <div class="phi-title">Laufzeit</div>
            <div class="phi-meta">Disziplin: ${escHtml(G.discipline)} · Schwierigkeit: ${escHtml(G.diff)} · Leaderboard: ${escHtml(currentScopeLabel)}</div>
          </div>
        </div>
        <div class="ps-history-item">
          <div class="phi-info">
            <div class="phi-title">Queue-Meta</div>
            <div class="phi-meta">Letzte lokale Änderung: ${escHtml(formatDebugTimestamp(meta.lastLocalChangeAt))} · Letzter Flush: ${escHtml(formatDebugTimestamp(meta.lastQueueFlushAt))} · Backoff bis: ${escHtml(formatDebugTimestamp(backoffUntil))}</div>
          </div>
        </div>
        <div class="ps-history-item">
          <div class="phi-info">
            <div class="phi-title">Pfade</div>
            <div class="phi-meta">/users/${escHtml(ownerId || '<accountId>')}/profile · /cloud · /matches · /leaderboard_v2/${escHtml(ownerId || '<accountId>')}</div>
          </div>
        </div>
        <div class="ps-history-item">
          <div class="phi-info">
            <div class="phi-title">Aktuelle Disziplin-Leistung</div>
            <div class="phi-meta">${currentDisciplineEntry ? `Best ${formatLeaderboardScore(currentDisciplineEntry.bestScore, G.discipline)} · Ø ${formatLeaderboardScore(currentDisciplineEntry.averageScore, G.discipline)} · ${currentDisciplineEntry.totalGames} Spiele` : 'Noch keine Daten fuer diese Disziplin.'}</div>
          </div>
        </div>
        <div class="ps-history-item">
          <div class="phi-info">
            <div class="phi-title">Remote-Status</div>
            <div class="phi-meta">${remote ? escHtml(remote.summary) : 'Noch nicht geladen.'}</div>
          </div>
        </div>
        <div class="ps-history-item">
          <div class="phi-info">
            <div class="phi-title">Lokale Puffer</div>
            <div class="phi-meta">Feedback lokal: ${Array.isArray(feedbackEntries) ? feedbackEntries.length : 0} · Rookie-Plan: ${StorageManager.get('rookie_plan_v1', {}).introSeen ? 'gesehen' : 'offen'}</div>
          </div>
        </div>
        ${renderDebugFeedbackSection()}

        <div style="margin-top:14px;display:flex;gap:8px;justify-content:center;flex-wrap:wrap;">
          <button class="btn-sec" style="font-size:0.6rem;" onclick="debugSyncNow()">Sync jetzt</button>
          <button class="btn-sec" style="font-size:0.6rem;" onclick="refreshDebugPanel()">Neu laden</button>
          <button class="btn-sec" style="font-size:0.6rem;" onclick="disableDebugTools()">Debug aus</button>
        </div>
      `;
}

function refreshDebugPanel() {
  if (!debugFeedbackState) {
    debugFeedbackState = {
      mode: 'local',
      entries: StorageManager.get('feedback_entries', [])
    };
  }
  renderDebugPanel();
  if (!isDebugToolsEnabled() || debugRemoteFetchInFlight || !fbReady || !fbDb || !fbUser) return;

  debugRemoteFetchInFlight = true;
  const ownerId = getFirebaseOwnerId() || fbUser.uid;
  const scope = getActiveLeaderboardScope();
  const period = getActiveLeaderboardPeriod();
  const scopePath = getLeaderboardPath(scope, period);
  const seasonId = getCurrentSeasonId();

  Promise.all([
    fbDb.ref(`users/${ownerId}/profile`).once('value'),
    fbDb.ref(`users/${ownerId}/cloud`).once('value'),
    fbDb.ref(`users/${ownerId}/matches`).once('value'),
    fbDb.ref(`leaderboard_v2/${ownerId}`).once('value'),
    fbDb.ref(`${SEASON_ROOT}/${seasonId}/leaderboard_v1/${ownerId}`).once('value'),
    (period === 'alltime' && scope === 'global') ? Promise.resolve(null) : fbDb.ref(`${scopePath}/${ownerId}`).once('value'),
    fbDb.ref(`${ADMIN_ACCOUNTS_ROOT}/${ownerId}`).once('value')
  ])
    .then(async ([profileSnap, cloudSnap, matchesSnap, globalLbSnap, seasonLbSnap, scopedLbSnap, adminSnap]) => {
      const matchCount = matchesSnap?.numChildren ? matchesSnap.numChildren() : Object.keys(matchesSnap?.val() || {}).length;
      const scopedExists = scopedLbSnap?.exists?.() ? 'ja' : ((period === 'alltime' && scope === 'global') ? 'n/a' : 'nein');
      const isAdmin = adminSnap?.val() === true;
      debugRemoteState = {
        summary: `Profil: ${profileSnap?.exists?.() ? 'ja' : 'nein'} · Cloud: ${cloudSnap?.exists?.() ? 'ja' : 'nein'} · Matches: ${matchCount} · Global LB: ${globalLbSnap?.exists?.() ? 'ja' : 'nein'} · Saison LB: ${seasonLbSnap?.exists?.() ? 'ja' : 'nein'} · Scope LB: ${scopedExists} · Admin: ${isAdmin ? 'ja' : 'nein'}`
      };

      if (isAdmin && !debugFeedbackFetchInFlight) {
        debugFeedbackFetchInFlight = true;
        try {
          const feedbackSnap = await fbDb.ref('feedback_v1').orderByChild('ts').limitToLast(50).once('value');
          const entries = [];
          feedbackSnap.forEach((child) => {
            const value = child.val();
            if (value && typeof value === 'object') entries.push(value);
          });
          entries.sort((a, b) => (Number(b.ts) || 0) - (Number(a.ts) || 0));
          debugFeedbackState = { mode: 'remote', entries };
        } catch (error) {
          debugFeedbackState = {
            mode: 'remote',
            entries: [],
            error: error?.code || error?.message || 'feedback-read-failed'
          };
        } finally {
          debugFeedbackFetchInFlight = false;
        }
      } else if (!isAdmin) {
        debugFeedbackState = {
          mode: 'restricted',
          entries: StorageManager.get('feedback_entries', [])
        };
      }
      renderDebugPanel();
    })
    .catch((error) => {
      debugRemoteState = {
        summary: `Remote-Fehler: ${error?.code || error?.message || 'unbekannt'}`
      };
      debugFeedbackState = {
        mode: 'local',
        entries: StorageManager.get('feedback_entries', [])
      };
      renderDebugPanel();
    })
    .finally(() => {
      debugRemoteFetchInFlight = false;
    });
}

function debugSyncNow() {
  scheduleCloudSync('debug_manual_sync', { immediate: true });
  refreshDebugPanel();
}

async function bootstrapCloudUser(user, options = {}) {
  if (!user || !fbDb) return;

  const accountId = await resolveFirebaseAccountId(user, options);
  if (!accountId) return;

  if (fbCloudBootstrapUid === accountId && !options.force) {
    scheduleFirebaseQueueFlush(200);
    return;
  }

  fbCloudBootstrapUid = accountId;

  try {
    const [profileSnap, cloudSnap] = await Promise.all([
      fbDb.ref(`users/${accountId}/profile`).once('value'),
      fbDb.ref(`users/${accountId}/cloud`).once('value')
    ]);

    const remoteProfile = profileSnap.val() || null;
    const remoteCloud = cloudSnap.val() || null;
    const meta = loadCloudSyncMeta();
    const remoteUpdatedAt = Number(remoteCloud?.updatedAt || remoteProfile?.updatedAt || 0);
    const localUpdatedAt = Number(meta.lastLocalChangeAt || 0);

    fbCloudProfileCache = remoteProfile;

    if (remoteCloud && remoteUpdatedAt > localUpdatedAt) {
      const changed = applyCloudSnapshot(remoteCloud);
      saveCloudSyncMeta({
        lastAppliedAt: remoteUpdatedAt,
        lastLocalChangeAt: remoteUpdatedAt
      });
      if (changed) refreshStateFromLocalStorage();
    } else if (remoteProfile && remoteProfile.username && !StorageManager.getRaw('username')) {
      StorageManager.setRaw('username', sanitizeUsername(remoteProfile.username));
      refreshStateFromLocalStorage();
    }

    if (G.username) {
      queueCloudSnapshot('cloud_bootstrap');
      queueCloudProfile('cloud_bootstrap');
      queueStructuredMatchHistory('cloud_bootstrap');
      queueLeaderboardEntry('cloud_bootstrap');
      queueDisciplineLeaderboardEntries('cloud_bootstrap');
      queueSeasonLeaderboardEntries('cloud_bootstrap');
      scheduleFirebaseQueueFlush(200);
    }
    updateAccountSyncStatus();
    refreshDebugPanel();
  } catch (error) {
    console.warn('Cloud bootstrap failed:', error?.code || error?.message || error);
    updateAccountSyncStatus();
  }
}

function ensureFirebaseAnonymousAuth() {
  if (!fbReady || !fbApp || !firebase || typeof firebase.auth !== 'function') {
    return Promise.resolve(null);
  }

  if (!fbAuth) fbAuth = firebase.auth(fbApp);
  if (fbAuth.currentUser) return Promise.resolve(fbAuth.currentUser);

  return fbAuth.signInAnonymously()
    .then(result => result?.user || fbAuth.currentUser || null)
    .catch((error) => {
      console.warn('Firebase anonymous auth failed:', error?.code || error?.message || error);
      return null;
    });
}

function bindFirebaseAuth() {
  if (!fbReady || fbAuthListenerBound || !firebase || typeof firebase.auth !== 'function') return;

  fbAuth = firebase.auth(fbApp);
  fbAuthListenerBound = true;
  fbAuth.onAuthStateChanged((user) => {
    fbUser = user || null;
    if (!fbUser) {
      fbAccountId = '';
      updateAccountSyncStatus();
      updateGoogleLoginUI(null);
      ensureFirebaseAnonymousAuth();
      return;
    }
    updateAccountSyncStatus();
    updateGoogleLoginUI(user);
    bootstrapCloudUser(fbUser);
  });

  ensureFirebaseAnonymousAuth();
}

function initFirebase() {
  try {
    if (!firebase || !firebase.apps) return;
    if (firebase.apps.length === 0) {
      fbApp = firebase.initializeApp(FB_CONFIG);
    } else {
      fbApp = firebase.apps[0];
    }
    fbDb = firebase.database(fbApp);
    fbReady = true;
    bindFirebaseAuth();
    scheduleFirebaseQueueFlush(1200);
  } catch (e) { console.warn('Firebase init failed:', e); fbReady = false; }
}

function getLeaderboardLists() {
  const mountedLists = Array.from(document.querySelectorAll('[data-lb-list]'));
  if (mountedLists.length) return mountedLists;
  const legacyList = document.getElementById('lbList');
  return legacyList ? [legacyList] : [];
}

function setLeaderboardMarkup(markup) {
  getLeaderboardLists().forEach(list => {
    list.innerHTML = markup;
  });
}

function setLeaderboardLoadingState(isLoading) {
  getLeaderboardLists().forEach(list => {
    if (isLoading) list.dataset.loading = 'true';
    else delete list.dataset.loading;
  });
}

function loadLeaderboard(force = false) {
  const lists = getLeaderboardLists();
  if (!lists.length) return;

  const isLoading = lists.some(list => list.dataset.loading === 'true');
  const hasRows = lists.some(list => !!list.querySelector('.lb-row'));
  if (!force && (hasRows || isLoading)) return;

  setLeaderboardLoadingState(true);
  setLeaderboardMarkup('<div class="lb-loading">⏳</div>');

  // Status-Badge (falls vorhanden)
  updateLbStatusBadge();

  const finishLoad = (markup) => {
    setLeaderboardLoadingState(false);
    setLeaderboardMarkup(markup);
  };

  // Warte bis Firebase bereit
  const tryLoad = (attempts) => {
    if (!fbReady) {
      if (attempts > 0) { setTimeout(() => tryLoad(attempts - 1), 800); return; }
      finishLoad('<div class="lb-empty">🔌 Offline – Bestenliste nicht verfügbar.</div>');
      return;
    }

    // Lade Top 50 nach Score sortiert
    fbDb.ref('leaderboard_v2').orderByChild('score').limitToLast(50).once('value')
      .then(snap => {
        const entries = [];
        snap.forEach(child => { entries.push(child.val()); });
        entries.reverse(); // Höchster Score zuerst
        renderLeaderboard(entries);
      })
      .catch(err => {
        console.error('Leaderboard load error:', err?.code, err?.message);
        finishLoad('<div class="lb-empty">⚠️ Fehler beim Laden.</div>');
      });
  };
  tryLoad(15);
}

function renderLeaderboard(entries, scope = getActiveLeaderboardScope()) {
  const lists = getLeaderboardLists();
  if (!lists.length) return;

  setLeaderboardLoadingState(false);
  updateLeaderboardScopeControl();
  if (!entries.length) {
    const emptyText = scope === 'global'
      ? 'Noch keine Eintraege. Sei der Erste! 🏆'
      : `Noch keine Eintraege fuer ${getLeaderboardScopeLabel(scope)}.`;
    setLeaderboardMarkup('<div class="lb-empty">Noch keine Einträge. Sei der Erste! 🏆</div>');
    return;
  }

  const markup = entries.map((e, i) => {
    const displayName = e.name || e.username || 'Anonym';
    const isMe = (getFirebaseOwnerId() && e.uid === getFirebaseOwnerId()) || (G.username && (e.name === G.username || e.username === G.username));
    const weaponIcon = e.weapon === 'kk' ? '🎯' : '🌬️';
    const score = Number(e.score ?? e.xp ?? 0) || 0;
    const xp = Number(e.xp ?? 0) || 0;
    const streak = Number(e.streak ?? 0) || 0;
    const entryDiscipline = e.discipline || (scope === 'global' ? null : scope);
    const isDisciplineScope = scope !== 'global';
    const headlineValue = isDisciplineScope
      ? `${formatLeaderboardScore(e.bestScore ?? score, entryDiscipline)} Best`
      : `${score} Score`;
    const detailValue = isDisciplineScope
      ? `Ø ${formatLeaderboardScore(e.averageScore, entryDiscipline)} · ${Number(e.totalGames || 0)} Spiele`
      : `${xp} XP · 🔥 ${streak}`;
    const subline = isDisciplineScope
      ? `${weaponIcon} ${e.rank || 'Schuetze'} · ${Math.round((Number(e.winRate) || 0) * 100)}% Siege`
      : `${weaponIcon} ${e.rank || 'Schuetze'}`;
    return `
          <div class="lb-row ${isMe ? 'me' : ''}">
            <div class="lb-rank-num">${i + 1}</div>
            <div class="lb-avatar">${escHtml(e.rankIcon || '👤')}</div>
            <div class="lb-info">
              <div class="lb-name">${escHtml(displayName)}${isMe ? ' (Du)' : ''}</div>
              <div class="lb-sub">${weaponIcon} ${escHtml(e.rank || 'Schütze')}</div>
            </div>
            <div class="lb-stats">
              <div class="lb-xp">${score} Score</div>
              <div class="lb-streak">${xp} XP · 🔥 ${streak}</div>
            </div>
          </div>
        `;
  }).join('');

  setLeaderboardMarkup(markup);
}

function escHtml(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

/* ─── FIREBASE SYNC (zentral) ────────────── */
function buildFirebaseEntry() {
  const bestLG = parseInt(localStorage.getItem('sd_lg_best') || '0') || 0;
  const bestKK = parseInt(localStorage.getItem('sd_kk_best') || '0') || 0;
  const bestW = bestLG >= bestKK ? 'lg' : 'kk';
  const bestStreak = Math.max(bestLG, bestKK);
  const curStreak = STREAK_CACHE[G.weapon]?.streak || 0;
  const { rank } = getRank(G.xp);
  // Score = XP + Streak-Bonus (jeder Best-Streak-Punkt = 5 Bonus-Punkte)
  const score = G.xp + bestStreak * 5;
  return {
    uid: getFirebaseOwnerId(),
    authUid: fbUser?.uid || '',
    name: G.username || 'Anonym',
    username: G.username || 'Anonym',
    xp: G.xp,
    rank: rank.name,
    rankIcon: rank.icon,
    streak: bestStreak,
    currentStreak: curStreak,
    score,
    weapon: bestW,
    date: new Date().toLocaleDateString('de-DE')
  };
}

function pushProfileToFirebase(onDone) {
  if (!fbReady || !G.username) { if (onDone) onDone(false); return; }
  const entry = buildFirebaseEntry();
  fbDb.ref('leaderboard_v2/' + G.username).set(entry)
    .then(() => {
      updateLbStatusBadge();
      if (onDone) onDone(true);
    })
    .catch(() => { if (onDone) onDone(false); });
}

function updateLbStatusBadge() {
  const el = document.getElementById('lbStatusBadge');
  if (!el || !G.username) return;
  const ownerId = getFirebaseOwnerId();
  const syncSuffix = ownerId && fbUser?.uid && ownerId !== fbUser.uid ? ' · Sync aktiv' : '';
  el.textContent = `✓ Eingetragen als "${G.username}"${syncSuffix}`;
  el.style.color = 'rgba(140,200,60,.8)';
}

// Legacy: wird noch vom HTML-Button aufgerufen → jetzt nur noch Sync
function submitToLeaderboard() {
  if (!G.username) {
    document.getElementById('welcomeOverlay').classList.add('active');
    setTimeout(() => document.getElementById('welcomeNameInp')?.focus(), 300);
    return;
  }
  pushProfileToFirebase(ok => {
    if (ok) loadLeaderboard(true);
    else alert('Offline – Eintrag konnte nicht gespeichert werden.');
  });
}
renderLeaderboard = function renderLeaderboardPatched(entries, scope = getActiveLeaderboardScope(), period = getActiveLeaderboardPeriod()) {
  const lists = getLeaderboardLists();
  if (!lists.length) return;

  setLeaderboardLoadingState(false);
  updateLeaderboardScopeControl();
  const normalizedPeriod = normalizeLeaderboardPeriod(period);
  const isSeason = normalizedPeriod === 'season';
  const seasonLabel = getCurrentSeasonInfo().label;

  if (!entries.length) {
    const emptyText = isSeason
      ? (scope === 'global'
        ? `Noch keine Saison-Eintraege fuer ${seasonLabel}.`
        : `Noch keine Saison-Eintraege fuer ${getLeaderboardScopeLabel(scope)} in ${seasonLabel}.`)
      : (scope === 'global'
        ? 'Noch keine Eintraege. Sei der Erste! 🏆'
        : `Noch keine Eintraege fuer ${getLeaderboardScopeLabel(scope)}.`);
    setLeaderboardMarkup(`<div class="lb-empty">${emptyText}</div>`);
    return;
  }

  const markup = entries.map((entry, index) => {
    const displayName = entry.name || entry.username || 'Anonym';
    const isMe = (getFirebaseOwnerId() && entry.uid === getFirebaseOwnerId()) || (G.username && (entry.name === G.username || entry.username === G.username));
    const weaponIcon = entry.weapon === 'kk' ? '🎯' : '🌬️';
    const numericScore = Number(entry.score ?? entry.xp ?? 0) || 0;
    const numericXp = Number(entry.xp ?? 0) || 0;
    const numericStreak = Number(entry.streak ?? 0) || 0;
    const entryDiscipline = entry.discipline || (scope === 'global' ? null : scope);
    const isDisciplineScope = scope !== 'global';
    const topLine = isSeason
      ? `${Number(entry.seasonPoints || 0)} Saison-Pkt`
      : (isDisciplineScope
        ? `${formatLeaderboardScore(entry.bestScore ?? numericScore, entryDiscipline)} Best`
        : `${numericScore} Score`);
    const bottomLine = isSeason
      ? (isDisciplineScope
        ? `Ø ${formatLeaderboardScore(entry.averageScore, entryDiscipline)} · ${formatLeaderboardScore(entry.bestScore, entryDiscipline)} Best · ${Number(entry.totalGames || 0)} Spiele`
        : `${Number(entry.wins || 0)} Siege · ${Number(entry.draws || 0)} U · ${Number(entry.totalGames || 0)} Spiele`)
      : (isDisciplineScope
        ? `Ø ${formatLeaderboardScore(entry.averageScore, entryDiscipline)} · ${Number(entry.totalGames || 0)} Spiele`
        : `${numericXp} XP · 🔥 ${numericStreak}`);
    const subline = isSeason
      ? `${weaponIcon} ${entry.rank || 'Schuetze'} · ${seasonLabel}`
      : (isDisciplineScope
        ? `${weaponIcon} ${entry.rank || 'Schuetze'} · ${Math.round((Number(entry.winRate) || 0) * 100)}% Siege`
        : `${weaponIcon} ${entry.rank || 'Schuetze'}`);

    return `
          <div class="lb-row ${isMe ? 'me' : ''}">
            <div class="lb-rank-num">${index + 1}</div>
            <div class="lb-avatar">${escHtml(entry.rankIcon || '👤')}</div>
            <div class="lb-info">
              <div class="lb-name">${escHtml(displayName)}${isMe ? ' (Du)' : ''}</div>
              <div class="lb-sub">${escHtml(subline)}</div>
            </div>
            <div class="lb-stats">
              <div class="lb-xp">${topLine}</div>
              <div class="lb-streak">${bottomLine}</div>
            </div>
          </div>
        `;
  }).join('');

  setLeaderboardMarkup(markup);
};

loadLeaderboard = function loadLeaderboardPatched(force = false) {
  const lists = getLeaderboardLists();
  if (!lists.length) return;

  const isLoading = lists.some(list => list.dataset.loading === 'true');
  const hasRows = lists.some(list => !!list.querySelector('.lb-row'));
  if (!force && (hasRows || isLoading)) return;

  setLeaderboardLoadingState(true);
  setLeaderboardMarkup('<div class="lb-loading">...</div>');
  updateLeaderboardScopeControl();
  updateLbStatusBadge();

  const scope = getActiveLeaderboardScope();
  const period = getActiveLeaderboardPeriod();
  const path = getLeaderboardPath(scope, period);

  const finishLoad = (markup) => {
    setLeaderboardLoadingState(false);
    setLeaderboardMarkup(markup);
  };

  const tryLoad = (attempts) => {
    if (!fbReady) {
      if (attempts > 0) {
        setTimeout(() => tryLoad(attempts - 1), 800);
        return;
      }
      if (renderCachedLeaderboard(scope, period)) return;
      finishLoad('<div class="lb-empty">Offline - Bestenliste nicht verfuegbar.</div>');
      return;
    }

    fbDb.ref(path).orderByChild('score').limitToLast(50).once('value')
      .then(snap => {
        const entries = [];
        snap.forEach(child => {
          const value = child.val();
          if (value && typeof value === 'object') {
            entries.push({ ...value, username: value.username || child.key });
          }
        });
        entries.sort((a, b) => (Number(b.score ?? b.xp ?? 0) || 0) - (Number(a.score ?? a.xp ?? 0) || 0));
        cacheLeaderboardEntries(entries, scope, period);
        renderLeaderboard(entries, scope, period);
      })
      .catch(err => {
        console.error('Leaderboard load error:', err?.code, err?.message);
        if (renderCachedLeaderboard(scope, period)) return;
        finishLoad('<div class="lb-empty">Fehler beim Laden.</div>');
      });
  };

  tryLoad(15);
};

pushProfileToFirebase = function pushProfileToFirebasePatched(onDone) {
  if (!G.username) { if (onDone) onDone(false); return; }

  const finish = (ok) => {
    if (ok) updateLbStatusBadge();
    if (onDone) onDone(ok);
  };

  const syncNow = () => {
    queueCloudSnapshot('profile_push');
    queueCloudProfile('profile_push');
    queueStructuredMatchHistory('profile_push');
    queueLeaderboardEntry('profile_push');
    queueDisciplineLeaderboardEntries('profile_push');
    queueSeasonLeaderboardEntries('profile_push');
    return flushFirebaseSyncQueue()
      .then(() => finish(true))
      .catch((err) => {
        console.error('Leaderboard push error:', err?.code, err?.message);
        finish(false);
      });
  };

  scheduleCloudSync('profile_push');

  if (!fbReady || !fbDb) {
    finish(true);
    return;
  }

  if (fbUser) {
    syncNow();
    return;
  }

  ensureFirebaseAnonymousAuth()
    .then((user) => {
      if (!user) {
        finish(false);
        return;
      }
      fbUser = user;
      syncNow();
    })
    .catch((err) => {
      console.error('Firebase auth sync error:', err?.code, err?.message);
      finish(false);
    });
};

const DOM = {};
function initDOMCache() {
  const ids = [
    'shotsLeft', 'playerScoreChip', 'playerScoreChipSub', 'botScoreChip', 'botScoreChipInt', 'botScoreChipContainer', 'botScoreDivider',
    'lsbDec', 'lsbDecBlock', 'lsbDecDivider', 'lsbInt', 'lsbProj',
    'spFill', 'spCount', 'spLbl', 'spPosRow', 'spPosLbl', 'spPosCount', 'spPosFill',
    'battleTag', 'battleFireBtn', 'battleBurstBtn', 'skipProbeBtn',
    'lastShotTxt', 'shotLog', 'shotLogWrap', 'muzzleFlash',
    'battleBadge', 'battleWeaponBadge',
    'distInfo', 'distCard', 'diffInfoTxt', 'setupTag', 'logoTag',
    'shotCountCard',
    'botFinalPts', 'botFinalPtsCol', 'botFinalDivider', 'botFinalInt', 'botFinalDetail',
    'playerInp', 'playerInpInt', 'inpHint', 'autoInt', 'autoIntVal', 'entryTag',
    'goP', 'goB', 'goPInt', 'goBInt', 'goPUnit', 'goTitle', 'goSub', 'goEmoji', 'goReason', 'goMargin', 'analysisResult',
    'feedbackCount',
    'fbResultIcon', 'fbResultTitle', 'fbResultScore', 'fbComment', 'fbCounter', 'fbSubmitBtn',
    'wTabLG', 'wTabKK', 'discTabs',
    'posBar', 'posItem0', 'posItem1', 'posItem2', 'posShots0', 'posShots1', 'posShots2',
    'scFire', 'scN', 'scLbl',
    'burstBtn', 'burstBtnTxt', 'burstBadge',
    // Schützenpass elements
    'spRankName', 'spRankCur', 'spRankNext', 'spFillBar', 'spXpCur', 'spXpNext',
    // Profil Menu elements (legacy)
    'profileBtn', 'profileMenu', 'profileIcon', 'profileRank', 'pmRank', 'pmLevel', 'pmXP', 'pmStreak',
    // Profil Overlay (new)
    'profileOverlay', 'profileSheet', 'psAvatar', 'psAvatarIcon',
    'psUsername', 'psRankIcon', 'psRankName', 'psLevel', 'psTotalXP',
    'psXpCur', 'psXpNext', 'psXpFill',
    'psStat-wins', 'psStat-losses', 'psStat-games', 'psStat-winrate', 'psStat-streak',
    'psLGDetail', 'psLGXP', 'psKKDetail', 'psKKXP',
    'sunTotalVal', 'sunStarsRow',
    'sunGrid-basic', 'sunGrid-battle', 'sunGrid-master',
    'psHistoryList',
    'streakCorner'
  ];
  ids.forEach(id => { DOM[id] = document.getElementById(id); });
  // slPills containers built dynamically — cached on startBattle
  DOM.slPills = [null, null, null];
}

/* ─── CANVAS ─────────────────────────────── */
// Lazy getter für canvas und ctx - vermeidet null-Referenz wenn DOM noch nicht ready
let _canvas = null;
let _ctx = null;
function getCanvas() {
  if (!_canvas) {
    _canvas = document.getElementById('targetCanvas');
    if (!_canvas) {
      console.error('[app.js] #targetCanvas nicht im DOM gefunden!');
      return null;
    }
  }
  return _canvas;
}
function getCtx() {
  if (!_ctx && getCanvas()) {
    _ctx = _canvas.getContext('2d', { alpha: false });
  }
  return _ctx;
}
// Compatibility: Erstelle canvas/ctx als Proxies für bestehenden Code
const canvas = new Proxy({}, {
  get: (target, prop) => {
    const c = getCanvas();
    return c ? c[prop] : undefined;
  }
});
const ctx = new Proxy({}, {
  get: (target, prop) => {
    const c = getCtx();
    return c ? c[prop] : undefined;
  }
});

// Offscreen canvas: static target (rings, numbers, crosshairs) — drawn once per resize
const _offCanvas = document.createElement('canvas');
const _offCtx = _offCanvas.getContext('2d', { alpha: false });
let _staticReady = false;
let _lastSz = 0; // track last canvas size to skip redundant rebuilds

function setSz() {
  const vw = Math.min(window.innerWidth, 420);
  const sz = Math.min(vw - 36, 270);
  // Only rebuild offscreen canvases when size actually changed
  if (sz === _lastSz) return;
  _lastSz = sz;
  canvas.width = sz; canvas.height = sz;
  _offCanvas.width = sz; _offCanvas.height = sz;
  _offCanvasKK50.width = sz; _offCanvasKK50.height = sz;
  _staticReady = false;
  _kk50Ready = false;
}

/* Rings: [relR, fill, stroke, basePts, label] – outer → inner
   Radien stimmen exakt mit LG_RINGS / KK_RINGS in den Build-Funktionen überein */
const RINGS = [
  [1.00, '#ffffff', '#111111', 1, 'Ring 1'],
  [0.90, '#ffffff', '#111111', 2, 'Ring 2'],
  [0.80, '#ffffff', '#111111', 3, 'Ring 3'],
  [0.70, '#111111', '#ffffff', 4, 'Ring 4'],
  [0.60, '#111111', '#ffffff', 5, 'Ring 5'],
  [0.50, '#111111', '#ffffff', 6, 'Ring 6'],
  [0.40, '#111111', '#ffffff', 7, 'Ring 7'],
  [0.30, '#111111', '#ffffff', 8, 'Ring 8'],
  [0.20, '#111111', '#ffffff', 9, 'Ring 9'],
  [0.10, '#111111', '#ffffff', 10, 'Innenzehner']
];

// Separate offscreen canvas für KK 50m realistisches Zielschirmfoto
const _offCanvasKK50 = document.createElement('canvas');
const _offCtxKK50 = _offCanvasKK50.getContext('2d', { alpha: false });
let _kk50Ready = false;

// Deutsche Kleinkaliber-Scheibe — exakt nach Vorlage
// Ringe 1–3 weiß (schmal, ~30% Radius), Ringe 4–10 schwarz (~70% Radius)
// Zahlen auf weißen Ringen: oben+unten+links+rechts (schwarz)
// Zahlen auf schwarzen Ringen: oben+unten+links+rechts (weiß)
function buildKK50Target() {
  const W = _offCanvasKK50.width, H = _offCanvasKK50.height;
  const cx = W / 2, cy = H / 2, maxR = W / 2 - 3;
  const oc = _offCtxKK50;

  // Weißer Papierhintergrund
  oc.fillStyle = '#ffffff';
  oc.fillRect(0, 0, W, H);

  // Echte KK-Scheibe: schwarze Fläche = 70% des Radius (Ringe 4–10)
  // Weiße Ringe 1–3 = je ~10% des Radius (schmal)
  // Radien von außen nach innen:
  const KK_RINGS = [
    { r: 1.000, fill: '#ffffff' },  // Ring 1 — äußerste weiße Linie
    { r: 0.900, fill: '#ffffff' },  // Ring 2
    { r: 0.800, fill: '#ffffff' },  // Ring 3 — Grenze weiß/schwarz
    { r: 0.700, fill: '#0d0d0d' },  // Ring 4
    { r: 0.600, fill: '#0d0d0d' },  // Ring 5
    { r: 0.500, fill: '#0d0d0d' },  // Ring 6
    { r: 0.400, fill: '#0d0d0d' },  // Ring 7
    { r: 0.300, fill: '#0d0d0d' },  // Ring 8
    { r: 0.200, fill: '#0d0d0d' },  // Ring 9
    { r: 0.100, fill: '#0d0d0d' },  // Ring 10
  ];

  // 1. Alle Ringe füllen (außen → innen)
  for (const ring of KK_RINGS) {
    oc.beginPath();
    oc.arc(cx, cy, ring.r * maxR, 0, Math.PI * 2);
    oc.fillStyle = ring.fill;
    oc.fill();
  }

  // 2. Schwarze Trennlinien für weiße Ringe (1–3)
  for (const ring of KK_RINGS.slice(0, 3)) {
    oc.beginPath();
    oc.arc(cx, cy, ring.r * maxR, 0, Math.PI * 2);
    oc.strokeStyle = '#0d0d0d';
    oc.lineWidth = 1.0;
    oc.stroke();
  }

  // 3. Weiße Trennlinien zwischen schwarzen Ringen (4–10)
  for (const ring of KK_RINGS.slice(3)) {
    oc.beginPath();
    oc.arc(cx, cy, ring.r * maxR, 0, Math.PI * 2);
    oc.strokeStyle = '#ffffff';
    oc.lineWidth = 1.2;
    oc.stroke();
  }

  // 4. Innenzehner-Kreis (X-Ring) — deutlicher weißer Kreis im 10er
  const xR = KK_RINGS[9].r * maxR * 0.50;
  oc.beginPath();
  oc.arc(cx, cy, xR, 0, Math.PI * 2);
  oc.strokeStyle = '#ffffff';
  oc.lineWidth = 1.5;
  oc.stroke();

  // 5. Mittelpunkt (kleiner weißer Punkt)
  oc.beginPath();
  oc.arc(cx, cy, 2, 0, Math.PI * 2);
  oc.fillStyle = '#ffffff';
  oc.fill();

  // 6. Zahlen — wie auf der echten Scheibe
  // Weiße Ringe (1–3): schwarze Zahl, nur oben+unten+links+rechts
  // Schwarze Ringe (4–9): weiße Zahl, alle 4 Richtungen
  const fs = Math.max(6, maxR * 0.052);
  oc.font = `bold ${fs}px Arial, sans-serif`;
  oc.textAlign = 'center';
  oc.textBaseline = 'middle';

  // Ringmitte = Mitte zwischen äußerem und innerem Rand
  const numData = [
    { mid: 0.950, num: 1, white: true },
    { mid: 0.850, num: 2, white: true },
    { mid: 0.750, num: 3, white: true },
    { mid: 0.650, num: 4, white: false },
    { mid: 0.550, num: 5, white: false },
    { mid: 0.450, num: 6, white: false },
    { mid: 0.350, num: 7, white: false },
    { mid: 0.250, num: 8, white: false },
    { mid: 0.150, num: 9, white: false },
  ];

  numData.forEach(({ mid, num, white }) => {
    const r = mid * maxR;
    oc.fillStyle = white ? '#0d0d0d' : '#ffffff';
    // Alle 4 Richtungen (wie auf der echten Scheibe)
    oc.fillText(num, cx, cy - r);
    oc.fillText(num, cx, cy + r);
    oc.fillText(num, cx - r, cy);
    oc.fillText(num, cx + r, cy);
  });

  // 7. Äußerer Rand (doppelte schwarze Linie wie auf der Vorlage)
  oc.beginPath();
  oc.arc(cx, cy, maxR, 0, Math.PI * 2);
  oc.strokeStyle = '#0d0d0d';
  oc.lineWidth = 2.5;
  oc.stroke();

  _kk50Ready = true;
}

// Luftgewehr-Scheibe (10m) — authentisch schwarz-weiß
// Ringe 1–3 weiß, Ringe 4–10 schwarz (wie echte ISSF LG-Scheibe)
function buildStaticTarget() {
  const W = _offCanvas.width, H = _offCanvas.height;
  const cx = W / 2, cy = H / 2, maxR = W / 2 - 3;
  const oc = _offCtx;

  // Weißer Papierhintergrund
  oc.fillStyle = '#ffffff';
  oc.fillRect(0, 0, W, H);

  // LG-Scheibe: 10 Ringe, gleichmäßig aufgeteilt
  // Ringe 1–3: weiß; Ringe 4–10: schwarz
  const LG_RINGS = [
    { r: 1.000, fill: '#ffffff', pts: 1 },
    { r: 0.900, fill: '#ffffff', pts: 2 },
    { r: 0.800, fill: '#ffffff', pts: 3 },
    { r: 0.700, fill: '#111111', pts: 4 },
    { r: 0.600, fill: '#111111', pts: 5 },
    { r: 0.500, fill: '#111111', pts: 6 },
    { r: 0.400, fill: '#111111', pts: 7 },
    { r: 0.300, fill: '#111111', pts: 8 },
    { r: 0.200, fill: '#111111', pts: 9 },
    { r: 0.100, fill: '#111111', pts: 10 },
  ];

  // Ringe von außen nach innen füllen
  for (const ring of LG_RINGS) {
    oc.beginPath();
    oc.arc(cx, cy, ring.r * maxR, 0, Math.PI * 2);
    oc.fillStyle = ring.fill;
    oc.fill();
  }

  // Schwarze Außenränder für weiße Ringe (1–3)
  for (const ring of LG_RINGS.slice(0, 3)) {
    oc.beginPath();
    oc.arc(cx, cy, ring.r * maxR, 0, Math.PI * 2);
    oc.strokeStyle = '#111111';
    oc.lineWidth = 1.2;
    oc.stroke();
  }

  // Weiße Trennlinien zwischen den schwarzen Ringen (4–10)
  for (const ring of LG_RINGS.slice(3)) {
    oc.beginPath();
    oc.arc(cx, cy, ring.r * maxR, 0, Math.PI * 2);
    oc.strokeStyle = '#ffffff';
    oc.lineWidth = 1.0;
    oc.stroke();
  }

  // Innenzehner (X-Ring)
  const xR = 0.100 * maxR * 0.5;
  oc.beginPath();
  oc.arc(cx, cy, xR, 0, Math.PI * 2);
  oc.strokeStyle = '#ffffff';
  oc.lineWidth = 1.0;
  oc.stroke();

  // Mittelpunkt
  oc.beginPath();
  oc.arc(cx, cy, 1.5, 0, Math.PI * 2);
  oc.fillStyle = '#ffffff';
  oc.fill();

  // Ring-Nummern — auf schwarzen Ringen: weiße Box mit schwarzer Zahl
  const fs = Math.max(7, maxR * 0.055);
  oc.font = `bold ${fs}px Arial, sans-serif`;
  oc.textAlign = 'center';
  oc.textBaseline = 'middle';

  const numPos = [
    { rel: 0.950, num: 1, dark: true },
    { rel: 0.850, num: 2, dark: true },
    { rel: 0.750, num: 3, dark: true },
    { rel: 0.650, num: 4, dark: false },
    { rel: 0.550, num: 5, dark: false },
    { rel: 0.450, num: 6, dark: false },
    { rel: 0.350, num: 7, dark: false },
    { rel: 0.250, num: 8, dark: false },
    { rel: 0.150, num: 9, dark: false },
  ];

  numPos.forEach(({ rel, num, dark }) => {
    const r = rel * maxR;
    const positions = [[cx, cy - r], [cx, cy + r], [cx - r, cy], [cx + r, cy]];
    oc.fillStyle = dark ? '#111111' : '#ffffff';
    positions.forEach(([nx, ny]) => {
      oc.fillText(num, nx, ny);
    });
  });

  // Fadenkreuz (nur im weißen Bereich sichtbar)
  oc.strokeStyle = 'rgba(0,0,0,0.12)';
  oc.lineWidth = 0.5;
  oc.setLineDash([4, 8]);
  oc.beginPath();
  oc.moveTo(cx, cy - maxR * 0.98);
  oc.lineTo(cx, cy - 0.70 * maxR);
  oc.moveTo(cx, cy + 0.70 * maxR);
  oc.lineTo(cx, cy + maxR * 0.98);
  oc.stroke();
  oc.beginPath();
  oc.moveTo(cx - maxR * 0.98, cy);
  oc.lineTo(cx - 0.70 * maxR, cy);
  oc.moveTo(cx + 0.70 * maxR, cy);
  oc.lineTo(cx + maxR * 0.98, cy);
  oc.stroke();
  oc.setLineDash([]);

  // Äußerer Rand
  oc.beginPath();
  oc.arc(cx, cy, maxR, 0, Math.PI * 2);
  oc.strokeStyle = '#333333';
  oc.lineWidth = 2;
  oc.stroke();

  _staticReady = true;
}

/**
 * Zeichnet die Zielscheibe und Schüsse auf ein beliebiges Canvas
 * (Wird für die Vorschau und das Teilen genutzt)
 */
function drawOnCanvas(targetCanvas, shots) {
  const oc = targetCanvas.getContext('2d');
  const W = targetCanvas.width, H = targetCanvas.height;
  const cx = W / 2, cy = H / 2, maxR = W / 2 - 3;

  // 1. Hintergrund / Scheibe zeichnen
  oc.fillStyle = '#111111';
  oc.fillRect(0, 0, W, H);

  if (G.weapon === 'kk') {
    if (!_kk50Ready) buildKK50Target();
    oc.drawImage(_offCanvasKK50, 0, 0, _offCanvasKK50.width, _offCanvasKK50.height, 0, 0, W, H);
  } else {
    if (!_staticReady) buildStaticTarget();
    oc.drawImage(_offCanvas, 0, 0, _offCanvas.width, _offCanvas.height, 0, 0, W, H);
  }

  // 2. Schüsse zeichnen
  if (shots && Array.isArray(shots)) {
    for (const s of shots) {
      const r = G.weapon === 'kk' ? maxR * 0.030 : maxR * 0.036;
      drawHole(oc, cx + s.dx, cy + s.dy, r, '#111111', '#444444', s.cracks);
    }
  }
}

function drawTarget(shots) {
  if (!canvas || !ctx) return;
  drawOnCanvas(canvas, shots);
}

function drawHole(targetCtx, x, y, r, dark, glow, cracks) {
  const c = targetCtx || ctx;
  // Papier-Aufriss-Schatten (leichter Grauschimmer um das Loch)
  const shadow = c.createRadialGradient(x, y, r * 0.8, x, y, r * 3.5);
  shadow.addColorStop(0, 'rgba(0,0,0,0.18)');
  shadow.addColorStop(1, 'transparent');
  c.beginPath(); c.arc(x, y, r * 3.5, 0, Math.PI * 2);
  c.fillStyle = shadow; c.fill();

  // Papier-Risse (kurze Linien um das Loch)
  c.save(); c.translate(x, y);
  c.strokeStyle = 'rgba(0,0,0,0.25)'; c.lineWidth = 0.6;
  const crackData = cracks || Array.from({ length: 6 }, (_, i) => ({ a: (i / 6) * Math.PI * 2 + 0.3, len: 1.8 }));
  for (const cData of crackData) {
    c.beginPath();
    c.moveTo(Math.cos(cData.a) * r * 0.9, Math.sin(cData.a) * r * 0.9);
    c.lineTo(Math.cos(cData.a) * r * cData.len, Math.sin(cData.a) * r * cData.len);
    c.stroke();
  }
  c.restore();

  // Einschussloch: dunkel, leicht aufgerissen
  const hg = c.createRadialGradient(x - r * .25, y - r * .25, 0, x, y, r);
  hg.addColorStop(0, '#1a1a1a');
  hg.addColorStop(0.7, '#080808');
  hg.addColorStop(1, dark);
  c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2);
  c.fillStyle = hg; c.fill();

  // Heller Rand (Papier aufgerissen)
  c.beginPath(); c.arc(x, y, r * 1.15, 0, Math.PI * 2);
  c.strokeStyle = 'rgba(255,255,255,0.5)'; c.lineWidth = r * 0.4; c.stroke();
}

function gauss(s) {
  const u = Math.max(1e-10, Math.random());
  return s * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * Math.random());
}

/* ─── SCORING ─────────────────────────────── */
function scoreHit(dx, dy) {
  const maxR = canvas.width / 2 - 3;
  const d = Math.sqrt(dx * dx + dy * dy);

  if (d > RINGS[0][0] * maxR) return { pts: 0, label: 'Daneben!', isX: false };

  let ringIdx = 0;
  for (let i = RINGS.length - 1; i >= 0; i--) {
    if (d <= RINGS[i][0] * maxR) { ringIdx = i; break; }
  }

  const basePts = RINGS[ringIdx][3];
  const outerR = RINGS[ringIdx][0] * maxR;
  const innerR = ringIdx + 1 < RINGS.length ? RINGS[ringIdx + 1][0] * maxR : 0;
  const ringW = outerR - innerR;
  const posInRing = ringW > 0 ? (outerR - d) / ringW : 1;

  const finalPts = Math.round(Math.min(10.9, basePts + posInRing * 0.9) * 10) / 10;

  const xR = RINGS[9][0] * maxR * 0.50; // X-Ring = halber 10er-Ring, wie in buildTarget
  const isX = basePts === 10 && d <= xR;

  const label = isX ? '✦ Innenzehner (X)' : RINGS[ringIdx][4];
  return { pts: finalPts, label, isX };
}

function fmtPts(v) {
  // Formatiere mit IMMER einer Dezimalstelle (z.B. "200.0", "200.5")
  return typeof v === 'number' ? v.toFixed(1) : '–';
}

/* ─── WEAPON + DISCIPLINE SWITCH ────────── */
function switchWeapon(w) {
  if (G.weapon === w) return;
  G.weapon = w;
  DOM.wTabLG.classList.toggle('active', w === 'lg');
  DOM.wTabKK.classList.toggle('active', w === 'kk');
  // auto-select first discipline for this weapon
  const firstDisc = WEAPON_DISCS[w][0];
  buildDiscTabs(w);
  selDisc(firstDisc);
}

function buildDiscTabs(w) {
  const discs = WEAPON_DISCS[w];
  DOM.discTabs.innerHTML = discs.map(d => {
    const cfg = DISC[d];
    return `<div class="disc-tab${G.discipline === d ? ' active' : ''}" onclick="selDisc('${d}')">
      <div class="dt-name">${cfg.icon} ${cfg.name}</div>
      <div class="dt-desc">${cfg.desc}</div>
    </div>`;
  }).join('');
}

function selDisc(discKey) {
  const dc = DISC[discKey];
  if (!dc) return;
  G.discipline = discKey;
  G.weapon = dc.weapon;
  G.dist = dc.dist;
  G.shots = dc.shots;
  G.is3x20 = dc.is3x20;

  // Refresh disc tab active state
  DOM.discTabs.querySelectorAll('.disc-tab').forEach((el, i) => {
    el.classList.toggle('active', WEAPON_DISCS[G.weapon][i] === discKey);
  });

  // Distance card: hide for fixed-dist disciplines
  const cfg = WEAPON_CFG[G.weapon];
  document.querySelectorAll('#distGroup .db').forEach(btn => {
    const allowed = cfg.allowedDists.includes(btn.dataset.dist);
    btn.classList.toggle('hidden', !allowed);
    btn.classList.toggle('active', btn.dataset.dist === dc.dist);
  });
  // Distanz ist immer durch die Disziplin fix → Card immer verstecken
  if (DOM.distCard) DOM.distCard.style.display = 'none';

  // All disciplines have a fixed shot count — hide the manual selector always
  if (DOM.shotCountCard) DOM.shotCountCard.style.display = 'none';

  // Update info text
  if (DOM.distInfo) DOM.distInfo.querySelector('.info-txt').innerHTML = dc.info;
  DOM.setupTag.textContent = WEAPON_CFG[G.weapon].setupTag(discKey, dc.dist);
  DOM.logoTag.textContent = `Du vs. Bot · ${dc.name} · ${dc.shots} Schuss · Wer trifft besser?`;

  // Aktualisiere Schwierigkeitsinformation, falls bereits eine Schwierigkeit ausgewählt ist
  const adaptiveDiff = typeof AdaptiveBotSystem !== 'undefined' &&
    typeof AdaptiveBotSystem.getCurrentDifficulty === 'function' &&
    typeof AdaptiveBotSystem.isEnabled === 'function' &&
    AdaptiveBotSystem.isEnabled()
    ? AdaptiveBotSystem.getCurrentDifficulty(discKey)
    : null;

  if (adaptiveDiff && DIFF[adaptiveDiff]) {
    setDifficulty(adaptiveDiff, { persist: false });
  } else if (G.diff) {
    DOM.diffInfoTxt.innerHTML = getDiffInfo(G.diff);
  }
}

/* ─── SELECTORS ──────────────────────────── */
function selDist(btn) {
  // Distanz wird immer durch die Disziplin bestimmt – kein manueller Wechsel
  return;
}

function setDifficulty(diff, options = {}) {
  if (!diff || !DIFF[diff]) return;
  const persist = options.persist !== false;

  G.diff = diff;
  document.querySelectorAll('#diffGroup .dif').forEach((button) => {
    button.classList.toggle('active', button.dataset.diff === diff);
  });

  if (DOM.diffInfoTxt) {
    DOM.diffInfoTxt.innerHTML = getDiffInfo(diff);
  }

  if (DOM.battleBadge) {
    DOM.battleBadge.textContent = DIFF[diff].lbl;
    DOM.battleBadge.className = 'diff-badge ' + DIFF[diff].cls;
  }

  if (
    persist &&
    typeof AdaptiveBotSystem !== 'undefined' &&
    typeof AdaptiveBotSystem.setCurrentDifficulty === 'function' &&
    typeof AdaptiveBotSystem.isEnabled === 'function' &&
    AdaptiveBotSystem.isEnabled() &&
    G.discipline
  ) {
    AdaptiveBotSystem.setCurrentDifficulty(G.discipline, diff, {
      recordHistory: false,
      reason: typeof options.reason === 'string' ? options.reason : 'Manual selection'
    });
  }
}

function selDiff(btn) {
  setDifficulty(btn.dataset.diff, { reason: 'Manual selection' });
}

function selShots(btn) {
  document.querySelectorAll('#shotCountGroup .scb').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  G.shots = parseInt(btn.dataset.shots);
  DOM.logoTag.textContent = `Du vs. Bot · ${DISC[G.discipline]?.name || G.discipline} · ${G.shots} Schuss · Wer trifft besser?`;
}

function toggleBurst() {
  G.burst = !G.burst;
  DOM.burstBtn.classList.toggle('on', G.burst);
  DOM.burstBtnTxt.textContent = G.burst ? '🔫 5er-Salve: AN' : '🔫 5er-Salve: AUS';
  DOM.burstBadge.textContent = G.burst ? 'AKTIV' : 'OPTIONAL';
}

/* ─── STREAK (getrennt per Waffe) ────────────
   Keys: sd_lg_streak / sd_kk_streak  etc.
   Streak-Corner zeigt immer die aktive Waffe
────────────────────────────────────────────*/
// In-memory streak cache (avoid repeated localStorage reads)
const STREAK_CACHE = { lg: null, kk: null };

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function loadAllStreaks() {
  ['lg', 'kk'].forEach(w => loadStreakForWeapon(w));
  updateXPCorner(); // XP-Corner beim Start befüllen
}

function loadStreakForWeapon(w) {
  const streak = StorageManager.get(`${w}_streak`, 0);
  const best = StorageManager.get(`${w}_best`, 0);
  STREAK_CACHE[w] = { streak, best };
}

function updateStreakCorner() {
  // Jetzt XP-basiert statt Streak-basiert
  updateXPCorner();
}

function updateXPCorner() {
  const corner = DOM.streakCorner;
  if (!corner) return;

  const { rank, idx } = getRank(G.xp);

  // Farbe nach Rang-Stufe
  corner.classList.remove('silver', 'gold', 'red', 'purple');
  if (idx >= 5) corner.classList.add('purple'); // Legende
  else if (idx >= 4) corner.classList.add('red');    // Großmeister
  else if (idx >= 3) corner.classList.add('gold');   // Meister
  else if (idx >= 2) corner.classList.add('silver'); // Fortgeschr.
  // idx 0-1: Standard-Lila (default CSS)

  // Icon nach Rang
  if (DOM.scFire) DOM.scFire.textContent = rank.icon;
  if (DOM.scN) DOM.scN.textContent = G.xp;
  if (DOM.scLbl) DOM.scLbl.textContent = 'XP';
}

function updateWinStreak(won) {
  // Increment streak on win, reset to 0 on loss
  const w = G.weapon;
  let { streak, best } = STREAK_CACHE[w] || { streak: 0, best: 0 };

  if (won) {
    streak++;
  } else {
    streak = 0;
  }

  const newBest = Math.max(streak, best);
  StorageManager.set(`${w}_streak`, streak);
  StorageManager.set(`${w}_best`, newBest);
  scheduleCloudSync(`streak_${w}`);

  STREAK_CACHE[w] = { streak, best: newBest };
  G.streak = streak;
}

/* ─── TIMER & BOT-INTERVAL HELPERS ──────── */
function clearBattleTimers() {
  if (G._botStartTimeout) { clearTimeout(G._botStartTimeout); G._botStartTimeout = null; }
  if (G._botInterval) { clearTimeout(G._botInterval); G._botInterval = null; }
  if (G._timerInterval) { clearInterval(G._timerInterval); G._timerInterval = null; }
}

const KK3X20_CFG = {
  probeSecs: 10 * 60,
  transitionPhases: [
    { secs: 10 * 60, label: 'Uebergang Kniend -> Liegend' }, // fest 10 Min
    { secs: 15 * 60, label: 'Uebergang Liegend -> Stehend' } // ca. 15 Min
  ],
  positionTimings: [
    { baseSecs: 72, min: 58, max: 88 },  // Kniend: 24 Min / 20 Schuss
    { baseSecs: 36, min: 28, max: 48 },  // Liegend: 12 Min / 20 Schuss
    { baseSecs: 84, min: 68, max: 102 }  // Stehend: 28 Min / 20 Schuss
  ]
};

function getKK3x20TimingByPos() {
  const idx = Math.max(0, Math.min(KK3X20_CFG.positionTimings.length - 1, G.posIdx || 0));
  return KK3X20_CFG.positionTimings[idx];
}

function beginKK3x20Transition(nextPosIdx) {
  const phase = KK3X20_CFG.transitionPhases[nextPosIdx - 1];
  if (!phase) return;
  G.transitionSecsLeft = phase.secs;
  G.transitionLabel = phase.label;
}

function startMatchTimer(totalSecs) {
  G._timerSecsLeft = totalSecs;
  const box = document.getElementById('matchTimerBox');
  const val = document.getElementById('matchTimerVal');

  function tick() {
    // Probezeit-Info
    let timerDisp = '';
    if (G.is3x20 && G.transitionSecsLeft > 0) {
      const tm = Math.floor(G.transitionSecsLeft / 60);
      const ts = G.transitionSecsLeft % 60;
      const nextPos = G.positions[G.posIdx] || '';
      const transitionName = G.transitionLabel || 'Pause';
      const clockTxt = `${tm}:${String(ts).padStart(2, '0')}`;
      timerDisp = `${clockTxt} (Übergang: ${transitionName})`;
      DOM.lastShotTxt.innerHTML =
        `⏸ <b>Übergang</b>: <b>${transitionName}</b> · noch <b>${clockTxt}</b><br>` +
        `➡ Danach: <b>${nextPos}</b>`;
      G.transitionSecsLeft--;
      G._timerSecsLeft--;
      if (G.transitionSecsLeft <= 0) {
        DOM.lastShotTxt.innerHTML = `▶️ <b>${transitionName}</b> beendet - weiter mit <b>${nextPos}</b>.`;
        G.transitionLabel = '';
      }
    } else if (G.probeActive && G.probeSecsLeft > 0) {
      const pm = Math.floor(G.probeSecsLeft / 60);
      const ps = G.probeSecsLeft % 60;
      timerDisp = `${pm}:${String(ps).padStart(2, '0')} (Probe)`;
      G.probeSecsLeft--;
      G._timerSecsLeft--; // BUG-FIX: Gesamtzeit läuft auch während Probezeit ab
    } else {
      // Probezeit beendet → reguläre Zeit starten
      if (G.probeActive) {
        G.probeActive = false;
        DOM.lastShotTxt.innerHTML = '✅ <b>Probezeit beendet!</b> – Reguläre Zeit gestartet.';
        DOM.skipProbeBtn.style.display = 'none';
      }
      const m = Math.floor(G._timerSecsLeft / 60);
      const s = G._timerSecsLeft % 60;
      timerDisp = `${m}:${String(s).padStart(2, '0')}`;
      if (G._timerSecsLeft <= 0) {
        clearBattleTimers();
        // Zeit abgelaufen → DNF
        G.dnf = true;
        if (val) val.textContent = '0:00';
        DOM.lastShotTxt.innerHTML = '⏰ <b>Zeit abgelaufen!</b> DNF – Das Duell ist beendet.';
        if (G.burst) DOM.battleBurstBtn.disabled = true;
        else DOM.battleFireBtn.disabled = true;
        setTimeout(() => goToEntry(), 1800);
        return;
      }
      G._timerSecsLeft--;
    }

    if (val) val.textContent = timerDisp;
    if (box) box.classList.toggle('warning', G._timerSecsLeft <= 300 && !G.probeActive); // Warnung ab 5 Min. (nach Probe)
  }
  tick(); // sofort anzeigen
  G._timerInterval = setInterval(tick, 1000);
}

function startBotAutoShoot() {
  function scheduleNextShot() {
    if (G._botInterval) clearTimeout(G._botInterval);

    // Realistische Schießzeiten pro Disziplin (in Sekunden pro Schuss)
    // Basiert auf echten Sportschießen-Normen
    const DISCIPLINE_TIMINGS = {
      lg40: { baseSecs: 35, min: 25, max: 50 },        // Luftgewehr 40: 50min für 40 Schuss → 75s/Schuss, aber konzentriert
      lg60: { baseSecs: 42, min: 30, max: 60 },        // Luftgewehr 60: 70min für 60 Schuss → 70s/Schuss
      kk50: { baseSecs: 50, min: 35, max: 70 },        // KK 50m: 50min für 60 Schuss → 50s/Schuss durchschnitt
      kk100: { baseSecs: 65, min: 45, max: 90 },       // KK 100m: 70min für 60 Schuss → 70s/Schuss, aber extremer konzentriert
      kk3x20: { baseSecs: 85, min: 60, max: 120 }      // KK 3×20: 105min für 60 Schuss inkl. Wechsel → längere Mittel je Schuss
    };

    // Schwierigkeit beeinflusst die Streuung (Routine/Konsistenz)
    const DIFFICULTY_VARIANCE = {
      easy: { ratio: 1.0, rangeRatio: 0.4 },     // 40% Streuung, nervöser Rhythmus (Einfach)
      real: { ratio: 1.0, rangeRatio: 0.25 },    // 25% Streuung, natürlicher Rhythmus (Mittel)
      hard: { ratio: 0.95, rangeRatio: 0.10 },   // 10% Streuung, sehr konsistent (Elite)
      elite: { ratio: 0.92, rangeRatio: 0.06 }   // 6% Streuung, extrem konsistent (Profi)
    };

    let timing = DISCIPLINE_TIMINGS[G.discipline] || DISCIPLINE_TIMINGS.lg40;
    if (G.discipline === 'kk3x20') timing = getKK3x20TimingByPos();
    const difficulty = DIFFICULTY_VARIANCE[G.diff] || DIFFICULTY_VARIANCE.real;

    if (G.is3x20 && G.transitionSecsLeft > 0) {
      G._botInterval = setTimeout(scheduleNextShot, 1000);
      return;
    }

    // Basis-Schießzeit für diese Disziplin
    let baseSecs = timing.baseSecs * difficulty.ratio;

    // Zufällige Streuung basierend auf Schwierigkeit
    const rangeWidth = (timing.max - timing.min) * difficulty.rangeRatio;
    const randomSecs = (Math.random() * rangeWidth) - (rangeWidth / 2);

    // Finales Delay zwischen min/max halten
    let delaySecs = baseSecs + randomSecs;
    delaySecs = Math.max(timing.min, Math.min(timing.max, delaySecs));

    const delay = delaySecs * 1000;

    G._botInterval = setTimeout(() => {
      if (G.botShotsLeft <= 0) return; // Bot schon fertig
      if (G.is3x20 && G.transitionSecsLeft > 0) {
        scheduleNextShot();
        return;
      }
      // Bot schießt automatisch einen Schuss (ohne Player-FX)
      botAutoFire();
      scheduleNextShot();
    }, delay);
  }
  scheduleNextShot();
}

function botAutoFire() {
  if (G.botShotsLeft <= 0) return;
  const bRes = fireSingleShot(true);
  if (!bRes) return;

  // Füge Pill zum Log hinzu
  const pillCls = bRes.isX ? 'x' : bRes.pts >= 9 ? 'hi' : bRes.pts >= 6 ? 'mid' : bRes.pts >= 1 ? 'lo' : 'miss';
  // KK 3x20: Pill zeigt nur ganze Ringe (keine Zehntel)
  const pillTxt = (G.is3x20 && G.weapon === 'kk')
    ? String(Math.floor(bRes.pts))
    : (bRes.isX ? `✦${fmtPts(bRes.pts)}` : fmtPts(bRes.pts));
  if (G.is3x20) {
    const container = DOM.slPills[G.posIdx];
    if (container) {
      const pill = document.createElement('span');
      pill.className = 'sl-pill ' + pillCls;
      pill.textContent = '🤖' + pillTxt;
      container.appendChild(pill);
    }
    G.posShots++;
    const pr = G.posResults[G.posIdx];
    // KK 3x20: nur ganze Ringe akkumulieren
    const addTenths = (G.weapon === 'kk') ? Math.floor(bRes.pts) * 10 : Math.round(bRes.pts * 10);
    pr._tenths = (pr._tenths || 0) + addTenths;
    pr.total = G.weapon === 'kk' ? Math.floor(pr._tenths / 10) : pr._tenths / 10;
    pr.int = (pr.int || 0) + Math.floor(bRes.pts);
    if (!pr.shots) pr.shots = [];
    pr.shots.push({ dx: bRes.dx ?? 0, dy: bRes.dy ?? 0 });
    // 3×20: botTotalInt (Summe ganze Ringe) hier und in doBattleFire; fireSingleShot inkrementiert bei 3×20 kein botTotalInt
    G.botTotalInt += Math.floor(bRes.pts);
    if (G.posShots >= G.perPos && G.posIdx < G.positions.length - 1) {
      const nextPosIdx = G.posIdx + 1;
      const nextPosName = G.positions[nextPosIdx];
      G.posIdx = nextPosIdx;
      G.posShots = 0;
      beginKK3x20Transition(nextPosIdx);
      if (G.transitionSecsLeft > 0) {
        DOM.lastShotTxt.innerHTML = `⏸ <b>${G.transitionLabel}</b> (${Math.round(G.transitionSecsLeft / 60)} Min) · danach <b>${nextPosName}</b>.`;
      }
      setTimeout(() => updatePosBar(), 200);
    } else { updatePosBar(); }
    // Wait for DOM to update before scrolling to ensure scrollHeight is current
    autoScrollShotLog();
  } else {
    const pill = document.createElement('span');
    pill.className = 'sl-pill ' + pillCls;
    pill.textContent = '🤖' + pillTxt;
    if (DOM.shotLog) {
      DOM.shotLog.appendChild(pill);
      while (DOM.shotLog.children.length > 10) DOM.shotLog.removeChild(DOM.shotLog.firstChild);
    }

  }

  // Info-Text aktualisieren
  const botScoreTxt = isKK3x20WholeRingsOnly()
    ? G.botTotalInt
    : `${fmtPts(G.botTotal)} <span style="color:rgba(240,130,110,.45);font-size:.85em;">(${G.botTotalInt} ganze)</span>`;
  if (!(G.is3x20 && G.transitionSecsLeft > 0)) {
    DOM.lastShotTxt.innerHTML =
      `🤖 <b>Bot schießt automatisch!</b> ${bRes.label} · ${isKK3x20WholeRingsOnly() ? Math.floor(bRes.pts) : fmtPts(bRes.pts)} &nbsp;|&nbsp; Gesamt: <b>${botScoreTxt}</b>`;
  }

  // Canvas + UI aktualisieren
  setTimeout(() => {
    drawTarget(G.targetShots);
    updateBattleUI();
    if (G.botShotsLeft <= 0) {
      clearBattleTimers();
      if (G.burst) DOM.battleBurstBtn.disabled = true;
      else DOM.battleFireBtn.disabled = true;
      DOM.battleTag.textContent = `◆ ${G.maxShots} SCHUSS ABGEFEUERT ◆`;
      if (G.is3x20) {
        DOM.lastShotTxt.innerHTML = `🏁 Alle Positionen abgeschlossen! Bot-Gesamt: <b>${G.botTotalInt} Pkt</b>`;
      } else {
        DOM.lastShotTxt.innerHTML = `🏁 Bot fertig! Gesamt: <b>${isKK3x20WholeRingsOnly() ? G.botTotalInt : fmtPts(G.botTotal)} Punkte</b> aus ${G.maxShots} Schuss.`;
      }
      setTimeout(() => goToEntry(), 1400);
    }
  }, 160);
}

function syncBotScoreToPlayerProgress() {
  if (G.botShotsLeft <= 0) return;

  const playerFired = G.maxShots - G.playerShotsLeft;
  const botFired = G.maxShots - G.botShotsLeft;
  const missingShots = Math.min(G.botShotsLeft, Math.max(0, playerFired - botFired));

  for (let i = 0; i < missingShots; i++) {
    const res = fireSingleShot(true);
    // 3×20: botTotalInt manuell inkrementieren (fireSingleShot tut es nicht bei 3×20)
    if (res && G.is3x20) {
      G.botTotalInt += Math.floor(res.pts);
    }
  }
  updateBattleUI();
}

function startBattle() {
  const dc = DISC[G.discipline];
  G.maxShots = dc.shots;
  G.playerShotsLeft = dc.shots;
  G.botShotsLeft = dc.shots;
  G.targetShots = [];
  G.botShots = []; G.botPlan = null; G.botTotal = 0; G.botTotalInt = 0; G._botTotalTenths = 0;
  G.playerTotal = 0; G.playerTotalInt = 0; G._playerTotalTenths = 0;
  G.playerShots = [];
  G._gameStartTime = Date.now();
  G._lastPlayerShotAt = G._gameStartTime;
  HealthyEngagement.onBattleStart();
  G.dnf = false;
  
  // NEU: Friend-Challenge Modus erkennen
  const isFriendChallenge = !!G.friendChallenge;
  if (isFriendChallenge) {
    console.debug('[Battle] Friend-Challenge Modus aktiv gegen:', G.friendChallenge.friendUsername);
  }
  
  G.probeActive = true;  // Probezeit ist aktiv
  G.probeSecsLeft = (isFriendChallenge || G.discipline === 'kk3x20' ? KK3X20_CFG.probeSecs : 15 * 60);  // disziplinspezifische Probezeit
  G.transitionSecsLeft = 0;
  G.transitionLabel = '';

  // Vorherige Timer/Intervalle aufräumen
  clearBattleTimers();

  // 3×20 init
  G.is3x20 = dc.is3x20;
  G.positions = dc.is3x20 ? [...dc.positions] : [];
  G.posIcons = dc.is3x20 ? [...dc.posIcons] : [];
  G.posIdx = 0;
  G.posShots = 0;
  G.perPos = 20;
  G.posResults = dc.is3x20 ? dc.positions.map(() => ({ total: 0, int: 0, _tenths: 0, playerShots: [] })) : [];
  G.botPlan = buildCurrentBotPlan();

  setSz(); drawTarget([]);

  // BUG-FIX #3: Null-Check für shotLogWrap verhindert Absturz wenn DOM nicht bereit
  if (!DOM.shotLogWrap) {
    console.error('[startBattle] shotLogWrap nicht gefunden — DOM nicht bereit?');
    return;
  }

  // Reset shot log area
  DOM.shotLogWrap.innerHTML = '';
  if (G.is3x20) {
    G.positions.forEach((pos, i) => {
      const grp = document.createElement('div');
      grp.className = 'sl-group';
      grp.id = `slGroup${i}`;
      grp.innerHTML = `<div class="sl-group-hd">${G.posIcons[i]} ${pos}</div><div class="sl-group-pills" id="slPills${i}"></div>`;
      DOM.shotLogWrap.appendChild(grp);
      DOM.slPills[i] = null;
    });
    // BUG-FIX #7: Null-Check für slPills Elemente mit Fehler-Logging
    G.positions.forEach((_, i) => {
      const el = document.getElementById(`slPills${i}`);
      if (!el) {
        console.error(`[startBattle] slPills${i} nicht gefunden — DOM-Update fehlgeschlagen`);
      }
      DOM.slPills[i] = el;
    });
  } else {
    const flat = document.createElement('div');
    flat.className = 'shot-log';
    flat.id = 'shotLog';
    DOM.shotLogWrap.appendChild(flat);
    DOM.shotLog = flat;
  }

  DOM.lastShotTxt.innerHTML = G.is3x20
    ? `<b>Bereit!</b> Position 1: <b>${G.positions[0]}</b> · 20 Schüsse · Feuer frei!`
    : '<b>Bereit!</b> Drück FEUER – du schießt in der echten Welt, der Bot schießt automatisch nach seinem Rhythmus.';

  const diffCfg = DIFF[G.diff];
  const weapCfg = WEAPON_CFG[G.weapon];

  DOM.battleBadge.textContent = diffCfg.lbl;
  DOM.battleBadge.className = 'diff-badge ' + diffCfg.cls;
  DOM.battleWeaponBadge.textContent = weapCfg.icon + ' ' + dc.name.toUpperCase();
  DOM.battleWeaponBadge.className = 'weapon-badge ' + weapCfg.badgeCls;
  DOM.entryTag.textContent = `◆ ${G.dist} METER · ${dc.name} · ${G.maxShots} SCHUSS ◆`;

  DOM.posBar.classList.toggle('visible', G.is3x20);
  if (G.is3x20) updatePosBar();
  if (DOM.spPosRow) DOM.spPosRow.style.display = G.is3x20 ? '' : 'none';

  if (G.burst) {
    DOM.battleFireBtn.style.display = 'none';
    DOM.battleBurstBtn.style.display = '';
    DOM.battleBurstBtn.disabled = false;
  } else {
    DOM.battleFireBtn.style.display = '';
    DOM.battleBurstBtn.style.display = 'none';
  }

  // Probezeit Button anzeigen
  DOM.skipProbeBtn.style.display = '';

  updateBattleUI();
  showScreen('screenBattle');

  // Bot-Zustandsanzeige starten
  if (typeof startBotStatusUpdates === 'function') startBotStatusUpdates();

  // Reset Bot-Start-Flag
  G.botStarted = false;

  // Match-Timer SOFORT starten
  const timeMins = dc.timeMins || 50;
  startMatchTimer(timeMins * 60);

  // Bot-Auto-Shoot startet NACH Probezeit (15 Min später)
  // NEU: Bei Friend-Challenge im async Modus oder wenn Challenger zuerst schießt, Bot nicht starten
  if (!isFriendChallenge || (isFriendChallenge && !G.friendChallenge.isChallenger)) {
    const probeDelayMs = ((G.discipline === 'kk3x20' ? KK3X20_CFG.probeSecs : 15 * 60) + 5) * 1000; // Probezeit + 5 Sek Delay
    G._botStartTimeout = setTimeout(() => {
      if (!G.botStarted) {
        G.botStarted = true;
        startBotAutoShoot();
      }
    }, probeDelayMs);
  } else if (isFriendChallenge) {
    console.debug('[Battle] Async-Modus: Bot wird nicht gestartet (Challenger schießt zuerst)');
  }
}

function updateBattleUI() {
  const lowThresh = Math.max(5, Math.round(G.maxShots * 0.15));
  const low = G.playerShotsLeft <= lowThresh;
  const fired = G.maxShots - G.playerShotsLeft;

  // Score — compute once, assign to both score chip and live bar
  DOM.shotsLeft.textContent = G.playerShotsLeft;
  DOM.shotsLeft.className = low ? 'chip-val low' : 'chip-val';
  DOM.botScoreChipInt.textContent = G.botTotalInt;
  DOM.lsbInt.textContent = G.botTotalInt;

  // Nur KK 3×20: keine Zehntel anzeigen. KK 50m/100m zeigen Zehntel normal.
  const noTenths = G.is3x20 && G.weapon === 'kk';
  if (DOM.playerScoreChip) {
    DOM.playerScoreChip.textContent = noTenths ? String(G.playerTotalInt) : fmtPts(G.playerTotal);
  }
  if (DOM.playerScoreChipSub) {
    DOM.playerScoreChipSub.textContent = noTenths ? 'Ringe' : `${G.playerTotalInt} ganze`;
  }
  DOM.botScoreChipContainer.style.display = noTenths ? 'none' : 'flex';
  DOM.botScoreDivider.style.display = noTenths ? 'none' : 'block';
  if (DOM.lsbDecBlock) DOM.lsbDecBlock.style.display = noTenths ? 'none' : '';
  if (DOM.lsbDecDivider) DOM.lsbDecDivider.style.display = noTenths ? 'none' : '';
  if (!noTenths) {
    const zehntelFmt = fmtPts(G.botTotal);
    DOM.botScoreChip.textContent = zehntelFmt;
    DOM.lsbDec.textContent = zehntelFmt;
  }
  // Bei KK: "Ganze"-Label und Zahl im Chip + Live-Bar aufhellen
  if (noTenths) {
    DOM.botScoreChipInt.style.color = '#f08070';
    DOM.botScoreChipInt.style.fontSize = '1.5rem';
    DOM.lsbInt.style.color = 'rgba(240,130,110,1)';
    DOM.lsbInt.style.fontWeight = '700';
    // "Ganze"-Label im Chip heller
    const ganzeLabel = DOM.botScoreChipInt.previousElementSibling;
    if (ganzeLabel) ganzeLabel.style.color = 'rgba(255,255,255,0.75)';
    // "Bot Ganze"-Label in der Live-Bar heller
    const lsbIntLabel = DOM.lsbInt.previousElementSibling;
    if (lsbIntLabel) lsbIntLabel.style.color = 'rgba(255,255,255,0.7)';
  } else {
    // LG: beide Chips (Zehntel + Ganze) und Labels hell
    DOM.botScoreChip.style.color = '#f08070';
    DOM.botScoreChipInt.style.color = '#f08070';
    DOM.botScoreChipInt.style.fontSize = '1.25rem';
    // Zehntel-Label im Chip
    const zehntelLabel = DOM.botScoreChip.previousElementSibling;
    if (zehntelLabel) zehntelLabel.style.color = 'rgba(255,255,255,0.75)';
    // Ganze-Label im Chip
    const ganzeLabel = DOM.botScoreChipInt.previousElementSibling;
    if (ganzeLabel) ganzeLabel.style.color = 'rgba(255,255,255,0.75)';
    // Live-Bar: Zehntel + Ganze + Labels
    DOM.lsbDec.style.color = '#f08070';
    DOM.lsbInt.style.color = 'rgba(240,130,110,1)';
    DOM.lsbInt.style.fontWeight = '700';
    const lsbDecLabel = DOM.lsbDec.previousElementSibling;
    if (lsbDecLabel) lsbDecLabel.style.color = 'rgba(255,255,255,0.7)';
    const lsbIntLabel = DOM.lsbInt.previousElementSibling;
    if (lsbIntLabel) lsbIntLabel.style.color = 'rgba(255,255,255,0.7)';
  }

  if (fired > 0) {
    DOM.lsbProj.textContent = '~' + fmtPts(Math.round((G.botTotal / fired) * G.maxShots * 10) / 10);
  } else {
    DOM.lsbProj.textContent = '–';
  }

  // Overall progress bar
  DOM.spFill.style.width = ((fired / G.maxShots) * 100) + '%';
  DOM.spFill.className = low ? 'sp-fill low' : 'sp-fill';
  DOM.spCount.textContent = fired + ' / ' + G.maxShots + ' Schuss';
  DOM.spCount.className = low ? 'sp-count low' : 'sp-count';

  // 3×20: per-position sub-bar
  if (G.is3x20 && DOM.spPosRow) {
    const posLow = (G.perPos - G.posShots) <= 4;
    DOM.spPosLbl.textContent = `${G.posIcons[G.posIdx] || ''} ${G.positions[G.posIdx] || ''}`;
    DOM.spPosCount.textContent = `${G.posShots} / ${G.perPos} Schuss`;
    DOM.spPosCount.style.color = posLow ? '#ff7040' : '#a0e060';
    DOM.spPosFill.style.width = ((G.posShots / G.perPos) * 100) + '%';
    DOM.spPosFill.style.background = posLow
      ? 'linear-gradient(90deg,#8a1010,#e04040)'
      : 'linear-gradient(90deg,#3a8010,#80c830)';
  }

  // Battle tag
  const allDone = fired >= G.maxShots;
  if (G.is3x20 && G.transitionSecsLeft > 0) {
    const tm = Math.floor(G.transitionSecsLeft / 60);
    const ts = G.transitionSecsLeft % 60;
    const transitionName = G.transitionLabel || 'Pause';
    DOM.battleTag.textContent = `◆ ÜBERGANG: ${transitionName.toUpperCase()} · ${tm}:${String(ts).padStart(2, '0')} ◆`;
  } else if (G.is3x20 && !allDone) {
    DOM.battleTag.textContent = `◆ ${(G.positions[G.posIdx] || '').toUpperCase()} · SCHUSS ${G.posShots + 1} / ${G.perPos} ◆`;
  } else {
    DOM.battleTag.textContent = allDone
      ? `◆ ${G.maxShots} SCHUSS ABGEFEUERT ◆`
      : `◆ SCHUSS ${fired + 1} / ${G.maxShots} ◆`;
  }

  if (G.burst) DOM.battleBurstBtn.disabled = G.playerShotsLeft <= 0;
  else DOM.battleFireBtn.disabled = G.playerShotsLeft <= 0;
}

function updatePosBar() {
  if (!G.is3x20) return;
  for (let i = 0; i < G.positions.length; i++) {
    const el = DOM[`posItem${i}`];
    const sh = DOM[`posShots${i}`];
    if (!el || !sh) continue;
    el.classList.remove('active', 'done', 'transition');
    if (i < G.posIdx) {
      el.classList.add('done');
      sh.textContent = G.posResults[i] ? fmtPts(G.posResults[i].total) : '✓';
    } else if (i === G.posIdx) {
      el.classList.add('active');
      sh.textContent = G.posShots + '/' + G.perPos;
    } else {
      sh.textContent = '0/' + G.perPos;
    }
  }
}

// Positions-Multiplikatoren für KK 3x20 (relativ zu Liegend = 1.0)
const POS_MULT = {
  'Liegend': { mult: 0.70, noise: 0.05 }, // extrem präzise, fast nur 10er
  'Kniend': { mult: 1.10, noise: 0.20 }, // stark, konstant 9-10
  'Stehend': { mult: 1.80, noise: 0.50 }, // realistisch streut, 8-10
};

function getTargetMaxRadius() {
  return canvas && canvas.width ? (canvas.width / 2 - 3) : 132;
}

function createShotCracks() {
  return Array.from({ length: 7 }, (_, i) => ({
    a: (i / 7) * Math.PI * 2 + Math.random() * 0.7,
    len: 1.4 + Math.random()
  }));
}

function buildFallbackShot(isBot) {
  const dc = DIFF[G.diff] || DIFF.real;
  const sig = SIGMA[G.dist] || SIGMA['50'];
  let botSig;

  if (G.is3x20 && G.weapon === 'kk' && G.positions.length > 0) {
    const posName = G.positions[G.posIdx] || 'Liegend';
    const pm = POS_MULT[posName] || POS_MULT['Stehend'];
    botSig = sig * dc.mult * pm.mult + (dc.noise * pm.mult + pm.noise) * Math.random();
  } else if (G.weapon === 'kk' && !G.is3x20) {
    const KK60_BASE = { easy: 15.4, real: 13.4, hard: 11.3, elite: 9.8 };
    const KK60_NOISE = { easy: 2.5, real: 1.5, hard: 0.8, elite: 0.2 };
    botSig = (KK60_BASE[G.diff] ?? 13.4) + (KK60_NOISE[G.diff] ?? 1.5) * Math.random();
  } else if (G.discipline === 'lg40') {
    const LG40_BASE = { easy: 22.7, real: 17.2, hard: 12.5, elite: 8.8 };
    const LG40_NOISE = { easy: 3, real: 2, hard: 1, elite: 0.2 };
    botSig = (LG40_BASE[G.diff] ?? 17.2) + (LG40_NOISE[G.diff] ?? 2) * Math.random();
  } else if (G.discipline === 'lg60') {
    const LG60_BASE = { easy: 16.6, real: 12.9, hard: 9.4, elite: 7.9 };
    const LG60_NOISE = { easy: 2, real: 1.5, hard: 0.8, elite: 0.2 };
    botSig = (LG60_BASE[G.diff] ?? 12.9) + (LG60_NOISE[G.diff] ?? 1.5) * Math.random();
  } else {
    botSig = sig * dc.mult + dc.noise * Math.random();
  }

  if (!isBot) botSig *= 1.1;

  const dx = gauss(botSig);
  const dy = gauss(botSig);
  const scored = scoreHit(dx, dy);

  return {
    dx,
    dy,
    pts: scored.pts,
    label: scored.label,
    isX: scored.isX,
    wholePts: Math.floor(scored.pts),
    errorType: 'fallback_gauss'
  };
}

function buildCurrentBotPlan() {
  if (typeof BattleBalance === 'undefined') return null;

  try {
    return BattleBalance.generateBotBattlePlan(
      G.discipline,
      G.diff,
      `${Date.now()}:${G.discipline}:${G.diff}:${Math.random()}`
    );
  } catch (error) {
    console.warn('Balance plan generation failed, using fallback bot shot logic.', error);
    return null;
  }
}

function consumePlannedBotShot() {
  if (!G.botPlan) {
    G.botPlan = buildCurrentBotPlan();
  }
  if (!G.botPlan || !Array.isArray(G.botPlan.shots)) return null;

  const planShot = G.botPlan.shots[G.botShots.length];
  if (!planShot) return null;

  const radius = getTargetMaxRadius();
  return {
    dx: planShot.nx * radius,
    dy: planShot.ny * radius,
    pts: planShot.pts,
    label: planShot.label,
    isX: planShot.isX,
    wholePts: planShot.wholePts,
    position: planShot.position || null,
    errorType: 'planned_balance'
  };
}

function fireSingleShot(isBot = true) {
  if (isBot && G.botShotsLeft <= 0) return false;
  if (!isBot && G.playerShotsLeft <= 0) return false;

  let bdx, bdy, dominantError = 'wobble', plannedShot = null;

  // DEAKTIVIERT: AdaptiveBotSystem-Physik produziert Scores die nicht
  // zu den Schwierigkeitsbeschreibungen passen (z.B. "~360-375 Pkt").
  // Immer kalibrierte Gauß-Sigma-Werte nutzen.
  {
    // Fallback oder Spieler-Schuss: Bestehende Gauß-Logik
    const dc = DIFF[G.diff] || DIFF.real;
    const sig = SIGMA[G.dist] || SIGMA['50'];

    // Sigma-Berechnung je nach Disziplin (kalibriert per Rayleigh-Verteilung)
    let botSig;
    if (G.is3x20 && G.weapon === 'kk' && G.positions.length > 0) {
      // KK 3x20: Positions-spezifischer Sigma (Liegend/Kniend/Stehend)
      const posName = G.positions[G.posIdx] || 'Liegend';
      const pm = POS_MULT[posName] || POS_MULT['Stehend'];
      botSig = sig * dc.mult * pm.mult + (dc.noise * pm.mult + pm.noise) * Math.random();
    } else if (G.weapon === 'kk' && !G.is3x20) {
      // KK 50m/100m (60 Schuss Liegend): kalibriert auf 580–614 Zehntel
      const KK60_BASE = { easy: 15.4, real: 13.4, hard: 11.3, elite: 9.8 };
      const KK60_NOISE = { easy: 2.5, real: 1.5, hard: 0.8, elite: 0.2 };
      botSig = (KK60_BASE[G.diff] ?? 13.4) + (KK60_NOISE[G.diff] ?? 1.5) * Math.random();
    } else if (G.discipline === 'lg40') {
      // LG 40 (40 Schuss, 10m): kalibriert auf 360–412 Zehntel
      const LG40_BASE = { easy: 22.7, real: 17.2, hard: 12.5, elite: 8.8 };
      const LG40_NOISE = { easy: 3, real: 2, hard: 1, elite: 0.2 };
      botSig = (LG40_BASE[G.diff] ?? 17.2) + (LG40_NOISE[G.diff] ?? 2) * Math.random();
    } else if (G.discipline === 'lg60') {
      // LG 60 (60 Schuss, 10m): kalibriert auf 575–622 Zehntel
      const LG60_BASE = { easy: 16.6, real: 12.9, hard: 9.4, elite: 7.9 };
      const LG60_NOISE = { easy: 2, real: 1.5, hard: 0.8, elite: 0.2 };
      botSig = (LG60_BASE[G.diff] ?? 12.9) + (LG60_NOISE[G.diff] ?? 1.5) * Math.random();
    } else {
      botSig = sig * dc.mult + dc.noise * Math.random();
    }

    // Wenn Spieler schießt: Etwas mehr Varianz, falls nicht explizit trainiert
    if (!isBot) botSig *= 1.1;

    bdx = gauss(botSig);
    bdy = gauss(botSig);
  }

  if (isBot) {
    plannedShot = consumePlannedBotShot();
    if (plannedShot) {
      bdx = plannedShot.dx;
      bdy = plannedShot.dy;
      dominantError = plannedShot.errorType || 'planned_balance';
    }
  }

  const bRes = plannedShot
    ? { pts: plannedShot.pts, label: plannedShot.label, isX: plannedShot.isX }
    : scoreHit(bdx, bdy);
  const wholePts = plannedShot?.wholePts ?? Math.floor(bRes.pts);

  if (isBot) {
    G.botShots.push({
      dx: bdx, dy: bdy, pts: bRes.pts, label: bRes.label, isX: bRes.isX,
      errorType: dominantError,
      position: plannedShot?.position || null,
      cracks: createShotCracks()
    });

    if (G.is3x20 && G.weapon === 'kk') {
      G._botTotalTenths = (G._botTotalTenths || 0) + wholePts * 10;
      G.botTotal = G._botTotalTenths / 10;
    } else {
      G._botTotalTenths = (G._botTotalTenths || 0) + Math.round(bRes.pts * 10);
      G.botTotal = G._botTotalTenths / 10;
    }

    if (!G.is3x20) {
      G.botTotalInt += Math.floor(bRes.pts);
    }
    G.botShotsLeft--;
  } else {
    G.playerShotsLeft--;
    if (G.is3x20 && G.weapon === 'kk') {
      G._playerTotalTenths = (G._playerTotalTenths || 0) + wholePts * 10;
      G.playerTotal = G._playerTotalTenths / 10;
      G.playerTotalInt += wholePts;
    } else {
      G._playerTotalTenths = (G._playerTotalTenths || 0) + Math.round(bRes.pts * 10);
      G.playerTotal = G._playerTotalTenths / 10;
      G.playerTotalInt += Math.floor(bRes.pts);
    }
    // Spieler-Schuss auf der sichtbaren Zielscheibe speichern
    G.targetShots.push({
      dx: bdx, dy: bdy, pts: bRes.pts, label: bRes.label, isX: bRes.isX,
      cracks: createShotCracks()
    });
  }

  // NEU: Haptisches Feedback beim Schuss
  if (typeof MobileFeatures !== 'undefined') {
    MobileFeatures.hapticShot();
    if (bRes.pts >= 10) MobileFeatures.hapticHit();
    else if (bRes.pts <= 5) MobileFeatures.hapticMiss();
  }

  return { ...bRes, dx: bdx, dy: bdy, position: plannedShot?.position || null };
}

function skipProbe() {
  if (!G.probeActive) return;

  G.probeActive = false;
  G.probeSecsLeft = 0;
  DOM.lastShotTxt.innerHTML = '✅ <b>Probezeit übersprungen!</b> – Bot schießt jetzt!';
  DOM.skipProbeBtn.style.display = 'none';

  // Abbrechen des verzögerten Bot-Starts vom startBattle()
  if (G._botStartTimeout) {
    clearTimeout(G._botStartTimeout);
    G._botStartTimeout = null;
  }

  // Starte Bot-Auto-Shoot sofort (falls noch nicht gestartet)
  if (!G.botStarted) {
    if (G._botInterval) clearTimeout(G._botInterval);
    G.botStarted = true;
    startBotAutoShoot();
  }
}

function doBattleFire() {
  if (G.playerShotsLeft <= 0) return;
  if (G.is3x20 && G.transitionSecsLeft > 0) {
    const transitionName = G.transitionLabel || 'Pause';
    G.transitionSecsLeft = 0;
    G.transitionLabel = '';
    DOM.lastShotTxt.innerHTML = `▶️ <b>${transitionName}</b> vorzeitig beendet - weiter schießen.`;
  }
  // Probezeit beenden und Bot starten, wenn beim Schießen noch Probezeit aktiv ist
  if (G.probeActive) {
    G.probeActive = false;
    G.probeSecsLeft = 0;
    DOM.lastShotTxt.innerHTML = '✅ <b>Probezeit beendet!</b> – Reguläre Zeit gestartet. Bot schießt jetzt!';
    DOM.skipProbeBtn.style.display = 'none';

    // Abbrechen des verzögerten Bot-Starts vom startBattle()
    if (G._botStartTimeout) {
      clearTimeout(G._botStartTimeout);
      G._botStartTimeout = null;
    }

    // Starte Bot-Auto-Shoot sofort (falls noch nicht gestartet)
    if (!G.botStarted) {
      if (G._botInterval) clearTimeout(G._botInterval);
      G.botStarted = true;
      startBotAutoShoot();
    }
  }

  // ── Spieler schießt in echt → nur Zähler runterzählen ──
  const count = G.burst ? Math.min(5, G.playerShotsLeft) : 1;
  G.playerShotsLeft -= count;

  // ── Bot-Schüsse synchronisieren ──────────────────────
  const _botBefore = G.botShots.length;
  syncBotScoreToPlayerProgress();
  const results = G.botShots.slice(_botBefore);
  // Bot-Treffer auf der sichtbaren Zielscheibe anzeigen
  results.forEach(s => {
    G.targetShots.push({
      dx: s.dx, dy: s.dy, pts: s.pts, label: s.label, isX: s.isX,
      cracks: s.cracks
    });
  });

  // FX — kein overflow-Toggle (verursachte hellgrünen Flackerstreifen unten)
  const f = DOM.muzzleFlash;
  f.style.transition = 'none'; f.style.opacity = '1';
  setTimeout(() => {
    f.style.transition = 'opacity .22s'; f.style.opacity = '0';
  }, 55);
  document.body.classList.remove('shaking');
  void document.body.offsetWidth;
  document.body.classList.add('shaking');
  setTimeout(() => document.body.classList.remove('shaking'), 320);
  // Sound + Haptic beim Spieler-Schuss
  if (typeof Sounds !== 'undefined') Sounds.shot();
  if (typeof Haptics !== 'undefined') Haptics.shot();

  // ── Treffer-Sound je nach Ringzahl ──────────
  if (results.length > 0 && typeof Sounds !== 'undefined') {
    const best = results.reduce((a, b) => b.pts > a.pts ? b : a);
    if (best.isX || best.pts >= 10) Sounds.bullseye();
    else if (best.pts >= 7) Sounds.hit();
    else Sounds.lowHit();
  }

  // ── Bot-Pills ins Log einfügen ────────────────────────
  results.forEach(bRes => {
    const pillCls = bRes.isX ? 'x' : bRes.pts >= 9 ? 'hi' : bRes.pts >= 6 ? 'mid' : bRes.pts >= 1 ? 'lo' : 'miss';
    // KK 3x20: nur ganze Ringe anzeigen
    const pillTxt = (G.is3x20 && G.weapon === 'kk')
      ? String(Math.floor(bRes.pts))
      : (bRes.isX ? `✦${fmtPts(bRes.pts)}` : fmtPts(bRes.pts));

    if (G.is3x20) {
      // Add pill to current position group via cache
      const container = DOM.slPills[G.posIdx];
      if (container) {
        const pill = document.createElement('span');
        pill.className = 'sl-pill ' + pillCls;
        pill.textContent = '🤖' + pillTxt;
        container.appendChild(pill);
      }
      // Update position tracking
      G.posShots++;
      const pr = G.posResults[G.posIdx];
      // KK 3x20: nur ganze Ringe akkumulieren
      const addTenths = (G.weapon === 'kk') ? Math.floor(bRes.pts) * 10 : Math.round(bRes.pts * 10);
      pr._tenths = (pr._tenths || 0) + addTenths;
      pr.total = G.weapon === 'kk' ? Math.floor(pr._tenths / 10) : pr._tenths / 10;
      pr.int = (pr.int || 0) + Math.floor(bRes.pts);
      if (!pr.shots) pr.shots = [];
      pr.shots.push({ dx: bRes.dx ?? 0, dy: bRes.dy ?? 0 });

      // Position complete?
      if (G.posShots >= G.perPos && G.posIdx < G.positions.length - 1) {
        const donePos = G.positions[G.posIdx];
        const doneRes = G.posResults[G.posIdx];
        const nextPosIdx = G.posIdx + 1;
        const nextPosName = G.positions[nextPosIdx];
        const nextEl = DOM[`posItem${nextPosIdx}`];
        if (nextEl) { nextEl.classList.add('transition'); setTimeout(() => nextEl.classList.remove('transition'), 450); }
        if (typeof Sounds !== 'undefined') Sounds.positionChange();
        if (typeof Haptics !== 'undefined') Haptics.positionChange();

        G.posIdx = nextPosIdx;
        G.posShots = 0;
        beginKK3x20Transition(nextPosIdx);

        if (G.transitionSecsLeft > 0) {
          DOM.lastShotTxt.innerHTML =
            `✅ <b>${donePos}</b> abgeschlossen! Teilergebnis: <b>${fmtPts(doneRes.total)} Pkt</b><br>` +
            `⏸ <b>${G.transitionLabel}</b> (${Math.round(G.transitionSecsLeft / 60)} Min) · danach <b>${nextPosName}</b>`;
        } else {
          DOM.lastShotTxt.innerHTML =
            `✅ <b>${donePos}</b> abgeschlossen! Teilergebnis: <b>${fmtPts(doneRes.total)} Pkt</b><br>` +
            `➡️ Weiter mit <b>${nextPosName}</b>`;
        }

        setTimeout(() => updatePosBar(), 200);
      } else {
        updatePosBar();
      }
      // Wait for DOM to update before scrolling to ensure scrollHeight is current
      autoScrollShotLog();
    } else {
      // Flat log: show last 10
      if (DOM.shotLog) {
        const pill = document.createElement('span');
        pill.className = 'sl-pill ' + pillCls;
        pill.textContent = '🤖' + pillTxt;
        DOM.shotLog.appendChild(pill);
        while (DOM.shotLog.children.length > 10) DOM.shotLog.removeChild(DOM.shotLog.firstChild);
      }
    }
  });

  // ── Info text (nur Bot-Ergebnis) ────────────────────────────────
  const mkBotScore = () => isKK3x20WholeRingsOnly()
    ? `${G.botTotalInt}`
    : `${fmtPts(G.botTotal)} <span style="color:rgba(240,130,110,.45);font-size:.85em;">(${G.botTotalInt} ganze)</span>`;

  if (results.length === 0) {
    // Bot hat bereits alle Schüsse abgefeuert
    DOM.lastShotTxt.innerHTML = `🤖 Bot Gesamt: <b>${mkBotScore()}</b>`;
  } else if (count > 1 && results.length > 1) {
    const sumPts = results.reduce((a, r) => a + r.pts, 0);
    const xCount = results.filter(r => r.isX).length;
    const xStr = xCount > 0 ? ` · ${xCount}× ✦X` : '';
    const sumDisp = isKK3x20WholeRingsOnly() ? Math.floor(sumPts) : fmtPts(Math.round(sumPts * 10) / 10);
    if (!G.is3x20) DOM.lastShotTxt.innerHTML =
      `🤖 ⚡ <b>5er-Salve</b>: +<b>${sumDisp}</b>${xStr} &nbsp;|&nbsp; Gesamt: <b>${mkBotScore()}</b>`;
  } else {
    const bRes = results[results.length - 1];
    const ptsDisp = isKK3x20WholeRingsOnly() ? Math.floor(bRes.pts) : fmtPts(bRes.pts);
    const emoji = bRes.isX ? '✦' : bRes.pts >= 9.5 ? '🔥' : bRes.pts >= 8 ? '💥' : bRes.pts >= 6 ? '🎯' : bRes.pts >= 4 ? '👌' : bRes.pts >= 2 ? '😬' : '😅';
    const scoreDisp = bRes.isX
      ? `<b style="color:#ffd040;">${bRes.label} · ${ptsDisp}</b>`
      : `<b>${bRes.label} · ${ptsDisp}</b>`;
    if (!G.is3x20 || G.posShots < G.perPos)
      DOM.lastShotTxt.innerHTML =
        `🤖 ${emoji} ${scoreDisp} &nbsp;|&nbsp; Gesamt: <b>${mkBotScore()}</b>`;
  }

  setTimeout(() => {
    drawTarget(G.targetShots);
    updateBattleUI();
    if (G.playerShotsLeft <= 0) {
      clearBattleTimers();
      if (G.burst) DOM.battleBurstBtn.disabled = true;
      else DOM.battleFireBtn.disabled = true;
      DOM.battleTag.textContent = `◆ ${G.maxShots} SCHUSS ABGEFEUERT ◆`;
      if (G.is3x20) {
        updatePosBar();
        DOM.lastShotTxt.innerHTML = `🏁 Alle Positionen abgeschlossen! Bot: <b>${G.botTotalInt} Pkt</b>`;
      } else {
        DOM.lastShotTxt.innerHTML = `🏁 Deine Schüsse fertig! Bot: <b>${isKK3x20WholeRingsOnly() ? G.botTotalInt : fmtPts(G.botTotal)}</b>.`;
      }
      setTimeout(() => goToEntry(), 1400);
    }
  }, 160);
}

function endBattleEarly() { clearBattleTimers(); goToEntry(); }

function goToEntry() {
  const kk3x20 = isKK3x20WholeRingsOnly();
  DOM.botFinalPts.textContent = kk3x20 ? String(G.botTotalInt) : fmtPts(G.botTotal);
  DOM.botFinalInt.textContent = G.botTotalInt;
  const avg = G.botShots.length > 0
    ? (kk3x20 ? (G.botTotalInt / G.botShots.length).toFixed(1) : (G.botTotal / G.botShots.length).toFixed(1))
    : '–';
  const xCount = G.botShots.filter(s => s.isX).length;
  const xStr = xCount > 0 ? ` · ${xCount}× ✦X` : '';

  // Zehntel-Spalte und Trennstrich bei KK 3x20 verstecken
  // KK 50m/100m zeigen Zehntel weiterhin an
  const hideZehntel = G.is3x20 && G.weapon === 'kk';
  if (DOM.botFinalPtsCol) DOM.botFinalPtsCol.style.display = hideZehntel ? 'none' : '';
  if (DOM.botFinalDivider) DOM.botFinalDivider.style.display = hideZehntel ? 'none' : '';
  // Zehntel + Ganze: bei KK 3x20 nur Ganze (heller), bei LG und KK 50m/100m beide hell
  DOM.botFinalInt.style.color = 'rgba(240,130,110,1)';
  DOM.botFinalInt.style.fontSize = hideZehntel ? '2.6rem' : '2rem';
  const ganzeSpan = DOM.botFinalInt.nextElementSibling;
  if (ganzeSpan) ganzeSpan.style.color = 'rgba(240,130,110,.75)';
  // Zehntel-Spalte bei LG + KK 50m/100m hell
  if (!hideZehntel) {
    DOM.botFinalPts.style.color = '#f08070';
    const zehntelSpan = DOM.botFinalPts.nextElementSibling;
    if (zehntelSpan) zehntelSpan.style.color = 'rgba(240,130,110,.75)';
  }

  if (G.is3x20) {
    const parts = G.posResults.map((r, i) => `${G.posIcons[i]} ${r.int}`).join('  ');
    DOM.botFinalDetail.textContent = `${parts} · Ø ${avg} Pkt${xStr}`;
  } else {
    DOM.botFinalDetail.textContent = `aus ${G.botShots.length} Schuss · Ø ${avg} Pkt${xStr}`;
  }
  // Eingabefeld bleibt leer, da der Spieler seine realen Werte eintragen soll
  DOM.playerInp.value = '';
  if (DOM.playerInpInt) DOM.playerInpInt.value = '';
  clearInpState();
  if (DOM.autoInt) {
    DOM.autoIntVal.textContent = '–';
    DOM.autoInt.className = 'auto-int';
  }

  // Eingabefeld: KK 3x20 = nur Ganze Ringe; KK 50m/100m + LG = Zehntel & Ganze
  const kk3x20Only = G.is3x20 && G.weapon === 'kk';
  DOM.playerInp.style.display = kk3x20Only ? 'none' : '';
  setInpHint(kk3x20Only
    ? 'Bitte deine geschossenen Ringe eintragen'
    : 'Bitte Zehntel und Ganze eintragen', false);
  const ecLbl = DOM.playerInp.closest('.ec-row')?.previousElementSibling;
  if (ecLbl) ecLbl.textContent = kk3x20Only
    ? '◈ Dein Ergebnis eingeben (Ganze Ringe)'
    : '◈ Dein Ergebnis eingeben (Zehntel & Ganze)';

  // Foto-Button einfügen (immer sichtbar, auch wenn ImageCompare fehlt)
  const icSlot = document.getElementById('icGameOverSlot');
  if (icSlot) {
    icSlot.innerHTML = '';
    const btn = document.createElement('button');
    btn.className = 'ic-go-upload-btn';
    btn.innerHTML = '<span class="ic-go-upload-ico">📸</span> Wettkampf-Foto vergleichen';
    btn.onclick = () => {
      if (typeof ImageCompare !== 'undefined') {
        // NEU: Multi-Score Detection aktivieren, falls verfügbar
        if (typeof MultiScoreDetection !== 'undefined' && MultiScoreDetection.CONFIG.enableRegionDetection) {
          ImageCompare.openWithMultiScore(kk3x20 ? G.botTotalInt : G.botTotal, kk3x20, G.discipline);
        } else {
          ImageCompare.open(kk3x20 ? G.botTotalInt : G.botTotal, kk3x20, G.discipline);
        }
      } else {
        alert('Foto-Vergleich wird geladen. Bitte Seite neu laden.');
      }
    };
    icSlot.appendChild(btn);
  }
  showScreen('screenEntry');
}

function setInpHint(msg, isErr) {
  if (!DOM.inpHint) return;
  DOM.inpHint.textContent = msg;
  DOM.inpHint.style.color = isErr ? '#e84040' : 'rgba(180,230,100,.7)';
}

function clearInpState() {
  if (DOM.playerInp) { DOM.playerInp.classList.remove('inp-error', 'inp-ok'); }
  if (DOM.playerInpInt) { DOM.playerInpInt.classList.remove('inp-error', 'inp-ok'); }
  setInpHint('', false);
}

function onPlayerInput() {
  const raw = DOM.playerInp.value;
  if (raw === '') { clearInpState(); return; }
  const val = parseFloat(raw);
  const maxVal = G.maxShots * 10.9;
  if (isNaN(val) || val < 0 || val > maxVal) {
    DOM.playerInp.classList.add('inp-error');
    DOM.playerInp.classList.remove('inp-ok');
    setInpHint(`Max. ${maxVal.toFixed(1)} Zehntel (${G.maxShots} × 10.9)`, true);
  } else {
    DOM.playerInp.classList.remove('inp-error');
    DOM.playerInp.classList.add('inp-ok');
    setInpHint('', false);
  }
}

function onPlayerInpInt() {
  const raw = DOM.playerInpInt.value;
  if (raw === '') { DOM.playerInpInt.classList.remove('inp-error', 'inp-ok'); return; }
  const val = parseInt(raw);
  const maxVal = G.maxShots * 10;
  if (isNaN(val) || val < 0 || val > maxVal) {
    DOM.playerInpInt.classList.add('inp-error');
    DOM.playerInpInt.classList.remove('inp-ok');
    setInpHint(`Max. ${maxVal} ganze Ringe (${G.maxShots} × 10)`, true);
  } else {
    DOM.playerInpInt.classList.remove('inp-error');
    DOM.playerInpInt.classList.add('inp-ok');
    setInpHint('', false);
  }
}

function calcResult(e, detectedShots = null) {
  clearInpState();
  const kk3x20 = isKK3x20WholeRingsOnly();

  if (kk3x20) {
    const rawInt = DOM.playerInpInt.value.trim();
    const valInt = parseInt(rawInt);
    const maxInt = G.maxShots * 10;
    if (isNaN(valInt) || valInt < 0) {
      DOM.playerInpInt.classList.add('inp-error');
      setInpHint('Bitte eine gültige Ringzahl eingeben', true);
      DOM.playerInpInt.focus(); return;
    }
    if (valInt > maxInt) {
      DOM.playerInpInt.classList.add('inp-error');
      setInpHint(`Max. ${maxInt} Ringe möglich`, true);
      DOM.playerInpInt.focus(); return;
    }
    showGameOver(valInt, G.botTotalInt, null, valInt, detectedShots);
  } else {
    const raw = DOM.playerInp.value.trim();
    const rawInt = DOM.playerInpInt.value.trim();
    const val = parseFloat(raw);
    const valInt = parseInt(rawInt);
    const maxVal = G.maxShots * 10.9;
    const maxInt = G.maxShots * 10;

    if (isNaN(val) || val < 0) {
      DOM.playerInp.classList.add('inp-error');
      setInpHint('Bitte Zehntelwert eingeben (z.B. 405.2)', true);
      DOM.playerInp.focus(); return;
    }
    if (val > maxVal) {
      DOM.playerInp.classList.add('inp-error');
      setInpHint(`Max. ${maxVal.toFixed(1)} Zehntel möglich`, true);
      DOM.playerInp.focus(); return;
    }
    if (isNaN(valInt) || valInt < 0) {
      DOM.playerInpInt.classList.add('inp-error');
      setInpHint('Bitte ganzen Ringwert eingeben (z.B. 392)', true);
      DOM.playerInpInt.focus(); return;
    }
    if (valInt > maxInt) {
      DOM.playerInpInt.classList.add('inp-error');
      setInpHint(`Max. ${maxInt} ganze Ringe möglich`, true);
      DOM.playerInpInt.focus(); return;
    }
    const finalVal = Math.round(val * 10) / 10;
    showGameOver(finalVal, G.botTotal, null, valInt, detectedShots);
  }
}

function quickResult(res) {
  const kk3x20 = isKK3x20WholeRingsOnly();
  // Stelle sicher, dass der Foto-Button in screenOver angezeigt wird
  const icSlot = document.getElementById('icGameOverSlot');
  if (icSlot) {
    icSlot.innerHTML = '';
    const btn = document.createElement('button');
    btn.className = 'ic-go-upload-btn';
    btn.innerHTML = '<span class="ic-go-upload-ico">📸</span> Wettkampf-Foto vergleichen';
    btn.onclick = () => {
      if (typeof ImageCompare !== 'undefined') {
        if (typeof MultiScoreDetection !== 'undefined' && MultiScoreDetection.CONFIG.enableRegionDetection) {
          ImageCompare.openWithMultiScore(kk3x20 ? G.botTotalInt : G.botTotal, kk3x20, G.discipline);
        } else {
          ImageCompare.open(kk3x20 ? G.botTotalInt : G.botTotal, kk3x20, G.discipline);
        }
      } else {
        alert('Foto-Vergleich wird geladen. Bitte Seite neu laden.');
      }
    };
    icSlot.appendChild(btn);
  }

  if (res === 'win') {
    if (kk3x20) {
      showGameOver(G.botTotalInt + 1, G.botTotalInt, 'Schnellauswahl: Gewonnen', G.botTotalInt + 1);
    } else {
      showGameOver(G.botTotal + 0.1, G.botTotal, 'Schnellauswahl: Gewonnen', G.botTotalInt + 1);
    }
  } else if (kk3x20) {
    showGameOver(
      Math.max(0, G.botTotalInt - 1),
      G.botTotalInt,
      'Schnellauswahl: Verloren',
      Math.max(0, G.botTotalInt - 1)
    );
  } else {
    showGameOver(
      Math.max(0, G.botTotal - 0.1),
      G.botTotal,
      'Schnellauswahl: Verloren',
      Math.max(0, G.botTotalInt - 1)
    );
  }
}

// ── Trefferbild-Analyse: eine Gruppe (Stellung oder Gesamt) ──────────────
function analyzeShotGroup(shots, positionName) {
  if (!shots || shots.length < 3) return null;

  const xs = shots.map(s => s.dx);
  const ys = shots.map(s => s.dy);
  const n = shots.length;

  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;
  const stdX = Math.sqrt(xs.reduce((a, v) => a + (v - meanX) ** 2, 0) / n);
  const stdY = Math.sqrt(ys.reduce((a, v) => a + (v - meanY) ** 2, 0) / n);
  const ratio = stdX > 0 && stdY > 0 ? stdX / stdY : 1;
  const spread = (stdX + stdY) / 2;

  const isHoriz = ratio > 1.35;
  const isVert = ratio < 0.75;

  // Schwellwerte je nach Stellung
  const spreadThresh = positionName === 'Stehend' ? 18
    : positionName === 'Kniend' ? 14
      : 10; // Liegend / LG / KK
  const isSpread = spread > spreadThresh;

  // ── Diopter-Korrektur (MPI = Mean Point of Impact) ──────────────────
  // Canvas-Koordinaten: +dx = rechts, +dy = unten
  // Schießsport-Konvention: Schwerpunkt links → Diopter nach RECHTS
  const BIAS_THRESH = 8; // px — unter diesem Wert kein Hinweis
  let diopterLines = [];
  if (Math.abs(meanX) > BIAS_THRESH) {
    const dir = meanX < 0 ? 'RECHTS' : 'LINKS';
    const arrow = meanX < 0 ? '→' : '←';
    diopterLines.push(`${arrow} Diopter nach <b>${dir}</b> drehen`);
  }
  if (Math.abs(meanY) > BIAS_THRESH) {
    const dir = meanY < 0 ? 'HOCH' : 'TIEF';
    const arrow = meanY < 0 ? '↑' : '↓';
    diopterLines.push(`${arrow} Diopter nach <b>${dir}</b> drehen`);
  }
  const hasDiopter = diopterLines.length > 0;

  // ── Muster-Klassifikation je nach Stellung ──────────────────────────
  let icon, shape, tip, boxCls, stabilityAdvice = '';

  if (positionName === 'Kniend') {
    if (isVert) {
      icon = '↕️'; boxCls = 'ab-vert';
      shape = 'Vertikales Oval – typisch für Kniend';
      tip = 'Das <b>vertikale Oval</b> ist für die Kniendstellung normal und entsteht durch Atem- und Pulsbewegung. Achte auf eine gleichmäßige Atemtechnik.';
      if (isSpread) stabilityAdvice = 'Die Streuung ist jedoch zu groß – <b>Trockentraining</b> für mehr Stabilität empfohlen.';
    } else if (isHoriz) {
      icon = '↔️'; boxCls = 'ab-horiz';
      shape = 'Horizontales Oval – ungewöhnlich für Kniend';
      tip = 'Ein <b>horizontales Oval</b> in der Kniendstellung deutet auf seitliches Kippen des Oberkörpers hin. Überprüfe deine Seitenbalance und Fußstellung.';
      stabilityAdvice = '<b>Achte mehr auf die Stabilität</b> deines seitlichen Gleichgewichts.';
    } else if (isSpread) {
      icon = '🌐'; boxCls = 'ab-wide';
      shape = 'Breite Streuung – Stabilität prüfen';
      tip = 'Die Streuung ist für Kniend zu groß. Überprüfe deinen Anschlag und die Körperspannung.';
      stabilityAdvice = '<b>Trockentraining nötig</b> – übe den Kniend-Anschlag ohne Munition.';
    } else {
      icon = '🎯'; boxCls = 'ab-compact';
      shape = 'Kompakter Kreis – ausgezeichnet für Kniend!';
      tip = 'Für Kniend ein <b>hervorragendes Trefferbild</b>. Deine Balance und Atemtechnik sind sehr stabil.';
    }
  } else if (positionName === 'Stehend') {
    if (isSpread) {
      icon = '🌐'; boxCls = 'ab-wide';
      shape = 'Breites, unregelmäßiges Oval – typisch für Stehend';
      tip = 'Die <b>breite Streuung</b> ist für die Stehendstellung normal. Fokussiere dich auf eine ruhige Abzugstechnik und gleichmäßige Körperspannung.';
      if (spread > spreadThresh * 1.6) stabilityAdvice = '<b>Trockentraining nötig</b> – die Streuung ist für Wettkampfniveau zu groß.';
    } else if (isHoriz) {
      icon = '↔️'; boxCls = 'ab-horiz';
      shape = 'Horizontales Oval – Herzschlag-Einfluss';
      tip = 'Ein <b>horizontales Oval</b> beim Stehend-Schießen deutet auf Herzschlag-Einfluss hin. Schieß in der <b>Pulspause</b>.';
    } else if (isVert) {
      icon = '↕️'; boxCls = 'ab-vert';
      shape = 'Vertikales Oval – Atemeinfluss';
      tip = 'Ein <b>vertikales Oval</b> beim Stehend-Schießen entsteht durch Atemschwankungen. Halte den Atem kurz an oder schieß am Ende der Ausatmung.';
    } else {
      icon = '🎯'; boxCls = 'ab-compact';
      shape = 'Überraschend kompakt für Stehend!';
      tip = 'Ein <b>kompaktes Trefferbild</b> in der Stehendstellung ist eine starke Leistung. Deine Körperstabilität ist ausgezeichnet.';
    }
  } else {
    // Liegend / LG / KK 50m / KK 100m
    if (isHoriz) {
      icon = '↔️'; boxCls = 'ab-horiz';
      shape = 'Horizontales Oval – Herzschlag-Einfluss?';
      tip = 'Ein <b>horizontales Oval</b> deutet oft auf <b>Herzschlag-Einfluss</b> hin. Schieß in der <b>Pulspause</b> zwischen zwei Herzschlägen.';
      if (isSpread) stabilityAdvice = '<b>Achte mehr auf die Stabilität</b> – die Streuung ist zu groß für Liegend.';
    } else if (isVert) {
      icon = '↕️'; boxCls = 'ab-vert';
      shape = 'Vertikales Oval – Atemeinfluss?';
      tip = 'Ein <b>vertikales Oval</b> entsteht häufig durch <b>Atemschwankungen</b>. Halte den Atem kurz an oder schieß am Ende einer natürlichen Ausatmung.';
    } else if (isSpread) {
      icon = '🌐'; boxCls = 'ab-wide';
      shape = 'Breite Streuung – Technik prüfen';
      tip = 'Die <b>breite Streuung</b> deutet auf wechselnde Einflüsse hin (Atem, Abzug, Anschlag). Achte auf eine konstante Anschlagsposition.';
      stabilityAdvice = '<b>Trockentraining nötig</b> – übe den Liegend-Anschlag für mehr Konstanz.';
    } else {
      icon = '🎯'; boxCls = 'ab-compact';
      shape = 'Kompakter Kreis – sauberes Trefferbild!';
      tip = 'Ein <b>kompakter, runder Kreis</b> ist das Ziel. Anschlag, Atem und Abzug sind gut aufeinander abgestimmt.';
    }
  }

  return {
    icon, shape, tip, boxCls, stabilityAdvice, hasDiopter, diopterLines,
    meanX, meanY, stdX, stdY, spread, n
  };
}

// ── Haupt-Analyse-Funktion: rendert #analysisResult ─────────────────────
function analyzeHitPattern(shots) {
  if (!DOM.analysisResult) return;

  // ── KK 3×20: drei separate Boxen pro Stellung ───────────────────────
  if (G.is3x20 && G.posResults.length > 0) {
    const boxes = G.positions.map((posName, i) => {
      const pr = G.posResults[i];
      const posShots = (pr && pr.shots) ? pr.shots : [];
      const res = analyzeShotGroup(posShots, posName);
      if (!res) return `<div class="analysis-box ab-neutral ab-pos-box">
            <div class="ab-header">
              <span class="ab-icon">${G.posIcons[i] || '🎯'}</span>
              <span class="ab-label">◈ ${posName}</span>
            </div>
            <div class="ab-shape" style="color:rgba(255,255,255,.35);">Zu wenig Daten</div>
          </div>`;

      const diopterHtml = res.hasDiopter
        ? `<div class="ab-diopter">${res.diopterLines.map(l =>
          `<div class="ab-diopter-line">${l}</div>`).join('')}</div>`
        : '';
      const stabilityHtml = res.stabilityAdvice
        ? `<div class="ab-stability">${res.stabilityAdvice}</div>`
        : '';

      return `<div class="analysis-box ${res.boxCls} ab-pos-box">
            <div class="ab-header">
              <span class="ab-icon">${G.posIcons[i] || '🎯'}</span>
              <span class="ab-label">◈ ${posName.toUpperCase()}</span>
              ${res.hasDiopter ? '<span class="ab-diopter-badge">⚙️ Diopter</span>' : ''}
            </div>
            <div class="ab-shape">${res.shape}</div>
            <div class="ab-tip">${res.tip}</div>
            ${stabilityHtml}
            ${diopterHtml}
            <div class="ab-stats">
              <div class="ab-stat">
                <div class="ab-stat-val">${res.stdX.toFixed(1)}</div>
                <div class="ab-stat-lbl">Streu. X</div>
              </div>
              <div class="ab-stat">
                <div class="ab-stat-val">${res.stdY.toFixed(1)}</div>
                <div class="ab-stat-lbl">Streu. Y</div>
              </div>
              <div class="ab-stat">
                <div class="ab-stat-val">${res.spread.toFixed(1)}</div>
                <div class="ab-stat-lbl">Ø Radius</div>
              </div>
              <div class="ab-stat">
                <div class="ab-stat-val">${res.n}</div>
                <div class="ab-stat-lbl">Schuss</div>
              </div>
            </div>
          </div>`;
    });

    DOM.analysisResult.innerHTML = `
          <div class="ab-section-title">◈ STELLUNGSANALYSE · KK 3×20</div>
          <div class="ab-pos-grid">${boxes.join('')}</div>`;
    return;
  }

  // ── Einzeldisziplin (LG / KK 50m / KK 100m) ─────────────────────────
  if (!shots || shots.length < 3) {
    DOM.analysisResult.innerHTML = '';
    return;
  }

  const res = analyzeShotGroup(shots, null);
  if (!res) { DOM.analysisResult.innerHTML = ''; return; }

  const diopterHtml = res.hasDiopter
    ? `<div class="ab-diopter">${res.diopterLines.map(l =>
      `<div class="ab-diopter-line">${l}</div>`).join('')}</div>`
    : '';
  const stabilityHtml = res.stabilityAdvice
    ? `<div class="ab-stability">${res.stabilityAdvice}</div>`
    : '';

  DOM.analysisResult.innerHTML = `
        <div class="analysis-box ${res.boxCls}">
          <div class="ab-header">
            <span class="ab-icon">${res.icon}</span>
            <span class="ab-label">◈ Trefferbild-Analyse</span>
            ${res.hasDiopter ? '<span class="ab-diopter-badge">⚙️ Diopter</span>' : ''}
          </div>
          <div class="ab-shape">${res.shape}</div>
          <div class="ab-tip">${res.tip}</div>
          ${stabilityHtml}
          ${diopterHtml}
          <div class="ab-stats">
            <div class="ab-stat">
              <div class="ab-stat-val">${res.stdX.toFixed(1)}</div>
              <div class="ab-stat-lbl">Streuung X</div>
            </div>
            <div class="ab-stat">
              <div class="ab-stat-val">${res.stdY.toFixed(1)}</div>
              <div class="ab-stat-lbl">Streuung Y</div>
            </div>
            <div class="ab-stat">
              <div class="ab-stat-val">${res.spread.toFixed(1)}</div>
              <div class="ab-stat-lbl">Ø Radius</div>
            </div>
            <div class="ab-stat">
              <div class="ab-stat-val">${res.n}</div>
              <div class="ab-stat-lbl">Schuss</div>
            </div>
          </div>
        </div>`;
}

function showGameOver(pp, bp, reason, ppInt, detectedShots = null) {
  G.gameDuration = G._gameStartTime > 0
    ? Math.round((Date.now() - G._gameStartTime) / 1000)
    : 0;
  const kk3x20 = isKK3x20WholeRingsOnly();

  // NEU: Wenn Schüsse aus Foto-Analyse vorhanden sind, zur Heatmap hinzufügen
  if (detectedShots && Array.isArray(detectedShots) && detectedShots.length > 0) {
    G.currentDetectedShots = detectedShots;
    if (typeof EnhancedAnalytics !== 'undefined') {
      EnhancedAnalytics.addRealLifeShots(detectedShots);
    }
  } else {
    G.currentDetectedShots = null;
  }

  // NEU: Zielscheibe auf GameOver Screen zeichnen
  setTimeout(() => {
    const goCanvas = document.getElementById('goTargetCanvas');
    if (goCanvas) {
      const dpr = window.devicePixelRatio || 1;
      goCanvas.width = 200 * dpr;
      goCanvas.height = 200 * dpr;
      // Temporärer Context für die Vorschau
      const originalCanvas = document.getElementById('targetCanvas');
      if (originalCanvas) {
        const ctx = goCanvas.getContext('2d');
        // Wir zeichnen entweder die erkannten Schüsse oder die sichtbaren Battle-Schüsse
        if (G.currentDetectedShots && G.currentDetectedShots.length > 0) {
          drawOnCanvas(goCanvas, G.currentDetectedShots);
        } else {
          drawOnCanvas(goCanvas, G.targetShots);
        }
      }
    }
  }, 100);

  DOM.goP.textContent = pp >= 0 ? (kk3x20 ? Math.floor(pp) : fmtPts(pp)) : '–';
  DOM.goB.textContent = kk3x20 ? G.botTotalInt : fmtPts(bp);
  DOM.goPInt.textContent = ppInt !== null ? ppInt : (pp >= 0 ? Math.floor(pp) : '–');
  DOM.goBInt.textContent = G.botTotalInt;
  DOM.goPUnit.textContent = pp >= 0 ? (kk3x20 ? '' : 'Zehntel') : '';

  // Zehntel-Spalten nur bei KK 3×20 ausblenden (LG + KK 50/100m: Zehntel sichtbar)
  const hideZehntel = kk3x20;
  DOM.goP.style.display = hideZehntel ? 'none' : '';
  DOM.goB.style.display = hideZehntel ? 'none' : '';
  document.querySelectorAll('.gs-unit').forEach(el => {
    if (el.textContent === 'Zehntel') el.style.display = hideZehntel ? 'none' : '';
  });
  // Ganze-Zahlen immer hell (KK größer, LG normal)
  DOM.goPInt.style.color = 'rgba(180,230,100,1)';
  DOM.goBInt.style.color = 'rgba(240,130,110,1)';
  DOM.goPInt.style.fontSize = kk3x20 ? '2.2rem' : '1.2rem';
  DOM.goBInt.style.fontSize = kk3x20 ? '2.2rem' : '1.2rem';
  document.querySelectorAll('.gs-unit').forEach(el => {
    if (el.textContent === 'Ganze') el.style.opacity = '0.85';
  });

  const diffCfg = DIFF[G.diff];
  const discCfg = DISC[G.discipline];
  const xCount = G.botShots.filter(s => s.isX).length;
  const xStr = xCount > 0 ? ` · Bot: ${xCount}× ✦X` : '';
  const dnfStr = G.dnf ? ' · ⏰ DNF' : '';
  DOM.goReason.textContent = reason ||
    `${discCfg.name} · ${G.dist} m · ${diffCfg.lbl.replace(/[^\w\s✦]/gi, '').trim()} · ${G.maxShots} Schuss${xStr}${dnfStr}`;

  const useInt = kk3x20;
  const ppCmp = useInt ? (ppInt !== null ? ppInt : Math.floor(pp)) : pp;
  const bpCmp = useInt ? G.botTotalInt : bp;
  const diff = useInt ? (ppCmp - bpCmp) : Math.round((pp - bp) * 10) / 10;
  const absDiff = Math.abs(diff);
  const isElite = G.diff === 'elite';

  let gameResult = 'draw';
  const playerWinner = ppCmp > bpCmp;
  const botWinner = bpCmp > ppCmp;

  if (playerWinner) {
    gameResult = 'win';
    if (typeof Sounds !== 'undefined') setTimeout(() => Sounds.win(), 300);
    if (typeof Haptics !== 'undefined') setTimeout(() => Haptics.win(), 300);
    DOM.goEmoji.textContent = isElite ? '🌟' : '🏆';
    DOM.goTitle.textContent = 'DU GEWINNST!';
    DOM.goTitle.className = 'go-title win';
    DOM.goSub.textContent = isElite
      ? '🤯 Profi-Bot geschlagen! Absolut legendär!'
      : 'Scharfschützin! Der Bot hatte keine Chance.';
    DOM.goMargin.textContent = useInt
      ? `+${absDiff} Ringe Vorsprung`
      : `+${fmtPts(absDiff)} Punkte Vorsprung`;
    DOM.goMargin.className = 'go-margin win';
    DOM.goMargin.style.display = '';
    if (!G.dnf) awardXP(G.diff);
    updateWinStreak(!G.dnf && playerWinner);
    // Track hard/elite wins for SUN
    if (!G.dnf && G.diff === 'hard') localStorage.setItem('sd_beat_hard', '1');
    if (!G.dnf && G.diff === 'elite') localStorage.setItem('sd_beat_elite', '1');
  } else if (botWinner) {
    gameResult = 'lose';
    if (typeof Sounds !== 'undefined') setTimeout(() => Sounds.lose(), 300);
    if (typeof Haptics !== 'undefined') setTimeout(() => Haptics.lose(), 300);
    DOM.goEmoji.textContent = isElite ? '💫' : '🤖';
    DOM.goTitle.textContent = 'BOT GEWINNT!';
    DOM.goTitle.className = 'go-title lose';
    DOM.goSub.textContent = isElite
      ? 'Profi-Niveau – kaum zu schlagen. Respekt fürs Versuchen!'
      : 'Nicht aufgeben – ruf zur Revanche!';
    DOM.goMargin.textContent = useInt
      ? `−${absDiff} Ringe Rückstand`
      : `−${fmtPts(absDiff)} Punkte Rückstand`;
    DOM.goMargin.className = 'go-margin lose';
    DOM.goMargin.style.display = '';
    updateWinStreak(false);
  } else {
    gameResult = 'draw';
    if (typeof Sounds !== 'undefined') setTimeout(() => Sounds.draw(), 300);
    if (typeof Haptics !== 'undefined') setTimeout(() => Haptics.draw(), 300);
    DOM.goEmoji.textContent = '🎖️';
    DOM.goTitle.textContent = 'UNENTSCHIEDEN!';
    DOM.goTitle.className = 'go-title draw';
    DOM.goSub.textContent = isElite ? 'Profi-Bot auf Augenhöhe – bist du ein Roboter?!' : 'Was für ein ausgeglichenes Duell!';
    DOM.goMargin.textContent = 'Punktgleich!';
    DOM.goMargin.className = 'go-margin draw';
    DOM.goMargin.style.display = '';
    updateWinStreak(false);
  }

  // Record stats + history + check SUN
  if (!G.dnf || gameResult !== 'win') {
    recordGameResult(gameResult, G.diff, G.weapon, pp, bp);

    // NEU: Reward System tracken
    if (typeof RewardSystem !== 'undefined') {
      const currentStreak = G.streak || 0;
      RewardSystem.trackGame(gameResult, G.diff, currentStreak);
    }

    // Quests nur bei echtem Ergebnis (OCR oder manuelle Eingabe) berechnen
    // Schnellauswahl (reason enthält 'Schnellauswahl') wird ignoriert
    const isQuickResult = reason && reason.includes('Schnellauswahl');
    if (typeof DailyChallenge !== 'undefined' && !isQuickResult) {
      const questShots = (Array.isArray(G.playerShots) && G.playerShots.length > 0)
        ? G.playerShots.map(s => {
          const points = Number(s.points ?? s.pts ?? s.ring ?? 0) || 0;
          return { points, ring: Math.floor(points) };
        })
        : Array.from({ length: G.maxShots }, () => {
          const fallbackPoints = (pp >= 0 ? pp : 0) / Math.max(1, G.maxShots);
          return { points: fallbackPoints, ring: Math.floor(fallbackPoints) };
        });

      const questConsistency = (() => {
        if (!Array.isArray(questShots) || questShots.length < 3) return 0;
        const points = questShots.map(s => Number(s.points) || 0);
        const mean = points.reduce((a, b) => a + b, 0) / points.length;
        const variance = points.reduce((a, p) => a + ((p - mean) ** 2), 0) / points.length;
        const stdDev = Math.sqrt(variance);
        // Lower spread => higher consistency. stdDev ~0 -> 100, stdDev >=3 -> 0
        return Math.max(0, Math.min(100, Math.round(100 - (stdDev / 3) * 100)));
      })();

      const lgStreak = Number(localStorage.getItem('sd_lg_streak') || 0);
      const kkStreak = Number(localStorage.getItem('sd_kk_streak') || 0);
      const legacyStreak = Number(localStorage.getItem('sd_win_streak') || 0);

      const gameData = {
        result: gameResult,
        difficulty: G.diff,
        weapon: G.weapon,
        shots: questShots,
        consistency: questConsistency
      };
      const statsData = {
        currentStreak: Math.max(Number(G.streak || 0), lgStreak, kkStreak, legacyStreak)
      };
      DailyChallenge.trackGame(gameData, statsData);
    }

    // StreakTracker: 1 Duell = +1 Streak (Mo-Fr ab 12:00)
    if (typeof StreakTracker !== 'undefined') {
      const streakResult = StreakTracker.recordGame();
      if (streakResult.streakIncreased && streakResult.milestone) {
        console.debug('[Streak] Milestone erreicht:', streakResult.milestone);
      }
    }
  }

  // Update UI in case user views result details
  updateSchuetzenpass();

  // NEU: Friend-Challenge Ergebnis übermitteln
  if (G.friendChallenge && typeof FriendChallenges !== 'undefined') {
    try {
      const finalScore = G.playerTotal;
      const shots = G.playerShots.map(s => s.pts || s.points || 0);
      
      FriendChallenges.submitChallengeResult(
        G.friendChallenge.challengeId,
        finalScore,
        shots
      );
      
      console.debug('[Battle] Friend-Challenge Ergebnis übermittelt:', finalScore);
    } catch (error) {
      console.error('[Battle] Friend-Challenge Ergebnis-Fehler:', error);
    }
  }

  if (DOM.analysisResult) DOM.analysisResult.innerHTML = '';
  const totalDuels = getTotalDuels();

  // Sicherstellen, dass Feedback-Plan initialisiert ist
  ensureFeedbackSchedule();

  // Share-Daten für den Teilen-Button speichern
  const diffNames = {
    easy: 'Einfach-Bot', real: 'Mittel-Bot',
    hard: 'Elite-Bot', elite: 'Profi-Bot'
  };
  _lastShareData = {
    kk3x20,
    emoji: DOM.goEmoji.textContent,
    title: DOM.goTitle.textContent,
    resultClass: gameResult,
    playerPts: kk3x20
      ? String(ppInt !== null ? ppInt : Math.floor(pp))
      : fmtPts(pp),
    botPts: kk3x20
      ? String(G.botTotalInt)
      : fmtPts(bp),
    margin: DOM.goMargin.textContent,
    diffLabel: diffNames[G.diff] || G.diff,
    meta: `${DISC[G.discipline]?.name || G.discipline} · ${G.dist}m · ${G.maxShots} Schuss`,
  };

  // Bot-Zustandsanzeige stoppen
  if (typeof stopBotStatusUpdates === 'function') stopBotStatusUpdates();

  // Zuerst screenOver anzeigen, dann dynamisch zur Umfrage wechseln, falls nötig
  showScreen('screenOver');

  // NEW: Show v2 feedback screen with duel data
  const result = G.playerTotal >= G.botTotal ? 'win' : G.playerTotal < G.botTotal ? 'loss' : 'draw';
  const duelResultData = {
    discipline: DISC[G.discipline]?.name || G.discipline,
    opponent: G.botName || undefined,
    result: result,
    score: `Score: ${G.playerTotal} / ${G.botTotal}`
  };

  if (shouldShowFeedback(totalDuels)) {
    // Instead of old prompt, show v2 feedback after short delay
    setTimeout(() => showFeedbackScreen(totalDuels, duelResultData), 2500);
  }

  HealthyEngagement.onMatchFinished(G.gameDuration);
  setTimeout(() => RookiePlan.evaluateAndRender(false), 120);
}

/* ─── SHARE TARGET ────────────────────────── */
window.shareTarget = async function () {
  // Wir nutzen das goTargetCanvas (GameOver Vorschau) zum Teilen
  const canvas = document.getElementById('goTargetCanvas') || document.getElementById('targetCanvas');
  if (!canvas) return;

  try {
    // Blob aus Canvas erstellen
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    const file = new File([blob], 'mein-schussduell-ergebnis.png', { type: 'image/png' });

    // Prüfen ob Web Share API unterstützt wird und Dateien teilen kann
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        files: [file],
        title: 'Mein Schussduell Ergebnis',
        text: `Ich habe gerade ein Duell im Schussduell absolviert! Mein Ergebnis: ${G.playerShots.length > 0 ? G.playerShots.reduce((a, b) => a + b.pts, 0).toFixed(1) : '–'}`
      });
    } else {
      // Fallback: Bild herunterladen
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = 'schussduell-ergebnis.png';
      link.click();
      showEngagementToast('Teilen nicht unterstützt – Bild wurde heruntergeladen.');
    }
  } catch (err) {
    console.error('Fehler beim Teilen:', err);
    showEngagementToast('Teilen fehlgeschlagen.');
  }
};

/* ─── SHARE FEATURE ──────────────────────────────
   Speichert das letzte Ergebnis und füllt die Share-Card.
──────────────────────────────────────────────────*/

// Letztes Ergebnis für Share merken (wird in showGameOver gesetzt)
let _lastShareData = null;

function openShareCard() {
  if (!_lastShareData) return;
  const d = _lastShareData;
  const kk3x20 = d.kk3x20;

  // Card-Felder befüllen
  document.getElementById('scResultEmoji').textContent = d.emoji;
  document.getElementById('scResultTitle').textContent = d.title;
  document.getElementById('scResultTitle').className = 'sc-result-title ' + d.resultClass;
  document.getElementById('scPlayerPts').textContent = d.playerPts;
  document.getElementById('scPlayerUnit').textContent = kk3x20 ? 'Ringe' : 'Zehntel';
  document.getElementById('scBotPts').textContent = d.botPts;
  document.getElementById('scBotUnit').textContent = kk3x20 ? 'Ringe' : 'Zehntel';
  document.getElementById('scBotLabel').textContent = '🤖 ' + d.diffLabel;
  document.getElementById('scMargin').textContent = d.margin;
  document.getElementById('scMeta').textContent = d.meta;

  // Web Share API verfügbar?
  const hasShare = !!navigator.share;
  document.getElementById('shareGoBtn').textContent = hasShare
    ? '📤 \u00a0Jetzt teilen'
    : '📋 \u00a0Link kopieren';
  document.getElementById('shareCopyRow').style.display = hasShare ? 'none' : 'flex';

  document.getElementById('shareOverlay').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeShareCard(e) {
  const overlay = document.getElementById('shareOverlay');
  // BUG-FIX #1: Overflow IMMER wiederherstellen, auch bei X-Button oder Kind-Element Klicks
  if (e && e.target !== overlay && !overlay?.contains(e.target)) return;
  overlay.classList.remove('active');
  document.body.style.overflow = '';
}

function getShareText() {
  const d = _lastShareData;
  if (!d) return null;
  return `🎯 Schuss Challenge\n` +
    `${d.emoji} ${d.title}\n\n` +
    `👧 Ich: ${d.playerPts} vs 🤖 ${d.diffLabel}: ${d.botPts}\n` +
    `${d.margin}\n` +
    `${d.meta}\n\n` +
    `Schieß du auch gegen den Bot! 👇`;
}

async function doShare() {
  const d = _lastShareData;
  if (!d) return;

  const text = getShareText();
  const url = 'https://kr511.github.io/schuss-challenge/';

  if (navigator.share) {
    try {
      await navigator.share({ title: '🎯 Schuss Challenge', text, url });
      // Share-Erfolg tracken
      try {
        const stats = JSON.parse(localStorage.getItem('sd_shares') || '{}');
        stats.count = (stats.count || 0) + 1;
        stats.last = Date.now();
        localStorage.setItem('sd_shares', JSON.stringify(stats));
      } catch (e) { console.warn('[Share] Share-Stats speichern fehlgeschlagen:', e.message); }
    } catch (err) {
      if (err.name !== 'AbortError') console.warn('Share failed:', err);
    }
  } else {
    // Fallback: Link kopieren
    copyShareLink();
  }
}

function copyShareLink() {
  const url = 'https://kr511.github.io/schuss-challenge/';
  let textToCopy = getShareText() || '';
  if (textToCopy) textToCopy += '\n\n' + url;
  else textToCopy = url;

  if (navigator.clipboard) {
    navigator.clipboard.writeText(textToCopy).then(() => {
      const btn = document.querySelector('.share-copy-btn');
      if (btn) { btn.textContent = '✅ Kopiert!'; setTimeout(() => btn.textContent = '📋 Kopieren', 2000); }
    });
  } else {
    const inp = document.getElementById('shareCopyInp');
    if (inp) {
      inp.value = textToCopy.replace(/\n/g, ' ');
      inp.select();
      document.execCommand('copy');
    }
  }
}

function toggleSoundSetting(btn) {
  if (typeof Sounds === 'undefined') return;
  const on = Sounds.toggle();
  if (btn) btn.textContent = on ? '🔊 \u00a0Sound: AN' : '🔇 \u00a0Sound: AUS';
}

function initSoundToggleBtn() {
  const btn = document.getElementById('soundToggleBtn');
  if (!btn || typeof Sounds === 'undefined') return;
  btn.textContent = Sounds.enabled ? '🔊 \u00a0Sound: AN' : '🔇 \u00a0Sound: AUS';
}

function hardResetProgress() {
  if (!confirm("Möchtest du wirklich deinen gesamten Fortschritt (XP, Siege, Erfolge und Streaks) löschen? Dies kann nicht rückgängig gemacht werden!")) return;

  const backupName = G.username;
  StorageManager.clearAll(['reset_v3', 'reset_v4', 'username']);
  StorageManager.setRaw('reset_v3', 'true');
  if (backupName) StorageManager.setRaw('username', backupName);

  // Reload everything
  loadXP();
  G.targetShots = [];
  G.botShots = []; G.botPlan = null; G.botTotal = 0; G.botTotalInt = 0; G._botTotalTenths = 0;
  loadAllStreaks();
  updateSchuetzenpass();
  checkSunAchievements();
  scheduleCloudSync('hard_reset');

  alert("Alle lokalen Daten wurden zurückgesetzt.");
  location.reload(); // Am sichersten für einen kompletten Reset
}

function restartGame() {
  clearPendingFeedbackPrompt();
  clearBattleTimers();
  if (typeof stopBotStatusUpdates === 'function') stopBotStatusUpdates();
  G.targetShots = [];
  G.botShots = []; G.botPlan = null; G.botTotal = 0; G.botTotalInt = 0; G._botTotalTenths = 0;
  G.playerTotal = 0; G.playerTotalInt = 0; G._playerTotalTenths = 0;
  G.playerShotsLeft = G.shots; G.botShotsLeft = G.shots; G.maxShots = G.shots;
  G.dnf = false;
  G._lastPlayerShotAt = 0;
  G.playerShots = [];
  G.currentDetectedShots = [];
  // BUG-FIX: Spiel-Zustand komplett zurücksetzen
  G.probeActive = false;
  G.probeSecsLeft = 0;
  G.botStarted = false;
  G.transitionSecsLeft = 0;
  G.transitionLabel = '';
  G.is3x20 = false;
  G.posIdx = 0; G.posShots = 0; G.posResults = [];
  G.positions = []; G.posIcons = [];
  // NEU: Friend-Challenge zurücksetzen
  G.friendChallenge = null;
  if (DOM.profileOverlay) DOM.profileOverlay.classList.remove('active');
  if (DOM.profileIcon) DOM.profileIcon.classList.remove('active');

  setSz(); drawTarget([]);
  window.scrollTo(0, 0);
  showScreen('screenSetup');
}

function showScreen(id) {
  if (id !== 'screenOver') clearPendingFeedbackPrompt();
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  // Scroll-Position zurücksetzen für konsistentes UX
  window.scrollTo(0, 0);
  if (id === 'screenSetup') {
    RookiePlan.evaluateAndRender(true);
    if (typeof refreshPremiumDashboard === 'function') refreshPremiumDashboard();
    if (typeof updatePDGreeting === 'function') updatePDGreeting();
  } else if (id === 'screenBattle') {
    HealthyEngagement.hideBreakOverlay();
  }
}

/* ─── INIT ───────────────────────────────── */
initDOMCache();
setSz();
drawTarget([]);
loadXP();
// initDailyLoginRewards(); // Verschoben nach awardXP
updateSchuetzenpass();
// Premium Dashboard beim Laden mit echten Daten füllen
if (typeof refreshPremiumDashboard === 'function') setTimeout(refreshPremiumDashboard, 500);
if (typeof DailyChallenge !== 'undefined') DailyChallenge.init();
if (typeof EnhancedAnalytics !== 'undefined') EnhancedAnalytics.init();
updateLeaderboardScopeControl();
refreshDebugToolsVisibility();

// Firebase Init: nur über _tryInitFb() am Ende der Datei
checkSunAchievements(); // Check on load in case new achievements unlocked

// NEU: Fallback-System zuerst initialisieren
if (typeof FeatureFallback !== 'undefined') {
  FeatureFallback.init();
  console.debug('🛡️ Feature Fallback System geladen');
}

// NEU: Neue Features initialisieren (mit Fallback-Schutz)
if (typeof AdaptiveBotSystem !== 'undefined') {
  try {
    AdaptiveBotSystem.init();
    console.debug('🤖 Adaptive Bot System geladen');
  } catch (error) {
    console.error('❌ Adaptive Bot System Fehler:', error);
    if (typeof FeatureFallback !== 'undefined') {
      FeatureFallback.safelyExecute('adaptiveBot', () => { }, () => { });
    }
  }
}

if (typeof ContextualOCR !== 'undefined') {
  try {
    ContextualOCR.init();
    console.debug('🔍 Contextual OCR System geladen');
  } catch (error) {
    console.error('❌ Contextual OCR Fehler:', error);
    if (typeof FeatureFallback !== 'undefined') {
      FeatureFallback.safelyExecute('contextualOCR', () => { }, () => { });
    }
  }
}

if (typeof MultiScoreDetection !== 'undefined') {
  try {
    MultiScoreDetection.init();
    console.debug('📊 Multi-Score Detection System geladen');
  } catch (error) {
    console.error('❌ Multi-Score Detection Fehler:', error);
    if (typeof FeatureFallback !== 'undefined') {
      FeatureFallback.safelyExecute('multiScoreDetection', () => { }, () => { });
    }
  }
}

// Check Welcome screen on init
function checkFirstVisit() {
  const savedNameRaw = StorageManager.getRaw('username');
  if (!savedNameRaw) {
    document.getElementById('welcomeOverlay').classList.add('active');
    setTimeout(() => document.getElementById('welcomeNameInp')?.focus(), 400);
  } else {
    const savedName = sanitizeUsername(savedNameRaw);
    if (savedName !== savedNameRaw) {
      StorageManager.setRaw('username', savedName);
    }
    G.username = savedName;
    // Bekannter User: Profil im Hintergrund synchronisieren
    setTimeout(() => pushProfileToFirebase(), 1500);
    RookiePlan.evaluateAndRender(true);
  }
}

window.addEventListener('difficultyAdapted', function (event) {
  const detail = event.detail || {};
  console.debug('🎯 Schwierigkeit angepasst:', detail.discipline || 'global', detail.oldDifficulty, '→', detail.newDifficulty);
  if (detail.discipline && detail.discipline !== G.discipline) return;
  setDifficulty(detail.newDifficulty, { persist: false });
});

function saveWelcomeName() {
  const inp = document.getElementById('welcomeNameInp');
  const name = sanitizeUsername(inp.value);

  StorageManager.setRaw('username', name);
  G.username = name;

  // Dashboard sofort mit dem neuen Namen aktualisieren
  const pdUserName = document.getElementById('pdUserName');
  if (pdUserName) pdUserName.innerText = name;
  const pdProfileInitial = document.getElementById('pdProfileInitial');
  if (pdProfileInitial) pdProfileInitial.innerText = name.charAt(0).toUpperCase();

  document.getElementById('welcomeOverlay').classList.remove('active');

  scheduleCloudSync('username_changed', { immediate: true });
  // Sofort in Firebase registrieren (Erstanmeldung)
  pushProfileToFirebase();

  // Premium Dashboard sofort mit neuem Namen aktualisieren
  if (typeof refreshPremiumDashboard === 'function') refreshPremiumDashboard();

  RookiePlan.evaluateAndRender(true);
}

// Make inline onclick handlers robustly available from global scope.
Object.assign(window, {
  saveWelcomeName,
  toggleMute,
  toggleProfileMenu,
  handleOverlayClick,
  switchProfileTab,
  enableDebugTools,
  disableDebugTools,
  refreshDebugPanel,
  debugSyncNow,
  setPerfWeapon,
  toggleSoundSetting,
  hardResetProgress,
  switchWeapon,
  showScreen,
  loadLeaderboard,
  setLeaderboardScope,
  setLeaderboardPeriod,
  showAccountSyncCode,
  connectDeviceWithLinkCode,
  selDisc,
  selDist,
  selDiff,
  selShots,
  toggleBurst,
  startBattle,
  doBattleFire,
  skipProbe,
  endBattleEarly,
  calcResult,
  quickResult,
  restartGame,
  submitSiteFeedback,
  skipSiteFeedback,
  fbSetDuel,
  fbSetRating,
  fbToggleTag,
  fbSubmit,
  fbUpdateCounter,
  closeShareCard,
  doShare,
  copyShareLink
});

// Allow Enter key to submit welcome screen or calculation
document.getElementById('welcomeNameInp')?.addEventListener('keypress', function (e) {
  if (e.key === 'Enter') saveWelcomeName();
});
document.getElementById('playerInp')?.addEventListener('keypress', function (e) {
  if (e.key !== 'Enter') return;
  // Auto-Format: Ganzzahl → .0
  const v = parseFloat(this.value);
  if (!isNaN(v)) this.value = v.toFixed(1);
  document.getElementById('playerInpInt')?.focus();
});
document.getElementById('playerInpInt')?.addEventListener('keypress', function (e) {
  if (e.key === 'Enter') calcResult();
});

RookiePlan.init();
checkFirstVisit();
HealthyEngagement.init();

// Build initial discipline tabs for default weapon (lg)
buildDiscTabs('lg');
selDisc('lg40'); // sets dist, shots, hides/shows cards

loadAllStreaks();
ensureFeedbackSchedule();

// Firebase initialisieren (Weltrangliste + Profil-Sync)
// Retry-Logik: Firebase-SDK wird async geladen (über defer-Scripts)
let _fbRetry = 0;
const _tryInitFb = () => {
  if (typeof firebase !== 'undefined' && firebase.apps !== undefined) {
    initFirebase();
  } else if (_fbRetry < 15) {
    _fbRetry++;
    setTimeout(_tryInitFb, 400);
  }
};
_tryInitFb();

window.addEventListener('online', () => {
  scheduleCloudSync('went_online', { immediate: true });
});

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    scheduleCloudSync('page_hidden');
    flushFirebaseSyncQueue();
  }
});

let _rzTimer = null;
window.addEventListener('resize', () => {
  if (_rzTimer) cancelAnimationFrame(_rzTimer);
  _rzTimer = requestAnimationFrame(() => {
    const prevSz = _lastSz;
    setSz();
    // Only redraw if canvas size actually changed
    if (_lastSz !== prevSz) drawTarget(G.targetShots);
  });
}, { passive: true });

// BUG-FIX #5: orientationchange Handler für iOS Safari Rotation
window.addEventListener('orientationchange', () => {
  // Kurze Verzögerung für iOS Safari damit Viewport-Werte aktualisiert werden
  setTimeout(() => {
    setSz();
    drawTarget(G.targetShots);
  }, 200);
});

// Swipe-down to close profile sheet
(function () {
  let startY = 0;
  let startX = 0;
  const sheet = document.getElementById('profileSheet');
  if (!sheet) return;
  sheet.addEventListener('touchstart', e => {
    startY = e.touches[0].clientY;
    startX = e.touches[0].clientX;
  }, { passive: true });
  sheet.addEventListener('touchend', e => {
    const dy = e.changedTouches[0].clientY - startY;
    const dx = Math.abs(e.changedTouches[0].clientX - startX);
    // Nur schließen wenn vertikal UND nicht horizontal abgelenkt
    if (dy > 80 && dy > dx * 2) toggleProfileMenu();
  }, { passive: true });
})();

// ── Service Worker (PWA / Offline) ──────────────────────────────────
if ('serviceWorker' in navigator && typeof MobileFeatures === 'undefined') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js?v=2.7').catch(() => { });
  });
}

// ── Streak Countdown Timer (aktualisiert jede Minute) ───────────────
let _streakCountdownInterval = null;
function startStreakCountdown() {
  if (_streakCountdownInterval) clearInterval(_streakCountdownInterval);

  function updateCountdown() {
    const timerEl = document.getElementById('streakCountdownTimer');
    if (!timerEl) return;

    const now = new Date();
    const nextMidnight = new Date(now);
    nextMidnight.setHours(24, 0, 0, 0);
    const msLeft = Math.max(0, nextMidnight.getTime() - now.getTime());
    const minsLeft = Math.floor(msLeft / 60000);
    const hLeft = Math.floor(minsLeft / 60);
    const mLeft = minsLeft % 60;
    timerEl.textContent = `${String(hLeft).padStart(2, '0')}:${String(mLeft).padStart(2, '0')}`;

    // Wenn Mitternacht erreicht → Dashboard neu laden
    if (msLeft <= 0) {
      if (typeof refreshPremiumDashboard === 'function') refreshPremiumDashboard();
    }
  }

  updateCountdown();
  _streakCountdownInterval = setInterval(updateCountdown, 30000); // Alle 30s aktualisieren
}

// Countdown starten wenn Dashboard sichtbar ist
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(startStreakCountdown, 1000);
    
    // Auth Form Listener initialisieren
    setTimeout(() => {
      initAuthFormListeners();
      injectAuthSpinnerCSS();
    }, 500);
  });
}




document.addEventListener('DOMContentLoaded', () => {
  setTimeout(refreshPremiumDashboard, 300);
});
