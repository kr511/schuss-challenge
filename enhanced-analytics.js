/**
 * Enhanced Statistics & Analytics System
 * Detaillierte Performance-Analyse mit Trends und Vorhersagen
 */

const EnhancedAnalytics = (function() {
  'use strict';

  function createDefaultAnalyticsData() {
    return {
      games: [],
      realLifeShots: [], // NEU: Speichert Schüsse aus Foto-Uploads
      trends: {},
      predictions: {},
      consistencyScores: {},
      performanceMetrics: {}
    };
  }

  // Analytics-Datenstruktur
  let analyticsData = createDefaultAnalyticsData();
  const ANALYTICS_MOUNT_ID = 'enhancedAnalyticsMount';
  const HEATMAP_MOUNT_ID = 'heatmapMount';
  const HEATMAP_CANVAS_ID = 'heatmapCanvas';

  // Konfiguration
  const CONFIG = {
    minGamesForAnalysis: 10,
    trendWindow: 20, // Letzte 20 Spiele für Trends
    predictionConfidence: 0.7,
    storageKey: 'sd_enhanced_analytics',
    progressTracking: {
      weeklyImprovementWindow: 7,   // Tage für wöchentliche Verbesserung
      monthlyImprovementWindow: 30, // Tage für monatliche Verbesserung
      consistencyThreshold: 5       // Mindestscore für Konsistenz-Streak
    },
    heatmap: {
      pointRadius: 18,
      blur: 20,
      maxOpacity: 0.9,
      colors: {
        hot: 'rgba(255, 60, 0, 0.9)',
        medium: 'rgba(255, 150, 0, 0.6)',
        cool: 'rgba(255, 200, 0, 0.3)'
      }
    }
  };

  /**
   * Initialisiert das erweiterte Analytics-System
   */
  function init() {
    loadData();
    updateTrends();
    updatePredictions();
    updateConsistencyScores();
    renderUI();
    // Heatmap wird nur gerendert, wenn Canvas vorhanden ist (passiert in renderUI)
    console.log('📊 Enhanced Analytics System initialisiert');
  }

  /**
   * Lädt Analytics-Daten
   */
  function loadData() {
    try {
      const saved = localStorage.getItem(CONFIG.storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        analyticsData = {
          ...createDefaultAnalyticsData(),
          ...parsed,
          games: sortGamesByTimestamp(Array.isArray(parsed?.games) ? parsed.games : []),
          realLifeShots: Array.isArray(parsed?.realLifeShots) ? parsed.realLifeShots : [],
          trends: parsed?.trends && typeof parsed.trends === 'object' ? parsed.trends : {},
          predictions: parsed?.predictions && typeof parsed.predictions === 'object' ? parsed.predictions : {},
          consistencyScores: parsed?.consistencyScores && typeof parsed.consistencyScores === 'object' ? parsed.consistencyScores : {},
          performanceMetrics: parsed?.performanceMetrics && typeof parsed.performanceMetrics === 'object' ? parsed.performanceMetrics : {}
        };
        console.log('💾 Analytics-Daten geladen:', analyticsData.games.length, 'Spiele,', analyticsData.realLifeShots.length, 'Real-Life Schüsse');
      }
    } catch (e) {
      console.warn('⚠️ Konnte Analytics-Daten nicht laden:', e);
    }
  }

  /**
   * Speichert Analytics-Daten
   */
  function saveData() {
    try {
      localStorage.setItem(CONFIG.storageKey, JSON.stringify(analyticsData));
    } catch (e) {
      console.warn('⚠️ Konnte Analytics-Daten nicht speichern:', e);
    }
  }

  function renderUI() {
    const mount = document.getElementById(ANALYTICS_MOUNT_ID);
    if (!mount) return;
    mount.innerHTML = createAnalyticsUI();
    
    // Heatmap Mount steuern
    const heatmapMount = document.getElementById(HEATMAP_MOUNT_ID);
    if (heatmapMount) {
      const hasRealShots = analyticsData.realLifeShots && analyticsData.realLifeShots.length > 0;
      heatmapMount.style.display = hasRealShots ? 'block' : 'none';
      if (hasRealShots) {
        requestAnimationFrame(() => renderHeatmap());
      }
    }
  }

  /**
   * Fügt Real-Life Schüsse aus Foto-Analyse hinzu
   */
  function addRealLifeShots(shots) {
    if (!Array.isArray(shots) || shots.length === 0) return;
    
    // Schüsse hinzufügen (max 500 für Heatmap behalten)
    analyticsData.realLifeShots = [...analyticsData.realLifeShots, ...shots].slice(-500);
    
    saveData();
    renderUI();
  }

  /**
   * Zeichnet die Heatmap
   */
  function renderHeatmap() {
    const canvas = document.getElementById(HEATMAP_CANVAS_ID);
    if (!canvas || !analyticsData.realLifeShots || analyticsData.realLifeShots.length === 0) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    const w = canvas.width = rect.width * dpr;
    const h = canvas.height = rect.height * dpr;
    const cx = w / 2;
    const cy = h / 2;
    const maxR = (Math.min(w, h) / 2) - (20 * dpr);

    ctx.clearRect(0, 0, w, h);

    // 1. Hintergrund (Hochwertige Zielscheibe)
    ctx.lineWidth = 1.5 * dpr;
    for (let i = 1; i <= 10; i++) {
      const r = (i / 10) * maxR;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = i >= 4 ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.05)';
      ctx.stroke();
      
      // Zahlen
      if (i % 2 === 0 && i < 10) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.font = `${10 * dpr}px Outfit`;
        ctx.textAlign = 'center';
        ctx.fillText(10 - i, cx, cy - r + (12 * dpr));
      }
    }
    
    // Zentrum-Glow
    const centerGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 30 * dpr);
    centerGrad.addColorStop(0, 'rgba(122, 176, 48, 0.15)');
    centerGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = centerGrad;
    ctx.beginPath(); ctx.arc(cx, cy, 30 * dpr, 0, Math.PI * 2); ctx.fill();

    // 2. Heatmap-Ebene
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = w;
    tempCanvas.height = h;
    const tCtx = tempCanvas.getContext('2d');

    analyticsData.realLifeShots.forEach(shot => {
      // Skalierung von mm (KI-Output) zu Pixeln
      // Ein 10er Ring bei LG hat 0.5mm Radius. 
      // Auf unserer Scheibe entspricht Ring 10 dem Radius (1/10 * maxR).
      // Also 0.5mm = (1/10 * maxR) Pixel.
      // Skalierungsfaktor mm -> px: (maxR / 10) / 0.5 = maxR / 5
      const scale = maxR / 5; 
      const x = cx + shot.dx * scale;
      const y = cy + shot.dy * scale;

      const pR = CONFIG.heatmap.pointRadius * dpr;
      const grad = tCtx.createRadialGradient(x, y, 0, x, y, pR);
      grad.addColorStop(0, CONFIG.heatmap.colors.hot);
      grad.addColorStop(0.5, CONFIG.heatmap.colors.medium);
      grad.addColorStop(1, 'transparent');

      tCtx.fillStyle = grad;
      tCtx.beginPath();
      tCtx.arc(x, y, pR, 0, Math.PI * 2);
      tCtx.fill();
    });

    // 3. Blur & Overlay
    ctx.save();
    ctx.filter = `blur(${CONFIG.heatmap.blur * dpr}px) brightness(1.2)`;
    ctx.globalCompositeOperation = 'screen';
    ctx.drawImage(tempCanvas, 0, 0);
    ctx.restore();
    
    // Zweiter Durchgang für schärfere Zentren
    ctx.globalAlpha = 0.3;
    ctx.drawImage(tempCanvas, 0, 0);
    ctx.globalAlpha = 1.0;

    // 4. Statistiken Overlay
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.font = `600 ${11 * dpr}px Outfit`;
    ctx.textAlign = 'center';
    ctx.fillText(`${analyticsData.realLifeShots.length} ECHTE SCHÜSSE ANALYSIERT`, cx, h - (15 * dpr));
  }

  /**
   * Fügt Spiel-Daten hinzu und aktualisiert Analysen
   */
  function addGameData(gameData) {
    if (!gameData || gameData.playerScore === null) return;

    const enhancedData = {
      ...gameData,
      timestamp: Number.isFinite(Number(gameData.timestamp)) ? Number(gameData.timestamp) : Date.now(),
      id: generateGameId(),
      shots: gameData.shots || [],
      duration: gameData.duration || calculateDuration(gameData),
      consistency: calculateShotConsistency(gameData.shots),
      scoreDifference: Number.isFinite(Number(gameData.scoreDifference))
        ? Number(gameData.scoreDifference)
        : ((Number(gameData.playerScore) || 0) - (Number(gameData.botScore) || 0)),
      shotsLeft: Number.isFinite(Number(gameData.shotsLeft)) ? Number(gameData.shotsLeft) : 0,
      pressureMoments: identifyPressureMoments(gameData)
    };

    analyticsData.games.push(enhancedData);
    analyticsData.games = sortGamesByTimestamp(analyticsData.games);

    // Alte Spiele aufräumen (max. 100 behalten)
    if (analyticsData.games.length > 100) {
      analyticsData.games = analyticsData.games.slice(-100);
    }

    // Aktualisiere Analysen
    updateTrends();
    updatePredictions();
    updateConsistencyScores();

    saveData();
    renderUI();

    // Event auslösen
    window.dispatchEvent(new CustomEvent('analyticsUpdated', {
      detail: getAnalyticsSummary()
    }));
  }

  /**
   * Berechnet detaillierte Performance-Metriken
   */
  function calculatePerformanceMetrics(games = analyticsData.games) {
    if (games.length === 0) return {};

    const recentGames = games.slice(-CONFIG.trendWindow);

    // Basis-Metriken
    const scores = recentGames.map(g => g.playerScore).filter(s => s > 0);
    const wins = recentGames.filter(g => g.result === 'win').length;
    const totalGames = recentGames.length;

    // Erweiterte Metriken
    const metrics = {
      // Durchschnittswerte
      averageScore: calculateAverage(scores),
      winRate: wins / totalGames,

      // Konstanz
      consistencyScore: calculateConsistencyScore(scores),
      scoreVariance: calculateVariance(scores),

      // Trends
      scoreTrend: calculateLinearTrend(scores),
      winTrend: calculateWinTrend(recentGames),

      // Pressure-Performance
      pressurePerformance: calculatePressurePerformance(recentGames),

      // Verbesserung
      improvementRate: calculateImprovementRate(games),

      // Spezialisierung
      lgPerformance: calculateDisciplinePerformance(recentGames, 'lg'),
      kkPerformance: calculateDisciplinePerformance(recentGames, 'kk'),

      // Zeit-basiert
      recentForm: calculateRecentForm(recentGames.slice(-5)),
      peakPerformance: findPeakPerformance(games),

      // Vorhersage-Kraft
      predictability: calculatePredictability(scores),

      // Risiko-Analyse
      riskProfile: calculateRiskProfile(recentGames)
    };

    return metrics;
  }

  /**
   * Berechnet Konstanz-Score (0-100)
   */
  function calculateConsistencyScore(scores) {
    if (scores.length < 3) return 0;

    const variance = calculateVariance(scores);
    const maxVariance = 100; // Angenommener Maximalwert

    // Konvertiere zu 0-100 Skala (niedrigere Varianz = höhere Konstanz)
    const consistency = Math.max(0, 100 - (variance / maxVariance * 100));
    return Math.round(consistency);
  }

  /**
   * Berechnet Performance-Trend
   */
  function calculateLinearTrend(values) {
    if (values.length < 2) return 0;

    const n = values.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = values.reduce((sum, val, i) => sum + (val * i), 0);
    const sumX2 = values.reduce((sum, _, i) => sum + (i * i), 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    return slope;
  }

  /**
   * Berechnet Win-Trend
   */
  function calculateWinTrend(games) {
    if (games.length < 5) return 0;

    const recentWins = games.slice(-10).filter(g => g.result === 'win').length;
    const previousWins = games.slice(-20, -10).filter(g => g.result === 'win').length;

    return recentWins - previousWins; // Positive = besser, Negative = schlechter
  }

  function calculateConsistencyTrend(games) {
    if (games.length < 6) return 0;

    const midpoint = Math.floor(games.length / 2);
    const firstHalf = games.slice(0, midpoint);
    const secondHalf = games.slice(midpoint);
    const firstConsistency = calculateAverage(firstHalf.map(g => analyticsData.consistencyScores[g.id]?.score || g.consistency || 0));
    const secondConsistency = calculateAverage(secondHalf.map(g => analyticsData.consistencyScores[g.id]?.score || g.consistency || 0));

    return Math.round(secondConsistency - firstConsistency);
  }

  function calculatePressureTrend(games) {
    if (games.length < 6) return 0;

    const recent = games.slice(-5);
    const previous = games.slice(-10, -5);
    const recentScore = calculatePressurePerformance(recent).score || 0;
    const previousScore = calculatePressurePerformance(previous).score || 0;

    return recentScore - previousScore;
  }

  /**
   * Analysiert Performance unter Druck
   */
  function calculatePressurePerformance(games) {
    const pressureGames = games.filter(g =>
      Math.abs(Number(g.scoreDifference ?? ((g.playerScore || 0) - (g.botScore || 0)))) < 10 &&
      Number(g.shotsLeft ?? 0) <= 5
    );

    if (pressureGames.length === 0) return { score: 0, confidence: 0 };

    const pressureWins = pressureGames.filter(g => g.result === 'win').length;
    const avgScoreUnderPressure = calculateAverage(pressureGames.map(g => g.playerScore));

    return {
      score: Math.round((pressureWins / pressureGames.length) * 100),
      confidence: pressureGames.length >= 5 ? 80 : pressureGames.length * 16,
      avgScore: avgScoreUnderPressure,
      games: pressureGames.length
    };
  }

  /**
   * Berechnet Verbesserungs-Rate
   */
  function calculateImprovementRate(allGames) {
    if (!Array.isArray(allGames) || allGames.length < 4) return { rate: 0, confidence: 0 };

    const orderedGames = sortGamesByTimestamp(allGames);
    const midpoint = Math.floor(orderedGames.length / 2);
    const firstHalf = orderedGames.slice(0, midpoint);
    const secondHalf = orderedGames.slice(midpoint);

    if (firstHalf.length === 0 || secondHalf.length === 0) {
      return { rate: 0, confidence: 0 };
    }

    const firstHalfAvg = calculateAverage(firstHalf.map(g => g.playerScore));
    const secondHalfAvg = calculateAverage(secondHalf.map(g => g.playerScore));

    if (firstHalfAvg <= 0) {
      return {
        rate: 0,
        confidence: Math.min(80, orderedGames.length * 5)
      };
    }

    const improvement = ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100;

    return {
      rate: Math.round(improvement),
      confidence: Math.min(90, orderedGames.length * 5)
    };
  }

  /**
   * Analysiert Disziplin-Performance
   */
  function calculateDisciplinePerformance(games, disciplinePrefix) {
    const disciplineGames = games.filter(g =>
      g.discipline && g.discipline.toLowerCase().startsWith(disciplinePrefix)
    );

    if (disciplineGames.length === 0) return null;

    const scores = disciplineGames.map(g => g.playerScore);

    return {
      average: calculateAverage(scores),
      consistency: calculateConsistencyScore(scores),
      games: disciplineGames.length,
      winRate: disciplineGames.filter(g => g.result === 'win').length / disciplineGames.length,
      trend: calculateLinearTrend(scores)
    };
  }

  /**
   * Berechnet aktuelle Form (letzte 5 Spiele)
   */
  function calculateRecentForm(recentGames) {
    if (recentGames.length < 3) return 'insufficient_data';

    const scores = recentGames.map(g => g.playerScore);
    const wins = recentGames.filter(g => g.result === 'win').length;
    const trend = calculateLinearTrend(scores);

    if (trend > 10 && wins >= 3) return 'excellent';
    if (trend > 5 && wins >= 2) return 'good';
    if (trend > -5 && wins >= 1) return 'stable';
    if (trend < -10 || wins === 0) return 'poor';
    return 'declining';
  }

  /**
   * Findet beste Performance
   */
  function findPeakPerformance(games) {
    if (games.length === 0) return null;

    const bestGame = games.reduce((best, current) =>
      current.playerScore > best.playerScore ? current : best
    );

    return {
      score: bestGame.playerScore,
      date: bestGame.timestamp,
      discipline: bestGame.discipline,
      isRecent: (Date.now() - bestGame.timestamp) < (30 * 24 * 60 * 60 * 1000) // Letzte 30 Tage
    };
  }

  /**
   * Berechnet Vorhersagbarkeit
   */
  function calculatePredictability(scores) {
    if (scores.length < 10) return 0;

    // Verwende Autokorrelation für Vorhersagbarkeit
    const lag1Correlation = calculateAutocorrelation(scores, 1);
    return Math.round(Math.abs(lag1Correlation) * 100);
  }

  /**
   * Analysiert Risiko-Profil
   */
  function calculateRiskProfile(games) {
    const scores = games.map(g => g.playerScore);
    const variance = calculateVariance(scores);
    const maxScore = Math.max(...scores);
    const minScore = Math.min(...scores);
    const range = maxScore - minScore;

    if (variance < 10 && range < 30) return 'conservative';
    if (variance > 50 || range > 100) return 'aggressive';
    return 'balanced';
  }

  /**
   * Aktualisiert Trends
   */
  function updateTrends() {
    const games = analyticsData.games;
    if (games.length < CONFIG.minGamesForAnalysis) return;

    const recentGames = games.slice(-CONFIG.trendWindow);

    analyticsData.trends = {
      score: calculateLinearTrend(recentGames.map(g => g.playerScore)),
      consistency: calculateConsistencyTrend(recentGames),
      winRate: calculateWinTrend(recentGames),
      pressure: calculatePressureTrend(recentGames),
      lastUpdated: Date.now()
    };
  }

  /**
   * Aktualisiert Vorhersagen
   */
  function updatePredictions() {
    const games = analyticsData.games;
    if (games.length < CONFIG.minGamesForAnalysis) return;

    const metrics = calculatePerformanceMetrics();

    analyticsData.predictions = {
      nextGameScore: predictNextScore(games),
      expectedWinRate: predictWinRate(games),
      confidence: calculatePredictionConfidence(games),
      factors: identifyPredictionFactors(games),
      lastUpdated: Date.now()
    };
  }

  /**
   * Prognostiziert nächsten Score
   */
  function predictNextScore(games) {
    if (games.length < 5) return null;

    const recentGames = games.slice(-10);
    const recentScores = recentGames.map(g => g.playerScore);

    // Einfache Vorhersage: Trend + letzter Score
    const trend = calculateLinearTrend(recentScores);
    const lastScore = recentScores[recentScores.length - 1];

    const predicted = lastScore + trend;

    // Begrenze auf realistischen Bereich
    const minScore = Math.min(...recentScores) - 20;
    const maxScore = Math.max(...recentScores) + 20;

    return Math.max(minScore, Math.min(maxScore, predicted));
  }

  /**
   * Prognostiziert Win-Rate
   */
  function predictWinRate(games) {
    if (games.length < 10) return 0.5;

    const recentGames = games.slice(-20);
    const recentWinRate = recentGames.filter(g => g.result === 'win').length / recentGames.length;
    const trend = calculateWinTrend(recentGames);

    // Begrenze auf 0.1-0.9
    const predicted = Math.max(0.1, Math.min(0.9, recentWinRate + (trend * 0.05)));
    return Math.round(predicted * 100) / 100;
  }

  /**
   * Berechnet Vorhersage-Vertrauen
   */
  function calculatePredictionConfidence(games) {
    if (games.length < 20) return 0.3;

    const consistency = calculateConsistencyScore(games.map(g => g.playerScore)) / 100;
    const predictability = calculatePredictability(games.map(g => g.playerScore)) / 100;
    const sampleSize = Math.min(games.length / 100, 1); // Max 1.0 bei 100 Spielen

    const confidence = (consistency * 0.4 + predictability * 0.4 + sampleSize * 0.2);
    return Math.round(confidence * 100) / 100;
  }

  /**
   * Identifiziert Vorhersage-Faktoren
   */
  function identifyPredictionFactors(games) {
    const factors = [];

    if (games.length < 10) {
      factors.push({ type: 'insufficient_data', impact: -0.3, description: 'Zu wenig Daten' });
      return factors;
    }

    const recentGames = games.slice(-10);
    const recentScores = recentGames.map(g => g.playerScore);
    const trend = calculateLinearTrend(recentScores);

    if (trend > 5) {
      factors.push({ type: 'positive_trend', impact: 0.2, description: 'Positive Tendenz' });
    } else if (trend < -5) {
      factors.push({ type: 'negative_trend', impact: -0.2, description: 'Negative Tendenz' });
    }

    const consistency = calculateConsistencyScore(recentScores);
    if (consistency > 80) {
      factors.push({ type: 'high_consistency', impact: 0.15, description: 'Hohe Konstanz' });
    } else if (consistency < 30) {
      factors.push({ type: 'low_consistency', impact: -0.15, description: 'Niedrige Konstanz' });
    }

    const pressurePerf = calculatePressurePerformance(recentGames);
    if (pressurePerf.score > 70) {
      factors.push({ type: 'pressure_performer', impact: 0.1, description: 'Stark unter Druck' });
    }

    return factors;
  }

  /**
   * Aktualisiert Konstanz-Scores
   */
  function updateConsistencyScores() {
    const games = analyticsData.games;
    if (games.length < 5) return;

    // Berechne rollierende Konstanz
    for (let i = 4; i < games.length; i++) {
      const window = games.slice(Math.max(0, i - 9), i + 1);
      const scores = window.map(g => g.playerScore);
      const consistency = calculateConsistencyScore(scores);

      analyticsData.consistencyScores[games[i].id] = {
        score: consistency,
        gamesInWindow: scores.length,
        date: games[i].timestamp
      };
    }
  }

  /**
   * Berechnet Verbesserungsraten über verschiedene Zeiträume
   * @returns {{weekly: number, monthly: number, overall: number}}
   */
  function calculateImprovementRates() {
    const games = analyticsData.games;
    if (games.length < 2) return { weekly: 0, monthly: 0, overall: 0 };

    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;

    // Wöchentliche Verbesserung (letzte 7 Tage)
    const weeklyGames = games.filter(g => now - g.timestamp <= CONFIG.progressTracking.weeklyImprovementWindow * oneDay);
    const weeklyRate = calculateImprovementRate(weeklyGames);

    // Monatliche Verbesserung (letzte 30 Tage)
    const monthlyGames = games.filter(g => now - g.timestamp <= CONFIG.progressTracking.monthlyImprovementWindow * oneDay);
    const monthlyRate = calculateImprovementRate(monthlyGames);

    // Gesamtverbesserung (alle Spiele)
    const overallRate = calculateImprovementRate(games);

    return {
      weekly: weeklyRate.rate,
      monthly: monthlyRate.rate,
      overall: overallRate.rate
    };
  }

  /**
   * Verfolgt persönliche Bestleistungen pro Disziplin
   * @returns {Object} Persönliche Bestwerte pro Disziplin
   */
  function getPersonalBests() {
    const games = analyticsData.games;
    if (games.length === 0) return {};

    const bests = {};

    games.forEach(game => {
      const discipline = game.discipline || 'unknown';
      const score = game.playerScore;

      if (!bests[discipline] || score > bests[discipline].score) {
        bests[discipline] = {
          score: score,
          date: game.timestamp,
          gameId: game.id
        };
      }
    });

    return bests;
  }

  /**
   * Berechnet aktuelle Konsistenz-Streaks
   * @returns {{current: number, best: number}} Aktueller und bester Streak
   */
  function calculateConsistencyStreaks() {
    const games = analyticsData.games;
    if (games.length === 0) return { current: 0, best: 0 };

    const threshold = CONFIG.progressTracking.consistencyThreshold;
    const isConsistent = games.map(game =>
      (analyticsData.consistencyScores[game.id]?.score || 0) >= threshold
    );
    let currentStreak = 0;
    let bestStreak = 0;
    let tempStreak = 0;

    for (let i = isConsistent.length - 1; i >= 0; i--) {
      if (!isConsistent[i]) break;
      currentStreak++;
    }

    for (let i = 0; i < isConsistent.length; i++) {
      if (isConsistent[i]) tempStreak++;
      else tempStreak = 0;
      if (tempStreak > bestStreak) bestStreak = tempStreak;
    }

    return { current: currentStreak, best: bestStreak };
  }

  /**
   * Berechnet Meilenstein-Progress (wie nah am nächsten Level)
   * @returns {Object} Information über bevorstehende Meilensteine
   */
  function getMilestoneProgress() {
    const games = analyticsData.games;
    if (games.length === 0) return {};

    const totalGames = games.length;
    const winCount = games.filter(g => g.result === 'win').length;
    const bestScore = Math.max(...games.map(g => g.playerScore));

    // Definiere Meilensteine
    const gameMilestones = [10, 25, 50, 100, 250, 500];
    const winMilestones = [5, 10, 25, 50, 100];
    const scoreMilestones = [200, 400, 600, 800, 1000]; // Assuming max score ~100 per game

    const nextGameMilestone = gameMilestones.find(m => m > totalGames) || null;
    const nextWinMilestone = winMilestones.find(m => m > winCount) || null;
    const nextScoreMilestone = scoreMilestones.find(m => m > bestScore * (totalGames / 10)) || null; // Rough estimate

    return {
      games: {
        current: totalGames,
        next: nextGameMilestone,
        progress: nextGameMilestone ? Math.round((totalGames / nextGameMilestone) * 100) : 100
      },
      wins: {
        current: winCount,
        next: nextWinMilestone,
        progress: nextWinMilestone ? Math.round((winCount / nextWinMilestone) * 100) : 100
      },
      score: {
        current: Math.round(bestScore * (totalGames / 10)), // Estimated total points
        next: nextScoreMilestone,
        progress: nextScoreMilestone ? Math.round(((bestScore * (totalGames / 10)) / nextScoreMilestone) * 100) : 100
      }
    };
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

  function calculateAutocorrelation(values, lag) {
    if (values.length <= lag) return 0;

    const mean = calculateAverage(values);
    let numerator = 0;
    let denominator = 0;

    for (let i = lag; i < values.length; i++) {
      numerator += (values[i] - mean) * (values[i - lag] - mean);
    }

    for (let i = 0; i < values.length; i++) {
      denominator += Math.pow(values[i] - mean, 2);
    }

    return denominator === 0 ? 0 : numerator / denominator;
  }

  function sortGamesByTimestamp(games) {
    return [...games].sort((a, b) => (Number(a?.timestamp) || 0) - (Number(b?.timestamp) || 0));
  }

  function calculateShotConsistency(shots) {
    if (!shots || shots.length === 0) return 0;

    const rings = shots.map(s => s.ring || 0).filter(r => r > 0);
    if (rings.length === 0) return 0;

    return calculateConsistencyScore(rings);
  }

  function identifyPressureMoments(gameData) {
    const moments = [];

    if (gameData.shots && gameData.shots.length > 0) {
      // Identifiziere kritische Phasen (z.B. letzte 3 Schüsse bei knappem Spiel)
      const lastShots = gameData.shots.slice(-3);
      const scoreDifference = Number(gameData.scoreDifference ?? ((gameData.playerScore || 0) - (gameData.botScore || 0)));
      const wasClose = Math.abs(scoreDifference) < 5;

      if (wasClose) {
        moments.push({
          type: 'final_stretch',
          shots: lastShots,
          pressure: 'high'
        });
      }
    }

    return moments;
  }

  function calculateDuration(gameData) {
    // Schätzung basierend auf Shot-Anzahl
    const shotCount = gameData.shots ? gameData.shots.length : 40;
    return shotCount * 15; // 15 Sekunden pro Schuss
  }

  function generateGameId() {
    return 'game_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Erstellt Analytics-Zusammenfassung
   */
  function getAnalyticsSummary() {
    const metrics = calculatePerformanceMetrics();
    const trends = analyticsData.trends;
    const predictions = analyticsData.predictions;

    return {
      metrics: metrics,
      trends: trends,
      predictions: predictions,
      totalGames: analyticsData.games.length,
      lastUpdated: Date.now()
    };
  }

  /**
   * Erstellt detaillierte Analytics-UI
   */
  function createAnalyticsUI() {
    const summary = getAnalyticsSummary();
    const metrics = summary.metrics;
    const improvementRates = calculateImprovementRates();
    const personalBests = getPersonalBests();
    const consistencyStreaks = calculateConsistencyStreaks();
    const milestoneProgress = getMilestoneProgress();

    if (!summary.totalGames) {
      return `
        <div class="enhanced-analytics">
          <div class="analytics-header">
            <h3>📊 Erweiterte Analysen</h3>
            <div class="analytics-summary">
              <span>Noch keine Spiele analysiert</span>
            </div>
          </div>
          <div class="metric-card">
            <div class="metric-title">Bereit sobald du loslegst</div>
            <div class="metric-sub">Spiele ein Duell, damit Trends, Form und Vorhersagen erscheinen.</div>
          </div>
        </div>
      `;
    }

    // Verbesserte Form-Anzeige
    const formDetails = {
      excellent: { emoji: '🚀', text: 'Exzellente Form', color: '#7ab030' },
      good: { emoji: '📈', text: 'Gute Form', color: '#00c3ff' },
      stable: { emoji: '📊', text: 'Stabil', color: '#ffc107' },
      declining: { emoji: '📉', text: 'Rückläufig', color: '#ff9800' },
      poor: { emoji: '💥', text: 'Schwache Form', color: '#f06050' },
      insufficient_data: { emoji: '❓', text: 'Zu wenig Daten', color: 'rgba(255,255,255,0.4)' }
    };
    const currentForm = formDetails[metrics.recentForm] || formDetails.insufficient_data;

    // Risiko-Profil Details
    const riskDetails = {
      conservative: { emoji: '🛡️', text: 'Konservativ – Gleichmäßige Leistung', color: '#4caf50' },
      balanced: { emoji: '⚖️', text: 'Ausgeglichen – Balance zwischen Risiko und Konstanz', color: '#2196f3' },
      aggressive: { emoji: '🎯', text: 'Aggressiv – Hohe Schwankungen', color: '#ff5722' }
    };
    const currentRisk = riskDetails[metrics.riskProfile] || riskDetails.balanced;

    return `
      <div class="enhanced-analytics">
        <div class="analytics-header">
          <h3>📊 Erweiterte Analysen</h3>
          <div class="analytics-summary">
            <span>${summary.totalGames} Spiele analysiert</span>
          </div>
        </div>

        <!-- ══ KERNDATEN ══ -->
        <div style="margin-bottom:16px;">
          <div style="font-size:0.7rem;color:rgba(255,255,255,0.4);font-weight:600;letter-spacing:0.05em;margin-bottom:8px;">▸ KERNDATEN</div>
          <div class="analytics-grid">
            <div class="metric-card primary">
              <div class="metric-title">Durchschnitt</div>
              <div class="metric-value">${metrics.averageScore.toFixed(1)}</div>
              <div class="metric-trend ${metrics.scoreTrend > 0 ? 'positive' : 'negative'}">
                ${metrics.scoreTrend > 0 ? '↗ +' : '↘ '}${Math.abs(metrics.scoreTrend).toFixed(1)}
              </div>
            </div>

            <div class="metric-card">
              <div class="metric-title">Konstanz</div>
              <div class="metric-value">${metrics.consistencyScore}%</div>
              <div class="metric-bar">
                <div class="metric-fill" style="width: ${metrics.consistencyScore}%"></div>
              </div>
            </div>

            <div class="metric-card">
              <div class="metric-title">Win-Rate</div>
              <div class="metric-value">${(metrics.winRate * 100).toFixed(1)}%</div>
              <div class="metric-trend ${metrics.winTrend > 0 ? 'positive' : 'negative'}">
                ${metrics.winTrend > 0 ? '↗ +' : '↘ '}${Math.abs(metrics.winTrend)}
              </div>
            </div>
          </div>
        </div>

        <!-- ══ FORM & RISIKO ══ -->
        <div style="margin-bottom:16px;">
          <div style="font-size:0.7rem;color:rgba(255,255,255,0.4);font-weight:600;letter-spacing:0.05em;margin-bottom:8px;">▸ AKTUELLE FORM & RISIKO</div>
          <div class="analytics-grid">
            <div class="metric-card">
              <div class="metric-title">Aktuelle Form</div>
              <div class="metric-value" style="font-size:1.8rem;">${currentForm.emoji}</div>
              <div class="metric-sub" style="color:${currentForm.color}">${currentForm.text}</div>
            </div>

            <div class="metric-card">
              <div class="metric-title">Risiko-Profil</div>
              <div class="metric-value" style="font-size:1.8rem;">${currentRisk.emoji}</div>
              <div class="metric-sub" style="color:${currentRisk.color}">${currentRisk.text}</div>
            </div>

            <div class="metric-card">
              <div class="metric-title">Druck-Performance</div>
              <div class="metric-value">${metrics.pressurePerformance.score}%</div>
              <div class="metric-sub">${metrics.pressurePerformance.games} Druck-Spiele</div>
            </div>
          </div>
        </div>

        <!-- ══ VERBESSERUNGS-RATEN ══ -->
        <div style="margin-bottom:16px;">
          <div style="font-size:0.7rem;color:rgba(255,255,255,0.4);font-weight:600;letter-spacing:0.05em;margin-bottom:8px;">▸ VERBESSERUNGS-RATEN</div>
          <div class="analytics-grid">
            <div class="metric-card ${improvementRates.weekly > 0 ? 'positive' : improvementRates.weekly < 0 ? 'negative' : ''}">
              <div class="metric-title">Letzte 7 Tage</div>
              <div class="metric-value" style="color:${improvementRates.weekly > 0 ? '#7ab030' : improvementRates.weekly < 0 ? '#f06050' : '#fff'};">
                ${improvementRates.weekly > 0 ? '↗ +' : ''}${improvementRates.weekly.toFixed(0)}%
              </div>
              <div class="metric-sub">Wöchentliche Tendenz</div>
            </div>

            <div class="metric-card ${improvementRates.monthly > 0 ? 'positive' : improvementRates.monthly < 0 ? 'negative' : ''}">
              <div class="metric-title">Letzte 30 Tage</div>
              <div class="metric-value" style="color:${improvementRates.monthly > 0 ? '#7ab030' : improvementRates.monthly < 0 ? '#f06050' : '#fff'};">
                ${improvementRates.monthly > 0 ? '↗ +' : ''}${improvementRates.monthly.toFixed(0)}%
              </div>
              <div class="metric-sub">Monatliche Tendenz</div>
            </div>

            <div class="metric-card ${improvementRates.overall > 0 ? 'positive' : improvementRates.overall < 0 ? 'negative' : ''}">
              <div class="metric-title">Gesamt</div>
              <div class="metric-value" style="color:${improvementRates.overall > 0 ? '#7ab030' : improvementRates.overall < 0 ? '#f06050' : '#fff'};">
                ${improvementRates.overall > 0 ? '↗ +' : ''}${improvementRates.overall.toFixed(0)}%
              </div>
              <div class="metric-sub">Gesamte Entwicklung</div>
            </div>
          </div>
        </div>

        <!-- ══ KONSISTENZ-STREAKS ══ -->
        <div style="margin-bottom:16px;">
          <div style="font-size:0.7rem;color:rgba(255,255,255,0.4);font-weight:600;letter-spacing:0.05em;margin-bottom:8px;">▸ KONSISTENZ-STREAKS</div>
          <div class="analytics-grid">
            <div class="metric-card">
              <div class="metric-title">Aktueller Streak</div>
              <div class="metric-value" style="color:#ff9500;">🔥 ${consistencyStreaks.current}</div>
              <div class="metric-sub">Spiele mit ≥5% Konstanz</div>
            </div>

            <div class="metric-card">
              <div class="metric-title">Bester Streak</div>
              <div class="metric-value" style="color:#ffd700;">👑 ${consistencyStreaks.best}</div>
              <div class="metric-sub">Rekord-Konsistenz-Serie</div>
            </div>

            <div class="metric-card">
              <div class="metric-title">Vorhersage-Kraft</div>
              <div class="metric-value">${metrics.predictability}%</div>
              <div class="metric-sub">Wie berechenbar du bist</div>
            </div>
          </div>
        </div>

        <!-- ══ PERSÖNLICHE BESTWERTE ══ -->
        ${Object.keys(personalBests).length > 0 ? `
        <div style="margin-bottom:16px;">
          <div style="font-size:0.7rem;color:rgba(255,255,255,0.4);font-weight:600;letter-spacing:0.05em;margin-bottom:8px;">▸ PERSÖNLICHE BESTWERTE</div>
          <div class="analytics-grid">
            ${Object.entries(personalBests).slice(0, 3).map(([disc, best]) => `
              <div class="metric-card">
                <div class="metric-title">${disc.toUpperCase()}</div>
                <div class="metric-value" style="color:#ffd700;">${best.score.toFixed(1)}</div>
                <div class="metric-sub">PB · ${new Date(best.date).toLocaleDateString('de-DE', {day:'2-digit',month:'short'})}</div>
              </div>
            `).join('')}
          </div>
        </div>
        ` : ''}

        <!-- ══ MEILENSTEINE ══ -->
        ${milestoneProgress.games && milestoneProgress.games.next ? `
        <div style="margin-bottom:16px;">
          <div style="font-size:0.7rem;color:rgba(255,255,255,0.4);font-weight:600;letter-spacing:0.05em;margin-bottom:8px;">▸ MEILENSTEINE</div>
          <div class="analytics-grid">
            <div class="metric-card">
              <div class="metric-title">Spiele</div>
              <div class="metric-value">${milestoneProgress.games.current}</div>
              <div class="metric-sub">Nächstes Ziel: ${milestoneProgress.games.next} (${milestoneProgress.games.progress}%)</div>
              <div class="metric-bar"><div class="metric-fill" style="width:${milestoneProgress.games.progress}%"></div></div>
            </div>
            <div class="metric-card">
              <div class="metric-title">Siege</div>
              <div class="metric-value">${milestoneProgress.wins.current}</div>
              <div class="metric-sub">Nächstes Ziel: ${milestoneProgress.wins.next} (${milestoneProgress.wins.progress}%)</div>
              <div class="metric-bar"><div class="metric-fill" style="width:${milestoneProgress.wins.progress}%"></div></div>
            </div>
          </div>
        </div>
        ` : ''}

        <!-- ══ VORHERSAGEN ══ -->
        ${summary.predictions && summary.predictions.nextGameScore !== null && summary.predictions.nextGameScore !== undefined ? `
        <div style="margin-bottom:16px;">
          <div style="font-size:0.7rem;color:rgba(255,255,255,0.4);font-weight:600;letter-spacing:0.05em;margin-bottom:8px;">▸ VORHERSAGEN</div>
          <div class="analytics-grid">
            <div class="metric-card">
              <div class="metric-title">Erwarteter Score</div>
              <div class="metric-value" style="color:#00c3ff;">${summary.predictions.nextGameScore.toFixed(1)}</div>
              <div class="metric-sub">${(summary.predictions.confidence * 100).toFixed(0)}% Sicherheit</div>
            </div>
            <div class="metric-card">
              <div class="metric-title">Erwartete Win-Rate</div>
              <div class="metric-value">${(summary.predictions.expectedWinRate * 100).toFixed(1)}%</div>
              <div class="metric-sub">${(summary.predictions.factors || []).length} Einflussfaktoren</div>
            </div>
            ${(summary.predictions.factors || []).length > 0 ? `
            <div class="metric-card">
              <div class="metric-title">Einflussfaktoren</div>
              <div style="margin-top:6px;">
                ${(summary.predictions.factors || []).slice(0, 3).map(f => `
                  <div style="font-size:0.65rem;color:rgba(255,255,255,0.6);margin-bottom:4px;">
                    ${f.impact > 0 ? '<span style="color:#7ab030;">↗</span>' : f.impact < 0 ? '<span style="color:#f06050;">↘</span>' : '→'} ${f.description}
                  </div>
                `).join('')}
              </div>
            </div>
            ` : ''}
          </div>
        </div>
        ` : ''}

        <!-- ══ TRENDS ══ -->
        ${typeof summary.trends.score === 'number' ? `
        <div style="margin-bottom:16px;">
          <div style="font-size:0.7rem;color:rgba(255,255,255,0.4);font-weight:600;letter-spacing:0.05em;margin-bottom:8px;">▸ TRENDS (letzte 20 Spiele)</div>
          <div class="analytics-grid">
            <div class="metric-card">
              <div class="metric-title">Score-Trend</div>
              <div class="metric-value ${summary.trends.score > 0 ? 'positive' : 'negative'}">
                ${summary.trends.score > 0 ? '↗ +' : ''}${summary.trends.score.toFixed(2)}
              </div>
              <div class="metric-sub">Pro Spiel</div>
            </div>
            <div class="metric-card">
              <div class="metric-title">Win-Rate-Trend</div>
              <div class="metric-value ${summary.trends.winRate > 0 ? 'positive' : 'negative'}">
                ${summary.trends.winRate > 0 ? '↗ +' : ''}${summary.trends.winRate.toFixed(1)}
              </div>
              <div class="metric-sub">Letzte 20 Spiele</div>
            </div>
            <div class="metric-card">
              <div class="metric-title">Druck-Trend</div>
              <div class="metric-value ${summary.trends.pressure > 0 ? 'positive' : 'negative'}">
                ${summary.trends.pressure > 0 ? '↗ +' : ''}${summary.trends.pressure.toFixed(1)}
              </div>
              <div class="metric-sub">Unter Druck</div>
            </div>
          </div>
        </div>
        ` : ''}
      </div>
    `;
  }

  /**
   * Helper-Funktionen für UI
   */
  function getFormEmoji(form) {
    const emojis = {
      excellent: '🚀',
      good: '📈',
      stable: '📊',
      declining: '📉',
      poor: '💥',
      insufficient_data: '❓'
    };
    return emojis[form] || '❓';
  }

  function getFormText(form) {
    const texts = {
      excellent: 'Exzellent',
      good: 'Gut',
      stable: 'Stabil',
      declining: 'Rückläufig',
      poor: 'Schlecht',
      insufficient_data: 'Zu wenig Daten'
    };
    return texts[form] || 'Unbekannt';
  }

  function getRiskEmoji(risk) {
    const emojis = {
      conservative: '🛡️',
      balanced: '⚖️',
      aggressive: '🎯'
    };
    return emojis[risk] || '❓';
  }

  /**
   * Öffentliche API
   */
  return {
    init,
    addGameData,
    calculatePerformanceMetrics,
    getAnalyticsSummary,
    renderUI,
    createAnalyticsUI,
    // Neue Fortschritts-Tracking Methoden
    calculateImprovementRates,
    getPersonalBests,
    calculateConsistencyStreaks,
    getMilestoneProgress,
    CONFIG
  };
})();

// Initialisierung
if (typeof window !== 'undefined') {
  document.addEventListener('DOMContentLoaded', function() {
    EnhancedAnalytics.init();
  });
}
