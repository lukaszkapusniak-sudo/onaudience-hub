import { defineConfig } from '@playwright/test';
import dotenv from 'dotenv';
dotenv.config();

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  use: {
    baseURL: 'https://lukaszkapusniak-sudo.github.io/onaudience-hub/hub/',
    headless: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
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
        browserName: 'chromium',
        storageState: 'tests/fixtures/.auth.json',
      },
      dependencies: ['setup'],
    },
  ],
  reporter: [['html', { open: 'never' }], ['list']],
});
