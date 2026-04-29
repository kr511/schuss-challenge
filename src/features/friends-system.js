/**
 * Social & Friends System v1.0
 * Handles friend requests, presence, and social discovery.
 */
const SocialSystem = (function() {
  'use strict';

  const STORAGE_KEY = 'social_friends';

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
   * Setzt den eigenen Online-Status über SupabaseSocial
   */
  function setupPresence() {
    if (window.SupabaseSocial && typeof window.SupabaseSocial.updateOnlineStatus === 'function') {
      window.SupabaseSocial.updateOnlineStatus(true).catch(function(err) {
        console.warn('[SupabaseSocial] Online-Status konnte nicht gesetzt werden:', err && err.message ? err.message : err);
      });
    }
  }

  /**
   * Sucht nach einem Schützen via Name
   */
  async function findUser(name) {
    const query = String(name || '').trim();
    if (!query) return null;

    const client = window.SupabaseAuth?.client || window.SupabaseClient?.client || window.supabaseClient || null;
    if (!client || typeof client.from !== 'function') return null;

    try {
      const { data, error } = await client
        .from('profiles')
        .select('id,username,display_name,total_xp,rank')
        .or(`username.eq.${query},display_name.ilike.%${query}%`)
        .limit(1)
        .maybeSingle();

      if (error || !data) return null;
      return {
        uid: data.id,
        username: data.username || data.display_name || query,
        xp: data.total_xp || 0,
        rank: data.rank || 'Anfänger'
      };
    } catch (err) {
      console.warn('[SupabaseSocial] Nutzersuche fehlgeschlagen:', err && err.message ? err.message : err);
      return null;
    }
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
