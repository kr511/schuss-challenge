/**
 * Batch Processor
 *
 * Verarbeitet mehrere Foto-Dateien parallel: Quality-Check -> Auto-Correct ->
 * OCR. Stellt zudem eine UI bereit, mit der die Ergebnisse editiert und in
 * den Schnelltraining-Verlauf uebernommen werden koennen.
 */
window.BatchProcessor = (function () {
  'use strict';

  const MAX_PARALLEL = 10;
  const STORAGE_KEY = 'sd_quick_training_log';
  const QT_HISTORY_LIMIT = 50;
  const STYLE_TAG_ID = 'sd-batch-processor-styles';

  function fileToImage(file) {
    return new Promise((resolve, reject) => {
      try {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
          resolve({ image: img, revoke: () => URL.revokeObjectURL(url) });
        };
        img.onerror = () => {
          URL.revokeObjectURL(url);
          reject(new Error('Bild konnte nicht geladen werden'));
        };
        img.src = url;
      } catch (err) {
        reject(err);
      }
    });
  }

  function imageToCanvas(image) {
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth || image.width;
    canvas.height = image.naturalHeight || image.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas-Context nicht verfuegbar');
    ctx.drawImage(image, 0, 0);
    return canvas;
  }

  function pickAutoCorrectFactor(brightness) {
    if (!Number.isFinite(brightness)) return 1;
    if (brightness < 25) return 1.6;
    if (brightness < 35) return 1.3;
    if (brightness > 85) return 0.75;
    if (brightness > 75) return 0.9;
    return 1;
  }

  function detectIsKK() {
    try {
      if (typeof document === 'undefined') return false;
      const select = document.getElementById('disciplineSelect') || document.querySelector('[data-discipline]');
      const value = select && (select.value || select.getAttribute('data-discipline'));
      if (typeof value === 'string' && value.toLowerCase().startsWith('kk')) return true;
    } catch (_e) { /* noop */ }
    return false;
  }

  function discoverDiscipline() {
    try {
      if (typeof document === 'undefined') return null;
      const select = document.getElementById('disciplineSelect') || document.querySelector('[data-discipline]');
      const value = select && (select.value || select.getAttribute('data-discipline'));
      if (typeof value === 'string' && value.length > 0) return value;
    } catch (_e) { /* noop */ }
    return null;
  }

  function cleanOCRText(text) {
    if (window.ImageCompareBrain && typeof window.ImageCompareBrain.cleanOCRText === 'function') {
      return window.ImageCompareBrain.cleanOCRText(text);
    }
    return String(text || '').replace(/[oO]/g, '0').replace(/[lI|]/g, '1').replace(/,/g, '.').replace(/\s+/g, ' ');
  }

  function parseSimpleScore(rawText, isKK) {
    const clean = cleanOCRText(rawText);
    if (window.ImageCompare && typeof window.ImageCompare.parseScoreFromText === 'function') {
      const parsed = window.ImageCompare.parseScoreFromText(clean, isKK, discoverDiscipline());
      if (parsed && parsed.bestMatch) {
        return { value: parsed.bestMatch.value, confidence: parsed.bestMatch.confidence || 0 };
      }
      return null;
    }
    const decimal = clean.match(/(\d{2,3})\s*[.,]\s*(\d)/);
    if (decimal) {
      const value = parseFloat(decimal[1] + '.' + decimal[2]);
      if (Number.isFinite(value)) return { value, confidence: 0.6 };
    }
    const integer = clean.match(/\b(\d{2,3})\b/);
    if (integer) {
      const value = parseInt(integer[1], 10);
      if (Number.isFinite(value)) return { value, confidence: isKK ? 0.6 : 0.4 };
    }
    return null;
  }

  async function runOCROnCanvas(canvas, isKK) {
    if (!window.ImageCompare || typeof window.ImageCompare.getTesseractWorker !== 'function') {
      throw new Error('OCR nicht verfuegbar');
    }
    const worker = await window.ImageCompare.getTesseractWorker();
    if (!worker) throw new Error('OCR Worker nicht bereit');
    const dataUrl = canvas.toDataURL('image/png');
    const result = await worker.recognize(dataUrl);
    const rawText = (result && result.data && result.data.text) || '';
    const parsed = parseSimpleScore(rawText, isKK);
    return { rawText, parsed };
  }

  async function processSingle(file) {
    if (!file) {
      return { file: null, score: null, confidence: 0, corrected: false, error: 'Kein File' };
    }
    const fileName = file.name || 'foto.jpg';
    let revoke = () => {};
    try {
      const loaded = await fileToImage(file);
      revoke = loaded.revoke;
      let canvas = imageToCanvas(loaded.image);

      let quality = null;
      if (window.ImageQualityAnalyzer && typeof window.ImageQualityAnalyzer.analyzeImageQuality === 'function') {
        quality = window.ImageQualityAnalyzer.analyzeImageQuality(canvas);
      }

      let corrected = false;
      if (quality && window.ImagePreprocessor) {
        const factor = pickAutoCorrectFactor(quality.brightness);
        if (Math.abs(factor - 1) > 0.001) {
          canvas = window.ImagePreprocessor.adjustBrightness(canvas, factor);
          corrected = true;
        }
        if (Math.abs(quality.rotation || 0) > 1) {
          canvas = window.ImagePreprocessor.autoRotate(canvas, -quality.rotation);
          corrected = true;
        }
        if (typeof window.ImagePreprocessor.detectTargetCircle === 'function'
          && typeof window.ImagePreprocessor.cropToCircle === 'function') {
          try {
            const circle = window.ImagePreprocessor.detectTargetCircle(canvas);
            if (circle && circle.confidence >= 0.55 && circle.radius > 20) {
              canvas = window.ImagePreprocessor.cropToCircle(canvas, circle.x, circle.y, circle.radius, 1.2);
              corrected = true;
            }
          } catch (_e) { /* noop */ }
        }
      }

      const isKK = detectIsKK();
      const ocr = await runOCROnCanvas(canvas, isKK);
      const score = ocr.parsed ? ocr.parsed.value : null;
      const confidence = ocr.parsed ? ocr.parsed.confidence : 0;

      return {
        file,
        fileName,
        score,
        confidence,
        corrected,
        rawText: ocr.rawText,
        quality,
        error: null,
      };
    } catch (err) {
      console.warn('[BatchProcessor] Datei fehlgeschlagen:', fileName, err);
      return {
        file,
        fileName,
        score: null,
        confidence: 0,
        corrected: false,
        error: (err && err.message) ? err.message : 'OCR fehlgeschlagen',
      };
    } finally {
      try { revoke(); } catch (_e) { /* noop */ }
    }
  }

  async function batchProcessPhotos(fileList) {
    const list = Array.from(fileList || []).slice(0, MAX_PARALLEL);
    if (!list.length) return [];
    const results = await Promise.all(list.map((file) => processSingle(file).catch((err) => ({
      file,
      fileName: file && file.name,
      score: null,
      confidence: 0,
      corrected: false,
      error: (err && err.message) || 'unbekannter Fehler',
    }))));
    return results;
  }

  function injectStyles() {
    if (typeof document === 'undefined') return;
    if (document.getElementById(STYLE_TAG_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_TAG_ID;
    style.textContent = '\n.sd-batch-overlay{position:fixed;inset:0;background:rgba(8,12,18,.85);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(6px);}\n.sd-batch-card{background:#11161e;color:#fff;border-radius:18px;max-width:640px;width:100%;max-height:92vh;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,.5);}\n.sd-batch-head{padding:16px 20px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid rgba(255,255,255,.08);}\n.sd-batch-head h3{margin:0;font-size:1.05rem;letter-spacing:.06em;text-transform:uppercase;}\n.sd-batch-close{background:none;border:none;color:#fff;font-size:1.4rem;cursor:pointer;line-height:1;padding:4px 8px;border-radius:8px;}\n.sd-batch-close:hover{background:rgba(255,255,255,.08);}\n.sd-batch-body{padding:14px 18px;overflow-y:auto;flex:1;}\n.sd-batch-table{width:100%;border-collapse:collapse;font-size:.88rem;}\n.sd-batch-table th,.sd-batch-table td{padding:8px 6px;text-align:left;border-bottom:1px solid rgba(255,255,255,.05);vertical-align:middle;}\n.sd-batch-table th{font-size:.7rem;text-transform:uppercase;letter-spacing:.08em;opacity:.6;}\n.sd-batch-input{width:90px;padding:6px 8px;background:rgba(255,255,255,.05);color:#fff;border:1px solid rgba(255,255,255,.12);border-radius:8px;font-size:.92rem;}\n.sd-batch-tag{display:inline-block;padding:2px 8px;border-radius:999px;font-size:.7rem;font-weight:600;}\n.sd-batch-tag-ok{background:rgba(122,176,48,.18);color:#bce18e;}\n.sd-batch-tag-warn{background:rgba(241,189,82,.18);color:#f1bd52;}\n.sd-batch-tag-err{background:rgba(229,80,80,.18);color:#ff9d9d;}\n.sd-batch-foot{padding:14px 18px;border-top:1px solid rgba(255,255,255,.08);display:flex;gap:10px;justify-content:flex-end;}\n.sd-batch-btn{padding:10px 16px;border-radius:10px;border:none;font-weight:600;cursor:pointer;font-size:.92rem;letter-spacing:.04em;}\n.sd-batch-btn-primary{background:linear-gradient(135deg,#7ab030,#5e8c20);color:#fff;}\n.sd-batch-btn-primary:disabled{opacity:.4;cursor:not-allowed;}\n.sd-batch-btn-secondary{background:rgba(255,255,255,.06);color:#fff;}\n.sd-batch-status{font-size:.78rem;opacity:.65;text-align:center;padding:18px;}\n.sd-batch-quality{font-size:.7rem;opacity:.6;}\n';
    document.head.appendChild(style);
  }

  function statusTag(result) {
    if (result.error) return '<span class="sd-batch-tag sd-batch-tag-err">Fehler</span>';
    if (result.score === null) return '<span class="sd-batch-tag sd-batch-tag-warn">Unklar</span>';
    if (result.confidence < 0.5) return '<span class="sd-batch-tag sd-batch-tag-warn">Niedrige Konfidenz</span>';
    return '<span class="sd-batch-tag sd-batch-tag-ok">OK</span>';
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function readQuickTrainingHistory() {
    try {
      const ls = window.localStorage;
      if (!ls) return [];
      const raw = ls.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (_e) {
      return [];
    }
  }

  function writeQuickTrainingHistory(history) {
    try {
      const ls = window.localStorage;
      if (!ls) return false;
      const trimmed = history.slice(-QT_HISTORY_LIMIT);
      ls.setItem(STORAGE_KEY, JSON.stringify(trimmed));
      return true;
    } catch (err) {
      console.warn('[BatchProcessor] QuickTraining-Speicherung fehlgeschlagen:', err);
      return false;
    }
  }

  function newLocalId() {
    const ts = Date.now().toString(36);
    const rnd = Math.random().toString(36).slice(2, 8);
    return 'qt_' + ts + '_' + rnd;
  }

  function persistAsQuickTraining(scores, isKK) {
    const values = scores.filter((v) => Number.isFinite(v));
    if (!values.length) return false;
    const total = values.reduce((sum, v) => sum + v, 0);
    const avg = total / values.length;
    const best = Math.max.apply(null, values);
    const worst = Math.min.apply(null, values);
    const entry = {
      local_id: newLocalId(),
      completed_at: new Date().toISOString(),
      discipline: isKK ? 'kk' : 'lg',
      shots: values,
      total,
      avg,
      best,
      worst,
      count: values.length,
      syncStatus: 'local',
      remote_session_id: null,
      source: 'batch_ocr',
    };
    const history = readQuickTrainingHistory();
    history.push(entry);
    const ok = writeQuickTrainingHistory(history);
    if (ok) {
      try {
        window.dispatchEvent(new CustomEvent('quickTrainingSaved', { detail: { entry, saved: true } }));
      } catch (_e) { /* noop */ }
    }
    return ok;
  }

  function renderResultsTable(results) {
    const rows = results.map((r, idx) => {
      const display = r.score === null ? '' : (Number.isInteger(r.score) ? String(r.score) : Number(r.score).toFixed(1));
      const conf = Math.round((r.confidence || 0) * 100);
      const quality = r.quality
        ? ('Hell ' + r.quality.brightness + ' / Schaerfe ' + r.quality.blur + ' / Drehung ' + r.quality.rotation + '&deg;')
        : '';
      const errCell = r.error
        ? '<div style="color:#ff9d9d;font-size:.72rem;">' + escapeHtml(r.error) + '</div>'
        : '';
      return '<tr data-idx="' + idx + '">'
        + '<td>' + escapeHtml(r.fileName || ('Bild ' + (idx + 1))) + '<div class="sd-batch-quality">' + quality + '</div>' + errCell + '</td>'
        + '<td>' + statusTag(r) + '<div style="font-size:.7rem;opacity:.6;">' + (r.corrected ? 'auto-korrigiert' : '&nbsp;') + '</div></td>'
        + '<td><input class="sd-batch-input" data-batch-input="' + idx + '" type="number" step="0.1" min="0" value="' + escapeHtml(display) + '"><div style="font-size:.66rem;opacity:.55;margin-top:2px;">OCR ' + conf + '%</div></td>'
        + '</tr>';
    }).join('');

    return '<table class="sd-batch-table">'
      + '<thead><tr><th>Datei</th><th>Status</th><th>Score</th></tr></thead>'
      + '<tbody>' + rows + '</tbody>'
      + '</table>';
  }

  async function openBatchUI(fileList) {
    injectStyles();
    const isKK = detectIsKK();

    const overlay = document.createElement('div');
    overlay.className = 'sd-batch-overlay';
    overlay.innerHTML = '<div class="sd-batch-card">'
      + '<div class="sd-batch-head"><h3>Batch-Foto Auswertung</h3><button class="sd-batch-close" type="button" aria-label="Schliessen">&times;</button></div>'
      + '<div class="sd-batch-body" data-batch-body><div class="sd-batch-status">Verarbeite ' + Math.min(MAX_PARALLEL, (fileList && fileList.length) || 0) + ' Foto(s)...</div></div>'
      + '<div class="sd-batch-foot"><button class="sd-batch-btn sd-batch-btn-secondary" data-batch-cancel type="button">Abbrechen</button>'
      + '<button class="sd-batch-btn sd-batch-btn-primary" data-batch-apply type="button" disabled>Alle uebernehmen</button></div>'
      + '</div>';
    document.body.appendChild(overlay);

    const close = () => {
      try { overlay.remove(); } catch (_e) { /* noop */ }
    };

    overlay.querySelector('.sd-batch-close').addEventListener('click', close);
    overlay.querySelector('[data-batch-cancel]').addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

    let results = [];
    try {
      results = await batchProcessPhotos(fileList);
    } catch (err) {
      console.warn('[BatchProcessor] Batch fehlgeschlagen:', err);
    }

    const body = overlay.querySelector('[data-batch-body]');
    const applyBtn = overlay.querySelector('[data-batch-apply]');
    if (!body || !applyBtn) return results;

    if (!results.length) {
      body.innerHTML = '<div class="sd-batch-status">Keine Fotos verarbeitet.</div>';
      return results;
    }

    body.innerHTML = renderResultsTable(results);

    const editedScores = results.map((r) => (Number.isFinite(r.score) ? r.score : null));
    const refreshApplyState = () => {
      const valid = editedScores.some((v) => Number.isFinite(v));
      applyBtn.disabled = !valid;
    };
    refreshApplyState();

    body.querySelectorAll('[data-batch-input]').forEach((input) => {
      input.addEventListener('input', () => {
        const idx = Number(input.getAttribute('data-batch-input'));
        const raw = String(input.value || '').replace(',', '.').trim();
        const value = raw === '' ? null : parseFloat(raw);
        editedScores[idx] = Number.isFinite(value) ? value : null;
        refreshApplyState();
      });
    });

    applyBtn.addEventListener('click', () => {
      const finalScores = editedScores.filter((v) => Number.isFinite(v));
      if (!finalScores.length) return;
      const ok = persistAsQuickTraining(finalScores, isKK);
      if (ok && typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        try { navigator.vibrate([10, 30, 10]); } catch (_e) { /* noop */ }
      }
      results.forEach((r, idx) => {
        const detected = r.score;
        const corrected = editedScores[idx];
        if (detected === null && corrected === null) return;
        if (window.OCRFeedback && typeof window.OCRFeedback.saveOCRFeedback === 'function') {
          window.OCRFeedback.saveOCRFeedback({
            detected,
            corrected,
            confidence: r.confidence,
            rotation: r.quality ? r.quality.rotation : 0,
            blur: r.quality ? r.quality.blur : 0,
            timestamp: Date.now(),
          });
        }
      });
      close();
    });

    return results;
  }

  return {
    batchProcessPhotos,
    openBatchUI,
    _processSingle: processSingle,
  };
})();
