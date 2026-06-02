/**
 * OCR Confidence & Plausibility
 *
 * Reine, DOM-freie Logik zur ehrlichen Konfidenz-Kalibrierung und
 * Plausibilitaetspruefung der Foto-/OCR-Auswertung. Wird von
 * src/vision/image-compare.js konsumiert und ist isoliert testbar
 * (siehe test_ocr_confidence.mjs).
 *
 * Eine einzige Quelle der Wahrheit fuer typische Ergebnisbereiche.
 *
 * window.OCRConfidence
 */
(function (root) {
  'use strict';

  // Gesamt-Ringe pro Disziplin.
  //  - min/max: physikalisch moegliche Grenzen (alles darueber ist unmoeglich)
  //  - low/high: typisches Band fuer Plausibilitaet/Typikalitaet
  //  - isInteger/decimals: Format der Disziplin
  const TYPICAL_RANGES = {
    lg40:   { min: 0, max: 436, low: 320, high: 420, isInteger: false, decimals: 1 },
    lg60:   { min: 0, max: 654, low: 480, high: 640, isInteger: false, decimals: 1 },
    kk50:   { min: 0, max: 600, low: 400, high: 590, isInteger: true,  decimals: 0 },
    kk100:  { min: 0, max: 600, low: 400, high: 590, isInteger: true,  decimals: 0 },
    kk3x20: { min: 0, max: 600, low: 450, high: 590, isInteger: true,  decimals: 0 }
  };

  const DEFAULT_RANGE = { min: 0, max: 654, low: 300, high: 640, isInteger: false, decimals: 1 };

  // Schwellen fuer die Konfidenz-Stufen (gruen / gelb / rot in der UI).
  const TIER_THRESHOLDS = { high: 0.82, medium: 0.6 };

  function clamp01(value) {
    const num = Number(value);
    if (!Number.isFinite(num)) return 0;
    return Math.max(0, Math.min(0.99, num));
  }

  function getTypicalRange(discipline) {
    if (discipline && Object.prototype.hasOwnProperty.call(TYPICAL_RANGES, discipline)) {
      return TYPICAL_RANGES[discipline];
    }
    return DEFAULT_RANGE;
  }

  function confidenceTier(confidence) {
    const c = Number(confidence) || 0;
    if (c >= TIER_THRESHOLDS.high) return 'high';
    if (c >= TIER_THRESHOLDS.medium) return 'medium';
    return 'low';
  }

  /**
   * Verrechnet die rohe OCR-/Parser-Konfidenz mit
   *  - Pass-Uebereinstimmung (wie viele Passes denselben Wert lasen)
   *  - Bildqualitaet (Schaerfe, Rotation, Helligkeit)
   *  - Plausibilitaet (typischer Bereich, Ganzzahligkeit)
   * zu einer ehrlicheren Konfidenz inkl. Warnungen.
   *
   * @returns {{confidence:number, tier:string, warnings:Array<{code:string,message:string}>}}
   */
  function calibrateConfidence(rawConfidence, ctx) {
    const context = ctx || {};
    const range = getTypicalRange(context.discipline);
    const value = Number(context.value);
    const quality = context.quality || {};
    const sourceCount = Math.max(1, Number(context.sourceCount) || 1);
    const warnings = [];

    let confidence = clamp01(rawConfidence);

    // 1) Uebereinstimmung mehrerer Passes erhoeht das Vertrauen.
    if (sourceCount >= 3) confidence += 0.08;
    else if (sourceCount >= 2) confidence += 0.05;

    // 2) Bildqualitaet senkt das Vertrauen bei schlechten Aufnahmen.
    const blur = Number(quality.blur);
    if (Number.isFinite(blur)) {
      if (blur < 15) { confidence -= 0.18; warnings.push({ code: 'blur', message: 'Foto unscharf' }); }
      else if (blur < 25) confidence -= 0.08;
    }
    const rotation = Number(quality.rotation);
    if (Number.isFinite(rotation) && Math.abs(rotation) > 6) {
      confidence -= 0.06;
      warnings.push({ code: 'rotation', message: 'Foto schief' });
    }
    const brightness = Number(quality.brightness);
    if (Number.isFinite(brightness) && (brightness < 25 || brightness > 88)) {
      confidence -= 0.06;
      warnings.push({ code: 'brightness', message: brightness < 25 ? 'Zu dunkel' : 'Zu hell' });
    }
    if (quality.isUsable === false) confidence -= 0.05;

    // 3) Plausibilitaet des Wertes.
    if (Number.isFinite(value)) {
      if (value > range.max) {
        confidence -= 0.3;
        warnings.push({ code: 'above-max', message: 'Wert ueber Maximum' });
      } else if (value >= range.low && value <= range.high) {
        confidence += 0.04;
      } else {
        confidence -= 0.12;
        warnings.push({
          code: 'atypical',
          message: value < range.low ? 'Wert ungewoehnlich niedrig' : 'Wert ungewoehnlich hoch'
        });
      }

      if (range.isInteger && !Number.isInteger(value)) {
        confidence -= 0.1;
        warnings.push({ code: 'non-integer', message: 'Disziplin erwartet ganze Zahl' });
      }
    }

    confidence = clamp01(confidence);
    return { confidence, tier: confidenceTier(confidence), warnings };
  }

  /**
   * Schlaegt eine "fehlende Dezimalstelle/Null" (x10) vor, wenn der erkannte
   * Wert deutlich zu niedrig ist, x10 aber sauber im typischen Band landet.
   * Liefert nur einen Vorschlag – niemals eine automatische Aenderung.
   *
   * @returns {number|null}
   */
  function suggestDroppedDigit(value, discipline, isKK) {
    const v = Number(value);
    if (!Number.isFinite(v) || v <= 0) return null;
    const range = getTypicalRange(discipline);

    // Nur wenn der Wert klar unter dem typischen Band liegt.
    if (v >= range.low) return null;

    const scaled = v * 10;
    if (scaled < range.low || scaled > range.high || scaled > range.max) return null;

    if (isKK || range.isInteger) return Math.round(scaled);
    return Math.round(scaled * 10) / 10;
  }

  const api = {
    TYPICAL_RANGES,
    TIER_THRESHOLDS,
    getTypicalRange,
    confidenceTier,
    calibrateConfidence,
    suggestDroppedDigit
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.OCRConfidence = api;
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
