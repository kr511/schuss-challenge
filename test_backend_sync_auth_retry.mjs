import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM, VirtualConsole } from 'jsdom';

const backendSyncSource = await readFile(new URL('./backend-sync.js', import.meta.url), 'utf8');
const onlineStatusSource = await readFile(new URL('./src/features/online-status.js', import.meta.url), 'utf8');

function waitFor(predicate, timeoutMs = 1500) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const timer = setInterval(() => {
      try {
        if (predicate()) {
          clearInterval(timer);
          resolve();
          return;
        }
        if (Date.now() - started > timeoutMs) {
          clearInterval(timer);
          reject(new Error('Timed out waiting for backend sync auth retry'));
        }
      } catch (error) {
        clearInterval(timer);
        reject(error);
      }
    }, 20);
  });
}

function flush() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

const virtualConsole = new VirtualConsole();
virtualConsole.on('jsdomError', (error) => { console.error(error); });

const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', {
  url: 'https://kr511.github.io/schuss-challenge/',
  runScripts: 'dangerously',
  pretendToBeVisual: true,
  virtualConsole,
});

const { window } = dom;
const fetchCalls = [];
const blockedEvents = [];
const restoredEvents = [];
let activeToken = 'token-old';
let nextStatus = 401;

window.console = { ...console, log() {}, warn() {} };
window.SchussduellLocalMode = false;
window.SchussduellLocalPlay = false;
window.SupabaseSession = null;
window.SupabaseAuth = {
  getSession() {
    return { access_token: activeToken };
  },
};
window.fetch = async (url, options = {}) => {
  fetchCalls.push({
    url: String(url),
    authorization: options.headers && options.headers.Authorization,
  });
  return {
    status: nextStatus,
    ok: nextStatus >= 200 && nextStatus < 300,
    json: async () => ({ ok: true }),
  };
};

window.addEventListener('schuetzen:backend-sync-auth-blocked', (event) => {
  blockedEvents.push(event.detail);
});
window.addEventListener('schuetzen:backend-sync-auth-restored', (event) => {
  restoredEvents.push(event.detail);
});

window.eval(backendSyncSource);
window.eval(onlineStatusSource);
window.document.dispatchEvent(new window.Event('DOMContentLoaded'));

assert.equal(window.SupabaseBackendSync.isReady(), true);

window.SupabaseBackendSync.syncProfile('Tester');
await waitFor(() => blockedEvents.length === 1);
await flush();

assert.equal(fetchCalls.length, 1);
assert.equal(fetchCalls[0].authorization, 'Bearer token-old');
assert.equal(window.SupabaseBackendSync.isWorkerAuthBlocked(), true);

let status = window.SupabaseBackendSync.getAuthBlockStatus();
assert.equal(status.blocked, true);
assert.equal(status.hasTokenAtAuthBlock, true);
assert.equal(status.tokenChanged, false);

const banner = window.document.getElementById('onlineStatusBanner');
assert.ok(banner);
assert.equal(banner.style.display, 'flex');
assert.match(banner.textContent, /Cloud-Sync pausiert/);
assert.doesNotMatch(banner.textContent, /nicht angemeldet/);

window.SupabaseBackendSync.syncProfile('Tester');
await flush();
assert.equal(fetchCalls.length, 1, 'sync remains paused while the old token is blocked');

activeToken = 'token-new';
nextStatus = 200;
status = window.SupabaseBackendSync.getAuthBlockStatus();
assert.equal(status.tokenChanged, true);

assert.equal(window.SupabaseBackendSync.isReady(), true);
await waitFor(() => restoredEvents.length === 1);

window.SupabaseBackendSync.syncProfile('Tester');
await waitFor(() => fetchCalls.length === 2);
await flush();

assert.equal(fetchCalls[1].authorization, 'Bearer token-new');
assert.equal(window.SupabaseBackendSync.isWorkerAuthBlocked(), false);
assert.equal(window.SupabaseBackendSync.getAuthBlockStatus().blocked, false);
assert.equal(banner.style.display, 'none');

window.SupabaseBackendSync.resetAuthBlock('manual-test');
window.close();

console.log('backend sync auth retry tests passed');
