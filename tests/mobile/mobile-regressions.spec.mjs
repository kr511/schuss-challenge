import { test, expect } from '@playwright/test';
import { blockExternalAndHeavy, bootLocalApp, horizontalOverflow } from './helpers.mjs';

test.describe('mobile regression paths', () => {
  test('24-hour goal stores weapon, discipline and whole rings', async ({ page, baseURL }) => {
    await bootLocalApp(page, baseURL);
    await page.evaluate(() => window.openGoalEditor());
    await expect(page.locator('#goalEditorPanel')).toHaveClass(/tff-open/);
    await page.locator('#goalWeaponSelect').selectOption('kk');
    await page.locator('#goalDisciplineSelect').selectOption('kk3x20');
    await page.locator('#goalCustomInput').fill('560');
    await page.getByRole('button', { name: 'Setzen', exact: true }).click();

    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('sd_dailyGoal')));
    expect(stored.version).toBe(2);
    expect(stored.weapon).toBe('kk');
    expect(stored.discipline).toBe('kk3x20');
    expect(stored.targetRings).toBe(560);
    expect(stored.expiresAt - stored.createdAt).toBe(24 * 60 * 60 * 1000);
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(2);
  });

  test('friend sort toggles and profile actions have one correct order', async ({ page, baseURL }) => {
    await bootLocalApp(page, baseURL);
    await page.evaluate(() => window.switchTab('freunde'));
    const sort = page.locator('#friendsSortBtn');
    await expect(sort).toHaveText('Online zuerst');
    await sort.click();
    await expect(sort).toHaveText('Offline zuerst');

    await page.evaluate(() => window.switchTab('profil'));
    const titles = await page.locator('#ahActions button').evaluateAll(buttons => buttons
      .map(button => ({ title: button.title, x: button.getBoundingClientRect().x }))
      .sort((a, b) => a.x - b.x)
      .map(button => button.title));
    expect(titles).toEqual(['Benachrichtigungen', 'Einstellungen']);
    await expect(page.locator('.pt-topbar')).toHaveCount(0);
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(2);
  });

  test('legal pages fit mobile viewport', async ({ page, baseURL }) => {
    await blockExternalAndHeavy(page, baseURL);
    for (const path of ['/impressum.html', '/datenschutz.html']) {
      await page.goto(path, { waitUntil: 'domcontentloaded' });
      await expect(page.locator('h1')).toBeVisible();
      expect(await horizontalOverflow(page), path).toBeLessThanOrEqual(2);
    }
  });
});
