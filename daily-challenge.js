/**
 * Daily Challenge System
 * Tägliche Herausforderungen für fokussiertes, zielgerichtetes Spielen.
 */

const DailyChallenge = (function () {
  'use strict';

  // Pool an Herausforderungen
  const CHALLENGES = [
    {
      id: 'win_2_real',
      type: 'win',
      difficulty: 'medium',
      desc: 'Gewinne 2 Duelle auf Schwierigkeit "Mittel" oder höher.',
      target: 2,
      xpReward: 30,
      check: (game, stats) => game.result === 'win' && (game.difficulty === 'real' || game.difficulty === 'hard' || game.difficulty === 'elite')
    },
    {
      id: 'play_1_kk',
      type: 'play',
      difficulty: 'easy',
      desc: 'Spiele mindestens ein Duell mit dem Kleinkaliber (KK).',
      target: 1,
      xpReward: 25,
      check: (game, stats) => game.weapon === 'kk'
    },
    {
      id: 'score_above_9',
      type: 'score_avg',
      difficulty: 'hard',
      desc: 'Erreiche in einem Duell einen Ringdurchschnitt von mind. 9.0',
      target: 1,
      xpReward: 35,
      check: (game, stats) => {
        if (!game.shots || game.shots.length === 0) return false;
        const points = game.shots.map(s => Number(s.points ?? s.pts ?? s.ring ?? 0) || 0);
        const sum = points.reduce((a, b) => a + b, 0);
        return (sum / points.length) >= 9.0;
      }
    },
    {
      id: 'win_1_elite',
      type: 'win',
      difficulty: 'hard',
      desc: 'Gewinne 1 Duell auf Schwierigkeit "Elite" oder "Profi".',
      target: 1,
      xpReward: 50,
      check: (game, stats) => game.result === 'win' && (game.difficulty === 'hard' || game.difficulty === 'elite')
    },
    {
      id: 'play_2_lg',
      type: 'play',
      difficulty: 'easy',
      desc: 'Absolviere 2 Duelle mit dem Luftgewehr.',
      target: 2,
      xpReward: 30,
      check: (game, stats) => game.weapon === 'lg'
    },
    {
      id: 'perfect_shot',
      type: 'shot',
      difficulty: 'hard',
      desc: 'Schieße im Duell mindestens eine 10.9 (oder 10 fürs KK).',
      target: 1,
      xpReward: 40,
      check: (game, stats) => {
        if (!Array.isArray(game.shots) || game.shots.length === 0) return false;
        return game.shots.some(s => {
          const points = Number(s.points ?? s.pts ?? s.ring ?? 0) || 0;
          const ring = Number.isFinite(s.ring) ? Number(s.ring) : Math.floor(points);
          return points >= 10.9 || (game.weapon === 'kk' && ring >= 10);
        });
      }
    },
    {
      id: 'consistency_80',
      type: 'consistency',
      difficulty: 'medium',
      desc: 'Erreiche eine Konstanz von mind. 80% in einem Duell.',
      target: 1,
      xpReward: 45,
      check: (game, stats) => (game.consistency || 0) >= 80
    },
    {
      id: 'total_shots_40',
      type: 'shots_count',
      difficulty: 'medium',
      desc: 'Schieße insgesamt 40 Mal in Duellen.',
      target: 40,
      xpReward: 50,
      check: (game, stats) => game.shots && game.shots.length > 0
    },
    // NEUE QUESTS:
    {
      id: 'play_5_games',
      type: 'play_count',
      difficulty: 'easy',
      desc: 'Spiele heute 5 Duelle (beliebige Disziplin).',
      target: 5,
      xpReward: 35,
      check: (game, stats) => true // Progress wird in trackGame addiert
    },
    {
      id: 'hit_5_tens',
      type: 'tens_count',
      difficulty: 'medium',
      desc: 'Triff mindestens 5x eine 10.x in Duellen.',
      target: 5,
      xpReward: 45,
      check: (game, stats) => {
        if (!Array.isArray(game.shots) || game.shots.length === 0) return false;
        return game.shots.some(s => {
          const points = Number(s.points ?? s.pts ?? s.ring ?? 0) || 0;
          return points >= 10.0;
        });
      }
    },
    {
      id: 'hit_5_tens_kk',
      type: 'tens_count',
      difficulty: 'medium',
      desc: 'Triff mindestens 5x eine 10 mit dem Kleinkaliber (KK).',
      target: 5,
      xpReward: 40,
      check: (game, stats) => game.weapon === 'kk' && Array.isArray(game.shots) && game.shots.some(s => (Number(s.points ?? s.pts ?? s.ring ?? 0) || 0) >= 10.0)
    },
    {
      id: 'score_perfect_10',
      type: 'score',
      difficulty: 'hard',
      desc: 'Erreiche ein Duell-Ergebnis von mind. 100.0 Ringen.',
      target: 1,
      xpReward: 50,
      check: (game, stats) => (game.totalScore || 0) >= 100.0
    },
    {
      id: 'no_loss_streak_3',
      type: 'no_loss',
      difficulty: 'medium',
      desc: 'Verliere 3 Duelle nicht hintereinander (Sieg oder Unentschieden).',
      target: 3,
      xpReward: 40,
      check: (game, stats) => game.result !== 'lose'
    },
    {
      id: 'high_consistency_90',
      type: 'consistency',
      difficulty: 'hard',
      desc: 'Erreiche eine Konstanz von mind. 90% in einem Duell.',
      target: 1,
      xpReward: 55,
      check: (game, stats) => (game.consistency || 0) >= 90
    },
    {
      id: 'win_3_hard',
      type: 'win',
      difficulty: 'hard',
      desc: 'Gewinne 3 Duelle auf "Mittel" oder höher.',
      target: 3,
      xpReward: 50,
      check: (game, stats) => game.result === 'win' && (game.difficulty === 'real' || game.difficulty === 'hard' || game.difficulty === 'elite')
    }
  ];

  let state = {
    dateId: '',
    challenges: [], // Array of { id, progress, completed }
    streak: 0,
    toolboxDroppedForDate: ''
  };
  let uiRefreshTimer = null;

  function init() {
    loadState();
    checkDailyReset();
    renderUI();
    startUIRefresh();
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
    uiRefreshTimer = setInterval(() => {
      // keep countdown fresh and handle day rollover while app stays open
      checkDailyReset();
      renderUI();
      // Ensure the main dashboard also refreshes its daily stats
      if (typeof window.refreshPremiumDashboard === 'function') {
        window.refreshPremiumDashboard();
      }
    }, 30000);
  }

  function normalizeChallenge(entry) {
    const ref = getChallengeRef(entry && entry.id);
    if (!ref) return null;
    const progressRaw = Number(entry && entry.progress);
    const progress = Number.isFinite(progressRaw) ? Math.max(0, Math.min(ref.target, Math.floor(progressRaw))) : 0;
    const completed = !!entry && !!entry.completed;
    
    // Belohnung aus entry übernehmen oder Standard zuweisen
    let reward = entry && entry.reward;
    if (!reward) {
      // Fallback für alte Challenges ohne reward-Feld
      reward = { type: 'xp', amount: ref.xpReward || 25 };
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

  function getDailyChallenges(dateId) {
    const rng = createDailyRng(dateId);
    const pool = [...CHALLENGES];
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

    const assignReward = () => {
      // ~40% Kiste, ~60% einfache XP
      const rewardRoll = rng();
      if (rewardRoll < 0.40) {
        return { type: 'chest', amount: 100 };
      } else {
        return { type: 'xp', amount: 25 };
      }
    };

    const addPickedChallenge = (challenge) => {
      if (!challenge) return;
      selected.push({ 
        id: challenge.id, 
        progress: 0, 
        completed: false,
        reward: assignReward()
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

  function saveState() {
    try {
      localStorage.setItem('sd_daily_challenge', JSON.stringify(state));
    } catch (e) {
      console.warn("Could not save daily challenge state", e);
    }
  }

  function checkDailyReset() {
    const today = getDateId();
    const hasValidTodayChallenges = Array.isArray(state.challenges)
      && state.challenges.length === 3
      && state.challenges.every(c => !!getChallengeRef(c.id));

    if (state.dateId === today && !hasValidTodayChallenges) {
      state.challenges = getDailyChallenges(today);
      saveState();
      return;
    }

    if (state.dateId !== today) {
      // Neuen Tag prüfen - Streak logik
      const prevIsYesterday = isYesterday(state.dateId, today);
      const allCompletedYesterday = state.challenges && state.challenges.length === 3 && state.challenges.every(c => c.completed);
      const toolboxClaimedYesterday = state.toolboxDroppedForDate === state.dateId;

      if (allCompletedYesterday && prevIsYesterday && toolboxClaimedYesterday) {
        // Streak erhöhen: Vortag completed + Truhe geöffnet
        state.streak += 1;
      } else if (allCompletedYesterday && !prevIsYesterday && toolboxClaimedYesterday) {
        // Vortag completed aber Tage übersprungen → Streak auf 1 (neuer Start)
        state.streak = 1;
      } else if (!allCompletedYesterday && prevIsYesterday) {
        // Vortag nicht completed → Streak zurücksetzen
        state.streak = 0;
      } else if (!allCompletedYesterday && !prevIsYesterday && state.dateId !== '') {
        // Mehrere Tage verpasst → Streak zurücksetzen
        state.streak = 0;
      }

      state.dateId = today;
      state.challenges = getDailyChallenges(today);
      saveState();
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

  function trackGame(gameData, statsData) {
    checkDailyReset();

    let updatedAny = false;
    let anyNewlyCompleted = false;

    state.challenges.forEach(c => {
      if (c.completed) return;
      const ref = getChallengeRef(c.id);
      if (!ref) return;

      // Spezialfall: no_loss Quest - bei Verlust Progress reseten
      if (ref.type === 'no_loss' && gameData.result === 'lose') {
        c.progress = 0;
        updatedAny = true;
        return;
      }

      if (ref.check(gameData, statsData)) {
        // Progress basierend auf Quest-Typ aktualisieren
        if (ref.type === 'streak' || ref.type === 'score_avg' || ref.type === 'shot' || 
            ref.type === 'consistency' || ref.type === 'score') {
          // Einmalige Quests - sofort abgeschlossen
          c.progress = ref.target;
        } else if (ref.type === 'shots_count') {
          // Kumulativ - Schüsse addieren
          c.progress += (gameData.shots ? gameData.shots.length : 0);
        } else if (ref.type === 'tens_count') {
          // Tatsächliche Anzahl 10.x-Treffer im Spiel addieren
          const tensHit = Array.isArray(gameData.shots)
            ? gameData.shots.filter(s => (Number(s.points ?? s.pts ?? s.ring ?? 0) || 0) >= 10.0).length
            : 0;
          c.progress += tensHit;
        } else if (ref.type === 'play_count' || ref.type === 'no_loss') {
          // Spiel-basierte Quests - pro Duell +1
          c.progress += 1;
        } else if (ref.type === 'discipline_count') {
          // Disziplin-Quest - prüfe einzigartige Disziplinen
          const playedDisciplines = statsData && statsData.disciplinesToday ? new Set(statsData.disciplinesToday) : new Set([gameData.weapon]);
          c.progress = playedDisciplines.size;
        } else {
          // Standard +1 pro Duell
          c.progress += 1;
        }

        if (c.progress >= ref.target) {
          c.progress = ref.target;
          c.completed = true;
          anyNewlyCompleted = true;

          // Belohnung austeilen (festgelegt bei Generierung)
          if (c.reward && c.reward.type === 'chest') {
             awardRareChest(c.reward.amount);
          } else if (c.reward && c.reward.type === 'xp') {
             awardChallengeXP(c.reward.amount);
          } else {
             // Fallback: alte Logik mit ref.xpReward
             awardChallengeXP(ref.xpReward);
          }
        }
        updatedAny = true;
      }
    });

    if (updatedAny) {
      saveState();
      renderUI();
    }

    if (anyNewlyCompleted) {
      checkAllCompleted();
    }
  }

  function awardChallengeXP(amount) {
    if (typeof awardFlatXP === 'function') {
      awardFlatXP(amount);
      if (typeof showXPPop === 'function') {
        setTimeout(() => showXPPop(amount + ' XP'), 800);
      }
    } else if (typeof awardXP === 'function') {
      // Fallback falls awardFlatXP nicht verfügbar
      awardXP(amount);
    }
  }

  function awardRareChest(amount = 100) {
    // Rare Chest gives a lot of XP and a special message
    const xpAmount = amount;

    // Trigger Chest Animation
    const overlay = document.createElement('div');
    overlay.className = 'toolbox-overlay rare-drop';
    overlay.style.zIndex = '10001';
    overlay.innerHTML = `
      <div class="toolbox-container pop-in">
         <div class="toolbox-glow gold"></div>
         <div id="chestRareTitle" style="color: gold; font-weight: 800; font-size: 1.5rem; text-shadow: 0 0 10px rgba(255,215,0,0.5); margin-bottom: 20px; opacity: 0; transform: translateY(-20px); transition: all 0.5s;">SELTERER FUND!</div>
         <div id="chestImg" class="toolbox-img chest-placeholder shake" style="width:150px;height:150px;margin:0 auto;background:linear-gradient(135deg,#8B6914,#C5961F);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:3.5rem;box-shadow:0 4px 20px rgba(139,105,20,0.4);">🎁</div>
         <div id="chestRareXP" class="toolbox-open-text" style="opacity: 0; transform: scale(0.5); transition: all 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275); margin-top: 20px;">+${xpAmount} XP Bonus!</div>
      </div>
    `;
    document.body.appendChild(overlay);

    const chestImg = overlay.querySelector('#chestImg');
    const title = overlay.querySelector('#chestRareTitle');
    const xpText = overlay.querySelector('#chestRareXP');

    // Step 1: Shake (already started by class)
    if (typeof Sounds !== 'undefined') {
      Sounds.chestShake();
      setTimeout(() => Sounds.chestShake(), 400);
      setTimeout(() => Sounds.chestShake(), 800);
    }

    // Step 2: Open after 1.2s shake
    setTimeout(() => {
      chestImg.classList.remove('shake');
      chestImg.classList.add('open');
      title.style.opacity = '1';
      title.style.transform = 'translateY(0)';
      
      if (typeof Sounds !== 'undefined') {
        Sounds.chestOpen();
      }
      
      spawnChestParticles(overlay);
      if (typeof triggerHaptic === 'function') triggerHaptic();

      setTimeout(() => {
        xpText.style.opacity = '1';
        xpText.style.transform = 'scale(1)';
        if (typeof awardFlatXP === 'function') {
          awardFlatXP(amount);
        } else if (typeof awardXP === 'function') {
          awardXP(amount);
        }
      }, 300);
    }, 1200);

    // Step 3: Auto-close
    setTimeout(() => {
       overlay.style.opacity = '0';
       setTimeout(() => overlay.remove(), 400);
    }, 5000);

    overlay.addEventListener('click', () => {
      overlay.style.opacity = '0';
      setTimeout(() => overlay.remove(), 400); 
    });
  }

  function spawnChestParticles(parent) {
    const count = 30;
    const container = parent.querySelector('.toolbox-container');
    if (!container) return;
    
    for (let i = 0; i < count; i++) {
      const p = document.createElement('div');
      p.className = 'chest-particle';
      const angle = Math.random() * Math.PI * 2;
      const dist = 50 + Math.random() * 150;
      const dx = Math.cos(angle) * dist;
      const dy = Math.sin(angle) * dist;
      p.style.setProperty('--dx', `${dx}px`);
      p.style.setProperty('--dy', `${dy}px`);
      p.style.left = '50%';
      p.style.top = '50%';
      container.appendChild(p);
      setTimeout(() => p.remove(), 1000);
    }
  }

  function checkAllCompleted() {
    // Only show single completion banner, manual open for final chest
    const allCompleted = state.challenges.length === 3 && state.challenges.every(c => c.completed);
    if (!allCompleted) {
      showSingleCompletionBanner();
    } else {
      // Alle Missionen erfüllt -> Automatisch die große Truhe öffnen
      setTimeout(() => openFinalChest(), 1500);
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

  function openFinalChest() {
    const allCompleted = state.challenges.length === 3 && state.challenges.every(c => c.completed);
    if (!allCompleted || state.toolboxDroppedForDate === state.dateId) return;

    // Track as claimed (Streak-Erhöhung erfolgt in checkDailyReset beim nächsten Tag)
    state.toolboxDroppedForDate = state.dateId;
    saveState();
    renderUI();

    const extraXP = 200;
    
    const overlay = document.createElement('div');
    overlay.className = 'toolbox-overlay rare-drop'; // Reuse styles
    overlay.style.zIndex = '10001';
    overlay.innerHTML = `
      <div class="toolbox-container pop-in">
         <div class="toolbox-glow gold"></div>
         <div id="finalChestTitle" style="color: gold; font-weight: 800; font-size: 1.8rem; text-shadow: 0 0 15px gold; margin-bottom: 20px; opacity: 0; transform: translateY(-20px); transition: all 0.5s;">ALLE MISSIONEN ERFÜLLT!</div>
         <img src="gold_toolbox.png" id="finalChestImg" class="toolbox-img shake" alt="Goldkiste" style="width: 180px;"/>
         <div id="finalChestXP" class="toolbox-open-text" style="opacity: 0; transform: scale(0.5); transition: all 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275); margin-top: 20px;">+${extraXP} XP Bonus!</div>
         <div id="finalChestStreak" style="opacity: 0; color: #1cb0f6; font-weight: 800; margin-top: 10px; transition: all 0.5s;">🔥 Aktueller Streak: ${state.streak} Tage</div>
      </div>
    `;
    document.body.appendChild(overlay);

    const chestImg = overlay.querySelector('#finalChestImg');
    const title = overlay.querySelector('#finalChestTitle');
    const xpText = overlay.querySelector('#finalChestXP');
    const streakText = overlay.querySelector('#finalChestStreak');

    if (typeof Sounds !== 'undefined') {
      Sounds.chestShake();
      setTimeout(() => Sounds.chestShake(), 500);
      setTimeout(() => Sounds.chestShake(), 1000);
    }

    setTimeout(() => {
      chestImg.classList.remove('shake');
      chestImg.classList.add('open');
      title.style.opacity = '1';
      title.style.transform = 'translateY(0)';
      
      if (typeof Sounds !== 'undefined') {
        Sounds.levelUp(); // More epic sound for final chest
      }
      
      spawnChestParticles(overlay);
      if (typeof spawnConfetti === 'function') spawnConfetti();
      if (typeof triggerHaptic === 'function') triggerHaptic();

      setTimeout(() => {
        xpText.style.opacity = '1';
        xpText.style.transform = 'scale(1)';
        streakText.style.opacity = '1';
        if (typeof awardFlatXP === 'function') {
          awardFlatXP(extraXP);
        } else if (typeof awardXP === 'function') {
          awardXP(extraXP);
        }
      }, 300);
    }, 1500);

    setTimeout(() => {
       overlay.style.opacity = '0';
       setTimeout(() => overlay.remove(), 400);
    }, 6000);

    overlay.addEventListener('click', () => {
      overlay.style.opacity = '0';
      setTimeout(() => overlay.remove(), 400); 
    });
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
    const claimed = state.toolboxDroppedForDate === state.dateId;

    let html = `
      <div style="color: #1cb0f6; font-size: 1.2rem; font-weight: 800; text-align: center; margin-bottom: 15px;">⭐ Missionen</div>
      <div style="color: #8aa3b0; font-size: 0.82rem; text-align: center; margin-top: -10px; margin-bottom: 14px;">Neuer Satz in ${formatResetCountdown()} h</div>
      <div class="duo-quests-card">
    `;

    state.challenges.forEach((c, index) => {
       const ref = getChallengeRef(c.id);
       if (!ref) return;

       const isLast = (index === 2);
       // CSS placeholder statt fehlender Bilder
       const chestStyle = index === 0
         ? 'background:linear-gradient(135deg,#8B6914,#C5961F)'
         : (index === 1 ? 'background:linear-gradient(135deg,#8899AA,#B0C4DE)' : 'background:linear-gradient(135deg,#DAA520,#FFD700)');
       const chestEmoji = ['🪵', '🥈', '🥇'][index] || '🎁';

       const pct = Math.min(100, Math.floor((c.progress / ref.target) * 100));
       const isComplete = c.completed;

       // Belohnungs-Anzeige
       let rewardDisplay = '';
       if (c.reward) {
         if (c.reward.type === 'chest') {
           rewardDisplay = `<div class="duo-quest-reward chest-reward" title="Kiste: ${c.reward.amount} XP">🎁 <span style="font-size:0.7rem; color:#C5961F;">Kiste</span></div>`;
         } else {
           rewardDisplay = `<div class="duo-quest-reward xp-reward" title="${c.reward.amount} XP">+${c.reward.amount} XP</div>`;
         }
       }

       html += `
         <div class="duo-quest-row ${isLast ? 'no-border' : ''}">
            <div class="duo-quest-title">${ref.desc}</div>
            <div class="duo-quest-progress-wrap">
               <div class="duo-quest-bar-bg">
                  <div class="duo-quest-bar-fill" style="width: ${pct}%">
                     ${(c.progress > 0 || isComplete) ? `<span class="duo-quest-bar-text">${c.progress} / ${ref.target}</span>` : ''}
                  </div>
                  ${(c.progress === 0 && !isComplete) ? `<span class="duo-quest-bar-text empty">${c.progress} / ${ref.target}</span>` : ''}
               </div>
               <div class="duo-quest-reward-container">
                  <div class="duo-quest-chest">
                     <div class="chest-placeholder ${isComplete ? 'opened' : 'closed'}" style="${chestStyle}width:36px;height:36px;border-radius:6px;display:inline-flex;align-items:center;justify-content:center;font-size:1.1rem;box-shadow:0 2px 6px rgba(0,0,0,0.3);vertical-align:middle;">${chestEmoji}</div>
                  </div>
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
            <div class="duo-streak-title">🔥 Monats-Streak</div>
            <div class="duo-streak-count" style="color: #1cb0f6; font-size: 1.1rem; font-weight: 800;">${state.streak} <span style="font-size:0.9rem; color:#888;">Tage</span></div>
         </div>
         <div class="duo-streak-icon" style="font-size: 2.2rem;">📅</div>
      </div>
    `;

    // Button
    if (allCompleted && !claimed) {
        html += `<button class="duo-open-btn" onclick="DailyChallenge.openFinalChest()">TRUHE ÖFFNEN</button>`;
    } else if (allCompleted && claimed) {
        html += `<button class="duo-open-btn disabled" disabled>MISSIONEN ERFÜLLT</button>`;
    }

    container.innerHTML = html;
  }

  return {
    init,
    trackGame,
    openFinalChest,
    getState: () => state,
    getChallengeRef
  };
})();
