import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM, VirtualConsole } from 'jsdom';

const source = await readFile(new URL('./auth-gate.js', import.meta.url), 'utf8');
const expectedMessage = 'Google-Anmeldung konnte nicht abgeschlossen werden. Bitte erneut anmelden oder lokal spielen.';

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
          reject(new Error('Timed out waiting for auth-gate state'));
        }
      } catch (err) {
        clearInterval(timer);
        reject(err);
      }
    }, 20);
  });
}

function createDom({ url = 'https://kr511.github.io/', supabase, beforeEval } = {}) {
  const navigationErrors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', (err) => {
    if (String(err.message || '').includes('navigation')) {
      navigationErrors.push(err);
      return;
    }
    console.error(err);
  });

  const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', {
    url,
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    virtualConsole,
  });

  const { window } = dom;
  window.console = { ...console, warn() {} };
  window.supabase = supabase;
  if (beforeEval) beforeEval(window);
  window.eval(source);
  window.document.dispatchEvent(new window.Event('DOMContentLoaded'));

  return { dom, window, navigationErrors };
}

async function testPkceRecovery() {
  const { window } = createDom({
    url: 'https://kr511.github.io/?code=lost-code',
    supabase: {
      createClient() {
        return {
          auth: {
            async exchangeCodeForSession() {
              return {
                data: {},
                error: { message: 'PKCE code verifier not found in storage.' },
              };
            },
            onAuthStateChange() {},
            async getSession() {
              return { data: { session: null } };
            },
          },
        };
      },
    },
  });

  await waitFor(() => window.document.getElementById('agError')?.textContent === expectedMessage);

  const error = window.document.getElementById('agError');
  const submit = window.document.getElementById('agSubmit');
  const google = window.document.getElementById('agGoogle');
  const local = window.document.getElementById('agLocal');

  assert.equal(error.textContent, expectedMessage);
  assert.equal(error.style.display, 'block');
  assert.equal(window.location.search, '');
  assert.equal(submit.disabled, false);
  assert.equal(google.disabled, false);
  assert.equal(local.disabled, false);
}

async function testLocalPlayWithoutReloadAndStorageFallback() {
  const { window, navigationErrors } = createDom({
    supabase: undefined,
    beforeEval(window) {
      Object.defineProperty(window, 'localStorage', {
        configurable: true,
        get() {
          throw new Error('localStorage blocked');
        },
      });
    },
  });

  await waitFor(() => window.document.getElementById('agLocal'));
  window.__agLocal();
  await new Promise((resolve) => setTimeout(resolve, 140));

  assert.equal(window.document.getElementById('authGate'), null);
  assert.equal(window.SchussduellLocalMode, true);
  assert.equal(window.SchussduellLocalPlay, true);
  assert.equal(window.sessionStorage.getItem('sd_local_play'), '1');
  assert.equal(window.sessionStorage.getItem('sd_local_mode'), '1');
  assert.equal(window.location.href, 'https://kr511.github.io/');
  assert.equal(navigationErrors.length, 0);
}

async function testExposeSessionLeavesLocalMode() {
  let authStateHandler = null;
  let refreshCalls = 0;
  const session = {
    access_token: 'token-123',
    user: { email: 'anna@example.com', user_metadata: {} },
  };

  const { window } = createDom({
    beforeEval(window) {
      window.refreshStateFromLocalStorage = () => {
        refreshCalls += 1;
      };
    },
    supabase: {
      createClient() {
        return {
          auth: {
            onAuthStateChange(handler) {
              authStateHandler = handler;
            },
            async getSession() {
              return { data: { session: null } };
            },
          },
        };
      },
    },
  });

  await waitFor(() => typeof authStateHandler === 'function');
  window.__agLocal();

  assert.equal(window.localStorage.getItem('sd_local_play'), '1');
  authStateHandler('SIGNED_IN', session);

  assert.equal(window.localStorage.getItem('sd_local_play'), null);
  assert.equal(window.localStorage.getItem('sd_local_mode'), null);
  assert.equal(window.SchussduellLocalMode, false);
  assert.equal(window.SchussduellLocalPlay, false);
  assert.equal(window.getSupabaseHeaders().Authorization, 'Bearer token-123');
  assert.equal(window.localStorage.getItem('sd_username'), 'anna');
  assert.equal(window.localStorage.getItem('username'), 'anna');
  assert.equal(refreshCalls, 1);
}

async function testExistingUsernameIsNotOverwritten() {
  let authStateHandler = null;
  const session = {
    access_token: 'token-456',
    user: { email: 'other@example.com', user_metadata: { name: 'Andere Person' } },
  };

  const { window } = createDom({
    beforeEval(window) {
      window.localStorage.setItem('sd_username', 'Eva');
    },
    supabase: {
      createClient() {
        return {
          auth: {
            onAuthStateChange(handler) {
              authStateHandler = handler;
            },
            async getSession() {
              return { data: { session: null } };
            },
          },
        };
      },
    },
  });

  await waitFor(() => typeof authStateHandler === 'function');
  authStateHandler('SIGNED_IN', session);

  assert.equal(window.localStorage.getItem('sd_username'), 'Eva');
  assert.equal(window.localStorage.getItem('username'), 'Eva');
}

await testPkceRecovery();
await testLocalPlayWithoutReloadAndStorageFallback();
await testExposeSessionLeavesLocalMode();
await testExistingUsernameIsNotOverwritten();

console.log('auth-gate PKCE/local-mode tests passed');
