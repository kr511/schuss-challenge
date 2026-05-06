import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';

const source = await readFile(new URL('./src/features/online-status.js', import.meta.url), 'utf8');

function createDom({ onLine = true, workerStatus = null, local = false } = {}) {
  const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', {
    url: 'https://kr511.github.io/schuss-challenge/',
    runScripts: 'dangerously',
    pretendToBeVisual: true,
  });
  const { window } = dom;
  Object.defineProperty(window.navigator, 'onLine', { value: onLine, configurable: true });
  window.console = { ...console, warn() {} };
  if (local) window.localStorage.setItem('sd_local_play', '1');
  if (workerStatus) {
    window.SupabaseBackendSync = {
      readAuthBlockStatus() {
        return typeof workerStatus === 'function' ? workerStatus() : workerStatus;
      },
    };
  }
  window.eval(source);
  window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
  return { dom, window };
}

function banner(window) {
  return window.document.getElementById('onlineStatusBanner');
}

function isVisible(window) {
  const el = banner(window);
  return !!(el && el.style.display !== 'none');
}

function text(window) {
  return banner(window)?.textContent || '';
}

function evaluate(window) {
  window.OnlineStatus.evaluate();
}

function close(dom) {
  dom.window.close();
}

function testNoTokenNoBanner() {
  const { dom, window } = createDom({
    workerStatus: { blocked: false, tokenExists: false, failedAttempts: 0 },
  });
  evaluate(window);
  assert.equal(isVisible(window), false);
  close(dom);
}

function testFreshWorkerBlockNoBanner() {
  const { dom, window } = createDom({
    workerStatus: {
      blocked: true,
      warningEligible: false,
      failedAttempts: 1,
      tokenExists: true,
      tokenChanged: false,
      authInitializing: false,
    },
  });
  evaluate(window);
  assert.equal(isVisible(window), false);
  close(dom);
}

function testLocalModeNoCloudBanner() {
  const { dom, window } = createDom({
    local: true,
    workerStatus: {
      blocked: true,
      warningEligible: true,
      failedAttempts: 3,
      tokenExists: true,
    },
  });
  evaluate(window);
  assert.equal(isVisible(window), false);
  close(dom);
}

function testRepeatedWorkerFailureShowsSoftBanner() {
  const { dom, window } = createDom({
    workerStatus: {
      blocked: true,
      warningEligible: true,
      failedAttempts: 3,
      tokenExists: true,
      tokenChanged: false,
      authInitializing: false,
    },
  });
  evaluate(window);
  assert.equal(isVisible(window), true);
  assert.match(text(window), /Optionaler Cloud-Sync wartet/);
  assert.match(text(window), /Training und Freunde funktionieren weiter/);
  close(dom);
}

function testAuthRestoredHidesBanner() {
  const { dom, window } = createDom({
    workerStatus: {
      blocked: true,
      warningEligible: true,
      failedAttempts: 3,
      tokenExists: true,
    },
  });
  evaluate(window);
  assert.equal(isVisible(window), true);

  window.dispatchEvent(new window.CustomEvent('schuetzen:backend-sync-auth-restored', {
    detail: { reason: 'token_changed' },
  }));
  assert.equal(isVisible(window), false);
  close(dom);
}

function testOfflineShowsBanner() {
  const { dom, window } = createDom({ onLine: false });
  evaluate(window);
  assert.equal(isVisible(window), true);
  assert.match(text(window), /Offline/);
  assert.match(text(window), /Lokales Training/);
  close(dom);
}

testNoTokenNoBanner();
testFreshWorkerBlockNoBanner();
testLocalModeNoCloudBanner();
testRepeatedWorkerFailureShowsSoftBanner();
testAuthRestoredHidesBanner();
testOfflineShowsBanner();

console.log('online-status behavior tests passed');
