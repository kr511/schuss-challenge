import { test, expect } from '@playwright/test';

/**
 * Real-browser mobile layout verification.
 *
 * These tests render the actual PWA (index.html + its ~60 scripts) in a real
 * Chromium engine at mobile device profiles and assert the things that only
 * show up when the page is actually laid out:
 *   - no horizontal overflow (the #1 mobile bug),
 *   - bottom-nav tap targets >= 44px,
 *   - visible inputs use >= 16px font (prevents iOS focus auto-zoom).
 */

const TABS = ['start', 'training', 'challenges', 'freunde', 'profil'];

// Runs in the page BEFORE any app script. Enables the offline "local play"
// mode so the Supabase auth gate is bypassed and we land on the dashboard.
function enableLocalMode() {
  try {
    localStorage.setItem('sd_local_play', '1');
    localStorage.setItem('sd_local_mode', '1');
    localStorage.setItem('username', 'TestGast');
    localStorage.setItem('sd_username', 'TestGast');
  } catch (e) { /* ignore */ }
}

// Block cross-origin (Supabase, CDNs, fonts, analytics) and heavy same-origin
// assets (TF.js model shards, big PNGs) so the page boots fast and
// deterministically without network. Same-origin HTML/JS/CSS is allowed.
async function blockExternalAndHeavy(page, baseURL) {
  const origin = new URL(baseURL).origin;
  await page.route('**/*', (route) => {
    const url = route.request().url();
    if (url.startsWith('data:') || url.startsWith('blob:')) return route.continue();
    if (!url.startsWith(origin)) return route.abort();
    if (/(weights\.bin|model\.json|group1-shard|_toolbox\.png|\.wasm)(\?|$)/i.test(url)) {
      return route.abort();
    }
    return route.continue();
  });
}

async function bootLocalApp(page, baseURL) {
  await page.addInitScript(enableLocalMode);
  await blockExternalAndHeavy(page, baseURL);
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  // The auth gate (#authGate) hides itself in local mode; the welcome overlay
  // auto-dismisses once a username exists. Provide a click fallback in case
  // the overlay is still up, then wait for the dashboard shell.
  const welcomeStart = page.locator('#welcomeOverlay.active button.welcome-btn');
  if (await welcomeStart.count()) {
    try { await welcomeStart.first().click({ timeout: 2000 }); } catch (e) { /* already gone */ }
  }
  await expect(page.locator('#bottomNav')).toBeVisible({ timeout: 20_000 });
}

// Largest amount by which page content exceeds the viewport horizontally.
async function horizontalOverflow(page) {
  return page.evaluate(() => {
    const de = document.documentElement;
    const body = document.body;
    return Math.max(
      de.scrollWidth - de.clientWidth,
      body ? body.scrollWidth - body.clientWidth : 0
    );
  });
}

test.describe('mobile dashboard', () => {
  test('shell renders without horizontal overflow', async ({ page, baseURL }) => {
    await bootLocalApp(page, baseURL);
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(2);
  });

  test('every bottom-nav tab renders without horizontal overflow', async ({ page, baseURL }) => {
    await bootLocalApp(page, baseURL);
    for (const tab of TABS) {
      await page.locator(`#bottomNav .bn-tab[data-tab="${tab}"]`).click();
      await page.waitForTimeout(450); // allow tab transition
      const overflow = await horizontalOverflow(page);
      expect(overflow, `tab "${tab}" overflows by ${overflow}px`).toBeLessThanOrEqual(2);
    }
  });

  test('bottom-nav tap targets are at least 44px tall', async ({ page, baseURL }) => {
    await bootLocalApp(page, baseURL);
    const tabs = page.locator('#bottomNav .bn-tab');
    const count = await tabs.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      const box = await tabs.nth(i).boundingBox();
      expect(box, `tab #${i} has no box`).not.toBeNull();
      expect(box.height, `tab #${i} only ${box?.height}px tall`).toBeGreaterThanOrEqual(44);
    }
  });

  test('visible inputs use >= 16px font (no iOS auto-zoom)', async ({ page, baseURL }) => {
    await bootLocalApp(page, baseURL);
    const tooSmall = await page.evaluate(() => {
      const offenders = [];
      for (const el of document.querySelectorAll('input, textarea')) {
        // Only inputs the user can actually focus/see right now.
        if (!el.offsetParent && getComputedStyle(el).position !== 'fixed') continue;
        if (el.type === 'hidden' || el.type === 'checkbox' || el.type === 'radio') continue;
        const size = parseFloat(getComputedStyle(el).fontSize);
        if (size && size < 15.5) {
          offenders.push(`${el.id || el.name || el.type || 'input'}=${size}px`);
        }
      }
      return offenders;
    });
    expect(tooSmall, `inputs below 16px: ${tooSmall.join(', ')}`).toEqual([]);
  });
});

test.describe('mobile auxiliary pages', () => {
  test('reset.html has no horizontal overflow', async ({ page, baseURL }) => {
    await blockExternalAndHeavy(page, baseURL);
    await page.goto('/reset.html', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(300);
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(2);
  });

  test('auth/login gate fits and uses >= 16px inputs', async ({ page, baseURL }) => {
    // No local mode -> the Supabase auth gate is shown (the first screen real
    // first-time users see on mobile).
    await blockExternalAndHeavy(page, baseURL);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const gate = page.locator('#authGate');
    await expect(gate).toBeVisible({ timeout: 20_000 });
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(2);

    const small = await page.evaluate(() => {
      const out = [];
      for (const el of document.querySelectorAll('#authGate input')) {
        const size = parseFloat(getComputedStyle(el).fontSize);
        if (size && size < 15.5) out.push(`${el.id}=${size}px`);
      }
      return out;
    });
    expect(small, `auth inputs below 16px: ${small.join(', ')}`).toEqual([]);
  });
});
