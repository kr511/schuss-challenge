// ================================================
// SCHUSS CHALLENGE – ULTRA REALISTIC BOT v2.0
// Worlds better than anything else in browser
// ================================================
// EN: Adaptive bot with physiological simulation, mood system,
//     player weakness learning, and virtual crosshair animation.
// DE: Adaptiver Bot mit physiologischer Simulation, Stimmungssystem,
//     Schwächen-Erkennung und virtuellem Fadenkreuz.
// ================================================
// WICHTIG: Behält die komplette alte API (init, trackGame, etc.)
//          und fügt massive neue Funktionen hinzu.
// ================================================

const AdaptiveBotSystem = (function () {
  'use strict';

  // ═══════════════════════════════════════════════
  // KONFIGURATION / CONFIGURATION des Botes
  // ═══════════════════════════════════════════════

  const CONFIG = {
    minGamesForAnalysis: 5,
    adaptationInterval: 5,      // Nach 5 Spielen anpassen / Adapt every 5 games
    maxAdaptationFactor: 0.3,
    storageKey: 'sd_adaptive_data',
    playerHistoryKey: 'schuss_challenge_player_history',
    maxPlayerHistory: 50,       // Letzte 50 Gruppen merken / Remember last 50 groups
    enabled: true
  };

  let _initialized = false;

  // ═══════════════════════════════════════════════
  // STATE / ZUSTANDSDATEN
  // ═══════════════════════════════════════════════

  // Bestehende Adaptive-Daten (Schwierigkeits-Tracking)
  // EN: Existing adaptive data (difficulty tracking)
  let adaptiveData = {
    games: [],
    currentDifficulty: 'easy',
    skillLevel: 'beginner',
    adaptationHistory: [],
    enabled: true
  };

  // NEU: Bot-Physiologie-Zustand / Bot physiology state
  let botState = {
    mood: 'focused',           // 'tired', 'focused', 'nervous', 'in_the_zone'
    stressLevel: 15,           // 0–100
    fatigue: 10,               // 0–100
    currentDifficulty: 'real',
    discipline: 'air_rifle_10m',
    moodTimer: null,           // Automatischer Stimmungswechsel / Auto mood switch
    shotsFiredInSession: 0     // Schüsse in dieser Session / Shots this session
  };

  // Spieler-Schwächen-Historie / Player weakness history
  let playerHistory = [];

  // Physics Engine Instanz (wird bei init erstellt)
  // EN: Physics engine instance (created on init)
  let physicsEngine = null;

  // Virtual Crosshair State
  let _crosshairActive = false;
  let _animationFrameId = null;

  // ═══════════════════════════════════════════════
  // INITIALISIERUNG / INITIALIZATION
  // ═══════════════════════════════════════════════

  /**
   * Initialisiert das adaptive System inkl. Physics Engine
   * EN: Initializes the adaptive system including Physics Engine
   */
  function init() {
    if (_initialized) return;
    _initialized = true;
    loadData();
    loadPlayerHistory();

    // Physics Engine erstellen / Create physics engine
    if (typeof ShootingPhysicsEngine !== 'undefined') {
      physicsEngine = ShootingPhysicsEngine.createEngine();
      physicsEngine.setPhysiologicalState(botState.stressLevel, botState.fatigue);
    } else {
      console.warn('⚠️ ShootingPhysicsEngine nicht geladen – Bot arbeitet im Fallback-Modus');
    }

    // Automatischen Stimmungswechsel starten / Start automatic mood changes
    startMoodCycle();

    console.log('🤖 Adaptive Bot System v2.0 initialisiert (mit Physiologie-Engine)');
  }

  // ═══════════════════════════════════════════════
  // DATENPERSISTENZ / DATA PERSISTENCE
  // ═══════════════════════════════════════════════

  /** Lädt gespeicherte Daten / Loads saved data */
  function loadData() {
    try {
      const saved = localStorage.getItem(CONFIG.storageKey);
      if (saved) {
        adaptiveData = JSON.parse(saved);
        console.log('💾 Adaptive Daten geladen:', adaptiveData.games.length, 'Spiele');
      }
    } catch (e) {
      console.warn('⚠️ Konnte adaptive Daten nicht laden:', e);
    }
  }

  /** Speichert Daten / Saves data */
  function saveData() {
    try {
      localStorage.setItem(CONFIG.storageKey, JSON.stringify(adaptiveData));
    } catch (e) {
      console.warn('⚠️ Konnte adaptive Daten nicht speichern:', e);
    }
  }

  /**
   * Lädt die Spieler-Schwächen-Historie (letzte 50 Gruppen)
   * EN: Loads player weakness history (last 50 groups)
   */
  function loadPlayerHistory() {
    try {
      const h = localStorage.getItem(CONFIG.playerHistoryKey);
      playerHistory = h ? JSON.parse(h) : [];
    } catch (e) {
      console.warn('⚠️ Konnte Spieler-Historie nicht laden:', e);
      playerHistory = [];
    }
  }

  /**
   * Speichert ein neues Ergebnis des Spielers für die Schwächen-Analyse.
   * EN: Saves a new player result for weakness analysis.
   * @param {Object} groupingData - Gruppierungsdaten mit centerOffsetX, centerOffsetY
   */
  function trackPlayerResult(groupingData) {
    if (!groupingData) return;
    playerHistory.push({
      ...groupingData,
      timestamp: Date.now()
    });
    if (playerHistory.length > CONFIG.maxPlayerHistory) {
      playerHistory.shift();
    }
    try {
      localStorage.setItem(CONFIG.playerHistoryKey, JSON.stringify(playerHistory));
    } catch (e) { /* silent */ }
  }

  // ═══════════════════════════════════════════════
  // MOOD SYSTEM / STIMMUNGSSYSTEM
  // ═══════════════════════════════════════════════
  // Der Bot wechselt automatisch seine "Stimmung" –
  // genau wie ein echter Schütze im Wettkampf.
  // EN: The bot automatically changes "mood" – just like a real shooter.

  /**
   * Startet den automatischen Stimmungswechsel
   * EN: Starts automatic mood cycling
   */
  function startMoodCycle() {
    if (botState.moodTimer) clearInterval(botState.moodTimer);
    botState.moodTimer = setInterval(() => {
      // Je mehr Schüsse, desto mehr Müdigkeit
      // EN: More shots → more fatigue
      botState.fatigue = Math.min(100, botState.fatigue + 1 + Math.random() * 2);

      // Zufälliger Stimmungswechsel alle ~30s
      // EN: Random mood change approximately every ~30s
      const roll = Math.random();
      if (roll < 0.05 && botState.stressLevel < 40) {
        botState.mood = 'in_the_zone';
        botState.stressLevel = Math.max(0, botState.stressLevel - 15);
      } else if (roll < 0.15 && botState.fatigue > 50) {
        botState.mood = 'tired';
        botState.stressLevel += 5;
      } else if (roll < 0.25 && botState.stressLevel > 50) {
        botState.mood = 'nervous';
      } else if (roll < 0.6) {
        botState.mood = 'focused';
      }

      // Physics Engine aktualisieren / Update physics engine
      if (physicsEngine) {
        physicsEngine.setPhysiologicalState(botState.stressLevel, botState.fatigue);
      }
    }, 30000); // Alle 30 Sekunden / Every 30 seconds
  }

  /**
   * Setzt den Wettkampfdruck-Modus (z.B. Finale)
   * EN: Activates competition pressure mode (e.g. finals)
   * @param {boolean} isActive
   */
  function setStressMode(isActive) {
    if (isActive) {
      botState.stressLevel = 75 + Math.random() * 25; // 75–100
      botState.mood = 'nervous';
    } else {
      botState.stressLevel = 5 + Math.random() * 15; // 5–20
      botState.mood = 'focused';
    }
    if (physicsEngine) {
      physicsEngine.setPhysiologicalState(botState.stressLevel, botState.fatigue);
    }
  }

  /**
   * Gibt den aktuellen Bot-Zustand zurück
   * EN: Returns current bot state
   */
  function getBotState() {
    return { ...botState };
  }

  // ═══════════════════════════════════════════════
  // SPIELER-SCHWÄCHEN-ANALYSE / PLAYER WEAKNESS ANALYSIS
  // ═══════════════════════════════════════════════

  /**
   * Analysiert die Schwächen des echten Spielers anhand der letzten Gruppen.
   * Der Bot kann diese Schwächen dann gelegentlich imitieren.
   *
   * EN: Analyzes real player weaknesses from recent groups.
   * The bot can then occasionally mimic these weaknesses.
   *
   * @returns {{ x: number, y: number, spread: number }|null}
   */
  function analyzePlayerWeakness() {
    if (playerHistory.length < 5) return null;

    const recent = playerHistory.slice(-20); // Letzte 20 Gruppen
    let sumX = 0, sumY = 0, sumSpread = 0;

    recent.forEach(h => {
      if (h.centerOffsetX !== undefined) sumX += h.centerOffsetX;
      if (h.centerOffsetY !== undefined) sumY += h.centerOffsetY;
      if (h.meanRadius !== undefined) sumSpread += h.meanRadius;
    });

    return {
      x: sumX / recent.length,
      y: sumY / recent.length,
      spread: sumSpread / recent.length
    };
  }

  // ═══════════════════════════════════════════════
  // REALISTISCHE SCHUSSGRUPPE / REALISTIC SHOT GROUP
  // ═══════════════════════════════════════════════

  /**
   * Generiert eine realistische 10-Schuss-Gruppe basierend auf
   * Schwierigkeit, Disziplin und simulierter Physiologie.
   *
   * EN: Generates a realistic 10-shot group based on
   * difficulty, discipline, and simulated physiology.
   *
   * @param {string} difficulty - 'easy', 'real', 'hard', 'elite', 'worldrecord'
   * @param {string} discipline - 'air_rifle_10m', 'smallbore_50m', 'air_pistol_10m', 'dry_fire'
   * @param {Object} [playerStats] - Optional: Spielerstatistiken für adaptive Anpassung
   * @returns {Object} JSON mit shots[], grouping, physiologySummary, difficulty
   */
  function generateRealisticBotGroup(difficulty, discipline, playerStats) {
    difficulty = difficulty || 'real';
    discipline = discipline || 'air_rifle_10m';

    botState.currentDifficulty = difficulty;
    botState.discipline = discipline;

    // Mean Radius für diese Schwierigkeit + Disziplin holen
    // EN: Get mean radius for this difficulty + discipline
    const targetMeanRadius = getMeanRadiusForDifficulty(difficulty, discipline);

    // ─── ADAPTIVE BIAS: Spieler-Schwächen imitieren (20% Chance bei easy/real) ───
    // EN: Mimic player weaknesses occasionally
    let biasX = 0, biasY = 0;
    if (difficulty === 'easy' || difficulty === 'real') {
      const weakness = analyzePlayerWeakness();
      if (weakness && Math.random() < 0.2) {
        biasX = weakness.x * 0.5;
        biasY = weakness.y * 0.5;
      }
    }

    // ─── MOOD-BASIERTE PHYSIOLOGIE ANPASSUNG ─────────────
    // EN: Mood-based physiology adjustment
    let moodFatigue = botState.fatigue;
    let moodStress = botState.stressLevel;
    switch (botState.mood) {
      case 'tired':
        moodFatigue = Math.min(100, moodFatigue + 30);
        break;
      case 'nervous':
        moodStress = Math.min(100, moodStress + 25);
        break;
      case 'in_the_zone':
        moodFatigue = Math.max(0, moodFatigue - 20);
        moodStress = Math.max(0, moodStress - 20);
        break;
      // 'focused' = neutral
    }

    if (physicsEngine) {
      physicsEngine.setPhysiologicalState(moodStress, moodFatigue);
    }

    // ─── 10 SCHUSS GENERIEREN / GENERATE 10 SHOTS ───────
    const shots = [];
    let totalX = 0, totalY = 0;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

    for (let i = 0; i < 10; i++) {
      // Realistische Zielzeit: 5–12 Sekunden halten
      // EN: Realistic aim duration: 5–12 seconds of hold
      const aimDuration = 5000 + Math.random() * 7000;

      let impact;
      if (physicsEngine) {
        impact = physicsEngine.simulateShot(aimDuration, discipline, targetMeanRadius);
      } else {
        // Fallback ohne Physics Engine
        // EN: Fallback without physics engine
        const g = ShootingPhysicsEngine ? ShootingPhysicsEngine.gaussianRandom : function () {
          let u = 0, v = 0;
          while (u === 0) u = Math.random();
          while (v === 0) v = Math.random();
          return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
        };
        impact = {
          x: g() * targetMeanRadius,
          y: g() * targetMeanRadius,
          dominantError: 'wobble'
        };
      }

      // Adaptive Bias hinzufügen / Add adaptive bias
      impact.x += biasX;
      impact.y += biasY;

      shots.push({
        x: Number(impact.x.toFixed(2)),
        y: Number(impact.y.toFixed(2)),
        timestamp: Date.now() + (i * 45000), // ~45s zwischen Schüssen / between shots
        errorType: impact.dominantError
      });

      totalX += impact.x;
      totalY += impact.y;
      if (impact.x < minX) minX = impact.x;
      if (impact.x > maxX) maxX = impact.x;
      if (impact.y < minY) minY = impact.y;
      if (impact.y > maxY) maxY = impact.y;
    }

    // ─── GRUPPIERUNGS-STATISTIKEN / GROUPING STATS ───────
    const centerOffsetX = totalX / 10;
    const centerOffsetY = totalY / 10;

    let totalDist = 0;
    shots.forEach(s => {
      const ddx = s.x - centerOffsetX;
      const ddy = s.y - centerOffsetY;
      totalDist += Math.sqrt(ddx * ddx + ddy * ddy);
    });

    const grouping = {
      extremeSpread: Number(Math.sqrt(
        Math.pow(maxX - minX, 2) + Math.pow(maxY - minY, 2)
      ).toFixed(2)),
      meanRadius: Number((totalDist / 10).toFixed(2)),
      centerOffsetX: Number(centerOffsetX.toFixed(2)),
      centerOffsetY: Number(centerOffsetY.toFixed(2))
    };

    const physiologySummary = generatePhysioSummary(shots, botState.mood);

    botState.shotsFiredInSession += 10;

    return {
      shots: shots,
      grouping: grouping,
      physiologySummary: physiologySummary,
      difficulty: difficulty
    };
  }

  /**
   * Definiert die zu erwartende Streuung (Mean Radius in mm) basierend auf Niveau & Disziplin.
   * EN: Defines expected mean radius in mm based on skill level & discipline.
   */
  function getMeanRadiusForDifficulty(difficulty, discipline) {
    // Profil aus Physics Engine holen / Get profile from physics engine
    if (typeof ShootingPhysicsEngine !== 'undefined') {
      const profiles = ShootingPhysicsEngine.DISCIPLINE_PROFILES;
      const profile = profiles[discipline];
      if (profile && profile.meanRadii[difficulty] !== undefined) {
        return profile.meanRadii[difficulty];
      }
    }

    // Fallback: manuelle Werte / Fallback: manual values
    const baseRadii = {
      easy: 4.5,
      real: 2.2,
      hard: 1.2,
      elite: 0.7,
      worldrecord: 0.35
    };
    let radius = baseRadii[difficulty] || baseRadii['real'];

    // Skalierung nach Disziplin / Scale by discipline
    if (discipline === 'smallbore_50m') radius *= 5.0;
    if (discipline === 'air_pistol_10m') radius *= 6.5;

    return radius;
  }

  /**
   * Generiert eine textbasierte Zusammenfassung der Physiologie für UI/Coaching.
   * EN: Generates a text summary of the physiology for UI/Coaching.
   */
  function generatePhysioSummary(shots, mood) {
    const errorCounts = { breathing: 0, trigger: 0, wobble: 0, hrv: 0 };
    shots.forEach(s => {
      if (errorCounts[s.errorType] !== undefined) errorCounts[s.errorType]++;
    });

    const primaryIssue = Object.keys(errorCounts).reduce(
      (a, b) => errorCounts[a] > errorCounts[b] ? a : b
    );

    const moodTextDE = {
      tired: 'müde', focused: 'fokussiert',
      nervous: 'nervös', in_the_zone: 'in der Zone'
    };
    const moodTextEN = {
      tired: 'tired', focused: 'focused',
      nervous: 'nervous', in_the_zone: 'in the zone'
    };

    const errorTextDE = {
      breathing: 'Atemrhythmus (Schüsse in der Ausatmungsphase abgezogen).',
      trigger: 'Abzugsfehler (Reißen oder schlechte Nachhaltephase).',
      hrv: 'Hoher Puls / Stress (vertikale Streuung durch Herzschlag).',
      wobble: 'Natürliches Haltezittern (Muskeltonusschwankungen).'
    };
    const errorTextEN = {
      breathing: 'Breathing rhythm (shots broken during exhalation phase).',
      trigger: 'Trigger control (jerking or poor follow-through).',
      hrv: 'High pulse / Stress (vertical spread due to heartbeat).',
      wobble: 'Natural hold wobble (muscle tone variations).'
    };

    const hr = physicsEngine ? physicsEngine.getHeartRate() : 70;

    const de = `Bot war ${moodTextDE[mood] || 'fokussiert'} (Puls: ~${hr} BPM). Hauptfehlerquelle: ${errorTextDE[primaryIssue]}`;
    const en = `Bot was ${moodTextEN[mood] || 'focused'} (HR: ~${hr} BPM). Main error source: ${errorTextEN[primaryIssue]}`;

    return `${de} | ${en}`;
  }

  // ═══════════════════════════════════════════════
  // VIRTUAL CROSSHAIR ANIMATION (NEU!)
  // Animiert das Fadenkreuz mit physiologischem Wobble
  // EN: Animates the crosshair with physiological wobble
  // ═══════════════════════════════════════════════

  /**
   * Startet die Fadenkreuz-Animation (60fps) auf einem DOM-Element.
   * EN: Starts crosshair animation (60fps) on a DOM element.
   * @param {HTMLElement} crosshairElement - Das zu animierende Element
   * @param {number} [pixelScale=15] - Multiplikator mm→px
   */
  function startVirtualCrosshairAnimation(crosshairElement, pixelScale) {
    if (!crosshairElement || !physicsEngine) return;
    pixelScale = pixelScale || 15;
    _crosshairActive = true;

    const startTime = performance.now();

    function animate(time) {
      if (!_crosshairActive) return;

      const elapsed = time - startTime;
      const pos = physicsEngine.getCurrentAimPoint(elapsed);

      // Physiologische mm → Bildschirm px
      // EN: Physiological mm → screen px
      crosshairElement.style.transform =
        `translate(${(pos.x * pixelScale).toFixed(1)}px, ${(pos.y * pixelScale).toFixed(1)}px)`;

      _animationFrameId = requestAnimationFrame(animate);
    }

    _animationFrameId = requestAnimationFrame(animate);
  }

  /**
   * Stoppt die Fadenkreuz-Animation
   * EN: Stops the crosshair animation
   */
  function stopVirtualCrosshairAnimation() {
    _crosshairActive = false;
    if (_animationFrameId) {
      cancelAnimationFrame(_animationFrameId);
      _animationFrameId = null;
    }
  }

  // ═══════════════════════════════════════════════
  // BESTEHENDE ADAPTIVE LOGIK (UNVERÄNDERT)
  // EN: EXISTING ADAPTIVE LOGIC (UNCHANGED)
  // Alles ab hier ist die originale Difficulty-Adaptation
  // ═══════════════════════════════════════════════

  /**
   * Zeichnet ein Spiel auf / Records a game
   */
  function trackGame(playerScore, botScore, discipline, difficulty, weapon) {
    if (!CONFIG.enabled || !adaptiveData.enabled) return;

    const gameData = {
      timestamp: Date.now(),
      playerScore: parseFloat(playerScore) || 0,
      botScore: parseFloat(botScore) || 0,
      discipline: discipline,
      difficulty: difficulty,
      weapon: weapon,
      scoreDifference: Math.abs(playerScore - botScore),
      playerWon: playerScore > botScore
    };

    adaptiveData.games.push(gameData);

    // Alte Spiele aufräumen (letzte 50 behalten)
    if (adaptiveData.games.length > 50) {
      adaptiveData.games = adaptiveData.games.slice(-50);
    }

    saveData();

    // Nach Session-Schüssen: Bot-Müdigkeit leicht erhöhen
    // EN: After session shots: slightly increase bot fatigue
    botState.fatigue = Math.min(100, botState.fatigue + 3);

    // Automatische Anpassung prüfen
    if (shouldAdapt()) {
      const newDifficulty = analyzePerformanceAndAdapt();
      if (newDifficulty && newDifficulty !== adaptiveData.currentDifficulty) {
        const oldDifficulty = adaptiveData.currentDifficulty;
        adaptiveData.currentDifficulty = newDifficulty;
        adaptiveData.adaptationHistory.push({
          timestamp: Date.now(),
          oldDifficulty: oldDifficulty,
          newDifficulty: newDifficulty,
          reason: 'Auto-adaptation'
        });

        console.log(`🎯 Schwierigkeit angepasst: ${oldDifficulty} → ${newDifficulty}`);

        window.dispatchEvent(new CustomEvent('difficultyAdapted', {
          detail: { oldDifficulty: oldDifficulty, newDifficulty: newDifficulty }
        }));
      }
    }
  }

  function shouldAdapt() {
    if (adaptiveData.games.length < CONFIG.minGamesForAnalysis) return false;
    return adaptiveData.games.length % CONFIG.adaptationInterval === 0;
  }

  function analyzePerformanceAndAdapt() {
    const recentGames = adaptiveData.games.slice(-CONFIG.adaptationInterval);
    if (recentGames.length === 0) return null;

    const avgPlayerScore = recentGames.reduce((sum, g) => sum + g.playerScore, 0) / recentGames.length;
    const avgBotScore = recentGames.reduce((sum, g) => sum + g.botScore, 0) / recentGames.length;
    const avgDifference = Math.abs(avgPlayerScore - avgBotScore);
    const winRate = recentGames.filter(g => g.playerWon).length / recentGames.length;

    const scoreStdDev = calculateStdDev(recentGames.map(g => g.playerScore));
    const consistency = Math.max(0, 1 - (scoreStdDev / 100));

    const momentum = calculateMomentum();

    console.log('📊 Performance-Analyse:', {
      avgDifference: avgDifference.toFixed(1),
      winRate: (winRate * 100).toFixed(1) + '%',
      consistency: (consistency * 100).toFixed(1) + '%',
      momentum: momentum.toFixed(2),
      botMood: botState.mood
    });

    return determineOptimalDifficulty(avgDifference, winRate, consistency, momentum);
  }

  function calculateMomentum() {
    const games = adaptiveData.games;
    const n = CONFIG.adaptationInterval;
    if (games.length < n * 2) return 0;

    const recent = games.slice(-n);
    const previous = games.slice(-n * 2, -n);

    const recentWinRate = recent.filter(g => g.playerWon).length / n;
    const prevWinRate = previous.filter(g => g.playerWon).length / n;

    const recentAvgDiff = recent.reduce((s, g) => s + (g.playerScore - g.botScore), 0) / n;
    const prevAvgDiff = previous.reduce((s, g) => s + (g.playerScore - g.botScore), 0) / n;

    const winMomentum = recentWinRate - prevWinRate;
    const scoreMomentum = Math.tanh((recentAvgDiff - prevAvgDiff) / 20);

    return (winMomentum * 0.6 + scoreMomentum * 0.4);
  }

  function determineOptimalDifficulty(avgDifference, winRate, consistency, momentum) {
    const currentDiff = adaptiveData.currentDifficulty;
    const difficulties = ['easy', 'real', 'hard', 'elite'];
    const currentIndex = difficulties.indexOf(currentDiff);

    if (winRate > 0.7 || (winRate > 0.6 && momentum > 0.3)) {
      return difficulties[Math.min(currentIndex + 1, difficulties.length - 1)];
    } else if (winRate < 0.3 || (winRate < 0.4 && momentum < -0.3)) {
      return difficulties[Math.max(currentIndex - 1, 0)];
    } else if (consistency > 0.8 && avgDifference < 10 && momentum > 0.1) {
      return difficulties[Math.min(currentIndex + 1, difficulties.length - 1)];
    }

    return currentDiff;
  }

  function calculateStdDev(values) {
    if (values.length === 0) return 0;
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    return Math.sqrt(squaredDiffs.reduce((sum, diff) => sum + diff, 0) / values.length);
  }

  function getDifficultyRecommendation() {
    if (adaptiveData.games.length < CONFIG.minGamesForAnalysis) {
      return {
        recommended: adaptiveData.currentDifficulty,
        reason: 'Noch nicht genügend Daten für Empfehlung',
        confidence: 0
      };
    }

    const recentGames = adaptiveData.games.slice(-Math.min(10, adaptiveData.games.length));
    const avgDifference = recentGames.reduce((sum, g) => sum + g.scoreDifference, 0) / recentGames.length;
    const winRate = recentGames.filter(g => g.playerWon).length / recentGames.length;

    let recommended = adaptiveData.currentDifficulty;
    let reason = '';
    let confidence = 0;

    if (winRate > 0.7 && avgDifference > 15) {
      recommended = getNextDifficulty(adaptiveData.currentDifficulty);
      reason = 'Sie gewinnen zu oft mit großem Vorsprung';
      confidence = 0.8;
    } else if (winRate < 0.3) {
      recommended = getPreviousDifficulty(adaptiveData.currentDifficulty);
      reason = 'Der Bot ist zu stark für Sie';
      confidence = 0.8;
    } else if (avgDifference < 5) {
      reason = 'Sehr ausgeglichene Spiele - perfekte Balance';
      confidence = 0.9;
    } else {
      reason = 'Aktuelle Schwierigkeit scheint passend';
      confidence = 0.6;
    }

    return { recommended, reason, confidence, winRate, avgDifference };
  }

  function getNextDifficulty(current) {
    const difficulties = ['easy', 'real', 'hard', 'elite'];
    const idx = difficulties.indexOf(current);
    return difficulties[Math.min(idx + 1, difficulties.length - 1)];
  }

  function getPreviousDifficulty(current) {
    const difficulties = ['easy', 'real', 'hard', 'elite'];
    const idx = difficulties.indexOf(current);
    return difficulties[Math.max(idx - 1, 0)];
  }

  function getStatistics() {
    const games = adaptiveData.games;
    if (games.length === 0) return null;

    const totalGames = games.length;
    const wins = games.filter(g => g.playerWon).length;
    const winRate = wins / totalGames;
    const avgScore = games.reduce((sum, g) => sum + g.playerScore, 0) / totalGames;
    const avgDifference = games.reduce((sum, g) => sum + g.scoreDifference, 0) / totalGames;

    return {
      totalGames, wins,
      losses: totalGames - wins,
      winRate, avgScore, avgDifference,
      currentDifficulty: adaptiveData.currentDifficulty,
      skillLevel: adaptiveData.skillLevel,
      // NEU: Bot-Physiologie-Status / NEW: Bot physiology status
      botMood: botState.mood,
      botStress: botState.stressLevel,
      botFatigue: botState.fatigue,
      botHeartRate: physicsEngine ? physicsEngine.getHeartRate() : null
    };
  }

  function setEnabled(enabled) {
    adaptiveData.enabled = enabled;
    CONFIG.enabled = enabled;
    saveData();
    console.log(`🤖 Adaptive Bot System ${enabled ? 'aktiviert' : 'deaktiviert'}`);
  }

  function reset() {
    adaptiveData = {
      games: [],
      currentDifficulty: 'easy',
      skillLevel: 'beginner',
      adaptationHistory: [],
      enabled: true
    };
    botState.fatigue = 10;
    botState.stressLevel = 15;
    botState.mood = 'focused';
    botState.shotsFiredInSession = 0;
    playerHistory = [];
    saveData();
    try { localStorage.removeItem(CONFIG.playerHistoryKey); } catch (e) { /* silent */ }
    console.log('🔄 Adaptive Bot Daten zurückgesetzt (v2.0)');
  }

  // ═══════════════════════════════════════════════
  // PUBLIC API
  // Behält alle bestehenden Methoden + neue v2.0 Methoden
  // EN: Keeps all existing methods + new v2.0 methods
  // ═══════════════════════════════════════════════

  return {
    // ─── Bestehende API (unverändert) / Existing API (unchanged) ───
    init,
    trackGame,
    getDifficultyRecommendation,
    getStatistics,
    setEnabled,
    reset,
    getCurrentDifficulty: () => adaptiveData.currentDifficulty,
    isEnabled: () => adaptiveData.enabled,
    CONFIG,

    // ─── NEU v2.0: Physiologische Schussgenerierung / NEW v2.0 ───
    generateRealisticBotGroup,
    trackPlayerResult,
    analyzePlayerWeakness,

    // ─── NEU v2.0: Mood & Stress / NEW v2.0 ───
    setStressMode,
    getBotState,

    // ─── NEU v2.0: Virtual Crosshair / NEW v2.0 ───
    startVirtualCrosshairAnimation,
    stopVirtualCrosshairAnimation
  };

})();