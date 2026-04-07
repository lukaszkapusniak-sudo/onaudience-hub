import { test as setup, expect } from '@playwright/test';
import dotenv from 'dotenv';
dotenv.config();

setup('authenticate', async ({ page }) => {
  await page.goto('https://lukaszkapusniak-sudo.github.io/onaudience-hub/hub/');

  await page.locator('input[type="email"]').fill(process.env.OA_EMAIL!);
  await page.locator('input[type="password"]').fill(process.env.OA_PASSWORD!);
  await page.locator('button', { hasText: /sign in/i }).click();

  await expect(page.locator('nav.nav')).toBeVisible({ timeout: 15000 });
  await page.context().storageState({ path: 'tests/fixtures/.auth.json' });
});
