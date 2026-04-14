/**
 * Freundesliste System
 * Freunde hinzufügen, Friend-Requests, Online-Status, Firebase-Sync
 */

const FriendsSystem = (function() {
  'use strict';

  // Firebase-Pfade
  const FIREBASE_PATHS = {
    friends: 'friends_v1',
    friendRequests: 'friend_requests_v1',
    userCodes: 'user_codes_v1',
    onlineStatus: 'online_status_v1',
  };

  // State
  const state = {
    friends: [],
    pendingRequests: [],
    sentRequests: [],
    userCode: null,
    currentUserId: null,
    initialized: false,
  };

  /**
   * Generiert einen 6-stelligen Freundes-Code
   */
  function generateUserCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  /**
   * Initialisiert das Freundes-System
   */
  async function init() {
    console.log('👥 Freundes-System initialisiert');

    // User-ID holen
    state.currentUserId = getFirebaseOwnerId() || StorageManager.getRaw('userId');
    
    if (!state.currentUserId) {
      console.warn('⚠️ Keine User-ID verfügbar, Freundes-System deaktiviert');
      return;
    }

    // Benutzer-Code laden oder generieren
    await loadOrCreateUserCode();

    // Freunde laden
    await loadFriends();

    // Pending Requests laden
    await loadPendingRequests();

    // Online-Status aktualisieren
    updateOnlineStatus();

    state.initialized = true;
    console.log('✅ Freundes-System bereit');
  }

  /**
   * Lädt oder generiert User-Code
   */
  async function loadOrCreateUserCode() {
    // Local gespeichert?
    const localCode = StorageManager.getRaw('friendCode');
    if (localCode) {
      state.userCode = localCode;
      return;
    }

    // Firebase check
    if (fbReady && fbDb) {
      try {
        const snapshot = await fbDb.ref(`${FIREBASE_PATHS.userCodes}/${state.currentUserId}`).once('value');
        const data = snapshot.val();
        
        if (data && data.code) {
          state.userCode = data.code;
        } else {
          // Generieren und speichern
          state.userCode = generateUserCode();
          await fbDb.ref(`${FIREBASE_PATHS.userCodes}/${state.currentUserId}`).set({
            code: state.userCode,
            userId: state.currentUserId,
            username: G.username,
            createdAt: Date.now(),
          });
        }
      } catch (e) {
        console.warn('Firebase Code-Laden fehlgeschlagen:', e);
        // Local generieren
        state.userCode = generateUserCode();
      }
    } else {
      state.userCode = generateUserCode();
    }

    // Local speichern
    StorageManager.setRaw('friendCode', state.userCode);
  }

  /**
   * Lädt die Freundesliste
   */
  async function loadFriends() {
    if (!fbReady || !fbDb) {
      // Local fallback
      const localFriends = StorageManager.getRaw('friends');
      state.friends = localFriends ? JSON.parse(localFriends) : [];
      return;
    }

    try {
      const snapshot = await fbDb.ref(`${FIREBASE_PATHS.friends}/${state.currentUserId}`).once('value');
      const data = snapshot.val();
      
      if (data) {
        state.friends = Object.values(data);
        StorageManager.setRaw('friends', JSON.stringify(state.friends));
      } else {
        state.friends = [];
      }
    } catch (e) {
      console.warn('Firebase Freunde-Laden fehlgeschlagen:', e);
      const localFriends = StorageManager.getRaw('friends');
      state.friends = localFriends ? JSON.parse(localFriends) : [];
    }

    renderFriendsList();
  }

  /**
   * Lädt ausstehende Friend-Requests
   */
  async function loadPendingRequests() {
    if (!fbReady || !fbDb) {
      state.pendingRequests = [];
      return;
    }

    try {
      const snapshot = await fbDb.ref(`${FIREBASE_PATHS.friendRequests}/${state.currentUserId}/received`).once('value');
      const data = snapshot.val();
      
      if (data) {
        state.pendingRequests = Object.values(data);
      } else {
        state.pendingRequests = [];
      }

      // Sent requests
      const sentSnapshot = await fbDb.ref(`${FIREBASE_PATHS.friendRequests}/${state.currentUserId}/sent`).once('value');
      const sentData = sentSnapshot.val();
      state.sentRequests = sentData ? Object.values(sentData) : [];
    } catch (e) {
      console.warn('Firebase Requests-Laden fehlgeschlagen:', e);
      state.pendingRequests = [];
      state.sentRequests = [];
    }

    renderPendingRequests();
  }

  /**
   * Fügt einen Freund über Code hinzu
   */
  async function addFriendByCode(code) {
    if (!code || code.length !== 6) {
      showFriendToast('❌ Ungültiger Code', 'error');
      return false;
    }

    if (code === state.userCode) {
      showFriendToast('❌ Du kannst dich nicht selbst hinzufügen', 'error');
      return false;
    }

    // Prüfe ob bereits Freund
    const alreadyFriend = state.friends.find(f => f.code === code.toUpperCase());
    if (alreadyFriend) {
      showFriendToast('ℹ️ Bereits dein Freund', 'info');
      return false;
    }

    // User-Code in Firebase finden
    if (!fbReady || !fbDb) {
      showFriendToast('❌ Firebase nicht verfügbar', 'error');
      return false;
    }

    try {
      // Suche nach User mit diesem Code
      const codeSnapshot = await fbDb.ref(FIREBASE_PATHS.userCodes).orderByChild('code').equalTo(code.toUpperCase()).once('value');
      
      if (!codeSnapshot.exists()) {
        showFriendToast('❌ Code nicht gefunden', 'error');
        return false;
      }

      let targetUserId = null;
      let targetUsername = null;

      codeSnapshot.forEach(child => {
        const data = child.val();
        targetUserId = data.userId;
        targetUsername = data.username;
      });

      if (!targetUserId) {
        showFriendToast('❌ User nicht gefunden', 'error');
        return false;
      }

      // Prüfe ob bereits Request gesendet
      const alreadySent = state.sentRequests.find(r => r.userId === targetUserId);
      if (alreadySent) {
        showFriendToast('ℹ️ Bereits Anfrage gesendet', 'info');
        return false;
      }

      // Sende Friend-Request
      await fbDb.ref(`${FIREBASE_PATHS.friendRequests}/${targetUserId}/received/${state.currentUserId}`).set({
        fromUserId: state.currentUserId,
        fromUsername: G.username,
        fromCode: state.userCode,
        timestamp: Date.now(),
      });

      // Speichere als gesendet
      await fbDb.ref(`${FIREBASE_PATHS.friendRequests}/${state.currentUserId}/sent/${targetUserId}`).set({
        toUserId: targetUserId,
        toUsername: targetUsername,
        toCode: code.toUpperCase(),
        timestamp: Date.now(),
      });

      state.sentRequests.push({
        userId: targetUserId,
        username: targetUsername,
        timestamp: Date.now(),
      });

      renderPendingRequests();
      showFriendToast(`✅ Anfrage an ${targetUsername} gesendet!`, 'success');

      if (typeof MobileFeatures !== 'undefined' && MobileFeatures.triggerHaptic) {
        MobileFeatures.triggerHaptic('medium');
      }

      return true;
    } catch (e) {
      console.error('Fehler beim Hinzufügen:', e);
      showFriendToast('❌ Fehler aufgetreten', 'error');
      return false;
    }
  }

  /**
   * Akzeptiert einen Friend-Request
   */
  async function acceptRequest(fromUserId) {
    if (!fbReady || !fbDb) {
      showFriendToast('❌ Firebase nicht verfügbar', 'error');
      return false;
    }

    try {
      // Request-Daten holen
      const snapshot = await fbDb.ref(`${FIREBASE_PATHS.friendRequests}/${state.currentUserId}/received/${fromUserId}`).once('value');
      const requestData = snapshot.val();

      if (!requestData) {
        showFriendToast('❌ Request nicht gefunden', 'error');
        return false;
      }

      // Füge zu Freunden hinzu (beidseitig)
      await fbDb.ref(`${FIREBASE_PATHS.friends}/${state.currentUserId}/${fromUserId}`).set({
        userId: fromUserId,
        username: requestData.fromUsername,
        code: requestData.fromCode,
        addedAt: Date.now(),
      });

      await fbDb.ref(`${FIREBASE_PATHS.friends}/${fromUserId}/${state.currentUserId}`).set({
        userId: state.currentUserId,
        username: G.username,
        code: state.userCode,
        addedAt: Date.now(),
      });

      // Entferne Request
      await fbDb.ref(`${FIREBASE_PATHS.friendRequests}/${state.currentUserId}/received/${fromUserId}`).remove();
      await fbDb.ref(`${FIREBASE_PATHS.friendRequests}/${fromUserId}/sent/${state.currentUserId}`).remove();

      // Local state aktualisieren
      await loadFriends();
      await loadPendingRequests();

      showFriendToast(`🎉 ${requestData.fromUsername} ist jetzt dein Freund!`, 'success');

      if (typeof MobileFeatures !== 'undefined' && MobileFeatures.triggerHaptic) {
        MobileFeatures.triggerHaptic('strong');
      }

      return true;
    } catch (e) {
      console.error('Fehler beim Akzeptieren:', e);
      showFriendToast('❌ Fehler aufgetreten', 'error');
      return false;
    }
  }

  /**
   * Lehnt einen Friend-Request ab
   */
  async function declineRequest(fromUserId) {
    if (!fbReady || !fbDb) return false;

    try {
      await fbDb.ref(`${FIREBASE_PATHS.friendRequests}/${state.currentUserId}/received/${fromUserId}`).remove();
      await fbDb.ref(`${FIREBASE_PATHS.friendRequests}/${fromUserId}/sent/${state.currentUserId}`).remove();

      await loadPendingRequests();
      showFriendToast('🗑️ Anfrage abgelehnt', 'info');
      return true;
    } catch (e) {
      console.error('Fehler beim Ablehnen:', e);
      return false;
    }
  }

  /**
   * Entfernt einen Freund
   */
  async function removeFriend(friendId) {
    if (!fbReady || !fbDb) return false;

    const friend = state.friends.find(f => f.userId === friendId);

    if (!confirm(`Möchtest du ${friend?.username || 'diesen Freund'} wirklich entfernen?`)) {
      return false;
    }

    try {
      await fbDb.ref(`${FIREBASE_PATHS.friends}/${state.currentUserId}/${friendId}`).remove();
      await fbDb.ref(`${FIREBASE_PATHS.friends}/${friendId}/${state.currentUserId}`).remove();

      await loadFriends();
      showFriendToast(`👋 ${friend?.username || 'Freund'} entfernt`, 'info');
      return true;
    } catch (e) {
      console.error('Fehler beim Entfernen:', e);
      showFriendToast('❌ Fehler aufgetreten', 'error');
      return false;
    }
  }

  /**
   * Aktualisiert Online-Status
   */
  function updateOnlineStatus() {
    if (!fbReady || !fbDb || !state.currentUserId) return;

    const statusRef = fbDb.ref(`${FIREBASE_PATHS.onlineStatus}/${state.currentUserId}`);
    
    // Online beim Laden
    statusRef.set({
      online: true,
      lastSeen: Date.now(),
      username: G.username,
    });

    // Offline beim Entladen
    statusRef.onDisconnect().set({
      online: false,
      lastSeen: Date.now(),
      username: G.username,
    });

    // Alle 60 Sekunden aktualisieren
    setInterval(() => {
      statusRef.set({
        online: true,
        lastSeen: Date.now(),
        username: G.username,
      });
    }, 60000);
  }

  /**
   * Rendert die Freundesliste UI
   */
  function renderFriendsList() {
    const container = document.getElementById('friendsListContainer');
    if (!container) return;

    if (state.friends.length === 0) {
      container.innerHTML = `
        <div class="friends-empty">
          <div class="friends-empty-icon">👥</div>
          <div class="friends-empty-text">Noch keine Freunde</div>
          <div class="friends-empty-sub">Teile deinen Code mit Freunden!</div>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      ${state.friends.map(friend => `
        <div class="friend-card" data-friend-id="${friend.userId}">
          <div class="friend-avatar">${getFriendAvatar(friend.username)}</div>
          <div class="friend-info">
            <div class="friend-name">${escapeHtml(friend.username)}</div>
            <div class="friend-status">${getFriendStatus(friend)}</div>
          </div>
          <div class="friend-actions">
            <button class="friend-btn challenge" onclick="FriendsSystem.challengeFriend('${friend.userId}')">
              ⚔️ Duell
            </button>
            <button class="friend-btn remove" onclick="FriendsSystem.removeFriend('${friend.userId}')">
              ✕
            </button>
          </div>
        </div>
      `).join('')}
    `;
  }

  /**
   * Rendert ausstehende Requests
   */
  function renderPendingRequests() {
    const container = document.getElementById('pendingRequestsContainer');
    if (!container) return;

    // Received Requests
    const receivedContainer = document.getElementById('receivedRequestsContainer');
    if (receivedContainer) {
      if (state.pendingRequests.length === 0) {
        receivedContainer.innerHTML = '<div class="requests-empty">Keine ausstehenden Anfragen</div>';
      } else {
        receivedContainer.innerHTML = `
          ${state.pendingRequests.map(req => `
            <div class="request-card">
              <div class="request-avatar">${getFriendAvatar(req.fromUsername)}</div>
              <div class="request-info">
                <div class="request-name">${escapeHtml(req.fromUsername)}</div>
                <div class="request-time">${formatTime(req.timestamp)}</div>
              </div>
              <div class="request-actions">
                <button class="request-btn accept" onclick="FriendsSystem.acceptRequest('${req.fromUserId}')">
                  ✓
                </button>
                <button class="request-btn decline" onclick="FriendsSystem.declineRequest('${req.fromUserId}')">
                  ✕
                </button>
              </div>
            </div>
          `).join('')}
        `;
      }
    }

    // Sent Requests
    const sentContainer = document.getElementById('sentRequestsContainer');
    if (sentContainer) {
      if (state.sentRequests.length === 0) {
        sentContainer.innerHTML = '<div class="requests-empty">Keine gesendeten Anfragen</div>';
      } else {
        sentContainer.innerHTML = `
          ${state.sentRequests.map(req => `
            <div class="request-card sent">
              <div class="request-avatar">${getFriendAvatar(req.username)}</div>
              <div class="request-info">
                <div class="request-name">${escapeHtml(req.username)}</div>
                <div class="request-status">⏳ Anfrage gesendet</div>
              </div>
            </div>
          `).join('')}
        `;
      }
    }
  }

  /**
   * Fordert Freund zu Duell heraus
   */
  function challengeFriend(friendId) {
    const friend = state.friends.find(f => f.userId === friendId);
    if (!friend) {
      showFriendToast('❌ Freund nicht gefunden', 'error');
      return;
    }

    showFriendToast(`⚔️ Herausforderung an ${friend.username} gesendet!`, 'success');
    
    // TODO: Async Challenge erstellen
    if (typeof window.createAsyncChallenge === 'function') {
      window.createAsyncChallenge(friendId, friend.username);
    }

    if (typeof MobileFeatures !== 'undefined' && MobileFeatures.triggerHaptic) {
      MobileFeatures.triggerHaptic('medium');
    }
  }

  /**
   * Zeigt Freundes-Overlay
   */
  function showFriendsOverlay() {
    const overlay = document.getElementById('friendsOverlay');
    if (!overlay) {
      createFriendsOverlay();
      return;
    }

    overlay.classList.add('active');
    renderFriendCode();
    renderFriendsList();
    renderPendingRequests();
  }

  /**
   * Schließt Freundes-Overlay
   */
  function closeFriendsOverlay() {
    const overlay = document.getElementById('friendsOverlay');
    if (overlay) overlay.classList.remove('active');
  }

  /**
   * Erstellt Freundes-Overlay wenn nicht vorhanden
   */
  function createFriendsOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'friendsOverlay';
    overlay.className = 'friends-overlay';
    overlay.innerHTML = `
      <div class="friends-sheet">
        <div class="friends-header">
          <h3>👥 FREUNDE</h3>
          <button class="friends-close" onclick="FriendsSystem.closeFriendsOverlay()">✕</button>
        </div>
        <div class="friends-body">
          <!-- Code Section -->
          <div class="friend-code-section">
            <div class="friend-code-label">Dein Freundes-Code</div>
            <div class="friend-code" id="friendCodeDisplay">------</div>
            <button class="friend-code-copy" onclick="FriendsSystem.copyFriendCode()">
              📋 Code kopieren
            </button>
          </div>

          <!-- Freund hinzufügen -->
          <div class="friend-add-section">
            <input 
              type="text" 
              id="friendCodeInput" 
              class="friend-code-input" 
              placeholder="Code eines Freundes eingeben..."
              maxlength="6"
            />
            <button class="friend-add-btn" onclick="FriendsSystem.addFriendFromInput()">
              ➕ Freund hinzufügen
            </button>
          </div>

          <!-- Pending Requests -->
          <div class="friend-requests-section">
            <h4>📨 Eingehende Anfragen</h4>
            <div id="receivedRequestsContainer"></div>
          </div>

          <div class="friend-requests-section">
            <h4>📤 Gesendete Anfragen</h4>
            <div id="sentRequestsContainer"></div>
          </div>

          <!-- Friends List -->
          <div class="friends-list-section">
            <h4>👥 Deine Freunde (${state.friends.length})</h4>
            <div id="friendsListContainer"></div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // Click außerhalb schließt
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        closeFriendsOverlay();
      }
    });
  }

  /**
   * Rendert den Freundes-Code
   */
  function renderFriendCode() {
    const display = document.getElementById('friendCodeDisplay');
    if (display) {
      display.textContent = state.userCode || '------';
    }
  }

  /**
   * Kopiert Freundes-Code
   */
  function copyFriendCode() {
    if (!state.userCode) return;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(state.userCode).then(() => {
        showFriendToast('📋 Code kopiert!', 'success');
      });
    } else {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = state.userCode;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      showFriendToast('📋 Code kopiert!', 'success');
    }
  }

  /**
   * Fügt Freund aus Input hinzu
   */
  async function addFriendFromInput() {
    const input = document.getElementById('friendCodeInput');
    if (!input) return;

    const code = input.value.trim().toUpperCase();
    const success = await addFriendByCode(code);

    if (success) {
      input.value = '';
    }
  }

  /**
   * Zeigt Toast-Nachricht
   */
  function showFriendToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `friend-toast friend-toast-${type}`;
    toast.textContent = message;

    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  /**
   * Hilfsfunktion: Avatar-Emoji für Freund
   */
  function getFriendAvatar(username) {
    if (!username) return '👤';
    const firstChar = username.charAt(0).toUpperCase();
    const emojis = {
      'A': '🎯', 'B': '🔫', 'C': '⭐', 'D': '🏆',
      'E': '💫', 'F': '🎖️', 'G': '🥇', 'H': '🎪',
      'I': '🎨', 'J': '🎭', 'K': '🎬', 'L': '🎤',
      'M': '🎧', 'N': '🎸', 'O': '🎺', 'P': '🎻',
      'Q': '🎹', 'R': '🎲', 'S': '🎳', 'T': '🎯',
      'U': '🎮', 'V': '🎰', 'W': '🎱', 'X': '🎴',
      'Y': '🎵', 'Z': '🎶',
    };
    return emojis[firstChar] || '👤';
  }

  /**
   * Hilfsfunktion: Status-Text
   */
  function getFriendStatus(friend) {
    // Hier könnte Online-Status aus Firebase gelesen werden
    return '⚫ Offline';
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
   * Hilfsfunktion: HTML escapen
   */
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Fügt Freunde-Button zum Header hinzu
   * Button ist jetzt direkt in index.html definiert
   */
  function addFriendsButton() {
    // Button ist bereits im HTML, nichts zu tun
    if (document.getElementById('friendsButton')) {
      console.log('✅ Freunde-Button vorhanden');
    } else {
      console.warn('⚠️ Freunde-Button nicht gefunden');
    }
  }

  /**
   * Exportiert öffentliche Funktionen
   */
  return {
    init,
    addFriendByCode,
    acceptRequest,
    declineRequest,
    removeFriend,
    challengeFriend,
    showFriendsOverlay,
    closeFriendsOverlay,
    copyFriendCode,
    addFriendFromInput,
    addFriendsButton,
    // State (readonly)
    getState: () => ({ ...state }),
  };
})();

// Initialisierung
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      FriendsSystem.init().then(() => {
        FriendsSystem.addFriendsButton();
      });
    });
  } else {
    FriendsSystem.init().then(() => {
      FriendsSystem.addFriendsButton();
    });
  }

  // Debug export
  if (window.DEBUG) {
    window.FriendsSystem = FriendsSystem;
  }
}
