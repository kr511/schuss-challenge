import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';

const source = await readFile(new URL('./error-guard.js', import.meta.url), 'utf8');

function createDom({ onLine = true } = {}) {
  const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', {
    url: 'https://kr511.github.io/schuss-challenge/',
    runScripts: 'dangerously',
    pretendToBeVisual: true,
  });
  const { window } = dom;
  Object.defineProperty(window.navigator, 'onLine', { value: onLine, configurable: true });
  const logs = { warn: [], error: [] };
  window.console = {
    ...console,
    warn(...args) { logs.warn.push(args); },
    error(...args) { logs.error.push(args); },
  };
  window.eval(source);
  return { dom, window, logs };
}

function fireRejection(window, reason) {
  const event = new window.Event('unhandledrejection', { cancelable: true });
  event.reason = reason;
  window.dispatchEvent(event);
  return event;
}

function fireError(window, props) {
  const event = new window.Event('error', { cancelable: true });
  Object.assign(event, props);
  window.dispatchEvent(event);
  return event;
}

function close(dom) { dom.window.close(); }

// 1) Öffentliche API ist vorhanden.
function testApiSurface() {
  const { dom, window } = createDom();
  const g = window.ErrorGuard;
  assert.ok(g, 'ErrorGuard global fehlt');
  for (const fn of ['isNetworkError', 'isAbortError', 'isBenignNoise', 'report', 'getErrors']) {
    assert.equal(typeof g[fn], 'function', `ErrorGuard.${fn} fehlt`);
  }
  close(dom);
}

// 2) Netzwerkfehler-Erkennung über Browser-Grenzen hinweg.
function testNetworkClassification() {
  const { dom, window } = createDom();
  const g = window.ErrorGuard;
  assert.equal(g.isNetworkError(new window.TypeError('Failed to fetch')), true);
  assert.equal(g.isNetworkError({ name: 'NetworkError', message: 'x' }), true);
  assert.equal(g.isNetworkError(new Error('Load failed')), true, 'Safari "Load failed"');
  assert.equal(g.isNetworkError(new Error('NetworkError when attempting to fetch resource.')), true);
  assert.equal(g.isNetworkError(new Error('Cannot read properties of undefined')), false);
  assert.equal(g.isNetworkError(new Error('boom')), false);
  close(dom);
}

// 3) navigator.onLine === false ⇒ als Netzwerkfehler behandeln.
function testOfflineCountsAsNetwork() {
  const { dom, window } = createDom({ onLine: false });
  assert.equal(window.ErrorGuard.isNetworkError(new Error('irgendwas')), true);
  close(dom);
}

// 4) Abgebrochene Anfragen werden als benign erkannt.
function testAbortClassification() {
  const { dom, window } = createDom();
  const g = window.ErrorGuard;
  assert.equal(g.isAbortError({ name: 'AbortError', message: 'aborted' }), true);
  assert.equal(g.isAbortError(new Error('The operation was aborted')), true);
  assert.equal(g.isAbortError(new Error('boom')), false);
  close(dom);
}

// 5) Bekanntes Browser-Rauschen wird erkannt.
function testBenignNoise() {
  const { dom, window } = createDom();
  const g = window.ErrorGuard;
  assert.equal(g.isBenignNoise('ResizeObserver loop completed with undelivered notifications.'), true);
  assert.equal(g.isBenignNoise('Script error.', { filename: '' }), true);
  assert.equal(g.isBenignNoise('Script error.', { filename: 'app.js' }), false);
  assert.equal(g.isBenignNoise('TypeError: x is not a function', {}), false);
  close(dom);
}

// 6) Netzwerk-Rejection ⇒ Online-Warnung + preventDefault, kein App-Crash.
function testNetworkRejectionRoutedToBanner() {
  const { dom, window, logs } = createDom();
  let warned = null;
  window.addEventListener('schuetzen:online-warning', (e) => { warned = e.detail; });

  const event = fireRejection(window, new window.TypeError('Failed to fetch'));

  assert.ok(warned, 'schuetzen:online-warning wurde nicht ausgelöst');
  assert.equal(warned.source, 'error-guard');
  assert.match(warned.reason, /Lokales Training/);
  assert.equal(event.defaultPrevented, true, 'Netzwerk-Rejection sollte preventDefault aufrufen');
  assert.equal(logs.warn.length, 1, 'Netzwerkfehler sollte als warn geloggt werden');
  assert.equal(logs.error.length, 0, 'Netzwerkfehler darf keinen error-Log erzeugen');
  // Im Verlauf erfasst.
  assert.equal(window.ErrorGuard.getErrors().some(e => e.type === 'network'), true);
  close(dom);
}

// 7) Abgebrochene Rejection ⇒ still geschluckt, kein Banner, kein Log.
function testAbortRejectionSilent() {
  const { dom, window, logs } = createDom();
  let warned = false;
  window.addEventListener('schuetzen:online-warning', () => { warned = true; });

  const event = fireRejection(window, { name: 'AbortError', message: 'aborted' });

  assert.equal(warned, false, 'AbortError darf kein Banner zeigen');
  assert.equal(event.defaultPrevented, true);
  assert.equal(logs.warn.length, 0);
  assert.equal(logs.error.length, 0);
  close(dom);
}

// 8) Echte Rejection ⇒ geloggt, erfasst, preventDefault.
function testGenericRejectionLogged() {
  const { dom, window, logs } = createDom();
  const event = fireRejection(window, new Error('etwas ging schief'));
  assert.equal(logs.error.length, 1, 'echte Rejection sollte als error geloggt werden');
  assert.equal(event.defaultPrevented, true);
  const errs = window.ErrorGuard.getErrors();
  assert.equal(errs.some(e => e.type === 'rejection'), true);
  close(dom);
}

// 9) Benign 'error'-Event wird unterdrückt und nicht erfasst.
function testBenignErrorSuppressed() {
  const { dom, window, logs } = createDom();
  const event = fireError(window, { message: 'ResizeObserver loop limit exceeded', filename: '' });
  assert.equal(event.defaultPrevented, true, 'benignes error-Event sollte preventDefault aufrufen');
  assert.equal(logs.error.length, 0);
  assert.equal(window.ErrorGuard.getErrors().length, 0, 'benignes Rauschen darf nicht erfasst werden');
  close(dom);
}

// 10) Echtes 'error'-Event ⇒ erfasst & geloggt, bleibt für DevTools sichtbar (kein preventDefault).
function testRealErrorRecorded() {
  const { dom, window, logs } = createDom();
  const event = fireError(window, {
    message: 'x is not a function',
    filename: 'app.js',
    lineno: 42,
    colno: 7,
    error: new Error('x is not a function'),
  });
  assert.equal(logs.error.length, 1);
  assert.equal(event.defaultPrevented, false, 'echte Fehler sollen in DevTools sichtbar bleiben');
  const errs = window.ErrorGuard.getErrors();
  assert.equal(errs.some(e => e.type === 'error' && /app\.js:42:7/.test(e.message)), true);
  close(dom);
}

// 11) Dedup: identische Meldung wird im Zeitfenster nur einmal geloggt.
function testDedup() {
  const { dom, window, logs } = createDom();
  fireRejection(window, new Error('gleicher fehler'));
  fireRejection(window, new Error('gleicher fehler'));
  fireRejection(window, new Error('gleicher fehler'));
  assert.equal(logs.error.length, 1, 'identische Meldung sollte nur einmal geloggt werden');
  close(dom);
}

// 12) Doppel-Init verändert die öffentliche API nicht.
function testDoubleInitGuard() {
  const { dom, window } = createDom();
  const first = window.ErrorGuard;
  window.eval(source); // erneut ausführen
  assert.equal(window.ErrorGuard, first, 'ErrorGuard sollte bei Doppel-Init unverändert bleiben');
  close(dom);
}

// 13) report() erfasst manuell gemeldete Fehler.
function testManualReport() {
  const { dom, window, logs } = createDom();
  window.ErrorGuard.report(new Error('manuell'), 'TestKontext');
  assert.equal(logs.warn.length, 1);
  assert.equal(window.ErrorGuard.getErrors().some(e => e.type === 'manual'), true);
  close(dom);
}

testApiSurface();
testNetworkClassification();
testOfflineCountsAsNetwork();
testAbortClassification();
testBenignNoise();
testNetworkRejectionRoutedToBanner();
testAbortRejectionSilent();
testGenericRejectionLogged();
testBenignErrorSuppressed();
testRealErrorRecorded();
testDedup();
testDoubleInitGuard();
testManualReport();

console.log('error-guard tests passed');
