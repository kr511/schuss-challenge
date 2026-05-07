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
  // BUGFIX: Wenn der Mute-Button im aktuellen Screen nicht im DOM steht
  // (z. B. weil das Profile-Sheet noch nicht gemountet wurde), warf
  // getElementById('muteBtn').textContent einen TypeError und brach den
  // Klick-Handler ab — Mute-Toggle blieb dadurch ohne Wirkung.
  Sfx.init();
  Sfx.muted = !Sfx.muted;
  const muteBtn = document.getElementById('muteBtn');
  if (muteBtn) muteBtn.textContent = Sfx.muted ? '🔇' : '🔊';
  if (!Sfx.muted) Sfx.play('click');
}
