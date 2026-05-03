/* Schussduell Supabase Social Adapter
 *
 * This prepares friends, friend requests, presence and async challenges for a
 * Supabase-backed social layer for the active friends UI.
 */
(function () {
  'use strict';

  var CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  var state = {
    initialized: false,
    lastError: null,
    profile: null,
    friendCode: null,
    friends: [],
    incomingRequests: [],
    outgoingRequests: [],
    onlineStatus: {},
    heartbeatId: null
  };

  function getClient() {
    return window.SupabaseClient || null;
  }

  function getSession() {
    return window.SupabaseSession || null;
  }

  function getUser() {
    var session = getSession();
    return session && session.user ? session.user : null;
  }

  function isLocalMode() {
    return window.SchussduellLocalMode === true || window.SchussduellLocalPlay === true ||
      localStorage.getItem('sd_local_mode') === '1' || localStorage.getItem('sd_local_play') === '1';
  }

  function isAuthenticated() {
    return !!(getClient() && getUser() && !isLocalMode());
  }

  function unavailableReason() {
    if (isLocalMode()) return 'local-mode';
    if (!getClient()) return 'missing-supabase-client';
    if (!getUser()) return 'missing-supabase-session';
    return '';
  }

  function getUsername() {
    try {
      return (window.G && window.G.username) ||
        localStorage.getItem('sd_username') ||
        localStorage.getItem('username') ||
        'Spieler';
    } catch (e) {
      return 'Spieler';
    }
  }

  function generateCode() {
    var code = '';
    for (var i = 0; i < 6; i += 1) {
      code += CODE_CHARS.charAt(Math.floor(Math.random() * CODE_CHARS.length));
    }
    return code;
  }

  async function ensureReady() {
    var reason = unavailableReason();
    if (reason) {
      state.lastError = reason;
      return false;
    }

    try {
      await touchProfile();
      await ensureFriendCode();
      state.initialized = true;
      state.lastError = null;
      return true;
    } catch (error) {
      state.lastError = error && error.message ? error.message : String(error);
      console.warn('[SupabaseSocial] init failed:', error);
      return false;
    }
  }

  async function touchProfile(username) {
    var client = getClient();
    var user = getUser();
    if (!client || !user) throw new Error('Supabase session missing');

    var nextUsername = String(username || getUsername()).trim().slice(0, 32) || 'Spieler';

    var rpcResult = await client.rpc('touch_my_profile', { next_username: nextUsername });
    if (!rpcResult.error && rpcResult.data) {
      state.profile = rpcResult.data;
      return state.profile;
    }

    var fallback = await client
      .from('profiles')
      .upsert({
        id: user.id,
        username: nextUsername,
        display_name: nextUsername,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' })
      .select('*')
      .single();

    if (fallback.error) throw fallback.error;
    state.profile = fallback.data;
    return state.profile;
  }

  async function ensureFriendCode() {
    var client = getClient();
    var user = getUser();
    if (!client || !user) throw new Error('Supabase session missing');

    var existing = await client
      .from('friend_codes')
      .select('code')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!existing.error && existing.data && existing.data.code) {
      state.friendCode = existing.data.code;
      return state.friendCode;
    }

    for (var attempt = 0; attempt < 8; attempt += 1) {
      var code = generateCode();
      var inserted = await client
        .from('friend_codes')
        .insert({ user_id: user.id, code: code })
        .select('code')
        .single();

      if (!inserted.error && inserted.data && inserted.data.code) {
        state.friendCode = inserted.data.code;
        return state.friendCode;
      }

      if (!inserted.error || !String(inserted.error.message || '').toLowerCase().includes('duplicate')) {
        throw inserted.error || new Error('friend code insert failed');
      }
    }

    throw new Error('Could not generate unique friend code');
  }

  async function loadProfiles(ids) {
    var client = getClient();
    var uniqueIds = Array.from(new Set((ids || []).filter(Boolean)));
    if (!client || uniqueIds.length === 0) return {};

    var result = await client
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .in('id', uniqueIds);

    if (result.error) throw result.error;

    var byId = {};
    (result.data || []).forEach(function (profile) {
      byId[profile.id] = profile;
    });
    return byId;
  }

  async function loadFriends() {
    if (!(await ensureReady())) return [];

    var client = getClient();
    var user = getUser();
    var rows = await client
      .from('friends')
      .select('friend_user_id, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (rows.error) throw rows.error;

    var profileMap = await loadProfiles((rows.data || []).map(function (row) { return row.friend_user_id; }));
    state.friends = (rows.data || []).map(function (row) {
      var profile = profileMap[row.friend_user_id] || {};
      return {
        userId: row.friend_user_id,
        username: profile.display_name || profile.username || 'Spieler',
        avatarUrl: profile.avatar_url || '',
        addedAt: row.created_at
      };
    });

    return state.friends;
  }

  async function loadIncomingRequests() {
    if (!(await ensureReady())) return [];

    var client = getClient();
    var user = getUser();
    var rows = await client
      .from('friend_requests')
      .select('id, from_user_id, created_at, status')
      .eq('to_user_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (rows.error) throw rows.error;

    var profileMap = await loadProfiles((rows.data || []).map(function (row) { return row.from_user_id; }));
    state.incomingRequests = (rows.data || []).map(function (row) {
      var profile = profileMap[row.from_user_id] || {};
      return {
        id: row.id,
        fromUserId: row.from_user_id,
        fromUsername: profile.display_name || profile.username || 'Spieler',
        createdAt: row.created_at,
        status: row.status
      };
    });

    return state.incomingRequests;
  }

  async function loadOutgoingRequests() {
    if (!(await ensureReady())) return [];

    var client = getClient();
    var user = getUser();
    var rows = await client
      .from('friend_requests')
      .select('id, to_user_id, created_at, status')
      .eq('from_user_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (rows.error) throw rows.error;

    var profileMap = await loadProfiles((rows.data || []).map(function (row) { return row.to_user_id; }));
    state.outgoingRequests = (rows.data || []).map(function (row) {
      var profile = profileMap[row.to_user_id] || {};
      return {
        id: row.id,
        toUserId: row.to_user_id,
        toUsername: profile.display_name || profile.username || 'Spieler',
        createdAt: row.created_at,
        status: row.status
      };
    });

    return state.outgoingRequests;
  }

  async function loadOnlineStatuses() {
    if (!(await ensureReady())) return {};

    if (!Array.isArray(state.friends) || state.friends.length === 0) {
      state.onlineStatus = {};
      return state.onlineStatus;
    }

    var client = getClient();
    var ids = state.friends.map(function (friend) { return friend.userId; }).filter(Boolean);
    if (!client || ids.length === 0) {
      state.onlineStatus = {};
      return state.onlineStatus;
    }

    var result = await client
      .from('online_status')
      .select('user_id, online, last_seen, username')
      .in('user_id', ids);

    if (result.error) throw result.error;

    var nextStatus = {};
    (result.data || []).forEach(function (row) {
      nextStatus[row.user_id] = {
        online: row.online === true,
        username: row.username || '',
        lastSeen: row.last_seen ? Date.parse(row.last_seen) : 0
      };
    });
    state.onlineStatus = nextStatus;
    return state.onlineStatus;
  }

  async function addFriendByCode(code) {
    if (!(await ensureReady())) return { ok: false, reason: unavailableReason() || state.lastError };

    var normalized = String(code || '').trim().toUpperCase();
    if (!/^[A-Z2-9]{6}$/.test(normalized)) return { ok: false, reason: 'invalid-code' };
    if (normalized === state.friendCode) return { ok: false, reason: 'self-code' };

    var client = getClient();
    var user = getUser();

    var target = await client
      .from('friend_codes')
      .select('user_id, code')
      .eq('code', normalized)
      .maybeSingle();

    if (target.error) throw target.error;
    if (!target.data || !target.data.user_id) return { ok: false, reason: 'code-not-found' };
    if (target.data.user_id === user.id) return { ok: false, reason: 'self-code' };

    var existingFriend = await client
      .from('friends')
      .select('friend_user_id')
      .eq('user_id', user.id)
      .eq('friend_user_id', target.data.user_id)
      .maybeSingle();

    if (existingFriend.error) throw existingFriend.error;
    if (existingFriend.data && existingFriend.data.friend_user_id) {
      await loadFriends();
      return { ok: false, reason: 'already-friend' };
    }

    var existingRequest = await client
      .from('friend_requests')
      .select('id, status')
      .eq('from_user_id', user.id)
      .eq('to_user_id', target.data.user_id)
      .eq('status', 'pending')
      .maybeSingle();

    if (existingRequest.error) throw existingRequest.error;
    if (existingRequest.data && existingRequest.data.id) {
      await loadOutgoingRequests();
      return { ok: false, reason: 'already-sent' };
    }

    var request = await client
      .from('friend_requests')
      .upsert({
        from_user_id: user.id,
        to_user_id: target.data.user_id,
        status: 'pending'
      }, { onConflict: 'from_user_id,to_user_id' })
      .select('id')
      .single();

    if (request.error) throw request.error;
    await loadOutgoingRequests();
    return { ok: true, requestId: request.data.id, toUserId: target.data.user_id };
  }

  async function acceptRequest(requestId) {
    if (!(await ensureReady())) return { ok: false, reason: unavailableReason() || state.lastError };

    var client = getClient();
    var result = await client.rpc('accept_friend_request', { request_id: requestId });
    if (result.error) throw result.error;

    await Promise.all([loadFriends(), loadIncomingRequests()]);
    return { ok: true };
  }

  async function declineRequest(requestId) {
    if (!(await ensureReady())) return { ok: false, reason: unavailableReason() || state.lastError };

    var client = getClient();
    var user = getUser();
    // Sicherheitsfilter: nur der Empfänger (to_user_id) kann eine Anfrage ablehnen.
    // Ohne .eq('to_user_id') könnte der Sender seine eigene Anfrage auf 'declined' setzen.
    // maybeSingle() statt single() verhindert PGRST116-Fehler bei bereits verarbeiteten Anfragen.
    var result = await client
      .from('friend_requests')
      .update({ status: 'declined', responded_at: new Date().toISOString() })
      .eq('id', requestId)
      .eq('to_user_id', user.id)
      .select('id')
      .maybeSingle();

    if (result.error) throw result.error;
    if (!result.data) {
      // Anfrage existiert nicht oder gehört nicht diesem User – kein Fehler, aber auch kein Erfolg
      await loadIncomingRequests();
      return { ok: false, reason: 'request-not-found' };
    }
    await loadIncomingRequests();
    return { ok: true };
  }

  async function removeFriend(friendUserId) {
    if (!(await ensureReady())) return { ok: false, reason: unavailableReason() || state.lastError };

    var client = getClient();
    var result = await client.rpc('remove_friend', { target_user_id: friendUserId });

    if (result.error) throw result.error;
    await loadFriends();
    return { ok: true };
  }

  async function updateOnlineStatus(online) {
    if (!(await ensureReady())) return false;

    var client = getClient();
    var user = getUser();
    var result = await client
      .from('online_status')
      .upsert({
        user_id: user.id,
        online: online !== false,
        last_seen: new Date().toISOString(),
        username: getUsername()
      }, { onConflict: 'user_id' });

    if (result.error) throw result.error;
    return true;
  }

  function startPresenceHeartbeat() {
    if (state.heartbeatId || !isAuthenticated()) return;
    updateOnlineStatus(true).catch(function (error) {
      console.warn('[SupabaseSocial] presence failed:', error);
    });
    state.heartbeatId = setInterval(function () {
      updateOnlineStatus(true).catch(function (error) {
        console.warn('[SupabaseSocial] presence heartbeat failed:', error);
      });
    }, 60000);
  }

  function stopPresenceHeartbeat() {
    if (state.heartbeatId) clearInterval(state.heartbeatId);
    state.heartbeatId = null;
  }

  async function createChallenge(opponentId, settings) {
    if (!(await ensureReady())) return { ok: false, reason: unavailableReason() || state.lastError };

    var client = getClient();
    var user = getUser();
    var game = settings || {};
    var result = await client
      .from('async_challenges')
      .insert({
        creator_id: user.id,
        opponent_id: opponentId || null,
        discipline: game.discipline || (window.G && window.G.discipline) || 'lg40',
        weapon: game.weapon || (window.G && window.G.weapon) || null,
        distance: game.distance || (window.G && window.G.dist) || null,
        difficulty: game.difficulty || (window.G && window.G.diff) || null,
        shots: Number(game.shots || (window.G && window.G.shots) || 40),
        burst: Boolean(game.burst || (window.G && window.G.burst))
      })
      .select('*')
      .single();

    if (result.error) throw result.error;
    return { ok: true, challenge: result.data };
  }

  async function loadCreatedChallenges() {
    if (!(await ensureReady())) return [];

    var client = getClient();
    var user = getUser();
    var rows = await client
      .from('async_challenges')
      .select('*')
      .eq('creator_id', user.id)
      .order('created_at', { ascending: false });

    if (rows.error) throw rows.error;

    var profileMap = await loadProfiles((rows.data || []).map(function (row) { return row.opponent_id; }));
    return (rows.data || []).map(function (row) {
      var profile = profileMap[row.opponent_id] || {};
      return Object.assign({}, row, {
        opponent_username: profile.display_name || profile.username || ''
      });
    });
  }

  async function loadAvailableChallenges() {
    if (!(await ensureReady())) return [];

    var client = getClient();
    var user = getUser();
    var rows = await client
      .from('async_challenges')
      .select('*')
      .eq('opponent_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (rows.error) throw rows.error;

    var profileMap = await loadProfiles((rows.data || []).map(function (row) { return row.creator_id; }));
    return (rows.data || []).map(function (row) {
      var profile = profileMap[row.creator_id] || {};
      return Object.assign({}, row, {
        creator_username: profile.display_name || profile.username || 'Spieler'
      });
    });
  }

  async function acceptChallenge(challengeId) {
    if (!(await ensureReady())) return { ok: false, reason: unavailableReason() || state.lastError };

    var client = getClient();
    var user = getUser();
    var result = await client
      .from('async_challenges')
      .update({ status: 'accepted', accepted_at: new Date().toISOString() })
      .eq('id', challengeId)
      .eq('opponent_id', user.id)
      .select('*')
      .single();

    if (result.error) throw result.error;
    return { ok: true, challenge: result.data };
  }

  function getStatus() {
    return {
      available: isAuthenticated(),
      reason: unavailableReason(),
      initialized: state.initialized,
      lastError: state.lastError,
      friendCode: state.friendCode,
      friendsCount: state.friends.length,
      incomingCount: state.incomingRequests.length,
      outgoingCount: state.outgoingRequests.length
    };
  }

  async function refreshAll() {
    if (!(await ensureReady())) return getStatus();
    await loadFriends();
    await Promise.all([loadIncomingRequests(), loadOutgoingRequests(), loadOnlineStatuses()]);
    startPresenceHeartbeat();
    return getStatus();
  }

  function boot() {
    window.addEventListener('supabaseAuthReady', function () {
      setTimeout(function () {
        refreshAll().catch(function (error) {
          state.lastError = error && error.message ? error.message : String(error);
          console.warn('[SupabaseSocial] refresh failed:', error);
        });
      }, 250);
    });

    if (isAuthenticated()) {
      refreshAll().catch(function (error) {
        state.lastError = error && error.message ? error.message : String(error);
        console.warn('[SupabaseSocial] boot failed:', error);
      });
    }

    window.addEventListener('beforeunload', function () {
      stopPresenceHeartbeat();
      if (isAuthenticated()) updateOnlineStatus(false).catch(function () {});
    });
  }

  window.SupabaseSocial = {
    ensureReady: ensureReady,
    refreshAll: refreshAll,
    touchProfile: touchProfile,
    ensureFriendCode: ensureFriendCode,
    loadFriends: loadFriends,
    loadIncomingRequests: loadIncomingRequests,
    loadOutgoingRequests: loadOutgoingRequests,
    loadOnlineStatuses: loadOnlineStatuses,
    addFriendByCode: addFriendByCode,
    acceptRequest: acceptRequest,
    declineRequest: declineRequest,
    removeFriend: removeFriend,
    updateOnlineStatus: updateOnlineStatus,
    createChallenge: createChallenge,
    loadCreatedChallenges: loadCreatedChallenges,
    loadAvailableChallenges: loadAvailableChallenges,
    acceptChallenge: acceptChallenge,
    getStatus: getStatus,
    getState: function () { return Object.assign({}, state); }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
