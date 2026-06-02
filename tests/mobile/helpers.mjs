import { expect } from '@playwright/test';

/** Bottom-navigation tab ids, in order. */
export const TABS = ['start', 'training', 'challenges', 'freunde', 'profil'];

// Runs in the page BEFORE any app script. Enables the offline "local play"
// mode so the Supabase auth gate is bypassed and we land on the dashboard.
export function enableLocalMode() {
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
export async function blockExternalAndHeavy(page, baseURL) {
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

// In local mode the Supabase auth gate removes itself. Offline (its CDN script
// is blocked in these tests) it can linger as a full-screen overlay (#authGate,
// z-index 99999) and intercept taps on the dashboard beneath it. Wait for it to
// go, then drop any residual node so interactions hit the real UI.
export async function dismissAuthGate(page) {
  await page
    .waitForFunction(() => {
      const g = document.getElementById('authGate');
      return !g || g.offsetParent === null || getComputedStyle(g).display === 'none';
    }, { timeout: 8_000 })
    .catch(() => {});
  await page.evaluate(() => { document.getElementById('authGate')?.remove(); });
}

// Boot the app straight into the dashboard shell (local play, no auth gate).
export async function bootLocalApp(page, baseURL) {
  await page.addInitScript(enableLocalMode);
  await blockExternalAndHeavy(page, baseURL);
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  const welcomeStart = page.locator('#welcomeOverlay.active button.welcome-btn');
  if (await welcomeStart.count()) {
    try { await welcomeStart.first().click({ timeout: 2000 }); } catch (e) { /* already gone */ }
  }
  await expect(page.locator('#bottomNav')).toBeVisible({ timeout: 20_000 });
  await dismissAuthGate(page);
}

// Largest amount by which page content exceeds the viewport horizontally.
export async function horizontalOverflow(page) {
  return page.evaluate(() => {
    const de = document.documentElement;
    const body = document.body;
    return Math.max(
      de.scrollWidth - de.clientWidth,
      body ? body.scrollWidth - body.clientWidth : 0
    );
  });
}

// Computed font-size (px) of every text-enterable input/textarea currently in
// the DOM that is below `min`. iOS auto-zooms on focus of such fields. Selects,
// checkboxes, radios, files, ranges and buttons do not trigger that behaviour
// and are excluded. Checks elements regardless of current visibility so inputs
// inside collapsed panels are covered too.
export async function inputsBelow(page, min = 15.5) {
  return page.evaluate((floor) => {
    const SKIP = new Set(['hidden', 'checkbox', 'radio', 'range', 'file', 'color', 'button', 'submit', 'reset']);
    const offenders = [];
    for (const el of document.querySelectorAll('input, textarea')) {
      if (el.tagName === 'INPUT' && SKIP.has(el.type)) continue;
      const size = parseFloat(getComputedStyle(el).fontSize);
      if (size && size < floor) {
        offenders.push(`${el.id || el.name || el.className || el.type || 'input'}=${size}px`);
      }
    }
    return offenders;
  }, min);
}
