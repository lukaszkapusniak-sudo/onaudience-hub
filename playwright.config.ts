import { execSync } from 'node:child_process';
import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

import { HUB_URL } from './tests/env';

dotenv.config();

const IS_CI = !!process.env.CI;

// Use system chromium if the playwright-managed one isn't downloaded
const CHROME =
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ||
  (() => {
    const paths = [
      '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
      '/usr/bin/chromium-browser',
      '/usr/bin/chromium',
      '/usr/bin/google-chrome',
    ];
    for (const p of paths) {
      try {
        execSync(`test -x ${p}`);
        return p;
      } catch {
        /* try next candidate */
      }
    }
    return undefined; // let playwright find its own
  })();

export default defineConfig({
  testDir: './tests',
  timeout: IS_CI ? 60_000 : 30_000,
  retries: IS_CI ? 2 : 0,
  workers: IS_CI ? 1 : undefined,

  use: {
    baseURL: HUB_URL,
    headless: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: IS_CI ? 20_000 : 8_000,
    navigationTimeout: IS_CI ? 45_000 : 20_000,
    ...(CHROME ? { executablePath: CHROME } : {}),
  },

  projects: [
    {
      name: 'setup',
      testDir: './tests/fixtures',
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/fixtures/.auth.json',
        ...(CHROME ? { executablePath: CHROME } : {}),
      },
      dependencies: ['setup'],
    },
    // api-only: no browser, no auth — pure HTTP requests to proxy/edge functions
    // Inherits `use` from root (incl. executablePath when CHROME is set).
    {
      name: 'api-only',
      testMatch: /lemlist\.spec\.ts|.*\.api\.spec\.ts|.*\.unit\.spec\.ts/,
    },
  ],

  reporter: [['html', { open: 'never' }], ['list'], ...(IS_CI ? [['github'] as ['github']] : [])],
});
