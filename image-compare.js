window.ImageCompare = (function () {
  'use strict';

  const Brain = window.ImageCompareBrain || null;
  const SCORE_CONFIG = Brain && Brain.SCORE_CONFIG ? Brain.SCORE_CONFIG : null;

  // ═══ MODELL-BASIERTE ERKENNUNG (Optional) ═══
  let _mlModel = null;
  let _mlModelLoading = false;

  /**
   * Lädt das trainierte CNN-Modell zur Monitor-Erkennung
   */
  async function loadMLModel() {
    if (_mlModel || _mlModelLoading) return _mlModel;
    if (!Brain || !Brain.MODEL_PATH) return null;

    _mlModelLoading = true;
    try {
      // Prüfe ob TensorFlow.js verfügbar ist
      if (typeof tf === 'undefined' || !tf.loadLayersModel) {
        console.warn('[ImageCompare] TensorFlow.js nicht verfügbar – ML-Modell deaktiviert');
        return null;
      }

      console.log('[ImageCompare] Lade ML-Modell:', Brain.MODEL_PATH);
      _mlModel = await tf.loadLayersModel(Brain.MODEL_PATH);
      console.log('[ImageCompare] ML-Modell erfolgreich geladen');
      return _mlModel;
    } catch (err) {
      console.warn('[ImageCompare] ML-Modell konnte nicht geladen werden:', err.message);
      return null;
    } finally {
      _mlModelLoading = false;
    }
  }

  /**
   * Klassifiziert ein Bild mit dem ML-Modell (0=Papier, 1=Monitor)
   */
  async function predictMonitorType(canvas) {
    const model = await loadMLModel();
    if (!model) return null;

    try {
      const inputSize = Brain.MODEL_INPUT_SIZE || 64;

      // Canvas auf Modellgröße skalieren und in Graustufen konvertieren
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = inputSize;
      tempCanvas.height = inputSize;
      const ctx = tempCanvas.getContext('2d');
      ctx.drawImage(canvas, 0, 0, inputSize, inputSize);
      const imageData = ctx.getImageData(0, 0, inputSize, inputSize);

      // Tensor erstellen [1, height, width, 1]
      const pixels = [];
      for (let i = 0; i < imageData.data.length; i += 4) {
        const r = imageData.data[i];
        const g = imageData.data[i + 1];
        const b = imageData.data[i + 2];
        pixels.push((0.299 * r + 0.587 * g + 0.114 * b) / 255.0);
      }

      const inputTensor = tf.tensor4d(pixels, [1, inputSize, inputSize, 1]);
      const prediction = model.predict(inputTensor);
      const probabilities = await prediction.data();
      inputTensor.dispose();
      prediction.dispose();

      return {
        isMonitor: probabilities[1] > (Brain.MONITOR_CONFIDENCE_THRESHOLD || 0.55),
        confidence: probabilities[1],
        paperProbability: probabilities[0],
        monitorProbability: probabilities[1]
      };
    } catch (err) {
      console.warn('[ImageCompare] ML-Vorhersage fehlgeschlagen:', err.message);
      return null;
    }
  }

  const CSS_ID = 'ic-styles';
  const TESSERACT_SRC = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
  const OCR_CACHE_MAX = 5;
  const DEFAULT_OCR_PASSES = Array.isArray(Brain && Brain.OCR_PASSES) && Brain.OCR_PASSES.length
    ? Brain.OCR_PASSES
    : [
        { name: 'Full-Standard', options: { cropKey: 'full', psm: 6, contrast: 1.05, upscale: 1.2 }, triggerBelow: 1.0 },
        { name: 'Upper-Half', options: { cropKey: 'upper_half', psm: 6, gamma: 1.1, contrast: 1.2, upscale: 1.5 }, triggerBelow: 0.96 },
        { name: 'Upper-Band-BW', options: { cropKey: 'upper_band', psm: 7, gamma: 1.15, contrast: 1.35, autoThreshold: true, upscale: 2.0 }, triggerBelow: 0.93 },
        { name: 'Upper-Center-BW', options: { cropKey: 'upper_center', psm: 7, gamma: 1.1, contrast: 1.45, autoThreshold: true, upscale: 2.4 }, triggerBelow: 0.9 },
        { name: 'Upper-Right-BW', options: { cropKey: 'upper_right', psm: 7, gamma: 1.1, contrast: 1.45, autoThreshold: true, upscale: 2.4 }, triggerBelow: 0.87 },
        { name: 'Upper-Center-Invert', options: { cropKey: 'upper_center', psm: 7, invert: true, contrast: 1.35, autoThreshold: true, upscale: 2.2 }, triggerBelow: 0.82 }
      ];

  let _isProcessing = false;
  let _worker = null;
  let _ocrProgressCallback = null;
  const _ocrCache = new Map();
  let _workerIdleTimer = null;
  const WORKER_IDLE_TIMEOUT = 60000; // 60 Sekunden Inaktivität → Worker terminieren

  function injectStyles() {
    if (document.getElementById(CSS_ID)) return;
    const link = document.createElement('link');
    link.id = CSS_ID;
    link.rel = 'stylesheet';
    link.href = 'image-compare.css';
    document.head.appendChild(link);
  }

  function ensureTesseract() {
    return new Promise((resolve, reject) => {
      if (typeof Tesseract !== 'undefined') {
        resolve();
        return;
      }

      const existing = document.querySelector('script[data-ic-tesseract]');
      if (existing) {
        const check = setInterval(() => {
          if (typeof Tesseract !== 'undefined') {
            clearInterval(check);
            resolve();
          }
        }, 120);
        setTimeout(() => {
          clearInterval(check);
          reject(new Error('Tesseract load timeout'));
        }, 30000);
        return;
      }

      const sc = document.createElement('script');
      sc.src = TESSERACT_SRC;
      sc.dataset.icTesseract = '1';
      sc.onload = () => resolve();
      sc.onerror = () => reject(new Error('Tesseract could not be loaded'));
      document.head.appendChild(sc);
    });
  }

  function resetWorkerIdleTimer() {
    if (_workerIdleTimer) clearTimeout(_workerIdleTimer);
    _workerIdleTimer = setTimeout(async () => {
      if (_worker && !_isProcessing) {
        try {
          await _worker.terminate();
          console.log('[ImageCompare] Worker nach Inaktivität terminiert');
        } catch (e) { /* ignore */ }
        _worker = null;
      }
      _workerIdleTimer = null;
    }, WORKER_IDLE_TIMEOUT);
  }

  async function getWorker() {
    if (_worker) {
      resetWorkerIdleTimer();
      return _worker;
    }

    await ensureTesseract();

    _worker = await Tesseract.createWorker('deu+eng', 1, {
      logger: (info) => {
        if (info && info.status === 'recognizing text' && _ocrProgressCallback) {
          _ocrProgressCallback(info.progress || 0);
        }
      }
    });

    if (_worker && _worker.setParameters) {
      await _worker.setParameters({
        tessedit_char_whitelist: '0123456789., OolI|Ss\n'
      });
    }

    resetWorkerIdleTimer();
    return _worker;
  }

  function getDisciplineConfig(isKK, discipline) {
    const fallback = isKK
      ? { min: 50, max: 600, isInteger: true }
      : { min: 50, max: 654, isInteger: false };

    if (!SCORE_CONFIG || !SCORE_CONFIG.DISCIPLINES || !discipline) return fallback;
    return SCORE_CONFIG.DISCIPLINES[discipline] || fallback;
  }

  function normalizeOCRText(text) {
    let clean = String(text || '').replace(/\r/g, ' ').replace(/\n/g, ' ');
    if (Brain && typeof Brain.cleanOCRText === 'function') {
      clean = Brain.cleanOCRText(clean);
    } else {
      clean = clean.replace(/[oO]/g, '0');
      clean = clean.replace(/[lI|]/g, '1');
      clean = clean.replace(/,/g, '.');
    }
    clean = clean.replace(/\s+/g, ' ').trim();
    return clean;
  }

  function clampConfidence(value) {
    return Math.max(0, Math.min(0.99, value));
  }

  function getNormalizedOCRConfidence(value) {
    const num = Number(value);
    if (!Number.isFinite(num)) return 0.5;
    if (num > 1) return clampConfidence(num / 100);
    return clampConfidence(num);
  }

  function getCropWeight(cropKey) {
    const weights = {
      full: 0.68,
      upper_half: 0.78,
      upper_band: 0.9,
      upper_center: 1.0,
      upper_right: 0.94,
      center: 0.72
    };
    return weights[cropKey] || 0.7;
  }

  function getKeywordBonus(rawText, index, matchLength) {
    const keywords = SCORE_CONFIG && Array.isArray(SCORE_CONFIG.KEYWORDS)
      ? SCORE_CONFIG.KEYWORDS
      : ['gesamt', 'total', 'summe', 'ergebnis', 'result', 'ringe', 'pkt'];

    const start = Math.max(0, index - 18);
    const end = Math.min(rawText.length, index + matchLength + 18);
    // ROHEN Text durchsuchen (nicht normalisiert!), OCR-typische Varianten prüfen
    const snippet = rawText.slice(start, end).toLowerCase();
    const variants = [
      snippet,
      snippet.replace(/[0o]/g, 'o'),  // "gesam0t" → "gesamt"
      snippet.replace(/[0o]/g, '0'),  // "gesamt" → "gesamt" (bleibt)
      snippet.replace(/[lI|]/g, 'i'), // "Resu|t" → "result"
      snippet.replace(/[lI|]/g, 'l'), // "Resu|t" → "result"
    ];
    return variants.some(v => keywords.some(keyword => v.includes(keyword))) ? 0.08 : 0;
  }

  function buildCandidateConfidence(baseConfidence, meta, rawText, cleanText, index, matchLength, type) {
    const ocrConfidence = getNormalizedOCRConfidence(meta.ocrConfidence);
    const cropWeight = getCropWeight(meta.cropKey);
    const passWeight = Number.isFinite(Number(meta.passWeight)) ? Number(meta.passWeight) : 0.75;
    const compactnessBonus = cleanText.length <= 18 ? 0.03 : 0;
    const keywordBonus = getKeywordBonus(rawText, index, matchLength);
    const typePenalty = type === 'implied_decimal' ? 0.06 : 0;

    return clampConfidence(
      baseConfidence
      + ((ocrConfidence - 0.5) * 0.16)
      + (cropWeight * 0.08)
      + (passWeight * 0.05)
      + keywordBonus
      + compactnessBonus
      - typePenalty
    );
  }

  function addCandidate(candidates, candidate) {
    if (!candidate || !Number.isFinite(candidate.value)) return;
    candidates.push(candidate);
  }

  function parseScoreFromText(text, isKK, discipline, meta = {}) {
    const clean = normalizeOCRText(text);
    const cfg = getDisciplineConfig(isKK, discipline);
    const min = cfg.min;
    const max = cfg.max;

    const candidates = [];
    const decimalRegex = /(\d{2,3})\s*[.,]\s*(\d)\b/g;
    const splitDecimalRegex = /(\d{2,3})\s+(\d)\b/g;
    const impliedDecimalRegex = /\b(\d{4})\b/g;
    let m;

    while ((m = decimalRegex.exec(clean)) !== null) {
      const value = parseFloat(m[1] + '.' + m[2]);
      if (value >= min && value <= max) {
        addCandidate(candidates, {
          value,
          confidence: buildCandidateConfidence(0.84, meta, text, clean, m.index, m[0].length, 'decimal'),
          type: 'decimal'
        });
      }

      if (isKK) {
        const collapsed = parseInt(m[1] + m[2], 10);
        if (collapsed >= min && collapsed <= max) {
          addCandidate(candidates, {
            value: collapsed,
            confidence: buildCandidateConfidence(0.76, meta, text, clean, m.index, m[0].length, 'collapsed_integer'),
            type: 'integer'
          });
        }
      }
    }

    if (!isKK) {
      while ((m = splitDecimalRegex.exec(clean)) !== null) {
        const value = parseFloat(m[1] + '.' + m[2]);
        if (value >= min && value <= max) {
          addCandidate(candidates, {
            value,
            confidence: buildCandidateConfidence(0.72, meta, text, clean, m.index, m[0].length, 'split_decimal'),
            type: 'decimal'
          });
        }
      }

      while ((m = impliedDecimalRegex.exec(clean)) !== null) {
        const raw = parseInt(m[1], 10);
        const value = raw / 10;
        if (value >= min && value <= max) {
          addCandidate(candidates, {
            value,
            confidence: buildCandidateConfidence(0.74, meta, text, clean, m.index, m[0].length, 'implied_decimal'),
            type: 'decimal'
          });
        }
      }
    }

    // intRegex: Nur ganze Zahlen matchen, die NICHT Teil einer Dezimalzahl sind
    // Negative Lookbehind/Lookahead verhindern Match von "405" in "405.2" oder "405,2"
    const intRegex = /(?<![.,]\s*)(\b\d{2,3}\b)(?!\s*[.,]\s*\d)/g;
    while ((m = intRegex.exec(clean)) !== null) {
      const value = parseInt(m[1], 10);
      if (value >= min && value <= max) {
        addCandidate(candidates, {
          value,
          confidence: buildCandidateConfidence(isKK ? 0.88 : 0.62, meta, text, clean, m.index, m[0].length, 'integer'),
          type: 'integer'
        });
      }
    }

    if (candidates.length === 0) {
      return { bestMatch: null, alternatives: [], confidence: 0, text: clean };
    }

    candidates.sort((a, b) => b.confidence - a.confidence);
    const unique = [];
    for (const c of candidates) {
      const sameValue = unique.some(u => Math.abs(u.value - c.value) < (isKK ? 1 : 0.1));
      if (!sameValue) {
        unique.push(c);
      }
    }

    let best = unique[0];
    if (!isKK) {
      const preferredDec = unique.find(c => c.type === 'decimal');
      if (preferredDec) best = preferredDec;
    }

    return {
      bestMatch: best,
      alternatives: unique.filter(c => c !== best).slice(0, 3),
      confidence: best.confidence,
      text: clean
    };
  }

  function createCanvas(width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(width));
    canvas.height = Math.max(1, Math.round(height));
    return canvas;
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Bild konnte nicht geladen werden'));
      img.src = src;
    });
  }

  function createSourceCanvas(img) {
    const maxDimension = 1800;
    const scale = Math.min(1, maxDimension / Math.max(img.naturalWidth || img.width, img.naturalHeight || img.height, 1));
    const canvas = createCanvas(
      (img.naturalWidth || img.width || 1) * scale,
      (img.naturalHeight || img.height || 1) * scale
    );
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas;
  }

  /**
   * ═══════════════════════════════════════════════════════════
   * ERWEITERTE BILDTYP-ANALYSE (6 Indikatoren + adaptives Scoring)
   * Erkennt: Papier, Monitor (LCD/IPS/OLED), Unsicher
   * ═══════════════════════════════════════════════════════════
   */
  async function analyzeImageType(canvas) {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const width = canvas.width;
    const height = canvas.height;

    // ═══ 1. BASIS-STATISTIKEN ═══
    const step = 8;
    let sumR = 0, sumG = 0, sumB = 0, sumBrightness = 0;
    let highFreqEnergy = 0;
    let scanlineEnergy = 0;    // Horizontal-Streifen (LCD-Scanlines)
    let pixelPatternEnergy = 0; // RGB-Subpixel-Struktur
    let sampleCount = 0;

    const brightnessHist = new Array(256).fill(0);
    const rHist = new Array(256).fill(0);
    const gHist = new Array(256).fill(0);
    const bHist = new Array(256).fill(0);

    for (let y = 0; y < height; y += step) {
      for (let x = 0; x < width; x += step) {
        const idx = (y * width + x) * 4;
        const r = data[idx], g = data[idx + 1], b = data[idx + 2];
        const brightness = (r + g + b) / 3;

        sumBrightness += brightness;
        sumR += r; sumG += g; sumB += b;

        brightnessHist[Math.floor(brightness)]++;
        rHist[r]++; gHist[g]++; bHist[b]++;

        // Hohe Frequenz (Moiré-Indikator)
        if (x < width - step && y < height - step) {
          const idxRight = (y * width + (x + step)) * 4;
          const idxDown = ((y + step) * width + x) * 4;
          const diffR = Math.abs(r - data[idxRight]);
          const diffG = Math.abs(g - data[idxRight + 1]);
          const diffB = Math.abs(b - data[idxRight + 2]);
          highFreqEnergy += (diffR + diffG + diffB) / 3;

          // Scanline-Erkennung: horizontale Streifen
          if (y < height - step * 2) {
            const idxTwoDown = ((y + step * 2) * width + x) * 4;
            const scanDiff = Math.abs(brightness - (data[idxTwoDown] + data[idxTwoDown + 1] + data[idxTwoDown + 2]) / 3);
            scanlineEnergy += scanDiff;
          }

          // RGB-Subpixel-Muster: Monitor hat regelmäßige RGB-Unterschiede
          if (x < width - step * 3) {
            const idx3Right = (y * width + (x + step * 3)) * 4;
            const rDiff = Math.abs(r - data[idx3Right]);
            const gDiff = Math.abs(g - data[idx3Right + 1]);
            const bDiff = Math.abs(b - data[idx3Right + 2]);
            pixelPatternEnergy += (rDiff + gDiff + bDiff) / 3;
          }
        }

        sampleCount++;
      }
    }

    if (sampleCount === 0) return { isMonitor: false, isUncertain: false, confidence: 0, type: 'unknown' };

    const avgBrightness = sumBrightness / sampleCount;
    const avgR = sumR / sampleCount;
    const avgG = sumG / sampleCount;
    const avgB = sumB / sampleCount;

    // ═══ 2. FARB-VARIANZ ═══
    let colorVariance = 0;
    for (let y = 0; y < height; y += step * 2) {
      for (let x = 0; x < width; x += step * 2) {
        const idx = (y * width + x) * 4;
        const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
        colorVariance += Math.pow(brightness - avgBrightness, 2);
      }
    }
    colorVariance /= (sampleCount / 4);
    const stdDev = Math.sqrt(colorVariance);

    // ═══ 3. HISTOGRAMM-ANALYSE (Gamma-Kurve & Bimodalität) ═══
    // Monitor-Fotos haben oft bimodale Helligkeitsverteilung (Text vs. Hintergrund)
    let bimodalityScore = 0;
    let peak1 = 0, peak2 = 0, peak1Pos = 0, peak2Pos = 0;
    for (let i = 0; i < 256; i++) {
      if (brightnessHist[i] > peak1) {
        peak2 = peak1; peak2Pos = peak1Pos;
        peak1 = brightnessHist[i]; peak1Pos = i;
      } else if (brightnessHist[i] > peak2) {
        peak2 = brightnessHist[i]; peak2Pos = i;
      }
    }
    // Bimodalität: zwei getrennte Peaks = Monitor (Text auf Hintergrund)
    const peakDistance = Math.abs(peak1Pos - peak2Pos);
    const bimodalRatio = peak2 / Math.max(1, peak1);
    bimodalityScore = (peakDistance > 40 && bimodalRatio > 0.15) ? (peakDistance / 255) * Math.min(1, bimodalRatio * 2) : 0;

    // Gamma-Kurven-Analyse: Monitor hat typische Gamma~2.2
    // Vereinfacht: Verhältnis von dunklen zu hellen Pixeln
    const darkPixels = brightnessHist.slice(0, 80).reduce((a, b) => a + b, 0);
    const midPixels = brightnessHist.slice(80, 180).reduce((a, b) => a + b, 0);
    const lightPixels = brightnessHist.slice(180, 256).reduce((a, b) => a + b, 0);
    const totalSamples = darkPixels + midPixels + lightPixels;
    const gammaIndicator = totalSamples > 0 ? midPixels / totalSamples : 0.5;

    // ═══ 4. CHROMA-SUBSAMPLING ═══
    // Monitor-Fotos haben oft weniger Variation im blauen Kanal
    const rVar = varianceFromHist(rHist);
    const gVar = varianceFromHist(gHist);
    const bVar = varianceFromHist(bHist);
    const blueSuppression = (rVar > 0 && gVar > 0) ? 1 - (bVar / Math.max(rVar, gVar)) : 0;

    // ═══ 5. KANTENHÄRTE-VERTEILUNG ═══
    // Papier: weichere Kanten durch Druck/Textur
    // Monitor: härtere Kanten, aber mit Moiré
    const edgeHardness = highFreqEnergy / (sampleCount * 255);
    const scanlineScore = scanlineEnergy / (sampleCount * 255);
    const pixelPatternScore = pixelPatternEnergy / (sampleCount * 255);

    // ═══════════════════════════════════════════════════════════
    // ADAPTIVES SCORING – gewichtete Summe der Indikatoren
    // ═══════════════════════════════════════════════════════════
    let monitorScore = 0;
    const indicators = {};

    // Indikator 1: Moiré-Energie (Gewicht: 0.20)
    indicators.moiré = Math.min(1, edgeHardness / 0.12);
    monitorScore += indicators.moiré * 0.20;

    // Indikator 2: Flachfarben (Gewicht: 0.15)
    indicators.flatColor = stdDev < 80 ? Math.max(0, 1 - stdDev / 80) : 0;
    monitorScore += indicators.flatColor * 0.15;

    // Indikator 3: Helligkeitsbereich (Gewicht: 0.08)
    indicators.brightness = (avgBrightness > 50 && avgBrightness < 230) ? 1 : Math.max(0, 1 - Math.abs(avgBrightness - 140) / 140);
    monitorScore += indicators.brightness * 0.08;

    // Indikator 4: Blaustich (Gewicht: 0.10)
    indicators.blueTint = avgR > 0 ? Math.max(0, Math.min(1, (avgB - avgR) / avgR + 0.1)) : 0;
    monitorScore += indicators.blueTint * 0.10;

    // Indikator 5: Bimodalität (Gewicht: 0.15)
    indicators.bimodality = bimodalityScore;
    monitorScore += indicators.bimodality * 0.15;

    // Indikator 6: Scanlines (Gewicht: 0.12)
    indicators.scanlines = Math.min(1, scanlineScore / 0.05);
    monitorScore += indicators.scanlines * 0.12;

    // Indikator 7: RGB-Subpixel-Muster (Gewicht: 0.10)
    indicators.pixelPattern = Math.min(1, pixelPatternScore / 0.08);
    monitorScore += indicators.pixelPattern * 0.10;

    // Indikator 8: Gamma-Kurve (Gewicht: 0.05)
    indicators.gamma = gammaIndicator > 0.35 && gammaIndicator < 0.65 ? 1 : Math.max(0, 1 - Math.abs(gammaIndicator - 0.5) * 4);
    monitorScore += indicators.gamma * 0.05;

    // Indikator 9: Blau-Suppression (Gewicht: 0.05)
    indicators.blueSuppression = Math.max(0, Math.min(1, blueSuppression));
    monitorScore += indicators.blueSuppression * 0.05;

    // ═══ ML-MODELL (Optional) ═══
    let mlResult = null;
    try {
      mlResult = await predictMonitorType(canvas);
      if (mlResult) {
        indicators.mlModel = mlResult.monitorProbability;
        monitorScore += indicators.mlModel * 0.15; // 15% Gewicht für ML-Modell
      }
    } catch (e) { /* ML ist optional, ignore */ }

    // ═══ SELBSTLERNEND: Kalibrierung aus LocalStorage ═══
    const calibration = loadMonitorCalibration();
    if (calibration.adjustmentFactor !== 1) {
      monitorScore = Math.min(1, monitorScore * calibration.adjustmentFactor);
    }

    // ═══ DREI-KLASSEN-SYSTEM ═══
    const result = {
      isMonitor: monitorScore > 0.45,
      isUncertain: monitorScore > 0.30 && monitorScore <= 0.45,
      confidence: Math.min(1, monitorScore),
      type: monitorScore > 0.45 ? 'monitor' : monitorScore > 0.30 ? 'uncertain' : 'paper',
      avgBrightness,
      stdDev,
      moiréScore: indicators.moiré,
      scanlineScore: indicators.scanlines,
      pixelPatternScore: indicators.pixelPattern,
      bimodalityScore: indicators.bimodality,
      mlResult,
      avgColor: { r: avgR, g: avgG, b: avgB },
      indicators
    };

    console.log(`[ImageCompare] Bildtyp: ${result.type.toUpperCase()} (Score: ${(monitorScore * 100).toFixed(1)}%)`);
    if (result.type === 'monitor') {
      console.log(`  ↳ Moiré: ${(indicators.moiré * 100).toFixed(0)}%, Scanlines: ${(indicators.scanlines * 100).toFixed(0)}%, Bimodal: ${(indicators.bimodality * 100).toFixed(0)}%, PixelPattern: ${(indicators.pixelPattern * 100).toFixed(0)}%`);
    }
    if (mlResult) {
      console.log(`  ↳ ML-Modell: Monitor=${(mlResult.monitorProbability * 100).toFixed(1)}%, Papier=${(mlResult.paperProbability * 100).toFixed(1)}%`);
    }

    return result;
  }

  /**
   * Berechnet Varianz aus Histogramm
   */
  function varianceFromHist(hist) {
    let total = 0, mean = 0, variance = 0;
    for (let i = 0; i < hist.length; i++) {
      total += hist[i];
      mean += i * hist[i];
    }
    if (total === 0) return 0;
    mean /= total;
    for (let i = 0; i < hist.length; i++) {
      variance += hist[i] * Math.pow(i - mean, 2);
    }
    return variance / total;
  }

  /**
   * Lädt Kalibrierungsdaten aus LocalStorage
   */
  function loadMonitorCalibration() {
    try {
      const stored = localStorage.getItem('ic_monitor_calibration');
      if (stored) {
        const data = JSON.parse(stored);
        if (data.feedbackCount >= 3) {
          const accuracy = data.correctClassifications / data.feedbackCount;
          // Wenn Genauigkeit < 70%, Score anpassen
          if (accuracy < 0.7) return { adjustmentFactor: 1.15 };
          if (accuracy > 0.9) return { adjustmentFactor: 0.95 };
        }
      }
    } catch (e) { /* ignore */ }
    return { adjustmentFactor: 1 };
  }

  /**
   * Speichert Feedback für Kalibrierung
   */
  function saveMonitorFeedback(wasCorrect) {
    try {
      const stored = localStorage.getItem('ic_monitor_calibration');
      const data = stored ? JSON.parse(stored) : { feedbackCount: 0, correctClassifications: 0 };
      data.feedbackCount++;
      if (wasCorrect) data.correctClassifications++;
      // Max 50 Einträge behalten
      if (data.feedbackCount > 50) {
        data.feedbackCount = 25;
        data.correctClassifications = Math.round(data.correctClassifications * 0.5);
      }
      localStorage.setItem('ic_monitor_calibration', JSON.stringify(data));
    } catch (e) { /* ignore */ }
  }

  /**
   * ═══════════════════════════════════════════════════════════
   * PERSPEKTIV-KORREKTUR (für schräge Monitor-Fotos)
   * ═══════════════════════════════════════════════════════════
   */

  /**
   * Findet Monitor-Grenzen durch Farb-Segmentierung (blau/grün)
   * Dies ist VIEL robuster als reine Kantenerkennung
   */
  function findMonitorBoundary(imageData) {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;

    // Schritt 1: Finde alle Pixel mit blauer/grüner Bildschirmfarbe
    // Meyton-Monitore haben typischerweise türkis/blauen Hintergrund
    const screenPixels = [];

    for (let i = 0; i < data.length; i += 32) {  // Jeder 8. Pixel für Performance
      const r = data[i], g = data[i + 1], b = data[i + 2];

      // Monitor-Farben: Hoher Blau- oder Grün-Anteil, moderate Helligkeit
      const isBlueGreen = (b > r * 1.2 && g > r * 0.8) ||  // Bläulich
                          (g > b * 0.9 && g > r * 1.3);     // Grünlich

      const brightness = (r + g + b) / 3;
      const isInBrightnessRange = brightness > 50 && brightness < 220;

      if (isBlueGreen && isInBrightnessRange) {
        const x = (i / 4) % width;
        const y = Math.floor((i / 4) / width);
        screenPixels.push({ x, y });
      }
    }

    if (screenPixels.length < 25) {
      console.log('[Perspective] Zu wenig Bildschirm-Pixel gefunden');
      return null;
    }

    // Schritt 2: Finde Bounding Box der Bildschirm-Pixel
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of screenPixels) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }

    // Schritt 3: Vergrößere Bounding Box um Rand (Monitor-Rahmen)
    const marginX = Math.round((maxX - minX) * 0.08);
    const marginY = Math.round((maxY - minY) * 0.08);

    minX = Math.max(0, minX - marginX);
    minY = Math.max(0, minY - marginY);
    maxX = Math.min(width - 1, maxX + marginX);
    maxY = Math.min(height - 1, maxY + marginY);

    // Schritt 4: Prüfe Aspect Ratio (Monitore sind 4:3 oder 16:9)
    const boxWidth = maxX - minX;
    const boxHeight = maxY - minY;
    const aspectRatio = boxWidth / boxHeight;

    // Typische Monitor-Aspect-Ratios: 1.33 (4:3) oder 1.77 (16:9)
    const isMonitorAspectRatio = (aspectRatio > 1.1 && aspectRatio < 2.0);

    if (!isMonitorAspectRatio) {
      console.log(`[Perspective] Ungewöhnliches Aspect Ratio: ${aspectRatio.toFixed(2)}`);
      // Trotzdem weitermachen, aber mit Warnung
    }

    console.log(`[Perspective] Monitor gefunden: (${minX},${minY})-(${maxX},${maxY}), AR=${aspectRatio.toFixed(2)}, ${screenPixels.length} Pixel`);

    // Schritt 5: Verfeinere Eckpunkte durch Kantensuche in der Nähe
    const corners = refineCornersWithEdges(imageData, width, height, { minX, minY, maxX, maxY });

    return corners;
  }

  /**
   * Verfeinert Eckpunkte durch Kantensuche
   */
  function refineCornersWithEdges(imageData, width, height, bbox) {
    const { minX, minY, maxX, maxY } = bbox;
    const data = imageData.data;

    // Einfache Kantenerkennung im Bounding-Box-Bereich
    const searchRadius = Math.min(40, Math.max(20, (maxX - minX) * 0.05));

    // Finde Kanten durch Gradienten
    const edges = [];
    for (let y = Math.max(1, minY - searchRadius); y < Math.min(height - 1, maxY + searchRadius); y++) {
      for (let x = Math.max(1, minX - searchRadius); x < Math.min(width - 1, maxX + searchRadius); x++) {
        const idx = (y * width + x) * 4;
        const rightIdx = (y * width + (x + 1)) * 4;
        const downIdx = ((y + 1) * width + x) * 4;

        const gradX = Math.abs(data[idx] - data[rightIdx]) +
                      Math.abs(data[idx + 1] - data[rightIdx + 1]) +
                      Math.abs(data[idx + 2] - data[rightIdx + 2]);

        const gradY = Math.abs(data[idx] - data[downIdx]) +
                      Math.abs(data[idx + 1] - data[downIdx + 1]) +
                      Math.abs(data[idx + 2] - data[downIdx + 2]);

        if (gradX + gradY > 150) {  // Kanten-Schwellwert
          edges.push({ x, y });
        }
      }
    }

    if (edges.length === 0) {
      // Fallback: Bounding Box als Ecken
      return [
        { x: minX, y: minY },
        { x: maxX, y: minY },
        { x: maxX, y: maxY },
        { x: minX, y: maxY }
      ];
    }

    // Finde Eckpunkte durch Clustering
    const corners = [
      { x: minX, y: minY },  // oben links
      { x: maxX, y: minY },  // oben rechts
      { x: maxX, y: maxY },  // unten rechts
      { x: minX, y: maxY }   // unten links
    ];

    // Verfeinere jede Ecke durch Suche nach der am weitesten außen liegenden Kante
    const refined = corners.map((corner, idx) => {
      let bestPoint = corner;
      let maxDist = 0;

      for (const edge of edges) {
        const dist = Math.hypot(edge.x - corner.x, edge.y - corner.y);
        // Suche Kanten nahe der Ecke, aber außerhalb
        if (dist < searchRadius * 2) {
          // Berechne "äußere" Richtung
          let isOutside = false;
          if (idx === 0) isOutside = edge.x <= corner.x && edge.y <= corner.y;
          else if (idx === 1) isOutside = edge.x >= corner.x && edge.y <= corner.y;
          else if (idx === 2) isOutside = edge.x >= corner.x && edge.y >= corner.y;
          else isOutside = edge.x <= corner.x && edge.y >= corner.y;

          if (isOutside && dist > maxDist) {
            maxDist = dist;
            bestPoint = edge;
          }
        }
      }

      return bestPoint;
    });

    return refined;
  }

  /**
   * Sobel-Kantenerkennung (Fallback)
   */
  function sobelEdgeDetection(imageData) {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    const gray = new Float32Array(width * height);
    const magnitude = new Float32Array(width * height);

    // Graustufen
    for (let i = 0; i < data.length; i += 4) {
      gray[i / 4] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    }

    // Sobel-Kerne
    const sobelX = [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]];
    const sobelY = [[-1, -2, -1], [0, 0, 0], [1, 2, 1]];

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let gx = 0, gy = 0;
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const pixel = gray[(y + ky) * width + (x + kx)];
            gx += pixel * sobelX[ky + 1][kx + 1];
            gy += pixel * sobelY[ky + 1][kx + 1];
          }
        }
        magnitude[y * width + x] = Math.sqrt(gx * gx + gy * gy);
      }
    }

    return magnitude;
  }

  /**
   * Kantenschwellwert (Otsu-adaptiv)
   */
  function thresholdEdges(magnitude, width, height) {
    const hist = new Array(256).fill(0);
    const maxMag = Math.max(...magnitude);

    // Histogramm erstellen
    for (let i = 0; i < magnitude.length; i++) {
      const bin = Math.min(255, Math.floor((magnitude[i] / maxMag) * 255));
      hist[bin]++;
    }

    // Otsu-Schwellwert
    const total = magnitude.length;
    let sum = 0;
    for (let i = 0; i < 256; i++) sum += i * hist[i];

    let sumB = 0, wB = 0, maxVariance = 0, threshold = 128;
    for (let t = 0; t < 256; t++) {
      wB += hist[t];
      if (wB === 0) continue;
      const wF = total - wB;
      if (wF === 0) break;
      sumB += t * hist[t];
      const mB = sumB / wB;
      const mF = (sum - sumB) / wF;
      const variance = wB * wF * (mB - mF) * (mB - mF);
      if (variance > maxVariance) {
        maxVariance = variance;
        threshold = t;
      }
    }

    // Binärbild
    const binary = new Uint8Array(width * height);
    const normThreshold = (threshold / 255) * maxMag;
    for (let i = 0; i < magnitude.length; i++) {
      binary[i] = magnitude[i] > normThreshold ? 1 : 0;
    }

    return binary;
  }

  /**
   * Finde die größte Kontur (zusammenhängende Kanten)
   */
  function findLargestContour(binary, width, height) {
    const visited = new Uint8Array(width * height);
    let largestContour = [];
    let largestArea = 0;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        if (binary[idx] && !visited[idx]) {
          // Flood Fill
          const contour = [];
          const stack = [{ x, y }];
          visited[idx] = 1;

          while (stack.length > 0) {
            const p = stack.pop();
            contour.push(p);

            for (let dy = -1; dy <= 1; dy++) {
              for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue;
                const nx = p.x + dx, ny = p.y + dy;
                if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                  const nIdx = ny * width + nx;
                  if (binary[nIdx] && !visited[nIdx]) {
                    visited[nIdx] = 1;
                    stack.push({ x: nx, y: ny });
                  }
                }
              }
            }
          }

          if (contour.length > largestArea) {
            largestArea = contour.length;
            largestContour = contour;
          }
        }
      }
    }

    return largestContour;
  }

  /**
   * Approximiere Kontur als Polygon und finde 4 Eckpunkte
   */
  function approximateQuadrilateral(contour) {
    if (contour.length < 4) return null;

    // Bounding Box berechnen
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of contour) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }

    const bboxArea = (maxX - minX) * (maxY - minY);
    if (bboxArea < 10000) return null;  // Zu klein

    // Finde 4 Eckpunkte (Extrem-Punkte)
    const corners = [
      { x: minX, y: minY },  // oben links
      { x: maxX, y: minY },  // oben rechts
      { x: maxX, y: maxY },  // unten rechts
      { x: minX, y: maxY }   // unten links
    ];

    // Verfeinere Eckpunkte durch Suche in der Nähe der Ecken
    const refinedCorners = corners.map(corner => {
      let bestDist = Infinity;
      let bestPoint = corner;

      for (const p of contour) {
        const dist = Math.hypot(p.x - corner.x, p.y - corner.y);
        // Suche Punkte nahe der Ecke, aber bevorzuge Punkte mit hohem Gradienten
        if (dist < bestDist) {
          bestDist = dist;
          bestPoint = p;
        }
      }

      // Suche nochmal in einem größeren Radius nach dem am weitesten entfernten Punkt
      const searchRadius = Math.max(30, Math.sqrt(bboxArea) * 0.1);
      for (const p of contour) {
        const dist = Math.hypot(p.x - corner.x, p.y - corner.y);
        if (dist <= searchRadius) {
          // Berechne "Eckigkeit" durch Winkel der Nachbarpunkte
          const idx = contour.indexOf(p);
          if (idx > 0 && idx < contour.length - 1) {
            const prev = contour[idx - 1];
            const next = contour[idx + 1];
            const angle = Math.atan2(next.y - p.y, next.x - p.x) - Math.atan2(prev.y - p.y, prev.x - p.x);
            if (Math.abs(angle) > Math.PI * 0.6) {  // Nahe 90 Grad
              bestPoint = p;
              break;
            }
          }
        }
      }

      return bestPoint;
    });

    return refinedCorners;
  }

  /**
   * Perspektiv-Transformation (Homographie)
   * Transformiert ein verzerrtes Viereck in ein Rechteck
   */
  function perspectiveTransform(sourceCanvas, corners, targetWidth, targetHeight) {
    // Defensive Checks für Eingabeparameter
    if (!sourceCanvas || !corners || corners.length < 4) {
      console.warn('[Perspective] Ungültige Parameter für perspectiveTransform');
      return sourceCanvas;
    }

    const [tl, tr, br, bl] = corners;  // top-left, top-right, bottom-right, bottom-left

    // Prüfe auf NaN/Infinity in Eckpunkten
    for (const corner of [tl, tr, br, bl]) {
      if (!Number.isFinite(corner.x) || !Number.isFinite(corner.y)) {
        console.warn('[Perspective] Ungültige Eckpunkte (NaN/Infinity)');
        return sourceCanvas;
      }
    }

    // Zielgrößen validieren
    const safeTargetWidth = Math.max(1, Math.min(2000, Math.round(targetWidth || 1)));
    const safeTargetHeight = Math.max(1, Math.min(2000, Math.round(targetHeight || 1)));

    // Ziel-Koordinaten
    const dst = [
      [0, 0],
      [safeTargetWidth, 0],
      [safeTargetWidth, safeTargetHeight],
      [0, safeTargetHeight]
    ];

    // Quell-Koordinaten
    const src = [
      [tl.x, tl.y],
      [tr.x, tr.y],
      [br.x, br.y],
      [bl.x, bl.y]
    ];

    // Homographie-Matrix berechnen (vereinfacht für 4 Punkte)
    const H = computeHomography(src, dst);

    // Homographie-Matrix auf Gültigkeit prüfen (keine NaN/Infinity)
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        if (!Number.isFinite(H[row][col])) {
          console.warn('[Perspective] Ungültige Homographie-Matrix (NaN/Infinity)');
          return sourceCanvas;
        }
      }
    }

    // Transformiere Bild
    const resultCanvas = createCanvas(safeTargetWidth, safeTargetHeight);
    const resultCtx = resultCanvas.getContext('2d', { willReadFrequently: true });
    const srcCtx = sourceCanvas.getContext('2d', { willReadFrequently: true });
    const srcData = srcCtx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);

    const resultData = resultCtx.createImageData(safeTargetWidth, safeTargetHeight);

    // Rückwärtstransformation: für jeden Zielpixel berechne Quellpunkt
    for (let y = 0; y < safeTargetHeight; y++) {
      for (let x = 0; x < safeTargetWidth; x++) {
        const [u, v] = transformPoint(x, y, H);

        if (Number.isFinite(u) && Number.isFinite(v) &&
            u >= 0 && u < sourceCanvas.width - 1 && v >= 0 && v < sourceCanvas.height - 1) {
          // Bilineare Interpolation
          const x0 = Math.floor(u), y0 = Math.floor(v);
          const x1 = x0 + 1, y1 = y0 + 1;
          const dx = u - x0, dy = v - y0;

          for (let c = 0; c < 4; c++) {
            const idx00 = (y0 * sourceCanvas.width + x0) * 4 + c;
            const idx10 = (y0 * sourceCanvas.width + x1) * 4 + c;
            const idx01 = (y1 * sourceCanvas.width + x0) * 4 + c;
            const idx11 = (y1 * sourceCanvas.width + x1) * 4 + c;

            const val = (1 - dx) * (1 - dy) * srcData.data[idx00] +
                        dx * (1 - dy) * srcData.data[idx10] +
                        (1 - dx) * dy * srcData.data[idx01] +
                        dx * dy * srcData.data[idx11];

            resultData.data[(y * safeTargetWidth + x) * 4 + c] = Math.round(val);
          }
        } else {
          // Weißer Hintergrund für Bereiche außerhalb
          const idx = (y * safeTargetWidth + x) * 4;
          resultData.data[idx] = 255;
          resultData.data[idx + 1] = 255;
          resultData.data[idx + 2] = 255;
          resultData.data[idx + 3] = 255;
        }
      }
    }

    resultCtx.putImageData(resultData, 0, 0);
    return resultCanvas;
  }

  /**
   * Homographie-Matrix berechnen
   */
  function computeHomography(src, dst) {
    // Vereinfachte Homographie-Berechnung für 4 Punkte
    // Löst das lineare Gleichungssystem Ax = b

    const A = [];
    const b = [];

    for (let i = 0; i < 4; i++) {
      const [x, y] = src[i];
      const [u, v] = dst[i];

      A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]);
      A.push([0, 0, 0, x, y, 1, -v * x, -v * y]);
      b.push(u);
      b.push(v);
    }

    // Gauss-Elimination
    const n = 8;
    const M = A.map((row, i) => [...row, b[i]]);

    for (let col = 0; col < n; col++) {
      // Pivot finden
      let maxRow = col;
      for (let row = col + 1; row < n; row++) {
        if (Math.abs(M[row][col]) > Math.abs(M[maxRow][col])) maxRow = row;
      }
      [M[col], M[maxRow]] = [M[maxRow], M[col]];

      // Eliminieren
      for (let row = col + 1; row < n; row++) {
        const factor = M[row][col] / M[col][col];
        for (let j = col; j <= n; j++) {
          M[row][j] -= factor * M[col][j];
        }
      }
    }

    // Rückwärtseinsetzen
    const x = new Array(n);
    for (let i = n - 1; i >= 0; i--) {
      x[i] = M[i][n];
      for (let j = i + 1; j < n; j++) {
        x[i] -= M[i][j] * x[j];
      }
      x[i] /= M[i][i];
    }

    // Homographie-Matrix
    return [
      [x[0], x[1], x[2]],
      [x[3], x[4], x[5]],
      [x[6], x[7], 1]
    ];
  }

  /**
   * Punkt mit Homographie transformieren
   */
  function transformPoint(x, y, H) {
    const w = H[2][0] * x + H[2][1] * y + H[2][2];
    const u = (H[0][0] * x + H[0][1] * y + H[0][2]) / w;
    const v = (H[1][0] * x + H[1][1] * y + H[1][2]) / w;
    return [u, v];
  }

  /**
   * Hauptfunktion: Perspektiv-Korrektur
   * Erkennt Monitor-Rand und entzerrt das Bild
   */
  function correctPerspective(canvas) {
    if (!canvas || !canvas.getContext) {
      console.warn('[Perspective] Ungültiges Canvas übergeben');
      return null;
    }

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const overlay = document.getElementById('icOverlay');

    // 1. Versuche Farb-Segmentierung (PRIMÄR - viel robuster)
    if (updateProgress && overlay) updateProgress(overlay, 22, '🔍 Monitor-Farbe erkennen...');
    let corners = findMonitorBoundary(imageData);

    // 2. Fallback: Kantenerkennung (wenn Farb-Segmentierung fehlschlägt)
    if (!corners) {
      console.log('[Perspective] Farb-Segmentierung fehlgeschlagen, versuche Kantenerkennung...');
      if (updateProgress && overlay) updateProgress(overlay, 22, '🔍 Kantenerkennung...');

      const edges = sobelEdgeDetection(imageData);
      const binary = thresholdEdges(edges, canvas.width, canvas.height);

      if (updateProgress && overlay) updateProgress(overlay, 23, '🔍 Monitor-Rand suchen...');
      const contour = findLargestContour(binary, canvas.width, canvas.height);

      if (contour.length < 4) {
        console.log('[Perspective] Keine Kontur gefunden');
        return null;
      }

      corners = approximateQuadrilateral(contour);
      if (!corners) {
        console.log('[Perspective] Kein Viereck gefunden');
        return null;
      }
    }

    // 3. Zielgröße berechnen (Seitenverhältnis des Vierecks)
    const [tl, tr, br, bl] = corners;
    const width1 = Math.hypot(tr.x - tl.x, tr.y - tl.y);
    const width2 = Math.hypot(br.x - bl.x, br.y - bl.y);
    const height1 = Math.hypot(bl.x - tl.x, bl.y - tl.y);
    const height2 = Math.hypot(br.x - tr.x, br.y - tr.y);

    const targetWidth = Math.max(width1, width2);
    const targetHeight = Math.max(height1, height2);

    // Begrenze Zielgröße für Performance
    const maxTargetSize = 1200;
    const scale = Math.min(1, maxTargetSize / Math.max(targetWidth, targetHeight));
    const finalWidth = Math.round(targetWidth * scale);
    const finalHeight = Math.round(targetHeight * scale);

    // 4. Perspektiv-Transformation
    if (updateProgress && overlay) updateProgress(overlay, 24, '📐 Bild entzerren...');
    const corrected = perspectiveTransform(canvas, corners, finalWidth, finalHeight);

    console.log(`[Perspective] Korrektur erfolgreich: ${canvas.width}x${canvas.height} → ${finalWidth}x${finalHeight}`);
    return corrected;
  }

  /**
   * Erstellt monitor-optimierte Crop-Regionen
   * (findet das linke Info-Panel auf dem Monitor)
   */
  function getMonitorCropPresets() {
    return {
      // Linke Info-Spalte (Hauptfokus)
      left_panel: [0.02, 0.08, 0.38, 0.55],
      // Obere linke Ecke (Score-Bereich)
      top_left: [0.02, 0.08, 0.35, 0.25],
      // Gesamter Monitor (Fallback)
      monitor_full: [0.05, 0.05, 0.85, 0.75],
      // Mittlere linke Spalte
      mid_left: [0.02, 0.25, 0.35, 0.35],
      // Rechte obere Ecke (Zielscheibe-Bereich)
      target_area: [0.42, 0.15, 0.5, 0.6],
      // Kompletter Monitor ohne Rand
      full: [0, 0, 1, 1]
    };
  }

  /**
   * Monitor-spezifische OCR-Passes
   */
  const MONITOR_OCR_PASSES = [
    // 1. Linke Spalte mit starkem Kontrast (Score-Bereich)
    { name: 'Monitor-Left-Panel', options: { cropKey: 'left_panel', psm: 6, gamma: 1.2, contrast: 1.6, autoThreshold: true, upscale: 2.5 }, triggerBelow: 1.0 },
    // 2. Top-Left Fokus (Score im oberen Bereich)
    { name: 'Monitor-Top-Left', options: { cropKey: 'top_left', psm: 6, gamma: 1.3, contrast: 1.5, autoThreshold: true, upscale: 3.0 }, triggerBelow: 0.95 },
    // 3. Monitor Full (Fallback)
    { name: 'Monitor-Full-BW', options: { cropKey: 'monitor_full', psm: 6, gamma: 1.1, contrast: 1.4, autoThreshold: true, upscale: 2.0 }, triggerBelow: 0.9 },
    // 4. Mittlere linke Spalte
    { name: 'Monitor-Mid-Left', options: { cropKey: 'mid_left', psm: 6, gamma: 1.15, contrast: 1.5, autoThreshold: true, upscale: 2.5 }, triggerBelow: 0.85 },
    // 5. Invertiert (für helle Hintergründe)
    { name: 'Monitor-Left-Invert', options: { cropKey: 'left_panel', psm: 6, invert: true, contrast: 1.5, autoThreshold: true, upscale: 2.5 }, triggerBelow: 0.8 },
    // 6. Target Area (für Dezimal-Scores neben der Scheibe)
    { name: 'Monitor-Target-Area', options: { cropKey: 'target_area', psm: 6, gamma: 1.1, contrast: 1.4, autoThreshold: true, upscale: 2.0 }, triggerBelow: 0.75 }
  ];

  function getCropRect(width, height, cropKey, discipline) {
    const isThreePosition = discipline === 'kk3x20';
    const presets = isThreePosition
      ? {
          full: [0, 0, 1, 1],
          upper_half: [0, 0, 1, 0.58],
          upper_band: [0.04, 0.03, 0.92, 0.24],
          upper_center: [0.12, 0.03, 0.76, 0.24],
          upper_right: [0.56, 0.03, 0.32, 0.24],
          center: [0.12, 0.14, 0.76, 0.44]
        }
      : {
          full: [0, 0, 1, 1],
          upper_half: [0, 0, 1, 0.56],
          upper_band: [0.05, 0.04, 0.9, 0.24],
          upper_center: [0.17, 0.04, 0.66, 0.24],
          upper_right: [0.5, 0.04, 0.4, 0.24],
          center: [0.14, 0.12, 0.72, 0.4]
        };

    const preset = presets[cropKey] || presets.full;
    return {
      x: Math.round(width * preset[0]),
      y: Math.round(height * preset[1]),
      width: Math.max(1, Math.round(width * preset[2])),
      height: Math.max(1, Math.round(height * preset[3]))
    };
  }

  /**
   * Monitor-spezifische Crop-Region
   */
  function getMonitorCropRect(width, height, cropKey) {
    const presets = getMonitorCropPresets();
    const preset = presets[cropKey] || presets.full;
    return {
      x: Math.round(width * preset[0]),
      y: Math.round(height * preset[1]),
      width: Math.max(1, Math.round(width * preset[2])),
      height: Math.max(1, Math.round(height * preset[3]))
    };
  }

  function applyPreprocessing(canvas, options = {}) {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return canvas;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const gamma = Number.isFinite(Number(options.gamma)) ? Number(options.gamma) : 1;
    const contrast = Number.isFinite(Number(options.contrast)) ? Number(options.contrast) : 1;
    const invert = !!options.invert;

    // --- WEICHZEICHNER (BLUR) ZUR MOIRÉ-MINDERUNG ---
    // Für Monitor-Fotos: stärkerer 5x5 Blur, für Papier: 3x3 Box-Blur
    const isMonitorPass = options.isMonitor || (options.cropKey && ['left_panel', 'top_left', 'monitor_full', 'mid_left', 'target_area'].includes(options.cropKey));
    const blurRadius = isMonitorPass ? 2 : 1;  // 5x5 für Monitor, 3x3 für Papier
    const blurSize = blurRadius * 2 + 1;
    const blurArea = blurSize * blurSize;

    const width = canvas.width;
    const height = canvas.height;
    const blurred = new Uint8ClampedArray(data);

    for (let y = blurRadius; y < height - blurRadius; y++) {
      for (let x = blurRadius; x < width - blurRadius; x++) {
        for (let c = 0; c < 3; c++) {
          let sum = 0;
          for (let dy = -blurRadius; dy <= blurRadius; dy++) {
            for (let dx = -blurRadius; dx <= blurRadius; dx++) {
              sum += data[((y + dy) * width + (x + dx)) * 4 + c];
            }
          }
          blurred[(y * width + x) * 4 + c] = sum / blurArea;
        }
        blurred[(y * width + x) * 4 + 3] = data[(y * width + x) * 4 + 3];
      }
    }
    for (let i = 0; i < data.length; i++) {
      data[i] = blurred[i];
    }

    // Gamma + Kontrast + Graustufen
    for (let i = 0; i < data.length; i += 4) {
      let r = data[i];
      let g = data[i + 1];
      let b = data[i + 2];

      if (gamma !== 1) {
        r = 255 * Math.pow(r / 255, 1 / gamma);
        g = 255 * Math.pow(g / 255, 1 / gamma);
        b = 255 * Math.pow(b / 255, 1 / gamma);
      }

      let gray = (0.299 * r) + (0.587 * g) + (0.114 * b);
      gray = ((gray - 128) * contrast) + 128;
      gray = Math.max(0, Math.min(255, gray));

      if (invert) {
        gray = 255 - gray;
      }

      data[i] = data[i + 1] = data[i + 2] = gray;
    }

    if (options.autoThreshold || Number.isFinite(Number(options.threshold))) {
      const threshold = Number.isFinite(Number(options.threshold))
        ? Number(options.threshold)
        : computeOtsuThreshold(imageData);

      for (let i = 0; i < data.length; i += 4) {
        const bw = data[i] >= threshold ? 255 : 0;
        data[i] = data[i + 1] = data[i + 2] = bw;
      }
    }

    ctx.putImageData(imageData, 0, 0);
    return canvas;
  }

  function computeOtsuThreshold(imageData) {
    const hist = new Array(256).fill(0);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      hist[data[i]]++;
    }

    const total = data.length / 4;
    let sum = 0;
    for (let i = 0; i < 256; i++) {
      sum += i * hist[i];
    }

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

    return threshold;
  }

  function createPassCanvas(sourceCanvas, pass, discipline, isMonitor = false) {
    const options = pass.options || {};
    const cropRect = isMonitor
      ? getMonitorCropRect(sourceCanvas.width, sourceCanvas.height, options.cropKey || 'full')
      : getCropRect(sourceCanvas.width, sourceCanvas.height, options.cropKey || 'full', discipline);
    const upscale = Number.isFinite(Number(options.upscale)) ? Number(options.upscale) : 1;
    const canvas = createCanvas(cropRect.width * upscale, cropRect.height * upscale);
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(
      sourceCanvas,
      cropRect.x, cropRect.y, cropRect.width, cropRect.height,
      0, 0, canvas.width, canvas.height
    );
    return applyPreprocessing(canvas, options);
  }

  function summarizeAttempt(rawText) {
    const clean = normalizeOCRText(rawText);
    return clean.length > 64 ? clean.slice(0, 64) + '…' : clean;
  }

  async function recognizeCanvas(worker, canvas, pass, passIndex, totalPasses, overlay, isMonitor = false) {
    const options = pass.options || {};
    if (worker && worker.setParameters) {
      // Monitor-optimierte Tesseract-Parameter
      if (isMonitor) {
        await worker.setParameters({
          tessedit_pageseg_mode: String(options.psm || 6),  // Uniform block of text
          preserve_interword_spaces: '1',
          tessedit_char_whitelist: '0123456789.,: S:↑↓↗↘ '  // Monitor-spezifische Zeichen
        });
      } else {
        await worker.setParameters({
          tessedit_pageseg_mode: String(options.psm || 6),
          preserve_interword_spaces: '1',
          user_defined_dpi: String(options.userDefinedDpi || 300),
          tessedit_char_whitelist: '0123456789., OolI|Ss\n'
        });
      }
    }

    const progressBase = 28 + (passIndex / Math.max(1, totalPasses)) * 58;
    _ocrProgressCallback = (prog) => {
      const pct = Math.round(progressBase + (prog || 0) * (58 / Math.max(1, totalPasses)));
      updateProgress(overlay, pct, `OCR läuft: ${pass.name}`);
    };

    // Monitor: PNG für bessere Schärfe, Papier: JPEG für Kompression
    const mimeType = isMonitor ? 'image/png' : 'image/jpeg';
    const quality = isMonitor ? undefined : 0.92;
    const result = await worker.recognize(canvas.toDataURL(mimeType, quality));
    _ocrProgressCallback = null;

    return {
      rawText: result && result.data && result.data.text ? result.data.text : '',
      ocrConfidence: result && result.data && result.data.confidence ? (result.data.confidence / 100) : 0,
      pass
    };
  }

  function buildAttemptSummary(attempts) {
    return attempts
      .filter(attempt => attempt && attempt.rawText)
      .slice(0, 8)
      .map(attempt => `[${attempt.pass.name}] ${summarizeAttempt(attempt.rawText) || '(leer)'}`)
      .join('\n');
  }

  function aggregateOCRAttempts(attempts, isKK) {
    const groups = new Map();

    attempts.forEach(attempt => {
      const parsed = attempt.parsed;
      if (!parsed) return;

      [parsed.bestMatch].concat(parsed.alternatives || []).filter(Boolean).forEach((candidate, idx) => {
        const key = isKK
          ? String(Math.round(candidate.value))
          : Number(candidate.value).toFixed(1);

        const existing = groups.get(key) || {
          bestCandidate: candidate,
          support: 0,
          totalConfidence: 0,
          sourceNames: new Set()
        };

        const weight = idx === 0 ? 1 : 0.45;
        existing.support += weight;
        existing.totalConfidence += candidate.confidence * weight;
        existing.sourceNames.add(attempt.pass.name);

        if (candidate.confidence > existing.bestCandidate.confidence) {
          existing.bestCandidate = candidate;
        }

        groups.set(key, existing);
      });
    });

    const merged = Array.from(groups.values()).map(group => {
      const averageConfidence = group.totalConfidence / Math.max(1, group.support);
      const supportBonus = Math.min(0.1, Math.max(0, group.sourceNames.size - 1) * 0.03);
      const confidence = clampConfidence(Math.max(group.bestCandidate.confidence, averageConfidence) + supportBonus);
      return {
        ...group.bestCandidate,
        confidence,
        support: group.support,
        sourceCount: group.sourceNames.size
      };
    });

    merged.sort((a, b) => {
      const aScore = a.confidence + (a.sourceCount * 0.02);
      const bScore = b.confidence + (b.sourceCount * 0.02);
      return bScore - aScore;
    });

    return {
      bestMatch: merged[0] || null,
      alternatives: merged.slice(1, 4),
      confidence: merged[0] ? merged[0].confidence : 0
    };
  }

  function applyContextualResult(parsed, rawText, discipline, isKK) {
    if (typeof ContextualOCR === 'undefined' || !ContextualOCR.CONFIG.enableContextualCorrections || !parsed.bestMatch) {
      return parsed;
    }

    const contextReady = {
      ...parsed,
      text: String(parsed.bestMatch.value),
      confidence: parsed.bestMatch.confidence
    };

    const contextualResult = ContextualOCR.analyzeWithContext(
      contextReady,
      rawText,
      discipline,
      isKK ? 'kk' : 'lg'
    );

    if (!contextualResult || !contextualResult.corrected || !Number.isFinite(parseFloat(contextualResult.text))) {
      return parsed;
    }

    const correctedValue = isKK
      ? Math.round(parseFloat(contextualResult.text))
      : Math.round(parseFloat(contextualResult.text) * 10) / 10;

    return {
      ...parsed,
      bestMatch: {
        value: correctedValue,
        confidence: Math.max(parsed.bestMatch.confidence || 0, contextualResult.confidence || 0),
        type: isKK ? 'integer' : 'decimal'
      }
    };
  }

  async function attemptMultiScore(sourceImage, discipline, isKK) {
    if (typeof MultiScoreDetection === 'undefined' || typeof MultiScoreDetection.detectMultipleScores !== 'function') {
      return null;
    }

    try {
      const result = await MultiScoreDetection.detectMultipleScores(sourceImage, discipline, isKK ? 'kk' : 'lg');
      if (!result || !result.success || !result.totalScore || !Number.isFinite(Number(result.totalScore.score))) {
        return null;
      }

      return {
        pass: { name: 'Multi-Score Detection', options: { cropKey: 'full' } },
        rawText: `MultiScore=${result.totalScore.score}`,
        parsed: {
          bestMatch: {
            value: Number(result.totalScore.score),
            confidence: clampConfidence(Number(result.totalScore.ocr?.confidence || result.confidence || 0.65)),
            type: isKK ? 'integer' : 'decimal'
          },
          alternatives: [],
          confidence: clampConfidence(Number(result.totalScore.ocr?.confidence || result.confidence || 0.65))
        }
      };
    } catch (err) {
      console.warn('[ImageCompare] Multi-score detection failed:', err);
      return null;
    }
  }

  async function performEnhancedLocalOCR(objectUrl, overlay, isKK, discipline) {
    updateProgress(overlay, 20, '📷 Bild wird vorbereitet...');

    const worker = await getWorker();
    if (!worker) throw new Error('OCR worker unavailable');

    const sourceImage = await loadImage(objectUrl);
    let sourceCanvas = createSourceCanvas(sourceImage);

    // ═══ ADAPTIVE IMAGE TYPE DETECTION ═══
    updateProgress(overlay, 21, '🔍 Bildtyp wird analysiert...');
    const imageType = await analyzeImageType(sourceCanvas);
    const isMonitor = imageType.isMonitor;
    const isUncertain = imageType.isUncertain;

    console.log(`[ImageCompare] Bildtyp erkannt: ${isMonitor ? 'Monitor' : isUncertain ? 'Unsicher' : 'Papier'} (Konfidenz: ${Math.round(imageType.confidence * 100)}%)`);
    if (isMonitor) {
      console.log(`[ImageCompare] Monitor-Details: Helligkeit=${Math.round(imageType.avgBrightness)}, StdDev=${Math.round(imageType.stdDev)}, Moiré=${imageType.moiréScore.toFixed(3)}`);
    }

    // ═══ PERSPEKTIV-KORREKTUR (für Monitor-Fotos) ═══
    let perspectiveCorrected = false;
    if (isMonitor || isUncertain || imageType.confidence > 0.3) {
      try {
        updateProgress(overlay, 22, '📐 Perspektiv-Korrektur...');
        const correctedCanvas = correctPerspective(sourceCanvas);
        if (correctedCanvas) {
          sourceCanvas = correctedCanvas;
          perspectiveCorrected = true;
          console.log('[ImageCompare] Perspektiv-Korrektur erfolgreich angewendet');
        }
      } catch (e) {
        console.warn('[ImageCompare] Perspektiv-Korrektur fehlgeschlagen:', e);
      }
    }

    const attempts = [];
    const passes = isMonitor
      ? MONITOR_OCR_PASSES.slice(0, 6)  // Monitor-optimierte Passes
      : DEFAULT_OCR_PASSES.slice(0, 6);  // Standard Papier-Passes
    const multiScoreEnabled = overlay.dataset.multiScore === 'true';
    const totalPasses = passes.length + (multiScoreEnabled ? 1 : 0);

    for (let i = 0; i < passes.length; i++) {
      const pass = passes[i];
      const passCanvas = createPassCanvas(sourceCanvas, pass, discipline, isMonitor);
      updateProgress(overlay, Math.round(26 + (i / Math.max(1, totalPasses)) * 58), `OCR läuft: ${pass.name}`);

      const result = await recognizeCanvas(worker, passCanvas, pass, i, totalPasses, overlay, isMonitor);
      const parsed = parseScoreFromText(result.rawText, isKK, discipline, {
        ocrConfidence: result.ocrConfidence,
        cropKey: pass.options && pass.options.cropKey,
        passWeight: 1 - (i / Math.max(1, passes.length + 1))
      });

      attempts.push({
        ...result,
        parsed
      });

      const aggregate = aggregateOCRAttempts(attempts, isKK);
      if (
        aggregate.bestMatch
        && aggregate.bestMatch.confidence >= 0.96
        && aggregate.bestMatch.sourceCount >= 2
      ) {
        break;
      }
    }

    if (multiScoreEnabled) {
      updateProgress(overlay, 88, 'Mehrfach-Scores werden geprüft...');
      const multiAttempt = await attemptMultiScore(sourceImage, discipline, isKK);
      if (multiAttempt) {
        attempts.push(multiAttempt);
      }
    }

    const aggregate = aggregateOCRAttempts(attempts, isKK);
    const rawSummary = buildAttemptSummary(attempts);
    const contextualized = applyContextualResult({
      ...aggregate,
      rawText: rawSummary
    }, rawSummary, discipline, isKK);

    return {
      ...contextualized,
      rawText: rawSummary,
      attempts,
      imageType: {
        isMonitor,
        isUncertain: imageType.isUncertain,
        confidence: imageType.confidence,
        type: imageType.type,
        indicators: imageType.indicators || {}
      },
      perspectiveCorrected
    };
  }

  function getCacheKey(file) {
    return [file.name, file.size, file.lastModified].join('|');
  }

  function updateProgress(overlay, pct, statusText) {
    const progress = overlay.querySelector('#icProgress');
    const progressFill = overlay.querySelector('#icProgressFill');
    const progressStatus = overlay.querySelector('#icProgressStatus');
    if (progress) progress.classList.add('active');
    if (progressFill) progressFill.style.width = Math.max(0, Math.min(100, pct)) + '%';
    if (progressStatus) progressStatus.textContent = statusText;
  }

  function createOverlay(botScore, isKK) {
    const overlay = document.getElementById('icOverlay');
    if (!overlay) {
      console.error('[ImageCompare] #icOverlay not found in index.html');
      return null;
    }

    resetUploadZone(overlay, isKK);

    overlay.style.opacity = '1';
    overlay.style.pointerEvents = 'auto';
    overlay.style.transition = 'opacity .2s';
    overlay.dataset.botScore = String(botScore || 0);
    overlay.dataset.isKK = isKK ? 'true' : 'false';

    // Body scroll lock
    document.body.style.overflow = 'hidden';
    // iOS Safari fallback
    if (window.innerWidth <= 768) {
      const scrollY = window.scrollY || window.pageYOffset;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
    }

    if (!overlay.dataset.eventsAttached) {
      setupOverlayEvents(overlay);
      overlay.dataset.eventsAttached = 'true';
    }

    return overlay;
  }

  function setupOverlayEvents(overlay) {
    const closeBtn = overlay.querySelector('#icClose');
    const uploadZone = overlay.querySelector('#icUploadZone');
    const compareBtn = overlay.querySelector('#icCompareBtn');
    const rawToggle = overlay.querySelector('#icRawToggle');
    const rawText = overlay.querySelector('#icRawText');
    const scoreInput = overlay.querySelector('#icScoreInput');
    const btnWrong = overlay.querySelector('#icBtnWrong');
    const editScoreBlock = overlay.querySelector('#icEditScoreBlock');
    const sheet = overlay.querySelector('.ic-sheet');

    if (!uploadZone || !compareBtn || !rawToggle || !rawText || !scoreInput || !sheet) return;

    if (closeBtn) {
      closeBtn.addEventListener('click', () => closeOverlay());
    }

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeOverlay();
    });

    uploadZone.addEventListener('change', (e) => {
      if (e.target && e.target.id === 'icFileInput') {
        const file = e.target.files && e.target.files[0];
        if (file) {
          handleImageFileEnhanced(file, overlay);
        }
      }
    });

    uploadZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadZone.classList.add('dragover');
    });

    uploadZone.addEventListener('dragleave', () => {
      uploadZone.classList.remove('dragover');
    });

    uploadZone.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadZone.classList.remove('dragover');
      const file = e.dataTransfer && e.dataTransfer.files ? e.dataTransfer.files[0] : null;
      if (file && file.type && file.type.startsWith('image/')) {
        handleImageFileEnhanced(file, overlay);
      }
    });

    if (btnWrong && editScoreBlock) {
      btnWrong.addEventListener('click', () => {
        btnWrong.style.display = 'none';
        editScoreBlock.style.display = 'block';
        scoreInput.focus();
      });
    }

    scoreInput.addEventListener('input', () => {
      const val = parseFloat(String(scoreInput.value).replace(',', '.'));
      compareBtn.disabled = Number.isNaN(val) || val < 0;
    });

    scoreInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        compareBtn.click();
      }
    });

    rawToggle.addEventListener('click', () => {
      rawText.classList.toggle('visible');
      rawToggle.textContent = rawText.classList.contains('visible')
        ? '▼ OCR-Rohtext ausblenden'
        : '▶ OCR-Rohtext anzeigen';
    });

    compareBtn.addEventListener('click', () => {
      const isKK = overlay.dataset.isKK === 'true';
      const discipline = overlay.dataset.discipline || null;
      const botScore = parseFloat(overlay.dataset.botScore) || 0;
      const playerScore = parseFloat(String(scoreInput.value).replace(',', '.'));
      if (Number.isNaN(playerScore) || playerScore < 0) {
        scoreInput.style.borderColor = 'rgba(240,80,60,.6)';
        setTimeout(() => { scoreInput.style.borderColor = ''; }, 1200);
        return;
      }

      const detected = overlay.dataset.detectedScore ? parseFloat(overlay.dataset.detectedScore) : NaN;
      if (Brain && Brain.FEEDBACK_ENABLED && overlay._currentFile && !Number.isNaN(detected) && Math.abs(detected - playerScore) > 0.0001) {
        maybeSendToFormspree(overlay._currentFile, playerScore, detected);
      }

      if (typeof ContextualOCR !== 'undefined') {
        ContextualOCR.setGameContext(discipline, isKK ? 'kk' : 'lg');
        ContextualOCR.addConfirmedScore(playerScore);
      }

      const detectedShots = overlay._detectedShots || null;
      closeOverlay();

      const playerInp = document.getElementById('playerInp');
      const playerInpInt = document.getElementById('playerInpInt');

      if (discipline === 'kk3x20') {
        if (playerInpInt) playerInpInt.value = String(Math.round(playerScore));
      } else {
        if (playerInp) playerInp.value = playerScore.toFixed(1);
        if (playerInpInt) playerInpInt.value = ''; // We clear Ganze because estimating it with Math.floor is mathematically incorrect for shooting sports.
      }

      if (typeof window.calcResult === 'function') {
        window.calcResult(null, detectedShots);
      } else if (typeof window.showGameOver === 'function') {
        window.showGameOver(playerScore, botScore, null, Math.floor(playerScore), detectedShots);
      }
    });

    let startY = 0;
    sheet.addEventListener('touchstart', (e) => {
      startY = e.touches[0].clientY;
    }, { passive: true });

    sheet.addEventListener('touchend', (e) => {
      const dy = e.changedTouches[0].clientY - startY;
      if (dy > 80) closeOverlay();
    }, { passive: true });
  }

  function closeOverlay() {
    const overlay = document.getElementById('icOverlay');
    if (overlay) {
      overlay.style.opacity = '0';
      overlay.style.pointerEvents = 'none';
      const isKK = overlay.dataset.isKK === 'true';
      resetUploadZone(overlay, isKK);
    }
    _isProcessing = false;
    // Body scroll unlock
    document.body.style.overflow = '';
    // iOS Safari fallback: scroll position wiederherstellen
    if (window.innerWidth <= 768 && document.body.style.position === 'fixed') {
      const scrollY = Math.abs(parseInt(document.body.style.top, 10) || 0);
      document.body.style.position = '';
      document.body.style.top = '';
      window.scrollTo(0, scrollY);
    }
  }

  async function handleImageFile(file, overlay) {
    if (_isProcessing) return;
    _isProcessing = true;

    const isKK = overlay.dataset.isKK === 'true';
    const discipline = overlay.dataset.discipline || null;
    const cacheKey = getCacheKey(file);

    const uploadZone = overlay.querySelector('#icUploadZone');
    const resultCard = overlay.querySelector('#icResultCard');

    if (!uploadZone || !resultCard) {
      _isProcessing = false;
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    let revoked = false;
    const safeRevoke = () => {
      if (revoked) return;
      revoked = true;
      URL.revokeObjectURL(objectUrl);
    };

    uploadZone.classList.add('has-image');
    const icon = uploadZone.querySelector('.ic-upload-icon');
    const text = uploadZone.querySelector('.ic-upload-text');
    const sub = uploadZone.querySelector('.ic-upload-sub');
    const input = uploadZone.querySelector('#icFileInput');
    if (icon) icon.style.display = 'none';
    if (text) text.style.display = 'none';
    if (sub) sub.style.display = 'none';
    if (input) input.style.display = 'none';

    const previewWrap = document.createElement('div');
    previewWrap.className = 'ic-preview-wrap';
    previewWrap.innerHTML = `
      <img class="ic-preview-img" src="${objectUrl}" alt="Upload" id="icPreviewImg">
      <div class="ic-remove-img" id="icRemoveImg" title="Bild entfernen">✕</div>
    `;
    uploadZone.appendChild(previewWrap);

    const removeBtn = previewWrap.querySelector('#icRemoveImg');
    if (removeBtn) {
      removeBtn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        safeRevoke();
        resetUploadZone(overlay, isKK);
        _isProcessing = false;
      });
    }

    const cached = _ocrCache.get(cacheKey);
    if (cached) {
      renderOCRResult(cached, cached.rawText || '', overlay, isKK);
      safeRevoke();
      _isProcessing = false;
      return;
    }

    overlay._currentFile = file;
    if (typeof ContextualOCR !== 'undefined') {
      ContextualOCR.setGameContext(discipline, isKK ? 'kk' : 'lg');
    }

    resultCard.classList.remove('active');

    // ═══ LOKALE TESSERACT OCR (Ohne KI) ═══
    try {
      updateProgress(overlay, 20, '📷 Lokale Texterkennung wird geladen...');

      const worker = await getWorker();
      if (!worker) throw new Error('OCR worker unavailable');

      updateProgress(overlay, 30, '📷 Texterkennung läuft...');
      _ocrProgressCallback = (prog) => {
        const pct = Math.round(35 + (prog || 0) * 55);
        updateProgress(overlay, pct, '📷 Texterkennung läuft...');
      };

      const result = await worker.recognize(objectUrl);
      _ocrProgressCallback = null;

      const rawText = result && result.data && result.data.text ? result.data.text : '';
      let parsed = parseScoreFromText(rawText, isKK, discipline);
      parsed.rawText = rawText;

      if (typeof ContextualOCR !== 'undefined' && ContextualOCR.CONFIG.enableContextualCorrections) {
        const contextualResult = ContextualOCR.analyzeWithContext(parsed, rawText, discipline, isKK ? 'kk' : 'lg');
        if (contextualResult.corrected) {
          parsed = contextualResult;
        }
      }

      if (parsed.bestMatch) {
        _ocrCache.set(cacheKey, parsed);
        while (_ocrCache.size > OCR_CACHE_MAX) {
          const first = _ocrCache.keys().next().value;
          _ocrCache.delete(first);
        }
      }

      updateProgress(overlay, 100, 'Analyse abgeschlossen');
      renderOCRResult(parsed, rawText, overlay, isKK);
    } catch (err) {
      console.warn('[ImageCompare] Tesseract OCR failed:', err);
      updateProgress(overlay, 100, 'Erkennung fehlgeschlagen - manuelle Eingabe');
      renderOCRResult({ bestMatch: null, alternatives: [] }, '', overlay, isKK);
    } finally {
      safeRevoke();
      _isProcessing = false;
      resetWorkerIdleTimer();
    }
  }

  async function handleImageFileEnhanced(file, overlay) {
    if (_isProcessing) return;
    _isProcessing = true;

    const isKK = overlay.dataset.isKK === 'true';
    const discipline = overlay.dataset.discipline || null;
    const cacheKey = getCacheKey(file);

    const uploadZone = overlay.querySelector('#icUploadZone');
    const resultCard = overlay.querySelector('#icResultCard');

    if (!uploadZone || !resultCard) {
      _isProcessing = false;
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    let revoked = false;
    const safeRevoke = () => {
      if (revoked) return;
      revoked = true;
      URL.revokeObjectURL(objectUrl);
    };

    uploadZone.classList.add('has-image');
    const icon = uploadZone.querySelector('.ic-upload-icon');
    const text = uploadZone.querySelector('.ic-upload-text');
    const sub = uploadZone.querySelector('.ic-upload-sub');
    const input = uploadZone.querySelector('#icFileInput');
    if (icon) icon.style.display = 'none';
    if (text) text.style.display = 'none';
    if (sub) sub.style.display = 'none';
    if (input) input.style.display = 'none';

    const previewWrap = document.createElement('div');
    previewWrap.className = 'ic-preview-wrap';
    previewWrap.innerHTML = `
      <img class="ic-preview-img" src="${objectUrl}" alt="Upload" id="icPreviewImg">
      <div class="ic-remove-img" id="icRemoveImg" title="Bild entfernen">✕</div>
    `;
    uploadZone.appendChild(previewWrap);

    const removeBtn = previewWrap.querySelector('#icRemoveImg');
    if (removeBtn) {
      removeBtn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        safeRevoke();
        resetUploadZone(overlay, isKK);
        _isProcessing = false;
      });
    }

    const cached = _ocrCache.get(cacheKey);
    if (cached) {
      renderOCRResult(cached, cached.rawText || '', overlay, isKK);
      safeRevoke();
      _isProcessing = false;
      return;
    }

    overlay._currentFile = file;
    overlay._detectedShots = null;
    if (typeof ContextualOCR !== 'undefined') {
      ContextualOCR.setGameContext(discipline, isKK ? 'kk' : 'lg');
    }

    resultCard.classList.remove('active');

    try {
      const parsed = await performEnhancedLocalOCR(objectUrl, overlay, isKK, discipline);

      if (parsed.bestMatch) {
        _ocrCache.set(cacheKey, parsed);
        while (_ocrCache.size > OCR_CACHE_MAX) {
          const first = _ocrCache.keys().next().value;
          _ocrCache.delete(first);
        }
      }

      updateProgress(overlay, 100, 'Analyse abgeschlossen');
      renderOCRResult(parsed, parsed.rawText || '', overlay, isKK);
    } catch (err) {
      console.warn('[ImageCompare] Enhanced OCR failed:', err);
      updateProgress(overlay, 100, 'Erkennung fehlgeschlagen - manuelle Eingabe');
      renderOCRResult({ bestMatch: null, alternatives: [] }, '', overlay, isKK);
    } finally {
      safeRevoke();
      _isProcessing = false;
      resetWorkerIdleTimer();
    }
  }

  function renderOCRResult(parsed, rawTextStr, overlay, isKK) {
    const progress = overlay.querySelector('#icProgress');
    const resultCard = overlay.querySelector('#icResultCard');
    const detectedValue = overlay.querySelector('#icDetectedValue');
    const detectedLabel = overlay.querySelector('#icDetectedLabel');
    const scoreInput = overlay.querySelector('#icScoreInput');
    const compareBtn = overlay.querySelector('#icCompareBtn');
    const rawText = overlay.querySelector('#icRawText');

    if (!resultCard || !scoreInput || !compareBtn) return;

    if (rawText) rawText.textContent = rawTextStr || '(kein Text erkannt)';
    if (progress) progress.classList.remove('active');
    resultCard.classList.add('active');

    if (parsed && parsed.bestMatch) {
      const value = parsed.bestMatch.value;
      const displayValue = isKK ? String(Math.floor(value)) : Number(value).toFixed(1);

      if (detectedValue) detectedValue.textContent = displayValue;
      if (detectedLabel) {
        const conf = Math.round((parsed.bestMatch.confidence || 0) * 100);
        detectedLabel.textContent = 'Erkannt (' + conf + '% Konfidenz)';
      }

      scoreInput.value = displayValue;
      compareBtn.disabled = false;
      overlay.dataset.detectedScore = displayValue;
    } else {
      if (detectedValue) detectedValue.textContent = '?';
      if (detectedLabel) detectedLabel.textContent = 'Keine Punktzahl erkannt - bitte manuell eingeben';
      scoreInput.value = '';
      compareBtn.disabled = true;
      scoreInput.focus();
      delete overlay.dataset.detectedScore;
    }
  }

  function resetUploadZone(overlay, isKK) {
    const uploadZone = overlay.querySelector('#icUploadZone');
    const progress = overlay.querySelector('#icProgress');
    const resultCard = overlay.querySelector('#icResultCard');
    const compareBtn = overlay.querySelector('#icCompareBtn');
    const btnWrong = overlay.querySelector('#icBtnWrong');
    const editScoreBlock = overlay.querySelector('#icEditScoreBlock');
    const scoreInput = overlay.querySelector('#icScoreInput');
    const detectedValue = overlay.querySelector('#icDetectedValue');
    const detectedLabel = overlay.querySelector('#icDetectedLabel');
    const rawText = overlay.querySelector('#icRawText');
    const rawToggle = overlay.querySelector('#icRawToggle');

    if (!uploadZone) return;

    const previewWrap = uploadZone.querySelector('.ic-preview-wrap');
    if (previewWrap) previewWrap.remove();

    uploadZone.classList.remove('has-image');

    const icon = uploadZone.querySelector('.ic-upload-icon');
    const text = uploadZone.querySelector('.ic-upload-text');
    const sub = uploadZone.querySelector('.ic-upload-sub');
    const input = uploadZone.querySelector('#icFileInput');
    if (icon) icon.style.display = '';
    if (text) text.style.display = '';
    if (sub) sub.style.display = '';
    if (input) {
      input.style.display = '';
      input.value = '';
    }

    if (progress) progress.classList.remove('active');
    if (resultCard) resultCard.classList.remove('active');
    if (compareBtn) compareBtn.disabled = true;
    if (btnWrong) btnWrong.style.display = 'block';
    if (editScoreBlock) editScoreBlock.style.display = 'none';

    if (rawText) {
      rawText.classList.remove('visible');
      rawText.textContent = '';
    }
    if (rawToggle) rawToggle.textContent = '▶ OCR-Rohtext anzeigen';

    if (detectedValue) detectedValue.textContent = '–';
    if (detectedLabel) detectedLabel.textContent = 'Wird analysiert...';

    if (scoreInput) {
      scoreInput.value = '';
      scoreInput.placeholder = isKK ? 'z.B. 392' : 'z.B. 405.2';
      scoreInput.step = isKK ? '1' : '0.1';
      scoreInput.inputMode = isKK ? 'numeric' : 'decimal';
    }

    delete overlay.dataset.detectedScore;
    delete overlay._currentFile;
    delete overlay._detectedShots;

  }

  function maybeSendToFormspree(file, expectedScore, detectedScore) {
    const shouldUpload = typeof window !== 'undefined'
      && typeof window.confirm === 'function'
      && window.confirm('Die OCR lag daneben. Moechtest du dieses Foto anonym zur Verbesserung der Erkennung senden?');

    if (!shouldUpload) return;
    return sendToFormspree(file, expectedScore, detectedScore);
  }

  async function sendToFormspree(file, expectedScore, detectedScore) {
    if (!Brain || !Brain.FEEDBACK_ENABLED || !file || !Brain.FORMSPREE_ENDPOINT) return;

    try {
      const url = 'https://formspree.io/f/' + Brain.FORMSPREE_ENDPOINT;
      const formData = new FormData();
      formData.append('Fehlerbericht', 'KI lag falsch');
      formData.append('KI_dachte', String(detectedScore));
      formData.append('Wahrer_Score', String(expectedScore));
      formData.append('Foto_Upload', file, file.name || 'feedback.jpg');

      await fetch(url, {
        method: 'POST',
        body: formData,
        headers: { 'Accept': 'application/json' }
      });
    } catch (e) {
      console.warn('[ImageCompare] Formspree upload failed:', e);
    }
  }


  return {
    init() {
      injectStyles();
    },

    async getTesseractWorker() {
      return await getWorker();
    },

    open(botScore, isKK, discipline = null) {
      injectStyles();

      if (typeof ContextualOCR !== 'undefined') {
        ContextualOCR.setGameContext(discipline, isKK ? 'kk' : 'lg');
      }

      const overlay = createOverlay(botScore || 0, !!isKK);
      if (!overlay) return;
      overlay.dataset.discipline = discipline || '';
      overlay.dataset.multiScore = 'false';
    },

    // NEU: Multi-Score Detection Funktion
    openWithMultiScore(botScore, isKK, discipline = null) {
      injectStyles();

      // Setze OCR-Kontext für bessere Erkennung
      if (typeof ContextualOCR !== 'undefined') {
        ContextualOCR.setGameContext(discipline, isKK ? 'kk' : 'lg');
      }

      const overlay = createOverlay(botScore || 0, !!isKK);
      if (!overlay) return;
      overlay.dataset.discipline = discipline || '';
      overlay.dataset.multiScore = 'true';
    },

    createGameOverButton(container, botScore, isKK, discipline = null) {
      if (!container) return;
      injectStyles();

      if (container.querySelector('.ic-go-upload-btn')) return;

      const btn = document.createElement('button');
      btn.className = 'ic-go-upload-btn';
      btn.innerHTML = '<span class="ic-go-upload-ico">📷</span> Foto schiessen';
      btn.addEventListener('click', () => {
        this.open(botScore, isKK, discipline);
      });

      container.appendChild(btn);
    },

    /**
     * Manuelles Feedback für Monitor-Kalibrierung speichern
     * @param {boolean} wasCorrect - War die Bildtyp-Erkennung korrekt?
     */
    reportImageTypeClassification(wasCorrect) {
      if (typeof wasCorrect === 'boolean') {
        saveMonitorFeedback(wasCorrect);
        console.log(`[ImageCompare] Feedback gespeichert: ${wasCorrect ? 'korrekt' : 'falsch'}`);
      }
    },

    /**
     * Aktuelle Kalibrierungs-Statistik abrufen
     */
    getCalibrationStats() {
      try {
        const stored = localStorage.getItem('ic_monitor_calibration');
        return stored ? JSON.parse(stored) : { feedbackCount: 0, correctClassifications: 0 };
      } catch (e) {
        return { feedbackCount: 0, correctClassifications: 0 };
      }
    },

    /**
     * Kalibrierung zurücksetzen
     */
    resetCalibration() {
      try {
        localStorage.removeItem('ic_monitor_calibration');
        console.log('[ImageCompare] Kalibrierung zurückgesetzt');
      } catch (e) { /* ignore */ }
    }
  };
})();
