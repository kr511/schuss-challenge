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
    onlineStatusByUserId: {},
    userCode: null,
    currentUserId: null,
    initialized: false,
    bootstrapRetryTimer: null,
    statusHeartbeatId: null,
    statusRefPath: '',
  };

  function resolveCurrentUserId() {
    try {
      return (typeof getFirebaseOwnerId === 'function' ? getFirebaseOwnerId() : null) || StorageManager.getRaw('userId') || '';
    } catch (e) {
      console.warn('Freundes-System: User-ID konnte nicht aufgeloest werden:', e);
      return '';
    }
  }

  function isFirebaseAvailable() {
    return !!((typeof fbReady !== 'undefined' && fbReady) && (typeof fbDb !== 'undefined' && fbDb));
  }

  function scheduleBootstrapRetry() {
    if (state.bootstrapRetryTimer) return;
    state.bootstrapRetryTimer = setTimeout(() => {
      state.bootstrapRetryTimer = null;
      init(true);
    }, 1500);
  }

  function normalizeSentRequest(request) {
    if (!request || typeof request !== 'object') return null;

    const userId = request.userId || request.toUserId || '';
    if (!userId) return null;

    return {
      userId,
      username: request.username || request.toUsername || 'Unbekannt',
      code: request.code || request.toCode || '',
      timestamp: Number(request.timestamp) || Date.now(),
    };
  }

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
  async function initLegacy() {
    console.log('👥 Freundes-System initialisiert');

    try {
      // User-ID holen - sicher prüfen ob Funktion existiert
      state.currentUserId = (typeof getFirebaseOwnerId === 'function' ? getFirebaseOwnerId() : null) || StorageManager.getRaw('userId');
      
      if (!state.currentUserId) {
        console.warn('⚠️ Keine User-ID verfügbar, Freundes-System deaktiviert');
        return;
      }
    } catch (e) {
      console.warn('⚠️ Fehler beim Initialisieren:', e);
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
  async function init(force = false) {
    const resolvedUserId = resolveCurrentUserId();
    if (!resolvedUserId) {
      scheduleBootstrapRetry();
      return false;
    }

    const sameUser = state.initialized && state.currentUserId === resolvedUserId;
    state.currentUserId = resolvedUserId;

    if (sameUser && !force) {
      return true;
    }

    await loadOrCreateUserCode();
    renderFriendCode();
    await loadFriends();
    await loadPendingRequests();
    updateOnlineStatus();
    await loadOnlineStatuses();

    if (!isFirebaseAvailable()) {
      scheduleBootstrapRetry();
    }

    state.initialized = true;
    console.log('FriendsSystem ready');
    return true;
  }

  async function loadOrCreateUserCode() {
    // Local gespeichert?
    const localCode = StorageManager.getRaw('friendCode');
    if (localCode) {
      state.userCode = localCode;
      return;
    }

    // Firebase check
    if (isFirebaseAvailable()) {
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
    if (!isFirebaseAvailable()) {
      // Local fallback
      const localFriends = StorageManager.getRaw('friends');
      state.friends = localFriends ? JSON.parse(localFriends) : [];
      state.onlineStatusByUserId = {};
      renderFriendsList();
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
    if (!isFirebaseAvailable()) {
      state.pendingRequests = [];
      state.sentRequests = [];
      renderPendingRequests();
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
      state.sentRequests = sentData
        ? Object.values(sentData).map(normalizeSentRequest).filter(Boolean)
        : [];
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
    if (!isFirebaseAvailable()) {
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
        code: code.toUpperCase(),
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
    if (!isFirebaseAvailable()) {
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
    if (!isFirebaseAvailable()) return false;

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
    if (!isFirebaseAvailable()) return false;

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
    if (!isFirebaseAvailable() || !state.currentUserId) return;

    const refPath = `${FIREBASE_PATHS.onlineStatus}/${state.currentUserId}`;
    if (state.statusRefPath === refPath && state.statusHeartbeatId) return;

    if (state.statusHeartbeatId) {
      clearInterval(state.statusHeartbeatId);
      state.statusHeartbeatId = null;
    }

    state.statusRefPath = refPath;
    const statusRef = fbDb.ref(refPath);
    const writeOnlineStatus = () => statusRef.set({
      online: true,
      lastSeen: Date.now(),
      username: G.username,
    });

    writeOnlineStatus();

    statusRef.onDisconnect().set({
      online: false,
      lastSeen: Date.now(),
      username: G.username,
    });

    state.statusHeartbeatId = setInterval(writeOnlineStatus, 60000);
  }

  async function loadOnlineStatuses() {
    if (!isFirebaseAvailable() || !Array.isArray(state.friends) || state.friends.length === 0) {
      state.onlineStatusByUserId = {};
      renderFriendsList();
      return;
    }

    try {
      const entries = await Promise.all(
        state.friends.map((friend) => (
          fbDb.ref(`${FIREBASE_PATHS.onlineStatus}/${friend.userId}`)
            .once('value')
            .then((snapshot) => [friend.userId, snapshot.val()])
        ))
      );

      const nextStatuses = {};
      entries.forEach(([userId, value]) => {
        if (value && typeof value === 'object') {
          nextStatuses[userId] = value;
        }
      });
      state.onlineStatusByUserId = nextStatuses;
    } catch (e) {
      console.warn('Firebase Status-Laden fehlgeschlagen:', e);
    }

    renderFriendsList();
  }

  /**
   * Rendert die Freundesliste UI
   */
  function renderFriendsList() {
    const container = document.getElementById('friendsListContainer');
    if (!container) return;

    const title = document.getElementById('friendsListTitle');
    if (title) {
      title.textContent = `Deine Freunde (${state.friends.length})`;
    }

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
            <button class="friend-btn profile" onclick="FriendsSystem.openFriendProfile('${friend.userId}', '${escapeHtml(friend.username)}')" title="Profil ansehen">
              👤
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
    // Received Requests
    const receivedContainer = document.getElementById('receivedRequestsContainer');
    const sentContainer = document.getElementById('sentRequestsContainer');
    if (!receivedContainer && !sentContainer) return;

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

    if (typeof window.AsyncChallenge !== 'undefined' && typeof window.AsyncChallenge.createChallenge === 'function') {
      window.AsyncChallenge.createChallenge(friendId, friend.username);
    } else if (typeof window.createAsyncChallenge === 'function') {
      window.createAsyncChallenge(friendId, friend.username);
    } else {
      showFriendToast('❌ Challenge-System nicht geladen', 'error');
      return;
    }

    if (typeof MobileFeatures !== 'undefined' && MobileFeatures.triggerHaptic) {
      MobileFeatures.triggerHaptic('medium');
    }
  }

  /**
   * Öffnet das Profil-Overlay eines Freundes (delegiert an FriendsUI.showFriendProfile)
   */
  function openFriendProfile(friendId, username) {
    if (typeof window.FriendsUI !== 'undefined' && typeof window.FriendsUI.showFriendProfile === 'function') {
      window.FriendsUI.showFriendProfile(friendId, username);
    } else {
      showFriendToast('❌ Profil-Ansicht nicht verfügbar', 'error');
    }

    if (typeof MobileFeatures !== 'undefined' && MobileFeatures.triggerHaptic) {
      MobileFeatures.triggerHaptic('light');
    }
  }

  /**
   * Zeigt Freundes-Overlay
   */
  function showFriendsOverlay() {
    let overlay = document.getElementById('friendsOverlay');
    if (!overlay) {
      overlay = createFriendsOverlay();
    }

    overlay.classList.add('active');
    renderFriendCode();
    renderFriendsList();
    renderPendingRequests();

    if (!state.initialized) {
      init(true);
      return;
    }

    if (isFirebaseAvailable()) {
      loadFriends();
      loadPendingRequests();
      loadOnlineStatuses();
    }
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
    const listTitle = overlay.querySelector('.friends-list-section h4');
    if (listTitle) listTitle.id = 'friendsListTitle';

    // Click außerhalb schließt
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        closeFriendsOverlay();
      }
    });

    return overlay;
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
  function getFriendStatusLegacy(friend) {
    // Hier könnte Online-Status aus Firebase gelesen werden
    return '⚫ Offline';
  }

  /**
   * Hilfsfunktion: Zeit formatieren
   */
  function getFriendStatus(friend) {
    const presence = state.onlineStatusByUserId[friend && friend.userId];
    if (!presence || typeof presence !== 'object') return 'Offline';

    const lastSeen = Number(presence.lastSeen) || 0;
    const isFresh = lastSeen > 0 && (Date.now() - lastSeen) < 120000;

    if (presence.online && isFresh) {
      return 'Online jetzt';
    }

    if (lastSeen > 0) {
      return `Zuletzt aktiv: ${formatTime(lastSeen)}`;
    }

    return 'Offline';
  }

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
    openFriendProfile,
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
        // Global verfügbar machen
        window.FriendsSystem = FriendsSystem;
      });
    });
  } else {
    FriendsSystem.init().then(() => {
      FriendsSystem.addFriendsButton();
      // Global verfügbar machen
      window.FriendsSystem = FriendsSystem;
    });
  }
}
