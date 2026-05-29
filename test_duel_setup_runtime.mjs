import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';

const source = await readFile(new URL('./duel-setup-runtime.js', import.meta.url), 'utf8');

const MARKUP = `<!doctype html><html><head></head><body>
  <div id="duelSetupSheetOverlay">
    <div id="duelSetupSheet">
      <div id="gameModeSelection"></div>
      <div id="duelSettingsContent"></div>
    </div>
  </div>
</body></html>`;

function createDom({ scrollLock = null } = {}) {
  const dom = new JSDOM(MARKUP, {
    url: 'https://kr511.github.io/schuss-challenge/',
    runScripts: 'dangerously',
    pretendToBeVisual: true,
  });
  const { window } = dom;
  window.console = { ...console, info() {}, warn() {}, error() {} };
  if (scrollLock) window.DuelSetupScrollLock = scrollLock;
  window.eval(source);
  return { dom, window };
}

function close(dom) { dom.window.close(); }

// 1) openSheet() darf nicht werfen und muss das Overlay tatsächlich öffnen.
//    Regression: prepareSheetScroll/unlockPageScroll/scrollLock waren nach der
//    Scroll-Lock-Konsolidierung nicht mehr definiert -> ReferenceError in
//    renderSettings() brach openSheet() ab ("Duell starten geht nicht").
function testOpenSheetOpensOverlay() {
  const { dom, window } = createDom();
  const rt = window.DuelSetupRuntime;
  assert.ok(rt && rt.initialized, 'Runtime nicht initialisiert');

  assert.doesNotThrow(() => rt.openSheet(), 'openSheet() darf nicht werfen');

  const overlay = window.document.getElementById('duelSetupSheetOverlay');
  const sheet = window.document.getElementById('duelSetupSheet');
  const settings = window.document.getElementById('duelSettingsContent');

  assert.equal(overlay.style.display, 'block', 'Overlay sollte sichtbar sein');
  assert.match(sheet.style.bottom, /^0(px)?$/, 'Sheet sollte eingefahren sein (bottom:0)');
  assert.ok(sheet.classList.contains('is-open'), 'Sheet sollte is-open haben');
  assert.match(settings.innerHTML, /duel-start-btn/, 'Start-Button sollte gerendert sein');
  close(dom);
}

// 2) Alle renderSettings-Pfade (Mode/Weapon/Discipline/Difficulty) dürfen nicht werfen.
function testRenderPathsDoNotThrow() {
  const { dom, window } = createDom();
  const rt = window.DuelSetupRuntime;
  rt.openSheet();
  assert.doesNotThrow(() => rt.setMode('multiplayer'));
  assert.doesNotThrow(() => rt.setMode('bot'));
  assert.doesNotThrow(() => rt.setWeapon('kk'));
  assert.doesNotThrow(() => rt.setDiscipline('kk100'));
  assert.doesNotThrow(() => rt.setWeapon('lg'));
  assert.doesNotThrow(() => rt.setDifficulty('hard'));
  assert.doesNotThrow(() => rt.showModeSelection());
  close(dom);
}

// 3) Resize-/Lifecycle-Listener (referenzierten scrollLock/prepareSheetScroll/
//    unlockPageScroll) dürfen nicht werfen.
function testLifecycleListenersDoNotThrow() {
  const { dom, window } = createDom();
  window.DuelSetupRuntime.openSheet();
  assert.doesNotThrow(() => window.dispatchEvent(new window.Event('resize')));
  assert.doesNotThrow(() => window.dispatchEvent(new window.Event('pagehide')));
  assert.doesNotThrow(() => window.document.dispatchEvent(new window.Event('visibilitychange')));
  close(dom);
}

// 4) startDuel() ohne window.startBattle() zeigt eine Fehlermeldung statt zu werfen.
function testStartWithoutStartBattle() {
  const { dom, window } = createDom();
  const rt = window.DuelSetupRuntime;
  rt.openSheet();
  let result;
  assert.doesNotThrow(() => { result = rt.startDuel(); });
  assert.equal(result, false, 'startDuel() sollte false liefern, wenn startBattle fehlt');
  const err = window.document.getElementById('duelStartError');
  assert.ok(err && /startBattle/.test(err.textContent), 'Fehlermeldung sollte erscheinen');
  close(dom);
}

// 5) startDuel() ruft window.startBattle() auf, wenn vorhanden.
function testStartCallsStartBattle() {
  const { dom, window } = createDom();
  let called = 0;
  window.startBattle = () => { called += 1; };
  const rt = window.DuelSetupRuntime;
  rt.openSheet();
  const result = rt.startDuel();
  assert.equal(called, 1, 'startBattle() sollte genau einmal aufgerufen werden');
  assert.equal(result, true);
  close(dom);
}

// 6) Die Scroll-Shims delegieren an das konsolidierte DuelSetupScrollLock-Modul.
function testShimsDelegateToScrollLock() {
  let forceCalls = 0;
  let unlockCalls = 0;
  const { dom, window } = createDom({
    scrollLock: {
      forceSheetScrollable() { forceCalls += 1; },
      unlock() { unlockCalls += 1; },
      getState() { return { locked: true }; },
    },
  });
  const rt = window.DuelSetupRuntime;
  rt.openSheet();           // renderSettings -> prepareSheetScroll -> forceSheetScrollable
  assert.ok(forceCalls >= 1, 'prepareSheetScroll sollte an forceSheetScrollable delegieren');

  window.dispatchEvent(new window.Event('pagehide')); // -> unlockPageScroll -> unlock
  assert.ok(unlockCalls >= 1, 'unlockPageScroll sollte an unlock delegieren');
  close(dom);
}

testOpenSheetOpensOverlay();
testRenderPathsDoNotThrow();
testLifecycleListenersDoNotThrow();
testStartWithoutStartBattle();
testStartCallsStartBattle();
testShimsDelegateToScrollLock();

console.log('duel-setup-runtime tests passed');
