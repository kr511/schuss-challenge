/**
 * Contextual OCR System
 * OCR mit Kontext-basierter Fehlerkorrektur und Plausibilitätsprüfung
 */

const ContextualOCR = (function() {
  'use strict';
  
  // Konfiguration
  const CONFIG = {
    minConfidence: 0.7,
    maxScoreDifference: 50,
    trendAnalysisGames: 5,
    storageKey: 'sd_ocr_context',
    enableContextualCorrections: true,
    enableTrendAnalysis: true,
    enablePlausibilityCheck: true
  };
  
  // OCR-Kontext-Daten
  let ocrContext = {
    lastScores: [],
    discipline: null,
    weapon: null,
    corrections: [],
    statistics: {
      totalAttempts: 0,
      successfulCorrections: 0,
      failedCorrections: 0,
      confidenceImprovements: 0
    }
  };
  
  /**
   * Initialisiert das kontextuelle OCR-System
   */
  function init() {
    loadContext();
    console.log('🔍 Contextual OCR System initialisiert');
  }
  
  /**
   * Lädt gespeicherten Kontext aus LocalStorage
   */
  function loadContext() {
    try {
      const saved = localStorage.getItem(CONFIG.storageKey);
      if (saved) {
        ocrContext = JSON.parse(saved);
        console.log('💾 OCR-Kontext geladen:', ocrContext.lastScores.length, 'letzte Scores');
      }
    } catch (e) {
      console.warn('⚠️ Konnte OCR-Kontext nicht laden:', e);
    }
  }
  
  /**
   * Speichert OCR-Kontext in LocalStorage
   */
  function saveContext() {
    try {
      localStorage.setItem(CONFIG.storageKey, JSON.stringify(ocrContext));
    } catch (e) {
      console.warn('⚠️ Konnte OCR-Kontext nicht speichern:', e);
    }
  }
  
  /**
   * Setzt den aktuellen Spiel-Kontext
   */
  function setGameContext(discipline, weapon) {
    ocrContext.discipline = discipline;
    ocrContext.weapon = weapon;
    console.log(`🔍 Spiel-Kontext gesetzt: ${discipline} (${weapon})`);
  }
  
  /**
   * Fügt einen bestätigten Score zum Kontext hinzu
   */
  function addConfirmedScore(score) {
    const scoreValue = parseFloat(score);
    if (isNaN(scoreValue)) return;
    
    ocrContext.lastScores.push({
      value: scoreValue,
      timestamp: Date.now(),
      discipline: ocrContext.discipline,
      weapon: ocrContext.weapon
    });
    
    // Maximal 20 letzte Scores behalten
    if (ocrContext.lastScores.length > 20) {
      ocrContext.lastScores = ocrContext.lastScores.slice(-20);
    }
    
    saveContext();
  }
  
  /**
   * Analysiert OCR-Ergebnis mit Kontext
   */
  function analyzeWithContext(ocrResult, rawText, discipline, weapon) {
    if (!CONFIG.enableContextualCorrections) {
      return ocrResult;
    }
    
    // Sicherstellen, dass ocrResult.text existiert (Kompatibilität mit image-compare.js Format)
    if (!ocrResult.text && ocrResult.bestMatch) {
      ocrResult.text = String(ocrResult.bestMatch.value);
    } else if (!ocrResult.text) {
      ocrResult.text = rawText || '';
    }
    
    ocrContext.statistics.totalAttempts++;
    
    const context = buildContext(discipline, weapon);
    const analysis = {
      original: ocrResult,
      context: context,
      corrections: [],
      confidence: ocrResult.confidence || 0.5
    };
    
    // Plausibilitätsprüfung
    if (CONFIG.enablePlausibilityCheck) {
      const plausibilityCheck = checkPlausibility(ocrResult, context);
      if (!plausibilityCheck.isPlausible) {
        analysis.corrections.push({
          type: 'plausibility',
          reason: plausibilityCheck.reason,
          suggested: plausibilityCheck.suggestion,
          confidence: plausibilityCheck.confidence
        });
        analysis.confidence = Math.min(analysis.confidence, plausibilityCheck.confidence);
      }
    }
    
    // Trend-Analyse
    if (CONFIG.enableTrendAnalysis && context.recentScores.length >= 2) {
      const trendAnalysis = analyzeTrend(ocrResult, context);
      if (trendAnalysis.needsCorrection) {
        analysis.corrections.push({
          type: 'trend',
          reason: trendAnalysis.reason,
          suggested: trendAnalysis.suggestion,
          confidence: trendAnalysis.confidence
        });
        analysis.confidence = Math.min(analysis.confidence, trendAnalysis.confidence);
      }
    }
    
    // Disziplin-spezifische Korrekturen
    const disciplineCorrection = applyDisciplineCorrections(ocrResult, context);
    if (disciplineCorrection.isCorrected) {
      analysis.corrections.push({
        type: 'discipline',
        reason: disciplineCorrection.reason,
        suggested: disciplineCorrection.suggestion,
        confidence: disciplineCorrection.confidence
      });
      analysis.confidence = Math.min(analysis.confidence, disciplineCorrection.confidence);
    }
    
    // Wende beste Korrektur an
    const bestCorrection = selectBestCorrection(analysis.corrections);
    if (bestCorrection) {
      analysis.corrected = applyCorrection(ocrResult, bestCorrection);
      ocrContext.statistics.successfulCorrections++;
      ocrContext.corrections.push({
        original: ocrResult.text,
        corrected: bestCorrection.suggested,
        type: bestCorrection.type,
        timestamp: Date.now(),
        confidence: bestCorrection.confidence
      });
    } else {
      analysis.corrected = ocrResult;
    }
    
    saveContext();
    return buildFinalResult(analysis);
  }
  
  /**
   * Erstellt Spiel-Kontext
   */
  function buildContext(discipline, weapon) {
    const expectedRange = getExpectedRange(discipline);
    const recentScores = getRecentScores(CONFIG.trendAnalysisGames);
    const trend = calculateTrend(recentScores);
    
    return {
      discipline: discipline,
      weapon: weapon,
      expectedRange: expectedRange,
      recentScores: recentScores,
      trend: trend,
      averageScore: recentScores.length > 0 ? 
        recentScores.reduce((sum, s) => sum + s.value, 0) / recentScores.length : null
    };
  }
  
  /**
   * Ermittelt erwarteten Score-Bereich für Disziplin
   */
  function getExpectedRange(discipline) {
    const ranges = {
      'lg40': { min: 300, max: 436, typical: 380, tolerance: 50 },
      'lg60': { min: 450, max: 654, typical: 570, tolerance: 60 },
      'kk50': { min: 400, max: 600, typical: 500, tolerance: 50 },
      'kk100': { min: 400, max: 600, typical: 500, tolerance: 50 },
      'kk3x20': { min: 450, max: 600, typical: 525, tolerance: 40 }
    };
    
    return ranges[discipline] || ranges['lg40'];
  }
  
  /**
   * Holt letzte Scores
   */
  function getRecentScores(count) {
    return ocrContext.lastScores.slice(-count);
  }
  
  /**
   * Berechnet Trend aus Scores
   */
  function calculateTrend(scores) {
    if (scores.length < 2) return { direction: 'stable', strength: 0 };
    
    const values = scores.map(s => s.value);
    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));
    
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    
    const difference = secondAvg - firstAvg;
    const strength = Math.abs(difference) / Math.max(...values) * 100;
    
    let direction = 'stable';
    if (difference > 10) direction = 'improving';
    else if (difference < -10) direction = 'declining';
    
    return { direction, strength, difference };
  }
  
  /**
   * Prüft Plausibilität des OCR-Ergebnisses
   */
  function checkPlausibility(ocrResult, context) {
    const score = parseFloat(ocrResult.text);
    const expected = context.expectedRange;
    
    if (isNaN(score)) {
      return {
        isPlausible: false,
        reason: 'Keine gültige Zahl erkannt',
        suggestion: findBestNumericAlternative(ocrResult),
        confidence: 0.3
      };
    }
    
    // Prüfe ob Score im erwarteten Bereich liegt
    if (score < expected.min - expected.tolerance || score > expected.max + expected.tolerance) {
      return {
        isPlausible: false,
        reason: `Score ${score} außerhalb des erwarteten Bereichs (${expected.min}-${expected.max})`,
        suggestion: adjustToRange(score, expected),
        confidence: 0.6
      };
    }
    
    // Prüfe auf unrealistische Sprünge
    if (context.recentScores.length > 0) {
      const lastScore = context.recentScores[context.recentScores.length - 1].value;
      const jump = Math.abs(score - lastScore);
      if (jump > CONFIG.maxScoreDifference) {
        return {
          isPlausible: false,
          reason: `Unrealistischer Sprung von ${lastScore} auf ${score}`,
          suggestion: interpolateScore(score, lastScore),
          confidence: 0.7
        };
      }
    }
    
    return { isPlausible: true };
  }
  
  /**
   * Analysiert Trend und warnt bei Abweichungen (KEINE Score-Manipulation!)
   */
  function analyzeTrend(ocrResult, context) {
    if (context.trend.direction === 'stable' || context.recentScores.length === 0) {
      return { needsCorrection: false };
    }

    const score = parseFloat(ocrResult.text);
    const lastScore = context.recentScores[context.recentScores.length - 1].value;
    const trend = context.trend;

    // Wenn verbessernder Trend, aber Score ist schlechter als letzter → NUR WARNUNG
    if (trend.direction === 'improving' && score < lastScore - 15) {
      return {
        needsCorrection: false,  // KEINE Korrektur - nur Warning!
        reason: `Ungewöhnlicher Abfall: ${score} vs. Trend (~${lastScore})`,
        suggestion: score,  // Originalwert beibehalten
        confidence: 0.4,  // Niedrige Confidence signalisiert Unsicherheit
        warning: true
      };
    }

    // Wenn absteigender Trend, aber Score ist viel besser → NUR WARNUNG
    if (trend.direction === 'declining' && score > lastScore + 30) {
      return {
        needsCorrection: false,  // KEINE Korrektur - nur Warning!
        reason: `Ungewöhnlicher Anstieg: ${score} vs. Trend (~${lastScore})`,
        suggestion: score,  // Originalwert beibehalten
        confidence: 0.4,  // Niedrige Confidence signalisiert Unsicherheit
        warning: true
      };
    }

    return { needsCorrection: false };
  }
  
  /**
   * Wendet disziplin-spezifische Korrekturen an
   */
  function applyDisciplineCorrections(ocrResult, context) {
    const score = parseFloat(ocrResult.text);
    const discipline = context.discipline;
    
    // Guard: Falls keine Disziplin gesetzt ist, keine Korrekturen anwenden
    if (!discipline || typeof discipline !== 'string') {
      return { isCorrected: false };
    }
    
    // KK (Kleinkaliber) - nur ganze Zahlen
    if (discipline.startsWith('kk')) {
      if (!Number.isInteger(score)) {
        return {
          isCorrected: true,
          reason: 'KK-Disziplinen verwenden nur ganze Zahlen',
          suggestion: Math.round(score),
          confidence: 0.8
        };
      }
    }
    
    // LG (Luftgewehr) - Dezimalzahlen erlaubt
    if (discipline.startsWith('lg')) {
      // Prüfe auf typische OCR-Fehler bei Dezimalzahlen
      if (score > context.expectedRange.typical + 20) {
        // Vielleicht wurde 405.2 als 4052 erkannt
        const corrected = score / 10;
        if (corrected >= context.expectedRange.min && corrected <= context.expectedRange.max) {
          return {
            isCorrected: true,
            reason: 'Möglicherweise fehlendes Dezimalkomma',
            suggestion: corrected,
            confidence: 0.7
          };
        }
      }
    }
    
    return { isCorrected: false };
  }
  
  /**
   * Findet beste numerische Alternative
   */
  function findBestNumericAlternative(ocrResult) {
    // Extrahiere alle Zahlen aus dem Text
    const text = ocrResult.text || (ocrResult.bestMatch ? String(ocrResult.bestMatch.value) : '');
    const numbers = text.match(/\d+/g);
    if (!numbers || numbers.length === 0) return '0';
    
    // Wähle die wahrscheinlichste Zahl
    const candidates = numbers.map(n => parseInt(n));
    return Math.max(...candidates).toString();
  }
  
  /**
   * Passt Score an erwarteten Bereich an
   */
  function adjustToRange(score, expectedRange) {
    if (score < expectedRange.min) {
      return Math.max(score, expectedRange.min - expectedRange.tolerance / 2);
    }
    if (score > expectedRange.max) {
      return Math.min(score, expectedRange.max + expectedRange.tolerance / 2);
    }
    return score;
  }
  
  /**
   * Interpoliert zwischen zwei Scores
   */
  function interpolateScore(current, last) {
    const avg = (current + last) / 2;
    return Math.round(avg * 10) / 10;
  }
  
  /**
   * Wählt beste Korrektur
   */
  function selectBestCorrection(corrections) {
    if (corrections.length === 0) return null;
    
    // Sortiere nach Konfidenz und Typ
    const priority = {
      'discipline': 3,
      'plausibility': 2,
      'trend': 1
    };
    
    corrections.sort((a, b) => {
      const priorityDiff = priority[b.type] - priority[a.type];
      if (priorityDiff !== 0) return priorityDiff;
      return b.confidence - a.confidence;
    });
    
    return corrections[0];
  }
  
  /**
   * Wendet Korrektur an
   */
  function applyCorrection(ocrResult, correction) {
    return {
      text: correction.suggested.toString(),
      confidence: correction.confidence,
      type: 'corrected',
      correctionType: correction.type,
      original: ocrResult.text,
      reason: correction.reason
    };
  }
  
  /**
   * Erstellt finale OCR-Analyse
   */
  function buildFinalResult(analysis) {
    const result = {
      text: analysis.corrected.text,
      confidence: analysis.corrected.confidence,
      original: analysis.original.text,
      corrections: analysis.corrections,
      context: {
        discipline: analysis.context.discipline,
        expectedRange: analysis.context.expectedRange,
        trend: analysis.context.trend,
        recentAverage: analysis.context.averageScore
      }
    };
    
    // Verbesserte Konfidenz bei erfolgreichen Korrekturen
    if (analysis.corrections.length > 0) {
      result.corrected = true;
      result.confidence = Math.min(0.95, result.confidence + 0.1);
      ocrContext.statistics.confidenceImprovements++;
    }
    
    return result;
  }
  
  /**
   * Zeigt OCR-Korrektur-Dialog
   */
  function showCorrectionDialog(ocrResult, context, onAccept, onReject) {
    const dialog = document.createElement('div');
    dialog.className = 'ocr-correction-dialog';
    dialog.innerHTML = `
      <div class="ocr-correction-overlay">
        <div class="ocr-correction-content">
          <h4>🔍 OCR-Korrektur-Vorschlag</h4>
          <div class="ocr-original">
            <label>Original erkannt:</label>
            <span class="original-text">${ocrResult.text}</span>
            <span class="original-confidence">(Konfidenz: ${Math.round(ocrResult.confidence * 100)}%)</span>
          </div>
          <div class="ocr-corrected">
            <label>Vorgeschlagene Korrektur:</label>
            <span class="corrected-text">${context.corrected.text}</span>
            <span class="corrected-confidence">(Konfidenz: ${Math.round(context.corrected.confidence * 100)}%)</span>
          </div>
          <div class="correction-reason">
            <strong>Grund:</strong> ${context.corrections[0].reason}
          </div>
          <div class="correction-context">
            <strong>Kontext:</strong>
            <ul>
              <li>Disziplin: ${context.context.discipline}</li>
              <li>Erwarteter Bereich: ${context.context.expectedRange.min}-${context.context.expectedRange.max}</li>
              <li>Trend: ${context.context.trend.direction}</li>
            </ul>
          </div>
          <div class="correction-actions">
            <button class="btn-accept-correction" onclick="this.parentElement.dispatchEvent(new CustomEvent('accept'))">
              ✓ Korrektur annehmen
            </button>
            <button class="btn-reject-correction" onclick="this.parentElement.dispatchEvent(new CustomEvent('reject'))">
              ✗ Original behalten
            </button>
          </div>
        </div>
      </div>
    `;
    
    // CSS hinzufügen
    addCorrectionDialogStyles();
    
    // Event-Listener
    dialog.addEventListener('accept', () => {
      onAccept(context.corrected);
      document.body.removeChild(dialog);
    });
    
    dialog.addEventListener('reject', () => {
      onReject(ocrResult);
      document.body.removeChild(dialog);
    });
    
    document.body.appendChild(dialog);
  }
  
  /**
   * Fügt Styles für Korrektur-Dialog hinzu
   */
  function addCorrectionDialogStyles() {
    if (document.getElementById('ocr-correction-styles')) return;
    
    const styles = `
      <style id="ocr-correction-styles">
        .ocr-correction-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
        }
        
        .ocr-correction-content {
          background: #1a1f14;
          border: 1px solid #7ab030;
          border-radius: 12px;
          padding: 24px;
          max-width: 400px;
          width: 90%;
          color: #e8e8e0;
        }
        
        .ocr-correction-content h4 {
          margin: 0 0 16px 0;
          color: #7ab030;
        }
        
        .ocr-original, .ocr-corrected {
          margin: 12px 0;
          padding: 12px;
          border-radius: 8px;
        }
        
        .ocr-original {
          background: rgba(255, 100, 100, 0.1);
          border: 1px solid rgba(255, 100, 100, 0.3);
        }
        
        .ocr-corrected {
          background: rgba(100, 255, 100, 0.1);
          border: 1px solid rgba(100, 255, 100, 0.3);
        }
        
        .correction-reason, .correction-context {
          margin: 12px 0;
          padding: 12px;
          background: rgba(122, 176, 48, 0.1);
          border-radius: 8px;
        }
        
        .correction-context ul {
          margin: 8px 0;
          padding-left: 20px;
        }
        
        .correction-actions {
          display: flex;
          gap: 12px;
          margin-top: 20px;
        }
        
        .btn-accept-correction,
        .btn-reject-correction {
          flex: 1;
          padding: 12px;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        
        .btn-accept-correction {
          background: #7ab030;
          color: #1a1f14;
        }
        
        .btn-reject-correction {
          background: rgba(255, 100, 100, 0.2);
          color: #e8e8e0;
          border: 1px solid rgba(255, 100, 100, 0.4);
        }
        
        .btn-accept-correction:hover,
        .btn-reject-correction:hover {
          transform: translateY(-1px);
        }
      </style>
    `;
    
    document.head.insertAdjacentHTML('beforeend', styles);
  }
  
  /**
   * Holt OCR-Statistiken
   */
  function getStatistics() {
    return {
      ...ocrContext.statistics,
      successRate: ocrContext.statistics.totalAttempts > 0 ? 
        ocrContext.statistics.successfulCorrections / ocrContext.statistics.totalAttempts : 0,
      recentCorrections: ocrContext.corrections.slice(-5),
      contextInfo: {
        lastScoresCount: ocrContext.lastScores.length,
        discipline: ocrContext.discipline,
        weapon: ocrContext.weapon
      }
    };
  }
  
  /**
   * Öffentliche API
   */
  return {
    init,
    setGameContext,
    addConfirmedScore,
    analyzeWithContext,
    showCorrectionDialog,
    getStatistics,
    CONFIG
  };
})();

// Initialisierung
if (typeof window !== 'undefined') {
  document.addEventListener('DOMContentLoaded', function() {
    ContextualOCR.init();
  });
}