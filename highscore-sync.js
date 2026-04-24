/* Reliable player-only highscore sync */
(function () {
  'use strict';

  var KEY = 'sd_player_highscores';
  var lastSavedSignature = '';
  var lastSavedAt = 0;

  function getState() {
    try {
      if (window.G) return window.G;
    } catch (e) {}
    try {
      if (typeof G !== 'undefined') return G;
    } catch (e) {}
    return null;
  }

  function readList() {
    try {
      var parsed = JSON.parse(localStorage.getItem(KEY) || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  function writeList(list) {
    try {
      localStorage.setItem(KEY, JSON.stringify(list.slice(-100)));
      window.dispatchEvent(new CustomEvent('playerHighscoreUpdated'));
      window.dispatchEvent(new CustomEvent('analyticsUpdated'));
    } catch (e) {
      console.warn('[HighscoreSync] Speichern fehlgeschlagen:', e);
    }
  }

  function number(value) {
    var n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }

  function playerName(g) {
    try {
      return g.username || localStorage.getItem('username') || localStorage.getItem('sd_username') || 'Spieler';
    } catch (e) {
      return 'Spieler';
    }
  }

  function getScore(g) {
    var shots = Math.max(1, number(g.maxShots || g.shots || 40));
    var isWholeRings = !!g.is3x20 || g.discipline === 'kk3x20';
    var score = 0;

    if (!isWholeRings && number(g._playerTotalTenths) > 0) {
      score = number(g._playerTotalTenths) / 10;
    } else if (number(g.playerTotal) > 0) {
      score = number(g.playerTotal);
    } else if (number(g.playerTotalInt) > 0) {
      score = number(g.playerTotalInt);
    }

    var maxScore = shots * (isWholeRings ? 10 : 10.9) + 2;
    if (!Number.isFinite(score) || score <= 0 || score > maxScore) return 0;
    return Math.round(score * 10) / 10;
  }

  function getBotScore(g) {
    var isWholeRings = !!g.is3x20 || g.discipline === 'kk3x20';
    if (!isWholeRings && number(g._botTotalTenths) > 0) return Math.round((number(g._botTotalTenths) / 10) * 10) / 10;
    if (number(g.botTotal) > 0) return Math.round(number(g.botTotal) * 10) / 10;
    if (number(g.botTotalInt) > 0) return number(g.botTotalInt);
    return 0;
  }

  function isComplete(g) {
    var maxShots = Math.max(1, number(g.maxShots || g.shots || 40));
    var playerShotsLeft = number(g.playerShotsLeft);
    var playerShots = Array.isArray(g.playerShots) ? g.playerShots.length : 0;
    var targetShots = Array.isArray(g.targetShots) ? g.targetShots.length : 0;

    return g.dnf === true || playerShotsLeft <= 0 || playerShots >= maxShots || targetShots >= maxShots;
  }

  function currentEntry() {
    var g = getState();
    if (!g || !isComplete(g)) return null;

    var score = getScore(g);
    if (!score) return null;

    var botScore = getBotScore(g);
    var result = '';
    if (botScore > 0) {
      if (score > botScore) result = 'win';
      else if (score < botScore) result = 'loss';
      else result = 'draw';
    }

    var shots = Math.max(1, number(g.maxShots || g.shots || 40));
    var started = number(g._gameStartTime);
    var timestamp = Date.now();

    return {
      id: 'player_' + timestamp + '_' + Math.round(score * 10),
      playerName: playerName(g),
      playerScore: score,
      botScore: botScore || null,
      discipline: g.discipline || '',
      weapon: g.weapon || '',
      difficulty: g.diff || '',
      result: result,
      shots: shots,
      timestamp: timestamp,
      duration: started > 0 ? Math.max(0, timestamp - started) : 0,
      source: 'highscore-sync'
    };
  }

  function saveCurrentIfNeeded(reason) {
    var entry = currentEntry();
    if (!entry) return false;

    var signature = [entry.playerName, entry.discipline, entry.shots, Math.round(entry.playerScore * 10), entry.result].join('|');
    var now = Date.now();
    if (signature === lastSavedSignature && now - lastSavedAt < 120000) return false;

    var list = readList();
    var duplicate = list.some(function (item) {
      var sameScore = Math.round(Number(item.playerScore) * 10) === Math.round(entry.playerScore * 10);
      var sameDisc = (item.discipline || '') === entry.discipline;
      var sameShots = Number(item.shots || 0) === Number(entry.shots || 0);
      var closeTime = Math.abs(Number(item.timestamp || 0) - now) < 120000;
      return sameScore && sameDisc && sameShots && closeTime;
    });

    if (duplicate) {
      lastSavedSignature = signature;
      lastSavedAt = now;
      return false;
    }

    entry.reason = reason || 'auto';
    list.push(entry);
    list.sort(function (a, b) { return Number(a.timestamp || 0) - Number(b.timestamp || 0); });
    writeList(list);

    lastSavedSignature = signature;
    lastSavedAt = now;
    console.log('[HighscoreSync] Spieler-Highscore gespeichert:', entry);
    return true;
  }

  function patchEnhancedAnalytics() {
    try {
      if (!window.EnhancedAnalytics || window.EnhancedAnalytics.__playerHighscorePatched) return;
      if (typeof window.EnhancedAnalytics.addGameData !== 'function') return;

      var original = window.EnhancedAnalytics.addGameData;
      window.EnhancedAnalytics.addGameData = function (gameData) {
        var result = original.apply(this, arguments);
        if (gameData && Number.isFinite(Number(gameData.playerScore)) && Number(gameData.playerScore) > 0) {
          var list = readList();
          list.push({
            id: 'analytics_' + Date.now() + '_' + Math.round(Number(gameData.playerScore) * 10),
            playerName: gameData.playerName || playerName(getState() || {}),
            playerScore: Math.round(Number(gameData.playerScore) * 10) / 10,
            botScore: Number.isFinite(Number(gameData.botScore)) ? Number(gameData.botScore) : null,
            discipline: gameData.discipline || '',
            weapon: gameData.weapon || '',
            difficulty: gameData.difficulty || gameData.diff || '',
            result: gameData.result || '',
            shots: Number(gameData.shotsCount || gameData.maxShots || gameData.shots || 0) || null,
            timestamp: Number(gameData.timestamp || Date.now()),
            duration: Number(gameData.duration || 0),
            source: 'analytics-patch'
          });
          writeList(list);
        }
        return result;
      };

      window.EnhancedAnalytics.__playerHighscorePatched = true;
    } catch (e) {
      console.warn('[HighscoreSync] Analytics-Patch fehlgeschlagen:', e);
    }
  }

  function boot() {
    patchEnhancedAnalytics();
    saveCurrentIfNeeded('boot');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }

  setTimeout(boot, 800);
  setTimeout(boot, 2500);
  setInterval(function () {
    patchEnhancedAnalytics();
    saveCurrentIfNeeded('interval');
  }, 2500);

  window.addEventListener('visibilitychange', function () {
    if (!document.hidden) saveCurrentIfNeeded('visible');
    else saveCurrentIfNeeded('hidden');
  });
  window.addEventListener('beforeunload', function () { saveCurrentIfNeeded('unload'); });
  window.addEventListener('analyticsUpdated', function () { saveCurrentIfNeeded('analytics'); });

  window.HighscoreSync = {
    saveNow: function () { return saveCurrentIfNeeded('manual'); },
    getList: readList
  };
})();
