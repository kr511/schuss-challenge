import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';

const source = await readFile(new URL('./updates.js', import.meta.url), 'utf8');

function waitFor(predicate, timeoutMs = 1200) {
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
          reject(new Error('Timed out waiting for updates system'));
        }
      } catch (err) {
        clearInterval(timer);
        reject(err);
      }
    }, 20);
  });
}

function createDom({ storage = {}, rawValues = {}, session = null } = {}) {
  const html = '<!doctype html><html><head></head><body>' +
    '<button id="updatesButton" type="button" style="position:relative"></button>' +
    '<div id="updatesDropdown" style="display:none;opacity:0"><div id="updatesDropdownContent"></div></div>' +
    '</body></html>';

  const dom = new JSDOM(html, {
    url: 'https://kr511.github.io/schuss-challenge/',
    runScripts: 'dangerously',
    pretendToBeVisual: true,
  });
  const { window } = dom;

  Object.entries(storage).forEach(([key, value]) => {
    window.localStorage.setItem(key, value);
  });

  window.console = { ...console, log() {}, warn() {} };
  window.SupabaseSession = session;
  window.StorageManager = {
    getRaw(key) {
      return rawValues[key] || '';
    },
  };
  window.requestAnimationFrame = (fn) => setTimeout(fn, 0);
  window.eval(source);
  window.document.dispatchEvent(new window.Event('DOMContentLoaded'));

  return { dom, window };
}

async function testReadStateSurvivesNextVisitWithDifferentUserKey() {
  const first = createDom();
  await waitFor(() => first.window.UpdatesSystem?.getState().initialized === true);

  assert.equal(first.window.UpdatesSystem.getState().unreadCount, 3);
  assert.ok(first.window.document.querySelector('.updates-badge'));

  first.window.UpdatesSystem.toggleUpdates();
  await waitFor(() => first.window.UpdatesSystem.getState().unreadCount === 0);

  const globalRead = first.window.localStorage.getItem('updates_read_global_v1');
  assert.ok(globalRead);
  assert.deepEqual(JSON.parse(globalRead).sort(), ['demo_1', 'demo_2', 'demo_3']);
  assert.equal(first.window.document.querySelector('.updates-badge'), null);

  const second = createDom({
    storage: { updates_read_global_v1: globalRead },
    rawValues: { local_user_id: 'local_after_app_boot' },
  });
  await waitFor(() => second.window.UpdatesSystem?.getState().initialized === true);

  assert.equal(second.window.UpdatesSystem.getState().unreadCount, 0);
  assert.equal(second.window.document.querySelector('.updates-badge'), null);

  first.dom.window.close();
  second.dom.window.close();
}

async function testNewUpdateStillBecomesUnread() {
  const dom = createDom({
    storage: {
      updates_read_global_v1: JSON.stringify(['old_update']),
      app_updates: JSON.stringify([
        {
          id: 'new_update',
          title: 'Neue Nachricht',
          message: 'Diese Nachricht wurde noch nicht gelesen.',
          date: Date.now(),
          priority: 'medium',
          icon: '!',
        },
      ]),
    },
    rawValues: { local_user_id: 'local_after_app_boot' },
  });
  await waitFor(() => dom.window.UpdatesSystem?.getState().initialized === true);

  assert.equal(dom.window.UpdatesSystem.getState().unreadCount, 1);
  assert.ok(dom.window.document.querySelector('.updates-badge'));

  dom.window.close();
}

await testReadStateSurvivesNextVisitWithDifferentUserKey();
await testNewUpdateStillBecomesUnread();

console.log('updates read persistence tests passed');
