/**
 * Streak-Tracker für Schussduell
 * 
 * REGELN:
 * - Streak erhöht sich wenn man 1 Duell spielt (egal welche Disziplin/Schwierigkeit/Uhrzeit)
 * - Streak-Tage: Nur MITTWOCH, DONNERSTAG, FREITAG (Tag 3, 4, 5)
 * - Samstag, Sonntag, Montag, Dienstag = Pause-Tage (unterbrechen Streak NICHT)
 * - Verfall: Wenn man an einem gültigen Tag (Mi-Fr) kein Duell spielt → Streak weg
 * - Streak-Bonus: XP-Belohnungen bei Meilensteinen
 */

const StreakTracker = (function () {
  'use strict';

  const STORAGE_KEY = 'sd_streak_v2';

  // Streak-Belohnungen
  const STREAK_BONUSES = {
    3:   { xp: 10,   label: '🔥 Aufsteiger', color: '#ff9500' },
    5:   { xp: 25,   label: '🔥🔥 Fünf Tage', color: '#ff6b35' },
    7:   { xp: 50,   label: '🔥🔥🔥 Wochen-Serie', color: '#f06050' },
    10:  { xp: 75,   label: '🔥🔥🔥🔥 Zehn Tage', color: '#e04040' },
    14:  { xp: 100,  label: '🔥🔥🔥🔥🔥 Meister', color: '#d03030' },
    21:  { xp: 200,  label: '🔥🔥🔥🔥🔥🔥 21 Tage', color: '#c02020' },
    30:  { xp: 500,  label: '🔥🔥🔥🔥🔥🔥🔥 Legende', color: '#ffd700' },
    50:  { xp: 1000, label: '👹 Unsterblich', color: '#ff00ff' },
    100: { xp: 2500, label: '💀 Gott des Schießsports', color: '#00ffff' }
  };

  let state = {
    currentStreak: 0,
    longestStreak: 0,
    lastPlayedDate: '',       // ISO-Date des letzten Spiels
    lastPlayedTimestamp: 0,   // Vollständiger Timestamp
    totalValidDays: 0,        // Insgesamt gespielte gültige Tage
    milestonesReached: [],    // Welche Bonuses schon kassiert
    weeklyFreezes: 0,         // Streak-Freezes diese Woche
    lastFreezeResetDate: ''   // Wann zuletzt Freezes zurückgesetzt
  };

  let uiUpdateInterval = null;

  // ─── HILFSFUNKTIONEN ───

  function getNow() {
    return new Date();
  }

  function getDateId(date) {
    const d = date || getNow();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function parseDateId(dateId) {
    if (!dateId || typeof dateId !== 'string') return null;
    const parts = dateId.split('-');
    if (parts.length !== 3) return null;
    const y = Number(parts[0]);
    const m = Number(parts[1]);
    const day = Number(parts[2]);
    if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(day)) return null;
    return new Date(y, m - 1, day);
  }

  /**
   * Prüft ob der angegebene Tag ein gültiger Streak-Tag ist (Mi-Fr)
   * 0=So, 1=Mo, 2=Di, 3=Mi, 4=Do, 5=Fr, 6=Sa
   */
  function isInStreakPeriod(date) {
    const d = date || getNow();
    const dayOfWeek = d.getDay();

    // Nur Mittwoch (3), Donnerstag (4), Freitag (5)
    return dayOfWeek >= 3 && dayOfWeek <= 5;
  }

  /**
   * Gibt den nächsten gültigen Streak-Tag zurück
   * (nächster Mi-Fr)
   */
  function getNextValidStreakDay() {
    const now = getNow();
    const dayOfWeek = now.getDay();

    const next = new Date(now);
    next.setHours(0, 0, 0, 0);

    // Finne nächsten Mi-Fr Tag
    if (dayOfWeek <= 2) {
      // So-Di → nächster ist Mittwoch
      const daysUntilWed = 3 - dayOfWeek;
      next.setDate(next.getDate() + daysUntilWed);
    } else if (dayOfWeek >= 6) {
      // Sa → nächster ist Mittwoch
      const daysUntilWed = 3 - dayOfWeek + 7;
      next.setDate(next.getDate() + daysUntilWed);
    }
    // Mi-Fr → heute ist gültig, next bleibt heute

    return next;
  }

  /**
   * Zählt wie viele GÜLTIGE Streak-Tage (Mi-Fr) zwischen zwei Daten liegen
   * (exklusive startDate, inklusive endDate)
   */
  function countValidDaysBetween(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    let count = 0;
    const current = new Date(start);
    current.setDate(current.getDate() + 1); // Start exclusive

    while (current <= end) {
      if (isInStreakPeriod(current)) {
        count++;
      }
      current.setDate(current.getDate() + 1);
    }

    return count;
  }

  /**
   * Zählt wie viele gültige Streak-Tage (Mi-Fr) SINCE dem letzten Spiel VERPASST wurden
   * = gültige Tage die vergangen sind OHNE dass gespielt wurde
   */
  function countMissedValidDays(lastPlayedDate, now) {
    const last = new Date(lastPlayedDate);
    last.setHours(0, 0, 0, 0);
    
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    
    let missed = 0;
    const current = new Date(last);
    current.setDate(current.getDate() + 1); // Tag nach letztem Spiel
    
    while (current < today) {
      if (isInStreakPeriod(current)) {
        missed++;
      }
      current.setDate(current.getDate() + 1);
    }
    
    return missed;
  }

  /**
   * Zeit bis Streak-Verfall (in Millisekunden)
   * Wenn heute Mi-Fr → Mitternacht heute
   * Wenn Sa-Di → nächsten Mi 00:00
   */
  function getTimeUntilDecay() {
    const now = getNow();
    const dayOfWeek = now.getDay();
    const isValidDay = isInStreakPeriod(now);

    // Mi-Fr → Verfall um Mitternacht heute
    if (isValidDay) {
      const midnight = new Date(now);
      midnight.setHours(23, 59, 59, 999);
      return midnight.getTime() - now.getTime();
    }

    // Sa-Di → Verfall erst nächsten Mi um Mitternacht
    const nextWed = getNextValidStreakDay();
    const decayDeadline = new Date(nextWed);
    decayDeadline.setHours(23, 59, 59, 999);

    return decayDeadline.getTime() - now.getTime();
  }

  /**
   * Countdown formatieren (HH:MM)
   */
  function formatCountdown(ms) {
    if (ms <= 0) return '00:00';
    const totalSecs = Math.floor(ms / 1000);
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
  }

  // ─── STATE MANAGEMENT ───

  function loadState() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        state = {
          currentStreak: Math.max(0, Number(parsed.currentStreak) || 0),
          longestStreak: Math.max(0, Number(parsed.longestStreak) || 0),
          lastPlayedDate: typeof parsed.lastPlayedDate === 'string' ? parsed.lastPlayedDate : '',
          lastPlayedTimestamp: Number(parsed.lastPlayedTimestamp) || 0,
          totalValidDays: Math.max(0, Number(parsed.totalValidDays) || 0),
          milestonesReached: Array.isArray(parsed.milestonesReached) ? parsed.milestonesReached : [],
          weeklyFreezes: Math.max(0, Number(parsed.weeklyFreezes) || 0),
          lastFreezeResetDate: typeof parsed.lastFreezeResetDate === 'string' ? parsed.lastFreezeResetDate : ''
        };
      }
    } catch (e) {
      console.warn('[StreakTracker] Could not load state:', e);
      state = {
        currentStreak: 0,
        longestStreak: 0,
        lastPlayedDate: '',
        lastPlayedTimestamp: 0,
        totalValidDays: 0,
        milestonesReached: [],
        weeklyFreezes: 0,
        lastFreezeResetDate: ''
      };
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('[StreakTracker] Could not save state:', e);
    }
  }

  // ─── KERNLOGIK ───

  /**
   * Wird aufgerufen wenn Spieler ein Duell beendet
   * Erhöht Streak um 1 wenn:
   * - Heute noch nicht gespielt
   * - Und es ist ein gültiger Streak-Tag (Mi-Fr)
   * - Pause-Tage (Sa-Di) unterbrechen nicht, zählen aber auch nicht
   */
  function recordGame() {
    const now = getNow();
    const todayId = getDateId(now);
    const isValidStreakDay = isInStreakPeriod(now);

    // Wöchentlichen Freeze-Reset prüfen (falls Montag)
    checkWeeklyFreezeReset();

    // Pause-Tag (Sa-Di) → Streak bleibt unverändert
    if (!isValidStreakDay) {
      state.lastPlayedDate = todayId;
      state.lastPlayedTimestamp = now.getTime();
      saveState();
      return { streakIncreased: false, reason: 'pause_day' };
    }

    // Prüfen ob heute schon gespielt
    if (state.lastPlayedDate === todayId) {
      // Heute schon gespielt → kein zusätzlicher Streak
      saveState();
      return { streakIncreased: false, reason: 'already_played_today' };
    }

    // Prüfen ob Streak unterbrochen wurde
    const lastPlayed = state.lastPlayedDate ? parseDateId(state.lastPlayedDate) : null;
    
    if (lastPlayed) {
      // Zähle wie viele gültige Streak-Tage (Mi-Fr) seit letztem Spiel verpasst wurden
      const missedValidDays = countMissedValidDays(lastPlayed, now);
      
      if (missedValidDays > 1) {
        // Mehr als 1 gültiger Tag verpasst → Streak zurücksetzen, dann +1
        state.currentStreak = 0;
      } else if (missedValidDays === 1) {
        // Genau 1 gültiger Tag verpasst → Streak wird NICHT unterbrochen
        // (der verpasste Tag zählt einfach nicht)
      }
    }

    // Streak erhöhen
    state.currentStreak += 1;
    state.totalValidDays += 1;
    state.lastPlayedDate = todayId;
    state.lastPlayedTimestamp = now.getTime();

    // Longest Streak updaten
    if (state.currentStreak > state.longestStreak) {
      state.longestStreak = state.currentStreak;
    }

    saveState();

    // Prüfen ob Meilenstein erreicht
    const milestone = checkMilestone();

    return {
      streakIncreased: true,
      newStreak: state.currentStreak,
      milestone: milestone
    };
  }

  /**
   * Prüft ob ein Streak-Meilenstein erreicht wurde
   */
  function checkMilestone() {
    const streak = state.currentStreak;

    // Höchsten verfügbaren Meilenstein finden
    const milestoneKeys = Object.keys(STREAK_BONUSES).map(Number).sort((a, b) => a - b);
    let reachedMilestone = null;

    for (const key of milestoneKeys) {
      if (streak >= key && !state.milestonesReached.includes(key)) {
        reachedMilestone = key;
      }
    }

    if (reachedMilestone !== null) {
      state.milestonesReached.push(reachedMilestone);
      saveState();

      const bonus = STREAK_BONUSES[reachedMilestone];

      // XP auszahlen
      if (typeof window.awardFlatXP === 'function') {
        window.awardFlatXP(bonus.xp);
      }

      // Notification zeigen
      showMilestoneNotification(reachedMilestone, bonus);

      return {
        days: reachedMilestone,
        xp: bonus.xp,
        label: bonus.label,
        color: bonus.color
      };
    }

    return null;
  }

  function showMilestoneNotification(days, bonus) {
    const overlay = document.createElement('div');
    overlay.className = 'streak-milestone-popup';
    overlay.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 10001;
      background: linear-gradient(135deg, ${bonus.color}22, ${bonus.color}44);
      border: 2px solid ${bonus.color};
      border-radius: 16px;
      padding: 20px 24px;
      text-align: center;
      box-shadow: 0 8px 32px ${bonus.color}66;
      animation: streakMilestonePop 0.5s ease-out;
      max-width: 320px;
    `;
    overlay.innerHTML = `
      <div style="font-size: 2rem; margin-bottom: 8px;">🔥</div>
      <div style="font-size: 1.2rem; font-weight: 800; color: ${bonus.color}; margin-bottom: 4px;">
        ${days} TAGE STREAK!
      </div>
      <div style="font-size: 0.9rem; color: #fff; margin-bottom: 8px;">
        ${bonus.label}
      </div>
      <div style="font-size: 0.8rem; color: rgba(255,255,255,0.7);">
        +${bonus.xp} XP Bonus!
      </div>
    `;

    document.body.appendChild(overlay);

    setTimeout(() => {
      overlay.style.opacity = '0';
      overlay.style.transition = 'opacity 0.3s';
      setTimeout(() => overlay.remove(), 300);
    }, 4000);
  }

  /**
   * Prüft ob Streak verfallen ist
   * Streak verfällt nur wenn man an einem gültigen Tag (Mi-Fr) nicht spielt
   * UND der nächste gültige Tag auch verpasst wird
   */
  function checkDecay() {
    if (state.currentStreak === 0) return false;

    const now = getNow();

    // Prüfen ob letztes Spiel zu lange her
    const lastPlayed = parseDateId(state.lastPlayedDate);
    if (!lastPlayed) return false;

    const missedValidDays = countMissedValidDays(lastPlayed, now);

    // Mehr als 1 gültiger Tag (Mi-Fr) verpasst → Streak verloren
    if (missedValidDays > 1) {
      const lostStreak = state.currentStreak;
      state.currentStreak = 0;
      state.milestonesReached = []; // Neue Meilensteine möglich
      saveState();

      showDecayNotification(lostStreak);
      return true;
    }

    return false;
  }

  function showDecayNotification(lostStreak) {
    const overlay = document.createElement('div');
    overlay.className = 'streak-decay-popup';
    overlay.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 10001;
      background: linear-gradient(135deg, #331111, #551111);
      border: 2px solid #f06050;
      border-radius: 16px;
      padding: 20px 24px;
      text-align: center;
      box-shadow: 0 8px 32px rgba(240,96,80,0.4);
      max-width: 320px;
    `;
    overlay.innerHTML = `
      <div style="font-size: 2rem; margin-bottom: 8px;">💔</div>
      <div style="font-size: 1.1rem; font-weight: 800; color: #f06050; margin-bottom: 4px;">
        STREAK VERLOREN!
      </div>
      <div style="font-size: 0.85rem; color: rgba(255,255,255,0.7); margin-bottom: 8px;">
        Deine ${lostStreak}-Tage-Serie ist vorbei...
      </div>
      <div style="font-size: 0.75rem; color: rgba(255,255,255,0.5);">
        Spiel jetzt ein Duell für eine neue Streak!
      </div>
    `;

    document.body.appendChild(overlay);

    setTimeout(() => {
      overlay.style.opacity = '0';
      overlay.style.transition = 'opacity 0.3s';
      setTimeout(() => overlay.remove(), 300);
    }, 5000);
  }

  // ─── STREAK-FREEZE ───

  /**
   * Wöchentlicher Reset: Jeder Montag werden Freezes zurückgesetzt
   * 1 Freeze pro Woche (Mo-So)
   */
  function checkWeeklyFreezeReset() {
    const now = getNow();
    const todayId = getDateId(now);
    const today = now.getDay(); // 0=So, 1=Mo, ..., 6=Sa

    // Nur am Montag (1) zurücksetzen
    if (today !== 1) return false;

    // Prüfen ob diese Woche schon zurückgesetzt
    if (state.lastFreezeResetDate === todayId) return false;

    // Reset durchführen
    const previousFreezes = state.weeklyFreezes;
    state.weeklyFreezes = 0;
    state.lastFreezeResetDate = todayId;
    saveState();

    if (previousFreezes > 0) {
      console.log('[StreakTracker] Weekly freeze reset:', previousFreezes, '→ 0');
      showWeeklyResetNotification();
    }

    return true;
  }

  function showWeeklyResetNotification() {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 10001;
      background: linear-gradient(135deg, #0a2a1f, #1a4a3f);
      border: 2px solid #7ab030;
      border-radius: 16px;
      padding: 20px 24px;
      text-align: center;
      box-shadow: 0 8px 32px rgba(122,176,48,0.4);
      max-width: 320px;
    `;
    overlay.innerHTML = `
      <div style="font-size: 2rem; margin-bottom: 8px;">🔄</div>
      <div style="font-size: 1.1rem; font-weight: 800; color: #7ab030; margin-bottom: 4px;">
        NEUE WOCHE – NEUE CHANCE!
      </div>
      <div style="font-size: 0.85rem; color: rgba(255,255,255,0.7);">
        ❄️ Streak-Freeze zurückgesetzt!<br>
        Du hast wieder 1 Freeze diese Woche.
      </div>
    `;

    document.body.appendChild(overlay);

    setTimeout(() => {
      overlay.style.opacity = '0';
      overlay.style.transition = 'opacity 0.3s';
      setTimeout(() => overlay.remove(), 300);
    }, 4000);
  }

  function canFreeze() {
    return state.weeklyFreezes < 1;
  }

  function freezeStreak() {
    if (!canFreeze()) return false;

    const xpCost = 50;

    // XP abziehen (wenn genug vorhanden)
    if (typeof window.G !== 'undefined' && window.G.xp >= xpCost) {
      window.G.xp -= xpCost;
      if (typeof window.saveXP === 'function') window.saveXP();
    } else {
      return false; // Nicht genug XP
    }

    state.weeklyFreezes += 1;
    saveState();

    showFreezeNotification();
    return true;
  }

  function showFreezeNotification() {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 10001;
      background: linear-gradient(135deg, #1a3a5f, #2a4a7f);
      border: 2px solid #00c3ff;
      border-radius: 16px;
      padding: 20px 24px;
      text-align: center;
      box-shadow: 0 8px 32px rgba(0,195,255,0.4);
      max-width: 320px;
    `;
    overlay.innerHTML = `
      <div style="font-size: 2rem; margin-bottom: 8px;">❄️</div>
      <div style="font-size: 1.1rem; font-weight: 800; color: #00c3ff; margin-bottom: 4px;">
        STREAK EINGEFROREN!
      </div>
      <div style="font-size: 0.85rem; color: rgba(255,255,255,0.7);">
        -50 XP · Deine Streak ist sicher
      </div>
    `;

    document.body.appendChild(overlay);

    setTimeout(() => {
      overlay.style.opacity = '0';
      overlay.style.transition = 'opacity 0.3s';
      setTimeout(() => overlay.remove(), 300);
    }, 3000);
  }

  // ─── UI RENDERING ───

  function startUIUpdates() {
    if (uiUpdateInterval) return;

    uiUpdateInterval = setInterval(() => {
      updateStreakBanner();
      updateCountdown();
    }, 1000);
  }

  function stopUIUpdates() {
    if (uiUpdateInterval) {
      clearInterval(uiUpdateInterval);
      uiUpdateInterval = null;
    }
  }

  function updateStreakBanner() {
    const banner = document.getElementById('streakBanner');
    if (!banner) return;

    const streak = state.currentStreak;
    const isInPeriod = isInStreakPeriod();
    const nextMilestone = getNextMilestone();

    // Farbe basierend auf Gefahr
    let color = '#7ab030'; // Grün
    let urgency = 'safe';

    if (streak > 0) {
      const timeUntilDecay = getTimeUntilDecay();
      const hoursLeft = timeUntilDecay / (1000 * 60 * 60);

      if (hoursLeft < 1) {
        color = '#f06050';
        urgency = 'critical';
      } else if (hoursLeft < 4) {
        color = '#ff6b35';
        urgency = 'warning';
      } else if (hoursLeft < 12) {
        color = '#ff9500';
        urgency = 'caution';
      }
    }

    let nextMilestoneText = '';
    if (nextMilestone) {
      const bonus = STREAK_BONUSES[nextMilestone];
      nextMilestoneText = `🔒 +${bonus.xp} XP bei ${nextMilestone} Tagen`;
    } else {
      nextMilestoneText = '👑 Maximaler Streak!';
    }

    banner.innerHTML = `
      <div class="streak-banner-content" style="display:flex;align-items:center;gap:12px;padding:12px 16px;background:linear-gradient(135deg, ${color}15, ${color}30);border:1px solid ${color}60;border-radius:12px;box-shadow:0 4px 16px ${color}30;">
        <div class="streak-icon" style="font-size:1.8rem;${urgency === 'critical' ? 'animation:streakPulse 1s infinite;' : ''}">🔥</div>
        <div class="streak-info" style="flex:1;">
          <div class="streak-count" style="font-size:1.1rem;font-weight:800;color:${color};">${streak}x Mi-Fr Streak</div>
          <div class="streak-next" style="font-size:0.7rem;color:rgba(255,255,255,0.6);margin-top:2px;">${nextMilestoneText}</div>
        </div>
        <div class="streak-timer" style="font-size:0.75rem;color:rgba(255,255,255,0.5);text-align:right;">
          ${streak > 0 ? '⏰ ' + formatCountdown(getTimeUntilDecay()) : ''}
        </div>
      </div>
    `;

    // Progress bar updaten
    updateProgressBar();
  }

  function updateProgressBar() {
    const bar = document.getElementById('streakProgressBar');
    if (!bar) return;

    const streak = state.currentStreak;
    const nextMilestone = getNextMilestone();

    if (!nextMilestone) {
      bar.style.width = '100%';
      bar.textContent = 'MAX';
      return;
    }

    const progress = Math.min(100, (streak / nextMilestone) * 100);
    bar.style.width = progress + '%';
    bar.textContent = streak + '/' + nextMilestone;
  }

  function updateCountdown() {
    const countdownEl = document.getElementById('streakCountdown');
    if (!countdownEl) return;

    const timeUntilDecay = getTimeUntilDecay();
    const hoursLeft = timeUntilDecay / (1000 * 60 * 60);

    countdownEl.textContent = formatCountdown(timeUntilDecay);

    // Farbe anpassen
    if (hoursLeft < 1) {
      countdownEl.style.color = '#f06050';
    } else if (hoursLeft < 4) {
      countdownEl.style.color = '#ff6b35';
    } else if (hoursLeft < 12) {
      countdownEl.style.color = '#ff9500';
    } else {
      countdownEl.style.color = 'rgba(255,255,255,0.5)';
    }
  }

  function getNextMilestone() {
    const streak = state.currentStreak;
    const milestones = Object.keys(STREAK_BONUSES).map(Number).sort((a, b) => a - b);

    for (const m of milestones) {
      if (streak < m) return m;
    }

    return null; // Alle erreicht
  }

  function getStreakStats() {
    return {
      current: state.currentStreak,
      longest: state.longestStreak,
      totalValidDays: state.totalValidDays,
      milestonesReached: state.milestonesReached.length,
      canFreeze: canFreeze(),
      weeklyFreezes: state.weeklyFreezes,
      timeUntilDecay: getTimeUntilDecay(),
      nextMilestone: getNextMilestone()
    };
  }

  // ─── INITIALISIERUNG ───

  function init() {
    loadState();

    // Prüfen ob Streak verfallen ist
    checkDecay();

    // Prüfen ob wöchentlicher Freeze-Reset nötig ist (Montag)
    checkWeeklyFreezeReset();

    // UI Updates starten
    startUIUpdates();

    console.log('[StreakTracker] Initialized. Current streak:', state.currentStreak, 'Freezes:', state.weeklyFreezes);
  }

  function shutdown() {
    stopUIUpdates();
  }

  // Public API
  return {
    init,
    shutdown,
    recordGame,
    checkDecay,
    checkWeeklyFreezeReset,
    freezeStreak,
    canFreeze,
    getStreakStats,
    isInStreakPeriod,
    getState: () => ({ ...state }),
    STREAK_BONUSES
  };

})();

// CSS Animationen für Streak-Meilensteine
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes streakMilestonePop {
      0% {
        opacity: 0;
        transform: translateX(-50%) scale(0.5) translateY(-20px);
      }
      50% {
        transform: translateX(-50%) scale(1.1) translateY(5px);
      }
      100% {
        opacity: 1;
        transform: translateX(-50%) scale(1) translateY(0);
      }
    }

    @keyframes streakPulse {
      0%, 100% {
        transform: scale(1);
      }
      50% {
        transform: scale(1.2);
      }
    }
  `;
  document.head.appendChild(style);
}

// Auto-init wenn DOM ready
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      if (typeof StreakTracker !== 'undefined') {
        StreakTracker.init();
      }
    });
  } else {
    if (typeof StreakTracker !== 'undefined') {
      StreakTracker.init();
    }
  }
}
