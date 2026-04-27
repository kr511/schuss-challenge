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

const virtualConsole = new VirtualConsole();
virtualConsole.on('jsdomError', (err) => {
  if (!String(err.message || '').includes('navigation')) console.error(err);
});

const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', {
  url: 'https://kr511.github.io/?code=lost-code',
  runScripts: 'dangerously',
  pretendToBeVisual: true,
  virtualConsole,
});

const { window } = dom;
window.console = { ...console, warn() {} };
window.supabase = {
  createClient() {
    return {
      auth: {
        async exchangeCodeForSession() {
          return {
            data: {},
            error: {
              message: 'PKCE code verifier not found in storage.',
            },
          };
        },
        onAuthStateChange() {},
        async getSession() {
          return { data: { session: null } };
        },
      },
    };
  },
};

window.eval(source);
window.document.dispatchEvent(new window.Event('DOMContentLoaded'));

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

window.__agLocal();
assert.equal(window.localStorage.getItem('sd_local_play'), '1');
assert.equal(window.localStorage.getItem('sd_local_mode'), '1');
assert.equal(window.document.getElementById('authGate'), null);

console.log('✅ auth-gate PKCE recovery test passed');
