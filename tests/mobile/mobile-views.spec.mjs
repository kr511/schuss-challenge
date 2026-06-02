import { test, expect } from '@playwright/test';
import { bootLocalApp, horizontalOverflow, inputsBelow } from './helpers.mjs';

/**
 * Full-coverage mobile verification of the app's views and overlays.
 *
 * For each major surface we open it via its real (verified global) trigger and
 * assert the unambiguous mobile invariants: no horizontal overflow and the
 * opened container fits within the viewport width. A final test sweeps EVERY
 * text input/textarea in the DOM (after revealing the JS-injected ones) for the
 * >= 16px iOS-no-zoom rule.
 *
 * Deep runtime states that need network/hardware (a live duel, a real scored
 * scheibenfoto via the TF model) are intentionally out of scope for a layout
 * suite — those require integration fixtures.
 */

// open: function evaluated in the page. sel: container that should appear.
// close: optional teardown. required: must open, else the test fails.
const OVERLAYS = [
  {
    name: 'Duel setup sheet',
    open: () => window.openDuelSetup && window.openDuelSetup(),
    sel: '#duelSetupSheet',
    close: () => window.closeDuelSetup && window.closeDuelSetup(),
    required: true
  },
  {
    name: 'Profile sheet',
    open: () => window.toggleProfileMenu && window.toggleProfileMenu(),
    sel: '#profileSheet',
    close: () => window.toggleProfileMenu && window.toggleProfileMenu(),
    required: true
  },
  {
    name: 'Leaderboard screen',
    open: () => window.showScreen && window.showScreen('screenLeaderboard'),
    sel: '#screenLeaderboard',
    close: null,
    required: false
  },
  {
    name: 'Updates dropdown',
    open: () => window.UpdatesSystem && window.UpdatesSystem.toggleUpdates && window.UpdatesSystem.toggleUpdates(),
    sel: '#updatesDropdown',
    close: () => window.UpdatesSystem && window.UpdatesSystem.toggleUpdates && window.UpdatesSystem.toggleUpdates(),
    required: false
  }
];

async function isVisibleSoon(locator, timeout = 4000) {
  if (await locator.isVisible().catch(() => false)) return true;
  return locator.waitFor({ state: 'visible', timeout }).then(() => true).catch(() => false);
}

async function fitsViewport(page, selector) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return { ok: true, missing: true };
    const r = el.getBoundingClientRect();
    return { ok: r.left >= -2 && r.right <= window.innerWidth + 2, left: r.left, right: r.right, vw: window.innerWidth };
  }, selector);
}

test.describe('mobile overlays', () => {
  test('open without horizontal overflow and fit the viewport', async ({ page, baseURL }) => {
    await bootLocalApp(page, baseURL);

    for (const o of OVERLAYS) {
      await test.step(o.name, async () => {
        await page.evaluate(o.open).catch(() => {});
        const appeared = await isVisibleSoon(page.locator(o.sel).first());

        if (!appeared) {
          if (o.required) {
            expect(appeared, `${o.name} (${o.sel}) did not open`).toBeTruthy();
          } else {
            test.info().annotations.push({ type: 'skip', description: `${o.name} did not open offline` });
            return;
          }
        }

        await page.waitForTimeout(350); // settle slide/transition
        const overflow = await horizontalOverflow(page);
        expect(overflow, `${o.name} overflows by ${overflow}px`).toBeLessThanOrEqual(2);

        const fit = await fitsViewport(page, o.sel);
        expect(fit.ok, `${o.name} not within viewport: left=${fit.left} right=${fit.right} vw=${fit.vw}`).toBeTruthy();

        if (o.close) {
          await page.evaluate(o.close).catch(() => {});
          await page.waitForTimeout(250);
        }
      });
    }
  });

  test('profile tabs render without horizontal overflow', async ({ page, baseURL }) => {
    await bootLocalApp(page, baseURL);
    await page.evaluate(() => window.toggleProfileMenu && window.toggleProfileMenu());
    await expect(page.locator('#profileSheet')).toBeVisible({ timeout: 8000 });

    for (const tab of ['stats', 'sun', 'history', 'settings']) {
      await page.evaluate((t) => window.switchProfileTab && window.switchProfileTab(t), tab);
      await page.waitForTimeout(300);
      const overflow = await horizontalOverflow(page);
      expect(overflow, `profile tab "${tab}" overflows by ${overflow}px`).toBeLessThanOrEqual(2);
    }
  });
});

test.describe('mobile inputs (app-wide)', () => {
  test('no text input uses < 16px font anywhere', async ({ page, baseURL }) => {
    await bootLocalApp(page, baseURL);

    // Reveal JS-injected inputs by visiting the views that create them.
    await page.evaluate(() => window.switchTab && window.switchTab('freunde')); // -> #fpFriendCodeInput
    await page.waitForTimeout(400);
    await page.evaluate(() => window.toggleProfileMenu && window.toggleProfileMenu());
    await page.evaluate(() => window.switchProfileTab && window.switchProfileTab('settings')); // -> #settingsNameInput
    await page.waitForTimeout(400);
    // Best-effort: a chat injects its message textarea ([data-cv-input]).
    await page
      .evaluate(() => window.ChatView && window.ChatView.open && window.ChatView.open({ userId: 'test', id: 'test', name: 'Test' }))
      .catch(() => {});
    await page.waitForTimeout(300);

    const offenders = await inputsBelow(page, 15.5);
    expect(offenders, `inputs below 16px: ${offenders.join(', ')}`).toEqual([]);
  });
});
