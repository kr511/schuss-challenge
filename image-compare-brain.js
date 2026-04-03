/* ═══════════════════════════════════════════════════════════════════════
   IMAGE-COMPARE-BRAIN.JS — Das "Gehirn" der Bilderkennung
   Konfiguration · Disziplinen · OCR-Tuning · Modell-Pfade
   ═══════════════════════════════════════════════════════════════════════
   Diese Datei wird VOR image-compare.js geladen und stellt alle
   Konfigurations-Konstanten über window.ImageCompareBrain bereit.
   ═══════════════════════════════════════════════════════════════════════ */

window.ImageCompareBrain = (function () {
    'use strict';

    /* ═══════════════════════════════════════════════════════════════════════
       ██  MODELL-PFAD — HIER DEIN EIGENES TENSORFLOW-MODELL EINTRAGEN  ██
       ═══════════════════════════════════════════════════════════════════════
       Zeigt auf die model.json deines selbst trainierten TensorFlow.js-Modells.
       Das Modell sollte zwei Ausgaben liefern:
         1. Klassifikation: "monitor" vs. "kein_monitor" (Sigmoid, 0–1)
         2. Optional: Bounding-Box [x, y, width, height] normalisiert (0–1)
  
       Beispiel Ordnerstruktur:
         /model/
           model.json          ← Hauptdatei (Architektur + Gewichte-Referenz)
           group1-shard1of1.bin ← Gewichte (automatisch von TF.js geladen)
  
       Ändere den Pfad hier, wenn dein Modell woanders liegt:
       ═══════════════════════════════════════════════════════════════════════ */
    const MODEL_PATH = './model/model.json';

    /* ─── Modell-Eingabe-Konfiguration ─── */
    const MODEL_INPUT_SIZE = 224;        // Breite/Höhe für das Modell (z.B. MobileNet = 224)
    const MONITOR_CONFIDENCE_THRESHOLD = 0.6; // Ab welcher Konfidenz gilt "Monitor erkannt"

    /* Labels aus metadata.json deines Teachable Machine Modells */
    const MODEL_LABELS = ['Monitor', 'Nichts'];

    /* ═══ KI-TRAINING FEEDBACK LOOP (FORMSPREE - PER E-MAIL) ════════════
       Echte User-Fotos (bei denen die KI falsch lag) direkt in dein Postfach!
       1. Gehe auf formspree.io und erstelle ein kostenloses "Formular"
       2. Du erhältst einen Link wie: https://formspree.io/f/xyzabcde
       3. Trag die ID (xyzabcde) hier ein und setze FEEDBACK_ENABLED = true */
    const FEEDBACK_ENABLED = true;
    const FORMSPREE_ENDPOINT = 'xreyggrp';

    /* ═══ SCORE-KONFIGURATION ═══════════════════════════════════════════ */

    /** Zentrale Score-Konfiguration — alle Schwellwerte an einem Ort */
    const SCORE_CONFIG = {
        VALID_RANGE: { min: 10, max: 660 },

        DISCIPLINES: {
            "lg40": { min: 50, max: 436, isInteger: false },
            "lg60": { min: 50, max: 654, isInteger: false },
            "kk50": { min: 50, max: 600, isInteger: true },
            "kk100": { min: 50, max: 600, isInteger: true },
            "kk3x20": { min: 50, max: 600, isInteger: true }
        },

        /* Gewichtungsfaktoren für die Konfidenz-Berechnung */
        WEIGHTS: {
            CENTER_FACTOR: 0.5,
            KEYWORD_NEAR_BONUS: 1.0,
            KEYWORD_MAX_DIST: 15,
            LABELED_TYPE_BONUS: 0.5,
            FORMAT_MATCH_BONUS: 0.3,
            GOOD_GEOMETRY_BONUS: 1.2,
            BAD_GEOMETRY_PENALTY: 0.5,
        },

        /* Schlüsselwörter die auf einen Gesamtscore hindeuten */
        KEYWORDS: ['gesamt', 'total', 'summe', 'ergebnis', 'result', 'ringe', 'pkt'],

        /* Plausibles Seitenverhältnis (Höhe/Breite) für Ziffern */
        GEOMETRY: { MIN: 0.8, MAX: 4.0, GOOD_MIN: 1.2, GOOD_MAX: 2.8 },
    };

    /* ═══ OCR-ZEICHENKORREKTUREN ═════════════════════════════════════════ */

    /** Häufige Fehllesungen von Ziffern */
    const OCR_CHAR_FIXES = [
        [/[oO]/g, '0'],
        [/[lI|]/g, '1'],
        [/[sS](?=\d)/g, '5'],
        [/[,]/g, '.'],
    ];

    /* ═══ MULTI-PASS OCR STRATEGIE ══════════════════════════════════════ */

    /** Jeder Pass hat eigene Vorverarbeitungsparameter */
    const OCR_PASSES = [
        { name: 'Standard', options: {}, triggerBelow: 1.0 },
        { name: 'Gamma-Boost', options: { gamma: 1.5 }, triggerBelow: 0.85 },
        { name: 'Invertiert', options: { invert: true }, triggerBelow: 0.7 },
    ];

    /* ═══ HILFSFUNKTIONEN ═══════════════════════════════════════════════ */

    /** Textbereinigung — OCR-Fehler korrigieren & Whitespace normalisieren */
    function cleanOCRText(text) {
        let clean = text;
        for (const [pattern, replacement] of OCR_CHAR_FIXES) {
            clean = clean.replace(pattern, replacement);
        }
        return clean.replace(/\s+/g, ' ');
    }

    /* ═══ PUBLIC API ════════════════════════════════════════════════════ */

    return {
        MODEL_PATH,
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
