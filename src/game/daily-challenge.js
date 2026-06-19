/**
 * Daily Challenge System
 * Tägliche Herausforderungen für fokussiertes, zielgerichtetes Spielen.
 */

const DailyChallenge = (function () {
  'use strict';

  // Pool an Herausforderungen – disziplin- und ergebnisbasiert.
  // Bewertung erfolgt ausschließlich aus dem Spieler-Ergebnis bzw. Scheibenfoto
  // (Waffe, Disziplin, Schusszahl, Ringe) – niemals aus Sieg/Niederlage gegen den
  // Bot oder dessen Schwierigkeit. Alle Belohnungen sind feste 5–25 XP (keine Truhen).
  const CHALLENGES = [
    // ── Disziplin spielen ──
    {
      id: 'play_lg40',
      type: 'play',
      difficulty: 'easy',
      desc: 'Spiele ein LG 40 Duell (40 Schuss Luftgewehr).',
      target: 1,
      xpReward: 15,
      check: (game) => game.weapon === 'lg' && Number(game.shotCount) === 40,
      checkPhoto: (r) => r.weapon === 'lg' && Number(r.shotCount) === 40
    },
    {
      id: 'play_lg60',
      type: 'play',
      difficulty: 'medium',
      desc: 'Spiele ein LG 60 Duell (60 Schuss Luftgewehr).',
      target: 1,
      xpReward: 20,
      check: (game) => game.weapon === 'lg' && Number(game.shotCount) === 60,
      checkPhoto: (r) => r.weapon === 'lg' && Number(r.shotCount) === 60
    },
    {
      id: 'play_kk60',
      type: 'play',
      difficulty: 'medium',
      desc: 'Spiele ein KK Duell mit 60 Schuss (50 m oder 100 m).',
      target: 1,
      xpReward: 20,
      check: (game) => game.weapon === 'kk' && Number(game.shotCount) === 60 && game.discipline !== 'kk3x20',
      checkPhoto: (r) => r.weapon === 'kk' && Number(r.shotCount) === 60 && r.discipline !== 'kk3x20'
    },
    {
      id: 'play_kk3x20',
      type: 'play',
      difficulty: 'hard',
      desc: 'Spiele ein KK 3×20 Duell (Dreistellungskampf).',
      target: 1,
      xpReward: 25,
      check: (game) => game.discipline === 'kk3x20',
      checkPhoto: (r) => r.discipline === 'kk3x20'
    },
    {
      id: 'play_two',
      type: 'play_count',
      difficulty: 'easy',
      desc: 'Spiele heute 2 Duelle (beliebige Disziplin).',
      target: 2,
      xpReward: 10,
      check: (game) => game.weapon === 'lg' || game.weapon === 'kk',
      checkPhoto: (r) => r.weapon === 'lg' || r.weapon === 'kk'
    },
    // ── Ergebnis aus dem Scheibenfoto (ohne Bot) ──
    {
      id: 'photo_any',
      type: 'photo',
      difficulty: 'easy',
      desc: 'Reiche ein Scheibenfoto deines Ergebnisses ein.',
      target: 1,
      xpReward: 5,
      check: () => false,
      checkPhoto: (r) => (r.weapon === 'lg' || r.weapon === 'kk') && (Number(r.totalScore) > 0 || (Array.isArray(r.shots) && r.shots.length > 0))
    },
    {
      id: 'score_lg_350',
      type: 'score',
      difficulty: 'easy',
      desc: 'Erreiche 350+ Ringe in einem LG-Duell.',
      target: 1,
      xpReward: 12,
      check: (game) => game.weapon === 'lg' && Number(game.totalScore) >= 350,
      checkPhoto: (r) => r.weapon === 'lg' && Number(r.totalScore) >= 350
    },
    {
      id: 'score_lg_380',
      type: 'score',
      difficulty: 'medium',
      desc: 'Erreiche 380+ Ringe in einem LG-Duell.',
      target: 1,
      xpReward: 22,
      check: (game) => game.weapon === 'lg' && Number(game.totalScore) >= 380,
      checkPhoto: (r) => r.weapon === 'lg' && Number(r.totalScore) >= 380
    },
    {
      id: 'score_kk_520',
      type: 'score',
      difficulty: 'medium',
      desc: 'Erreiche 520+ Ringe in einem KK-Duell (60 Schuss).',
      target: 1,
      xpReward: 22,
      check: (game) => game.weapon === 'kk' && Number(game.shotCount) === 60 && Number(game.totalScore) >= 520,
      checkPhoto: (r) => r.weapon === 'kk' && Number(r.shotCount) === 60 && Number(r.totalScore) >= 520
    },
    {
      id: 'hit_ten',
      type: 'shot',
      difficulty: 'easy',
      desc: 'Schieße in einem Duell mindestens eine 10 (LG: 10.x).',
      target: 1,
      xpReward: 10,
      check: (game) => Array.isArray(game.shots) && game.shots.some(s => (Number(s.points ?? s.pts ?? s.ring ?? 0) || 0) >= 10.0),
      checkPhoto: (r) => Array.isArray(r.shots) && r.shots.some(s => Number(s) >= 10.0)
    }
  ];

  let state = {
    dateId: '',
    challenges: [], // Array of { id, progress, completed }
    streak: 0,
    toolboxDroppedForDate: ''
  };
  let uiRefreshTimer = null;
  let initialized = false;

  function init() {
    if (initialized) {
      checkDailyReset();
      renderUI();
      return;
    }
    initialized = true;
    loadState();
    checkDailyReset();
    renderUI();
    startUIRefresh();
    notifyStateChanged('init');
  }

  function getDateId(date = new Date()) {
    return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
  }

  function parseDateIdLocal(dateId) {
    if (!dateId || typeof dateId !== 'string') return null;
    const parts = dateId.split('-');
    if (parts.length !== 3) return null;
    const y = Number(parts[0]);
    const m = Number(parts[1]);
    const d = Number(parts[2]);
    if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) return null;
    const dt = new Date(y, m - 1, d);
    if (dt.getFullYear() !== y || (dt.getMonth() + 1) !== m || dt.getDate() !== d) return null;
    return dt;
  }

  /**
   * Holt die User-ID für personalisierte Challenges.
   * Reihenfolge: Supabase Session > StorageManager > G.username > stabile lokale ID.
   */
  function getUserId() {
    try {
      if (window.SupabaseSession && window.SupabaseSession.user && window.SupabaseSession.user.id) {
        return window.SupabaseSession.user.id;
      }
      if (typeof StorageManager !== 'undefined' && StorageManager.getRaw) {
        const storedId = StorageManager.getRaw('userId');
        if (storedId) return storedId;
      }
      if (typeof G !== 'undefined' && G.username) {
        return G.username;
      }
      let anonId = localStorage.getItem('sd_anonymous_id');
      if (!anonId) {
        anonId = 'anon_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now();
        localStorage.setItem('sd_anonymous_id', anonId);
      }
      return anonId;
    } catch (e) {
      console.warn('⚠️ Fehler beim Holen der User-ID:', e);
    }
    return 'fallback';
  }

  function formatResetCountdown() {
    const now = new Date();
    const next = new Date(now);
    next.setHours(24, 0, 0, 0); // local midnight
    const ms = Math.max(0, next.getTime() - now.getTime());
    const totalMins = Math.floor(ms / 60000);
    const h = Math.floor(totalMins / 60);
    const m = totalMins % 60;
    return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
  }

  function startUIRefresh() {
    if (uiRefreshTimer) return;
    
    // Prüfe jede Minute auf neuen Tag (für echten 0:00 Reset)
    let lastCheckedDate = getDateId();
    
    uiRefreshTimer = setInterval(() => {
      const currentDate = getDateId();
      
      // Wenn Datum gewechselt hat → automatischer Reset um 0:00
      if (currentDate !== lastCheckedDate) {
        console.log('🔄 Midnight Reset: Neue Daily Challenges geladen');
        const userId = getUserId();
        const previousIds = state.challenges.map(c => c.id);
        state.dateId = currentDate;
        state.challenges = getDailyChallenges(currentDate, userId, previousIds);
        state.toolboxDroppedForDate = '';
        saveState('reset');
        lastCheckedDate = currentDate;
        
        // UI aktualisieren
        renderUI();
        if (typeof window.refreshPremiumDashboard === 'function') {
          window.refreshPremiumDashboard();
        }
        
        // Optional: Notification anzeigen
        if (Notification.permission === 'granted') {
          new Notification('🎯 Neue Daily Challenges!', {
            body: 'Deine täglichen Herausforderungen wurden aktualisiert.',
            icon: './icon-192.png'
          });
        }
      }
      
      // Regelmäßige UI-Aktualisierung (Countdown, Progress)
      checkDailyReset();
      renderUI();
      notifyStateChanged('tick');
      
      // Dashboard auch aktualisieren
      if (typeof window.refreshPremiumDashboard === 'function') {
        window.refreshPremiumDashboard();
      }
    }, 60000); // Jede Minute prüfen
  }

  function normalizeChallenge(entry) {
    const ref = getChallengeRef(entry && entry.id);
    if (!ref) return null;
    const progressRaw = Number(entry && entry.progress);
    const progress = Number.isFinite(progressRaw) ? Math.max(0, Math.min(ref.target, Math.floor(progressRaw))) : 0;
    const completed = !!entry && !!entry.completed;
    
    // Belohnung immer als feste XP (5–25). Alte Truhen-/Kisten-Stände werden migriert.
    const baseXp = Math.max(5, Math.min(25, Number(ref.xpReward) || 10));
    const rawReward = entry && entry.reward;
    let reward;
    if (rawReward && rawReward.type === 'xp' && Number.isFinite(Number(rawReward.amount))) {
      reward = { type: 'xp', amount: Math.max(5, Math.min(25, Math.round(Number(rawReward.amount)))) };
    } else {
      reward = { type: 'xp', amount: baseXp };
    }
    
    return {
      id: ref.id,
      progress,
      completed: completed || progress >= ref.target,
      reward
    };
  }

  function normalizeState(raw) {
    const normalized = {
      dateId: '',
      challenges: [],
      streak: 0,
      toolboxDroppedForDate: ''
    };

    if (!raw || typeof raw !== 'object') return normalized;

    normalized.dateId = typeof raw.dateId === 'string' ? raw.dateId : '';
    normalized.streak = Math.max(0, Number(raw.streak) || 0);
    normalized.toolboxDroppedForDate = typeof raw.toolboxDroppedForDate === 'string' ? raw.toolboxDroppedForDate : '';

    if (Array.isArray(raw.challenges)) {
      normalized.challenges = raw.challenges
        .map(normalizeChallenge)
        .filter(Boolean)
        .slice(0, 3);
    }

    return normalized;
  }

  function getQuestDifficulty(challenge) {
    return challenge && challenge.difficulty ? challenge.difficulty : 'medium';
  }

  function createDailyRng(dateId) {
    let hash = 0;
    for (let i = 0; i < dateId.length; i++) {
      hash = ((hash << 5) - hash) + dateId.charCodeAt(i);
      hash |= 0;
    }
    let stateSeed = (Math.abs(hash) >>> 0) || 1;
    return function nextRandom() {
      stateSeed = (stateSeed * 1664525 + 1013904223) >>> 0;
      return stateSeed / 4294967296;
    };
  }

  function pickFromPool(pool, rng, predicate) {
    const candidates = [];
    for (let i = 0; i < pool.length; i++) {
      if (predicate(pool[i])) candidates.push(i);
    }
    if (candidates.length === 0) return null;
    const selectedCandidate = candidates[Math.floor(rng() * candidates.length)];
    return pool.splice(selectedCandidate, 1)[0];
  }

  function getDailyChallenges(dateId, userId = '', excludeIds = []) {
    // User-spezifischer Seed: Datum + User-ID = persönliche Challenges
    const userSeed = dateId + '_' + (userId || 'global');
    const rng = createDailyRng(userSeed);
    const excluded = new Set(Array.isArray(excludeIds) ? excludeIds : []);
    const pool = CHALLENGES.filter(challenge => !excluded.has(challenge.id));
    const selected = [];
    let hardCount = 0;

    // Ausgewogene Muster: meist easy+medium, nur selten ein harter Slot
    const patterns = [
      ['easy', 'easy', 'medium'],
      ['easy', 'medium', 'medium'],
      ['easy', 'medium', 'hard']
    ];
    const roll = rng();
    const pattern = roll < 0.45
      ? patterns[0]
      : roll < 0.85
        ? patterns[1]
        : patterns[2];

    const fallbacks = {
      easy: ['easy', 'medium', 'hard'],
      medium: ['medium', 'easy', 'hard'],
      hard: ['hard', 'medium', 'easy']
    };

    const takeTier = (tier) => {
      const picked = pickFromPool(pool, rng, (q) => {
        const qTier = getQuestDifficulty(q);
        if (qTier !== tier) return false;
        if (qTier === 'hard' && hardCount >= 1) return false;
        return true;
      });
      if (picked && getQuestDifficulty(picked) === 'hard') hardCount++;
      return picked;
    };

    const addPickedChallenge = (challenge) => {
      if (!challenge) return;
      // Belohnung: fester XP-Wert der Challenge (5–25 XP, keine Truhen)
      const amount = Math.max(5, Math.min(25, Number(challenge.xpReward) || 10));
      selected.push({
        id: challenge.id,
        progress: 0,
        completed: false,
        reward: { type: 'xp', amount: amount }
      });
    };

    for (const desiredTier of pattern) {
      let picked = null;
      for (const tier of fallbacks[desiredTier]) {
        picked = takeTier(tier);
        if (picked) break;
      }
      addPickedChallenge(picked);
    }

    while (selected.length < 3 && pool.length > 0) {
      let picked = null;
      for (const tier of ['easy', 'medium', 'hard']) {
        picked = takeTier(tier);
        if (picked) break;
      }
      if (!picked) {
        picked = pool.splice(Math.floor(rng() * pool.length), 1)[0];
      }
      addPickedChallenge(picked);
    }

    return selected.slice(0, 3);
  }

  function loadState() {
    try {
      const stored = localStorage.getItem('sd_daily_challenge');
      if (stored) {
        let parsed = JSON.parse(stored);
        if (parsed.challengeId !== undefined) {
           // Migration old state
           state.dateId = ''; 
        } else {
           state = normalizeState(parsed);
        }
      }
    } catch (e) {
      console.warn("Could not load daily challenge state", e);
      state = normalizeState(null);
    }
  }

  function notifyStateChanged(reason) {
    try {
      window.dispatchEvent(new CustomEvent('dailyChallengesUpdated', {
        detail: { reason: reason || 'update', dateId: state.dateId }
      }));
    } catch (_e) { /* noop */ }
  }

  function saveState(reason) {
    try {
      localStorage.setItem('sd_daily_challenge', JSON.stringify(state));
    } catch (e) {
      console.warn("Could not save daily challenge state", e);
    }
    notifyStateChanged(reason || 'update');
  }

  function checkDailyReset() {
    const today = getDateId();
    const hasValidTodayChallenges = Array.isArray(state.challenges)
      && state.challenges.length === 3
      && state.challenges.every(c => !!getChallengeRef(c.id));

    if (state.dateId === today && !hasValidTodayChallenges) {
      const userId = getUserId();
      state.challenges = getDailyChallenges(today, userId);
      saveState('repair');
      return;
    }

    if (state.dateId !== today) {
      // Neuen Tag prüfen - Streak logik
      const userId = getUserId();
      const previousIds = state.challenges.map(c => c.id);
      const prevIsYesterday = isYesterday(state.dateId, today);
      const allCompletedYesterday = state.challenges && state.challenges.length === 3 && state.challenges.every(c => c.completed);

      if (allCompletedYesterday && prevIsYesterday) {
        // Vortag vollständig erfüllt und direkt aufeinanderfolgend → Streak +1
        state.streak += 1;
      } else if (allCompletedYesterday && !prevIsYesterday) {
        // Vortag erfüllt, aber Tage übersprungen → Streak startet neu bei 1
        state.streak = 1;
      } else {
        // Vortag nicht vollständig erfüllt → Streak zurücksetzen
        state.streak = 0;
      }

      state.dateId = today;
      state.challenges = getDailyChallenges(today, userId, previousIds);
      saveState('reset');
    }
  }

  function isYesterday(pastDateStr, todayStr) {
    const past = parseDateIdLocal(pastDateStr);
    const today = parseDateIdLocal(todayStr);
    if (!past || !today) return false;
    const pastUTC = Date.UTC(past.getFullYear(), past.getMonth(), past.getDate());
    const todayUTC = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
    const diff = Math.round((todayUTC - pastUTC) / (1000 * 60 * 60 * 24));
    return diff === 1;
  }

  function getChallengeRef(id) {
    return CHALLENGES.find(c => c.id === id);
  }

  function getPreviewState() {
    if (!initialized) init();
    else checkDailyReset();

    return {
      dateId: state.dateId,
      streak: state.streak,
      resetCountdown: formatResetCountdown(),
      challenges: state.challenges.map(entry => {
        const ref = getChallengeRef(entry.id);
        if (!ref) return null;
        const rewardAmount = entry.reward && Number.isFinite(Number(entry.reward.amount))
          ? Number(entry.reward.amount)
          : Number(ref.xpReward) || 10;
        return {
          id: entry.id,
          description: ref.desc,
          type: ref.type,
          difficulty: ref.difficulty,
          target: ref.target,
          progress: entry.progress,
          completed: entry.completed,
          xpReward: rewardAmount
        };
      }).filter(Boolean)
    };
  }

  function trackGame(gameData, statsData) {
    checkDailyReset();

    let updatedAny = false;
    let anyNewlyCompleted = false;

    state.challenges.forEach(c => {
      if (c.completed) return;
      const ref = getChallengeRef(c.id);
      if (!ref || typeof ref.check !== 'function') return;
      if (!ref.check(gameData, statsData)) return;

      if (ref.type === 'play_count') {
        // Zähl-Quest: pro passendem Duell +1
        c.progress += 1;
      } else {
        // Einmal-Quest: ein passendes Ergebnis erfüllt sie sofort
        c.progress = ref.target;
      }
      updatedAny = true;

      if (c.progress >= ref.target) {
        c.progress = ref.target;
        c.completed = true;
        anyNewlyCompleted = true;
        awardChallengeXP(c.reward ? c.reward.amount : ref.xpReward);
      }
    });

    if (updatedAny) {
      saveState('progress');
      renderUI();
    }

    if (anyNewlyCompleted) {
      checkAllCompleted();
    }
  }

  // Tesseract CDN (Fallback falls nicht von image-compare.js bereits geladen)
  var _dcTesseractPromise = null;
  function ensureTesseract() {
    if (typeof Tesseract !== 'undefined') return Promise.resolve();
    if (_dcTesseractPromise) return _dcTesseractPromise;
    // Warte auf bereits laufendes Laden (z.B. durch image-compare.js)
    var existing = document.querySelector('script[data-ic-tesseract]');
    if (existing) {
      _dcTesseractPromise = new Promise(function (resolve, reject) {
        var t = setInterval(function () {
          if (typeof Tesseract !== 'undefined') { clearInterval(t); resolve(); }
        }, 150);
        setTimeout(function () { clearInterval(t); reject(new Error('Tesseract timeout')); }, 20000);
      });
      return _dcTesseractPromise;
    }
    _dcTesseractPromise = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
      s.onload = function () { resolve(); };
      s.onerror = function () { reject(new Error('Tesseract konnte nicht geladen werden')); };
      document.head.appendChild(s);
    });
    return _dcTesseractPromise;
  }

  function parseTargetOCR(text) {
    var norm = text.replace(/,/g, '.').replace(/\s+/g, ' ');
    var up = norm.toUpperCase();

    // ─── 1. Waffe aus Text ───
    var weapon = 'unknown';
    if (/\bKK\b|KLEINKALIBER/.test(up)) weapon = 'kk';
    else if (/\bLG\b|LUFTGEWEHR/.test(up)) weapon = 'lg';

    // ─── 2. KK-Disziplin erkennen (50m / 100m / 3×20) ───
    var discipline = 'unknown';
    if (weapon === 'kk' || weapon === 'unknown') {
      if (/3\s*[xX×]\s*20|DREISTELLUNG|3X20/.test(up))  discipline = 'kk3x20';
      else if (/\b100\s*M\b/.test(up))                    discipline = 'kk100';
      else if (/\b50\s*M\b/.test(up))                     discipline = 'kk50';
    }

    // ─── 3. Schussanzahl aus Text ───
    var shotCount = 0;
    var scM = norm.match(/\b(10|20|40|60)\s*Schuss/i);
    if (scM) shotCount = parseInt(scM[1], 10);

    // ─── 4. Gesamtergebnis via deutschem Label (höchste Priorität) ───
    var totalScore = 0;
    var labelM = norm.match(/(?:Gesamt|Ges\.|Ergebnis|Total|Summe|Endresultat|Result)[.\s:]+(\d{2,3}(?:\.\d)?)/i);
    if (labelM) totalScore = parseFloat(labelM[1]);

    // ─── 5. KK 3×20: Positions-Serien (Liegend / Kniend / Stehend) ───
    var positions = {};
    if (discipline === 'kk3x20' || /LIEGEND|KNIEND|STEHEND/.test(up)) {
      var lieM = norm.match(/Liegend[.\s:]+(\d{1,3})/i);
      var kniM = norm.match(/Kni[eë]?nd[.\s:]+(\d{1,3})/i);
      var steM = norm.match(/Stehend[.\s:]+(\d{1,3})/i);
      if (lieM) positions.prone    = parseInt(lieM[1], 10);
      if (kniM) positions.kneeling = parseInt(kniM[1], 10);
      if (steM) positions.standing = parseInt(steM[1], 10);
      discipline = 'kk3x20';
      if (weapon === 'unknown') weapon = 'kk';

      // Total aus Positionen berechnen wenn kein Label vorhanden
      var posKeys = Object.keys(positions);
      if (totalScore === 0 && posKeys.length > 0) {
        totalScore = posKeys.reduce(function (s, k) { return s + positions[k]; }, 0);
      }
      shotCount = shotCount || 60;
    }

    // ─── 6. LG-Disziplin erkennen ───
    if (weapon === 'lg' && discipline === 'unknown') {
      // Wird unten aus Gesamtergebnis abgeleitet
    }

    // ─── 7. Alle Zahlen sammeln ───
    var allNums = [];
    var numRe = /\b(\d{1,3}(?:\.\d)?)\b/g, nm;
    while ((nm = numRe.exec(norm)) !== null) {
      var n = parseFloat(nm[1]);
      if (!isNaN(n)) allNums.push(n);
    }

    // ─── 8. Einzelschüsse ───
    // LG: Dezimalwerte "X.Y" zwischen 0.0 und 10.9
    var lgShotRe = /\b(10\.[0-9]|[0-9]\.[0-9])\b/g, sm;
    var lgShots = [];
    while ((sm = lgShotRe.exec(norm)) !== null) lgShots.push(parseFloat(sm[1]));

    // KK: Ganzzahlen 1–10 (Einzelschüsse)
    // Serien-Teilergebnisse (z.B. Liegend 195) herausfiltern
    var posVals = Object.keys(positions).map(function (k) { return positions[k]; });
    var kkShots = allNums.filter(function (n) {
      return n >= 1 && n <= 10 && n % 1 === 0 && posVals.indexOf(n) === -1;
    });

    // ─── 9. Gesamtergebnis aus Bereich wenn Label fehlt ───
    if (totalScore === 0) {
      var lg60c = allNums.filter(function (n) { return n >= 450 && n <= 654; });
      var lg40c = allNums.filter(function (n) { return n >= 300 && n < 450; });
      var kk60c = allNums.filter(function (n) { return n >= 400 && n <= 600 && n % 1 === 0; });
      var lg10c = allNums.filter(function (n) { return n >= 60 && n < 110 && n % 1 !== 0; });
      var kk10c = allNums.filter(function (n) { return n >= 40 && n <= 100 && n % 1 === 0; });

      var candidates;
      if (weapon === 'kk')      candidates = kk60c.concat(kk10c);
      else if (weapon === 'lg') candidates = lg60c.concat(lg40c).concat(lg10c);
      else                      candidates = lg60c.concat(lg40c).concat(kk60c).concat(lg10c).concat(kk10c);

      if (candidates.length > 0) {
        totalScore = Math.max.apply(null, candidates);
        if (weapon === 'unknown') {
          if (lg60c.indexOf(totalScore) !== -1)     { weapon = 'lg'; discipline = 'lg60'; shotCount = shotCount || 60; }
          else if (lg40c.indexOf(totalScore) !== -1) { weapon = 'lg'; discipline = 'lg40'; shotCount = shotCount || 40; }
          else if (kk60c.indexOf(totalScore) !== -1) { weapon = 'kk'; shotCount = shotCount || 60; }
          else if (lg10c.indexOf(totalScore) !== -1) { weapon = 'lg'; shotCount = shotCount || 10; }
          else if (kk10c.indexOf(totalScore) !== -1) { weapon = 'kk'; shotCount = shotCount || 10; }
        }
      }
    } else if (shotCount === 0) {
      if (weapon === 'lg') {
        shotCount = totalScore >= 450 ? 60 : totalScore >= 300 ? 40 : 10;
        discipline = shotCount === 60 ? 'lg60' : shotCount === 40 ? 'lg40' : 'lg10';
      } else if (weapon === 'kk') {
        shotCount = totalScore >= 400 ? 60 : 10;
      }
    }

    // ─── 10. Shots nach Waffe wählen ───
    var shots = weapon === 'kk' ? kkShots : lgShots;
    if (shotCount === 0 && shots.length > 0) shotCount = shots.length;

    // ─── 11. Konfidenz: Kreuzvalidierung Summe ↔ Gesamtergebnis ───
    var confidence = totalScore > 0 ? 0.65 : 0.2;
    if (shots.length >= 5) {
      var calcSum = parseFloat(shots.reduce(function (a, b) { return a + b; }, 0).toFixed(1));
      if (Math.abs(calcSum - totalScore) < 1.5) confidence = 0.92;
    } else if (discipline === 'kk3x20' && Object.keys(positions).length === 3) {
      confidence = 0.90; // 3 Positionen vollständig erkannt
    }

    return {
      totalScore: totalScore,
      weapon: weapon,
      discipline: discipline,  // 'kk50'|'kk100'|'kk3x20'|'lg40'|'lg60'|'lg10'|'unknown'
      shotCount: shotCount,
      shots: shots,
      positions: positions,    // { prone, kneeling, standing } nur bei kk3x20
      confidence: confidence
    };
  }

  async function submitPhoto(file) {
    await ensureTesseract();

    var worker = await Tesseract.createWorker('deu+eng');
    try {
      // PSM 6 = gleichmäßiger Textblock (gut für Ausdruck), PSM 11 = Sparse (gut für Scheibenfoto)
      await worker.setParameters({ tessedit_pageseg_mode: '6' });
      var rec = await worker.recognize(file);
      var result = parseTargetOCR((rec.data && rec.data.text) || '');

      // Challenges gegen OCR-Ergebnis prüfen
      checkDailyReset();
      var anyNewlyCompleted = false;

      state.challenges.forEach(function (c) {
        if (c.completed) return;
        var ref = getChallengeRef(c.id);
        if (!ref || typeof ref.checkPhoto !== 'function') return;
        if (!ref.checkPhoto(result)) return;

        if (ref.type === 'play_count') {
          c.progress += 1;
        } else {
          c.progress = ref.target;
        }
        if (c.progress < ref.target) return;

        c.progress = ref.target;
        c.completed = true;
        anyNewlyCompleted = true;
        awardChallengeXP(c.reward ? c.reward.amount : (ref.xpReward || 10));
      });

      saveState('progress');
      renderUI();
      if (anyNewlyCompleted) checkAllCompleted();

      return result;
    } finally {
      await worker.terminate();
    }
  }

  function openPhotoModal() {
    var existing = document.querySelector('.dc-photo-modal');
    if (existing) existing.remove();

    var modal = document.createElement('div');
    modal.className = 'dc-photo-modal';
    modal.innerHTML = [
      '<div class="dc-photo-content">',
        '<button class="dcb-close dc-photo-close" onclick="this.closest(\'.dc-photo-modal\').remove()">✕</button>',
        '<div class="dc-photo-title">📷 Scheibenfoto einreichen</div>',
        '<div class="dc-photo-sub">Mach ein Foto deiner Scheibe — die Texterkennung liest dein Ergebnis und wertet alle passenden Challenges aus.</div>',
        '<input type="file" accept="image/*" capture="environment" id="dcPhotoInput" style="display:none;">',
        '<label for="dcPhotoInput" class="duo-photo-btn">📷 Kamera öffnen / Foto wählen</label>',
        '<div id="dcPhotoStatus" style="margin-top:12px;color:#8aa3b0;font-size:0.85rem;min-height:20px;"></div>',
      '</div>'
    ].join('');
    document.body.appendChild(modal);

    modal.querySelector('#dcPhotoInput').addEventListener('change', async function (e) {
      var file = e.target.files && e.target.files[0];
      if (!file) return;
      var status = modal.querySelector('#dcPhotoStatus');
      status.textContent = '⏳ Scheibe wird analysiert…';
      try {
        var result = await submitPhoto(file);
        var weaponLabel = result.weapon === 'lg' ? 'LG' : result.weapon === 'kk' ? 'KK' : '?';
        var scoreText = result.totalScore > 0 ? result.totalScore + ' Ringe' : 'Ergebnis nicht erkannt';
        status.innerHTML = '✅ ' + scoreText + ' (' + weaponLabel + ')';
        setTimeout(function () { modal.remove(); }, 2800);
      } catch (err) {
        status.innerHTML = '❌ Fehler: ' + err.message;
      }
    });

    modal.addEventListener('click', function (e) {
      if (e.target === modal) modal.remove();
    });
  }

  function awardChallengeXP(amount) {
    const xp = Math.max(0, Math.floor(Number(amount) || 0));
    if (xp <= 0) return;
    if (typeof awardFlatXP === 'function') {
      awardFlatXP(xp);
      if (typeof showXPPop === 'function') {
        setTimeout(() => showXPPop(xp + ' XP'), 800);
      }
    } else if (typeof G !== 'undefined' && G) {
      // Fallback ohne xp-system.js: XP direkt gutschreiben
      G.xp = (Number(G.xp) || 0) + xp;
      if (typeof saveXP === 'function') saveXP();
      if (typeof updateSchuetzenpass === 'function') updateSchuetzenpass();
    }
  }

  function checkAllCompleted() {
    const allCompleted = state.challenges.length === 3 && state.challenges.every(c => c.completed);
    if (allCompleted) {
      showAllCompletedBanner();
    } else {
      showSingleCompletionBanner();
    }
  }

  function showSingleCompletionBanner() {
    const el = document.createElement('div');
    el.className = 'daily-completion-banner pop-in';
    el.innerHTML = `
      <div class="dcb-icon">🎯</div>
      <div class="dcb-content">
        <div class="dcb-title">Mission erfüllt! 🎉</div>
        <div class="dcb-sub">Eine Tages-Herausforderung abgeschlossen.</div>
      </div>
      <button class="dcb-close" onclick="this.parentElement.remove()">✕</button>
    `;
    document.body.appendChild(el);
    setTimeout(() => { if (el.parentElement) el.remove(); }, 3000);
  }

  function showAllCompletedBanner() {
    const el = document.createElement('div');
    el.className = 'daily-completion-banner pop-in';
    el.innerHTML = `
      <div class="dcb-icon">🏆</div>
      <div class="dcb-content">
        <div class="dcb-title">Alle Tagesmissionen erfüllt! 🎉</div>
        <div class="dcb-sub">Stark! Morgen warten neue Challenges auf dich.</div>
      </div>
      <button class="dcb-close" onclick="this.parentElement.remove()">✕</button>
    `;
    document.body.appendChild(el);
    setTimeout(() => { if (el.parentElement) el.remove(); }, 3500);
  }

  function renderUI() {
    let container = document.getElementById('dailyChallengeUI');
    if (!container) {
      const distInfo = document.getElementById('distInfo');
      if (distInfo && distInfo.parentNode) {
        container = document.createElement('div');
        container.id = 'dailyChallengeUI';
        // Remove standard card classes to allow raw duo styling wrapper
        container.style.marginTop = '20px';
        distInfo.parentNode.insertBefore(container, distInfo.nextSibling);
      } else {
        return;
      }
    }

    const allCompleted = state.challenges.length === 3 && state.challenges.every(c => c.completed);

    let html = `
      <div style="color: #1cb0f6; font-size: 1.2rem; font-weight: 800; text-align: center; margin-bottom: 15px;">⭐ Tages-Challenges</div>
      <div style="color: #8aa3b0; font-size: 0.82rem; text-align: center; margin-top: -10px; margin-bottom: 14px;">Neuer Satz in ${formatResetCountdown()} h · zählt aus deinem Ergebnis/Scheibenfoto</div>
      <div class="duo-quests-card">
    `;

    state.challenges.forEach((c, index) => {
       const ref = getChallengeRef(c.id);
       if (!ref) return;

       const isLast = (index === state.challenges.length - 1);
       const pct = Math.min(100, Math.floor((c.progress / ref.target) * 100));
       const isComplete = c.completed;

       const rewardAmount = (c.reward && Number.isFinite(Number(c.reward.amount)))
         ? Number(c.reward.amount)
         : (ref.xpReward || 10);
       const rewardDisplay = `<div class="duo-quest-reward xp-reward" title="${rewardAmount} XP">+${rewardAmount} XP</div>`;

       html += `
         <div class="duo-quest-row ${isLast ? 'no-border' : ''}">
            <div class="duo-quest-title">${isComplete ? '✅ ' : ''}${ref.desc}</div>
            <div class="duo-quest-progress-wrap">
               <div class="duo-quest-bar-bg">
                  <div class="duo-quest-bar-fill" style="width: ${pct}%">
                     ${(c.progress > 0 || isComplete) ? `<span class="duo-quest-bar-text">${c.progress} / ${ref.target}</span>` : ''}
                  </div>
                  ${(c.progress === 0 && !isComplete) ? `<span class="duo-quest-bar-text empty">${c.progress} / ${ref.target}</span>` : ''}
               </div>
               <div class="duo-quest-reward-container">
                  ${rewardDisplay}
               </div>
            </div>
         </div>
       `;
    });

    html += `</div>`; // End of duo-quests-card

    // Streak Card
    html += `
      <div class="duo-streak-card">
         <div class="duo-streak-info">
            <div class="duo-streak-title">🔥 Tages-Streak</div>
            <div class="duo-streak-count" style="color: #1cb0f6; font-size: 1.1rem; font-weight: 800;">${state.streak} <span style="font-size:0.9rem; color:#888;">Tage</span></div>
         </div>
         <div class="duo-streak-icon" style="font-size: 2.2rem;">📅</div>
      </div>
    `;

    if (allCompleted) {
      html += `<button class="duo-open-btn disabled" disabled>✅ ALLE MISSIONEN ERFÜLLT</button>`;
    }

    html += `<button class="duo-photo-btn" onclick="DailyChallenge.openPhotoModal()">📷 Scheibenfoto einreichen</button>`;

    container.innerHTML = html;
  }

  return {
    init,
    trackGame,
    openPhotoModal,
    getState: () => state,
    getPreviewState,
    getResetCountdown: formatResetCountdown,
    getChallengeRef
  };
})();

if (typeof window !== 'undefined') {
  window.DailyChallenge = DailyChallenge;
}
