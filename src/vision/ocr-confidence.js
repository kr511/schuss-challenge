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

  // Haeufige Ziffern-Verwechslungen auf 7-Segment-/LCD-Anzeigen und in Kamera-OCR.
  // Bewusst kuratiert (nicht erschoepfend) – jede Ziffer zeigt auf real
  // verwechselbare Ziffern. Fehler #1 in der Praxis: ein einzelnes falsch
  // gelesenes Segment macht aus einem gueltigen Ergebnis einen unmoeglichen Wert.
  const CONFUSABLE_DIGITS = {
    '0': ['8', '6', '9'],
    '1': ['7'],
    '2': ['7'],
    '3': ['8', '9'],
    '4': ['9'],
    '5': ['6', '8', '9'],
    '6': ['8', '5', '0'],
    '7': ['1', '2'],
    '8': ['0', '6', '9', '3', '5'],
    '9': ['8', '4', '0', '5', '3']
  };

  // "Moeglich" = im realen Wertebereich: nicht unter dem typischen Band und
  // nicht ueber dem physikalischen Maximum. Elite-Scores (z. B. KK-50 591-600)
  // liegen ueber dem typischen Band, sind aber gueltig und werden akzeptiert.
  function inPossibleRange(value, range) {
    return Number.isFinite(value) && value >= range.low && value <= range.max;
  }

  /**
   * Schlaegt plausible Alternativ-Lesungen vor, wenn der erkannte Wert
   * untypisch/unmoeglich ist und EINE einzelne, real verwechselbare Ziffer
   * (7-Segment/LCD) das Ergebnis sauber ins typische Band zurueckschiebt.
   *
   * Beispiel: KK-50 liest "890" -> unmoeglich (>600). 8->5 ergibt 590, sauber
   * im typischen Band -> Vorschlag 590. Es wird NIE automatisch geaendert,
   * nur vorgeschlagen (analog suggestDroppedDigit).
   *
   * @returns {number[]} nach Plausibilitaet sortiert, max. `limit` Eintraege
   */
  function suggestConfusedReadings(value, discipline, isKK, options) {
    const opts = options || {};
    const limit = Number.isFinite(opts.limit) ? opts.limit : 3;
    const v = Number(value);
    if (!Number.isFinite(v) || v <= 0) return [];

    const range = getTypicalRange(discipline);
    // Moegliche Werte (inkl. gueltiger Elite-Scores) nicht "korrigieren" –
    // nur bei unmoeglicher (> max) oder untypisch niedriger Lesung helfen.
    if (inPossibleRange(v, range)) return [];

    const integer = !!isKK || range.isInteger;
    // Ganzzahl-Repraesentation der angezeigten Ziffern:
    //  - KK/Integer: der Wert selbst
    //  - LG (1 Nachkommastelle): Ringe x10, damit die Dezimalstelle eine echte Ziffer ist
    const scale = integer ? 1 : 10;
    const digits = String(Math.round(v * scale));
    const center = (range.low + range.high) / 2;
    const eps = integer ? 0.5 : 0.05;

    const seen = new Set();
    const out = [];
    for (let i = 0; i < digits.length; i++) {
      const swaps = CONFUSABLE_DIGITS[digits[i]];
      if (!swaps) continue;
      for (let s = 0; s < swaps.length; s++) {
        if (swaps[s] === digits[i]) continue;
        const variantInt = parseInt(digits.slice(0, i) + swaps[s] + digits.slice(i + 1), 10);
        if (!Number.isFinite(variantInt)) continue;
        let candidate = variantInt / scale;
        candidate = integer ? Math.round(candidate) : Math.round(candidate * 10) / 10;
        if (!inPossibleRange(candidate, range)) continue;    // nur real moegliche Treffer
        if (Math.abs(candidate - v) < eps) continue;         // == Originalwert
        const key = candidate.toFixed(integer ? 0 : 1);
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(candidate);
      }
    }

    // Die naheliegendste (typischste) Lesung zuerst.
    out.sort((a, b) => Math.abs(a - center) - Math.abs(b - center));
    return out.slice(0, Math.max(0, limit));
  }

  const api = {
    TYPICAL_RANGES,
    TIER_THRESHOLDS,
    CONFUSABLE_DIGITS,
    getTypicalRange,
    confidenceTier,
    calibrateConfidence,
    suggestDroppedDigit,
    suggestConfusedReadings
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.OCRConfidence = api;
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
