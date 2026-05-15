/**
 * V2 Vision Engine - YOLOv8 Live Scanner
 * Lädt das auf Monitore trainierte YOLOv8 Modell und findet Score + Disziplin.
 */
const V2VisionEngine = (function() {
  'use strict';

  let _model = null;
  let _isModelLoading = false;
  let _videoStream = null;
  let _tfLoadingPromise = null;

  // Das GraphModel liegt im Repo-Root neben den .bin-Shards.
  const MODEL_PATH = './model.json';
  const TFJS_SRC = (window.ImageCompareBrain && window.ImageCompareBrain.TFJS_SRC) ||
    'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js';
  const INPUT_SIZE = 640;
  const CONF_THRESHOLD = 0.50;
  const IOU_THRESHOLD = 0.45;

  const CLASSES = ['discipline', 'score']; 
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


  /**
   * Lädt das YOLOv8 TensorFlow Graph-Modell
   */
  async function loadModel() {
    if (_model) return _model;
    if (_isModelLoading) return null;

    try {
      const tfLib = await ensureTensorFlow();
      _isModelLoading = true;
      console.log('Lade YOLOv8 Vision Modell aus:', MODEL_PATH);
      _model = await tfLib.loadGraphModel(MODEL_PATH);
      console.log('YOLOv8 Scanner scharf geschaltet!');
      _isModelLoading = false;
      return _model;
    } catch (err) {
      console.warn('YOLOv8 Modell noch nicht gefunden. Hast du die ZIP entpackt?', err);
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
      10,
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

    try {
      const results = await scanCurrentFrame('v2ScannerVideo');
      const video = document.getElementById('v2ScannerVideo');
      
      if (results && video) {
        renderBoxes(results, 'v2ScannerCanvas', video);
      }
    } catch(err) {
      console.warn("Fehler im Live-Loop:", err);
    }

    // Nächstes Frame anfordern
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
