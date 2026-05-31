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

      var errMsg = String((inserted.error && (inserted.error.message || inserted.error.details)) || '').toLowerCase();
      if (!errMsg.includes('duplicate') && !errMsg.includes('unique')) {
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
      .select('id, status, responded_at')
      .eq('from_user_id', user.id)
      .eq('to_user_id', target.data.user_id)
      .maybeSingle();

    if (existingRequest.error) throw existingRequest.error;
    if (existingRequest.data && existingRequest.data.id) {
      if (existingRequest.data.status === 'pending') {
        await loadOutgoingRequests();
        return { ok: false, reason: 'already-sent' };
      }

      if (existingRequest.data.status === 'declined') {
        var declinedAtMs = existingRequest.data.responded_at ? Date.parse(existingRequest.data.responded_at) : 0;
        if (declinedAtMs && (Date.now() - declinedAtMs) < 24 * 60 * 60 * 1000) {
          return { ok: false, reason: 'recently-declined' };
        }
      }
    }

    var request = await client
      .from('friend_requests')
      .upsert({
        from_user_id: user.id,
        to_user_id: target.data.user_id,
        status: 'pending',
        responded_at: null
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

  // Beim beforeunload kann die supabase-js Promise abgebrochen werden, bevor sie
  // den Request rausschickt. fetch(..., { keepalive: true }) garantiert, dass
  // der Browser ihn auch nach Unload zu Ende sendet, und erlaubt im Gegensatz
  // zu navigator.sendBeacon() das Authorization-Header für RLS.
  function sendOfflineBeacon() {
    try {
      if (!isAuthenticated()) return false;
      if (typeof fetch !== 'function') return false;
      var client = getClient();
      var user = getUser();
      if (!client || !user) return false;
      var supabaseUrl = (client.supabaseUrl || '').replace(/\/+$/, '');
      var apiKey = client.supabaseKey || '';
      var session = getSession();
      var token = session && session.access_token;
      if (!supabaseUrl || !apiKey || !token) return false;
      var body = JSON.stringify({
        user_id: user.id,
        online: false,
        last_seen: new Date().toISOString(),
        username: getUsername()
      });
      fetch(supabaseUrl + '/rest/v1/online_status?on_conflict=user_id', {
        method: 'POST',
        keepalive: true,
        headers: {
          'apikey': apiKey,
          'Authorization': 'Bearer ' + token,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates,return=minimal'
        },
        body: body
      }).catch(function () { /* beforeunload: best-effort */ });
      return true;
    } catch (_e) {
      return false;
    }
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

  var PHOTO_DUEL_KIND = 'photo_duel';
  var PHOTO_DUEL_XP_REWARD = 20;
  var DISCIPLINE_META = {
    lg40: { weapon: 'lg', distance: '10', shots: 40 },
    lg60: { weapon: 'lg', distance: '10', shots: 60 },
    kk50: { weapon: 'kk', distance: '50', shots: 60 },
    kk100: { weapon: 'kk', distance: '100', shots: 60 },
    kk3x20: { weapon: 'kk', distance: '50', shots: 60 }
  };

  function getDisciplineMeta(discipline) {
    return DISCIPLINE_META[discipline] || DISCIPLINE_META.lg40;
  }

  function normalizePhotoDuelScore(input) {
    var data = input || {};
    var score = Number(data.score);
    if (!Number.isFinite(score) || score < 0) throw new Error('invalid-score');
    var confidence = Number(data.confidence);
    return {
      score: score,
      scoreSource: String(data.scoreSource || data.source || 'ocr-confirmed').slice(0, 32),
      ocrConfidence: Number.isFinite(confidence) ? Math.max(0, Math.min(1, confidence)) : null
    };
  }

  async function loadResultsForChallengeIds(ids) {
    var client = getClient();
    var challengeIds = Array.from(new Set((ids || []).filter(Boolean)));
    if (!client || challengeIds.length === 0) return {};

    var rows = await client
      .from('async_results')
      .select('challenge_id, user_id, score, shots, submitted_at, score_source, ocr_confidence, confirmed_at')
      .in('challenge_id', challengeIds);

    if (rows.error) throw rows.error;

    var byChallenge = {};
    (rows.data || []).forEach(function (row) {
      if (!byChallenge[row.challenge_id]) byChallenge[row.challenge_id] = [];
      byChallenge[row.challenge_id].push(row);
    });
    return byChallenge;
  }

  function mapPhotoDuelRows(rows, profileMap, resultMap) {
    return (rows || []).map(function (row) {
      var creatorProfile = profileMap[row.creator_id] || {};
      var opponentProfile = profileMap[row.opponent_id] || {};
      var results = (resultMap && resultMap[row.id]) || [];
      var creatorResult = results.find(function (result) { return result.user_id === row.creator_id; }) || null;
      var opponentResult = results.find(function (result) { return result.user_id === row.opponent_id; }) || null;
      return Object.assign({}, row, {
        creator_username: creatorProfile.display_name || creatorProfile.username || 'Spieler',
        opponent_username: opponentProfile.display_name || opponentProfile.username || 'Freund',
        creator_score: creatorResult ? Number(creatorResult.score) : null,
        opponent_score: opponentResult ? Number(opponentResult.score) : null,
        results: results
      });
    });
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
    return (rows.data || []).filter(function (row) {
      return row.kind !== PHOTO_DUEL_KIND;
    }).map(function (row) {
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
    return (rows.data || []).filter(function (row) {
      return row.kind !== PHOTO_DUEL_KIND;
    }).map(function (row) {
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

  async function createPhotoDuel(opponentId, scorePayload) {
    if (!(await ensureReady())) return { ok: false, reason: unavailableReason() || state.lastError };
    if (!opponentId) return { ok: false, reason: 'missing-opponent' };

    var client = getClient();
    var user = getUser();
    var discipline = String((scorePayload && scorePayload.discipline) || 'lg40');
    var meta = getDisciplineMeta(discipline);
    var scoreData = normalizePhotoDuelScore(scorePayload);
    var now = new Date().toISOString();

    var challenge = await client
      .from('async_challenges')
      .insert({
        creator_id: user.id,
        opponent_id: opponentId,
        kind: PHOTO_DUEL_KIND,
        discipline: discipline,
        weapon: meta.weapon,
        distance: meta.distance,
        difficulty: null,
        shots: meta.shots,
        burst: false,
        status: 'pending',
        xp_reward: PHOTO_DUEL_XP_REWARD,
        updated_at: now
      })
      .select('*')
      .single();

    if (challenge.error) throw challenge.error;

    var result = await client
      .from('async_results')
      .insert({
        challenge_id: challenge.data.id,
        user_id: user.id,
        score: scoreData.score,
        shots: [],
        score_source: scoreData.scoreSource,
        ocr_confidence: scoreData.ocrConfidence,
        confirmed_at: now
      })
      .select('*')
      .single();

    if (result.error) throw result.error;

    return {
      ok: true,
      challenge: Object.assign({}, challenge.data, {
        creator_score: scoreData.score,
        results: [result.data]
      })
    };
  }

  async function loadIncomingPhotoDuels() {
    if (!(await ensureReady())) return [];

    var client = getClient();
    var user = getUser();
    var rows = await client
      .from('async_challenges')
      .select('*')
      .eq('opponent_id', user.id)
      .eq('kind', PHOTO_DUEL_KIND)
      .in('status', ['pending', 'accepted', 'completed'])
      .order('created_at', { ascending: false });

    if (rows.error) throw rows.error;

    var ids = (rows.data || []).map(function (row) { return row.id; });
    var profileMap = await loadProfiles((rows.data || []).reduce(function (acc, row) {
      acc.push(row.creator_id, row.opponent_id);
      return acc;
    }, []));
    var resultMap = await loadResultsForChallengeIds(ids);
    return mapPhotoDuelRows(rows.data || [], profileMap, resultMap);
  }

  async function loadCreatedPhotoDuels() {
    if (!(await ensureReady())) return [];

    var client = getClient();
    var user = getUser();
    var rows = await client
      .from('async_challenges')
      .select('*')
      .eq('creator_id', user.id)
      .eq('kind', PHOTO_DUEL_KIND)
      .in('status', ['pending', 'accepted', 'declined', 'completed'])
      .order('created_at', { ascending: false });

    if (rows.error) throw rows.error;

    var ids = (rows.data || []).map(function (row) { return row.id; });
    var profileMap = await loadProfiles((rows.data || []).reduce(function (acc, row) {
      acc.push(row.creator_id, row.opponent_id);
      return acc;
    }, []));
    var resultMap = await loadResultsForChallengeIds(ids);
    return mapPhotoDuelRows(rows.data || [], profileMap, resultMap);
  }

  async function acceptPhotoDuel(challengeId) {
    if (!(await ensureReady())) return { ok: false, reason: unavailableReason() || state.lastError };

    var client = getClient();
    var user = getUser();
    var now = new Date().toISOString();
    var result = await client
      .from('async_challenges')
      .update({ status: 'accepted', accepted_at: now, updated_at: now })
      .eq('id', challengeId)
      .eq('opponent_id', user.id)
      .eq('kind', PHOTO_DUEL_KIND)
      .eq('status', 'pending')
      .select('*')
      .maybeSingle();

    if (result.error) throw result.error;
    if (!result.data) return { ok: false, reason: 'duel-not-found' };
    return { ok: true, challenge: result.data };
  }

  async function declinePhotoDuel(challengeId) {
    if (!(await ensureReady())) return { ok: false, reason: unavailableReason() || state.lastError };

    var client = getClient();
    var user = getUser();
    var now = new Date().toISOString();
    var result = await client
      .from('async_challenges')
      .update({ status: 'declined', updated_at: now })
      .eq('id', challengeId)
      .eq('opponent_id', user.id)
      .eq('kind', PHOTO_DUEL_KIND)
      .eq('status', 'pending')
      .select('*')
      .maybeSingle();

    if (result.error) throw result.error;
    if (!result.data) return { ok: false, reason: 'duel-not-found' };
    return { ok: true, challenge: result.data };
  }

  async function loadPhotoDuelResults(challengeId) {
    if (!(await ensureReady())) return [];
    var resultMap = await loadResultsForChallengeIds([challengeId]);
    return resultMap[challengeId] || [];
  }

  async function loadChallengeResults(challengeId) {
    if (!(await ensureReady())) return [];
    var resultMap = await loadResultsForChallengeIds([challengeId]);
    var rows = resultMap[challengeId] || [];
    if (rows.length === 0) return [];
    var profileMap = await loadProfiles(rows.map(function (r) { return r.user_id; }));
    return rows.map(function (r) {
      var p = profileMap[r.user_id] || {};
      return {
        challengerId: r.user_id,
        challengerUsername: p.display_name || p.username || 'Spieler',
        score: Number(r.score) || 0,
        submittedAt: r.submitted_at
      };
    });
  }

  async function submitChallengeResult(challengeId, score, shots) {
    if (!(await ensureReady())) return { ok: false, reason: unavailableReason() || state.lastError };

    var client = getClient();
    var user = getUser();
    var now = new Date().toISOString();

    var result = await client
      .from('async_results')
      .upsert({
        challenge_id: challengeId,
        user_id: user.id,
        score: Number(score) || 0,
        shots: Array.isArray(shots) ? shots : [],
        submitted_at: now,
        score_source: 'game',
        confirmed_at: now
      }, { onConflict: 'challenge_id,user_id' })
      .select('*')
      .single();

    if (result.error) throw result.error;

    var allResultMap = await loadResultsForChallengeIds([challengeId]);
    var allRows = allResultMap[challengeId] || [];
    if (allRows.length >= 2) {
      var completed = await client
        .from('async_challenges')
        .update({ status: 'completed', completed_at: now })
        .eq('id', challengeId)
        .neq('status', 'completed');
      if (completed.error) throw completed.error;
    }

    return { ok: true, result: result.data };
  }

  async function submitPhotoDuelResult(challengeId, scorePayload) {
    if (!(await ensureReady())) return { ok: false, reason: unavailableReason() || state.lastError };

    var client = getClient();
    var user = getUser();
    var scoreData = normalizePhotoDuelScore(scorePayload);
    var now = new Date().toISOString();

    var challenge = await client
      .from('async_challenges')
      .select('*')
      .eq('id', challengeId)
      .eq('kind', PHOTO_DUEL_KIND)
      .maybeSingle();

    if (challenge.error) throw challenge.error;
    if (!challenge.data || (challenge.data.creator_id !== user.id && challenge.data.opponent_id !== user.id)) {
      return { ok: false, reason: 'duel-not-found' };
    }

    var result = await client
      .from('async_results')
      .upsert({
        challenge_id: challengeId,
        user_id: user.id,
        score: scoreData.score,
        shots: [],
        submitted_at: now,
        score_source: scoreData.scoreSource,
        ocr_confidence: scoreData.ocrConfidence,
        confirmed_at: now
      }, { onConflict: 'challenge_id,user_id' })
      .select('*')
      .single();

    if (result.error) throw result.error;

    var results = await loadPhotoDuelResults(challengeId);
    var hasCreator = results.some(function (row) { return row.user_id === challenge.data.creator_id; });
    var hasOpponent = results.some(function (row) { return row.user_id === challenge.data.opponent_id; });
    var nextChallenge = challenge.data;

    if (hasCreator && hasOpponent && challenge.data.status !== 'completed') {
      var completed = await client
        .from('async_challenges')
        .update({ status: 'completed', completed_at: now, updated_at: now })
        .eq('id', challengeId)
        .eq('kind', PHOTO_DUEL_KIND)
        .select('*')
        .single();

      if (completed.error) throw completed.error;
      nextChallenge = completed.data;
    }

    return { ok: true, challenge: nextChallenge, result: result.data, results: results };
  }

  // ── People search (by name) + recent-people directory ─────────────
  // profiles.RLS = select all (public), so we can query other users.
  // Club/Verein comes from club_members → clubs (joined separately).
  async function loadClubsForUsers(userIds) {
    var client = getClient();
    var ids = Array.from(new Set((userIds || []).filter(Boolean)));
    if (!client || ids.length === 0) return {};

    var memberships = await client
      .from('club_members')
      .select('user_id, club_id')
      .in('user_id', ids);
    if (memberships.error || !memberships.data || memberships.data.length === 0) return {};

    var clubIds = Array.from(new Set(memberships.data.map(function (m) { return m.club_id; }).filter(Boolean)));
    if (clubIds.length === 0) return {};

    var clubs = await client.from('clubs').select('id, name, location').in('id', clubIds);
    if (clubs.error) return {};

    var clubById = {};
    (clubs.data || []).forEach(function (c) { clubById[c.id] = c; });

    var byUser = {};
    memberships.data.forEach(function (m) {
      if (byUser[m.user_id]) return; // first club wins
      var club = clubById[m.club_id];
      if (club) byUser[m.user_id] = { name: club.name || '', location: club.location || '' };
    });
    return byUser;
  }

  function decoratePeople(rows, clubsByUser) {
    var user = getUser();
    var myId = user ? user.id : null;
    var friendIds = {};
    (state.friends || []).forEach(function (f) { if (f.userId) friendIds[f.userId] = true; });
    var sentIds = {};
    (state.outgoingRequests || []).forEach(function (r) { if (r.toUserId && r.status === 'pending') sentIds[r.toUserId] = true; });
    var incomingIds = {};
    (state.incomingRequests || []).forEach(function (r) { if (r.fromUserId && r.status === 'pending') incomingIds[r.fromUserId] = true; });

    return (rows || []).reduce(function (acc, p) {
      // Das eigene Profil und bestehende Freunde gehören nicht in die Suche.
      if (myId && p.id === myId) return acc;
      if (friendIds[p.id]) return acc;

      var club = clubsByUser[p.id] || null;
      var relation = 'none';
      if (sentIds[p.id]) relation = 'sent';
      else if (incomingIds[p.id]) relation = 'incoming';
      acc.push({
        userId: p.id,
        name: p.display_name || p.username || 'Spieler',
        avatarUrl: p.avatar_url || '',
        club: club ? club.name : '',
        clubLocation: club ? club.location : '',
        relation: relation
      });
      return acc;
    }, []);
  }

  // Latest registered players (newest first) — shown before any input.
  async function listRecentProfiles(limit) {
    if (!(await ensureReady())) return { ok: false, reason: unavailableReason() || state.lastError, people: [] };
    var client = getClient();
    var max = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 50);

    var rows = await client
      .from('profiles')
      .select('id, username, display_name, avatar_url, updated_at')
      .order('updated_at', { ascending: false })
      .limit(max);
    if (rows.error) return { ok: false, reason: rows.error.message, people: [] };

    var clubs = await loadClubsForUsers((rows.data || []).map(function (r) { return r.id; }));
    return { ok: true, people: decoratePeople(rows.data || [], clubs) };
  }

  // Search players by name (display_name / username, case-insensitive).
  async function searchProfiles(query, limit) {
    if (!(await ensureReady())) return { ok: false, reason: unavailableReason() || state.lastError, people: [] };
    var term = String(query || '').trim();
    if (term.length < 2) return { ok: true, people: [], tooShort: true };

    var client = getClient();
    var max = Math.min(Math.max(parseInt(limit, 10) || 25, 1), 50);
    var safe = term.replace(/[%,()]/g, ' ').slice(0, 40);

    var rows = await client
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .or('display_name.ilike.%' + safe + '%,username.ilike.%' + safe + '%')
      .limit(max);
    if (rows.error) return { ok: false, reason: rows.error.message, people: [] };

    var clubs = await loadClubsForUsers((rows.data || []).map(function (r) { return r.id; }));
    return { ok: true, people: decoratePeople(rows.data || [], clubs) };
  }

  // Send a friend request directly to a user id (from search results).
  async function sendFriendRequest(targetUserId) {
    if (!(await ensureReady())) return { ok: false, reason: unavailableReason() || state.lastError };
    var client = getClient();
    var user = getUser();
    var targetId = String(targetUserId || '').trim();
    if (!targetId) return { ok: false, reason: 'invalid-user' };
    if (targetId === user.id) return { ok: false, reason: 'self' };

    var existingFriend = await client
      .from('friends')
      .select('friend_user_id')
      .eq('user_id', user.id)
      .eq('friend_user_id', targetId)
      .maybeSingle();
    if (existingFriend.error) throw existingFriend.error;
    if (existingFriend.data && existingFriend.data.friend_user_id) return { ok: false, reason: 'already-friend' };

    var existingRequest = await client
      .from('friend_requests')
      .select('id, status, responded_at')
      .eq('from_user_id', user.id)
      .eq('to_user_id', targetId)
      .maybeSingle();
    if (existingRequest.error) throw existingRequest.error;
    if (existingRequest.data && existingRequest.data.status === 'pending') {
      return { ok: false, reason: 'already-sent' };
    }

    var request = await client
      .from('friend_requests')
      .upsert({ from_user_id: user.id, to_user_id: targetId, status: 'pending', responded_at: null }, { onConflict: 'from_user_id,to_user_id' })
      .select('id')
      .single();
    if (request.error) throw request.error;
    await loadOutgoingRequests();
    return { ok: true, requestId: request.data.id, toUserId: targetId };
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
      sendOfflineBeacon();
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
    searchProfiles: searchProfiles,
    listRecentProfiles: listRecentProfiles,
    sendFriendRequest: sendFriendRequest,
    acceptRequest: acceptRequest,
    declineRequest: declineRequest,
    removeFriend: removeFriend,
    updateOnlineStatus: updateOnlineStatus,
    createChallenge: createChallenge,
    loadCreatedChallenges: loadCreatedChallenges,
    loadAvailableChallenges: loadAvailableChallenges,
    acceptChallenge: acceptChallenge,
    submitChallengeResult: submitChallengeResult,
    loadChallengeResults: loadChallengeResults,
    createPhotoDuel: createPhotoDuel,
    loadIncomingPhotoDuels: loadIncomingPhotoDuels,
    loadCreatedPhotoDuels: loadCreatedPhotoDuels,
    acceptPhotoDuel: acceptPhotoDuel,
    declinePhotoDuel: declinePhotoDuel,
    submitPhotoDuelResult: submitPhotoDuelResult,
    loadPhotoDuelResults: loadPhotoDuelResults,
    getStatus: getStatus,
    getState: function () { return Object.assign({}, state); }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
