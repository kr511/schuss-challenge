/* ImageCompareBrain: zentrale Konfiguration fuer Foto-/OCR-Auswertung. */
window.ImageCompareBrain = (function () {
    'use strict';

    const MODEL_PATH = './model.json';
    const MODEL_TYPE = 'graph';          // 'graph', 'layers' oder 'auto'
    const MODEL_OUTPUT_MODE = 'detection'; // 'classification' fuer Papier/Monitor-Softmax, 'detection' fuer YOLO/V2
    const TFJS_SRC = 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js';

    const MODEL_INPUT_SIZE = 64;
    const MONITOR_CONFIDENCE_THRESHOLD = 0.55;
    const MODEL_LABELS = ['Papier', 'Monitor'];

    const FEEDBACK_ENABLED = false;
    const FORMSPREE_ENDPOINT = 'xreyggrp';

    const SCORE_CONFIG = {
        VALID_RANGE: { min: 10, max: 660 },
        DISCIPLINES: {
            lg40: { min: 50, max: 436, isInteger: false },
            lg60: { min: 50, max: 654, isInteger: false },
            kk50: { min: 50, max: 600, isInteger: true },
            kk100: { min: 50, max: 600, isInteger: true },
            kk3x20: { min: 50, max: 600, isInteger: true }
        },
        WEIGHTS: {
            CENTER_FACTOR: 0.5,
            KEYWORD_NEAR_BONUS: 1.0,
            KEYWORD_MAX_DIST: 15,
            LABELED_TYPE_BONUS: 0.5,
            FORMAT_MATCH_BONUS: 0.3,
            GOOD_GEOMETRY_BONUS: 1.2,
            BAD_GEOMETRY_PENALTY: 0.5,
        },
        KEYWORDS: ['gesamt', 'total', 'summe', 'ergebnis', 'result', 'ringe', 'pkt'],
        GEOMETRY: { MIN: 0.8, MAX: 4.0, GOOD_MIN: 1.2, GOOD_MAX: 2.8 },
    };

    const OCR_CHAR_FIXES = [
        [/[oO]/g, '0'],
        [/[lI|]/g, '1'],
        [/[sS](?=\d)/g, '5'],
        [/[,]/g, '.'],
    ];

    const OCR_PASSES = [
        { name: 'Full-Standard', options: { cropKey: 'full', psm: 6, contrast: 1.05, upscale: 1.2 }, triggerBelow: 1.0 },
        { name: 'Upper-Half', options: { cropKey: 'upper_half', psm: 6, gamma: 1.1, contrast: 1.2, upscale: 1.5 }, triggerBelow: 0.96 },
        { name: 'Upper-Band-BW', options: { cropKey: 'upper_band', psm: 7, gamma: 1.15, contrast: 1.35, autoThreshold: true, upscale: 2.0 }, triggerBelow: 0.93 },
        { name: 'Upper-Center-BW', options: { cropKey: 'upper_center', psm: 7, gamma: 1.1, contrast: 1.45, autoThreshold: true, upscale: 2.4 }, triggerBelow: 0.9 },
        { name: 'Upper-Right-BW', options: { cropKey: 'upper_right', psm: 7, gamma: 1.1, contrast: 1.45, autoThreshold: true, upscale: 2.4 }, triggerBelow: 0.87 },
        { name: 'Upper-Center-Invert', options: { cropKey: 'upper_center', psm: 7, invert: true, contrast: 1.35, autoThreshold: true, upscale: 2.2 }, triggerBelow: 0.82 },
    ];

    function cleanOCRText(text) {
        let clean = String(text || '');
        for (const [pattern, replacement] of OCR_CHAR_FIXES) {
            clean = clean.replace(pattern, replacement);
        }
        return clean.replace(/\s+/g, ' ');
    }

    return {
        MODEL_PATH,
        MODEL_TYPE,
        MODEL_OUTPUT_MODE,
        TFJS_SRC,
        MODEL_INPUT_SIZE,
        MODEL_LABELS,
        MONITOR_CONFIDENCE_THRESHOLD,
        FEEDBACK_ENABLED,
        FORMSPREE_ENDPOINT,
        SCORE_CONFIG,
        OCR_CHAR_FIXES,
        OCR_PASSES,
        cleanOCRText,
    };
})();
