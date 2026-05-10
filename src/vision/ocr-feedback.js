/**
 * OCR Feedback Tracker
 *
 * Speichert nach jeder OCR-Erkennung + manueller Korrektur einen Eintrag in
 * localStorage unter `sd_ocr_feedback`. So lernt die App lokal, wie zuverlaessig
 * die Erkennung in der Praxis ist.
 */
window.OCRFeedback = (function () {
  'use strict';

  const STORAGE_KEY = 'sd_ocr_feedback';
  const MAX_ENTRIES = 200;
  const SCORE_TOLERANCE = 0.001;

  function getStorage() {
    try {
      if (typeof window === 'undefined') return null;
      return window.localStorage || null;
    } catch (_e) {
      return null;
    }
  }

  function readEntries() {
    const ls = getStorage();
    if (!ls) return [];
    try {
      const raw = ls.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (_e) {
      return [];
    }
  }

  function writeEntries(entries) {
    const ls = getStorage();
    if (!ls) return false;
    try {
      const trimmed = Array.isArray(entries) ? entries.slice(-MAX_ENTRIES) : [];
      ls.setItem(STORAGE_KEY, JSON.stringify(trimmed));
      return true;
    } catch (err) {
      console.warn('[OCRFeedback] Speicherung fehlgeschlagen:', err);
      return false;
    }
  }

  function toFiniteNumber(value, fallback) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function saveOCRFeedback(payload) {
    if (!payload || typeof payload !== 'object') return false;
    try {
      const entry = {
        detected: payload.detected === null || payload.detected === undefined
          ? null
          : toFiniteNumber(payload.detected, null),
        corrected: payload.corrected === null || payload.corrected === undefined
          ? null
          : toFiniteNumber(payload.corrected, null),
        confidence: Math.max(0, Math.min(1, toFiniteNumber(payload.confidence, 0))),
        rotation: toFiniteNumber(payload.rotation, 0),
        blur: toFiniteNumber(payload.blur, 0),
        timestamp: Number.isFinite(payload.timestamp) ? payload.timestamp : Date.now(),
      };
      const list = readEntries();
      list.push(entry);
      return writeEntries(list);
    } catch (err) {
      console.warn('[OCRFeedback] saveOCRFeedback fehlgeschlagen:', err);
      return false;
    }
  }

  function isCorrect(entry) {
    if (!entry) return false;
    if (entry.detected === null || entry.detected === undefined) return false;
    if (entry.corrected === null || entry.corrected === undefined) {
      return true;
    }
    return Math.abs(Number(entry.detected) - Number(entry.corrected)) < SCORE_TOLERANCE;
  }

  function getOCRAccuracyRate() {
    const list = readEntries();
    const usable = list.filter((e) => e && e.detected !== null && e.detected !== undefined);
    if (usable.length === 0) return 0;
    const correct = usable.filter(isCorrect).length;
    return Math.round((correct / usable.length) * 1000) / 10;
  }

  function getStats() {
    const list = readEntries();
    return {
      total: list.length,
      accuracy: getOCRAccuracyRate(),
    };
  }

  function clearFeedback() {
    const ls = getStorage();
    if (!ls) return false;
    try {
      ls.removeItem(STORAGE_KEY);
      return true;
    } catch (_e) {
      return false;
    }
  }

  return {
    saveOCRFeedback,
    getOCRAccuracyRate,
    getStats,
    clearFeedback,
    _readEntries: readEntries,
  };
})();
