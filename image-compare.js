window.ImageCompare = (function () {
  'use strict';

  const Brain = window.ImageCompareBrain || null;
  const SCORE_CONFIG = Brain && Brain.SCORE_CONFIG ? Brain.SCORE_CONFIG : null;

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

  function getKeywordBonus(cleanText, index, matchLength) {
    const keywords = SCORE_CONFIG && Array.isArray(SCORE_CONFIG.KEYWORDS)
      ? SCORE_CONFIG.KEYWORDS
      : ['gesamt', 'total', 'summe', 'ergebnis', 'result', 'ringe', 'pkt'];

    const start = Math.max(0, index - 18);
    const end = Math.min(cleanText.length, index + matchLength + 18);
    const snippet = cleanText.slice(start, end).toLowerCase();
    return keywords.some(keyword => snippet.includes(keyword)) ? 0.08 : 0;
  }

  function buildCandidateConfidence(baseConfidence, meta, cleanText, index, matchLength, type) {
    const ocrConfidence = getNormalizedOCRConfidence(meta.ocrConfidence);
    const cropWeight = getCropWeight(meta.cropKey);
    const passWeight = Number.isFinite(Number(meta.passWeight)) ? Number(meta.passWeight) : 0.75;
    const compactnessBonus = cleanText.length <= 18 ? 0.03 : 0;
    const keywordBonus = getKeywordBonus(cleanText, index, matchLength);
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
          confidence: buildCandidateConfidence(0.84, meta, clean, m.index, m[0].length, 'decimal'),
          type: 'decimal'
        });
      }

      if (isKK) {
        const collapsed = parseInt(m[1] + m[2], 10);
        if (collapsed >= min && collapsed <= max) {
          addCandidate(candidates, {
            value: collapsed,
            confidence: buildCandidateConfidence(0.76, meta, clean, m.index, m[0].length, 'collapsed_integer'),
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
            confidence: buildCandidateConfidence(0.72, meta, clean, m.index, m[0].length, 'split_decimal'),
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
            confidence: buildCandidateConfidence(0.74, meta, clean, m.index, m[0].length, 'implied_decimal'),
            type: 'decimal'
          });
        }
      }
    }

    const intRegex = /\b(\d{2,3})\b/g;
    while ((m = intRegex.exec(clean)) !== null) {
      const value = parseInt(m[1], 10);
      if (value >= min && value <= max) {
        addCandidate(candidates, {
          value,
          confidence: buildCandidateConfidence(isKK ? 0.88 : 0.62, meta, clean, m.index, m[0].length, 'integer'),
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

  function applyPreprocessing(canvas, options = {}) {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return canvas;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const gamma = Number.isFinite(Number(options.gamma)) ? Number(options.gamma) : 1;
    const contrast = Number.isFinite(Number(options.contrast)) ? Number(options.contrast) : 1;
    const invert = !!options.invert;

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

  function createPassCanvas(sourceCanvas, pass, discipline) {
    const options = pass.options || {};
    const cropRect = getCropRect(sourceCanvas.width, sourceCanvas.height, options.cropKey || 'full', discipline);
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

  async function recognizeCanvas(worker, canvas, pass, passIndex, totalPasses, overlay) {
    const options = pass.options || {};
    if (worker && worker.setParameters) {
      await worker.setParameters({
        tessedit_pageseg_mode: String(options.psm || 6),
        preserve_interword_spaces: '1',
        user_defined_dpi: String(options.userDefinedDpi || 300),
        tessedit_char_whitelist: '0123456789., OolI|Ss\n'
      });
    }

    const progressBase = 28 + (passIndex / Math.max(1, totalPasses)) * 58;
    _ocrProgressCallback = (prog) => {
      const pct = Math.round(progressBase + (prog || 0) * (58 / Math.max(1, totalPasses)));
      updateProgress(overlay, pct, `OCR läuft: ${pass.name}`);
    };

    const result = await worker.recognize(canvas.toDataURL('image/jpeg', 0.92));
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
    const sourceCanvas = createSourceCanvas(sourceImage);
    const attempts = [];
    const passes = DEFAULT_OCR_PASSES.slice(0, 6);
    const multiScoreEnabled = overlay.dataset.multiScore === 'true';
    const totalPasses = passes.length + (multiScoreEnabled ? 1 : 0);

    for (let i = 0; i < passes.length; i++) {
      const pass = passes[i];
      const passCanvas = createPassCanvas(sourceCanvas, pass, discipline);
      updateProgress(overlay, Math.round(26 + (i / Math.max(1, totalPasses)) * 58), `OCR läuft: ${pass.name}`);

      const result = await recognizeCanvas(worker, passCanvas, pass, i, totalPasses, overlay);
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
      attempts
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

    // ═══ PRIMÄR: Gemini Vision API für Score-Erkennung + Coaching ═══
    if (typeof GeminiCoach !== 'undefined' && GeminiCoach.isAvailable()) {
      try {
        updateProgress(overlay, 15, '🤖 KI analysiert dein Foto...');

        // Spiel-Kontext aus globalem State (G)
        const difficulty = (typeof G !== 'undefined' && G.diff) ? G.diff : 'real';
        const gameDiscipline = (typeof G !== 'undefined' && G.discipline) ? G.discipline : discipline;

        updateProgress(overlay, 40, '🤖 Gemini erkennt Score & erstellt Coaching...');

        const geminiResult = await GeminiCoach.analyzePhoto(file, difficulty, gameDiscipline, isKK);

        if (geminiResult && !geminiResult.error) {
          // Score aus Gemini-Antwort in das bestehende Format konvertieren
          const parsed = {
            bestMatch: geminiResult.score != null
              ? { value: geminiResult.score, confidence: 0.97, type: isKK ? 'integer' : 'decimal' }
              : null,
            alternatives: [],
            rawText: '(Gemini Vision KI-Erkennung)'
          };

          if (parsed.bestMatch) {
            _ocrCache.set(cacheKey, parsed);
            if (geminiResult.shots) {
              overlay._detectedShots = geminiResult.shots;
            }
            while (_ocrCache.size > OCR_CACHE_MAX) {
              const first = _ocrCache.keys().next().value;
              _ocrCache.delete(first);
            }
          }

          updateProgress(overlay, 100, '✅ KI-Analyse abgeschlossen');
          renderOCRResult(parsed, parsed.rawText, overlay, isKK);

          // Coaching-Tipps anzeigen
          showCoachingTips(geminiResult.tips);

          safeRevoke();
          _isProcessing = false;
          return;
        }

        // Gemini hatte einen Fehler → Fallback
        console.warn('[ImageCompare] Gemini returned error, falling back to Tesseract:', geminiResult.error);
        showCoachingTips(geminiResult.tips || '');
      } catch (geminiErr) {
        console.warn('[ImageCompare] Gemini call failed, falling back to Tesseract:', geminiErr);
      }
    }

    // ═══ FALLBACK: Lokale Tesseract OCR ═══
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

    if (typeof GeminiCoach !== 'undefined' && GeminiCoach.isAvailable()) {
      try {
        updateProgress(overlay, 15, '🤖 KI analysiert dein Foto...');

        const difficulty = (typeof G !== 'undefined' && G.diff) ? G.diff : 'real';
        const gameDiscipline = (typeof G !== 'undefined' && G.discipline) ? G.discipline : discipline;

        updateProgress(overlay, 40, '🤖 Gemini erkennt Score & erstellt Coaching...');

        const geminiResult = await GeminiCoach.analyzePhoto(file, difficulty, gameDiscipline, isKK);

        if (geminiResult && !geminiResult.error) {
          const parsed = {
            bestMatch: geminiResult.score != null
              ? { value: geminiResult.score, confidence: 0.97, type: isKK ? 'integer' : 'decimal' }
              : null,
            alternatives: [],
            rawText: '(Gemini Vision KI-Erkennung)'
          };

          if (parsed.bestMatch) {
            _ocrCache.set(cacheKey, parsed);
            if (geminiResult.shots) {
              overlay._detectedShots = geminiResult.shots;
            }
            while (_ocrCache.size > OCR_CACHE_MAX) {
              const first = _ocrCache.keys().next().value;
              _ocrCache.delete(first);
            }
          }

          updateProgress(overlay, 100, '✅ KI-Analyse abgeschlossen');
          renderOCRResult(parsed, parsed.rawText, overlay, isKK);
          showCoachingTips(geminiResult.tips);

          safeRevoke();
          _isProcessing = false;
          return;
        }

        console.warn('[ImageCompare] Gemini returned error, falling back to local OCR:', geminiResult && geminiResult.error);
        showCoachingTips((geminiResult && geminiResult.tips) || '');
      } catch (geminiErr) {
        console.warn('[ImageCompare] Gemini call failed, falling back to local OCR:', geminiErr);
      }
    }

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

    // KI-Coaching Box zurücksetzen
    const aiBox = document.getElementById('aiCoachingBox');
    if (aiBox) aiBox.style.display = 'none';
    const aiContent = document.getElementById('aiCoachingContent');
    if (aiContent) aiContent.textContent = 'Wird analysiert…';
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

  /**
   * Zeigt die KI-Coaching-Tipps in der Coaching-Box an
   */
  function showCoachingTips(tips) {
    const box = document.getElementById('aiCoachingBox');
    const content = document.getElementById('aiCoachingContent');
    const spinner = document.getElementById('aiCoachingSpinner');
    if (!box || !content) return;

    if (!tips || tips.length === 0) {
      box.style.display = 'none';
      return;
    }

    box.style.display = '';
    content.textContent = tips;
    content.style.opacity = '1';
    if (spinner) spinner.classList.remove('active');
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
    }
  };
})();
