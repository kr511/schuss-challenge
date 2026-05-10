/**
 * Image Quality Analyzer
 *
 * Bewertet Helligkeit, Schaerfe und Rotation eines Canvas-Bildes mit
 * reinen Canvas 2D Operationen (kein OpenCV, kein TensorFlow).
 *
 * window.ImageQualityAnalyzer.analyzeImageQuality(canvas)
 */
window.ImageQualityAnalyzer = (function () {
  'use strict';

  const ANALYSIS_MAX_DIM = 320;
  const BLUR_NORMALIZER = 600;
  const ROTATION_BINS = 90;

  function safeCanvasFromInput(input) {
    if (!input) return null;
    if (input.tagName === 'CANVAS') return input;
    if (input.tagName === 'IMG' || input.tagName === 'VIDEO') {
      const c = document.createElement('canvas');
      const w = input.naturalWidth || input.videoWidth || input.width || 0;
      const h = input.naturalHeight || input.videoHeight || input.height || 0;
      if (w <= 0 || h <= 0) return null;
      c.width = w;
      c.height = h;
      const ctx = c.getContext('2d');
      if (!ctx) return null;
      try { ctx.drawImage(input, 0, 0); } catch (_e) { return null; }
      return c;
    }
    return null;
  }

  function downscaleForAnalysis(canvas) {
    const w = canvas.width;
    const h = canvas.height;
    const longest = Math.max(w, h);
    if (longest <= ANALYSIS_MAX_DIM) return canvas;
    const scale = ANALYSIS_MAX_DIM / longest;
    const out = document.createElement('canvas');
    out.width = Math.max(1, Math.round(w * scale));
    out.height = Math.max(1, Math.round(h * scale));
    const ctx = out.getContext('2d');
    if (!ctx) return canvas;
    try {
      ctx.drawImage(canvas, 0, 0, out.width, out.height);
    } catch (_e) {
      return canvas;
    }
    return out;
  }

  function getGrayscaleData(canvas) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    let imageData;
    try {
      imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    } catch (_e) {
      return null;
    }
    const len = canvas.width * canvas.height;
    const gray = new Float32Array(len);
    const data = imageData.data;
    for (let i = 0, p = 0; p < len; i += 4, p += 1) {
      gray[p] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    }
    return { gray: gray, width: canvas.width, height: canvas.height };
  }

  function computeBrightness(rgbCanvas) {
    const ctx = rgbCanvas.getContext('2d');
    if (!ctx) return 50;
    let imageData;
    try {
      imageData = ctx.getImageData(0, 0, rgbCanvas.width, rgbCanvas.height);
    } catch (_e) {
      return 50;
    }
    const data = imageData.data;
    if (!data || data.length === 0) return 50;
    let sum = 0;
    let count = 0;
    for (let i = 0; i < data.length; i += 4) {
      sum += (data[i] + data[i + 1] + data[i + 2]) / 3;
      count += 1;
    }
    if (count === 0) return 50;
    const avg = sum / count;
    return Math.max(0, Math.min(100, (avg / 255) * 100));
  }

  function computeBlur(grayInfo) {
    if (!grayInfo) return 0;
    const gray = grayInfo.gray;
    const w = grayInfo.width;
    const h = grayInfo.height;
    if (w < 3 || h < 3) return 0;

    const laplacian = new Float32Array(w * h);
    let sum = 0;
    let count = 0;
    for (let y = 1; y < h - 1; y += 1) {
      for (let x = 1; x < w - 1; x += 1) {
        const idx = y * w + x;
        const value = -4 * gray[idx]
          + gray[idx - 1]
          + gray[idx + 1]
          + gray[idx - w]
          + gray[idx + w];
        laplacian[idx] = value;
        sum += value;
        count += 1;
      }
    }
    if (count === 0) return 0;
    const mean = sum / count;
    let variance = 0;
    for (let y = 1; y < h - 1; y += 1) {
      for (let x = 1; x < w - 1; x += 1) {
        const diff = laplacian[y * w + x] - mean;
        variance += diff * diff;
      }
    }
    variance /= count;
    const score = (variance / BLUR_NORMALIZER) * 100;
    return Math.max(0, Math.min(100, score));
  }

  function computeDominantRotation(grayInfo) {
    if (!grayInfo) return 0;
    const gray = grayInfo.gray;
    const w = grayInfo.width;
    const h = grayInfo.height;
    if (w < 3 || h < 3) return 0;

    const bins = new Float32Array(ROTATION_BINS);
    for (let y = 1; y < h - 1; y += 1) {
      for (let x = 1; x < w - 1; x += 1) {
        const idx = y * w + x;
        const gx =
          -gray[idx - w - 1] - 2 * gray[idx - 1] - gray[idx + w - 1]
          + gray[idx - w + 1] + 2 * gray[idx + 1] + gray[idx + w + 1];
        const gy =
          -gray[idx - w - 1] - 2 * gray[idx - w] - gray[idx - w + 1]
          + gray[idx + w - 1] + 2 * gray[idx + w] + gray[idx + w + 1];
        const mag = Math.sqrt(gx * gx + gy * gy);
        if (mag < 30) continue;
        let angle = Math.atan2(gy, gx) * 180 / Math.PI;
        let perp = angle + 90;
        while (perp >= 90) perp -= 180;
        while (perp < -90) perp += 180;
        let folded = perp;
        if (folded > 45) folded -= 90;
        if (folded < -45) folded += 90;
        const binIdx = Math.min(
          ROTATION_BINS - 1,
          Math.max(0, Math.floor(((folded + 45) / 90) * ROTATION_BINS))
        );
        bins[binIdx] += mag;
      }
    }
    let maxBin = 0;
    let maxValue = 0;
    let totalEnergy = 0;
    for (let i = 0; i < ROTATION_BINS; i += 1) {
      totalEnergy += bins[i];
      if (bins[i] > maxValue) {
        maxValue = bins[i];
        maxBin = i;
      }
    }
    if (totalEnergy < 1) return 0;
    const dominantShare = maxValue / totalEnergy;
    if (dominantShare < 0.02) return 0;
    const angle = ((maxBin + 0.5) / ROTATION_BINS) * 90 - 45;
    if (Math.abs(angle) < 0.6) return 0;
    return Math.max(-45, Math.min(45, angle));
  }

  function buildSuggestions(brightness, blur, rotation) {
    const tips = [];
    if (brightness < 20) tips.push('Zu dunkel');
    else if (brightness > 90) tips.push('Zu hell / ueberbelichtet');
    if (blur < 15) tips.push('Foto verwackelt / unscharf');
    if (Math.abs(rotation) > 5) tips.push('Schief - bitte gerade halten');
    return tips;
  }

  function analyzeImageQuality(input) {
    try {
      const sourceCanvas = safeCanvasFromInput(input);
      if (!sourceCanvas) {
        return {
          brightness: 0,
          blur: 0,
          rotation: 0,
          isUsable: false,
          suggestions: ['Kein gueltiges Bild'],
        };
      }
      const small = downscaleForAnalysis(sourceCanvas);
      const grayInfo = getGrayscaleData(small);
      const brightness = Math.round(computeBrightness(small));
      const blur = Math.round(computeBlur(grayInfo));
      const rotation = Math.round(computeDominantRotation(grayInfo) * 10) / 10;
      const isUsable = brightness >= 20 && brightness <= 90 && blur > 15;
      return {
        brightness,
        blur,
        rotation,
        isUsable,
        suggestions: buildSuggestions(brightness, blur, rotation),
      };
    } catch (err) {
      console.warn('[ImageQualityAnalyzer] analyzeImageQuality failed:', err);
      return {
        brightness: 0,
        blur: 0,
        rotation: 0,
        isUsable: false,
        suggestions: ['Analyse fehlgeschlagen'],
      };
    }
  }

  return {
    analyzeImageQuality,
  };
})();
