import { test, expect } from '@playwright/test';
import { TABS, blockExternalAndHeavy, bootLocalApp, horizontalOverflow } from './helpers.mjs';

/**
 * Real-browser mobile layout verification.
 *
 * These tests render the actual PWA (index.html + its ~60 scripts) in real
 * mobile engines (WebKit for iPhone, Chromium for Pixel) and assert the things
 * that only show up when the page is actually laid out:
 *   - no horizontal overflow (the #1 mobile bug),
 *   - bottom-nav tap targets >= 44px,
 *   - visible inputs use >= 16px font (prevents iOS focus auto-zoom).
 *
 * Shared boot/route/measure helpers live in ./helpers.mjs.
 */

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
