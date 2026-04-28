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

    console.log('Supabase social smoke passed: auth, profiles, friend code, request accept, presence, challenge, remove friend.');
  } finally {
    await Promise.all(created.map(deleteAuthUser));
  }
}

await run();
