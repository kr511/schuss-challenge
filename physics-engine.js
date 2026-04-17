// ================================================
// SCHUSS CHALLENGE – SHOOTING PHYSICS ENGINE v2.0
// Physiologische Simulation eines Elite-Schützen
// ================================================
// EN: Core simulation class for hyper-realistic human shooter physiology.
// DE: Kern-Simulationsklasse für ultra-realistische Schützen-Physiologie.
// ================================================

const ShootingPhysicsEngine = (function () {
  'use strict';

  // ═══════════════════════════════════════════════
  // KONFIGURATION / CONFIGURATION
  // ═══════════════════════════════════════════════

  /** Atemzyklus-Parameter / Breathing cycle parameters */
  const BREATHING = {
    inhaleTime: 2.0,        // Einatmen in Sekunden / Inhale duration (s)
    exhaleTime: 4.0,        // Ausatmen in Sekunden / Exhale duration (s)
    pauseMin: 0.3,          // Minimale natürliche Pause / Min natural pause (s)
    pauseMax: 0.8,          // Maximale natürliche Pause / Max natural pause (s)
    cycleTime: 6.3,         // Gesamtzyklus ~6.3s / Total cycle ~6.3s
    amplitudeY: 1.8,        // Vertikale Auslenkung in mm / Vertical displacement (mm)
    amplitudeX: 0.25        // Horizontale Koppelung / Horizontal coupling ratio
  };

  /** Disziplin-spezifische Ziel-Streuwerte (Mean Radius in mm vom Zentrum) */
  // EN: Discipline-specific target mean radius values (mm from center)
  // Basierend auf echten Weltrekorden und Liga-Durchschnitten
  const DISCIPLINE_PROFILES = {
    air_rifle_10m: {
      // WR ~633.5/654, Zehntel-Wertung, Ring 10 = 0.5mm Radius
      targetSize: 0.5,       // Ring 10 Radius in mm
      ringStep: 2.5,         // Ringbreite in mm
      meanRadii: {
        easy: 4.5,           // Anfänger / Kreisklasse (~9.0 Durchschnitt)
        real: 2.2,           // Vereinsschütze / Bezirksliga (~9.9 Durchschnitt)
        hard: 1.2,           // Bundesniveau (~10.3 Durchschnitt)
        elite: 0.7,          // Internationales Niveau (~10.5 Durchschnitt)
        worldrecord: 0.35    // Weltrekord (~10.7+ Durchschnitt)
      }
    },
    // App-Disziplinen separat kalibriert, damit die Bot-Stärke zu den
    // Schwierigkeitstexten im UI passt.
    lg40: {
      targetSize: 0.5,
      ringStep: 2.5,
      meanRadii: {
        easy: 0.75,
        real: 0.56,
        hard: 0.40,
        elite: 0.24,
        worldrecord: 0.16
      }
    },
    lg60: {
      targetSize: 0.5,
      ringStep: 2.5,
      meanRadii: {
        easy: 0.53,
        real: 0.40,
        hard: 0.29,
        elite: 0.22,
        worldrecord: 0.15
      }
    },
    smallbore_50m: {
      targetSize: 5.0,
      ringStep: 8.0,
      meanRadii: {
        easy: 22.0,
        real: 11.0,
        hard: 5.5,
        elite: 3.2,
        worldrecord: 1.8
      }
    },
    kk50: {
      targetSize: 5.0,
      ringStep: 8.0,
      meanRadii: {
        easy: 5.40,
        real: 4.50,
        hard: 3.78,
        elite: 2.88,
        worldrecord: 2.20
      }
    },
    kk100: {
      targetSize: 5.0,
      ringStep: 8.0,
      meanRadii: {
        easy: 5.40,
        real: 4.50,
        hard: 3.78,
        elite: 2.88,
        worldrecord: 2.20
      }
    },
    kk3x20: {
      targetSize: 5.0,
      ringStep: 8.0,
      meanRadii: {
        easy: 6.95,
        real: 5.83,
        hard: 4.90,
        elite: 3.94,
        worldrecord: 3.20
      }
    },
    air_pistol_10m: {
      targetSize: 5.75,
      ringStep: 8.0,
      meanRadii: {
        easy: 28.0,
        real: 14.0,
        hard: 7.5,
        elite: 4.5,
        worldrecord: 2.5
      }
    },
    dry_fire: {
      targetSize: 0.5,
      ringStep: 2.5,
      meanRadii: {
        easy: 3.5,
        real: 1.8,
        hard: 0.9,
        elite: 0.5,
        worldrecord: 0.25
      }
    }
  };

  // ═══════════════════════════════════════════════
  // PERLIN NOISE IMPLEMENTATION (1D)
  // Für organische, nicht-repetitive Bewegungsmuster
  // EN: For organic, non-repetitive movement patterns
  // ═══════════════════════════════════════════════

  // Permutation table für Perlin Noise
  const _perm = new Uint8Array(512);
  (function initPerm() {
    const p = [];
    for (let i = 0; i < 256; i++) p[i] = i;
    // Fisher-Yates Shuffle
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [p[i], p[j]] = [p[j], p[i]];
    }
    for (let i = 0; i < 512; i++) _perm[i] = p[i & 255];
  })();

  /**
   * 1D Perlin-ähnliches Rauschen
   * EN: 1D Perlin-like noise function
   * @param {number} x - Eingabewert / Input value
   * @returns {number} Wert zwischen ~-1 und ~1
   */
  function perlinNoise1D(x) {
    const xi = Math.floor(x) & 255;
    const xf = x - Math.floor(x);
    const u = xf * xf * (3 - 2 * xf); // Smoothstep / Glättung
    const a = _perm[xi];
    const b = _perm[xi + 1];
    const gradA = (a & 1) === 0 ? xf : -xf;
    const gradB = (b & 1) === 0 ? (xf - 1) : -(xf - 1);
    return gradA * (1 - u) + gradB * u;
  }

  // ═══════════════════════════════════════════════
  // BOX-MULLER GAUSSIAN RANDOM
  // Normalverteiltes Zufallsrauschen
  // ═══════════════════════════════════════════════

  /**
   * Erzeugt normalverteilte Zufallszahl (Mittelwert 0, Standardabweichung 1)
   * EN: Generates normally distributed random number (mean=0, std=1)
   */
  function gaussianRandom() {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  }

  // ═══════════════════════════════════════════════
  // ENGINE CLASS
  // ═══════════════════════════════════════════════

  /**
   * Erstellt eine neue Physik-Engine-Instanz
   * EN: Creates a new physics engine instance
   */
  function createEngine() {
    // Zustandsvariablen / State variables
    let _heartRate = 62;     // Ruhepuls eines Sportschützen / Athlete resting HR (BPM)
    let _stress = 0;         // 0–100
    let _fatigue = 0;        // 0–100
    let _eyeDriftX = (Math.random() - 0.5) * 0.15; // Leichter Augen-Dominanz-Drift / Eye dominance drift

    // Perlin-Noise-Offsets (pro Instanz einzigartig)
    // EN: Unique per-instance Perlin offsets for organic variation
    const _noiseOffsetX = Math.random() * 1000;
    const _noiseOffsetY = Math.random() * 1000;

    // ─── Öffentliche Methoden / Public methods ───

    /**
     * Setzt den physiologischen Zustand (Stress + Müdigkeit)
     * EN: Sets physiological state (stress + fatigue)
     * @param {number} stress - Stresslevel 0–100
     * @param {number} fatigue - Müdigkeit 0–100
     */
    function setPhysiologicalState(stress, fatigue) {
      _stress = Math.max(0, Math.min(100, stress));
      _fatigue = Math.max(0, Math.min(100, fatigue));
      // Puls steigt mit Stress und Müdigkeit
      // EN: Heart rate rises with stress and fatigue
      _heartRate = 62 + (_stress * 0.8) + (_fatigue * 0.3);
    }

    /**
     * Berechnet den aktuellen Haltepunkt (Wobble) zu einem bestimmten Zeitpunkt.
     * Kombiniert Atmung, Herzschlag, Muskelzittern und Perlin-Noise.
     *
     * EN: Calculates the current aim point (wobble) at a specific elapsed time.
     * Combines breathing, heartbeat, muscle tremor, and Perlin noise.
     *
     * @param {number} timeMs - Vergangene Zeit in ms / Elapsed time in ms
     * @returns {{ x: number, y: number, breathPhase: string, activeBreathing: boolean }}
     */
    function getCurrentAimPoint(timeMs) {
      const t = timeMs / 1000;

      // ─── 1. ATMUNG / BREATHING ─────────────────────────
      // Atemzyklus: ~6.3s (2s ein, 4s aus, ~0.3–0.8 Pause)
      // Hauptsächlich vertikale Bewegung (Y-Achse)
      // EN: Mostly vertical movement, slight horizontal coupling
      const breathFreq = (Math.PI * 2) / BREATHING.cycleTime;
      const breathAmpY = BREATHING.amplitudeY * (1 + _fatigue * 0.015);
      const breathPhaseRaw = Math.sin(t * breathFreq);

      // Atemphase bestimmen / Determine breath phase
      let breathPhase = 'exhale';
      const cyclePos = (t % BREATHING.cycleTime) / BREATHING.cycleTime;
      if (cyclePos < 0.32) breathPhase = 'inhale';
      else if (cyclePos < 0.82) breathPhase = 'exhale';
      else breathPhase = 'pause'; // Natürliche Atempause / Natural respiratory pause

      // In der Pause: minimale Atembewegung (idealer Schussmoment)
      // EN: During pause: minimal breathing movement (ideal shot moment)
      const pauseMultiplier = breathPhase === 'pause' ? 0.15 : 1.0;
      const breathingY = breathPhaseRaw * breathAmpY * pauseMultiplier;
      const breathingX = Math.cos(t * breathFreq * 0.5) * (breathAmpY * BREATHING.amplitudeX) * pauseMultiplier;

      // ─── 2. HERZSCHLAG / HEARTBEAT (HRV) ───────────────
      // Kurze, scharfe Pulse statt glatter Sinuswelle
      // EN: Short, sharp pulses instead of smooth sine waves
      const beatFreq = (_heartRate / 60) * (Math.PI * 2);
      const beatAmp = 0.12 + (_stress * 0.006);
      const beatPhase = Math.sin(t * beatFreq);
      // Nur der "Spitzenwert" des Herzschlags erzeugt einen Kick
      // EN: Only the peak of the heartbeat creates a kick
      const heartPulse = beatPhase > 0.85 ? beatAmp * (1 + _stress * 0.01) : 0;
      // HRV: leichte Variation der Schlagfrequenz (realistische Unregelmäßigkeit)
      // EN: HRV: slight beat frequency variation (realistic irregularity)
      const hrvVariation = perlinNoise1D(t * 0.3) * 0.03 * beatAmp;

      // ─── 3. MUSKELZITTERN / MICRO-TREMOR ───────────────
      // Hochfrequente, niedrigamplitude Schwingungen (8–15 Hz)
      // EN: High-frequency, low-amplitude oscillations (8–15 Hz)
      const wobbleAmp = 0.25 + (_fatigue * 0.012) + (_stress * 0.004);
      const wobbleX = Math.sin(t * 14.7) * Math.cos(t * 7.3) * wobbleAmp
        + Math.sin(t * 21.3) * 0.08 * wobbleAmp; // Obertöne / Harmonics
      const wobbleY = Math.cos(t * 13.1) * Math.sin(t * 8.9) * wobbleAmp
        + Math.cos(t * 19.7) * 0.08 * wobbleAmp;

      // ─── 4. PERLIN-NOISE (organischer Drift) ──────────
      // Langsame, organische Wanderbewegung des gesamten Haltebereichs
      // EN: Slow, organic drift of the entire hold area
      const driftAmp = 0.35 + (_fatigue * 0.008);
      const driftX = perlinNoise1D(t * 0.25 + _noiseOffsetX) * driftAmp;
      const driftY = perlinNoise1D(t * 0.25 + _noiseOffsetY) * driftAmp;

      // ─── 5. AUGEN-DOMINANZ-DRIFT / EYE DOMINANCE ──────
      const eyeDrift = _eyeDriftX * (1 + _fatigue * 0.01);

      // ─── KOMBINATION / COMBINATION ─────────────────────
      const x = breathingX + wobbleX + (heartPulse * 0.25) + driftX + eyeDrift + hrvVariation;
      const y = breathingY + wobbleY + heartPulse + driftY + hrvVariation;
      const activeBreathing = breathPhase !== 'pause' && Math.abs(breathPhaseRaw) > 0.3;

      return { x, y, breathPhase, activeBreathing };
    }

    /**
     * Simuliert den exakten Moment der Schussauslösung.
     * Berechnet finalen Auftreffpunkt unter Berücksichtigung aller physiologischen Faktoren.
     *
     * EN: Simulates the exact moment of trigger break.
     * Calculates final impact point considering all physiological factors.
     *
     * @param {number} aimDurationMs - Haltedauer in ms / Aim duration in ms
     * @param {string} discipline - Disziplin-Key (z.B. 'air_rifle_10m')
     * @param {number} targetMeanRadius - Erwartete Streuung in mm
     * @returns {{ x: number, y: number, dominantError: string }}
     */
    function simulateShot(aimDurationMs, discipline, targetMeanRadius) {
      const holdPos = getCurrentAimPoint(aimDurationMs);

      // Kompensationsfaktor: Je besser der Schütze, desto besser gleicht er
      // die Physiologie aus → kleinerer Multiplikator auf die Haltebewegung
      // EN: Compensation factor: Better shooters compensate physiology better
      const compensationFactor = targetMeanRadius / 2.2;

      let finalX = holdPos.x * compensationFactor;
      let finalY = holdPos.y * compensationFactor;

      // ─── TRIGGER PULL MECHANICS / ABZUGSTECHNIK ────────
      // Abzugsfehler-Wahrscheinlichkeit steigt mit Stress, Müdigkeit
      // und wenn der Schütze während der aktiven Atemphase abzieht
      // EN: Trigger error probability increases with stress, fatigue,
      // and when shooter breaks shot during active breathing
      let triggerJerkProbability = (_stress * 0.004) + (_fatigue * 0.003);
      if (holdPos.activeBreathing) {
        triggerJerkProbability += 0.25; // Schießen während Atmung = schlecht
      }

      let triggerErrorX = 0;
      let triggerErrorY = 0;
      let dominantError = 'wobble'; // Standard: natürliches Haltezittern

      if (Math.random() < triggerJerkProbability) {
        // TRIGGER JERK: Reißen am Abzug
        // Rechtshänder: zieht nach unten-rechts (Gewehr) bzw. unten-links (Pistole)
        // EN: Right-hander pulls low-right (rifle) or low-left (pistol)
        dominantError = holdPos.activeBreathing ? 'breathing' : 'trigger';
        const jerkMagnitude = targetMeanRadius * (1 + Math.random() * 2.5);
        const isPistol = discipline && discipline.includes('pistol');
        triggerErrorX = isPistol ? -jerkMagnitude * 0.7 : jerkMagnitude * 0.5;
        triggerErrorY = -jerkMagnitude; // Nach unten / Low
      } else if (_stress > 55 && Math.random() < 0.35) {
        // STRESS-INDUCED HRV ERROR: Herzschlag-Einfluss
        // Meist vertikale Streuung / EN: Mostly vertical spread
        dominantError = 'hrv';
        const hrvError = targetMeanRadius * 0.6 * gaussianRandom();
        triggerErrorY += hrvError;
      }

      // ─── GAUSSIAN DISPERSION / STREUUNG ────────────────
      // Grundstreuung simuliert die Präzision des Anschlags
      // EN: Base dispersion simulates the precision of the stance/position
      const dispersionX = gaussianRandom() * (targetMeanRadius * 0.4);
      const dispersionY = gaussianRandom() * (targetMeanRadius * 0.4);

      // ─── PERLIN-NOISE FEINSTREUUNG / FINE SPREAD ───────
      // Zusätzliche organische Mikro-Streuung über Perlin-Noise
      // EN: Additional organic micro-dispersion via Perlin noise
      const perlinSpread = targetMeanRadius * 0.08;
      const perlinX = perlinNoise1D(aimDurationMs * 0.001 + _noiseOffsetX * 2) * perlinSpread;
      const perlinY = perlinNoise1D(aimDurationMs * 0.001 + _noiseOffsetY * 2) * perlinSpread;

      return {
        x: finalX + triggerErrorX + dispersionX + perlinX,
        y: finalY + triggerErrorY + dispersionY + perlinY,
        dominantError: dominantError
      };
    }

    /**
     * Gibt den aktuellen Puls zurück / Returns current heart rate
     */
    function getHeartRate() {
      return Math.round(_heartRate);
    }

    // ─── PUBLIC API ─────────────────────────────────────
    return {
      setPhysiologicalState,
      getCurrentAimPoint,
      simulateShot,
      getHeartRate,
      gaussianRandom
    };
  }

  // ═══════════════════════════════════════════════
  // MODULE EXPORT
  // ═══════════════════════════════════════════════

  console.log('🔫 Shooting Physics Engine v2.0 bereit');

  return {
    createEngine,
    DISCIPLINE_PROFILES,
    BREATHING,
    gaussianRandom,
    perlinNoise1D
  };

})();
