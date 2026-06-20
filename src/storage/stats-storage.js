/* ─── STATS STORAGE ────────────────────────
 *
 * Wrapper für Game/Weapon-Stats in localStorage.
 * Verwendet StorageManager + scheduleCloudSync (in app.js definiert).
 */

function loadGameStats() {
  try { return JSON.parse(localStorage.getItem('sd_gamestats') || '{}'); }
  catch (e) { return {}; }
}

function saveGameStats(s) {
  StorageManager.set('gamestats', s);
  scheduleCloudSync('gamestats_changed');
}

function loadWeaponStats(w) {
  try { return JSON.parse(localStorage.getItem(`sd_wstats_${w}`) || '{"wins":0,"losses":0,"draws":0}'); }
  catch (e) { return { wins: 0, losses: 0, draws: 0 }; }
}

function saveWeaponStats(w, s) {
  StorageManager.set(`wstats_${w}`, s);
  scheduleCloudSync(`weapon_stats_${w}`);
}

/* Einheitliche, beobachtete Werte aus der Duell-Historie. */
const StatsStorage = (function () {
  'use strict';

  const DISCIPLINES = {
    lg40: { weapon: 'lg', shots: 40, name: 'LG 40' },
    lg60: { weapon: 'lg', shots: 60, name: 'LG 60' },
    kk50: { weapon: 'kk', shots: 60, name: 'KK 50m' },
    kk100: { weapon: 'kk', shots: 60, name: 'KK 100m' },
    kk3x20: { weapon: 'kk', shots: 60, name: 'KK 3×20' },
  };

  function parseTimestamp(entry) {
    const direct = Number(entry && entry.timestamp);
    if (Number.isFinite(direct) && direct > 0) return direct;
    const parsed = Date.parse((entry && (entry.completed_at || entry.created_at || entry.date)) || '');
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function resolveDiscipline(entry) {
    const raw = String((entry && (entry.discipline || entry.disciplineName)) || '').toLowerCase();
    if (DISCIPLINES[raw]) return raw;
    if (raw.includes('3') && raw.includes('20')) return 'kk3x20';
    if (raw.includes('100')) return 'kk100';
    if ((raw.includes('kk') || raw.includes('kleinkaliber')) && raw.includes('50')) return 'kk50';
    if (raw.includes('60') && !(raw.includes('kk') || raw.includes('kleinkaliber'))) return 'lg60';
    if (raw.includes('40')) return 'lg40';
    return '';
  }

  function resolveShotCount(entry, discipline, weapon) {
    const values = Array.isArray(entry && entry.shots) ? entry.shots : [];
    const direct = Number(entry && (entry.maxShots || entry.shotsCount || entry.count || entry.shots));
    if (Number.isFinite(direct) && direct > 0) return Math.round(direct);
    if (values.length) return values.length;
    if (discipline && DISCIPLINES[discipline]) return DISCIPLINES[discipline].shots;
    return weapon === 'kk' ? 60 : 40;
  }

  function shotScore(shot) {
    const value = Number(typeof shot === 'object' && shot !== null
      ? (shot.pts ?? shot.score ?? shot.value)
      : shot);
    return Number.isFinite(value) && value >= 0 ? value : null;
  }

  function normalizeHistoryEntry(entry) {
    if (!entry || typeof entry !== 'object') return null;
    const totalScore = Number(entry.totalScore ?? entry.playerPts ?? entry.playerScore ?? entry.score ?? entry.total);
    if (!Number.isFinite(totalScore) || totalScore < 0) return null;

    const discipline = resolveDiscipline(entry);
    const config = DISCIPLINES[discipline];
    const weaponText = String(entry.weapon || entry.weaponType || '').toLowerCase();
    const weapon = config ? config.weapon
      : ((weaponText.includes('kk') || weaponText.includes('kleinkaliber')) ? 'kk' : 'lg');
    const shots = resolveShotCount(entry, discipline, weapon);
    const shotValues = (Array.isArray(entry.shots) ? entry.shots : [])
      .map(shotScore)
      .filter(value => value !== null);
    const timestamp = parseTimestamp(entry);
    const result = entry.result === 'loss' ? 'lose' : String(entry.result || '');

    return {
      id: entry.id || String(timestamp || ''),
      timestamp,
      date: timestamp || entry.date || entry.completed_at || '',
      discipline,
      disciplineName: entry.disciplineName || (config && config.name) || entry.discipline || 'Unbekannte Disziplin',
      weapon,
      totalScore,
      averagePerShot: shots > 0 ? totalScore / shots : null,
      bestShot: shotValues.length ? Math.max(...shotValues) : null,
      shots,
      result,
      botScore: Number.isFinite(Number(entry.botPts ?? entry.botScore))
        ? Number(entry.botPts ?? entry.botScore)
        : null,
      duration: Number.isFinite(Number(entry.duration)) && Number(entry.duration) > 0
        ? Number(entry.duration)
        : null,
      source: 'duel_history',
    };
  }

  function readHistory() {
    try {
      const history = JSON.parse(localStorage.getItem('sd_history') || '[]');
      if (!Array.isArray(history)) return [];
      return history.map(normalizeHistoryEntry).filter(Boolean)
        .sort((a, b) => b.timestamp - a.timestamp);
    } catch (_e) {
      return [];
    }
  }

  function average(values) {
    const clean = values.filter(value => Number.isFinite(value));
    return clean.length ? clean.reduce((sum, value) => sum + value, 0) / clean.length : null;
  }

  return { DISCIPLINES, normalizeHistoryEntry, readHistory, average };
})();

if (typeof window !== 'undefined') window.StatsStorage = StatsStorage;
