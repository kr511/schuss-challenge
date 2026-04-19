/**
 * Async Multi-Spieler Duell System
 * Herausforderungen erstellen, annehmen, asynchron spielen, Ergebnisse vergleichen
 */

const AsyncChallenge = (function() {
  'use strict';

  // Firebase-Pfade
  const FIREBASE_PATHS = {
    challenges: 'async_challenges_v1',
    results: 'async_results_v1',
    activeChallenges: 'active_challenges_v1',
  };

  // State
  const state = {
    myChallenges: [], // Von mir erstellte Challenges
    availableChallenges: [], // Für mich verfügbare Challenges
    acceptedChallenges: [], // Von mir angenommene Challenges
    currentChallenge: null, // Aktuell laufende Challenge
    lastOpponent: null,     // { id, username } für Rematch
    lastSettings: null,     // Settings der letzten Challenge für Rematch
    initialized: false,
  };

  function escapeHtml(str) {
    const d = document.createElement('div');
    d.textContent = str || '';
    return d.innerHTML;
  }

  /**
   * Initialisiert das Async-Challenge-System
   */
  async function init() {
    console.log('⚔️ Async Challenge-System initialisiert');

    if (!fbReady || !fbDb) {
      console.warn('⚠️ Firebase nicht verfügbar, Async Challenges deaktiviert');
      return;
    }

    await loadMyChallenges();
    await loadAvailableChallenges();
    await loadAcceptedChallenges();

    state.initialized = true;
    console.log('✅ Async Challenge-System bereit');
  }

  /**
   * Erstellt eine neue Challenge
   */
  async function createChallenge(friendId = null, friendUsername = null) {
    const userId = getFirebaseOwnerId();
    if (!userId) {
      console.error('❌ Keine User-ID verfügbar');
      return false;
    }

    const commentEl = document.getElementById('challengeCommentInput');
    const comment = commentEl ? commentEl.value.trim().slice(0, 120) || null : null;

    // Challenge-Daten
    const challengeData = {
      id: generateChallengeId(),
      creatorId: userId,
      creatorUsername: G.username,
      friendId: friendId,
      friendUsername: friendUsername,
      discipline: G.discipline,
      weapon: G.weapon,
      distance: G.dist,
      difficulty: G.diff,
      shots: G.shots,
      burst: G.burst,
      comment: comment,
      createdAt: Date.now(),
      status: 'pending', // pending, accepted, completed, expired
      expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000), // 7 Tage gültig
    };

    try {
      // In Firebase speichern
      await fbDb.ref(`${FIREBASE_PATHS.challenges}/${challengeData.id}`).set(challengeData);

      // Wenn Freund ausgewählt, in dessen verfügbare Challenges
      if (friendId) {
        await fbDb.ref(`${FIREBASE_PATHS.activeChallenges}/${friendId}/${challengeData.id}`).set({
          challengeId: challengeData.id,
          fromUsername: G.username,
          discipline: G.discipline,
          difficulty: G.diff,
          createdAt: Date.now(),
          expiresAt: challengeData.expiresAt,
        });
      }

      state.myChallenges.push(challengeData);

      console.log('✅ Challenge erstellt:', challengeData.id);
      showChallengeToast('⚔️ Challenge erstellt!', 'success');
      return true;
    } catch (e) {
      console.error('Fehler beim Erstellen:', e);
      showChallengeToast('❌ Fehler beim Erstellen', 'error');
      return false;
    }
  }

  /**
   * Startet eine Revanche mit dem letzten Gegner und den Original-Settings
   */
  function rematch() {
    if (!state.lastOpponent) return;
    const { id, username } = state.lastOpponent;
    const s = state.lastSettings;
    if (s) {
      G.discipline = s.discipline;
      G.weapon = s.weapon;
      G.dist = s.distance;
      G.diff = s.difficulty;
      G.shots = s.shots;
      G.burst = s.burst;
    }
    document.querySelector('.async-result-overlay')?.remove();
    createChallenge(id, username);
    if (typeof triggerHaptic === 'function') triggerHaptic();
  }

  /**
   * Lädt meine erstellten Challenges
   */
  async function loadMyChallenges() {
    const userId = getFirebaseOwnerId();
    if (!userId) return;

    try {
      const snapshot = await fbDb.ref(FIREBASE_PATHS.challenges)
        .orderByChild('creatorId')
        .equalTo(userId)
        .once('value');

      if (snapshot.exists()) {
        state.myChallenges = [];
        snapshot.forEach(child => {
          state.myChallenges.push(child.val());
        });
      }
    } catch (e) {
      console.warn('Fehler beim Laden meiner Challenges:', e);
    }
  }

  /**
   * Lädt verfügbare Challenges für mich
   */
  async function loadAvailableChallenges() {
    const userId = getFirebaseOwnerId();
    if (!userId) return;

    try {
      const snapshot = await fbDb.ref(`${FIREBASE_PATHS.activeChallenges}/${userId}`).once('value');

      if (snapshot.exists()) {
        state.availableChallenges = [];
        snapshot.forEach(child => {
          state.availableChallenges.push(child.val());
        });
      }
    } catch (e) {
      console.warn('Fehler beim Laden verfügbarer Challenges:', e);
    }
  }

  /**
   * Lädt angenommene Challenges
   */
  async function loadAcceptedChallenges() {
    const userId = getFirebaseOwnerId();
    if (!userId) return;

    try {
      const snapshot = await fbDb.ref(FIREBASE_PATHS.results)
        .orderByChild('challengerId')
        .equalTo(userId)
        .once('value');

      if (snapshot.exists()) {
        state.acceptedChallenges = [];
        snapshot.forEach(child => {
          state.acceptedChallenges.push(child.val());
        });
      }
    } catch (e) {
      console.warn('Fehler beim Laden angenommener Challenges:', e);
    }
  }

  /**
   * Nimmt eine Challenge an
   */
  async function acceptChallenge(challengeId) {
    const userId = getFirebaseOwnerId();
    if (!userId) return false;

    try {
      // Challenge-Daten holen
      const snapshot = await fbDb.ref(`${FIREBASE_PATHS.challenges}/${challengeId}`).once('value');
      const challenge = snapshot.val();

      if (!challenge) {
        showChallengeToast('❌ Challenge nicht gefunden', 'error');
        return false;
      }

      if (challenge.status !== 'pending') {
        showChallengeToast('❌ Challenge nicht mehr verfügbar', 'error');
        return false;
      }

      // Challenge als angenommen markieren
      await fbDb.ref(`${FIREBASE_PATHS.challenges}/${challengeId}`).update({
        status: 'accepted',
        acceptedBy: userId,
        acceptedAt: Date.now(),
      });

      // Zu meinen Challenges hinzufügen
      state.currentChallenge = challenge;

      // Duell starten mit Challenge-Einstellungen
      startChallengeDuel(challenge);

      const commentText = challenge.comment ? ` 💬 „${escapeHtml(challenge.comment)}"` : '';
      showChallengeToast(`⚔️ Challenge von ${challenge.creatorUsername} angenommen!${commentText}`, 'success');

      if (typeof MobileFeatures !== 'undefined' && MobileFeatures.triggerHaptic) {
        MobileFeatures.triggerHaptic('strong');
      }

      return true;
    } catch (e) {
      console.error('Fehler beim Annehmen:', e);
      showChallengeToast('❌ Fehler beim Annehmen', 'error');
      return false;
    }
  }

  /**
   * Startet ein Duell mit Challenge-Einstellungen
   */
  function startChallengeDuel(challenge) {
    // Globale Einstellungen setzen
    G.discipline = challenge.discipline;
    G.weapon = challenge.weapon;
    G.dist = challenge.distance;
    G.diff = challenge.difficulty;
    G.shots = challenge.shots;
    G.burst = challenge.burst;

    // UI aktualisieren
    updateChallengeUI();

    // Duell starten
    if (typeof startBattle === 'function') {
      startBattle();
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
      banner.querySelector('.challenge-opponent').textContent =
        `vs ${state.currentChallenge.creatorUsername}`;
      banner.querySelector('.challenge-diff').textContent =
        state.currentChallenge.difficulty.toUpperCase();
    }
  }

  /**
   * Sendet das Duell-Ergebnis
   */
  async function submitResult(score, shots = []) {
    if (!state.currentChallenge) return false;

    const userId = getFirebaseOwnerId();
    const resultData = {
      challengeId: state.currentChallenge.id,
      challengerId: userId,
      challengerUsername: G.username,
      score: score,
      shots: shots,
      submittedAt: Date.now(),
      discipline: state.currentChallenge.discipline,
      weapon: state.currentChallenge.weapon,
      difficulty: state.currentChallenge.difficulty,
    };

    try {
      // Ergebnis in Firebase speichern
      await fbDb.ref(`${FIREBASE_PATHS.results}/${state.currentChallenge.id}/${userId}`).set(resultData);

      // Challenge-Status aktualisieren
      await fbDb.ref(`${FIREBASE_PATHS.challenges}/${state.currentChallenge.id}`).update({
        status: 'completed',
        completedAt: Date.now(),
      });

      // Gegnerisches Ergebnis laden und vergleichen
      await compareResults(state.currentChallenge.id, score);

      showChallengeToast('📊 Ergebnis übermittelt!', 'success');
      return true;
    } catch (e) {
      console.error('Fehler beim Übermitteln:', e);
      showChallengeToast('❌ Fehler beim Übermitteln', 'error');
      return false;
    }
  }

  /**
   * Vergleicht die Ergebnisse
   */
  async function compareResults(challengeId, myScore) {
    try {
      const snapshot = await fbDb.ref(`${FIREBASE_PATHS.results}/${challengeId}`).once('value');

      if (!snapshot.exists()) return;

      const results = snapshot.val();
      const resultEntries = Object.values(results);

      if (resultEntries.length < 2) return; // Noch nicht alle Ergebnisse da

      // Ergebnisse vergleichen
      const myResult = resultEntries.find(r => r.challengerId === getFirebaseOwnerId());
      const opponentResult = resultEntries.find(r => r.challengerId !== getFirebaseOwnerId());

      if (!myResult || !opponentResult) return;

      const myFinalScore = myResult.score;
      const opponentFinalScore = opponentResult.score;

      let result = '';
      if (myFinalScore > opponentFinalScore) {
        result = 'win';
      } else if (myFinalScore < opponentFinalScore) {
        result = 'lose';
      } else {
        result = 'draw';
      }

      const originalSettings = state.currentChallenge ? {
        discipline: state.currentChallenge.discipline,
        weapon: state.currentChallenge.weapon,
        distance: state.currentChallenge.distance,
        difficulty: state.currentChallenge.difficulty,
        shots: state.currentChallenge.shots,
        burst: state.currentChallenge.burst,
      } : null;

      const comment = state.currentChallenge?.comment || null;

      // Ergebnis-Overlay anzeigen (vor dem Nullsetzen von currentChallenge)
      showAsyncResult(myFinalScore, opponentFinalScore, opponentResult.challengerUsername, result,
        opponentResult.challengerId, originalSettings, comment);

      // XP vergeben
      if (result === 'win' && typeof awardXP === 'function') {
        awardXP(state.currentChallenge.difficulty);
      }

      state.currentChallenge = null;
    } catch (e) {
      console.error('Fehler beim Vergleichen:', e);
    }
  }

  /**
   * Zeigt Async-Duell-Ergebnis
   */
  function showAsyncResult(myScore, opponentScore, opponentName, result, opponentId, originalSettings, comment) {
    // Rematch-State speichern
    state.lastOpponent = opponentId ? { id: opponentId, username: opponentName } : null;
    state.lastSettings = originalSettings || null;

    const overlay = document.createElement('div');
    overlay.className = 'async-result-overlay';
    overlay.innerHTML = `
      <div class="async-result-card">
        <div class="result-icon">${result === 'win' ? '🏆' : result === 'lose' ? '😔' : '🤝'}</div>
        <div class="result-title">${result === 'win' ? 'SIEG!' : result === 'lose' ? 'NIEDERLAGE' : 'UNENTSCHIEDEN'}</div>
        <div class="result-subtitle">gegen ${escapeHtml(opponentName)}</div>
        ${comment ? `<div class="challenge-result-comment">💬 „${escapeHtml(comment)}"</div>` : ''}

        <div class="result-scores">
          <div class="result-score-item">
            <div class="result-label">Du</div>
            <div class="result-value ${result === 'win' ? 'winner' : ''}">${myScore}</div>
          </div>
          <div class="result-divider">vs</div>
          <div class="result-score-item">
            <div class="result-label">${escapeHtml(opponentName)}</div>
            <div class="result-value ${result === 'lose' ? 'winner' : ''}">${opponentScore}</div>
          </div>
        </div>

        ${opponentId ? `
        <button class="result-rematch-btn" onclick="AsyncChallenge.rematch()">
          🔁 Revanche
        </button>
        ` : ''}
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
    const overlay = document.getElementById('challengesOverlay');
    if (!overlay) {
      createChallengesOverlay();
      return;
    }

    overlay.classList.add('active');
    renderChallengesList();
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
            <textarea id="challengeCommentInput" maxlength="120"
              placeholder="💬 Optional: Nachricht an den Gegner…"
              style="width:100%;background:rgba(255,255,255,0.05);border:1.5px solid rgba(255,255,255,0.1);border-radius:12px;padding:10px 14px;color:#fff;font-family:Outfit,sans-serif;font-size:0.8rem;resize:none;height:56px;margin-bottom:10px;box-sizing:border-box;"></textarea>
            <button class="challenge-create-btn" onclick="AsyncChallenge.createChallenge()">
              ⚔️ Challenge erstellen
            </button>
          </div>

          <!-- Verfügbare Challenges -->
          <div class="challenge-available-section">
            <h4>Verfügbare Challenges (${state.availableChallenges.length})</h4>
            <div id="availableChallengesContainer"></div>
          </div>

          <!-- Meine Challenges -->
          <div class="challenge-my-section">
            <h4>Meine Challenges (${state.myChallenges.length})</h4>
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
    // Verfügbare Challenges
    const availableContainer = document.getElementById('availableChallengesContainer');
    if (availableContainer) {
      if (state.availableChallenges.length === 0) {
        availableContainer.innerHTML = '<div class="challenges-empty">Keine verfügbaren Challenges</div>';
      } else {
        availableContainer.innerHTML = `
          ${state.availableChallenges.map(ch => `
            <div class="challenge-card">
              <div class="challenge-from">${escapeHtml(ch.fromUsername)}</div>
              <div class="challenge-details">${escapeHtml(ch.discipline)} · ${escapeHtml(ch.difficulty)}</div>
              <div class="challenge-time">${formatTime(ch.createdAt)}</div>
              <button class="challenge-accept-btn" onclick="AsyncChallenge.acceptChallenge('${ch.challengeId}')">
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
            <div class="challenge-card ${ch.status}">
              <div class="challenge-opponent">${escapeHtml(ch.friendUsername || 'Öffentlich')}</div>
              <div class="challenge-details">${escapeHtml(ch.discipline)} · ${escapeHtml(ch.difficulty)}</div>
              <div class="challenge-status ${ch.status}">${getStatusText(ch.status)}</div>
              <div class="challenge-time">${formatTime(ch.createdAt)}</div>
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
    return statusMap[status] || status;
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
    const random = Math.random().toString(36).substr(2, 9);
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
    rematch,
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
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      AsyncChallenge.init().then(() => {
        AsyncChallenge.addChallengeButton();
        AsyncChallenge.createChallengeBanner();
      });
    });
  } else {
    AsyncChallenge.init().then(() => {
      AsyncChallenge.addChallengeButton();
      AsyncChallenge.createChallengeBanner();
    });
  }

  // Debug export
  if (window.DEBUG) {
    window.AsyncChallenge = AsyncChallenge;
  }

  // Global verfügbar machen
  window.AsyncChallenge = AsyncChallenge;
  window.createAsyncChallenge = function(friendId, friendUsername) {
    return AsyncChallenge.createChallenge(friendId, friendUsername);
  };
}
