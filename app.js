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
      const keepName = localStorage.getItem('sd_username');
      const keepXP = localStorage.getItem('sd_xp');
      localStorage.clear();
      localStorage.setItem('sd_reset_v3', 'true');
      if (keepName) localStorage.setItem('sd_username', keepName);
      if (keepXP) localStorage.setItem('sd_xp', keepXP);
    }

    /* ─── STATE ──────────────────────────────── */
    const G = {
      dist: '10', diff: 'easy',
      weapon: 'lg',          // 'lg' | 'kk'
      username: StorageManager.getRaw('username', ''),
      discipline: 'lg40',    // 'lg40' | 'lg60' | 'kk50' | 'kk100' | 'kk3x20'
      shots: 40,             // Schussanzahl (aus Disziplin oder manuell)
      burst: false,          // 5er-Salve Modus
      botShots: [], botTotal: 0, botTotalInt: 0, _botTotalTenths: 0,
      shotsLeft: 40, maxShots: 40,
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
      _gameStartTime: 0,     // Für Spieldauer-Berechnung
      // Probezeit
      probeActive: false,    // Probezeit ist aktiv
      probeSecsLeft: 0,      // Verbleibende Sekunden in Probezeit
      botStarted: false,     // Bot hat bereits zu schießen angefangen
      // 3x20 Übergangsphasen (Positionswechsel / Umbau / Probe)
      transitionSecsLeft: 0, // verbleibende Sekunden in Übergangsphase
      transitionLabel: '',   // Label für aktuelle Übergangsphase
    };

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
        name: '3×20 KK', weapon: 'kk', shots: 60, dist: '50', is3x20: true,
        timeMins: 105, desc: '3 x 20 Schuss · 105 Min', icon: '🏆',
        positions: ['Kniend', 'Liegend', 'Stehend'], posIcons: ['🦵', '🛏️', '🧍'],
        info: '<b>3×20 KK</b> – Je 20 Schuss kniend, liegend und stehend mit KK auf 50 m. Zeitlimit: 105 Minuten inkl. Positionswechsel.'
      },
    };

    // Disziplinen pro Waffe
    const WEAPON_DISCS = {
      lg: ['lg40', 'lg60'],
      kk: ['kk50', 'kk100', 'kk3x20'],
    };

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
        mult: 0.88, noise: 5, lbl: '😊 EINFACH', cls: 'easy',
        info: '<b>Einfach</b> – Solider Einstieg. ~360–375 Pkt. Schaffbar mit Konzentration!'
      },
      real: {
        mult: 0.60, noise: 3.0, lbl: '🎯 MITTEL', cls: 'real',
        info: '<b>Mittel</b> – Fast nur 9er und 10er. ~380–390 Pkt. Kein Spaziergang!'
      },
      hard: {
        mult: 0.22, noise: 0.5, lbl: '💪 ELITE', cls: 'hard',
        info: '<b>Elite</b> – Trifft sehr präzise. ~395–405 Pkt. Kaum zu schlagen!'
      },
      elite: {
        mult: 0.11, noise: 0.08, lbl: '💫 PROFI', cls: 'elite',
        info: '<b>Profi</b> – Immer ≥410 Zehntel. Extrem präzise. Viel Glück!'
      }
    };

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
      // 3×20 KK: Gesamt 60 Schuss, nur ganze Zahlen
      kk3x20: {
        easy: '<b>Einfach</b> – Solider Einstieg. Gesamt ~530–542 Ringe. Schaffbar mit Konzentration!',
        real: '<b>Mittel</b> – Fast nur 9er und 10er. Gesamt ~544–555 Ringe. Kein Spaziergang!',
        hard: '<b>Elite</b> – Trifft sehr präzise. Gesamt ~557–565 Ringe. Kaum zu schlagen!',
        elite: '<b>Profi</b> – Gesamt ≥567 Ringe. Extrem präzise. Viel Glück!'
      }
    };

    // Hilfsfunktion zum Abrufen der disziplinspezifischen Schwierigkeits-Info
    function getDiffInfo(diff) {
      const discSpecificInfos = DIFF_INFO_BY_DISC[G.discipline];
      if (discSpecificInfos && discSpecificInfos[diff]) {
        return discSpecificInfos[diff];
      }
      return DIFF[diff].info; // Fallback zu Standard-Info
    }

    /** KK 3×20: nur ganze Ringe, keine Zehntel in UI/Vergleich (KK 50/100m verhalten sich wie LG) */
    function isKK3x20WholeRingsOnly() {
      return G.is3x20 && G.weapon === 'kk';
    }

    const WEAPON_CFG = {
      lg: {
        icon: '🌬️', name: 'Luftgewehr', badgeCls: 'lg', defaultDist: '10',
        allowedDists: ['10'],
        setupTag: (disc, dist) => `◆ LUFTGEWEHR · ${DISC[disc]?.name || disc} · ${dist} METER ◆`
      },
      kk: {
        icon: '🎯', name: 'KK', badgeCls: 'kk', defaultDist: '50',
        allowedDists: ['50', '100'],
        setupTag: (disc, dist) => `◆ KK · ${DISC[disc]?.name || disc} · ${dist} METER ◆`
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
    }

    function awardXP(diff) {
      const gained = XP_PER_WIN[diff] || 10;
      const { idx: oldIdx } = getRank(G.xp);
      G.xp += gained;
      saveXP();
      updateSchuetzenpass();
      showXPPop(gained);
      
      // Rank Check
      const { rank: newRank, idx: newIdx } = getRank(G.xp);
      if (newIdx > oldIdx) {
        showLevelUp(newRank);
      } else {
        if (typeof Sounds !== 'undefined') setTimeout(() => Sounds.xp(), 500);
      }
      
      // Auto-sync zu Firebase
      pushProfileToFirebase();
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

      if (typeof Sounds !== 'undefined') Sounds.levelUp();
    }

    window.closeLevelUp = function() {
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
      if (!ov) return;
      const isActive = ov.classList.contains('active');
      if (isActive) {
        ov.classList.remove('active');
      } else {
        refreshProfileSheet();
        ov.classList.add('active');
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
      document.querySelectorAll('.ps-panel').forEach(p => p.classList.toggle('active', p.id === 'psPanel-' + tab));
      if (tab === 'sun') renderSunGrid();
      if (tab === 'lb') loadLeaderboard();
      if (tab === 'history') renderHistory();
      if (tab === 'stats') requestAnimationFrame(() => renderPerformanceChart());
    }

    function refreshProfileSheet() {
      const { rank, idx } = getRank(G.xp);
      const nextRank = RANKS[idx + 1] || null;
      const xpInRank = G.xp - rank.min;
      const xpNeeded = nextRank ? (nextRank.min - rank.min) : 1;
      const pct = nextRank ? Math.min(100, (xpInRank / xpNeeded) * 100) : 100;

      // Hero
      const el = id => document.getElementById(id);
      if (el('psAvatarIcon')) el('psAvatarIcon').textContent = rank.icon;
      if (el('psRankIcon')) el('psRankIcon').textContent = rank.icon;
      if (el('psRankName')) el('psRankName').textContent = rank.name;
      if (el('psLevel')) el('psLevel').textContent = idx + 1;
      if (el('psTotalXP')) el('psTotalXP').textContent = G.xp;
      if (el('psUsername')) el('psUsername').textContent = G.username || 'Schütze';

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

      const lgStats = loadWeaponStats('lg');
      const kkStats = loadWeaponStats('kk');
      setEl('psLGDetail', `${lgStats.wins} Siege · ${lgStats.wins + lgStats.losses} Spiele`);
      setEl('psKKDetail', `${kkStats.wins} Siege · ${kkStats.wins + kkStats.losses} Spiele`);
      setEl('psLGStreak', bestLG > 0 ? '🔥 ' + bestLG : '–');
      setEl('psKKStreak', bestKK > 0 ? '🔥 ' + bestKK : '–');

      // Active tab refresh
      const activeTab = document.querySelector('.ps-tab.active');
      if (activeTab) {
        const t = activeTab.dataset.tab;
        if (t === 'sun') renderSunGrid();
        if (t === 'history') renderHistory();
      }
    }

    /* ─── GAME STATS (localStorage) ─────────── */
    function loadGameStats() {
      try { return JSON.parse(localStorage.getItem('sd_gamestats') || '{}'); }
      catch (e) { return {}; }
    }

    function saveGameStats(s) {
      try { localStorage.setItem('sd_gamestats', JSON.stringify(s)); } catch (e) { }
    }

    const FEEDBACK_MIN_DUELS = 3;
    const FEEDBACK_MAX_DUELS = 5;

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
      try { localStorage.setItem('sd_feedback_meta', JSON.stringify(meta)); } catch (e) { }
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

    function showFeedbackScreen(totalDuels) {
      if (DOM.feedbackCount) DOM.feedbackCount.textContent = `◆ DUELL #${totalDuels} ◆`;
      showScreen('screenFeedback');
    }

    function submitSiteFeedback(rating) {
      const score = parseInt(rating);
      const totalDuels = getTotalDuels();

      if (Number.isInteger(score) && score >= 1 && score <= 5) {

        // 1. Wie bisher: lokal speichern
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
        try { localStorage.setItem('sd_feedback_entries', JSON.stringify(entries)); } catch (e) {}

        // 2. NEU: An Firebase senden
        if (fbReady && fbDb) {
          // Anonymer Hash aus Username (kein Klartext)
          const userHash = G.username
            ? G.username.split('').reduce((a, c) => ((a << 5) - a + c.charCodeAt(0)) | 0, 0)
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
            userHash,
            ts: Date.now(),
            date: new Date().toLocaleDateString('de-DE', {
              day: '2-digit', month: '2-digit', year: 'numeric',
              hour: '2-digit', minute: '2-digit'
            })
          };

          // Unter feedback_v1/{timestamp}_{userHash} speichern
          // (kein .push() damit keine Duplikate bei Retry)
          const key = Date.now() + '_' + userHash;
          fbDb.ref('feedback_v1/' + key).set(entry)
            .catch(err => console.warn('Feedback Firebase-Fehler:', err?.code));
        }
      }

      scheduleNextFeedback(totalDuels);
      showScreen('screenSetup');
    }

    function skipSiteFeedback() {
      const totalDuels = getTotalDuels();
      scheduleNextFeedback(totalDuels);
      showScreen('screenSetup');
    }

    function loadWeaponStats(w) {
      try { return JSON.parse(localStorage.getItem(`sd_wstats_${w}`) || '{"wins":0,"losses":0,"draws":0}'); }
      catch (e) { return { wins: 0, losses: 0, draws: 0 }; }
    }

    function saveWeaponStats(w, s) {
      try { localStorage.setItem(`sd_wstats_${w}`, JSON.stringify(s)); } catch (e) { }
    }

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
        const gameData = {
          result: result,
          playerScore: playerPts,
          botScore: botPts,
          discipline: G.discipline,
          weapon: weapon,
          difficulty: diff,
          shots: G.playerShots || [], // Spieler-Schüsse falls verfügbar
          maxDeficit: Math.max(0, botPts - playerPts), // Größter Rückstand
          duration: G.gameDuration || 0, // Spieldauer falls verfügbar
          timestamp: Date.now()
        };
        
        EnhancedAnalytics.addGameData(gameData);
      }

      // NEU: Erweiterte Achievements prüfen
      if (typeof EnhancedAchievements !== 'undefined') {
        const gameData = {
          result: result,
          playerScore: playerPts,
          botScore: botPts,
          allShots: G.playerShots || [],
          won: result === 'win',
          maxDeficit: Math.max(0, botPts - playerPts)
        };
        
        const stats = {
          currentStreak: G.currentStreak || 0,
          gamesPlayed: (gs.gamesPlayed || 0) + 1
        };
        
        const unlockedAchievements = EnhancedAchievements.checkAchievementsAfterGame(gameData, stats);
        
        // Benachrichtigung für neue Achievements
        if (unlockedAchievements.length > 0 && typeof MobileFeatures !== 'undefined') {
          unlockedAchievements.forEach(achievement => {
            MobileFeatures.sendAchievementNotification(achievement);
          });
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
        if (playerPts > (G.personalBest || 0)) {
          MobileFeatures.hapticAchievement();
        }
      }

      // Auto-Sync zu Firebase nach jedem Spiel (Streak + Stats aktuell halten)
      // Kleines Delay damit updateWinStreak() zuerst den Cache aktualisiert
      setTimeout(() => pushProfileToFirebase(), 300);
    }

    /* ─── HISTORY ────────────────────────────── */
    function addHistoryEntry(result, diff, weapon, playerPts, botPts) {
      try {
        const hist = JSON.parse(localStorage.getItem('sd_history') || '[]');
        const DIFF_NAMES = { easy: 'Einfach', real: 'Mittel', hard: 'Elite', elite: 'Profi' };
        const WEAPON_NAMES = { lg: 'Luftgewehr', kk: 'KK' };
        hist.unshift({
          result,
          diff,
          weapon,
          playerPts,
          botPts,
          diffName: DIFF_NAMES[diff] || diff,
          weaponName: WEAPON_NAMES[weapon] || weapon,
          date: new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
        });
        if (hist.length > 30) hist.splice(30);
        localStorage.setItem('sd_history', JSON.stringify(hist));
      } catch (e) { }
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
          const pPts = h.playerPts != null ? parseFloat(h.playerPts).toFixed(1) : '–';
          const bPts = h.botPts != null ? parseFloat(h.botPts).toFixed(1) : '–';
          return `<div class="ps-history-item">
            <div class="phi-result ${h.result}">${resLabel}</div>
            <div class="phi-info">
              <div class="phi-title">${h.weaponName} · ${h.diffName}</div>
              <div class="phi-sub">${h.date}</div>
            </div>
            <div class="phi-score ${h.result}">${pPts} <span style="opacity:.4;font-size:.7em">vs</span> ${bPts}</div>
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
      try { hist = JSON.parse(localStorage.getItem('sd_history') || '[]'); } catch (e) { }

      const filtered = hist
        .filter(h => h.weapon === _perfWeapon && h.playerPts != null)
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
          const otherCount = hist.filter(h => h.weapon !== _perfWeapon && h.playerPts != null).length;
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
      const ctx2d = canvas.getContext('2d');
      const boxH = canvas.parentElement?.offsetHeight || 160;
      const grad = ctx2d.createLinearGradient(0, 0, 0, boxH);
      grad.addColorStop(0, `rgba(${accentRgb},.22)`);
      grad.addColorStop(1, `rgba(${accentRgb},0)`);

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
    }

    const SUN_ACHIEVEMENTS = [
      // Basic
      { id: 'first_game', group: 'basic', icon: '🎯', name: 'Erster Schuss', desc: '1 Duell gespielt', check: () => (loadGameStats().wins || 0) + (loadGameStats().losses || 0) + (loadGameStats().draws || 0) >= 1 },
      { id: 'first_win', group: 'basic', icon: '🏆', name: 'Erster Sieg', desc: '1 Duell gewonnen', check: () => (loadGameStats().wins || 0) >= 1 },
      { id: 'five_games', group: 'basic', icon: '🔢', name: 'Fünf Duelle', desc: '5 Spiele gespielt', check: () => (loadGameStats().wins || 0) + (loadGameStats().losses || 0) + (loadGameStats().draws || 0) >= 5 },
      { id: 'xp_100', group: 'basic', icon: '⭐', name: '100 XP', desc: '100 XP verdient', check: () => G.xp >= 100 },
      { id: 'streak_3', group: 'basic', icon: '🔥', name: 'Heiß!', desc: '3er Siegesserie', check: () => Math.max(parseInt(localStorage.getItem('sd_lg_best') || '0') || 0, parseInt(localStorage.getItem('sd_kk_best') || '0') || 0) >= 3 },
      // Battle
      { id: 'beat_hard', group: 'battle', icon: '💀', name: 'Harter Brocken', desc: 'Elite-Bot besiegt', check: () => !!(localStorage.getItem('sd_beat_hard')) },
      { id: 'beat_elite', group: 'battle', icon: '💫', name: 'Legende', desc: 'Profi-Bot besiegt', check: () => !!(localStorage.getItem('sd_beat_elite')) },
      { id: 'ten_wins', group: 'battle', icon: '🥇', name: '10 Siege', desc: '10 Duelle gewonnen', check: () => (loadGameStats().wins || 0) >= 10 },
      { id: 'both_weapons', group: 'battle', icon: '⚔️', name: 'Allrounder', desc: 'LG & KK je 1 Sieg', check: () => (loadWeaponStats('lg').wins || 0) >= 1 && (loadWeaponStats('kk').wins || 0) >= 1 },
      { id: 'streak_7', group: 'battle', icon: '🌟', name: 'Unaufhaltsam', desc: '7er Siegesserie', check: () => Math.max(parseInt(localStorage.getItem('sd_lg_best') || '0') || 0, parseInt(localStorage.getItem('sd_kk_best') || '0') || 0) >= 7 },
      // Master
      { id: 'xp_500', group: 'master', icon: '🏅', name: 'Meister', desc: '500 XP verdient', check: () => G.xp >= 500 },
      { id: 'xp_1000', group: 'master', icon: '🏆', name: 'Großmeister', desc: '1000 XP verdient', check: () => G.xp >= 1000 },
      { id: 'streak_14', group: 'master', icon: '🔥🔥', 'name': '14er Streak', desc: '14er Siegesserie', check: () => Math.max(parseInt(localStorage.getItem('sd_lg_best') || '0') || 0, parseInt(localStorage.getItem('sd_kk_best') || '0') || 0) >= 14 },
      { id: 'fifty_games', group: 'master', icon: '🎖️', name: '50 Duelle', desc: '50 Spiele gespielt', check: () => (loadGameStats().wins || 0) + (loadGameStats().losses || 0) + (loadGameStats().draws || 0) >= 50 },
      { id: 'xp_2000', group: 'master', icon: '💫', name: 'Legende', desc: '2000 XP – Legendenstatus', check: () => G.xp >= 2000 },
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
      try { localStorage.setItem('sd_sun', JSON.stringify(e)); } catch (_) { }
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

    let fbApp = null, fbDb = null, fbReady = false;

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
      } catch (e) { console.warn('Firebase init failed:', e); fbReady = false; }
    }

    function loadLeaderboard() {
      const list = document.getElementById('lbList');
      if (!list) return;

      list.innerHTML = '<div class="lb-loading">⏳ Lade Rangliste...</div>';

      // Status-Badge (falls vorhanden)
      updateLbStatusBadge();

      // Warte bis Firebase bereit
      const tryLoad = (attempts) => {
        if (!fbReady) {
          if (attempts > 0) { setTimeout(() => tryLoad(attempts - 1), 300); return; }
          list.innerHTML = '<div class="lb-empty">🔌 Offline – Bestenliste nicht verfügbar.</div>';
          return;
        }
        
        // Lade Top 50 nach XP sortiert
        fbDb.ref('leaderboard_v2').orderByChild('xp').limitToLast(50).once('value')
          .then(snap => {
            const entries = [];
            snap.forEach(child => { entries.push(child.val()); });
            entries.reverse(); // Höchste XP zuerst
            renderLeaderboard(entries);
          })
          .catch(err => {
            console.error('Leaderboard load error:', err?.code, err?.message);
            list.innerHTML = '<div class="lb-empty">⚠️ Fehler beim Laden.</div>';
          });
      };
      tryLoad(10);
    }

    function renderLeaderboard(entries) {
      const list = document.getElementById('lbList');
      if (!list) return;
      if (!entries.length) {
        list.innerHTML = '<div class="lb-empty">Noch keine Einträge. Sei der Erste! 🏆</div>';
        return;
      }
      
      list.innerHTML = entries.map((e, i) => {
        const isMe = G.username && e.name === G.username;
        const weaponIcon = e.weapon === 'kk' ? '🎯' : '🌬️';
        return `
          <div class="lb-row ${isMe ? 'me' : ''}">
            <div class="lb-rank-num">${i + 1}</div>
            <div class="lb-avatar">${e.rankIcon || '👤'}</div>
            <div class="lb-info">
              <div class="lb-name">${escHtml(e.name || 'Anonym')}${isMe ? ' (Du)' : ''}</div>
              <div class="lb-sub">${weaponIcon} ${e.rank || 'Schütze'}</div>
            </div>
            <div class="lb-stats">
              <div class="lb-xp">${e.xp || 0} XP</div>
              <div class="lb-streak">🔥 ${e.streak || 0}</div>
            </div>
          </div>
        `;
      }).join('');
    }

    function escHtml(s) { return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

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
        name: G.username || 'Anonym',
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
      el.textContent = `✓ Eingetragen als "${G.username}"`;
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
        if (ok) loadLeaderboard();
        else alert('Offline – Eintrag konnte nicht gespeichert werden.');
      });
    }
    const DOM = {};
    function initDOMCache() {
      const ids = [
        'shotsLeft', 'botScoreChip', 'botScoreChipInt', 'botScoreChipContainer', 'botScoreDivider',
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
        'psLGDetail', 'psLGStreak', 'psKKDetail', 'psKKStreak',
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
    const canvas = document.getElementById('targetCanvas');
    const ctx = canvas.getContext('2d', { alpha: false });

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

    function drawTarget(shots) {
      const canvas = document.getElementById('targetCanvas');
      const W = canvas.width, H = canvas.height, cx = W / 2, cy = H / 2, maxR = W / 2 - 3;

      // KK (alle Disziplinen): Deutsche Kleinkaliber-Scheibe
      if (G.weapon === 'kk') {
        if (!_kk50Ready) buildKK50Target();
        ctx.drawImage(_offCanvasKK50, 0, 0);
        if (shots && shots.length > 0) {
          for (const s of shots) {
            // KK: kleineres Einschussloch (KK-Kaliber .22)
            drawHole(cx + s.dx, cy + s.dy, maxR * .030, '#111111', '#444444', s.cracks);
          }
        }
        return;
      }

      // LG: Luftgewehr-Scheibe (10m)
      if (!_staticReady) buildStaticTarget();
      ctx.drawImage(_offCanvas, 0, 0);
      if (shots && shots.length > 0) {
        for (const s of shots) {
          // LG: etwas größeres Einschussloch (Diabolo-Geschoss)
          drawHole(cx + s.dx, cy + s.dy, maxR * .036, '#111111', '#444444', s.cracks);
        }
      }
    }

    function drawHole(x, y, r, dark, glow, cracks) {
      // Papier-Aufriss-Schatten (leichter Grauschimmer um das Loch)
      const shadow = ctx.createRadialGradient(x, y, r * 0.8, x, y, r * 3.5);
      shadow.addColorStop(0, 'rgba(0,0,0,0.18)');
      shadow.addColorStop(1, 'transparent');
      ctx.beginPath(); ctx.arc(x, y, r * 3.5, 0, Math.PI * 2);
      ctx.fillStyle = shadow; ctx.fill();

      // Papier-Risse (kurze Linien um das Loch)
      ctx.save(); ctx.translate(x, y);
      ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 0.6;
      const crackData = cracks || Array.from({ length: 6 }, (_, i) => ({ a: (i / 6) * Math.PI * 2 + 0.3, len: 1.8 }));
      for (const c of crackData) {
        ctx.beginPath();
        ctx.moveTo(Math.cos(c.a) * r * 0.9, Math.sin(c.a) * r * 0.9);
        ctx.lineTo(Math.cos(c.a) * r * c.len, Math.sin(c.a) * r * c.len);
        ctx.stroke();
      }
      ctx.restore();

      // Einschussloch: dunkel, leicht aufgerissen
      const hg = ctx.createRadialGradient(x - r * .25, y - r * .25, 0, x, y, r);
      hg.addColorStop(0, '#1a1a1a');
      hg.addColorStop(0.7, '#080808');
      hg.addColorStop(1, dark);
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = hg; ctx.fill();

      // Heller Rand (Papier aufgerissen)
      ctx.beginPath(); ctx.arc(x, y, r * 1.15, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = r * 0.4; ctx.stroke();
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
      if (G.diff) {
        DOM.diffInfoTxt.innerHTML = getDiffInfo(G.diff);
      }
    }

    /* ─── SELECTORS ──────────────────────────── */
    function selDist(btn) {
      // Distanz wird immer durch die Disziplin bestimmt – kein manueller Wechsel
      return;
    }

    function selDiff(btn) {
      document.querySelectorAll('#diffGroup .dif').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      G.diff = btn.dataset.diff;
      DOM.diffInfoTxt.innerHTML = getDiffInfo(G.diff);
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
      try {
        const prefix = `sd_${w}_`;
        const streak = parseInt(localStorage.getItem(prefix + 'streak') || '0');
        const best = parseInt(localStorage.getItem(prefix + 'best') || '0');

        STREAK_CACHE[w] = { streak, best };
      } catch (e) {
        STREAK_CACHE[w] = { streak: 0, best: 0 };
      }
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
      const pfx = `sd_${w}_`;
      try {
        let streak = parseInt(localStorage.getItem(pfx + 'streak') || '0') || 0;
        const best = parseInt(localStorage.getItem(pfx + 'best') || '0') || 0;

        if (won) {
          streak++;
        } else {
          streak = 0;
        }

        localStorage.setItem(pfx + 'streak', streak);
        const newBest = Math.max(streak, best);
        localStorage.setItem(pfx + 'best', newBest);

        STREAK_CACHE[w] = { streak, best: newBest };
        G.streak = streak;
        // Sync wird von awardXP / recordGameResult ausgelöst
      } catch (e) { }
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
          kk3x20: { baseSecs: 85, min: 60, max: 120 }      // 3×20: 105min für 60 Schuss inkl. Wechsel → längere Mittel je Schuss
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
          if (G.shotsLeft <= 0) return; // Spiel schon vorbei
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
      if (G.shotsLeft <= 0) return;
      const bRes = fireSingleShot();
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
        DOM.shotLogWrap.scrollTop = DOM.shotLogWrap.scrollHeight;
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
        drawTarget(G.botShots);
        updateBattleUI();
        if (G.shotsLeft <= 0) {
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

    function startBattle() {
      const dc = DISC[G.discipline];
      G.maxShots = dc.shots;
      G.shotsLeft = dc.shots;
      G.botShots = []; G.botTotal = 0; G.botTotalInt = 0; G._botTotalTenths = 0;
      G.playerShots = [];
      G._gameStartTime = Date.now();
      G.dnf = false;
      G.probeActive = true;  // Probezeit ist aktiv
      G.probeSecsLeft = (G.discipline === 'kk3x20' ? KK3X20_CFG.probeSecs : 15 * 60);  // disziplinspezifische Probezeit
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

      setSz(); drawTarget([]);

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
        G.positions.forEach((_, i) => { DOM.slPills[i] = document.getElementById(`slPills${i}`); });
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

      // Reset Bot-Start-Flag
      G.botStarted = false;

      // Match-Timer SOFORT starten
      const timeMins = dc.timeMins || 50;
      startMatchTimer(timeMins * 60);

      // Bot-Auto-Shoot startet NACH Probezeit (15 Min später)
      const probeDelayMs = ((G.discipline === 'kk3x20' ? KK3X20_CFG.probeSecs : 15 * 60) + 5) * 1000; // Probezeit + 5 Sek Delay
      G._botStartTimeout = setTimeout(() => {
        if (!G.botStarted) {
          G.botStarted = true;
          startBotAutoShoot();
        }
      }, probeDelayMs);
    }

    function updateBattleUI() {
      const lowThresh = Math.max(5, Math.round(G.maxShots * 0.15));
      const low = G.shotsLeft <= lowThresh;
      const fired = G.maxShots - G.shotsLeft;

      // Score — compute once, assign to both score chip and live bar
      DOM.shotsLeft.textContent = G.shotsLeft;
      DOM.shotsLeft.className = low ? 'chip-val low' : 'chip-val';
      DOM.botScoreChipInt.textContent = G.botTotalInt;
      DOM.lsbInt.textContent = G.botTotalInt;

      // Nur KK 3×20: keine Zehntel anzeigen. KK 50m/100m zeigen Zehntel normal.
      const noTenths = G.is3x20 && G.weapon === 'kk';
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

      if (G.burst) DOM.battleBurstBtn.disabled = G.shotsLeft <= 0;
      else DOM.battleFireBtn.disabled = G.shotsLeft <= 0;
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

    function fireSingleShot() {
      if (G.shotsLeft <= 0) return false;

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
        // KK 50m/100m (60 Schuss Liegend): kalibriert auf 580–620 Zehntel
        const KK60_BASE  = { easy: 11.5, real: 9.5, hard: 7.5, elite: 6.5 };
        const KK60_NOISE = { easy: 2.5,  real: 1.5, hard: 0.8, elite: 0.2 };
        botSig = (KK60_BASE[G.diff] ?? 9.5) + (KK60_NOISE[G.diff] ?? 1.5) * Math.random();
      } else if (G.discipline === 'lg40') {
        // LG 40 (40 Schuss, 10m): kalibriert auf 360–415 Zehntel
        // Sigma in Pixel (canvas maxR≈132px, Ring10-Radius≈13.2px)
        const LG40_BASE  = { easy: 17, real: 13, hard: 9, elite: 6 };
        const LG40_NOISE = { easy:  3, real:  2, hard: 1, elite: 0.2 };
        botSig = (LG40_BASE[G.diff] ?? 13) + (LG40_NOISE[G.diff] ?? 2) * Math.random();
      } else if (G.discipline === 'lg60') {
        // LG 60 (60 Schuss, 10m): kalibriert auf 575–625 Zehntel
        const LG60_BASE  = { easy: 12, real: 9, hard: 6.5, elite: 5.5 };
        const LG60_NOISE = { easy:  2, real: 1.5, hard: 0.8, elite: 0.2 };
        botSig = (LG60_BASE[G.diff] ?? 9) + (LG60_NOISE[G.diff] ?? 1.5) * Math.random();
      } else {
        // Fallback für andere Disziplinen
        botSig = sig * dc.mult + dc.noise * Math.random();
      }
      // KK 3x20: nur ganze Ringe → botSig so anpassen, dass Treffer ganzzahlig ausgewertet werden
      // (die Zehntel werden beim Akkumulieren weggeschnitten – kein Extra-Sigma nötig)

      const bdx = gauss(botSig), bdy = gauss(botSig);
      const bRes = scoreHit(bdx, bdy);

      G.botShots.push({
        dx: bdx, dy: bdy, pts: bRes.pts, label: bRes.label, isX: bRes.isX,
        cracks: Array.from({ length: 7 }, (_, i) => ({
          a: (i / 7) * Math.PI * 2 + Math.random() * 0.7,
          len: 1.4 + Math.random()
        }))
      });
      // Akkumuliere als Integer-Zehntel (×10) um Fließkomma-Drift zu vermeiden
      // KK 3x20: nur ganze Ringe – Zehntel werden verworfen
      if (G.is3x20 && G.weapon === 'kk') {
        const wholeRing = Math.floor(bRes.pts);
        G._botTotalTenths = (G._botTotalTenths || 0) + wholeRing * 10;
        G.botTotal = G._botTotalTenths / 10; // bleibt ganzzahlig
      } else {
        G._botTotalTenths = (G._botTotalTenths || 0) + Math.round(bRes.pts * 10);
        G.botTotal = G._botTotalTenths / 10;
      }
      // Ganze Ringe (jeder Schuss wird einzeln als Ganzer abgerundet und addiert)
      // Nur für nicht-3x20 global akkumulieren; 3x20 macht das in botAutoFire() pro Position
      if (!G.is3x20) {
        G.botTotalInt += Math.floor(bRes.pts);
      }
      G.shotsLeft--;
      
      // NEU: Haptisches Feedback beim Schuss
      if (typeof MobileFeatures !== 'undefined') {
        MobileFeatures.hapticShot();
        
        // Spezifisches Feedback basierend auf Trefferqualität
        if (bRes.pts >= 10) {
          MobileFeatures.hapticHit();
        } else if (bRes.pts <= 5) {
          MobileFeatures.hapticMiss();
        }
      }
      
      return { ...bRes, dx: bdx, dy: bdy };
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
      if (G.shotsLeft <= 0) return;
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

      const count = G.burst ? Math.min(5, G.shotsLeft) : 1;
      const results = [];
      for (let i = 0; i < count; i++) {
        const res = fireSingleShot();
        if (res) results.push(res); // Nur gültige Shots sammeln
      }

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

      // ── Add pills to log ────────────────────────
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
            pill.textContent = '👤' + pillTxt;
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
          // 3×20: botTotalInt (Summe ganze Ringe) hier und in botAutoFire; fireSingleShot inkrementiert bei 3×20 kein botTotalInt
          G.botTotalInt += Math.floor(bRes.pts);

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
          DOM.shotLogWrap.scrollTop = DOM.shotLogWrap.scrollHeight;
        } else {
          // Flat log: show last 10
          if (DOM.shotLog) {
            const pill = document.createElement('span');
            pill.className = 'sl-pill ' + pillCls;
            pill.textContent = pillTxt;
            DOM.shotLog.appendChild(pill);
            while (DOM.shotLog.children.length > 10) DOM.shotLog.removeChild(DOM.shotLog.firstChild);
          }
        }
      });

      // Spieler-Schüsse für Analytics speichern
      results.forEach(bRes => {
        G.playerShots.push({
          dx: bRes.dx ?? 0,
          dy: bRes.dy ?? 0,
          pts: bRes.pts
        });
      });

      // ── Info text ────────────────────────────────
      const mkBotScore = () => isKK3x20WholeRingsOnly()
        ? `${G.botTotalInt}`
        : `${fmtPts(G.botTotal)} <span style="color:rgba(240,130,110,.45);font-size:.85em;">(${G.botTotalInt} ganze)</span>`;

      if (count > 1) {
        const sumPts = results.reduce((a, r) => a + r.pts, 0);
        const xCount = results.filter(r => r.isX).length;
        const xStr = xCount > 0 ? ` · ${xCount}× ✦X` : '';
        const sumDisp = isKK3x20WholeRingsOnly() ? Math.floor(sumPts) : fmtPts(Math.round(sumPts * 10) / 10);
        if (!G.is3x20) DOM.lastShotTxt.innerHTML =
          `⚡ <b>5er-Salve</b>: +<b>${sumDisp}</b>${xStr} &nbsp;|&nbsp; Gesamt: <b>${mkBotScore()}</b>`;
      } else {
        const bRes = results[0];
        const ptsDisp = isKK3x20WholeRingsOnly() ? Math.floor(bRes.pts) : fmtPts(bRes.pts);
        const emoji = bRes.isX ? '✦' : bRes.pts >= 9.5 ? '🔥' : bRes.pts >= 8 ? '💥' : bRes.pts >= 6 ? '🎯' : bRes.pts >= 4 ? '👌' : bRes.pts >= 2 ? '😬' : '😅';
        const scoreDisp = bRes.isX
          ? `<b style="color:#ffd040;">${bRes.label} · ${ptsDisp}</b>`
          : `<b>${bRes.label} · ${ptsDisp}</b>`;
        if (!G.is3x20 || G.posShots < G.perPos)
          DOM.lastShotTxt.innerHTML =
            `${emoji} ${scoreDisp} &nbsp;|&nbsp; Gesamt: <b>${mkBotScore()}</b>`;
      }

      setTimeout(() => {
        drawTarget(G.botShots);
        updateBattleUI();
        if (G.shotsLeft <= 0) {
          clearBattleTimers();
          if (G.burst) DOM.battleBurstBtn.disabled = true;
          else DOM.battleFireBtn.disabled = true;
          DOM.battleTag.textContent = `◆ ${G.maxShots} SCHUSS ABGEFEUERT ◆`;
          if (G.is3x20) {
            updatePosBar();
            DOM.lastShotTxt.innerHTML = `🏁 Alle Positionen abgeschlossen! Bot-Gesamt: <b>${G.botTotalInt} Pkt</b>`;
          } else {
            DOM.lastShotTxt.innerHTML = `🏁 Bot fertig! Gesamt: <b>${isKK3x20WholeRingsOnly() ? G.botTotalInt : fmtPts(G.botTotal)} Punkte</b> aus ${G.maxShots} Schuss.`;
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

    function calcResult() {
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
        showGameOver(valInt, G.botTotalInt, null, valInt);
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
        showGameOver(finalVal, G.botTotal, null, valInt);
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

    function showGameOver(pp, bp, reason, ppInt) {
      G.gameDuration = G._gameStartTime > 0
        ? Math.round((Date.now() - G._gameStartTime) / 1000)
        : 0;
      const kk3x20 = isKK3x20WholeRingsOnly();
      DOM.goP.textContent = pp >= 0 ? (kk3x20 ? Math.floor(pp) : fmtPts(pp)) : '–';
      DOM.goB.textContent = kk3x20 ? G.botTotalInt : fmtPts(bp);
      DOM.goPInt.textContent = ppInt != null ? ppInt : (pp >= 0 ? Math.floor(pp) : '–');
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
      const ppCmp = useInt ? (ppInt != null ? ppInt : Math.floor(pp)) : pp;
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
      }

      // Update UI in case user views result details
      updateSchuetzenpass();

      if (DOM.analysisResult) DOM.analysisResult.innerHTML = '';
      const totalDuels = getTotalDuels();
      
      // Sicherstellen, dass Feedback-Plan initialisiert ist
      ensureFeedbackSchedule();

      // Share-Daten für den Teilen-Button speichern
      const diffNames = { easy: 'Einfach-Bot', real: 'Mittel-Bot',
                          hard: 'Elite-Bot', elite: 'Profi-Bot' };
      _lastShareData = {
        kk3x20,
        emoji:       DOM.goEmoji.textContent,
        title:       DOM.goTitle.textContent,
        resultClass: gameResult,
        playerPts:   kk3x20
                       ? String(ppInt != null ? ppInt : Math.floor(pp))
                       : fmtPts(pp),
        botPts:      kk3x20
                       ? String(G.botTotalInt)
                       : fmtPts(bp),
        margin:      DOM.goMargin.textContent,
        diffLabel:   diffNames[G.diff] || G.diff,
        meta:        `${DISC[G.discipline]?.name || G.discipline} · ${G.dist}m · ${G.maxShots} Schuss`,
      };

      // Zuerst screenOver anzeigen, dann dynamisch zur Umfrage wechseln, falls nötig
      showScreen('screenOver');
      
      if (shouldShowFeedback(totalDuels)) {
        setTimeout(() => showFeedbackScreen(totalDuels), 800);
      }
    }

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
      document.getElementById('scResultEmoji').textContent  = d.emoji;
      document.getElementById('scResultTitle').textContent  = d.title;
      document.getElementById('scResultTitle').className    = 'sc-result-title ' + d.resultClass;
      document.getElementById('scPlayerPts').textContent    = d.playerPts;
      document.getElementById('scPlayerUnit').textContent   = kk3x20 ? 'Ringe' : 'Zehntel';
      document.getElementById('scBotPts').textContent       = d.botPts;
      document.getElementById('scBotUnit').textContent      = kk3x20 ? 'Ringe' : 'Zehntel';
      document.getElementById('scBotLabel').textContent     = '🤖 ' + d.diffLabel;
      document.getElementById('scMargin').textContent       = d.margin;
      document.getElementById('scMeta').textContent         = d.meta;

      // Web Share API verfügbar?
      const hasShare = !!navigator.share;
      document.getElementById('shareGoBtn').textContent     = hasShare
        ? '📤 \u00a0Jetzt teilen'
        : '📋 \u00a0Link kopieren';
      document.getElementById('shareCopyRow').style.display = hasShare ? 'none' : 'flex';

      document.getElementById('shareOverlay').classList.add('active');
      document.body.style.overflow = 'hidden';
    }

    function closeShareCard(e) {
      if (e && e.target !== document.getElementById('shareOverlay')) return;
      document.getElementById('shareOverlay').classList.remove('active');
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
          } catch (_) {}
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
      localStorage.clear();
      localStorage.setItem('sd_reset_v3', 'true');
      if (backupName) localStorage.setItem('sd_username', backupName);

      // Reload everything
      loadXP();
      G.botShots = []; G.botTotal = 0; G.botTotalInt = 0; G._botTotalTenths = 0;
      loadAllStreaks();
      updateSchuetzenpass();
      checkSunAchievements();

      alert("Alle lokalen Daten wurden zurückgesetzt.");
      location.reload(); // Am sichersten für einen kompletten Reset
    }

    function restartGame() {
      clearBattleTimers();
      G.botShots = []; G.botTotal = 0; G.botTotalInt = 0; G._botTotalTenths = 0;
      G.shotsLeft = G.shots; G.maxShots = G.shots;
      G.dnf = false;
      // BUG-FIX: Spiel-Zustand komplett zurücksetzen
      G.probeActive = false;
      G.probeSecsLeft = 0;
      G.botStarted = false;
      G.transitionSecsLeft = 0;
      G.transitionLabel = '';
      G.is3x20 = false;
      G.posIdx = 0; G.posShots = 0; G.posResults = [];
      G.positions = []; G.posIcons = [];

      G.diff = 'easy';
      document.querySelectorAll('#diffGroup .dif').forEach(b => b.classList.remove('active'));
      document.querySelector('[data-diff="easy"]').classList.add('active');
      DOM.diffInfoTxt.innerHTML = getDiffInfo('easy');

      setSz(); drawTarget([]);
      showScreen('screenSetup');
    }

    function showScreen(id) {
      document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
      document.getElementById(id).classList.add('active');
    }

    /* ─── INIT ───────────────────────────────── */
    initDOMCache();
    setSz();
    drawTarget([]);
    loadXP();
    updateSchuetzenpass();
    if (typeof DailyChallenge !== 'undefined') DailyChallenge.init();

    // Firebase Init: nur über _tryInitFb() am Ende der Datei
    checkSunAchievements(); // Check on load in case new achievements unlocked

    // NEU: Fallback-System zuerst initialisieren
    if (typeof FeatureFallback !== 'undefined') {
      FeatureFallback.init();
      console.log('🛡️ Feature Fallback System geladen');
    }
    
    // NEU: Neue Features initialisieren (mit Fallback-Schutz)
    if (typeof AdaptiveBotSystem !== 'undefined') {
      try {
        AdaptiveBotSystem.init();
        console.log('🤖 Adaptive Bot System geladen');
      } catch (error) {
        console.error('❌ Adaptive Bot System Fehler:', error);
        if (typeof FeatureFallback !== 'undefined') {
          FeatureFallback.safelyExecute('adaptiveBot', () => {}, () => {});
        }
      }
    }
    
    if (typeof ContextualOCR !== 'undefined') {
      try {
        ContextualOCR.init();
        console.log('🔍 Contextual OCR System geladen');
      } catch (error) {
        console.error('❌ Contextual OCR Fehler:', error);
        if (typeof FeatureFallback !== 'undefined') {
          FeatureFallback.safelyExecute('contextualOCR', () => {}, () => {});
        }
      }
    }
    
    if (typeof MultiScoreDetection !== 'undefined') {
      try {
        MultiScoreDetection.init();
        console.log('📊 Multi-Score Detection System geladen');
      } catch (error) {
        console.error('❌ Multi-Score Detection Fehler:', error);
        if (typeof FeatureFallback !== 'undefined') {
          FeatureFallback.safelyExecute('multiScoreDetection', () => {}, () => {});
        }
      }
    }

    // Check Welcome screen on init
    function checkFirstVisit() {
      const savedName = localStorage.getItem('sd_username');
      if (!savedName) {
        document.getElementById('welcomeOverlay').classList.add('active');
        setTimeout(() => document.getElementById('welcomeNameInp')?.focus(), 400);
      } else {
        G.username = savedName;
        // Bekannter User: Profil im Hintergrund synchronisieren
        setTimeout(() => pushProfileToFirebase(), 1500);
      }
    }

    window.addEventListener('difficultyAdapted', function(event) {
      console.log('🎯 Schwierigkeit angepasst:', event.detail.oldDifficulty, '→', event.detail.newDifficulty);
      // Optional: UI aktualisieren
      if (DOM.diffInfoTxt) {
        DOM.diffInfoTxt.innerHTML = getDiffInfo(event.detail.newDifficulty);
      }
    });

    function saveWelcomeName() {
      const inp = document.getElementById('welcomeNameInp');
      let name = inp.value.trim();
      if (!name) name = 'Anonym';
      name = name.substring(0, 15).replace(/[.#$\[\]]/g, '_');

      localStorage.setItem('sd_username', name);
      G.username = name;

      // Update profile sheet name
      const psName = document.getElementById('psUsername');
      if (psName) psName.textContent = name;

      document.getElementById('welcomeOverlay').classList.remove('active');

      // Sofort in Firebase registrieren (Erstanmeldung)
      pushProfileToFirebase();
      // Tutorial für neue Nutzer starten
      if (typeof Tutorial !== 'undefined') Tutorial.startIfNew();
    }

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

    checkFirstVisit();

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

    let _rzTimer = null;
    window.addEventListener('resize', () => {
      if (_rzTimer) cancelAnimationFrame(_rzTimer);
      _rzTimer = requestAnimationFrame(() => {
        const prevSz = _lastSz;
        setSz();
        // Only redraw if canvas size actually changed
        if (_lastSz !== prevSz) drawTarget(G.botShots);
      });
    }, { passive: true });

    // Swipe-down to close profile sheet
    (function () {
      let startY = 0;
      const sheet = document.getElementById('profileSheet');
      if (!sheet) return;
      sheet.addEventListener('touchstart', e => { startY = e.touches[0].clientY; }, { passive: true });
      sheet.addEventListener('touchend', e => {
        const dy = e.changedTouches[0].clientY - startY;
        if (dy > 80) toggleProfileMenu();
      }, { passive: true });
    })();

    // ── Service Worker (PWA / Offline) ──────────────────────────────────
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js?v=2.6').catch(() => { });
      });
    }


