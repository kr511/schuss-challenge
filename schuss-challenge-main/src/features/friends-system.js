/**
 * Social & Friends System v1.0
 * Handles friend requests, presence, and social discovery.
 */
const SocialSystem = (function() {
  'use strict';

  const STORAGE_KEY = 'social_friends';
  const PRESENCE_PATH = 'presence/';
  const USERS_PATH = 'users/';

  let _friends = [];
  let _initialized = false;

  /**
   * Initialisiert das System
   */
  async function init() {
    if (_initialized) return;
    loadLocalFriends();
    setupPresence();
    _initialized = true;
    console.log('👥 Social System initialisiert');
  }

  function loadLocalFriends() {
    if (typeof StorageManager !== 'undefined') {
      _friends = StorageManager.get(STORAGE_KEY, []);
    }
  }

  function saveLocalFriends() {
    if (typeof StorageManager !== 'undefined') {
      StorageManager.set(STORAGE_KEY, _friends);
    }
  }

  /**
   * Setzt den eigenen Online-Status in Firebase
   */
  function setupPresence() {
    if (typeof firebase === 'undefined' || !firebase.auth().currentUser) return;
    
    const uid = firebase.auth().currentUser.uid;
    const presenceRef = firebase.database().ref(PRESENCE_PATH + uid);
    
    // On disconnect, set offline
    presenceRef.onDisconnect().set({
      status: 'offline',
      last_seen: firebase.database.ServerValue.TIMESTAMP
    });

    // Set online now
    presenceRef.set({
      status: 'online',
      username: StorageManager.getRaw('username') || 'Schütze',
      last_seen: firebase.database.ServerValue.TIMESTAMP
    });
  }

  /**
   * Sucht nach einem Schützen via Name
   */
  async function findUser(name) {
    if (typeof firebase === 'undefined') return null;
    
    const snapshot = await firebase.database().ref(USERS_PATH)
      .orderByChild('username')
      .equalTo(name)
      .limitToFirst(1)
      .once('value');
    
    if (!snapshot.exists()) return null;
    
    const data = snapshot.val();
    const uid = Object.keys(data)[0];
    return { uid, ...data[uid] };
  }

  /**
   * Fügt einen Freund hinzu
   */
  async function addFriend(userObj) {
    if (!userObj || !userObj.uid) return false;
    
    // Check if already exists
    if (_friends.find(f => f.uid === userObj.uid)) return false;
    
    _friends.push({
      uid: userObj.uid,
      username: userObj.username,
      addedAt: Date.now(),
      xp: userObj.xp || 0,
      rank: userObj.rank || 'Anfänger'
    });
    
    saveLocalFriends();
    if (window.FriendsUI) FriendsUI.render();
    return true;
  }

  function getFriends() {
    return [..._friends];
  }

  function open() {
    // Öffnet das Social Discovery Bottom-Sheet (UI-Logik in friends-ui.js)
    if (window.FriendsUI) FriendsUI.showDiscovery();
  }

  return {
    init,
    findUser,
    addFriend,
    getFriends,
    open
  };
})();

// Auto-Init
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(SocialSystem.init, 500);
});
