import { defineConfig, devices } from '@playwright/test';

/**
 * Mobile end-to-end / layout verification.
 *
 * Renders the real app in a real (Chromium) browser at several mobile device
 * profiles and asserts there is no horizontal overflow, that tap targets and
 * input font-sizes meet mobile minimums, etc.
 *
 * The browser binary is downloaded via `npx playwright install chromium`.
 * In CI this happens automatically (see .github/workflows/ci.yml). Some
 * sandboxes block the Playwright CDN — in that case these tests run in CI
 * rather than locally.
 */

const PORT = Number(process.env.STATIC_PORT || 8788);
const BASE_URL = process.env.BASE_URL || `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: './tests/mobile',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['github'], ['list']] : [['list']],
  timeout: 60_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    // Offline-friendly: the app talks to Supabase/CDNs which we block in the
    // specs; keep the default navigation timeout generous for the ~60 scripts.
    navigationTimeout: 30_000
  },

  projects: [
    { name: 'iPhone SE', use: { ...devices['iPhone SE'] } },
    { name: 'iPhone 13', use: { ...devices['iPhone 13'] } },
    { name: 'Pixel 5', use: { ...devices['Pixel 5'] } },
    {
      // Smallest mainstream width still in use (iPhone 5/SE-1 class).
      name: 'Small 320',
      use: {
        ...devices['iPhone SE'],
        viewport: { width: 320, height: 568 }
      }
    }
  ],

  webServer: {
    command: `node scripts/static-server.mjs ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000
  }
});
