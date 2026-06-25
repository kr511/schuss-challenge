/**
 * V2 Vision Engine - YOLO11 Live Scanner
 * Lädt das auf Monitore trainierte YOLO11 Modell und findet Score + Disziplin.
 */
const V2VisionEngine = (function() {
  'use strict';

  let _model = null;
  let _isModelLoading = false;
  let _videoStream = null;
  let _tfLoadingPromise = null;

  // ── Scan-Throttle: OCR braucht kein 60fps, 10fps reichen vollstaendig ────
  const SCAN_INTERVAL_MS = 100;
  let _lastScanTime = 0;

  // ── Frame-Stabilitaet: Box muss STABILITY_FRAMES Frames konsistent sein ──
  // Eliminiert Einzel-Frame-Fehldetektionen ohne echten Delayed-Effekt.
  const STABILITY_FRAMES = 3;
  const BOX_TOLERANCE = 0.12; // max. erlaubte Box-Abweichung (0–1) zwischen Frames
  const _stabBuf = {};        // class -> [{confidence, box}]

  // Zentrale Modell-Config aus image-compare-brain.js (mit sicheren Fallbacks).
  // So bringt ein Modell-Tausch keine Code-Aenderung hier mit sich.
  const _brain = (typeof window !== 'undefined' && window.ImageCompareBrain) || {};
  const _cfg = _brain.VISION_MODEL || {};

  // Das GraphModel liegt im Repo-Root neben den .bin-Shards.
  const MODEL_PATH = _cfg.path || './model.json';
  const MODEL_VERSION = _cfg.version || 'unknown';
  const TFJS_SRC = _brain.TFJS_SRC ||
    'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js';
  const INPUT_SIZE = Number.isFinite(_cfg.inputSize) ? _cfg.inputSize : 640;
  const CONF_THRESHOLD = Number.isFinite(_cfg.confThreshold) ? _cfg.confThreshold : 0.50;
  const IOU_THRESHOLD = Number.isFinite(_cfg.iouThreshold) ? _cfg.iouThreshold : 0.45;
  const MAX_DETECTIONS = Number.isFinite(_cfg.maxDetections) ? _cfg.maxDetections : 10;
  const TFJS_BACKEND = _cfg.tfjsBackend || 'auto';

  // Klassen treiben die Decoder-Geometrie: NUM_OUTPUT_COLS = 4 Box-Werte + Klassen.
  const CLASSES = Array.isArray(_cfg.classes) && _cfg.classes.length
    ? _cfg.classes.slice()
    : ['discipline', 'score'];
  const NUM_OUTPUT_COLS = 4 + CLASSES.length;

  function ensureTensorFlow() {
    if (typeof tf !== 'undefined') return Promise.resolve(tf);
    if (_tfLoadingPromise) return _tfLoadingPromise;

    _tfLoadingPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-ic-tfjs],script[data-v2-tfjs]');
      if (existing) {
        const started = Date.now();
        const timer = setInterval(() => {
          if (typeof tf !== 'undefined') {
            clearInterval(timer);
            resolve(tf);
            return;
          }
          if (Date.now() - started > 30000) {
            clearInterval(timer);
            reject(new Error('TensorFlow.js load timeout'));
          }
        }, 120);
        return;
      }

      const script = document.createElement('script');
      script.src = TFJS_SRC;
      script.async = true;
      script.dataset.v2Tfjs = '1';
      script.onload = () => {
        if (typeof tf !== 'undefined') resolve(tf);
        else reject(new Error('TensorFlow.js loaded without global tf'));
      };
      script.onerror = () => reject(new Error('TensorFlow.js could not be loaded'));
      document.head.appendChild(script);
    }).catch((error) => {
      _tfLoadingPromise = null;
      throw error;
    });

    return _tfLoadingPromise;
  }

  function disposeTensorOrArray(value) {
    if (!value) return;
    if (Array.isArray(value)) {
      value.forEach(disposeTensorOrArray);
      return;
    }
    if (typeof value.dispose === 'function') value.dispose();
  }

  function primaryTensor(value) {
    return Array.isArray(value) ? value[0] : value;
  }

  function clamp01(value) {
    const num = Number(value);
    if (!Number.isFinite(num)) return 0;
    return Math.max(0, Math.min(1, num));
  }


  // Nur gebuendelte Backends ohne Zusatz-Skript erlauben (tf.min.js: webgl/cpu).
  async function applyBackend(tfLib) {
    const allowed = ['webgl', 'cpu'];
    if (TFJS_BACKEND && TFJS_BACKEND !== 'auto' && allowed.includes(TFJS_BACKEND)) {
      try {
        await tfLib.setBackend(TFJS_BACKEND);
        await tfLib.ready();
      } catch (e) {
        console.warn('TF.js Backend konnte nicht gesetzt werden:', TFJS_BACKEND, e);
      }
    }
  }

  /**
   * Lädt das YOLO TensorFlow Graph-Modell gemäß VISION_MODEL-Config.
   */
  async function loadModel() {
    if (_model) return _model;
    if (_isModelLoading) return null;

    try {
      const tfLib = await ensureTensorFlow();
      await applyBackend(tfLib);
      _isModelLoading = true;
      console.log('Lade YOLO Vision Modell', MODEL_VERSION, 'aus:', MODEL_PATH,
        '(Klassen:', CLASSES.join(', ') + ')');
      _model = await tfLib.loadGraphModel(MODEL_PATH);
      console.log('YOLO Scanner scharf geschaltet! Backend:', tfLib.getBackend());
      _isModelLoading = false;
      return _model;
    } catch (err) {
      console.warn('YOLO Modell konnte nicht geladen werden. Sind model.json + Shards vorhanden?', err);
      _isModelLoading = false;
      return null;
    }
  }

  async function startLiveScanner(videoElementId) {
    const video = document.getElementById(videoElementId);
    if (!video) return false;

    try {
      // 1. Versuch: Rückkamera mit hoher Auflösung
      _videoStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 } }
      });
    } catch (e) {
      console.warn("Rückkamera nicht gefunden. Versuche Standardkamera...", e);
      try {
        // 2. Versuch: Irgendeine Kamera (z.B. Desktop Webcam)
        _videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
      } catch (err2) {
        console.error('Kamera-Zugriff komplett verweigert oder keine Kamera vorhanden:', err2);
        const camMsg = 'Kamera-Fehler! Bitte erlaube den Kamera-Zugriff in deinem Browser.';
        if (typeof showEngagementToast === 'function') showEngagementToast(camMsg, 6000);
        else alert(camMsg);
        return false;
      }
    }
    
    try {
      video.srcObject = _videoStream;
      // WICHTIG: iOS Safari benötigt dieses Event, um den Screen aufzubauen
      await new Promise((resolve) => {
        video.onloadedmetadata = () => {
          resolve();
        };
      });
      await video.play();
      return true;
    } catch (err) {
      console.error('Fehler beim Video-Playback:', err);
      return false;
    }
  }

  function stopLiveScanner() {
    if (_videoStream) {
      _videoStream.getTracks().forEach(track => track.stop());
      _videoStream = null;
    }
  }

  /**
   * Scannt das exakte Bild und findet die Bounding Boxes für Disziplin und Score
   */
  async function scanCurrentFrame(videoElementId) {
    if (!_model) return null;
    const video = document.getElementById(videoElementId);
    if (!video) return null;

    const imgTensor = tf.tidy(() => {
      let tensor = tf.browser.fromPixels(video);
      const resizeParams = [INPUT_SIZE, INPUT_SIZE];
      tensor = tf.image.resizeBilinear(tensor, resizeParams);
      tensor = tensor.div(255.0).expandDims(0);
      return tensor;
    });

    let predictions;
    try {
      predictions = await _model.executeAsync(imgTensor);
    } catch(e) {
      console.error('YOLO Inference Fehler:', e);
      imgTensor.dispose();
      return null;
    }

    const outputTensor = primaryTensor(predictions);
    if (!outputTensor || typeof outputTensor.transpose !== 'function') {
      imgTensor.dispose();
      disposeTensorOrArray(predictions);
      return null;
    }

    const boxesAndScores = tf.tidy(() => {
      const shape = outputTensor.shape || [];
      if (shape.length === 3 && shape[1] === NUM_OUTPUT_COLS) {
        return outputTensor.transpose([0, 2, 1]).squeeze();
      }
      if (shape.length === 3 && shape[2] === NUM_OUTPUT_COLS) {
        return outputTensor.squeeze();
      }
      if (shape.length === 2 && shape[0] === NUM_OUTPUT_COLS) {
        return outputTensor.transpose();
      }
      return outputTensor.squeeze();
    });

    const outputShape = boxesAndScores.shape || [];
    const data = await boxesAndScores.data();
    imgTensor.dispose();
    disposeTensorOrArray(predictions);
    boxesAndScores.dispose();

    const numCols = NUM_OUTPUT_COLS;
    const numRows = outputShape[0] || Math.floor(data.length / numCols);
    let rawBoxes = [];
    let rawScores = [];
    let rawClasses = [];

    for (let r = 0; r < numRows; r++) {
      let maxProb = 0;
      let maxClass = -1;
      for (let c = 0; c < CLASSES.length; c++) {
        let prob = data[r * numCols + 4 + c];
        if (prob > maxProb) {
          maxProb = prob;
          maxClass = c;
        }
      }

      if (maxProb > CONF_THRESHOLD) {
        const xc = data[r * numCols + 0];
        const yc = data[r * numCols + 1];
        const w = data[r * numCols + 2];
        const h = data[r * numCols + 3];
        const x1 = xc - w / 2;
        const y1 = yc - h / 2;
        const x2 = xc + w / 2;
        const y2 = yc + h / 2;
        const divisor = Math.max(Math.abs(x1), Math.abs(y1), Math.abs(x2), Math.abs(y2)) > 2 ? INPUT_SIZE : 1;
        rawBoxes.push([
          clamp01(y1 / divisor),
          clamp01(x1 / divisor),
          clamp01(y2 / divisor),
          clamp01(x2 / divisor)
        ]);
        rawScores.push(maxProb);
        rawClasses.push(maxClass);
      }
    }

    if (rawBoxes.length === 0) return [];

    const nmsBoxesTensor = tf.tensor2d(rawBoxes);
    const nmsScoresTensor = tf.tensor1d(rawScores);
    const nmsIndicesTensor = await tf.image.nonMaxSuppressionAsync(
      nmsBoxesTensor,
      nmsScoresTensor,
      MAX_DETECTIONS,
      IOU_THRESHOLD,
      CONF_THRESHOLD
    );
    const nmsIndices = await nmsIndicesTensor.data();
    nmsBoxesTensor.dispose();
    nmsScoresTensor.dispose();
    nmsIndicesTensor.dispose();

    const results = [];
    for (let i = 0; i < nmsIndices.length; i++) {
      const idx = nmsIndices[i];
      const box = rawBoxes[idx];
      results.push({
        class: CLASSES[rawClasses[idx]],
        confidence: rawScores[idx],
        boxPercent: {
          xMin: box[1],
          yMin: box[0],
          xMax: box[3],
          yMax: box[2]
        }
      });
    }

    return results;
  }

  // ── Frame-Stabilitaets-Filter ──────────────────────────────────────────────
  function _boxesNear(a, b) {
    if (!a || !b) return false;
    return Math.abs(a.xMin - b.xMin) <= BOX_TOLERANCE &&
           Math.abs(a.yMin - b.yMin) <= BOX_TOLERANCE &&
           Math.abs(a.xMax - b.xMax) <= BOX_TOLERANCE &&
           Math.abs(a.yMax - b.yMax) <= BOX_TOLERANCE;
  }

  function _filterStable(results) {
    // Klassen die dieses Frame NICHT gesehen wurden: Buffer leeren.
    const seenClasses = new Set((results || []).map(r => r.class));
    for (const cls of Object.keys(_stabBuf)) {
      if (!seenClasses.has(cls)) _stabBuf[cls] = [];
    }

    const stable = [];
    for (const res of (results || [])) {
      const cls = res.class;
      if (!_stabBuf[cls]) _stabBuf[cls] = [];

      // Nur anhaengen wenn Box nah an vorherigem Frame oder Buffer leer.
      const prev = _stabBuf[cls][_stabBuf[cls].length - 1];
      if (!prev || _boxesNear(prev.box, res.boxPercent)) {
        _stabBuf[cls].push({ confidence: res.confidence, box: res.boxPercent });
      } else {
        _stabBuf[cls] = [{ confidence: res.confidence, box: res.boxPercent }];
      }

      // Erst nach STABILITY_FRAMES konsistenten Frames als stabil melden.
      if (_stabBuf[cls].length >= STABILITY_FRAMES) {
        const avgConf = _stabBuf[cls].reduce((s, f) => s + f.confidence, 0) / _stabBuf[cls].length;
        stable.push({ ...res, confidence: avgConf });
        // Buffer begrenzen (nicht ins Unendliche wachsen lassen).
        _stabBuf[cls] = _stabBuf[cls].slice(-STABILITY_FRAMES);
      }
    }
    return stable;
  }

  // --- UI & Rendering Loop ---
  let _animationFrameId = null;
  let _isScanningLoop = false;

  function renderBoxes(results, canvasId, video) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    
    // Canvas Größe an Video anpassen
    canvas.width = video.clientWidth;
    canvas.height = video.clientHeight;
    
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height); // Vorheriges Frame löschen

    if (!results || results.length === 0) return;

    for (const res of results) {
      const box = res.boxPercent;
      const x = box.xMin * canvas.width;
      const y = box.yMin * canvas.height;
      const width = (box.xMax - box.xMin) * canvas.width;
      const height = (box.yMax - box.yMin) * canvas.height;

      // Kasten zeichnen
      ctx.beginPath();
      // Score = Grün, Disziplin = Blau
      ctx.strokeStyle = res.class === 'score' ? '#7ab030' : '#40a0ff';
      ctx.lineWidth = 3;
      ctx.rect(x, y, width, height);
      ctx.stroke();

      // Hintergrund für Text
      ctx.fillStyle = ctx.strokeStyle;
      ctx.fillRect(x, y - 24, width, 24);

      // Text (Klasse + % Sicherheit)
      ctx.fillStyle = '#111';
      ctx.font = '16px sans-serif';
      ctx.fontWeight = 'bold';
      const text = `${res.class.toUpperCase()} (${Math.round(res.confidence * 100)}%)`;
      ctx.fillText(text, x + 4, y - 6);
    }
  }

  async function _scanLoop() {
    if (!_isScanningLoop) return;

    const now = Date.now();
    if (now - _lastScanTime >= SCAN_INTERVAL_MS) {
      _lastScanTime = now;
      try {
        const raw = await scanCurrentFrame('v2ScannerVideo');
        const stable = _filterStable(raw);
        const video = document.getElementById('v2ScannerVideo');
        if (video) renderBoxes(stable, 'v2ScannerCanvas', video);
      } catch (err) {
        console.warn('Fehler im Live-Loop:', err);
      }
    }

    _animationFrameId = requestAnimationFrame(_scanLoop);
  }

  function setupUI() {
    const btnStart = document.getElementById('btnStartLiveScan');
    const btnStop = document.getElementById('btnStopLiveScan');
    const scannerView = document.getElementById('v2ScannerView');
    const modeSelection = document.getElementById('v2ModeSelection');

    if (btnStart) {
      btnStart.addEventListener('click', async () => {
        // Haptisches Premium Feedback
        if(navigator.vibrate) navigator.vibrate([15, 30, 15]);
        
        // WICHTIG FÜR iOS: Das Video-Element MUSS sichtbar (display: block) sein,
        // bevor .play() aufgerufen wird, sonst bleibt der Screen auf dem iPhone schwarz!
        if (modeSelection) modeSelection.style.display = 'none';
        if (scannerView) scannerView.style.display = 'block';

        // Kamera sofort nach Klick starten
        const started = await startLiveScanner('v2ScannerVideo');
        if (started) {
          // Lade Modell erst WÄHREND die Kamera schon läuft
          await loadModel();
          
          // Loop starten
          _isScanningLoop = true;
          _scanLoop();
        } else {
          // Falls Kamera fehlschlägt, wieder zurück zum Menü
          if (scannerView) scannerView.style.display = 'none';
          if (modeSelection) modeSelection.style.display = 'flex';
        }
      });
    }

    if (btnStop) {
      btnStop.addEventListener('click', () => {
        _isScanningLoop = false;
        if (_animationFrameId) cancelAnimationFrame(_animationFrameId);
        stopLiveScanner();
        
        // UI Zurücksetzen
        if (scannerView) scannerView.style.display = 'none';
        if (modeSelection) modeSelection.style.display = 'flex';
      });
    }
  }

  return {
    init: loadModel,
    startScanner: startLiveScanner,
    stopScanner: stopLiveScanner,
    scan: scanCurrentFrame,
    setupUI: setupUI
  };
})();

if (typeof window !== 'undefined') {
  window.V2VisionEngine = V2VisionEngine;
  // Hook the UI up when DOM is ready
  document.addEventListener('DOMContentLoaded', () => {
    V2VisionEngine.setupUI();
  });
}
