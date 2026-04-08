import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
dotenv.config();

const IS_CI = !!process.env.CI;

export default defineConfig({
  testDir: './tests',

  /* Per-test timeout — longer in CI (network latency + cold start) */
  timeout: IS_CI ? 60000 : 30000,

  /* Retry once on CI to absorb transient flakiness */
  retries: IS_CI ? 1 : 0,

  /* Run tests sequentially in CI to avoid rate-limit / race issues on shared Supabase */
  workers: IS_CI ? 1 : undefined,

  /* Shared browser context settings */
  use: {
    baseURL: 'https://lukaszkapusniak-sudo.github.io/onaudience-hub/hub/',
    headless: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    /* Extra time for each action in CI */
    actionTimeout: IS_CI ? 15000 : 5000,
    navigationTimeout: IS_CI ? 30000 : 15000,
  },

  projects: [
    /* ── Auth setup (runs first, no dependencies) ── */
    {
      name: 'setup',
      testDir: './tests/fixtures',
      testMatch: /auth\.setup\.ts/,
    },

    /* ── Main test suite ── */
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/fixtures/.auth.json',
      },
      dependencies: ['setup'],
    },
  ],

  reporter: [
    ['html', { open: 'never' }],
    ['list'],
    /* GitHub Actions annotations on failures */
    ...(IS_CI ? [['github'] as ['github']] : []),
  ],
});
