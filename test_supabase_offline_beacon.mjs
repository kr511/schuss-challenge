/**
 * Regression: beforeunload schickt den Offline-Status zuverlässig.
 *
 * Vorher: updateOnlineStatus(false).catch(() => {}) konnte beim Unload
 * abbrechen, weil supabase-js intern Promises kettete.
 *
 * Jetzt: fetch(..., { keepalive: true }) mit explizitem Authorization-Header.
 * sendBeacon scheidet aus, weil es keine Auth-Header zulässt (RLS würde
 * ablehnen).
 */

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM, VirtualConsole } from 'jsdom';

const source = await readFile(new URL('./supabase-social.js', import.meta.url), 'utf8');

const virtualConsole = new VirtualConsole();
virtualConsole.on('jsdomError', () => {});

const dom = new JSDOM(`<!doctype html><html><body></body></html>`, {
  url: 'https://kr511.github.io/',
  runScripts: 'dangerously',
  pretendToBeVisual: true,
  virtualConsole,
});

const { window } = dom;
window.console = { ...console, log() {}, warn() {} };
window.G = { username: 'Tester' };
window.SchussduellLocalMode = false;
window.SchussduellLocalPlay = false;

const upsertedRows = [];
const beaconCalls = [];

window.SupabaseClient = {
  supabaseUrl: 'https://test.supabase.co',
  supabaseKey: 'anon-public-key',
  from(table) {
    return {
      upsert(row) {
        upsertedRows.push({ table, row });
        return { error: null };
      }
    };
  }
};
window.SupabaseSession = {
  access_token: 'session-token-xyz',
  user: { id: 'user-1' }
};

// fetch-Stub, fängt sowohl normale als auch keepalive-Calls
window.fetch = function fetchStub(url, opts) {
  beaconCalls.push({ url, opts });
  return Promise.resolve({ ok: true });
};

window.eval(source);

// ── Test 1: sendOfflineBeacon wird beim beforeunload aufgerufen ─────────
console.log('Test 1: beforeunload → fetch mit keepalive');

window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
// SupabaseSocial init benötigt manche async-Setup, daher dispatch beforeunload erst nach kleinen Tick
await new Promise((r) => setTimeout(r, 50));
window.dispatchEvent(new window.Event('beforeunload'));
await new Promise((r) => setTimeout(r, 20));

assert.ok(beaconCalls.length >= 1, 'fetch sollte beim beforeunload mindestens einmal aufgerufen werden');
const beacon = beaconCalls[beaconCalls.length - 1];
assert.match(beacon.url, /\/rest\/v1\/online_status\?on_conflict=user_id$/);
console.log('  ✓ URL: ' + beacon.url);

// ── Test 2: keepalive: true ist gesetzt ─────────────────────────────────
console.log('Test 2: keepalive Flag gesetzt');
assert.strictEqual(beacon.opts.keepalive, true, 'keepalive muss true sein');
assert.strictEqual(beacon.opts.method, 'POST');
console.log('  ✓ keepalive=true, method=POST');

// ── Test 3: Authorization & apikey-Header gesetzt ───────────────────────
console.log('Test 3: Auth-Header gesetzt');
const h = beacon.opts.headers;
assert.strictEqual(h.Authorization, 'Bearer session-token-xyz', 'Bearer-Token muss gesetzt sein');
assert.strictEqual(h.apikey, 'anon-public-key', 'Apikey muss gesetzt sein');
assert.strictEqual(h['Content-Type'], 'application/json');
assert.match(h.Prefer, /resolution=merge-duplicates/);
console.log('  ✓ Authorization, apikey, Content-Type, Prefer gesetzt');

// ── Test 4: Body enthält user_id und online=false ───────────────────────
console.log('Test 4: Body enthält Offline-Status');
const body = JSON.parse(beacon.opts.body);
assert.strictEqual(body.user_id, 'user-1');
assert.strictEqual(body.online, false, 'online muss false sein im Offline-Beacon');
assert.strictEqual(body.username, 'Tester');
assert.ok(typeof body.last_seen === 'string');
console.log('  ✓ user_id=user-1, online=false, username=Tester');

// ── Test 5: Kein Beacon im Local-Mode ───────────────────────────────────
console.log('Test 5: Local-Mode → kein Beacon');
beaconCalls.length = 0;
window.SchussduellLocalMode = true;
window.dispatchEvent(new window.Event('beforeunload'));
await new Promise((r) => setTimeout(r, 20));
assert.strictEqual(beaconCalls.length, 0, 'Im Local-Mode darf kein Beacon gesendet werden');
console.log('  ✓ Kein fetch-Aufruf im Local-Mode');

// ── Test 6: Kein Beacon ohne Session ────────────────────────────────────
console.log('Test 6: Ohne Session → kein Beacon');
window.SchussduellLocalMode = false;
window.SupabaseSession = null;
window.dispatchEvent(new window.Event('beforeunload'));
await new Promise((r) => setTimeout(r, 20));
assert.strictEqual(beaconCalls.length, 0, 'Ohne Session darf kein Beacon gesendet werden');
console.log('  ✓ Kein fetch-Aufruf ohne Session');

console.log('\n✅ Alle Tests bestanden.');
