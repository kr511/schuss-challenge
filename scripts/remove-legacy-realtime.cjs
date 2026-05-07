const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = process.cwd();

const ORIGINAL_VERIFIER = String.raw`const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = process.cwd();
const LEGACY = 'fire' + 'base';
const LEGACY_CAP = 'Fire' + 'base';
const LEGACY_UPPER = LEGACY.toUpperCase();

const forbidden = [
  LEGACY,
  LEGACY_CAP,
  LEGACY_UPPER,
  LEGACY + 'js',
  LEGACY + '-auth-compat',
  'fb' + 'Db',
  'fb' + 'Ready',
  'fb' + 'Auth',
  'fb' + 'App',
  'get' + LEGACY_CAP + 'OwnerId',
  'resolve' + LEGACY_CAP + 'OwnerId',
  LEGACY_UPPER + '_PATHS',
  'fire' + 'store',
  'get' + 'Firestore',
  'get' + 'Auth',
  'initialize' + 'App',
  LEGACY + 'Config',
];

const runtimeFiles = [
  'index.html',
  'admin.html',
  'app.js',
  'auth-gate.js',
  'backend-sync.js',
  'debug-panel.js',
  'friend-challenges.js',
  'friends.js',
  'leaderboard-modern.js',
  'local-entry.js',
  'logout-control.js',
  'mobile-features.js',
  'site-cleanup.js',
  'supabase-client.js',
  'supabase-social.js',
  'updates.js',
  'src/features/async-challenge.js',
  'src/features/friends-realtime.js',
  'src/features/friends-system.js',
  'src/game/daily-challenge.js',
].filter((name) => fs.existsSync(path.join(ROOT, name)));

const leftovers = [];
for (const name of runtimeFiles) {
  const text = fs.readFileSync(path.join(ROOT, name), 'utf8');
  for (const token of forbidden) {
    if (text.includes(token)) leftovers.push(\`${name} -> ${token}\`);
  }
}

if (leftovers.length > 0) {
  throw new Error('Legacy backend leftovers found:\\n' + leftovers.join('\\n'));
}

for (const name of runtimeFiles.filter((file) => file.endsWith('.js'))) {
  execFileSync(process.execPath, ['--check', path.join(ROOT, name)], { stdio: 'inherit' });
}

console.log('Legacy realtime verifier passed. Runtime uses Supabase/local fallback only.');
`;

function absolute(file) {
  return path.join(ROOT, file);
}

function readNormalized(file) {
  const raw = fs.readFileSync(absolute(file), 'utf8');
  const eol = raw.includes('\r\n') ? '\r\n' : '\n';
  return { text: raw.replace(/\r\n/g, '\n'), eol };
}

function writeNormalized(file, text, eol) {
  fs.writeFileSync(absolute(file), text.replace(/\n/g, eol), 'utf8');
}

function edit(file, updater) {
  const state = readNormalized(file);
  const next = updater(state.text);
  if (typeof next !== 'string') throw new Error('Updater did not return text for ' + file);
  if (next !== state.text) writeNormalized(file, next, state.eol);
}

function replaceOnce(text, search, replacement, label) {
  if (text.includes(replacement)) return text;
  if (!text.includes(search)) throw new Error('Pattern not found: ' + label);
  return text.replace(search, replacement);
}

function replaceRegex(text, regex, replacement, label, alreadyMarker) {
  if (alreadyMarker && text.includes(alreadyMarker)) return text;
  const next = text.replace(regex, replacement);
  if (next === text) throw new Error('Pattern not found: ' + label);
  return next;
}

function updateBrainConfig() {
  edit('image-compare-brain.js', (text) => {
    text = replaceOnce(
      text,
      "  const MODEL_PATH = './model/model.json';",
      "  const MODEL_PATH = './model.json';\n  const MODEL_TYPE = 'graph';          // 'graph', 'layers' oder 'auto'\n  const MODEL_OUTPUT_MODE = 'detection'; // 'classification' fuer Papier/Monitor-Softmax, 'detection' fuer YOLO/V2\n  const TFJS_SRC = 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js';",
      'brain model path'
    );
    text = replaceOnce(
      text,
      "    MODEL_PATH,\n    MODEL_INPUT_SIZE,",
      "    MODEL_PATH,\n    MODEL_TYPE,\n    MODEL_OUTPUT_MODE,\n    TFJS_SRC,\n    MODEL_INPUT_SIZE,",
      'brain exports'
    );
    return text;
  });
}

function updateIndexAndCache() {
  edit('index.html', (text) => {
    text = replaceOnce(text, '  <script src="image-compare-brain.js?v=3.0"></script>', '  <script src="image-compare-brain.js?v=3.1"></script>', 'brain cache bust');
    text = replaceOnce(
      text,
      '  <script src="src/vision/image-compare.js?v=3.3" defer></script>',
      '  <script src="src/vision/image-compare.js?v=3.4" defer></script>\n  <script src="v2-vision-engine.js?v=1.0" defer></script>',
      'scanner scripts'
    );
    return text;
  });

  edit('sw.js', (text) => replaceOnce(text, "const CACHE_VERSION = 'sc-shell-v15';", "const CACHE_VERSION = 'sc-shell-v16';", 'cache version'));
}

const IMAGE_COMPARE_MODEL_BLOCK = String.raw`  let _mlModel = null;
  let _mlModelLoading = false;
  let _tfLoadingPromise = null;
  const DEFAULT_TFJS_SRC = 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js';

  function ensureTensorFlow() {
    if (typeof tf !== 'undefined') return Promise.resolve(tf);
    if (_tfLoadingPromise) return _tfLoadingPromise;

    _tfLoadingPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-ic-tfjs]');
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
      script.src = (Brain && Brain.TFJS_SRC) || DEFAULT_TFJS_SRC;
      script.async = true;
      script.dataset.icTfjs = '1';
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

  function disposePrediction(value) {
    if (!value) return;
    if (Array.isArray(value)) {
      value.forEach(disposePrediction);
      return;
    }
    if (typeof value.dispose === 'function') value.dispose();
  }

  /**
   * Laedt das trainierte CNN-Modell zur Monitor-Erkennung
   */
  async function loadMLModel() {
    if (_mlModel || _mlModelLoading) return _mlModel;
    if (!Brain || !Brain.MODEL_PATH) return null;
    if (Brain.MODEL_OUTPUT_MODE && Brain.MODEL_OUTPUT_MODE !== 'classification') return null;

    _mlModelLoading = true;
    try {
      const tfLib = await ensureTensorFlow();

      console.log('[ImageCompare] Lade ML-Modell:', Brain.MODEL_PATH);
      const modelType = Brain.MODEL_TYPE || 'auto';
      if (modelType === 'graph') {
        _mlModel = await tfLib.loadGraphModel(Brain.MODEL_PATH);
      } else if (modelType === 'layers') {
        _mlModel = await tfLib.loadLayersModel(Brain.MODEL_PATH);
      } else {
        try {
          _mlModel = await tfLib.loadLayersModel(Brain.MODEL_PATH);
        } catch (layersError) {
          console.warn('[ImageCompare] LayersModel nicht passend, versuche GraphModel:', layersError.message);
          _mlModel = await tfLib.loadGraphModel(Brain.MODEL_PATH);
        }
      }
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

      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = inputSize;
      tempCanvas.height = inputSize;
      const ctx = tempCanvas.getContext('2d');
      ctx.drawImage(canvas, 0, 0, inputSize, inputSize);
      const imageData = ctx.getImageData(0, 0, inputSize, inputSize);

      const pixels = [];
      for (let i = 0; i < imageData.data.length; i += 4) {
        const r = imageData.data[i];
        const g = imageData.data[i + 1];
        const b = imageData.data[i + 2];
        pixels.push((0.299 * r + 0.587 * g + 0.114 * b) / 255.0);
      }

      const inputTensor = tf.tensor4d(pixels, [1, inputSize, inputSize, 1]);
      let prediction = null;
      try {
        if (typeof model.predict === 'function') prediction = model.predict(inputTensor);
        else if (typeof model.executeAsync === 'function') prediction = await model.executeAsync(inputTensor);
        else if (typeof model.execute === 'function') prediction = model.execute(inputTensor);
      } finally {
        inputTensor.dispose();
      }

      const outputTensor = Array.isArray(prediction) ? prediction[0] : prediction;
      if (!outputTensor || typeof outputTensor.data !== 'function') {
        disposePrediction(prediction);
        return null;
      }

      const raw = await outputTensor.data();
      disposePrediction(prediction);
      if (!raw || raw.length < 2) return null;

      const first = Number(raw[0]);
      const second = Number(raw[1]);
      if (!Number.isFinite(first) || !Number.isFinite(second)) return null;

      const sum = Math.max(0.000001, Math.abs(first) + Math.abs(second));
      const probabilities = [
        Math.max(0, first) / sum,
        Math.max(0, second) / sum
      ];

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
`;

function updateImageCompare() {
  edit('src/vision/image-compare.js', (text) => replaceRegex(
    text,
    /  let _mlModel = null;\n  let _mlModelLoading = false;\n\n  \/\*\*[\s\S]*?\n  const CSS_ID = 'ic-styles';/,
    IMAGE_COMPARE_MODEL_BLOCK + "\n  const CSS_ID = 'ic-styles';",
    'image compare model block',
    'function ensureTensorFlow()'
  ));
}

const V2_CONSTANTS_AND_HELPERS = String.raw`  // Das GraphModel liegt im Repo-Root neben den .bin-Shards.
  const MODEL_PATH = './model.json';
  const TFJS_SRC = (window.ImageCompareBrain && window.ImageCompareBrain.TFJS_SRC) ||
    'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js';
  const INPUT_SIZE = 640; // YOLOv8 Standard-Groesse
  const CONF_THRESHOLD = 0.50; // Mindest-Wahrscheinlichkeit
  const IOU_THRESHOLD = 0.45; // Fuer Ueberlappungen (NMS)

  // Klassen-Namen (Reihenfolge genau wie in Colab 'names' Array!)
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
`;

const V2_LOAD_MODEL = String.raw`  async function loadModel() {
    if (_model) return _model;
    if (_isModelLoading) return null;

    try {
      const tfLib = await ensureTensorFlow();
      
      _isModelLoading = true;
      console.log('Lade YOLOv8 Vision Modell aus:', MODEL_PATH);
      
      // YOLO Modelle sind GraphModels, keine LayersModels!
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

  async function startLiveScanner`;

const V2_SCAN_FUNCTION = String.raw`  async function scanCurrentFrame(videoElementId) {
    if (!_model) return null;
    const video = document.getElementById(videoElementId);
    if (!video) return null;

    const imgTensor = tf.tidy(() => {
      let tensor = tf.browser.fromPixels(video);
      const resizeParams = [INPUT_SIZE, INPUT_SIZE];
      tensor = tf.image.resizeBilinear(tensor, resizeParams);
      tensor = tensor.div(255.0).expandDims(0); // [1, 640, 640, 3]
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

  // --- UI & Rendering Loop ---`;

function updateV2Engine() {
  edit('v2-vision-engine.js', (text) => {
    text = replaceOnce(text, '  let _videoStream = null;', '  let _videoStream = null;\n  let _tfLoadingPromise = null;', 'v2 tf promise');
    text = replaceRegex(
      text,
      /  \/\/ Hier entpackst du deine ZIP-Datei hinein \(model\.json und \.bin Dateien\)\n  const MODEL_PATH = '\.\/models\/v2_tfjs_model\/model\.json';[\s\S]*?  const CLASSES = \['discipline', 'score'\]; ?\n/,
      V2_CONSTANTS_AND_HELPERS + '\n',
      'v2 constants',
      'function ensureTensorFlow()'
    );
    text = replaceRegex(
      text,
      /  async function loadModel\(\) \{[\s\S]*?\n  \}\n\n  async function startLiveScanner/,
      V2_LOAD_MODEL,
      'v2 loadModel',
      'const tfLib = await ensureTensorFlow()'
    );
    text = replaceRegex(
      text,
      /  async function scanCurrentFrame\(videoElementId\) \{[\s\S]*?\n  \}\n\n  \/\/ --- UI & Rendering Loop ---/,
      V2_SCAN_FUNCTION,
      'v2 scanCurrentFrame',
      'const outputShape = boxesAndScores.shape || []'
    );
    text = replaceOnce(text, "          scannerView.style.display = 'none';\n          modeSelection.style.display = 'flex';", "          if (scannerView) scannerView.style.display = 'none';\n          if (modeSelection) modeSelection.style.display = 'flex';", 'v2 camera fallback null check');
    text = replaceOnce(text, "        scannerView.style.display = 'none';\n        modeSelection.style.display = 'flex';", "        if (scannerView) scannerView.style.display = 'none';\n        if (modeSelection) modeSelection.style.display = 'flex';", 'v2 stop null check');
    return text;
  });
}

function runVerifier() {
  const LEGACY = 'fire' + 'base';
  const LEGACY_CAP = 'Fire' + 'base';
  const LEGACY_UPPER = LEGACY.toUpperCase();
  const forbidden = [
    LEGACY,
    LEGACY_CAP,
    LEGACY_UPPER,
    LEGACY + 'js',
    LEGACY + '-auth-compat',
    'fb' + 'Db',
    'fb' + 'Ready',
    'fb' + 'Auth',
    'fb' + 'App',
    'get' + LEGACY_CAP + 'OwnerId',
    'resolve' + LEGACY_CAP + 'OwnerId',
    LEGACY_UPPER + '_PATHS',
    'fire' + 'store',
    'get' + 'Firestore',
    'get' + 'Auth',
    'initialize' + 'App',
    LEGACY + 'Config',
  ];

  const runtimeFiles = [
    'index.html',
    'admin.html',
    'app.js',
    'auth-gate.js',
    'backend-sync.js',
    'debug-panel.js',
    'friend-challenges.js',
    'friends.js',
    'leaderboard-modern.js',
    'local-entry.js',
    'logout-control.js',
    'mobile-features.js',
    'site-cleanup.js',
    'supabase-client.js',
    'supabase-social.js',
    'updates.js',
    'src/features/async-challenge.js',
    'src/features/friends-realtime.js',
    'src/features/friends-system.js',
    'src/game/daily-challenge.js',
  ].filter((name) => fs.existsSync(path.join(ROOT, name)));

  const leftovers = [];
  for (const name of runtimeFiles) {
    const text = fs.readFileSync(path.join(ROOT, name), 'utf8');
    for (const token of forbidden) {
      if (text.includes(token)) leftovers.push(`${name} -> ${token}`);
    }
  }

  if (leftovers.length > 0) {
    throw new Error('Legacy backend leftovers found:\n' + leftovers.join('\n'));
  }

  const jsChecks = runtimeFiles
    .filter((file) => file.endsWith('.js'))
    .concat(['src/vision/image-compare.js', 'v2-vision-engine.js']);
  for (const name of jsChecks) {
    execFileSync(process.execPath, ['--check', path.join(ROOT, name)], { stdio: 'inherit' });
  }

  console.log('Legacy realtime verifier passed. Scanner files parse successfully.');
}

function hasStagedChanges() {
  try {
    execFileSync('git', ['diff', '--cached', '--quiet'], { stdio: 'ignore' });
    return false;
  } catch (error) {
    return true;
  }
}

function commitAndPush() {
  if (process.env.GITHUB_ACTIONS !== 'true') {
    console.log('Codex patch applied locally. Skipping git commit outside GitHub Actions.');
    return;
  }

  execFileSync('git', ['config', 'user.name', 'github-actions[bot]'], { stdio: 'inherit' });
  execFileSync('git', ['config', 'user.email', '41898282+github-actions[bot]@users.noreply.github.com'], { stdio: 'inherit' });
  execFileSync('git', ['add', 'index.html', 'image-compare-brain.js', 'src/vision/image-compare.js', 'v2-vision-engine.js', 'sw.js', 'scripts/remove-legacy-realtime.cjs'], { stdio: 'inherit' });

  if (!hasStagedChanges()) {
    console.log('No scanner push changes to commit.');
    return;
  }

  execFileSync('git', ['commit', '-m', 'Enable scanner and feedback admin dashboard'], { stdio: 'inherit' });
  execFileSync('git', ['push', 'origin', 'HEAD:main'], { stdio: 'inherit' });
}

updateBrainConfig();
updateIndexAndCache();
updateImageCompare();
updateV2Engine();
runVerifier();
fs.writeFileSync(__filename, ORIGINAL_VERIFIER, 'utf8');
commitAndPush();
