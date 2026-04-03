/**
 * Gemini AI Coach – Foto-Analyse, Score-Erkennung & Coaching
 * Nutzt Google Gemini Vision API für Bilderkennung
 * API-Key wird sicher aus Firebase RTDB geladen (nicht im Quellcode!)
 * Gibt strukturiertes JSON zurück: { score, tips }
 */
const GeminiCoach = (function () {
  'use strict';

  // ═══════════════════════════════════════════════════════════════════════
  // Der API-Key wird NICHT mehr hier gespeichert!
  // Er wird beim Start aus deiner Firebase Realtime Database geladen.
  // Pfad in Firebase: /config/geminiApiKey
  // ═══════════════════════════════════════════════════════════════════════
  const FIREBASE_DB_URL = 'https://burnished-block-402111-default-rtdb.europe-west1.firebasedatabase.app';
  const API_KEY_PATH = '/config/geminiApiKey.json';

  const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

  // Geladener API-Key (aus Firebase)
  let _apiKey = null;
  let _keyLoading = false;
  let _keyLoadPromise = null;

  // Rate-Limiting
  let _lastRequest = 0;
  const MIN_INTERVAL = 5000;

  // Retry-Konfiguration
  const MAX_RETRIES = 2;
  const RETRY_BASE_DELAY = 2000;
  const RETRYABLE_STATUS = [429, 500, 502, 503];

  // Disziplin-Score-Bereiche für Validierung
  const SCORE_RANGES = {
    lg40: { min: 50, max: 436 },
    lg60: { min: 50, max: 654 },
    kk50: { min: 50, max: 600 },
    kk100: { min: 50, max: 600 },
    kk3x20: { min: 50, max: 600 }
  };

  // Schwierigkeitsangepasste System-Prompts (deutsch)
  const COACHING_PROMPTS = {
    easy: `Du bist ein freundlicher, ermutigender Schießtrainer für Anfänger im Sportschießen.
Der Spieler ist auf Kreisklasse-Niveau.
Gib 2-3 einfache, motivierende Tipps (Grundhaltung, Atmung, Konzentration).
Sei ermutigend und positiv! Nutze einfache Sprache. Maximal 4-5 Sätze.`,

    real: `Du bist ein erfahrener Vereinstrainer im Sportschießen auf Bezirksliga-Niveau.
Der Spieler hat solide Grundlagen.
Gib 2-3 konkrete technische Tipps (Abzugstechnik, Anschlagsoptimierung, Diopter-Einstellung).
Sei sachlich und konstruktiv. Maximal 5-6 Sätze.`,

    hard: `Du bist ein Bundestrainer im Sportschießen auf WM-Niveau.
Der Spieler ist fortgeschritten.
Gib 2-3 fortgeschrittene taktische Tipps (Schussrhythmus, mentale Kontrolle, Wettkampf-Strategie).
Sei anspruchsvoll und detailliert. Maximal 5-6 Sätze.`,

    elite: `Du bist ein Weltklasse-Schießsport-Analytiker auf Weltrekord-Niveau.
Der Spieler kämpft gegen Weltrekord-Bots.
Gib 2-3 hochspezialisierte Pro-Level-Tipps (Mikrobewegungsanalyse, Pulspausen-Schießen, mentale Resilienz).
Sei sehr präzise und professionell. Maximal 5-6 Sätze.`
  };

  // Disziplin-Kontext für den Prompt
  const DISCIPLINE_CONTEXT = {
    lg40: 'Luftgewehr (LG), 40 Schuss auf 10m. Zehntel-Wertung (max 10.9/Schuss, max 436.0 gesamt). Score ist eine Dezimalzahl z.B. 405.2',
    lg60: 'Luftgewehr (LG), 60 Schuss auf 10m. Zehntel-Wertung (max 10.9/Schuss, max 654.0 gesamt). Score ist eine Dezimalzahl z.B. 612.4',
    kk50: 'Kleinkaliber (KK), 60 Schuss auf 50m. Ganzzahl-Wertung (max 10/Schuss, max 600 gesamt). Score ist eine Ganzzahl z.B. 582',
    kk100: 'Kleinkaliber (KK), 60 Schuss auf 100m. Ganzzahl-Wertung (max 10/Schuss, max 600 gesamt). Score ist eine Ganzzahl z.B. 571',
    kk3x20: 'Kleinkaliber (KK) 3×20 Dreistellungskampf auf 50m (Kniend, Liegend, Stehend). Ganzzahl-Wertung (max 600 gesamt). Score ist eine Ganzzahl z.B. 568'
  };

  /**
   * Lädt den API-Key aus Firebase RTDB (REST API, kein SDK nötig)
   */
  async function loadApiKey() {
    if (_apiKey) return _apiKey;
    if (_keyLoadPromise) return _keyLoadPromise;

    _keyLoading = true;
    _keyLoadPromise = (async () => {
      try {
        const resp = await fetch(FIREBASE_DB_URL + API_KEY_PATH);
        if (!resp.ok) {
          console.warn('[GeminiCoach] Konnte API-Key nicht aus Firebase laden:', resp.status);
          return null;
        }
        const key = await resp.json();
        if (key && typeof key === 'string' && key.length > 10) {
          _apiKey = key;
          console.log('[GeminiCoach] API-Key erfolgreich aus Firebase geladen');
          return _apiKey;
        }
        console.warn('[GeminiCoach] Kein gültiger API-Key in Firebase gefunden');
        return null;
      } catch (err) {
        console.warn('[GeminiCoach] Firebase-Abruf fehlgeschlagen:', err);
        return null;
      } finally {
        _keyLoading = false;
      }
    })();

    return _keyLoadPromise;
  }

  // Beim Laden der Seite sofort den Key abrufen
  loadApiKey();

  /**
   * Konvertiert eine Bilddatei zu Base64
   */
  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function validateScore(score, discipline) {
    if (typeof score !== 'number' || isNaN(score)) return null;
    const range = SCORE_RANGES[discipline];
    if (!range) return score;
    if (score < range.min || score > range.max) {
      console.warn(`[GeminiCoach] Score ${score} außerhalb des Bereichs für ${discipline} (${range.min}-${range.max})`);
      return null;
    }
    return score;
  }

  /**
   * Hauptfunktion: Analysiere ein Foto
   */
  async function analyzePhoto(imageFile, difficulty, discipline, isKK) {
    // Rate-Limiting
    const now = Date.now();
    if (now - _lastRequest < MIN_INTERVAL) {
      return { score: null, tips: '⏳ Bitte warte einen Moment vor der nächsten Analyse.', error: 'rate_limit' };
    }
    _lastRequest = now;

    // API-Key laden (falls noch nicht geschehen)
    const apiKey = await loadApiKey();
    if (!apiKey) {
      return { score: null, tips: '⚠️ KI-Analyse nicht verfügbar (API-Key fehlt).', error: 'no_key' };
    }

    try {
      const base64Data = await fileToBase64(imageFile);
      const mimeType = imageFile.type || 'image/jpeg';

      const coachPrompt = COACHING_PROMPTS[difficulty] || COACHING_PROMPTS.real;
      const discContext = DISCIPLINE_CONTEXT[discipline] || '';
      const scoreFormat = isKK ? 'eine Ganzzahl (z.B. 582)' : 'eine Dezimalzahl mit einer Nachkommastelle (z.B. 405.2)';

      const prompt = `Du bist ein KI-System für Sportschießen-Ergebniserkennung und Coaching.

AUFGABE 1 – SCORE-ERKENNUNG:
Analysiere das Bild und finde den Gesamtscore / die Gesamtpunktzahl des Schützen.
Disziplin: ${discContext || 'Unbekannt'}
Waffe: ${isKK ? 'Kleinkaliber (KK)' : 'Luftgewehr (LG)'}
Der Score sollte ${scoreFormat} sein.
Wenn du keinen Score erkennen kannst, setze "score" auf null.
WICHTIG: Lies den Score GENAU ab. Verwechsle keine Ziffern. Achte auf Dezimalpunkte bei LG.

AUFGABE 2 – COACHING:
${coachPrompt}
Beziehe dich auf das, was du im Bild siehst (Trefferbild, Streuung, Schwächen).
Antworte auf Deutsch. Nutze Emojis. Kein Markdown.

Antworte AUSSCHLIESSLICH als valides JSON-Objekt in genau diesem Format:
{"score": <Zahl oder null>, "tips": "<Deine Coaching-Tipps als ein zusammenhängender Text>"}`;

      const requestBody = JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: mimeType,
                data: base64Data
              }
            }
          ]
        }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 400,
          topP: 0.8,
          responseMimeType: 'application/json'
        }
      });

      // Fetch mit Retry-Logik
      let response = null;
      let lastError = null;

      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
          response = await fetch(`${API_URL}?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: requestBody
          });

          if (response.ok) break;

          if (RETRYABLE_STATUS.includes(response.status) && attempt < MAX_RETRIES) {
            const retryDelay = RETRY_BASE_DELAY * Math.pow(2, attempt);
            console.warn(`[GeminiCoach] Retry ${attempt + 1}/${MAX_RETRIES} nach ${response.status}, warte ${retryDelay}ms...`);
            await delay(retryDelay);
            continue;
          }

          const errText = await response.text().catch(() => '');
          console.warn('[GeminiCoach] API error:', response.status, errText);
          return { score: null, tips: '⚠️ KI-Analyse gerade nicht verfügbar.', error: 'api_error' };

        } catch (fetchErr) {
          lastError = fetchErr;
          if (attempt < MAX_RETRIES) {
            const retryDelay = RETRY_BASE_DELAY * Math.pow(2, attempt);
            console.warn(`[GeminiCoach] Netzwerk-Retry ${attempt + 1}/${MAX_RETRIES}, warte ${retryDelay}ms...`);
            await delay(retryDelay);
            continue;
          }
        }
      }

      if (!response || !response.ok) {
        console.warn('[GeminiCoach] Alle Retries fehlgeschlagen:', lastError);
        return { score: null, tips: '⚠️ KI-Analyse fehlgeschlagen. Bitte prüfe deine Internetverbindung.', error: 'network' };
      }

      const data = await response.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!rawText) {
        return { score: null, tips: '⚠️ KI konnte das Bild nicht analysieren.', error: 'no_content' };
      }

      try {
        const parsed = JSON.parse(rawText);
        const rawScore = (typeof parsed.score === 'number' && !isNaN(parsed.score)) ? parsed.score : null;
        const score = validateScore(rawScore, discipline);
        const tips = (typeof parsed.tips === 'string' && parsed.tips.length > 0) ? parsed.tips : '⚠️ Keine Tipps generiert.';
        return { score, tips };
      } catch (parseErr) {
        console.warn('[GeminiCoach] JSON parse failed, raw:', rawText);
        return { score: null, tips: rawText.trim() };
      }

    } catch (err) {
      console.warn('[GeminiCoach] Error:', err);
      return { score: null, tips: '⚠️ KI-Analyse fehlgeschlagen. Bitte prüfe deine Internetverbindung.', error: 'network' };
    }
  }

  /**
   * Prüft ob der Service verfügbar ist
   */
  function isAvailable() {
    return !!_apiKey || _keyLoading || !!_keyLoadPromise;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // NEU v2.0: Ultra-realistischer Coaching-Prompt für physiologische Bot-Daten
  // EN: NEW v2.0: Ultra-realistic coaching prompt for physiological bot data
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Generiert einen erweiterten Coaching-Prompt für die Gemini API,
   * der die physiologischen Schussdaten des neuen Bot-Systems versteht.
   *
   * EN: Generates an enhanced coaching prompt for the Gemini API
   * that understands the physiological shot data from the new bot system.
   *
   * @param {Object} botGroupJson - Output von AdaptiveBotSystem.generateRealisticBotGroup()
   * @param {Object} [playerStats] - Optionale Spielerstatistiken / Optional player stats
   * @param {string} [targetDiscipline] - Disziplin-String / Discipline string
   * @returns {string} Der fertige Prompt für die Gemini API
   */
  function generateEnhancedCoachingPrompt(botGroupJson, playerStats, targetDiscipline) {
    if (!botGroupJson || !botGroupJson.shots) return '';

    const discipline = targetDiscipline || 'Luftgewehr 10m';
    const difficulty = botGroupJson.difficulty || 'real';
    const grouping = botGroupJson.grouping || {};
    const physio = botGroupJson.physiologySummary || '';

    // Spieler-Vergleich (falls vorhanden) / Player comparison (if available)
    let playerContext = '';
    if (playerStats) {
      playerContext = `
[SPIELER-VERGLEICH / PLAYER COMPARISON]
Spieler-Score: ${playerStats.score || '–'}
Spieler-Winrate: ${playerStats.winRate ? (playerStats.winRate * 100).toFixed(0) + '%' : '–'}
Spieler-Tendenz: ${playerStats.trend || 'unbekannt'}`;
    }

    return `Du bist ein Elite-ISSF-Schießsport-Trainer (Luftgewehr/Kleinkaliber/Pistole) mit jahrzehntelanger biomechanischer Expertise auf Olympia-Niveau.
Analysiere die folgenden physiologischen Schussdaten und gib ultra-realistisches Coaching-Feedback.

[KONTEXT / CONTEXT]
Disziplin: ${discipline}
Schwierigkeit: ${difficulty}
Extreme Streuung: ${grouping.extremeSpread || '–'} mm
Mean Radius: ${grouping.meanRadius || '–'} mm
Gruppenschwerpunkt-Versatz: X=${grouping.centerOffsetX || 0}mm, Y=${grouping.centerOffsetY || 0}mm
Physiologie-Zusammenfassung: ${physio}
${playerContext}

[SCHUSSDATEN / SHOT DATA (X/Y vom Zentrum in mm, plus erkannter biomechanischer Fehler)]
${JSON.stringify(botGroupJson.shots, null, 2)}

[AUFGABE / TASK]
1. Analysiere das exakte X/Y-Streuungsmuster. Deutet es auf Abzugsreißen (z.B. tief-rechts), vertikale Atemstreuung oder pulsbedingte Sprünge hin?
2. Schreibe ein kurzes, hochprofessionelles Trainer-Feedback (max 3 Sätze) direkt an den Schützen gerichtet.
3. Bei Fehlertyp 'breathing': erwähne explizit das Timing der Atempause (natürliche Pause nach Ausatmung).
4. Bei Fehlertyp 'trigger': bespreche Nachhalten (Follow-Through) und gleichmäßigen Druckpunktaufbau.
5. Bei Fehlertyp 'hrv': empfehle Pulspausen-Schießen (in der Diastole abziehen).
6. Tonfall: Professionell, analytisch, ermutigend (wie ein echter Olympia-Trainer).
7. Antworte auf DEUTSCH. Nutze Emojis. Kein Markdown.

Mache die Analyse ultra-realistisch basierend auf den Millimeter-Messwerten.`;
  }

  return {
    analyzePhoto,
    isAvailable,
    loadApiKey,
    // NEU v2.0: Erweiterter Coaching-Prompt / NEW v2.0
    generateEnhancedCoachingPrompt
  };
})();
