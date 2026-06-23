/**
 * Image Preprocessor
 *
 * Hilfsfunktionen, die Canvas-Bilder fuer die OCR vorbereiten:
 *  - autoRotate(canvas, degrees)
 *  - adjustBrightness(canvas, factor)
 *  - cropToCircle(canvas, x, y, radius, padding)
 *  - detectTargetCircle(canvas)
 *
 * Reine Canvas 2D API, keine externen Libraries.
 */
window.ImagePreprocessor = (function () {
  'use strict';

  const DETECT_MAX_DIM = 240;
  const DETECT_RADIUS_STEPS = 18;
  const DETECT_CENTER_STEPS = 14;
  const DETECT_ANGLE_SAMPLES = 36;

  function ensureCanvas(input) {
    if (!input) return null;
    if (input.tagName === 'CANVAS') return input;
    if (input.tagName === 'IMG' || input.tagName === 'VIDEO') {
      const w = input.naturalWidth || input.videoWidth || input.width || 0;
      const h = input.naturalHeight || input.videoHeight || input.height || 0;
      if (w <= 0 || h <= 0) return null;
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      const ctx = c.getContext('2d');
      if (!ctx) return null;
      try { ctx.drawImage(input, 0, 0); } catch (_e) { return null; }
      return c;
    }
    return null;
  }

  function autoRotate(canvas, degrees) {
    try {
      const src = ensureCanvas(canvas);
      if (!src) return canvas;
      const angle = Number(degrees) || 0;
      if (Math.abs(angle) < 0.05) return src;

      const radians = (angle * Math.PI) / 180;
      const w = src.width;
      const h = src.height;
      const cos = Math.abs(Math.cos(radians));
      const sin = Math.abs(Math.sin(radians));
      const newW = Math.max(1, Math.ceil(w * cos + h * sin));
      const newH = Math.max(1, Math.ceil(w * sin + h * cos));

      const out = document.createElement('canvas');
      out.width = newW;
      out.height = newH;
      const ctx = out.getContext('2d');
      if (!ctx) return src;
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, newW, newH);
      ctx.translate(newW / 2, newH / 2);
      ctx.rotate(radians);
      ctx.drawImage(src, -w / 2, -h / 2);
      return out;
    } catch (err) {
      console.warn('[ImagePreprocessor] autoRotate failed:', err);
      return canvas;
    }
  }

  function adjustBrightness(canvas, factor) {
    try {
      const src = ensureCanvas(canvas);
      if (!src) return canvas;
      const f = Number(factor);
      if (!Number.isFinite(f) || Math.abs(f - 1) < 0.001) return src;
      const clamped = Math.max(0.1, Math.min(3, f));

      const out = document.createElement('canvas');
      out.width = src.width;
      out.height = src.height;
      const ctx = out.getContext('2d');
      if (!ctx) return src;
      ctx.drawImage(src, 0, 0);

      let imageData;
      try {
        imageData = ctx.getImageData(0, 0, out.width, out.height);
      } catch (_e) {
        return src;
      }
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.max(0, Math.min(255, data[i] * clamped));
        data[i + 1] = Math.max(0, Math.min(255, data[i + 1] * clamped));
        data[i + 2] = Math.max(0, Math.min(255, data[i + 2] * clamped));
      }
      ctx.putImageData(imageData, 0, 0);
      return out;
    } catch (err) {
      console.warn('[ImagePreprocessor] adjustBrightness failed:', err);
      return canvas;
    }
  }

  function cropToCircle(canvas, x, y, radius, padding) {
    try {
      const src = ensureCanvas(canvas);
      if (!src) return canvas;
      const pad = Number.isFinite(padding) ? padding : 1.2;
      const r = Math.max(8, Number(radius) || 0) * Math.max(1, pad);
      const cx = Number(x);
      const cy = Number(y);
      if (!Number.isFinite(cx) || !Number.isFinite(cy)) return src;

      const x0 = Math.max(0, Math.floor(cx - r));
      const y0 = Math.max(0, Math.floor(cy - r));
      const x1 = Math.min(src.width, Math.ceil(cx + r));
      const y1 = Math.min(src.height, Math.ceil(cy + r));
      const w = x1 - x0;
      const h = y1 - y0;
      if (w < 4 || h < 4) return src;

      const out = document.createElement('canvas');
      out.width = w;
      out.height = h;
      const ctx = out.getContext('2d');
      if (!ctx) return src;
      ctx.drawImage(src, x0, y0, w, h, 0, 0, w, h);
      return out;
    } catch (err) {
      console.warn('[ImagePreprocessor] cropToCircle failed:', err);
      return canvas;
    }
  }

  function buildGrayscale(canvas) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    let imageData;
    try {
      imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    } catch (_e) {
      return null;
    }
    const data = imageData.data;
    const len = canvas.width * canvas.height;
    const gray = new Uint8ClampedArray(len);
    for (let i = 0, p = 0; p < len; i += 4, p += 1) {
      gray[p] = (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) | 0;
    }
    return { gray, width: canvas.width, height: canvas.height };
  }

  function downscaleForDetection(canvas) {
    const longest = Math.max(canvas.width, canvas.height);
    if (longest <= DETECT_MAX_DIM) return { canvas: canvas, scale: 1 };
    const scale = DETECT_MAX_DIM / longest;
    const out = document.createElement('canvas');
    out.width = Math.max(1, Math.round(canvas.width * scale));
    out.height = Math.max(1, Math.round(canvas.height * scale));
    const ctx = out.getContext('2d');
    if (!ctx) return { canvas: canvas, scale: 1 };
    ctx.drawImage(canvas, 0, 0, out.width, out.height);
    return { canvas: out, scale: scale };
  }

  function scoreCircle(grayInfo, cx, cy, radius) {
    const gray = grayInfo.gray;
    const w = grayInfo.width;
    const h = grayInfo.height;
    let edgeScore = 0;
    let hits = 0;
    for (let i = 0; i < DETECT_ANGLE_SAMPLES; i += 1) {
      const theta = (i / DETECT_ANGLE_SAMPLES) * Math.PI * 2;
      const rx = Math.round(cx + Math.cos(theta) * radius);
      const ry = Math.round(cy + Math.sin(theta) * radius);
      const inX = Math.round(cx + Math.cos(theta) * (radius - 3));
      const inY = Math.round(cy + Math.sin(theta) * (radius - 3));
      const outX = Math.round(cx + Math.cos(theta) * (radius + 3));
      const outY = Math.round(cy + Math.sin(theta) * (radius + 3));
      if (rx < 1 || rx >= w - 1 || ry < 1 || ry >= h - 1) continue;
      if (inX < 0 || inX >= w || inY < 0 || inY >= h) continue;
      if (outX < 0 || outX >= w || outY < 0 || outY >= h) continue;
      const inner = gray[inY * w + inX];
      const outer = gray[outY * w + outX];
      const diff = Math.abs(inner - outer);
      edgeScore += diff;
      hits += 1;
    }
    if (hits < DETECT_ANGLE_SAMPLES * 0.7) return 0;
    return edgeScore / hits;
  }

  function detectTargetCircle(canvas) {
    try {
      const src = ensureCanvas(canvas);
      if (!src) return { x: 0, y: 0, radius: 0, confidence: 0 };
      const ds = downscaleForDetection(src);
      const grayInfo = buildGrayscale(ds.canvas);
      if (!grayInfo) return { x: 0, y: 0, radius: 0, confidence: 0 };

      const w = grayInfo.width;
      const h = grayInfo.height;
      const minDim = Math.min(w, h);
      const minR = Math.round(minDim * 0.18);
      const maxR = Math.round(minDim * 0.5);
      if (maxR <= minR) return { x: 0, y: 0, radius: 0, confidence: 0 };

      const centerOffset = Math.round(minDim * 0.12);
      const centerStep = Math.max(2, Math.round((centerOffset * 2) / DETECT_CENTER_STEPS));
      const radiusStep = Math.max(1, Math.round((maxR - minR) / DETECT_RADIUS_STEPS));

      let best = { x: w / 2, y: h / 2, radius: minR, score: 0 };
      const cxBase = w / 2;
      const cyBase = h / 2;

      for (let cy = cyBase - centerOffset; cy <= cyBase + centerOffset; cy += centerStep) {
        for (let cx = cxBase - centerOffset; cx <= cxBase + centerOffset; cx += centerStep) {
          for (let r = minR; r <= maxR; r += radiusStep) {
            const score = scoreCircle(grayInfo, cx, cy, r);
            if (score > best.score) {
              best = { x: cx, y: cy, radius: r, score };
            }
          }
        }
      }

      const confidence = Math.max(0, Math.min(1, best.score / 60));
      const inverseScale = ds.scale === 0 ? 1 : 1 / ds.scale;
      return {
        x: Math.round(best.x * inverseScale),
        y: Math.round(best.y * inverseScale),
        radius: Math.round(best.radius * inverseScale),
        confidence: Math.round(confidence * 100) / 100,
      };
    } catch (err) {
      console.warn('[ImagePreprocessor] detectTargetCircle failed:', err);
      return { x: 0, y: 0, radius: 0, confidence: 0 };
    }
  }

  return {
    autoRotate,
    adjustBrightness,
    cropToCircle,
    detectTargetCircle,
  };
})();
