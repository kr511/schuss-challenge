/* ─── GAME HISTORY ──────────────────────────
 *
 * Spiel-Ergebnis aufzeichnen, History-Einträge bauen/speichern,
 * History-Panel rendern. Abhängigkeiten: stats-storage.js, game-constants.js,
 * StorageManager, G, scheduleCloudSync/syncProfileWithBackend (app.js).
 */

function recordGameResult(result, diff, weapon, playerPts, botPts) {
  // Global stats
  const gs = loadGameStats();
  gs.wins = (gs.wins || 0) + (result === 'win' ? 1 : 0);
  gs.losses = (gs.losses || 0) + (result === 'lose' ? 1 : 0);
  gs.draws = (gs.draws || 0) + (result === 'draw' ? 1 : 0);
  saveGameStats(gs);

  // Weapon stats
  const ws = loadWeaponStats(weapon);
  ws.wins = (ws.wins || 0) + (result === 'win' ? 1 : 0);
  ws.losses = (ws.losses || 0) + (result === 'lose' ? 1 : 0);
  ws.draws = (ws.draws || 0) + (result === 'draw' ? 1 : 0);
  saveWeaponStats(weapon, ws);

  // History
  addHistoryEntry(result, diff, weapon, playerPts, botPts);

  // Check SUN achievements
  checkSunAchievements();

  // NEU: Adaptive Bot System - Spiel aufzeichnen
  if (typeof AdaptiveBotSystem !== 'undefined' && AdaptiveBotSystem.isEnabled()) {
    AdaptiveBotSystem.trackGame(playerPts, botPts, G.discipline, diff, weapon);
  }

  // NEU: Erweiterte Analytics - Spiel-Daten hinzufügen
  if (typeof EnhancedAnalytics !== 'undefined') {
    // XP berechnen (nur bei Sieg)
    const earnedXP = (result === 'win' && !G?.dnf) ? (XP_PER_WIN[diff] || 10) : 0;

    const gameData = {
      result: result,
      playerScore: playerPts,
      botScore: botPts,
      scoreDifference: playerPts - botPts,
      discipline: G.discipline,
      disciplineName: DISC[G.discipline]?.name || G.discipline,
      weapon: weapon,
      difficulty: diff,
      xpEarned: earnedXP, // NEU: XP speichern
      shots: G.playerShots || [], // Spieler-Schüsse falls verfügbar
      shotsLeft: G.playerShotsLeft,
      maxDeficit: Math.max(0, botPts - playerPts), // Größter Rückstand
      duration: Math.floor((Date.now() - G._gameStartTime) / 1000), // Spieldauer in Sek.
      timestamp: Date.now()
    };

    EnhancedAnalytics.addGameData(gameData);

    // NEU: Daily Challenge Fortschritt tracken
    if (typeof DailyChallenge !== 'undefined') {
      const stats = {
        currentStreak: G.streak || 0,
        gamesPlayed: (gs.wins || 0) + (gs.losses || 0) + (gs.draws || 0)
      };
      DailyChallenge.trackGame(gameData, stats);
    }

    // StreakTracker: 1 Duell = +1 Streak (Mo-Fr ab 12:00)
    if (typeof StreakTracker !== 'undefined') {
      const streakResult = StreakTracker.recordGame();
      if (streakResult.streakIncreased && streakResult.milestone) {
        console.log('[Streak] Milestone erreicht:', streakResult.milestone);
      }
    }

    // NEU: Adaptive Bot - Spieler-Schwächen analysieren
    if (typeof AdaptiveBotSystem !== 'undefined' && G.playerShots.length > 0) {
      // Gruppierung für den Spieler berechnen
      const grouping = calculateGrouping(G.playerShots);
      AdaptiveBotSystem.trackPlayerResult(grouping);
    }
  }

  // NEU: Haptisches Feedback bei wichtigen Ereignissen
  if (typeof MobileFeatures !== 'undefined') {
    if (result === 'win') {
      MobileFeatures.hapticHit();
    } else if (result === 'lose') {
      MobileFeatures.hapticMiss();
    }

    // Bei neuen Rekorden oder besonderen Leistungen
    const bestLG = parseInt(localStorage.getItem('sd_lg_best') || '0') || 0;
    const bestKK = parseInt(localStorage.getItem('sd_kk_best') || '0') || 0;
    const personalBest = Math.max(bestLG, bestKK);
    if (playerPts > personalBest) {
      MobileFeatures.hapticAchievement();
    }
  }

  // Profil nach jedem Spiel aktualisieren (Streak + Stats aktuell halten)
  setTimeout(() => syncProfileWithBackend(null, { reason: 'battle_finished' }), 300);

  // Supabase Worker API: Spielsitzung persistieren (fire-and-forget)
  syncGameSessionWithBackend({
      mode: (G.friendChallenge ? 'challenge' : 'bot_fight'),
      score: playerPts,
      shotsFired: Math.max(1, (G.playerShots && G.playerShots.length) || G.shots || 0),
      durationSeconds: Math.max(0, Math.floor((Date.now() - (G._gameStartTime || Date.now())) / 1000))
    });
}

function calculateGrouping(shots) {
  if (!shots || shots.length === 0) return null;
  let totalX = 0, totalY = 0;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

  shots.forEach(s => {
    totalX += s.dx;
    totalY += s.dy;
    if (s.dx < minX) minX = s.dx;
    if (s.dx > maxX) maxX = s.dx;
    if (s.dy < minY) minY = s.dy;
    if (s.dy > maxY) maxY = s.dy;
  });

  const centerX = totalX / shots.length;
  const centerY = totalY / shots.length;
  let totalDist = 0;
  shots.forEach(s => {
    const dx = s.dx - centerX;
    const dy = s.dy - centerY;
    totalDist += Math.sqrt(dx * dx + dy * dy);
  });

  return {
    extremeSpread: Math.sqrt(Math.pow(maxX - minX, 2) + Math.pow(maxY - minY, 2)),
    meanRadius: totalDist / shots.length,
    centerOffsetX: centerX,
    centerOffsetY: centerY
  };
}

/* ─── HISTORY ────────────────────────────── */
function buildHistoryEntry(result, diff, weapon, playerPts, botPts) {
  const DIFF_NAMES = { easy: 'Einfach', real: 'Mittel', hard: 'Elite', elite: 'Profi' };
  const WEAPON_NAMES = { lg: 'Luftgewehr', kk: 'Kleinkaliber' };
  const timestamp = Date.now();
  const discipline = G.discipline || 'unknown';

  return {
    id: `${timestamp}_${discipline}_${result}`,
    timestamp,
    result,
    diff,
    weapon,
    discipline,
    disciplineName: DISC[discipline]?.name || discipline,
    playerPts,
    botPts,
    diffName: DIFF_NAMES[diff] || diff,
    weaponName: WEAPON_NAMES[weapon] || weapon,
    date: new Date(timestamp).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
  };
}

function addHistoryEntry(result, diff, weapon, playerPts, botPts) {
  try {
    const hist = StorageManager.get('history', []);
    if (!Array.isArray(hist)) return;
    const historyEntry = buildHistoryEntry(result, diff, weapon, playerPts, botPts);
    hist.unshift(historyEntry);
    if (hist.length > 30) hist.splice(30);
    StorageManager.set('history', hist);
    scheduleCloudSync('history_changed');
    return historyEntry;
  } catch (e) { }
  return null;
}

function renderHistory() {
  const el = document.getElementById('psHistoryList');
  if (!el) return;
  try {
    const hist = JSON.parse(localStorage.getItem('sd_history') || '[]');
    if (hist.length === 0) {
      el.innerHTML = '<div class="ps-history-empty">Noch keine Duelle gespeichert.<br>Spiel ein Duell, um den Verlauf zu sehen!</div>';
      return;
    }
    el.innerHTML = hist.map(h => {
      const resLabel = h.result === 'win' ? 'S' : h.result === 'lose' ? 'N' : 'U';
      const pPts = h.playerPts != null ? parseFloat(h.playerPts).toFixed(1) : '–';
      const bPts = h.botPts != null ? parseFloat(h.botPts).toFixed(1) : '–';
      const weaponUpper = (h.weapon || (h.weaponName === 'Luftgewehr' ? 'lg' : h.weaponName === 'Kleinkaliber' ? 'kk' : h.weaponName) || 'LG').toUpperCase();
      let discUpper = (h.disciplineName || h.discipline || '').toString().toUpperCase();
      if (discUpper.startsWith(weaponUpper)) {
        discUpper = discUpper.substring(weaponUpper.length).trim();
      }
      const finalTitle = `${weaponUpper} ${discUpper} · ${h.diffName || h.diff || 'Mittel'}`;

      return `<div class="ps-history-item">
            <div class="phi-result ${h.result}">${resLabel}</div>
            <div class="phi-info">
              <div class="phi-title">${finalTitle}</div>
              <div class="phi-sub">${h.date}</div>
            </div>
            <div class="phi-score ${h.result}">${pPts} <span style="opacity:.4;font-size:.7em">vs</span> ${bPts}</div>
          </div>`;
    }).join('');
  } catch (e) {
    el.innerHTML = '<div class="ps-history-empty">Verlauf konnte nicht geladen werden.</div>';
  }
}

function buildStructuredMatchHistory() { try { const hist = StorageManager.get('history', []); if (!Array.isArray(hist) || !hist.length) return {}; const matches = {}; hist.slice(0, 30).forEach((entry, index) => { if (!entry || typeof entry !== 'object') return; const timestamp = Number(entry.timestamp) || 0; const discipline = typeof entry.discipline === 'string' ? entry.discipline : 'unknown'; const fallbackKey = String((timestamp || Date.now()) + '_' + discipline + '_' + index); const key = String(entry.id || fallbackKey).replace(/[.#$/\[\]]/g, '_'); matches[key] = { id: key, timestamp: timestamp || Date.now(), result: typeof entry.result === 'string' ? entry.result : 'unknown', diff: typeof entry.diff === 'string' ? entry.diff : 'unknown', weapon: entry.weapon === 'kk' ? 'kk' : 'lg', discipline, disciplineName: typeof entry.disciplineName === 'string' ? entry.disciplineName : (DISC[discipline]?.name || discipline), playerPts: Number(entry.playerPts) || 0, botPts: Number(entry.botPts) || 0, diffName: typeof entry.diffName === 'string' ? entry.diffName : entry.diff, weaponName: typeof entry.weaponName === 'string' ? entry.weaponName : entry.weapon, date: typeof entry.date === 'string' ? entry.date : '' }; }); return matches; } catch (error) { console.warn('History snapshot build failed:', error); return {}; } }
function getStructuredHistoryList() { const matches = buildStructuredMatchHistory(); return Object.values(matches).filter(Boolean).sort((a, b) => (Number(b.timestamp) || 0) - (Number(a.timestamp) || 0)); }
