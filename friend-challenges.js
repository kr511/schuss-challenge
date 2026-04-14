/* ═══════════════════════════════════════════════════════
   FRIEND CHALLENGES: Duell-System für Freunde
   - Challenge erstellen (Disziplin + Schwierigkeit)
   - Challenge annehmen/ablehnen
   - Asynchrones Duell (Challenger schießt zuerst)
   - Ergebnis speichern und vergleichen
   ═══════════════════════════════════════════════════════ */

const FriendChallenges = {
  // ─── State ───
  activeChallenges: {},   // { challengeId: { ... } }
  currentChallenge: null, // Aktuell angenommene Challenge
  myChallenges: {},       // Von mir gesendete Challenges
  currentUserId: null,
  currentUsername: null,

  // ─── Firebase Paths ───
  PATHS: {
    challenges: () => 'friend_challenges_v1',
    userChallenges: (uid) => `friend_challenges_v1/${uid}`,
  },

  // ─── Init ───
  init() {
    if (!fbReady || !fbDb || !fbUser) {
      console.warn('[Challenges] Firebase nicht bereit');
      return false;
    }

    this.currentUserId = fbUser.uid;
    this.currentUsername = StorageManager.getRaw('username') || 'Anonym';

    // Listener für Challenges
    this.setupChallengesListener();

    console.debug('[Challenges] System initialisiert');
    return true;
  },

  // ═══════════════════════════════════════════
  //  CHALLENGE ERSTELLEN
  // ═══════════════════════════════════════════

  /** Neue Challenge erstellen */
  async createChallenge(friendId, friendUsername, discipline, difficulty) {
    if (!fbReady || !fbDb) {
      throw new Error('Firebase nicht verfügbar');
    }

    const challengeId = `challenge_${Date.now()}_${this.currentUserId.substring(0, 8)}`;

    const challengeData = {
      challengeId,
      fromUserId: this.currentUserId,
      fromUsername: this.currentUsername,
      toUserId: friendId,
      toUsername: friendUsername,
      discipline: discipline || G.discipline || 'lg40',
      difficulty: difficulty || G.diff || 'real',
      timestamp: Date.now(),
      status: 'pending', // pending, accepted, completed, declined
      challengerScore: null,
      defenderScore: null,
      challengerShots: [],
      defenderShots: [],
      completedAt: null
    };

    // Challenge in Firebase speichern
    const updates = {};
    updates[`${this.PATHS.challenges()}/${challengeId}`] = challengeData;
    updates[`${this.PATHS.userChallenges(friendId)}/received/${challengeId}`] = true;
    updates[`${this.PATHS.userChallenges(this.currentUserId)}/sent/${challengeId}`] = true;

    await fbDb.ref().update(updates);

    console.debug('[Challenges] Challenge erstellt:', challengeId);
    return challengeId;
  },

  /** Challenge annehmen */
  async acceptChallenge(challengeId) {
    if (!fbReady || !fbDb) return;

    const challenge = this.activeChallenges[challengeId];
    if (!challenge) {
      throw new Error('Challenge nicht gefunden');
    }

    // Status aktualisieren
    await fbDb.ref(`${this.PATHS.challenges()}/${challengeId}`).update({
      status: 'accepted',
      acceptedAt: Date.now()
    });

    this.currentChallenge = challenge;

    console.debug('[Challenges] Challenge angenommen:', challengeId);

    // Battle starten
    this.startChallengeBattle(challenge);
  },

  /** Challenge ablehnen */
  async declineChallenge(challengeId) {
    if (!fbReady || !fbDb) return;

    await fbDb.ref(`${this.PATHS.challenges()}/${challengeId}`).update({
      status: 'declined',
      declinedAt: Date.now()
    });

    delete this.activeChallenges[challengeId];

    console.debug('[Challenges] Challenge abgelehnt:', challengeId);
  },

  /** Challenge-Ergebnis speichern */
  async submitChallengeResult(challengeId, score, shots) {
    if (!fbReady || !fbDb) return;

    const challenge = this.activeChallenges[challengeId] || this.currentChallenge;
    if (!challenge) {
      throw new Error('Challenge nicht gefunden');
    }

    const isChallenger = challenge.fromUserId === this.currentUserId;
    const scoreField = isChallenger ? 'challengerScore' : 'defenderScore';
    const shotsField = isChallenger ? 'challengerShots' : 'defenderShots';

    await fbDb.ref(`${this.PATHS.challenges()}/${challengeId}`).update({
      [scoreField]: score,
      [shotsField]: shots,
      lastUpdate: Date.now()
    });

    // Prüfen ob beide fertig sind
    const updatedChallenge = {
      ...challenge,
      [scoreField]: score,
      [shotsField]: shots
    };

    this.checkChallengeComplete(challengeId, updatedChallenge);

    console.debug('[Challenges] Ergebnis gespeichert:', score);
  },

  /** Prüfen ob Challenge abgeschlossen */
  async checkChallengeComplete(challengeId, challengeData) {
    if (!challengeData.challengerScore || !challengeData.defenderScore) {
      return; // Noch nicht beide fertig
    }

    // Winner bestimmen
    let winner, status;
    if (challengeData.challengerScore > challengeData.defenderScore) {
      winner = challengeData.fromUserId;
      status = 'challenger_wins';
    } else if (challengeData.defenderScore > challengeData.challengerScore) {
      winner = challengeData.toUserId;
      status = 'defender_wins';
    } else {
      winner = 'draw';
      status = 'draw';
    }

    await fbDb.ref(`${this.PATHS.challenges()}/${challengeId}`).update({
      status: 'completed',
      winner,
      resultStatus: status,
      completedAt: Date.now()
    });

    // Ergebnis anzeigen
    this.showChallengeResult(challengeData, status);

    console.debug('[Challenges] Challenge abgeschlossen:', status);
  },

  // ═══════════════════════════════════════════
  //  UI: CHALLENGE OVERLAY
  // ═══════════════════════════════════════════

  /** Challenge-Overlay öffnen */
  openChallengeOverlay(friendId, friendUsername) {
    const overlay = document.getElementById('challengeOverlay');
    if (!overlay) {
      this.createChallengeOverlay();
    }

    // Daten setzen
    document.getElementById('challengeFriendName').textContent = friendUsername;
    document.getElementById('challengeFriendId').value = friendId;

    // Overlay anzeigen
    document.getElementById('challengeOverlay').classList.add('active');
    document.body.style.overflow = 'hidden';

    // Sfx
    if (typeof Sfx !== 'undefined') Sfx.play('click');
  },

  /** Challenge-Overlay erstellen (falls nicht vorhanden) */
  createChallengeOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'challengeOverlay';
    overlay.className = 'challenge-overlay';
    overlay.innerHTML = `
      <div class="challenge-card">
        <button class="challenge-close" onclick="FriendChallenges.closeChallengeOverlay()">✕</button>
        
        <div class="challenge-title">🎯 Herausfordern</div>
        <div class="challenge-subtitle">gegen <span id="challengeFriendName"></span></div>

        <input type="hidden" id="challengeFriendId">

        <!-- Disziplin -->
        <div class="challenge-section">
          <div class="challenge-label">Disziplin</div>
          <div class="challenge-discipline-grid">
            <button class="discipline-btn ${G.discipline === 'lg40' ? 'active' : ''}" 
                    onclick="FriendChallenges.selectDiscipline('lg40', this)">
              🎯 LG 40
            </button>
            <button class="discipline-btn ${G.discipline === 'lg60' ? 'active' : ''}" 
                    onclick="FriendChallenges.selectDiscipline('lg60', this)">
              ⭐ LG 60
            </button>
            <button class="discipline-btn ${G.discipline === 'kk50' ? 'active' : ''}" 
                    onclick="FriendChallenges.selectDiscipline('kk50', this)">
              🎯 KK 50m
            </button>
            <button class="discipline-btn ${G.discipline === 'kk100' ? 'active' : ''}" 
                    onclick="FriendChallenges.selectDiscipline('kk100', this)">
              🎯 KK 100m
            </button>
          </div>
        </div>

        <!-- Schwierigkeit -->
        <div class="challenge-section">
          <div class="challenge-label">Schwierigkeit</div>
          <div class="challenge-difficulty-grid">
            <button class="difficulty-btn easy ${G.diff === 'easy' ? 'active' : ''}" 
                    onclick="FriendChallenges.selectDifficulty('easy', this)">
              😊 Einfach
            </button>
            <button class="difficulty-btn real ${G.diff === 'real' ? 'active' : ''}" 
                    onclick="FriendChallenges.selectDifficulty('real', this)">
              🎯 Mittel
            </button>
            <button class="difficulty-btn hard ${G.diff === 'hard' ? 'active' : ''}" 
                    onclick="FriendChallenges.selectDifficulty('hard', this)">
              💪 Elite
            </button>
            <button class="difficulty-btn elite ${G.diff === 'elite' ? 'active' : ''}" 
                    onclick="FriendChallenges.selectDifficulty('elite', this)">
              💫 Profi
            </button>
          </div>
        </div>

        <!-- Modus -->
        <div class="challenge-section">
          <div class="challenge-label">Modus</div>
          <div class="challenge-mode-grid">
            <button class="mode-btn live ${true ? 'active' : ''}" 
                    onclick="FriendChallenges.selectMode('live', this)">
              ⚡ Live
              <small>Gleichzeitig spielen</small>
            </button>
            <button class="mode-btn async" 
                    onclick="FriendChallenges.selectMode('async', this)">
              🔄 Asynchron
              <small>Challenger schießt zuerst</small>
            </button>
          </div>
        </div>

        <button class="challenge-start-btn" onclick="FriendChallenges.startChallenge()">
          🎯 CHALLENGE STARTEN
        </button>
      </div>
    `;

    document.body.appendChild(overlay);
  },

  /** Challenge-Overlay schließen */
  closeChallengeOverlay() {
    const overlay = document.getElementById('challengeOverlay');
    if (overlay) {
      overlay.classList.remove('active');
      document.body.style.overflow = '';
    }
  },

  // ─── Auswahl ───

  selectedDiscipline: 'lg40',
  selectedDifficulty: 'real',
  selectedMode: 'live',

  selectDiscipline(disc, btn) {
    this.selectedDiscipline = disc;
    document.querySelectorAll('.discipline-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    if (typeof Sfx !== 'undefined') Sfx.play('click');
  },

  selectDifficulty(diff, btn) {
    this.selectedDifficulty = diff;
    document.querySelectorAll('.difficulty-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    if (typeof Sfx !== 'undefined') Sfx.play('click');
  },

  selectMode(mode, btn) {
    this.selectedMode = mode;
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    if (typeof Sfx !== 'undefined') Sfx.play('click');
  },

  /** Challenge starten */
  async startChallenge() {
    const friendId = document.getElementById('challengeFriendId').value;
    const friendName = document.getElementById('challengeFriendName').textContent;

    if (!friendId) {
      showNotification('❌ Freund nicht ausgewählt', 'error');
      return;
    }

    try {
      const challengeId = await this.createChallenge(
        friendId,
        friendName,
        this.selectedDiscipline,
        this.selectedDifficulty
      );

      this.closeChallengeOverlay();

      if (this.selectedMode === 'live') {
        // Live: Battle direkt starten (wartet auf Freund)
        showNotification(`✅ Challenge an ${friendName} gesendet!`);
      } else {
        // Async: Challenger schießt zuerst
        showNotification(`✅ Challenge erstellt! Du schießt zuerst.`);
        this.startChallengeBattle({
          challengeId,
          fromUserId: this.currentUserId,
          discipline: this.selectedDiscipline,
          difficulty: this.selectedDifficulty
        });
      }
    } catch (error) {
      showNotification(`❌ ${error.message}`, 'error');
    }
  },

  // ═══════════════════════════════════════════
  //  BATTLE-INTEGRATION
  // ═══════════════════════════════════════════

  /** Challenge-Battle starten */
  startChallengeBattle(challenge) {
    // G-State für Friend-Challenge setzen
    G.friendChallenge = {
      challengeId: challenge.challengeId,
      friendId: challenge.toUserId || challenge.fromUserId,
      friendUsername: challenge.toUsername || challenge.fromUsername,
      isChallenger: challenge.fromUserId === this.currentUserId
    };

    // Disziplin und Schwierigkeit setzen
    G.discipline = challenge.discipline || G.discipline;
    G.diff = challenge.difficulty || G.diff;

    // Overlay schließen
    this.closeChallengeOverlay();

    // Battle starten
    if (typeof startBattle === 'function') {
      startBattle();
    }

    console.debug('[Challenges] Challenge-Battle gestartet');
  },

  /** Challenge-Ergebnis anzeigen */
  showChallengeResult(challenge, status) {
    const isChallenger = challenge.fromUserId === this.currentUserId;
    const myScore = isChallenger ? challenge.challengerScore : challenge.defenderScore;
    const opponentScore = isChallenger ? challenge.defenderScore : challenge.challengerScore;
    const opponentName = isChallenger ? challenge.toUsername : challenge.fromUsername;

    let resultEmoji, resultText, resultClass;
    if (status === 'draw') {
      resultEmoji = '🤝';
      resultText = 'Unentschieden!';
      resultClass = 'draw';
    } else if ((isChallenger && status === 'challenger_wins') || (!isChallenger && status === 'defender_wins')) {
      resultEmoji = '🏆';
      resultText = `Du hast gegen ${opponentName} gewonnen!`;
      resultClass = 'win';
    } else {
      resultEmoji = '😔';
      resultText = `${opponentName} hat gewonnen!`;
      resultClass = 'lose';
    }

    // Share-Card-ähnliches Overlay anzeigen
    if (typeof showShareCard === 'function') {
      showShareCard({
        resultEmoji,
        resultText,
        playerScore: myScore,
        opponentScore,
        opponentName,
        discipline: challenge.discipline,
        difficulty: challenge.difficulty
      });
    }

    // Challenge zurücksetzen
    this.currentChallenge = null;
    G.friendChallenge = null;
  },

  // ═══════════════════════════════════════════
  //  LISTENER
  // ═══════════════════════════════════════════

  setupChallengesListener() {
    if (!fbReady || !fbDb) return;

    // Auf neue Challenges hören
    const ref = fbDb.ref(this.PATHS.challenges());

    ref.on('child_added', (snapshot) => {
      const challenge = snapshot.val();
      if (challenge.toUserId === this.currentUserId && challenge.status === 'pending') {
        this.activeChallenges[snapshot.key] = challenge;

        // Notification anzeigen
        showNotification(`🎯 ${challenge.fromUsername} fordert dich heraus!`);
      }
    });

    ref.on('child_changed', (snapshot) => {
      const challenge = snapshot.val();
      const key = snapshot.key;

      if (challenge.toUserId === this.currentUserId || challenge.fromUserId === this.currentUserId) {
        this.activeChallenges[key] = challenge;

        // Status-Update verarbeiten
        if (challenge.status === 'accepted' && challenge.toUserId === this.currentUserId) {
          // Freund hat unsere Challenge angenommen
          showNotification(`✅ ${challenge.toUsername} hat deine Challenge angenommen!`);
        }

        if (challenge.status === 'completed') {
          this.showChallengeResult(challenge, challenge.resultStatus);
          delete this.activeChallenges[key];
        }
      }
    });
  },

  // ═══════════════════════════════════════════
  //  HILFSFUNKTIONEN
  // ═══════════════════════════════════════════

  getPendingChallengeCount() {
    return Object.values(this.activeChallenges)
      .filter(c => c.toUserId === this.currentUserId && c.status === 'pending').length;
  }
};

// Window-Funktionen für onclick
window.openChallengeOverlay = (friendId, friendName) => 
  FriendChallenges.openChallengeOverlay(friendId, friendName);
window.closeChallengeOverlay = () => FriendChallenges.closeChallengeOverlay();

// Auto-init
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    if (typeof fbReady !== 'undefined' && fbReady) {
      FriendChallenges.init();
    }
  }, 2500);
});
