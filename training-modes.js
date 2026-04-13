/**
 * Training Modes System
 * Verschiedene Trainingsformen mit spezifischen Zielen und Herausforderungen
 */

const TrainingModes = (function() {
  'use strict';
  
  // Trainings-Modi Definitionen
  const TRAINING_MODES = {
    speed: {
      id: 'speed',
      name: 'Schnellfeuer-Training',
      description: 'So viele Treffer wie möglich in begrenzter Zeit',
      icon: '⚡',
      color: '#ff6b35',
      
      settings: {
        timeLimit: 60, // Sekunden
        maxShots: 30,
        targetScore: null,
        scoringMethod: 'shots_per_minute'
      },
      
      rules: {
        timeBased: true,
        countAllShots: true,
        bonusForSpeed: true,
        penaltyForMisses: false
      },
      
      objectives: [
        { name: 'Bronze', requirement: 12, reward: 50 },
        { name: 'Silber', requirement: 16, reward: 100 },
        { name: 'Gold', requirement: 20, reward: 200 }
      ]
    },
    
    precision: {
      id: 'precision',
      name: 'Präzisions-Training',
      description: 'Nur perfekte Treffer zählen',
      icon: '🎯',
      color: '#4ecdc4',
      
      settings: {
        timeLimit: null,
        maxShots: 20,
        minRing: 9,
        scoringMethod: 'accuracy_percentage'
      },
      
      rules: {
        timeBased: false,
        countOnlyRings: [9, 10],
        bonusForX: true,
        penaltyForLowRings: true
      },
      
      objectives: [
        { name: 'Bronze', requirement: 45, reward: 75 }, // 45% 9er/10er
        { name: 'Silber', requirement: 60, reward: 150 },
        { name: 'Gold', requirement: 75, reward: 300 }
      ]
    },
    
    endurance: {
      id: 'endurance',
      name: 'Ausdauer-Training',
      description: 'Konstante Leistung über viele Schüsse',
      icon: '🏃',
      color: '#45b7d1',
      
      settings: {
        timeLimit: null,
        maxShots: 50,
        targetConsistency: 80,
        scoringMethod: 'consistency_score'
      },
      
      rules: {
        timeBased: false,
        trackConsistency: true,
        bonusForConsistency: true,
        penaltyForVariance: true
      },
      
      objectives: [
        { name: 'Bronze', requirement: 60, reward: 100 }, // 60% Konstanz
        { name: 'Silber', requirement: 70, reward: 200 },
        { name: 'Gold', requirement: 80, reward: 400 }
      ]
    },
    
    pressure: {
      id: 'pressure',
      name: 'Druck-Training',
      description: 'Performance unter Zeitdruck',
      icon: '⏰',
      color: '#f7b731',
      
      settings: {
        timeLimit: 45, // Sekunden pro Schuss (angepasst)
        maxShots: 15,
        pressurePhases: ['normal', 'medium', 'high'],
        scoringMethod: 'pressure_performance'
      },
      
      rules: {
        timeBased: true,
        pressureSimulation: true,
        decreasingTime: true,
        bonusForSpeed: true
      },
      
      objectives: [
        { name: 'Bronze', requirement: 50, reward: 125 }, // 50% unter Druck
        { name: 'Silber', requirement: 65, reward: 250 },
        { name: 'Gold', requirement: 75, reward: 500 }
      ]
    },
    
    technique: {
      id: 'technique',
      name: 'Technik-Training',
      description: 'Verbessere deine Schusstechnik',
      icon: '🎪',
      color: '#a55eea',
      
      settings: {
        timeLimit: null,
        maxShots: 25,
        focusOnForm: true,
        scoringMethod: 'technique_score'
      },
      
      rules: {
        timeBased: false,
        analyzeForm: true,
        provideFeedback: true,
        trackImprovement: true
      },
      
      objectives: [
        { name: 'Bronze', requirement: 55, reward: 75 }, // 55% Technik-Score
        { name: 'Silber', requirement: 70, reward: 150 },
        { name: 'Gold', requirement: 80, reward: 300 }
      ]
    }
  };
  
  // Aktuelles Training
  let currentTraining = null;
  let trainingStats = {};
  let trainingHistory = [];
  const TRAINING_MOUNT_ID = 'trainingModesMount';
  
  /**
   * Initialisiert das Training-System
   */
  function init() {
    loadTrainingData();
    renderUI();
    console.log('🎯 Training Modes System initialisiert');
  }
  
  /**
   * Lädt Trainings-Daten
   */
  function loadTrainingData() {
    try {
      const saved = localStorage.getItem('sd_training_data');
      if (saved) {
        const data = JSON.parse(saved);
        trainingStats = data.stats || {};
        trainingHistory = data.history || [];
        console.log('💾 Trainings-Daten geladen');
      }
    } catch (e) {
      console.warn('⚠️ Konnte Trainings-Daten nicht laden:', e);
    }
  }
  
  /**
   * Speichert Trainings-Daten
   */
  function saveTrainingData() {
    try {
      const data = {
        stats: trainingStats,
        history: trainingHistory,
        lastUpdated: Date.now()
      };
      localStorage.setItem('sd_training_data', JSON.stringify(data));
    } catch (e) {
      console.warn('⚠️ Konnte Trainings-Daten nicht speichern:', e);
    }
  }
  
  /**
   * Startet ein Training
   */
  function startTraining(modeId) {
    const mode = TRAINING_MODES[modeId];
    if (!mode) {
      console.error('Unbekannter Trainings-Modus:', modeId);
      return false;
    }
    
    currentTraining = {
      mode: mode,
      startTime: Date.now(),
      shots: [],
      score: 0,
      status: 'active',
      currentPhase: 0
    };
    
    // Initialisiere Modus-spezifische Variablen
    if (mode.id === 'pressure') {
      currentTraining.currentPhase = 0;
      currentTraining.phaseStartTime = Date.now();
    }
    
    console.log(`🎯 Training gestartet: ${mode.name}`);
    
    // Event auslösen
    window.dispatchEvent(new CustomEvent('trainingStarted', {
      detail: { mode: mode }
    }));

    renderUI();
    return true;
  }
  
  /**
   * Verarbeitet einen Schuss im Training
   */
  function processTrainingShot(shotData) {
    if (!currentTraining || currentTraining.status !== 'active') return null;
    
    const mode = currentTraining.mode;
    const shotResult = calculateTrainingShotResult(shotData, mode);
    
    currentTraining.shots.push(shotResult);
    
    // Modus-spezifische Verarbeitung
    switch (mode.id) {
      case 'speed':
        handleSpeedTraining(shotResult);
        break;
      case 'precision':
        handlePrecisionTraining(shotResult);
        break;
      case 'endurance':
        handleEnduranceTraining(shotResult);
        break;
      case 'pressure':
        handlePressureTraining(shotResult);
        break;
      case 'technique':
        handleTechniqueTraining(shotResult);
        break;
    }
    
    // Prüfe auf Trainings-Ende
    if (shouldEndTraining()) {
      endTraining();
    }
    
    return shotResult;
  }
  
  /**
   * Berechnet das Ergebnis eines Trainingsschusses
   */
  function calculateTrainingShotResult(shotData, mode) {
    const baseResult = {
      ring: shotData.ring || 0,
      isX: shotData.isX || false,
      timestamp: Date.now(),
      points: shotData.points || 0
    };
    
    // Modus-spezifische Anpassungen
    switch (mode.id) {
      case 'speed':
        // Zeit-Bonus für Schnelligkeit
        const timeBonus = calculateSpeedBonus(shotData.timeTaken);
        baseResult.speedBonus = timeBonus;
        baseResult.effectivePoints = baseResult.points + timeBonus;
        break;
        
      case 'precision':
        // Nur 9er und 10er zählen
        baseResult.isValid = baseResult.ring >= 9;
        baseResult.effectivePoints = baseResult.isValid ? baseResult.points : 0;
        break;
        
      case 'endurance':
        // Konstanz-Bonus
        const consistencyBonus = calculateConsistencyBonus(currentTraining.shots);
        baseResult.consistencyBonus = consistencyBonus;
        baseResult.effectivePoints = baseResult.points + consistencyBonus;
        break;
        
      case 'pressure':
        // Druck-Faktor berücksichtigen
        const pressureFactor = calculatePressureFactor(currentTraining);
        baseResult.pressureFactor = pressureFactor;
        baseResult.effectivePoints = baseResult.points * pressureFactor;
        break;
        
      case 'technique':
        // Technik-Score basierend auf Form
        const techniqueScore = calculateTechniqueScore(shotData);
        baseResult.techniqueScore = techniqueScore;
        baseResult.effectivePoints = techniqueScore;
        break;
    }
    
    return baseResult;
  }
  
  /**
   * Handhabt Speed-Training
   */
  function handleSpeedTraining(shotResult) {
    const mode = currentTraining.mode;
    const timeElapsed = (Date.now() - currentTraining.startTime) / 1000;
    
    // Prüfe Zeit-Limit
    if (timeElapsed >= mode.settings.timeLimit) {
      currentTraining.status = 'time_up';
      return;
    }
    
    // Aktualisiere Geschwindigkeits-Metriken
    if (!currentTraining.metrics) {
      currentTraining.metrics = {
        totalTime: 0,
        shotCount: 0,
        shotsPerMinute: 0
      };
    }
    
    currentTraining.metrics.shotCount++;
    currentTraining.metrics.totalTime = timeElapsed;
    currentTraining.metrics.shotsPerMinute = (currentTraining.metrics.shotCount / timeElapsed) * 60;
    
    // Berechne aktuellen Score
    currentTraining.score = currentTraining.metrics.shotsPerMinute;
  }
  
  /**
   * Handhabt Präzisions-Training
   */
  function handlePrecisionTraining(shotResult) {
    const validShots = currentTraining.shots.filter(s => s.isValid).length;
    const totalShots = currentTraining.shots.length;
    
    // Berechne Genauigkeits-Prozentsatz
    const accuracy = (validShots / totalShots) * 100;
    currentTraining.score = accuracy;
    
    // Bonus für X-Ringe
    const xCount = currentTraining.shots.filter(s => s.isX).length;
    const xBonus = xCount * 2; // 2% Bonus pro X
    currentTraining.score += xBonus;
  }
  
  /**
   * Handhabt Ausdauer-Training
   */
  function handleEnduranceTraining(shotResult) {
    // Berechne Konstanz über alle Schüsse
    const scores = currentTraining.shots.map(s => s.ring).filter(r => r > 0);
    const consistency = calculateConsistencyScore(scores);
    
    currentTraining.score = consistency;
    currentTraining.consistency = consistency;
  }
  
  /**
   * Handhabt Druck-Training
   */
  function handlePressureTraining(shotResult) {
    const mode = currentTraining.mode;
    const shotIndex = currentTraining.shots.length - 1;
    
    // Simuliere zunehmenden Druck
    const phase = Math.floor(shotIndex / 5); // Jede Phase = 5 Schüsse
    const pressureMultiplier = 1 + (phase * 0.2); // Erhöhe Druck pro Phase
    
    // Verringere Zeit-Limit in späteren Phasen
    const baseTimeLimit = mode.settings.timeLimit;
    const currentTimeLimit = baseTimeLimit - (phase * 8); // -8 Sekunden pro Phase (weniger extrem)
    
    currentTraining.currentPhase = phase;
    currentTraining.currentTimeLimit = Math.max(15, currentTimeLimit); // Mindestens 15 Sekunden (realistischer)
    currentTraining.pressureMultiplier = pressureMultiplier;
    
    // Berechne Druck-Performance
    const pressureScore = shotResult.points * pressureMultiplier;
    currentTraining.score = (currentTraining.score || 0) + pressureScore;
    
    // Durchschnittliche Druck-Performance
    const totalPressureScore = currentTraining.shots.reduce((sum, s) => 
      sum + (s.points * (s.pressureFactor || 1)), 0
    );
    const avgPressurePerformance = (totalPressureScore / currentTraining.shots.length) * 10;
    currentTraining.pressurePerformance = avgPressurePerformance;
  }
  
  /**
   * Handhabt Technik-Training
   */
  function handleTechniqueTraining(shotResult) {
    // Analysiere Technik-Aspekte
    const techniqueAnalysis = analyzeTechnique(shotResult);
    
    currentTraining.techniqueScore = techniqueAnalysis.overallScore;
    currentTraining.techniqueFeedback = techniqueAnalysis.feedback;
    
    // Durchschnittlicher Technik-Score
    const totalTechniqueScore = currentTraining.shots.reduce((sum, s) => 
      sum + (s.techniqueScore || 0), 0
    );
    currentTraining.score = totalTechniqueScore / currentTraining.shots.length;
  }
  
  /**
   * Berechnet Geschwindigkeits-Bonus
   */
  function calculateSpeedBonus(timeTaken) {
    // Bonus für schnelles Schießen (unter 10 Sekunden)
    if (timeTaken <= 10) return 2;
    if (timeTaken <= 15) return 1;
    if (timeTaken <= 20) return 0.5;
    return 0;
  }
  
  /**
   * Berechnet Konstanz-Bonus
   */
  function calculateConsistencyBonus(shots) {
    if (shots.length < 3) return 0;
    
    const scores = shots.map(s => s.ring).filter(r => r > 0);
    const consistency = calculateConsistencyScore(scores);
    
    return consistency * 0.1; // 10% der Konstanz als Bonus
  }
  
  /**
   * Berechnet Druck-Faktor
   */
  function calculatePressureFactor(training) {
    const phase = training.currentPhase || 0;
    return 1 + (phase * 0.2); // Erhöhe Druck pro Phase
  }
  
  /**
   * Berechnet Technik-Score
   */
  function calculateTechniqueScore(shotData) {
    // Technik-Score basiert auf mehreren Faktoren
    let score = 40; // Basis-Score
    
    // Treffgenauigkeit (nur 40% Gewichtung)
    if (shotData.ring >= 9) score += 15;
    if (shotData.ring === 10) score += 15;
    if (shotData.isX) score += 10;
    
    // Technik-Faktoren
    if (shotData.stability && shotData.stability > 0.7) score += 15; // Stabilität
    if (shotData.smoothness && shotData.smoothness > 0.6) score += 10; // Flüssigkeit
    if (shotData.rhythm && shotData.rhythm > 0.5) score += 10; // Rhythmus
    
    // Bonus für konstante Abstände zwischen Schüssen
    if (shotData.consistentTiming) score += 10;
    
    return Math.min(100, score);
  }
  
  /**
   * Analysiert Technik (erweitert)
   */
  function analyzeTechnique(shotResult) {
    const analysis = {
      overallScore: shotResult.techniqueScore || 0,
      aspects: {},
      feedback: []
    };
    
    // Analysiere verschiedene Technik-Aspekte
    if (shotResult.ring >= 9) {
      analysis.aspects.accuracy = 'excellent';
      analysis.feedback.push('✅ Ausgezeichnete Treffgenauigkeit');
    } else if (shotResult.ring >= 7) {
      analysis.aspects.accuracy = 'good';
      analysis.feedback.push('👍 Gute Treffgenauigkeit');
    } else {
      analysis.aspects.accuracy = 'needs_improvement';
      analysis.feedback.push('📈 Arbeite an der Treffgenauigkeit');
    }
    
    // Technik-Fokussierte Aspekte
    if (shotResult.stability && shotResult.stability > 0.7) {
      analysis.aspects.stability = 'excellent';
      analysis.feedback.push('🦿 Sehr stabile Waffenführung');
    } else if (shotResult.stability && shotResult.stability > 0.4) {
      analysis.aspects.stability = 'good';
      analysis.feedback.push('🦿 Gute Stabilität');
    } else {
      analysis.aspects.stability = 'needs_improvement';
      analysis.feedback.push('🦿 Arbeite an der Waffenstabilisierung');
    }
    
    if (shotResult.smoothness && shotResult.smoothness > 0.6) {
      analysis.aspects.smoothness = 'excellent';
      analysis.feedback.push('🌊 Flüssige Bewegungsausführung');
    } else if (shotResult.smoothness && shotResult.smoothness > 0.3) {
      analysis.aspects.smoothness = 'good';
      analysis.feedback.push('🌊 Gute Bewegungskontrolle');
    } else {
      analysis.aspects.smoothness = 'needs_improvement';
      analysis.feedback.push('🌊 Übe flüssigere Bewegungen');
    }
    
    if (shotResult.rhythm && shotResult.rhythm > 0.5) {
      analysis.aspects.rhythm = 'excellent';
      analysis.feedback.push('🎵 Guter Schussrhythmus');
    } else if (shotResult.rhythm && shotResult.rhythm > 0.2) {
      analysis.aspects.rhythm = 'good';
      analysis.feedback.push('🎵 Ordentlicher Rhythmus');
    } else {
      analysis.aspects.rhythm = 'needs_improvement';
      analysis.feedback.push('🎵 Arbeite an deinem Schusstiming');
    }
    
    if (shotResult.isX) {
      analysis.aspects.precision = 'perfect';
      analysis.feedback.push('🎯 Perfekte Präzision!');
    }
    
    return analysis;
  }
  
  /**
   * Berechnet Konstanz-Score
   */
  function calculateConsistencyScore(scores) {
    if (scores.length < 2) return 0;
    
    const variance = calculateVariance(scores);
    const maxVariance = 50;
    
    // Konvertiere zu 0-100 Skala
    const consistency = Math.max(0, 100 - (variance / maxVariance * 100));
    return Math.round(consistency);
  }
  
  /**
   * Prüft ob Training beendet werden soll
   */
  function shouldEndTraining() {
    if (!currentTraining) return false;
    
    const mode = currentTraining.mode;
    
    switch (mode.id) {
      case 'speed':
        const timeElapsed = (Date.now() - currentTraining.startTime) / 1000;
        return timeElapsed >= mode.settings.timeLimit || 
               currentTraining.shots.length >= mode.settings.maxShots;
               
      case 'precision':
      case 'endurance':
      case 'technique':
        return currentTraining.shots.length >= mode.settings.maxShots;
        
      case 'pressure':
        return currentTraining.shots.length >= mode.settings.maxShots ||
               currentTraining.currentTimeLimit <= 5; // Zu wenig Zeit
    }
    
    return false;
  }
  
  /**
   * Beendet das Training
   */
  function endTraining() {
    if (!currentTraining) return null;
    if (currentTraining.status !== 'active' && currentTraining.status !== 'time_up') return currentTraining.result || null;
    
    const mode = currentTraining.mode;
    const finalResult = calculateTrainingResult(currentTraining);
    
    currentTraining.status = 'completed';
    currentTraining.endTime = Date.now();
    currentTraining.duration = currentTraining.endTime - currentTraining.startTime;
    currentTraining.result = finalResult;
    
    // Speichere in Historie
    const historyEntry = {
      id: generateTrainingId(),
      modeId: mode.id,
      modeName: mode.name,
      startTime: currentTraining.startTime,
      endTime: currentTraining.endTime,
      duration: currentTraining.duration,
      score: finalResult.score,
      grade: finalResult.grade,
      shots: currentTraining.shots.length,
      result: finalResult,
      timestamp: Date.now()
    };
    
    trainingHistory.unshift(historyEntry);
    
    // Maximal 50 Einträge behalten
    if (trainingHistory.length > 50) {
      trainingHistory = trainingHistory.slice(0, 50);
    }
    
    // Aktualisiere Statistiken
    updateTrainingStats(mode.id, finalResult);
    
    saveTrainingData();
    
    console.log(`🎯 Training beendet: ${mode.name} - ${finalResult.grade}`);
    
    // Event auslösen
    window.dispatchEvent(new CustomEvent('trainingCompleted', {
      detail: { result: finalResult, historyEntry: historyEntry }
    }));

    renderUI();
    return finalResult;
  }
  
  /**
   * Berechnet das Endergebnis des Trainings
   */
  function calculateTrainingResult(training) {
    const mode = training.mode;
    const shots = training.shots;
    
    let finalScore = 0;
    let grade = 'Bronze';
    let performance = {};
    
    switch (mode.id) {
      case 'speed':
        finalScore = training.score || 0;
        performance = {
          shotsPerMinute: finalScore,
          totalShots: shots.length,
          timeUsed: (training.duration || 0) / 1000
        };
        break;
        
      case 'precision':
        const validShots = shots.filter(s => s.isValid).length;
        const accuracy = (validShots / shots.length) * 100;
        finalScore = accuracy;
        performance = {
          accuracy: accuracy,
          validShots: validShots,
          totalShots: shots.length,
          xCount: shots.filter(s => s.isX).length
        };
        break;
        
      case 'endurance':
        finalScore = training.consistency || 0;
        performance = {
          consistency: finalScore,
          averageScore: calculateAverage(shots.map(s => s.points)),
          variance: calculateVariance(shots.map(s => s.points))
        };
        break;
        
      case 'pressure':
        finalScore = training.pressurePerformance || 0;
        performance = {
          pressurePerformance: finalScore,
          phasesCompleted: training.currentPhase + 1,
          finalTimeLimit: training.currentTimeLimit
        };
        break;
        
      case 'technique':
        finalScore = training.techniqueScore || 0;
        performance = {
          techniqueScore: finalScore,
          feedback: training.techniqueFeedback,
          improvement: calculateTechniqueImprovement(shots)
        };
        break;
    }
    
    // Bestimme Grade basierend auf Zielen
    const objectives = mode.objectives;
    if (finalScore >= objectives[2].requirement) {
      grade = 'Gold';
    } else if (finalScore >= objectives[1].requirement) {
      grade = 'Silber';
    } else if (finalScore >= objectives[0].requirement) {
      grade = 'Bronze';
    } else {
      grade = 'Teilnahme';
    }
    
    const reward = objectives.find(obj => finalScore >= obj.requirement)?.reward || 25;
    
    return {
      score: finalScore,
      grade: grade,
      reward: reward,
      performance: performance,
      mode: mode.id,
      shots: shots.length,
      duration: training.duration
    };
  }
  
  /**
   * Aktualisiert Trainings-Statistiken
   */
  function updateTrainingStats(modeId, result) {
    if (!trainingStats[modeId]) {
      trainingStats[modeId] = {
        totalSessions: 0,
        totalScore: 0,
        bestScore: 0,
        averageScore: 0,
        goldMedals: 0,
        silverMedals: 0,
        bronzeMedals: 0,
        lastPlayed: null
      };
    }
    
    const stats = trainingStats[modeId];
    stats.totalSessions++;
    stats.totalScore += result.score;
    stats.averageScore = stats.totalScore / stats.totalSessions;
    stats.bestScore = Math.max(stats.bestScore, result.score);
    stats.lastPlayed = Date.now();
    
    // Medaillen zählen
    switch (result.grade) {
      case 'Gold':
        stats.goldMedals++;
        break;
      case 'Silber':
        stats.silverMedals++;
        break;
      case 'Bronze':
        stats.bronzeMedals++;
        break;
    }
  }
  
  /**
   * Berechnet Technik-Verbesserung
   */
  function calculateTechniqueImprovement(shots) {
    if (shots.length < 5) return 0;
    
    const firstHalf = shots.slice(0, Math.floor(shots.length / 2));
    const secondHalf = shots.slice(Math.floor(shots.length / 2));
    
    const firstAvg = calculateAverage(firstHalf.map(s => s.techniqueScore || 0));
    const secondAvg = calculateAverage(secondHalf.map(s => s.techniqueScore || 0));
    
    return secondAvg - firstAvg; // Positive = Verbesserung
  }
  
  /**
   * Helper-Funktionen
   */
  function calculateAverage(values) {
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }
  
  function calculateVariance(values) {
    if (values.length === 0) return 0;
    const mean = calculateAverage(values);
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    return calculateAverage(squaredDiffs);
  }
  
  function generateTrainingId() {
    return 'training_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  function bindTrainingUI(mount) {
    mount.querySelectorAll('.start-training-btn[data-mode]').forEach(button => {
      button.addEventListener('click', () => {
        const modeId = button.dataset.mode;
        if (!modeId) return;
        startTraining(modeId);
      });
    });
  }

  function renderUI() {
    const mount = document.getElementById(TRAINING_MOUNT_ID);
    if (!mount) return;
    mount.innerHTML = createTrainingUI();
    bindTrainingUI(mount);
  }
  
  /**
   * Erstellt Trainings-UI
   */
  function createTrainingUI() {
    const activeModeId = currentTraining && currentTraining.status === 'active'
      ? currentTraining.mode.id
      : null;

    return `
      <div class="training-modes">
        <div class="training-header">
          <h3>🎯 Trainings-Modi</h3>
          <p>Wähle ein spezielles Training, um deine Fähigkeiten zu verbessern</p>
        </div>

        ${activeModeId ? `
          <div class="training-history" style="margin-bottom:16px;">
            <h4>Aktives Training</h4>
            <div class="history-entry">
              <div class="history-mode">${TRAINING_MODES[activeModeId].name}</div>
              <div class="history-meta">
                <span class="history-date">Nächstes Duell zählt bereits mit</span>
              </div>
            </div>
          </div>
        ` : ''}
        
        <div class="training-modes-grid">
          ${Object.values(TRAINING_MODES).map(mode => {
            const stats = trainingStats[mode.id] || {};
            const isUnlocked = isModeUnlocked(mode.id);
            const isActive = activeModeId === mode.id;
            
            return `
              <div class="training-mode-card ${isUnlocked ? '' : 'locked'}" data-mode="${mode.id}">
                <div class="mode-icon" style="color: ${mode.color}">${mode.icon}</div>
                <div class="mode-info">
                  <div class="mode-name">${mode.name}</div>
                  <div class="mode-desc">${mode.description}</div>
                  
                  ${stats.totalSessions ? `
                    <div class="mode-stats">
                      <span>🏆 ${stats.goldMedals || 0}</span>
                      <span>🥈 ${stats.silverMedals || 0}</span>
                      <span>🥉 ${stats.bronzeMedals || 0}</span>
                      <span>📊 ${stats.totalSessions} Sessions</span>
                    </div>
                  ` : ''}
                </div>
                
                <div class="mode-objectives">
                  ${mode.objectives.map(obj => `
                    <div class="objective ${stats.bestScore >= obj.requirement ? 'completed' : ''}">
                      <span class="objective-name">${obj.name}</span>
                      <span class="objective-req">${obj.requirement}${getObjectiveUnit(mode.id)}</span>
                      <span class="objective-reward">+${obj.reward} XP</span>
                    </div>
                  `).join('')}
                </div>
                
                <button class="start-training-btn" data-mode="${mode.id}" ${isUnlocked ? '' : 'disabled'}>
                  ${isActive ? 'Aktiv' : (isUnlocked ? 'Training starten' : 'Noch nicht freigeschaltet')}
                </button>
              </div>
            `;
          }).join('')}
        </div>
        
        ${trainingHistory.length > 0 ? `
          <div class="training-history">
            <h4>📚 Trainings-Historie</h4>
            <div class="history-list">
              ${trainingHistory.slice(0, 5).map(entry => `
                <div class="history-entry">
                  <div class="history-mode">${entry.modeName}</div>
                  <div class="history-result">
                    <span class="history-grade grade-${entry.grade.toLowerCase()}">${entry.grade}</span>
                    <span class="history-score">${entry.score.toFixed(1)}</span>
                  </div>
                  <div class="history-meta">
                    <span class="history-date">${formatDate(entry.timestamp)}</span>
                    <span class="history-reward">+${entry.reward} XP</span>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }
  
  /**
   * Prüft ob Modus freigeschaltet ist
   */
  function isModeUnlocked(modeId) {
    // Alle Modi sind standardmäßig freigeschaltet
    // Hier könnte später eine Freischalt-Logik implementiert werden
    return true;
  }
  
  /**
   * Holt Objective-Einheit
   */
  function getObjectiveUnit(modeId) {
    const units = {
      speed: ' Schüsse/Min',
      precision: '%',
      endurance: '%',
      pressure: '%',
      technique: '%'
    };
    return units[modeId] || '';
  }
  
  /**
   * Formatiert Datum
   */
  function formatDate(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Heute';
    if (diffDays === 1) return 'Gestern';
    if (diffDays < 7) return `Vor ${diffDays} Tagen`;
    
    return date.toLocaleDateString('de-DE', { 
      day: '2-digit', 
      month: '2-digit' 
    });
  }
  
  /**
   * Holt Trainings-Statistiken
   */
  function getTrainingStats() {
    const totalSessions = Object.values(trainingStats).reduce((sum, stats) => 
      sum + (stats.totalSessions || 0), 0
    );
    
    const totalGold = Object.values(trainingStats).reduce((sum, stats) => 
      sum + (stats.goldMedals || 0), 0
    );
    
    return {
      totalSessions: totalSessions,
      totalGold: totalGold,
      totalSilver: Object.values(trainingStats).reduce((sum, stats) => 
        sum + (stats.silverMedals || 0), 0
      ),
      totalBronze: Object.values(trainingStats).reduce((sum, stats) => 
        sum + (stats.bronzeMedals || 0), 0
      ),
      byMode: trainingStats,
      recentHistory: trainingHistory.slice(0, 10)
    };
  }
  
  /**
   * Öffentliche API
   */
  return {
    init,
    startTraining,
    processTrainingShot,
    endTraining,
    getCurrentTraining: () => currentTraining,
    getTrainingStats,
    renderUI,
    createTrainingUI,
    TRAINING_MODES
  };
})();

// Initialisierung
if (typeof window !== 'undefined') {
  document.addEventListener('DOMContentLoaded', function() {
    TrainingModes.init();
  });
}
