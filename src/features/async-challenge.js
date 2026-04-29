/**
 * Async Multi-Spieler Duell System
 * Herausforderungen erstellen, annehmen, asynchron spielen, Ergebnisse vergleichen
 */

const AsyncChallenge = (function() {
  'use strict';

  // State
  const state = {
    myChallenges: [], // Von mir erstellte Challenges
    availableChallenges: [], // Für mich verfügbare Challenges
    acceptedChallenges: [], // Von mir angenommene Challenges
    currentChallenge: null, // Aktuell laufende Challenge
    initialized: false,
  };

  function isLocalMode() {
    try {
      return window.SchussduellLocalMode === true ||
        window.SchussduellLocalPlay === true ||
        localStorage.getItem('sd_local_mode') === '1' ||
        localStorage.getItem('sd_local_play') === '1';
    } catch (e) {
      return false;
    }
  }

  function hasSupabaseSocial() {
    return !!(
      window.SupabaseSocial &&
      window.SupabaseSession &&
      window.SupabaseSession.user &&
      !isLocalMode()
    );
  }

  function getCurrentUserId() {
    if (window.SupabaseSession && window.SupabaseSession.user) return window.SupabaseSession.user.id;
    return null;
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function getCurrentGameSettings() {
    const game = typeof G !== 'undefined' ? G : {};
    return {
      username: game.username || 'Spieler',
      discipline: game.discipline || 'lg40',
      weapon: game.weapon || 'lg',
      distance: game.dist || '10',
      difficulty: game.diff || 'easy',
      shots: Number(game.shots) || 40,
      burst: Boolean(game.burst),
    };
  }

  function parseRemoteTime(value) {
    if (!value) return Date.now();
    if (typeof value === 'number') return value;
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : Date.now();
  }

  function mapSupabaseChallenge(row, kind) {
    return {
      id: row.id,
      challengeId: row.id,
      creatorId: row.creator_id,
      creatorUsername: row.creator_username || getCurrentGameSettings().username,
      friendId: row.opponent_id || null,
      friendUsername: row.opponent_username || 'Öffentlich',
      fromUsername: row.creator_username || 'Spieler',
      discipline: row.discipline || 'lg40',
      weapon: row.weapon || null,
      distance: row.distance || null,
      difficulty: row.difficulty || null,
      shots: Number(row.shots) || 40,
      burst: Boolean(row.burst),
      createdAt: parseRemoteTime(row.created_at),
      acceptedAt: parseRemoteTime(row.accepted_at),
      expiresAt: parseRemoteTime(row.expires_at),
      status: row.status || (kind === 'available' ? 'pending' : 'pending'),
    };
  }

  /**
   * Initialisiert das Async-Challenge-System
   */
  async function init() {
    console.log('⚔️ Async Challenge-System initialisiert');

    if (!hasSupabaseSocial()) {
      state.myChallenges = [];
      state.availableChallenges = [];
      state.acceptedChallenges = [];
      state.initialized = true;
      console.warn('[SupabaseSocial] Async Challenges laufen nur mit Supabase Login. Lokaler Gastmodus zeigt keine Remote-Challenges.');
      return;
    }

    await loadMyChallenges();
    await loadAvailableChallenges();
    state.acceptedChallenges = [];
    state.initialized = true;
    console.log('✅ Async Challenge-System bereit (Supabase)');
  }

  /**
   * Erstellt eine neue Challenge
   */
  async function createChallenge(friendId = null, friendUsername = null) {
    if (!hasSupabaseSocial() || typeof window.SupabaseSocial.createChallenge !== 'function') {
      showChallengeToast('Supabase Login erforderlich', 'error');
      return false;
    }

    const settings = getCurrentGameSettings();
    try {
      const result = await window.SupabaseSocial.createChallenge(friendId, settings);
      if (!result || !result.ok || !result.challenge) {
        showChallengeToast('Fehler beim Erstellen', 'error');
        return false;
      }
      const challengeData = mapSupabaseChallenge(Object.assign({}, result.challenge, { opponent_username: friendUsername || '' }), 'created');
      state.myChallenges.unshift(challengeData);
      renderChallengesList();
      console.log('✅ Supabase Challenge erstellt:', challengeData.id);
      showChallengeToast('⚔️ Challenge erstellt!', 'success');
      return true;
    } catch (e) {
      console.error('Supabase Fehler beim Erstellen:', e);
      showChallengeToast('Fehler beim Erstellen', 'error');
      return false;
    }
  }

  /**
   * Lädt meine erstellten Challenges
   */
  async function loadMyChallenges() {
    if (!getCurrentUserId()) return;
    if (!hasSupabaseSocial() || typeof window.SupabaseSocial.loadCreatedChallenges !== 'function') {
      state.myChallenges = [];
      return;
    }
    try {
      const rows = await window.SupabaseSocial.loadCreatedChallenges();
      state.myChallenges = (rows || []).map(row => mapSupabaseChallenge(row, 'created'));
    } catch (e) {
      console.warn('Supabase Fehler beim Laden meiner Challenges:', e);
      state.myChallenges = [];
    }
  }

  /**
   * Lädt verfügbare Challenges für mich
   */
  async function loadAvailableChallenges() {
    if (!getCurrentUserId()) return;
    if (!hasSupabaseSocial() || typeof window.SupabaseSocial.loadAvailableChallenges !== 'function') {
      state.availableChallenges = [];
      return;
    }
    try {
      const rows = await window.SupabaseSocial.loadAvailableChallenges();
      state.availableChallenges = (rows || []).map(row => mapSupabaseChallenge(row, 'available'));
    } catch (e) {
      console.warn('Supabase Fehler beim Laden verfuegbarer Challenges:', e);
      state.availableChallenges = [];
    }
  }

  /**
   * Lädt angenommene Challenges
   */
  async function loadAcceptedChallenges() {
    state.acceptedChallenges = [];
  }

  /**
   * Nimmt eine Challenge an
   */
  async function acceptChallenge(challengeId) {
    if (!hasSupabaseSocial() || typeof window.SupabaseSocial.acceptChallenge !== 'function') {
      showChallengeToast('Supabase Login erforderlich', 'error');
      return false;
    }

    try {
      const result = await window.SupabaseSocial.acceptChallenge(challengeId);
      if (!result || !result.ok) {
        showChallengeToast('Challenge nicht gefunden', 'error');
        return false;
      }
      const challenge = mapSupabaseChallenge(result.challenge, 'available');
      state.currentChallenge = challenge;
      startChallengeDuel(challenge);
      showChallengeToast('⚔️ Challenge von ' + (challenge.creatorUsername || 'Spieler') + ' angenommen!', 'success');
      if (typeof MobileFeatures !== 'undefined' && MobileFeatures.triggerHaptic) MobileFeatures.triggerHaptic('strong');
      return true;
    } catch (e) {
      console.error('Supabase Fehler beim Annehmen:', e);
      showChallengeToast('Fehler beim Annehmen', 'error');
      return false;
    }
  }

  /**
   * Startet ein Duell mit Challenge-Einstellungen
   */
  function startChallengeDuel(challenge) {
    // Globale Einstellungen setzen
    if (typeof G !== 'undefined') {
      G.discipline = challenge.discipline || G.discipline;
      G.weapon = challenge.weapon || G.weapon;
      G.dist = challenge.distance || G.dist;
      G.diff = challenge.difficulty || G.diff;
      G.shots = Number(challenge.shots) || G.shots;
      G.maxShots = Number(challenge.shots) || G.maxShots;
      G.playerShotsLeft = Number(challenge.shots) || G.playerShotsLeft;
      G.botShotsLeft = Number(challenge.shots) || G.botShotsLeft;
      G.burst = Boolean(challenge.burst);
    }

    // UI aktualisieren
    updateChallengeUI();

    // Duell starten
    if (typeof startBattle === 'function') {
      startBattle();
    } else {
      showChallengeToast('⚠️ Challenge gesetzt, Startfunktion fehlt', 'error');
    }

    showChallengeToast('🎯 Duell startet!', 'success');
  }

  /**
   * Aktualisiert die Challenge-UI während des Duells
   */
  function updateChallengeUI() {
    // Challenge-Banner anzeigen
    const banner = document.getElementById('challengeBanner');
    if (banner && state.currentChallenge) {
      banner.classList.add('active');
      const opponentEl = banner.querySelector('.challenge-opponent');
      const diffEl = banner.querySelector('.challenge-diff');
      if (opponentEl) opponentEl.textContent = `vs ${state.currentChallenge.creatorUsername || 'Spieler'}`;
      if (diffEl) diffEl.textContent = String(state.currentChallenge.difficulty || '').toUpperCase();
    }
  }

  /**
   * Sendet das Duell-Ergebnis
   */
  async function submitResult(score, shots = []) {
    if (!state.currentChallenge) return false;
    const userId = getCurrentUserId() || 'local';
    const settings = getCurrentGameSettings();
    const resultData = {
      challengeId: state.currentChallenge.id,
      challengerId: userId,
      challengerUsername: settings.username,
      score: score,
      shots: shots,
      submittedAt: Date.now(),
      discipline: state.currentChallenge.discipline,
      weapon: state.currentChallenge.weapon,
      difficulty: state.currentChallenge.difficulty,
    };

    try {
      const raw = localStorage.getItem('sd_async_results') || '[]';
      const results = Array.isArray(JSON.parse(raw)) ? JSON.parse(raw) : [];
      results.unshift(resultData);
      localStorage.setItem('sd_async_results', JSON.stringify(results.slice(0, 50)));
      state.currentChallenge.status = 'completed';
      showChallengeToast('📊 Ergebnis lokal gespeichert', 'success');
      return true;
    } catch (e) {
      console.error('Fehler beim Speichern:', e);
      showChallengeToast('Fehler beim Speichern', 'error');
      return false;
    }
  }

  /**
   * Vergleicht die Ergebnisse
   */
  async function compareResults(challengeId, myScore) {
    const raw = localStorage.getItem('sd_async_results') || '[]';
    let results = [];
    try { results = JSON.parse(raw); } catch (e) { results = []; }
    const resultEntries = Array.isArray(results) ? results.filter(r => r.challengeId === challengeId) : [];
    if (resultEntries.length < 2) return;
    const currentUserId = getCurrentUserId();
    const myResult = resultEntries.find(r => r.challengerId === currentUserId) || resultEntries[0];
    const opponentResult = resultEntries.find(r => r.challengerId !== myResult.challengerId);
    if (!opponentResult) return;
    const myFinalScore = Number(myResult.score) || Number(myScore) || 0;
    const opponentFinalScore = Number(opponentResult.score) || 0;
    const result = myFinalScore > opponentFinalScore ? 'win' : (myFinalScore < opponentFinalScore ? 'lose' : 'draw');
    showAsyncResult(myFinalScore, opponentFinalScore, opponentResult.challengerUsername, result);
    if (result === 'win' && typeof awardXP === 'function') awardXP(state.currentChallenge.difficulty);
    state.currentChallenge = null;
  }

  /**
   * Zeigt Async-Duell-Ergebnis
   */
  function showAsyncResult(myScore, opponentScore, opponentName, result) {
    const safeOpponent = escapeHtml(opponentName || 'Gegner');
    const overlay = document.createElement('div');
    overlay.className = 'async-result-overlay';
    overlay.innerHTML = `
      <div class="async-result-card">
        <div class="result-icon">${result === 'win' ? '🏆' : result === 'lose' ? '😔' : '🤝'}</div>
        <div class="result-title">${result === 'win' ? 'SIEG!' : result === 'lose' ? 'NIEDERLAGE' : 'UNENTSCHIEDEN'}</div>
        <div class="result-subtitle">gegen ${safeOpponent}</div>
        
        <div class="result-scores">
          <div class="result-score-item">
            <div class="result-label">Du</div>
            <div class="result-value ${result === 'win' ? 'winner' : ''}">${escapeHtml(myScore)}</div>
          </div>
          <div class="result-divider">vs</div>
          <div class="result-score-item">
            <div class="result-label">${safeOpponent}</div>
            <div class="result-value ${result === 'lose' ? 'winner' : ''}">${escapeHtml(opponentScore)}</div>
          </div>
        </div>

        <button class="result-close-btn" onclick="this.closest('.async-result-overlay').remove()">
          SCHLIEẞEN
        </button>
      </div>
    `;

    document.body.appendChild(overlay);

    setTimeout(() => overlay.classList.add('active'), 10);

    if (typeof MobileFeatures !== 'undefined' && MobileFeatures.triggerHaptic) {
      MobileFeatures.triggerHaptic(result === 'win' ? 'strong' : 'medium');
    }
  }

  /**
   * Zeigt Challenge-Übersicht
   */
  function showChallengesOverlay() {
    let overlay = document.getElementById('challengesOverlay');
    if (!overlay) {
      createChallengesOverlay();
      overlay = document.getElementById('challengesOverlay');
    }

    if (overlay) {
      overlay.classList.add('active');
      renderChallengesList();
    }
  }

  /**
   * Schließt Challenge-Overlay
   */
  function closeChallengesOverlay() {
    const overlay = document.getElementById('challengesOverlay');
    if (overlay) overlay.classList.remove('active');
  }

  /**
   * Erstellt Challenge-Overlay
   */
  function createChallengesOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'challengesOverlay';
    overlay.className = 'challenges-overlay';
    overlay.innerHTML = `
      <div class="challenges-sheet">
        <div class="challenges-header">
          <h3>⚔️ CHALLENGES</h3>
          <button class="challenges-close" onclick="AsyncChallenge.closeChallengesOverlay()">✕</button>
        </div>
        <div class="challenges-body">
          <!-- Neue Challenge -->
          <div class="challenge-create-section">
            <h4>Neue Challenge erstellen</h4>
            <p class="challenge-hint">Erstelle eine Herausforderung mit deinen aktuellen Einstellungen</p>
            <button class="challenge-create-btn" onclick="AsyncChallenge.createChallenge()">
              ⚔️ Challenge erstellen
            </button>
          </div>

          <!-- Verfügbare Challenges -->
          <div class="challenge-available-section">
            <h4>Verfügbare Challenges (<span id="availableChallengesCount">0</span>)</h4>
            <div id="availableChallengesContainer"></div>
          </div>

          <!-- Meine Challenges -->
          <div class="challenge-my-section">
            <h4>Meine Challenges (<span id="myChallengesCount">0</span>)</h4>
            <div id="myChallengesContainer"></div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        closeChallengesOverlay();
      }
    });
  }

  /**
   * Rendert Challenges-Liste
   */
  function renderChallengesList() {
    const availableCount = document.getElementById('availableChallengesCount');
    const myCount = document.getElementById('myChallengesCount');
    if (availableCount) availableCount.textContent = state.availableChallenges.length;
    if (myCount) myCount.textContent = state.myChallenges.length;

    // Verfügbare Challenges
    const availableContainer = document.getElementById('availableChallengesContainer');
    if (availableContainer) {
      if (state.availableChallenges.length === 0) {
        availableContainer.innerHTML = '<div class="challenges-empty">Keine verfügbaren Challenges</div>';
      } else {
        availableContainer.innerHTML = `
          ${state.availableChallenges.map(ch => `
            <div class="challenge-card">
              <div class="challenge-from">${escapeHtml(ch.fromUsername || 'Spieler')}</div>
              <div class="challenge-details">${escapeHtml(ch.discipline || '-')} · ${escapeHtml(ch.difficulty || '-')}</div>
              <div class="challenge-time">${escapeHtml(formatTime(ch.createdAt))}</div>
              <button class="challenge-accept-btn" onclick="AsyncChallenge.acceptChallenge('${escapeHtml(ch.challengeId)}')">
                ✓ Annehmen
              </button>
            </div>
          `).join('')}
        `;
      }
    }

    // Meine Challenges
    const myContainer = document.getElementById('myChallengesContainer');
    if (myContainer) {
      if (state.myChallenges.length === 0) {
        myContainer.innerHTML = '<div class="challenges-empty">Noch keine Challenges erstellt</div>';
      } else {
        myContainer.innerHTML = `
          ${state.myChallenges.map(ch => `
            <div class="challenge-card ${escapeHtml(ch.status || '')}">
              <div class="challenge-opponent">${escapeHtml(ch.friendUsername || 'Öffentlich')}</div>
              <div class="challenge-details">${escapeHtml(ch.discipline || '-')} · ${escapeHtml(ch.difficulty || '-')}</div>
              <div class="challenge-status ${escapeHtml(ch.status || '')}">${escapeHtml(getStatusText(ch.status))}</div>
              <div class="challenge-time">${escapeHtml(formatTime(ch.createdAt))}</div>
            </div>
          `).join('')}
        `;
      }
    }
  }

  /**
   * Hilfsfunktion: Status-Text
   */
  function getStatusText(status) {
    const statusMap = {
      pending: '⏳ Ausstehend',
      accepted: '✅ Angenommen',
      completed: '🏁 Abgeschlossen',
      expired: '⌛ Abgelaufen',
    };
    return statusMap[status] || status || '-';
  }

  /**
   * Hilfsfunktion: Zeit formatieren
   */
  function formatTime(timestamp) {
    if (!timestamp) return '';
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Gerade eben';
    if (minutes < 60) return `vor ${minutes} Min`;
    if (hours < 24) return `vor ${hours} Std`;
    return `vor ${days} Tagen`;
  }

  /**
   * Hilfsfunktion: Challenge-ID generieren
   */
  function generateChallengeId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).slice(2, 11);
    return `challenge_${timestamp}_${random}`;
  }

  /**
   * Hilfsfunktion: Toast anzeigen
   */
  function showChallengeToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `challenge-toast challenge-toast-${type}`;
    toast.textContent = message;

    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  /**
   * Challenge-Button zum Header hinzufügen
   * Button ist jetzt direkt in index.html definiert
   */
  function addChallengeButton() {
    // Button ist bereits im HTML, nichts zu tun
    if (document.getElementById('challengeButton')) {
      console.log('✅ Challenge-Button vorhanden');
    } else {
      console.warn('⚠️ Challenge-Button nicht gefunden');
    }
  }

  /**
   * Challenge-Banner erstellen
   */
  function createChallengeBanner() {
    if (document.getElementById('challengeBanner')) return;

    const banner = document.createElement('div');
    banner.id = 'challengeBanner';
    banner.className = 'challenge-banner';
    banner.innerHTML = `
      <div class="challenge-banner-content">
        <div class="challenge-opponent">vs ---</div>
        <div class="challenge-diff">---</div>
      </div>
    `;

    const dashboard = document.querySelector('.dashboard');
    if (dashboard) {
      dashboard.insertBefore(banner, dashboard.firstChild);
    } else {
      document.body.appendChild(banner);
    }

    console.log('✅ Challenge-Banner erstellt');
  }

  /**
   * Exportiert öffentliche Funktionen
   */
  return {
    init,
    createChallenge,
    acceptChallenge,
    submitResult,
    showChallengesOverlay,
    closeChallengesOverlay,
    addChallengeButton,
    createChallengeBanner,
    // State (readonly)
    getState: () => ({ ...state }),
  };
})();

// Initialisierung
if (typeof window !== 'undefined') {
  window.AsyncChallenge = AsyncChallenge;

  const startAsyncChallenge = () => {
    AsyncChallenge.init()
      .then(() => {
        AsyncChallenge.addChallengeButton();
        AsyncChallenge.createChallengeBanner();
      })
      .catch((error) => {
        console.warn('⚠️ AsyncChallenge konnte nicht initialisiert werden:', error);
      });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startAsyncChallenge);
  } else {
    startAsyncChallenge();
  }

  // Debug export
  if (window.DEBUG) {
    window.AsyncChallengeDebug = AsyncChallenge;
  }

  // Global verfügbar machen
  window.createAsyncChallenge = function(friendId, friendUsername) {
    return AsyncChallenge.createChallenge(friendId, friendUsername);
  };
}
