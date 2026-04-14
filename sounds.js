// ─── sounds.js ───────────────────────────────────────────────────────────────
// Synthetische Sounds für Schussduell via Web Audio API.
// Kein externes Audio-File nötig — alles wird on-the-fly generiert.
// Sounds sind standardmäßig AN. User kann mit Sounds.toggle() umschalten.
// Einstellung wird in localStorage unter 'sd_sound' gespeichert.

const Sounds = (() => {
  let _ctx = null;
  let _enabled = (typeof StorageManager !== 'undefined' ? StorageManager.getRaw('sound', '1') : localStorage.getItem('sd_sound')) !== '0';

  function ctx() {
    if (!_ctx) {
      try { _ctx = new (window.AudioContext || window.webkitAudioContext)(); }
      catch (e) { return null; }
    }
    // Resume falls durch Browser-Policy suspended
    if (_ctx.state === 'suspended') _ctx.resume();
    return _ctx;
  }

  // Hilfsfunktion: Envelope (Attack/Decay/Sustain/Release)
  function envelope(gainNode, ac, { attack = 0.005, decay = 0.1, sustain = 0.3, release = 0.2, peak = 1 } = {}) {
    const now = ac.currentTime;
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(peak, now + attack);
    gainNode.gain.linearRampToValueAtTime(sustain * peak, now + attack + decay);
    gainNode.gain.setValueAtTime(sustain * peak, now + attack + decay);
    gainNode.gain.linearRampToValueAtTime(0, now + attack + decay + release);
    return now + attack + decay + release;
  }

  function playTone({ freq = 440, type = 'sine', duration = 0.2, volume = 0.3,
                       attack = 0.005, decay = 0.05, sustain = 0.4, release = 0.15,
                       freqEnd = null, detune = 0 } = {}) {
    const ac = ctx();
    if (!ac || !_enabled) return;

    const osc  = ac.createOscillator();
    const gain = ac.createGain();
    osc.connect(gain);
    gain.connect(ac.destination);

    osc.type = type;
    osc.frequency.setValueAtTime(freq, ac.currentTime);
    if (detune) osc.detune.setValueAtTime(detune, ac.currentTime);
    if (freqEnd !== null) {
      osc.frequency.linearRampToValueAtTime(freqEnd, ac.currentTime + duration);
    }

    const end = envelope(gain, ac, { attack, decay, sustain, release, peak: volume });
    osc.start(ac.currentTime);
    osc.stop(ac.currentTime + end + 0.05);
  }

  function playNoise({ duration = 0.08, volume = 0.15, filterFreq = 800 } = {}) {
    const ac = ctx();
    if (!ac || !_enabled) return;

    const bufSize = ac.sampleRate * duration;
    const buf     = ac.createBuffer(1, bufSize, ac.sampleRate);
    const data    = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;

    const src    = ac.createBufferSource();
    const filter = ac.createBiquadFilter();
    const gain   = ac.createGain();

    src.buffer = buf;
    filter.type = 'bandpass';
    filter.frequency.value = filterFreq;
    filter.Q.value = 0.8;

    src.connect(filter);
    filter.connect(gain);
    gain.connect(ac.destination);

    gain.gain.setValueAtTime(volume, ac.currentTime);
    gain.gain.linearRampToValueAtTime(0, ac.currentTime + duration);
    src.start(ac.currentTime);
  }

  return {
    // ── Öffentliche API ──────────────────────────────────────────────────

    get enabled() { return _enabled; },

    toggle() {
      _enabled = !_enabled;
      localStorage.setItem('sd_sound', _enabled ? '1' : '0');
      return _enabled;
    },

    setEnabled(v) {
      _enabled = !!v;
      localStorage.setItem('sd_sound', _enabled ? '1' : '0');
    },

    // Schuss — kurzer Knall + Rauschen
    shot() {
      playNoise({ duration: 0.06, volume: 0.25, filterFreq: 1200 });
      playTone({ freq: 180, freqEnd: 80, type: 'sawtooth', duration: 0.08,
                 volume: 0.18, attack: 0.002, decay: 0.04, sustain: 0.1, release: 0.06 });
    },

    // X-Ring / 10er Treffer — heller Ping
    bullseye() {
      playTone({ freq: 880, freqEnd: 1100, type: 'sine', duration: 0.18,
                 volume: 0.22, attack: 0.003, decay: 0.06, sustain: 0.3, release: 0.12 });
      setTimeout(() => playTone({ freq: 1320, type: 'sine', duration: 0.12,
                                   volume: 0.12, attack: 0.002, decay: 0.04, sustain: 0.2, release: 0.1 }), 80);
    },

    // Normaler Treffer (7–9) — neutraler Klick
    hit() {
      playTone({ freq: 520, freqEnd: 420, type: 'triangle', duration: 0.1,
                 volume: 0.15, attack: 0.003, decay: 0.05, sustain: 0.2, release: 0.08 });
    },

    // Schlechter Treffer (1–6) — dumpfer Ton
    lowHit() {
      playTone({ freq: 220, freqEnd: 160, type: 'triangle', duration: 0.12,
                 volume: 0.12, attack: 0.004, decay: 0.06, sustain: 0.15, release: 0.1 });
    },

    // Sieg — aufsteigender Dreiklang
    win() {
      const notes = [523, 659, 784, 1047]; // C5 E5 G5 C6
      notes.forEach((freq, i) => {
        setTimeout(() => playTone({ freq, type: 'sine', duration: 0.2,
                                     volume: 0.2, attack: 0.01, decay: 0.05, sustain: 0.5, release: 0.15 }), i * 110);
      });
    },

    // Niederlage — absteigender Ton
    lose() {
      playTone({ freq: 440, freqEnd: 220, type: 'sawtooth', duration: 0.5,
                 volume: 0.18, attack: 0.01, decay: 0.1, sustain: 0.4, release: 0.3 });
    },

    // Unentschieden — neutraler Doppelton
    draw() {
      playTone({ freq: 440, type: 'sine', duration: 0.15, volume: 0.15,
                 attack: 0.01, decay: 0.05, sustain: 0.3, release: 0.12 });
      setTimeout(() => playTone({ freq: 440, type: 'sine', duration: 0.15, volume: 0.15,
                                   attack: 0.01, decay: 0.05, sustain: 0.3, release: 0.12 }), 200);
    },

    // XP erhalten — kurzer positiver Pling
    xp() {
      playTone({ freq: 660, freqEnd: 880, type: 'sine', duration: 0.15,
                 volume: 0.14, attack: 0.005, decay: 0.04, sustain: 0.3, release: 0.1 });
    },

    // Achievement freigeschaltet — besonderer Fanfare-Effekt
    achievement() {
      [523, 659, 784].forEach((freq, i) => {
        setTimeout(() => playTone({ freq, type: 'sine', duration: 0.18,
                                     volume: 0.18, attack: 0.005, decay: 0.04, sustain: 0.4, release: 0.14 }), i * 80);
      });
      setTimeout(() => playTone({ freq: 1047, type: 'sine', duration: 0.35,
                                   volume: 0.22, attack: 0.01, decay: 0.08, sustain: 0.5, release: 0.25 }), 280);
    },

    // Level-Up — große Fanfare (Duolingo-Style)
    levelUp() {
      const notes = [523, 659, 784, 1047, 1318, 1567]; // C5 E5 G5 C6 E6 G6
      notes.forEach((freq, i) => {
        setTimeout(() => playTone({ freq, type: 'sine', duration: 0.3,
                                     volume: 0.25, attack: 0.01, decay: 0.08, sustain: 0.6, release: 0.2 }), i * 120);
      });
      // Bass-Fundament
      playTone({ freq: 130, type: 'sawtooth', duration: 1.0, volume: 0.15, attack: 0.1, decay: 0.3, sustain: 0.5, release: 0.4 });
    },

    // Kiste öffnen — erst Schütteln (Rauschen), dann Gold-Plings
    chestOpen() {
      // Goldmünzen
      [880, 1320, 1760, 2640].forEach((freq, i) => {
        setTimeout(() => playTone({ freq, type: 'sine', duration: 0.25,
                                     volume: 0.18, attack: 0.005, decay: 0.04, sustain: 0.3, release: 0.15 }), 100 + i * 90);
      });
    },

    // Kiste schütteln — kurzes Rauschen
    chestShake() {
      playNoise({ duration: 0.15, volume: 0.12, filterFreq: 600 });
    },

    // Positions-Wechsel 3×20 — neutraler Übergangs-Ton
    positionChange() {
      playTone({ freq: 392, freqEnd: 523, type: 'sine', duration: 0.2,
                 volume: 0.16, attack: 0.01, decay: 0.06, sustain: 0.3, release: 0.15 });
    },

    // Timer-Warnung — dringlicher Piepton
    timerWarning() {
      playTone({ freq: 880, type: 'square', duration: 0.08,
                 volume: 0.12, attack: 0.002, decay: 0.02, sustain: 0.3, release: 0.06 });
    },

    // Eingabefehler — dissonanter Ton
    inputError() {
      playTone({ freq: 200, freqEnd: 150, type: 'sawtooth', duration: 0.12,
                 volume: 0.1, attack: 0.003, decay: 0.04, sustain: 0.2, release: 0.08 });
    },

    // UI-Klick — minimaler Feedback-Ton
    click() {
      playTone({ freq: 600, type: 'sine', duration: 0.06,
                 volume: 0.08, attack: 0.002, decay: 0.02, sustain: 0.1, release: 0.04 });
    },

    // Bot-Schuss (leiser als Spieler-Schuss)
    botShot() {
      playNoise({ duration: 0.04, volume: 0.08, filterFreq: 900 });
    }
  };
})();
