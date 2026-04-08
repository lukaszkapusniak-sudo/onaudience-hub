import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
dotenv.config();

const IS_CI = !!process.env.CI;

// Use system chromium if the playwright-managed one isn't downloaded
const CHROME = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
  || (() => {
    const { execSync } = require('child_process');
    const paths = [
      '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
      '/usr/bin/chromium-browser',
      '/usr/bin/chromium',
      '/usr/bin/google-chrome',
    ];
    for (const p of paths) {
      try { execSync(`test -x ${p}`); return p; } catch {}
    }
    return undefined; // let playwright find its own
  })();

export default defineConfig({
  testDir: './tests',
  timeout:  IS_CI ? 60_000 : 30_000,
  retries:  IS_CI ? 2 : 0,
  workers:  IS_CI ? 1 : undefined,

  use: {
    baseURL:           'https://lukaszkapusniak-sudo.github.io/onaudience-hub/hub/',
    headless:          true,
    screenshot:        'only-on-failure',
    video:             'retain-on-failure',
    actionTimeout:     IS_CI ? 20_000 : 8_000,
    navigationTimeout: IS_CI ? 45_000 : 20_000,
    ...(CHROME ? { executablePath: CHROME } : {}),
  },

  projects: [
    {
      name: 'setup',
      testDir:   './tests/fixtures',
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
  ],

  reporter: [
    ['html', { open: 'never' }],
    ['list'],
    ...(IS_CI ? [['github'] as ['github']] : []),
  ],
});
