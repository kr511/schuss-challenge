import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';

const source = await readFile(new URL('./backend-sync.js', import.meta.url), 'utf8');

function wait(ms = 0) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createDom({ fetchImpl, config } = {}) {
  const fetchCalls = [];
  const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', {
    url: 'https://kr511.github.io/schuss-challenge/',
    runScripts: 'dangerously',
    pretendToBeVisual: true,
  });
  const { window } = dom;
  window.console = { ...console, warn() {} };
  window.__SCHUSS_BACKEND_SYNC_TEST_CONFIG__ = {
    AUTH_STABLE_MS: 0,
    WORKER_AUTH_RETRY_MS: 0,
    AUTH_BLOCK_SHORT_RETRY_MS: 50,
    AUTH_BLOCK_RETRY_MS: 1000,
    AUTH_BLOCK_WARNING_FAILURES: 3,
    ...(config || {}),
  };
  window.fetch = async (url, opts) => {
    fetchCalls.push({ url: String(url), opts });
    if (fetchImpl) return fetchImpl(url, opts, fetchCalls.length);
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  };
  window.eval(source);
  return { dom, window, fetchCalls };
}

function dispatchAuth(window, eventName = 'SIGNED_IN') {
  window.SupabaseAuthInitializing = false;
  window.dispatchEvent(new window.CustomEvent('supabaseAuthReady', {
    detail: { session: window.SupabaseSession, event: eventName },
  }));
}

async function testNoTokenDoesNotFetch() {
  const { dom, window, fetchCalls } = createDom();
  window.SupabaseBackendSync.syncProfile('Anna');
  await wait();

  assert.equal(fetchCalls.length, 0);
  assert.equal(window.SupabaseBackendSync.readAuthBlockStatus().tokenExists, false);
  dom.window.close();
}

async function testAuthInitializingDoesNotFetch() {
  const { dom, window, fetchCalls } = createDom();
  window.SupabaseAuthInitializing = true;
  window.SupabaseSession = { access_token: 'token-initial', user: { id: 'u1' } };

  window.SupabaseBackendSync.syncProfile('Anna');
  await wait();
  assert.equal(fetchCalls.length, 0);
  assert.equal(window.SupabaseBackendSync.readAuthBlockStatus().readiness, 'auth-initializing');

  dispatchAuth(window, 'SIGNED_IN');
  window.SupabaseBackendSync.syncProfile('Anna');
  await wait();
  assert.equal(fetchCalls.length, 1);
  dom.window.close();
}

async function testLocalModeDoesNotFetch() {
  const { dom, window, fetchCalls } = createDom();
  window.SupabaseSession = { access_token: 'token-local', user: { id: 'u1' } };
  window.SchussduellLocalMode = true;

  window.SupabaseBackendSync.syncGameSession({ score: 10, shotsFired: 1 });
  await wait();

  assert.equal(fetchCalls.length, 0);
  assert.equal(window.SupabaseBackendSync.readAuthBlockStatus().readiness, 'local-mode');
  dom.window.close();
}

async function testAuthBlockResetsAfterTokenChange() {
  const { dom, window, fetchCalls } = createDom({
    fetchImpl: () => new Response(JSON.stringify({ error: true }), { status: 401 }),
  });
  window.SupabaseSession = { access_token: 'old-token', user: { id: 'u1' } };
  dispatchAuth(window, 'SIGNED_IN');

  window.SupabaseBackendSync.syncProfile('Anna');
  await wait();

  let status = window.SupabaseBackendSync.readAuthBlockStatus();
  assert.equal(fetchCalls.length, 2);
  assert.equal(status.blocked, true);
  assert.equal(status.lastStatus, 401);
  assert.equal(status.lastEndpoint, '/api/profile');
  assert.equal(status.warningEligible, false);

  window.SupabaseSession = { access_token: 'new-token', user: { id: 'u1' } };
  window.dispatchEvent(new window.CustomEvent('supabaseSessionChanged', {
    detail: { session: window.SupabaseSession, event: 'TOKEN_REFRESHED', tokenChanged: true },
  }));
  await wait();

  status = window.SupabaseBackendSync.readAuthBlockStatus();
  assert.equal(status.blocked, false);
  assert.equal(status.failedAttempts, 0);
  assert.equal(status.lastStatus, 0);
  dom.window.close();
}

async function testRepeatedAuthFailuresBecomeWarningEligible() {
  const { dom, window, fetchCalls } = createDom({
    config: { AUTH_BLOCK_SHORT_RETRY_MS: 0, AUTH_BLOCK_RETRY_MS: 1000 },
    fetchImpl: (_url, _opts, callCount) => new Response(JSON.stringify({ error: true }), {
      status: callCount % 2 === 0 ? 403 : 401,
    }),
  });
  window.SupabaseSession = { access_token: 'stable-token', user: { id: 'u1' } };
  dispatchAuth(window, 'SIGNED_IN');

  for (let i = 0; i < 3; i += 1) {
    window.SupabaseBackendSync.syncProfile('Anna');
    await wait();
  }

  const status = window.SupabaseBackendSync.readAuthBlockStatus();
  assert.equal(fetchCalls.length, 6);
  assert.equal(status.blocked, true);
  assert.equal(status.failedAttempts, 3);
  assert.equal(status.warningEligible, true);
  assert.equal(status.lastStatus, 403);
  dom.window.close();
}

async function testSingleAuthFailureRetriesBeforeBlocking() {
  const { dom, window, fetchCalls } = createDom({
    fetchImpl: (_url, _opts, callCount) => new Response(JSON.stringify({ ok: true }), {
      status: callCount === 1 ? 401 : 200,
    }),
  });
  window.SupabaseSession = { access_token: 'stable-token', user: { id: 'u1' } };
  dispatchAuth(window, 'SIGNED_IN');

  window.SupabaseBackendSync.syncProfile('Anna');
  await wait();

  const status = window.SupabaseBackendSync.readAuthBlockStatus();
  assert.equal(fetchCalls.length, 2);
  assert.equal(status.blocked, false);
  assert.equal(status.failedAttempts, 0);
  assert.equal(status.lastStatus, 0);
  dom.window.close();
}

await testNoTokenDoesNotFetch();
await testAuthInitializingDoesNotFetch();
await testLocalModeDoesNotFetch();
await testAuthBlockResetsAfterTokenChange();
await testRepeatedAuthFailuresBecomeWarningEligible();
await testSingleAuthFailureRetriesBeforeBlocking();

console.log('backend-sync auth retry tests passed');
