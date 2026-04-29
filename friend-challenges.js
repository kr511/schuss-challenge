/* Schussduell FriendChallenges: SupabaseSocial wrapper */
(function () {
  'use strict';

  function notify(message, type) {
    if (typeof sendNotification === 'function') {
      sendNotification(message, { type: type || 'info' });
      return;
    }
    console.log('[FriendChallenges]', message);
  }

  function socialReady() {
    return !!(
      window.SupabaseSocial &&
      window.SupabaseSession &&
      window.SupabaseSession.user &&
      typeof window.SupabaseSocial.createChallenge === 'function'
    );
  }

  function currentSettings(discipline, difficulty) {
    var game = window.G || {};
    return {
      discipline: discipline || game.discipline || 'lg40',
      difficulty: difficulty || game.diff || 'real',
      weapon: game.weapon || 'lg',
      distance: game.dist || '10',
      shots: Number(game.shots || 40),
      burst: Boolean(game.burst)
    };
  }

  var FriendChallenges = {
    activeChallenges: {},
    currentChallenge: null,
    myChallenges: {},
    currentUserId: null,
    currentUsername: null,
    selectedDiscipline: null,
    selectedDifficulty: null,
    selectedMode: 'async',

    init: function () {
      this.currentUserId = window.SupabaseSession && window.SupabaseSession.user ? window.SupabaseSession.user.id : null;
      this.currentUsername = (window.StorageManager && StorageManager.getRaw('username')) || 'Anonym';
      if (!socialReady()) {
        console.warn('[FriendChallenges] SupabaseSocial nicht bereit. Lokaler Gastmodus ohne Remote-Challenges.');
        return false;
      }
      return true;
    },

    createChallenge: async function (friendId, friendUsername, discipline, difficulty) {
      if (!socialReady()) throw new Error('SupabaseSocial nicht verfuegbar');
      var result = await window.SupabaseSocial.createChallenge(friendId || null, currentSettings(discipline, difficulty));
      if (!result || !result.ok || !result.challenge) throw new Error('Challenge konnte nicht erstellt werden');
      var id = result.challenge.id;
      this.myChallenges[id] = result.challenge;
      notify('Challenge erstellt', 'success');
      return id;
    },

    acceptChallenge: async function (challengeId) {
      if (!window.SupabaseSocial || typeof window.SupabaseSocial.acceptChallenge !== 'function') return false;
      var result = await window.SupabaseSocial.acceptChallenge(challengeId);
      if (!result || !result.ok) return false;
      this.currentChallenge = result.challenge;
      notify('Challenge angenommen', 'success');
      if (window.AsyncChallenge && typeof window.AsyncChallenge.acceptChallenge === 'function') {
        return window.AsyncChallenge.acceptChallenge(challengeId);
      }
      return true;
    },

    declineChallenge: async function (challengeId) {
      delete this.activeChallenges[challengeId];
      notify('Challenge ausgeblendet', 'info');
      return true;
    },

    submitChallengeResult: async function (challengeId, score, shots) {
      var payload = {
        challengeId: challengeId,
        score: Number(score) || 0,
        shots: Array.isArray(shots) ? shots : [],
        submittedAt: Date.now()
      };
      try {
        var stored = JSON.parse(localStorage.getItem('sd_friend_challenge_results') || '[]');
        if (!Array.isArray(stored)) stored = [];
        stored.unshift(payload);
        localStorage.setItem('sd_friend_challenge_results', JSON.stringify(stored.slice(0, 50)));
      } catch (error) {
        console.warn('[FriendChallenges] Lokales Ergebnis konnte nicht gespeichert werden:', error);
      }
      notify('Ergebnis lokal gespeichert', 'success');
      return true;
    },

    openChallengeOverlay: function (friendId, friendUsername) {
      this.pendingFriendId = friendId || null;
      this.pendingFriendUsername = friendUsername || 'Freund';
      this.createChallengeOverlay();
      var overlay = document.getElementById('challengeOverlay');
      if (overlay) overlay.classList.add('active');
    },

    closeChallengeOverlay: function () {
      var overlay = document.getElementById('challengeOverlay');
      if (overlay) overlay.classList.remove('active');
      document.body.style.overflow = '';
    },

    createChallengeOverlay: function () {
      if (document.getElementById('challengeOverlay')) return;
      var overlay = document.createElement('div');
      overlay.id = 'challengeOverlay';
      overlay.className = 'challenge-overlay';
      overlay.innerHTML = [
        '<div class="challenge-sheet">',
        '<div class="challenge-header"><h3>Challenge</h3><button class="challenge-close" onclick="FriendChallenges.closeChallengeOverlay()">x</button></div>',
        '<div class="challenge-body">',
        '<p id="challengeFriendName">Supabase Challenge</p>',
        '<button class="challenge-start-btn" onclick="FriendChallenges.startChallenge()">Challenge erstellen</button>',
        '</div></div>'
      ].join('');
      document.body.appendChild(overlay);
    },

    selectDiscipline: function (discipline, el) {
      this.selectedDiscipline = discipline;
      document.querySelectorAll('.discipline-option').forEach(function (node) { node.classList.remove('selected'); });
      if (el) el.classList.add('selected');
    },

    selectDifficulty: function (difficulty, el) {
      this.selectedDifficulty = difficulty;
      document.querySelectorAll('.difficulty-option').forEach(function (node) { node.classList.remove('selected'); });
      if (el) el.classList.add('selected');
    },

    selectMode: function (mode, el) {
      this.selectedMode = mode || 'async';
      document.querySelectorAll('.mode-option').forEach(function (node) { node.classList.remove('selected'); });
      if (el) el.classList.add('selected');
    },

    startChallenge: async function () {
      try {
        await this.createChallenge(this.pendingFriendId || null, this.pendingFriendUsername || '', this.selectedDiscipline, this.selectedDifficulty);
        this.closeChallengeOverlay();
      } catch (error) {
        notify(error.message || 'Challenge konnte nicht erstellt werden', 'error');
      }
    },

    getState: function () {
      return {
        activeChallenges: this.activeChallenges,
        currentChallenge: this.currentChallenge,
        myChallenges: this.myChallenges
      };
    }
  };

  window.FriendChallenges = FriendChallenges;
  window.openChallengeOverlay = function (friendId, friendName) { FriendChallenges.openChallengeOverlay(friendId, friendName); };
  window.closeChallengeOverlay = function () { FriendChallenges.closeChallengeOverlay(); };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { FriendChallenges.init(); });
  } else {
    FriendChallenges.init();
  }
})();
