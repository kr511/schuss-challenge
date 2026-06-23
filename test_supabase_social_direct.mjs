import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

const SUPABASE_URL = 'https://fknftkvozwfkcarldzms.supabase.co';
const SUPABASE_ANON = [
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
  'eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrbmZ0a3Zvendma2Nhcmxkem1zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwOTYxOTYsImV4cCI6MjA5MTY3MjE5Nn0',
  'pWSR48-XIUYWWO5pPQsGDnE-qxb6c5EiKuTQn2myKRg',
].join('.');

function readDevVars() {
  const raw = readFileSync(new URL('./.dev.vars', import.meta.url), 'utf8');
  const vars = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    vars[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
  }
  return vars;
}

const SERVICE_KEY = readDevVars().SUPABASE_SERVICE_KEY;
if (!SERVICE_KEY || SERVICE_KEY.includes('HIER')) {
  console.error('SUPABASE_SERVICE_KEY fehlt in .dev.vars.');
  process.exit(1);
}

async function requestJson(url, {
  method = 'GET',
  token = SERVICE_KEY,
  apikey = SERVICE_KEY,
  body,
  prefer,
  allowEmpty = false,
} = {}) {
  const headers = {
    apikey,
    Authorization: `Bearer ${token}`,
  };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (prefer) headers.Prefer = prefer;

  const res = await fetch(url, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const message = data?.message || data?.error_description || data?.error || res.statusText;
    throw new Error(`${method} ${url} -> ${res.status}: ${message}`);
  }
  return allowEmpty && !text ? null : data;
}

function restUrl(path, params = {}) {
  const url = new URL(`${SUPABASE_URL}/rest/v1/${path}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }
  return url.toString();
}

async function createAuthUser(label) {
  const suffix = randomUUID().slice(0, 8);
  const email = `schussduell-${label}-${Date.now()}-${suffix}@example.com`;
  const password = `Codex-${suffix}-Test!42`;
  const user = await requestJson(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    body: {
      email,
      password,
      email_confirm: true,
      user_metadata: { name: `Codex ${label}` },
    },
  });
  return { id: user.id, email, password };
}

async function deleteAuthUser(user) {
  if (!user?.id) return;
  try {
    await requestJson(`${SUPABASE_URL}/auth/v1/admin/users/${user.id}`, {
      method: 'DELETE',
      allowEmpty: true,
    });
  } catch (error) {
    console.warn(`Cleanup failed for ${user.id}:`, error.message);
  }
}

async function signIn(user) {
  const session = await requestJson(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    apikey: SUPABASE_ANON,
    token: SUPABASE_ANON,
    body: { email: user.email, password: user.password },
  });
  assert.equal(session.user.id, user.id);
  return session.access_token;
}

function authed(token, options = {}) {
  return { apikey: SUPABASE_ANON, token, ...options };
}

async function run() {
  const created = [];
  try {
    const alpha = await createAuthUser('alpha');
    const beta = await createAuthUser('beta');
    created.push(alpha, beta);

    const alphaToken = await signIn(alpha);
    const betaToken = await signIn(beta);

    const alphaProfile = await requestJson(restUrl('rpc/touch_my_profile'), authed(alphaToken, {
      method: 'POST',
      body: { next_username: 'Codex Alpha' },
    }));
    const betaProfile = await requestJson(restUrl('rpc/touch_my_profile'), authed(betaToken, {
      method: 'POST',
      body: { next_username: 'Codex Beta' },
    }));
    assert.equal(alphaProfile.id, alpha.id);
    assert.equal(betaProfile.id, beta.id);

    const code = `T${randomUUID().replace(/-/g, '').slice(0, 5).toUpperCase()}`.replace(/[01IO]/g, 'A');
    const friendCode = await requestJson(restUrl('friend_codes', { select: 'code,user_id' }), authed(betaToken, {
      method: 'POST',
      prefer: 'return=representation',
      body: { user_id: beta.id, code },
    }));
    assert.equal(friendCode[0].code, code);

    const visibleCode = await requestJson(restUrl('friend_codes', { select: 'user_id,code', code: `eq.${code}` }), authed(alphaToken));
    assert.equal(visibleCode[0].user_id, beta.id);

    const request = await requestJson(restUrl('friend_requests', { select: 'id,from_user_id,to_user_id,status' }), authed(alphaToken, {
      method: 'POST',
      prefer: 'return=representation',
      body: { from_user_id: alpha.id, to_user_id: beta.id, status: 'pending' },
    }));
    assert.equal(request[0].status, 'pending');

    const incoming = await requestJson(restUrl('friend_requests', {
      select: 'id,status',
      to_user_id: `eq.${beta.id}`,
      status: 'eq.pending',
    }), authed(betaToken));
    assert.equal(incoming[0].id, request[0].id);

    await requestJson(restUrl('rpc/accept_friend_request'), authed(betaToken, {
      method: 'POST',
      body: { request_id: request[0].id },
      allowEmpty: true,
    }));

    const alphaFriends = await requestJson(restUrl('friends', {
      select: 'friend_user_id',
      user_id: `eq.${alpha.id}`,
    }), authed(alphaToken));
    const betaFriends = await requestJson(restUrl('friends', {
      select: 'friend_user_id',
      user_id: `eq.${beta.id}`,
    }), authed(betaToken));
    assert.equal(alphaFriends[0].friend_user_id, beta.id);
    assert.equal(betaFriends[0].friend_user_id, alpha.id);

    // Unique-Constraint (from_user_id, to_user_id): nur ein Row pro Paar.
    // Upsert setzt die bestehende Anfrage zurück auf pending (wie addFriendByCode im Client).
    const declineRequest = await requestJson(
      restUrl('friend_requests', { select: 'id,status', on_conflict: 'from_user_id,to_user_id' }),
      authed(alphaToken, {
        method: 'POST',
        prefer: 'resolution=merge-duplicates,return=representation',
        body: { from_user_id: alpha.id, to_user_id: beta.id, status: 'pending', responded_at: null },
      }),
    );
    assert.equal(declineRequest[0].status, 'pending');

    const declinedAt = new Date().toISOString();
    const declined = await requestJson(restUrl('friend_requests', {
      select: 'id,status,responded_at',
      id: `eq.${declineRequest[0].id}`,
    }), authed(betaToken, {
      method: 'PATCH',
      prefer: 'return=representation',
      body: { status: 'declined', responded_at: declinedAt },
    }));
    assert.equal(declined[0].status, 'declined');

    const blockedRetry = await requestJson(restUrl('friend_requests', {
      select: 'id,status,responded_at',
      from_user_id: `eq.${alpha.id}`,
      to_user_id: `eq.${beta.id}`,
    }), authed(alphaToken));
    assert.equal(blockedRetry[0].status, 'declined');
    assert.ok(Date.parse(blockedRetry[0].responded_at) >= Date.parse(declinedAt));

    const over24hAgo = new Date(Date.now() - (24 * 60 * 60 * 1000 + 60 * 1000)).toISOString();
    await requestJson(restUrl('friend_requests', { id: `eq.${declineRequest[0].id}` }), authed(SERVICE_KEY, {
      method: 'PATCH',
      apikey: SERVICE_KEY,
      body: { responded_at: over24hAgo },
      allowEmpty: true,
    }));

    const reactivated = await requestJson(restUrl('friend_requests', {
      select: 'id,status,responded_at',
      from_user_id: `eq.${alpha.id}`,
      to_user_id: `eq.${beta.id}`,
    }), authed(alphaToken));
    assert.equal(reactivated[0].status, 'declined');

    // Szenario 5: Alpha fragt nach abgelaufenem 24h-Cooldown erneut an.
    // Simuliert app-seitigen upsert (addFriendByCode: status→pending, responded_at→null).
    const reRequestRows = await requestJson(
      restUrl('friend_requests', {
        select: 'id,status,responded_at',
        id: `eq.${declineRequest[0].id}`,
      }),
      authed(alphaToken, {
        method: 'PATCH',
        prefer: 'return=representation',
        body: { status: 'pending', responded_at: null },
      }),
    );
    assert.equal(reRequestRows[0].status, 'pending', 'S5: Status nach Re-Request ist pending');
    assert.equal(reRequestRows[0].responded_at, null, 'S5: responded_at nach Re-Request ist null');

    // Szenario 1 (Wiederholung): Beta sieht die Re-Anfrage als incoming request.
    const incomingAgain = await requestJson(restUrl('friend_requests', {
      select: 'id,status',
      to_user_id: `eq.${beta.id}`,
      from_user_id: `eq.${alpha.id}`,
      status: 'eq.pending',
    }), authed(betaToken));
    assert.ok(incomingAgain.length > 0, 'S1b: Beta sieht Re-Anfrage als eingehende pending request');
    assert.equal(incomingAgain[0].id, declineRequest[0].id, 'S1b: Korrekte Request-ID bei Re-Anfrage');

    // Szenario 7: Alpha (Sender) versucht, die eigene Anfrage per to_user_id-Filter abzulehnen.
    // declineRequest() im Client filtert .eq('to_user_id', user.id).
    // Da to_user_id = beta, findet die Query für alpha keine Zeile → 0 Zeilen, kein Update.
    const alphaDeclineAttempt = await requestJson(
      restUrl('friend_requests', {
        select: 'id',
        id: `eq.${declineRequest[0].id}`,
        to_user_id: `eq.${alpha.id}`,  // alpha ist NICHT der Empfänger
      }),
      authed(alphaToken, {
        method: 'PATCH',
        prefer: 'return=representation',
        body: { status: 'declined', responded_at: new Date().toISOString() },
      }),
    );
    assert.equal(alphaDeclineAttempt.length, 0,
      'S7: Sender kann eigene Anfrage nicht per to_user_id-Filter ablehnen – 0 Zeilen betroffen');

    // Verify: Anfrage ist noch pending (nicht declined vom Sender)
    const afterAlphaDeclineAttempt = await requestJson(restUrl('friend_requests', {
      select: 'id,status',
      id: `eq.${declineRequest[0].id}`,
    }), authed(alphaToken));
    assert.equal(afterAlphaDeclineAttempt[0].status, 'pending',
      'S7: Status bleibt pending nach fehlgeschlagenem Sender-Decline');

    // Szenario 6: Beta nimmt die Re-Anfrage an.
    // Hinweis: Alpha und Beta sind noch befreundet (Freundschaft aus erstem accept),
    // INSERT into friends wird on_conflict do nothing – kein Fehler.
    await requestJson(restUrl('rpc/accept_friend_request'), authed(betaToken, {
      method: 'POST',
      body: { request_id: declineRequest[0].id },
      allowEmpty: true,
    }));

    const reqAfterReAccept = await requestJson(restUrl('friend_requests', {
      select: 'id,status',
      id: `eq.${declineRequest[0].id}`,
    }), authed(alphaToken));
    assert.equal(reqAfterReAccept[0].status, 'accepted', 'S6: Status nach Re-Accept ist accepted');

    // Friendship-Rows existieren weiterhin (waren schon da, on_conflict do nothing).
    const alphaFriendsAfterReAccept = await requestJson(restUrl('friends', {
      select: 'friend_user_id',
      user_id: `eq.${alpha.id}`,
    }), authed(alphaToken));
    assert.ok(
      alphaFriendsAfterReAccept.some((r) => r.friend_user_id === beta.id),
      'S6: Friend-Row A→B nach Re-Accept vorhanden',
    );

    await requestJson(restUrl('online_status', { on_conflict: 'user_id' }), authed(alphaToken, {
      method: 'POST',
      prefer: 'resolution=merge-duplicates,return=minimal',
      body: {
        user_id: alpha.id,
        online: true,
        username: 'Codex Alpha',
        last_seen: new Date().toISOString(),
      },
      allowEmpty: true,
    }));
    const status = await requestJson(restUrl('online_status', { select: 'online,username', user_id: `eq.${alpha.id}` }), authed(betaToken));
    assert.equal(status[0].online, true);
    assert.equal(status[0].username, 'Codex Alpha');

    const challenge = await requestJson(restUrl('async_challenges', { select: 'id,creator_id,opponent_id,status' }), authed(alphaToken, {
      method: 'POST',
      prefer: 'return=representation',
      body: {
        creator_id: alpha.id,
        opponent_id: beta.id,
        discipline: 'lg40',
        shots: 40,
        burst: false,
      },
    }));
    assert.equal(challenge[0].creator_id, alpha.id);
    assert.equal(challenge[0].opponent_id, beta.id);

    const betaChallenges = await requestJson(restUrl('async_challenges', {
      select: 'id,status',
      opponent_id: `eq.${beta.id}`,
    }), authed(betaToken));
    assert.equal(betaChallenges[0].id, challenge[0].id);

    await requestJson(restUrl('rpc/remove_friend'), authed(alphaToken, {
      method: 'POST',
      body: { target_user_id: beta.id },
      allowEmpty: true,
    }));

    const alphaFriendsAfterRemove = await requestJson(restUrl('friends', {
      select: 'friend_user_id',
      user_id: `eq.${alpha.id}`,
    }), authed(alphaToken));
    const betaFriendsAfterRemove = await requestJson(restUrl('friends', {
      select: 'friend_user_id',
      user_id: `eq.${beta.id}`,
    }), authed(betaToken));
    assert.equal(alphaFriendsAfterRemove.length, 0);
    assert.equal(betaFriendsAfterRemove.length, 0);

    console.log('Supabase social smoke passed: auth, profiles, friend code, request/accept/decline/re-request, presence, challenge, remove friend.');
  } finally {
    await Promise.all(created.map(deleteAuthUser));
  }
}

await run();
