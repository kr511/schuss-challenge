/**
 * V2 Vision Engine - YOLOv8 Live Scanner
 * Lädt das auf Monitore trainierte YOLOv8 Modell und findet Score + Disziplin.
 */
const V2VisionEngine = (function() {
  'use strict';

  let _model = null;
  let _isModelLoading = false;
  let _videoStream = null;
  let _isStarting = false;
  let _isStopping = false;

  // Hier entpackst du deine ZIP-Datei hinein (model.json und .bin Dateien)
  const MODEL_PATH = './models/v2_tfjs_model/model.json';
  const INPUT_SIZE = 640; // YOLOv8 Standard-Größe
  const CONF_THRESHOLD = 0.50; // Mindest-Wahrscheinlichkeit
  const IOU_THRESHOLD = 0.45; // Für Überlappungen (NMS)

  // Klassen-Namen (Reihenfolge genau wie in Colab 'names' Array!)
  const CLASSES = ['discipline', 'score']; 

  /**
   * Lädt das YOLOv8 TensorFlow Graph-Modell
   */
  async function loadModel() {
    if (_model) return _model;
    if (_isModelLoading) return null;

    try {
      if (typeof tf === 'undefined') {
        console.error('TensorFlow.js ist nicht geladen!');
        return null;
      }
      
      _isModelLoading = true;
      console.log('Lade YOLOv8 Vision Modell aus:', MODEL_PATH);
      
      // YOLO Modelle sind GraphModels, keine LayersModels!
      _model = await tf.loadGraphModel(MODEL_PATH);
      
      console.log('✅ YOLOv8 Scanner scharf geschaltet!');
      _isModelLoading = false;
      return _model;
    } catch (err) {
      console.warn('YOLOv8 Modell noch nicht gefunden. Hast du die ZIP entpackt?', err);
      _isModelLoading = false;
      return null;
    }
  }

  async function startLiveScanner(videoElementId) {
    if (_isStarting) return false;
    _isStarting = true;

    // Vorherigen Stream sicher beenden
    stopLiveScanner();

    const video = document.getElementById(videoElementId);
    if (!video) {
      _isStarting = false;
      return false;
    }

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
        alert("Kamera-Fehler! Bitte erlaube den Kamera-Zugriff in deinem Browser.");
        _isStarting = false;
        return false;
      }
    }
    
    try {
      video.srcObject = _videoStream;
      // WICHTIG: iOS Safari benötigt dieses Event, um den Screen aufzubauen
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("Video load timeout")), 5000);
        video.onloadedmetadata = () => {
          clearTimeout(timeout);
          resolve();
        };
      });
      await video.play();
      _isStarting = false;
      return true;
    } catch (err) {
      console.error('Fehler beim Video-Playback:', err);
      stopLiveScanner();
      _isStarting = false;
      return false;
    }
  }

  function stopLiveScanner() {
    if (_videoStream) {
      _videoStream.getTracks().forEach(track => {
        track.stop();
        console.log('[V2Vision] Kamera-Track gestoppt:', track.label);
      });
      _videoStream = null;
    }
    const videoList = ['v2ScannerVideo', 'v2ScannerVideoDashboard', 'v2ScannerVideoOverlay'];
    videoList.forEach(id => {
      const v = document.getElementById(id);
      if (v) {
        v.pause();
        v.srcObject = null;
      }
    });
  }

  /**
   * Scannt das exakte Bild und findet die Bounding Boxes für Disziplin und Score
   */
  async function scanCurrentFrame(videoElementId) {
    if (!_model || _isStopping) return null;
    const video = document.getElementById(videoElementId);
    if (!video || video.paused || video.ended) return null;

    // 1. Vorbereitung (Tensor erstellen)
    const imgTensor = tf.tidy(() => {
      let tensor = tf.browser.fromPixels(video);
      const resizeParams = [INPUT_SIZE, INPUT_SIZE];
      // YOLO braucht 640x640 und RGB format / 255
      tensor = tf.image.resizeBilinear(tensor, resizeParams);
      tensor = tensor.div(255.0).expandDims(0); // [1, 640, 640, 3]
      return tensor;
    });

    // 2. Vorhersage (Inference)
    let predictions;
    try {
      predictions = await _model.executeAsync(imgTensor);
    } catch(e) {
      console.error("YOLO Inference Fehler:", e);
      imgTensor.dispose();
      return null;
    }

    // 3. Ausgabe konvertieren (YOLOv8 Format: [1, 4+Klassen, 8400])
    const boxesAndScores = tf.tidy(() => {
      // Transponieren auf [1, 8400, 6] (bei 2 Klassen)
      const transPrediction = predictions.transpose([0, 2, 1]);
      return transPrediction.squeeze(); // [8400, 6]
    });

    // Wir laden die Rohdaten aus der Grafikkarte ins normale JavaScript
    const data = await boxesAndScores.data();
    
    // Aufräumen
    imgTensor.dispose();
    predictions.dispose();
    boxesAndScores.dispose();

    // 4. Filtern der Ergebnisse (Die 8400 Anker durchsuchen)
    const numRows = 8400;
    const numCols = 4 + CLASSES.length; // 4 Koordinaten + 2 Klassen = 6
    
    let rawBoxes = [];
    let rawScores = [];
    let rawClasses = [];

    for (let r = 0; r < numRows; r++) {
      let maxProb = 0;
      let maxClass = -1;
      
      // Finde die Klasse mit der höchsten Wahrscheinlichkeit für diese Box
      for (let c = 0; c < CLASSES.length; c++) {
        let prob = data[r * numCols + 4 + c];
        if (prob > maxProb) {
          maxProb = prob;
          maxClass = c;
        }
      }

      if (maxProb > CONF_THRESHOLD) {
        // Koordinaten extrahieren (x_center, y_center, width, height)
        const xc = data[r * numCols + 0];
        const yc = data[r * numCols + 1];
        const w = data[r * numCols + 2];
        const h = data[r * numCols + 3];

        // Umwandeln in [y_min, x_min, y_max, x_max] für TFs Non-Max Suppression
        const x1 = xc - w / 2;
        const y1 = yc - h / 2;
        const x2 = xc + w / 2;
        const y2 = yc + h / 2;

        rawBoxes.push([y1, x1, y2, x2]);
        rawScores.push(maxProb);
        rawClasses.push(maxClass);
      }
    }

    if (rawBoxes.length === 0) return [];

    // 5. Non-Maximum Suppression (Überlappungen löschen)
    const nmsIndicesTensor = await tf.image.nonMaxSuppressionAsync(
      tf.tensor2d(rawBoxes),
      tf.tensor1d(rawScores),
      10, // Max 10 Boxen
      IOU_THRESHOLD,
      CONF_THRESHOLD
    );
    const nmsIndices = await nmsIndicesTensor.data();
    nmsIndicesTensor.dispose();

    // 6. Finale Boxen berechnen
    const results = [];
    for (let i = 0; i < nmsIndices.length; i++) {
      const idx = nmsIndices[i];
      const box = rawBoxes[idx];
      
      // Box Koordinaten zurück auf Prozent (0.0 bis 1.0) rechnen!
      // Da wir 640x640 reingeworfen haben:
      results.push({
        class: CLASSES[rawClasses[idx]],
        confidence: rawScores[idx],
        boxPercent: {
          xMin: box[1] / INPUT_SIZE,
          yMin: box[0] / INPUT_SIZE,
          xMax: box[3] / INPUT_SIZE,
          yMax: box[2] / INPUT_SIZE
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
          scannerView.style.display = 'none';
          modeSelection.style.display = 'flex';
        }
      });
    }

    if (btnStop) {
      btnStop.addEventListener('click', () => {
        _isScanningLoop = false;
        if (_animationFrameId) cancelAnimationFrame(_animationFrameId);
        stopLiveScanner();
        
        // UI Zurücksetzen
        scannerView.style.display = 'none';
        modeSelection.style.display = 'flex';
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
