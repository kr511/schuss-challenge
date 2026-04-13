/**
 * Multi-Score Detection System
 * Erkennt mehrere Scores auf einem Bild gleichzeitig
 */

const MultiScoreDetection = (function() {
  'use strict';
  
  // Konfiguration
  const CONFIG = {
    minScoreRegionSize: 20,
    maxScoreRegionSize: 200,
    confidenceThreshold: 0.6,
    overlapThreshold: 0.3,
    maxRegions: 10,
    enableRegionDetection: true,
    enableScoreValidation: true,
    enableContextAnalysis: true
  };
  
  // Score-Region-Typen
  const REGION_TYPES = {
    TOTAL_SCORE: 'total_score',
    PARTIAL_SCORE: 'partial_score',
    POSITION_SCORE: 'position_score',
    SERIES_SCORE: 'series_score',
    UNKNOWN: 'unknown'
  };
  
  /**
   * Initialisiert das Multi-Score Detection System
   */
  function init() {
    console.log('📊 Multi-Score Detection System initialisiert');
  }
  
  /**
   * Hauptfunktion: Erkennt mehrere Scores auf einem Bild
   */
  async function detectMultipleScores(imageData, discipline, weapon) {
    try {
      // Schritt 1: Bildvorverarbeitung
      const processedImage = preprocessImage(imageData);
      
      // Schritt 2: Regionen erkennen
      const regions = await detectScoreRegions(processedImage);
      
      // Schritt 3: Regionen klassifizieren
      const classifiedRegions = classifyRegions(regions, discipline, weapon);
      
      // Schritt 4: OCR auf jeder Region durchführen
      const ocrResults = await performOCROnRegions(classifiedRegions);
      
      // Schritt 5: Ergebnisse validieren und konsolidieren
      const validatedResults = validateAndConsolidateResults(ocrResults, discipline, weapon);
      
      return {
        success: true,
        regions: validatedResults,
        totalScore: findTotalScore(validatedResults),
        partialScores: findPartialScores(validatedResults),
        confidence: calculateOverallConfidence(validatedResults),
        metadata: {
          totalRegions: regions.length,
          successfulOCR: ocrResults.filter(r => r.success).length,
          discipline: discipline,
          weapon: weapon
        }
      };
      
    } catch (error) {
      console.error('❌ Multi-Score Detection fehlgeschlagen:', error);
      return {
        success: false,
        error: error.message,
        regions: [],
        fallback: true
      };
    }
  }
  
  /**
   * Bildvorverarbeitung für bessere OCR-Erkennung
   */
  function preprocessImage(imageData) {
    // Konvertiere zu Canvas für bessere Verarbeitung
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    canvas.width = imageData.width || imageData.naturalWidth || 640;
    canvas.height = imageData.height || imageData.naturalHeight || 480;
    
    // Zeichne Bild
    ctx.drawImage(imageData, 0, 0, canvas.width, canvas.height);
    
    // Wende Filter an
    const imageDataObj = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    // Kontrast erhöhen
    enhanceContrast(imageDataObj);
    
    // Rauschen reduzieren
    reduceNoise(imageDataObj);
    
    ctx.putImageData(imageDataObj, 0, 0);
    
    return {
      canvas: canvas,
      ctx: ctx,
      imageData: imageDataObj,
      width: canvas.width,
      height: canvas.height
    };
  }
  
  /**
   * Erkennt potenzielle Score-Regionen
   */
  async function detectScoreRegions(processedImage) {
    const { canvas, ctx, width, height } = processedImage;
    
    // Verwende Kantenerkennung
    const edges = detectEdges(ctx, width, height);
    
    // Finde zusammenhängende Komponenten
    const components = findConnectedComponents(edges, width, height);
    
    // Filtere Score-ähnliche Regionen
    const scoreRegions = filterScoreLikeRegions(components, width, height);
    
    // Entferne Überlappungen
    const nonOverlapping = removeOverlappingRegions(scoreRegions);
    
    // Sortiere nach Wahrscheinlichkeit
    return sortRegionsByScoreProbability(nonOverlapping).map(region => ({
      ...region,
      imageCanvas: canvas
    }));
  }
  
  /**
   * Kantenerkennung mit Sobel-Operator
   */
  function detectEdges(ctx, width, height) {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const edges = new Uint8ClampedArray(width * height);
    
    const sobelX = [
      [-1, 0, 1],
      [-2, 0, 2],
      [-1, 0, 1]
    ];
    
    const sobelY = [
      [-1, -2, -1],
      [0, 0, 0],
      [1, 2, 1]
    ];
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let gx = 0, gy = 0;
        
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const idx = ((y + ky) * width + (x + kx)) * 4;
            const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
            
            gx += gray * sobelX[ky + 1][kx + 1];
            gy += gray * sobelY[ky + 1][kx + 1];
          }
        }
        
        const magnitude = Math.sqrt(gx * gx + gy * gy);
        edges[y * width + x] = magnitude > 50 ? 255 : 0;
      }
    }
    
    return edges;
  }
  
  /**
   * Findet zusammenhängende Komponenten
   */
  function findConnectedComponents(edges, width, height) {
    const visited = new Array(width * height).fill(false);
    const components = [];
    
    function floodFill(startX, startY) {
      const stack = [[startX, startY]];
      const component = [];
      
      while (stack.length > 0) {
        const [x, y] = stack.pop();
        const idx = y * width + x;
        
        if (visited[idx] || edges[idx] === 0) continue;
        
        visited[idx] = true;
        component.push([x, y]);
        
        // Nachbarpixel prüfen
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            const nIdx = ny * width + nx;
            
            if (nx >= 0 && nx < width && ny >= 0 && ny < height && !visited[nIdx]) {
              stack.push([nx, ny]);
            }
          }
        }
      }
      
      return component;
    }
    
    // Finde alle Komponenten
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        if (!visited[idx] && edges[idx] > 0) {
          const component = floodFill(x, y);
          if (component.length > 10) { // Mindestgröße
            components.push(component);
          }
        }
      }
    }
    
    return components;
  }
  
  /**
   * Filtert score-ähnliche Regionen
   */
  function filterScoreLikeRegions(components, width, height) {
    return components.map(component => {
      const bounds = getComponentBounds(component);
      const features = extractRegionFeatures(component, bounds, width, height);
      
      return {
        bounds: bounds,
        features: features,
        scoreProbability: calculateScoreProbability(features),
        type: REGION_TYPES.UNKNOWN
      };
    }).filter(region => 
      region.bounds.width >= CONFIG.minScoreRegionSize &&
      region.bounds.width <= CONFIG.maxScoreRegionSize &&
      region.bounds.height >= CONFIG.minScoreRegionSize &&
      region.bounds.height <= CONFIG.maxScoreRegionSize &&
      region.scoreProbability > 0.3
    );
  }
  
  /**
   * Berechnet Bounding Box einer Komponente
   */
  function getComponentBounds(component) {
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;
    
    component.forEach(([x, y]) => {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    });
    
    return {
      x: minX,
      y: minY,
      width: maxX - minX + 1,
      height: maxY - minY + 1
    };
  }
  
  /**
   * Extrahiert Features aus einer Region
   */
  function extractRegionFeatures(component, bounds, width, height) {
    const area = bounds.width * bounds.height;
    const aspectRatio = bounds.width / bounds.height;
    const density = component.length / area;
    
    // Text-ähnliche Merkmale
    const isTextLike = aspectRatio > 0.3 && aspectRatio < 3.0 && density > 0.3;
    
    // Größenmerkmale
    const sizeCategory = getSizeCategory(bounds.width, bounds.height);
    
    // Position im Bild
    const positionScore = calculatePositionScore(bounds, width, height);
    
    return {
      area: area,
      aspectRatio: aspectRatio,
      density: density,
      isTextLike: isTextLike,
      sizeCategory: sizeCategory,
      positionScore: positionScore,
      componentCount: component.length
    };
  }
  
  /**
   * Berechnet Wahrscheinlichkeit, dass es sich um einen Score handelt
   */
  function calculateScoreProbability(features) {
    let probability = 0;
    
    // Text-ähnlichkeit
    if (features.isTextLike) probability += 0.3;
    
    // Größe
    if (features.sizeCategory === 'medium') probability += 0.2;
    
    // Dichte
    if (features.density > 0.4 && features.density < 0.8) probability += 0.2;
    
    // Position
    probability += features.positionScore * 0.3;
    
    return Math.min(1.0, probability);
  }
  
  /**
   * Klassifiziert Größe
   */
  function getSizeCategory(width, height) {
    const maxDim = Math.max(width, height);
    if (maxDim < 30) return 'small';
    if (maxDim < 80) return 'medium';
    return 'large';
  }
  
  /**
   * Berechnet Position-Score (Scores sind oft zentral oder in Ecken)
   */
  function calculatePositionScore(bounds, imageWidth, imageHeight) {
    const centerX = bounds.x + bounds.width / 2;
    const centerY = bounds.y + bounds.height / 2;
    
    const normalizedX = centerX / imageWidth;
    const normalizedY = centerY / imageHeight;
    
    // Scores sind oft in der oberen Hälfte und zentral
    if (normalizedY < 0.6 && normalizedX > 0.2 && normalizedX < 0.8) {
      return 0.8;
    }
    
    return 0.3;
  }
  
  /**
   * Entfernt überlappende Regionen
   */
  function removeOverlappingRegions(regions) {
    const result = [];
    
    regions.forEach(region => {
      let hasOverlap = false;
      
      for (const existing of result) {
        if (calculateOverlap(region.bounds, existing.bounds) > CONFIG.overlapThreshold) {
          hasOverlap = true;
          // Behalte die mit höherer Wahrscheinlichkeit
          if (region.scoreProbability > existing.scoreProbability) {
            const index = result.indexOf(existing);
            result[index] = region;
          }
          break;
        }
      }
      
      if (!hasOverlap) {
        result.push(region);
      }
    });
    
    return result;
  }
  
  /**
   * Berechnet Überlappung zweier Bounding Boxes
   */
  function calculateOverlap(bounds1, bounds2) {
    const x1 = Math.max(bounds1.x, bounds2.x);
    const y1 = Math.max(bounds1.y, bounds2.y);
    const x2 = Math.min(bounds1.x + bounds1.width, bounds2.x + bounds2.width);
    const y2 = Math.min(bounds1.y + bounds1.height, bounds2.y + bounds2.height);
    
    if (x2 <= x1 || y2 <= y1) return 0;
    
    const intersection = (x2 - x1) * (y2 - y1);
    const area1 = bounds1.width * bounds1.height;
    const area2 = bounds2.width * bounds2.height;
    const union = area1 + area2 - intersection;
    
    return intersection / union;
  }
  
  /**
   * Sortiert Regionen nach Score-Wahrscheinlichkeit
   */
  function sortRegionsByScoreProbability(regions) {
    return regions.sort((a, b) => b.scoreProbability - a.scoreProbability);
  }
  
  /**
   * Klassifiziert Regionen basierend auf Position und Features
   */
  function classifyRegions(regions, discipline, weapon) {
    return regions.map(region => {
      const classification = classifyRegion(region, discipline, weapon);
      return {
        ...region,
        type: classification.type,
        confidence: classification.confidence,
        reason: classification.reason
      };
    });
  }
  
  /**
   * Klassifiziert einzelne Region
   */
  function classifyRegion(region, discipline, weapon) {
    const bounds = region.bounds;
    const features = region.features;
    
    // Heuristiken für verschiedene Score-Typen
    
    // Total Score (oft größer und zentral)
    if (features.sizeCategory === 'large' && 
        features.positionScore > 0.7 &&
        features.aspectRatio > 0.8 && features.aspectRatio < 1.2) {
      return {
        type: REGION_TYPES.TOTAL_SCORE,
        confidence: 0.8,
        reason: 'Groß, zentral, quadratisch'
      };
    }
    
    // Position Scores für 3x20
    if (discipline === 'kk3x20' && features.sizeCategory === 'medium') {
      return {
        type: REGION_TYPES.POSITION_SCORE,
        confidence: 0.7,
        reason: 'Mittelgroß in 3x20 Disziplin'
      };
    }
    
    // Partial Scores (kleiner, aber text-ähnlich)
    if (features.sizeCategory === 'small' && 
        features.isTextLike &&
        features.density > 0.5) {
      return {
        type: REGION_TYPES.PARTIAL_SCORE,
        confidence: 0.6,
        reason: 'Klein, text-ähnlich, dicht'
      };
    }
    
    return {
      type: REGION_TYPES.UNKNOWN,
      confidence: 0.3,
      reason: 'Unklare Klassifikation'
    };
  }
  
  /**
   * Führt OCR auf allen Regionen durch
   */
  async function performOCROnRegions(regions) {
    const results = [];
    
    for (const region of regions) {
      try {
        const ocrResult = await performOCROnRegion(region);
        results.push({
          region: region,
          ocr: ocrResult,
          success: ocrResult.success
        });
      } catch (error) {
        results.push({
          region: region,
          ocr: { success: false, error: error.message },
          success: false
        });
      }
    }
    
    return results;
  }
  
  /**
   * Führt OCR auf einzelner Region durch
   */
  async function performOCROnRegion(region) {
    if (!region.imageCanvas) {
      throw new Error('Keine Bildquelle für OCR-Region verfügbar');
    }

    // Extrahiere Bildbereich
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    canvas.width = region.bounds.width;
    canvas.height = region.bounds.height;
    
    // Zeichne nur die Region
    ctx.drawImage(
      region.imageCanvas || document.createElement('canvas'),
      region.bounds.x, region.bounds.y, region.bounds.width, region.bounds.height,
      0, 0, region.bounds.width, region.bounds.height
    );
    
    // Optimiere für OCR
    optimizeForOCR(ctx, region.bounds.width, region.bounds.height);
    
    // Führe OCR durch (hier würde Tesseract.js verwendet)
    return await performTesseractOCR(canvas);
  }
  
  /**
   * Optimiert Bild für OCR
   */
  function optimizeForOCR(ctx, width, height) {
    const imageData = ctx.getImageData(0, 0, width, height);
    
    // Konvertiere zu Schwarz-Weiß
    for (let i = 0; i < imageData.data.length; i += 4) {
      const gray = (imageData.data[i] + imageData.data[i + 1] + imageData.data[i + 2]) / 3;
      const bw = gray > 128 ? 255 : 0;
      imageData.data[i] = imageData.data[i + 1] = imageData.data[i + 2] = bw;
    }
    
    ctx.putImageData(imageData, 0, 0);
  }
  
  /**
   * Führt echtes Tesseract-OCR aus, wenn ImageCompare verfügbar ist.
   */
  async function performTesseractOCR(canvas) {
    if (typeof window !== 'undefined' && window.ImageCompare && typeof window.ImageCompare.getTesseractWorker === 'function') {
      try {
        const worker = await window.ImageCompare.getTesseractWorker();
        if (worker && worker.setParameters) {
          await worker.setParameters({
            tessedit_pageseg_mode: '7',
            preserve_interword_spaces: '1',
            tessedit_char_whitelist: '0123456789.,'
          });
        }
        const dataUrl = canvas.toDataURL('image/jpeg');
        const result = await worker.recognize(dataUrl);

        return {
          success: true,
          text: result && result.data && result.data.text ? result.data.text : '',
          confidence: result && result.data && result.data.confidence ? (result.data.confidence / 100) : 0.5
        };
      } catch (err) {
        console.warn('Real OCR failed, falling back to mock:', err);
      }
    }
    
    // Fallback falls Tesseract.js nicht geladen ist oder Fehler wirft
    return {
      success: false,
      text: '',
      confidence: 0
    };
  }
  
  /**
   * Validiert und konsolidiert OCR-Ergebnisse
   */
  function validateAndConsolidateResults(ocrResults, discipline, weapon) {
    const validResults = ocrResults.filter(result => 
      result.success && 
      result.ocr.text && 
      result.ocr.confidence >= CONFIG.confidenceThreshold
    );
    
    // Validiere Scores basierend auf Disziplin
    const validatedResults = validResults.map(result => {
      // Behandle Kommas als Dezimalpunkte, da viele europäische OCR-Engines dies tun
      const sanitizedText = result.ocr.text.replace(/,/g, '.');
      const score = parseFloat(sanitizedText);
      const isValid = isValidScore(score, discipline, weapon);
      
      return {
        ...result,
        score: score,
        isValid: isValid,
        validationReason: isValid ? 'Valid score' : 'Invalid score for discipline'
      };
    });
    
    return validatedResults.filter(r => r.isValid);
  }
  
  /**
   * Prüft ob Score für Disziplin gültig ist
   */
  function isValidScore(score, discipline, weapon) {
    if (isNaN(score) || score < 0) return false;
    
    const ranges = {
      'lg40': { min: 50, max: 436 },
      'lg60': { min: 75, max: 654 },
      'kk50': { min: 50, max: 600 },
      'kk100': { min: 50, max: 600 },
      'kk3x20': { min: 150, max: 600 }
    };
    
    const range = ranges[discipline] || ranges['lg40'];
    return score >= range.min && score <= range.max;
  }
  
  /**
   * Findet Gesamt-Score
   */
  function findTotalScore(results) {
    const totalScoreRegions = results.filter(r => r.region.type === REGION_TYPES.TOTAL_SCORE);
    
    if (totalScoreRegions.length > 0) {
      // Wähle den mit höchster Konfidenz
      return totalScoreRegions.reduce((best, current) => 
        current.ocr.confidence > best.ocr.confidence ? current : best
      );
    }
    
    // Fallback: Wähle höchsten Score
    if (results.length > 0) {
      return results.reduce((highest, current) => 
        current.score > highest.score ? current : highest
      );
    }
    
    return null;
  }
  
  /**
   * Findet Teil-Scores
   */
  function findPartialScores(results) {
    return results.filter(r => 
      r.region.type === REGION_TYPES.PARTIAL_SCORE ||
      r.region.type === REGION_TYPES.POSITION_SCORE ||
      r.region.type === REGION_TYPES.SERIES_SCORE
    );
  }
  
  /**
   * Berechnet Gesamtkonfidenz
   */
  function calculateOverallConfidence(results) {
    if (results.length === 0) return 0;
    
    const totalConfidence = results.reduce((sum, r) => sum + r.ocr.confidence, 0);
    return totalConfidence / results.length;
  }
  
  /**
   * Erstellt UI für Multi-Score-Auswahl
   */
  function createMultiScoreUI(results) {
    const totalScore = findTotalScore(results);
    const partialScores = findPartialScores(results);
    
    return `
      <div class="multi-score-detection-ui">
        <h4>📊 Erkannte Scores</h4>
        
        ${totalScore ? `
          <div class="total-score-section">
            <h5>Gesamt-Score</h5>
            <div class="score-display">
              <span class="score-value">${totalScore.score}</span>
              <span class="score-confidence">(${Math.round(totalScore.ocr.confidence * 100)}%)</span>
              <span class="score-type">${totalScore.region.type}</span>
            </div>
          </div>
        ` : ''}
        
        ${partialScores.length > 0 ? `
          <div class="partial-scores-section">
            <h5>Teil-Scores</h5>
            <div class="partial-scores-grid">
              ${partialScores.map((score, index) => `
                <div class="partial-score-item">
                  <span class="score-label">Score ${index + 1}</span>
                  <span class="score-value">${score.score}</span>
                  <span class="score-confidence">${Math.round(score.ocr.confidence * 100)}%</span>
                </div>
              `).join('')}
            </div>
            <button class="btn-calculate-total" onclick="MultiScoreDetection.calculateTotalFromPartials()">
              Gesamt berechnen
            </button>
          </div>
        ` : ''}
        
        <div class="multi-score-actions">
          <button class="btn-use-total" ${!totalScore ? 'disabled' : ''}>
            Gesamt-Score verwenden
          </button>
          <button class="btn-manual-input">
            Manuelle Eingabe
          </button>
        </div>
      </div>
    `;
  }
  
  /**
   * Berechnet Gesamt-Score aus Teil-Scores
   */
  function calculateTotalFromPartials(partialScores) {
    if (!partialScores || partialScores.length === 0) return null;
    
    const total = partialScores.reduce((sum, score) => sum + (score.score || 0), 0);
    const avgConfidence = partialScores.reduce((sum, score) => sum + (score.ocr?.confidence || 0), 0) / partialScores.length;
    
    return {
      score: Math.round(total * 10) / 10, // Runde auf eine Dezimalstelle
      confidence: avgConfidence,
      type: 'calculated',
      source: 'partial_scores'
    };
  }
  
  /**
   * Otsu Thresholding anstelle starrer Kontrasterhöhung
   */
  function enhanceContrast(imageData) {
    const data = imageData.data;
    const hist = new Array(256).fill(0);
    
    for (let i = 0; i < data.length; i += 4) {
      const gray = (data[i] * 0.299) + (data[i+1] * 0.587) + (data[i+2] * 0.114);
      hist[Math.floor(gray)]++;
    }

    const total = data.length / 4;
    let sum = 0;
    for (let i = 0; i < 256; i++) sum += i * hist[i];

    let sumBackground = 0;
    let weightBackground = 0;
    let maxVariance = 0;
    let threshold = 128;

    for (let i = 0; i < 256; i++) {
      weightBackground += hist[i];
      if (!weightBackground) continue;

      const weightForeground = total - weightBackground;
      if (!weightForeground) break;

      sumBackground += i * hist[i];
      const meanBackground = sumBackground / weightBackground;
      const meanForeground = (sum - sumBackground) / weightForeground;
      const varianceBetween = weightBackground * weightForeground * Math.pow(meanBackground - meanForeground, 2);

      if (varianceBetween > maxVariance) {
        maxVariance = varianceBetween;
        threshold = i;
      }
    }

    for (let i = 0; i < data.length; i += 4) {
      const gray = (data[i] * 0.299) + (data[i+1] * 0.587) + (data[i+2] * 0.114);
      const bw = gray >= threshold ? 255 : 0;
      data[i] = data[i + 1] = data[i + 2] = bw;
    }
  }
  
  /**
   * Rauschen-Reduktion
   */
  function reduceNoise(imageData) {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    const output = new Uint8ClampedArray(data);
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        for (let c = 0; c < 3; c++) {
          let sum = 0;
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const idx = ((y + dy) * width + (x + dx)) * 4 + c;
              sum += data[idx];
            }
          }
          output[(y * width + x) * 4 + c] = sum / 9;
        }
      }
    }
    
    for (let i = 0; i < data.length; i++) {
      data[i] = output[i];
    }
  }
  
  /**
   * Öffentliche API
   */
  return {
    init,
    detectMultipleScores,
    calculateTotalFromPartials,
    createMultiScoreUI,
    CONFIG
  };
})();

// Initialisierung
if (typeof window !== 'undefined') {
  document.addEventListener('DOMContentLoaded', function() {
    MultiScoreDetection.init();
  });
}
