/**
 * auth.setup.ts
 *
 * The hub shows a login screen on boot — .app stays display:none until
 * Supabase auth resolves. We must sign in so the session token is saved
 * into storage state for all downstream tests to inherit.
 */
import { test as setup, expect } from '@playwright/test';
import dotenv from 'dotenv';
dotenv.config();

const HUB = 'https://lukaszkapusniak-sudo.github.io/onaudience-hub/hub/';

setup('authenticate', async ({ page }) => {
  await page.goto(HUB);

  // ── Option A: login screen appears (first run / expired session) ──
  const loginScreen = page.locator('#oaLoginScreen');
  const loginVisible = await loginScreen.isVisible({ timeout: 8000 }).catch(() => false);

  if (loginVisible) {
    console.log('Login screen visible — signing in…');
    await page.locator('#oa-email').fill(process.env.OA_EMAIL!);
    await page.locator('#oa-pwd').fill(process.env.OA_PASSWORD!);
    await page.locator('#oa-btn').click();
    // Wait for login screen to dismiss and .app to appear
    await expect(loginScreen).toBeHidden({ timeout: 15000 });
  } else {
    console.log('No login screen — session already active via storage state');
  }

  // ── .app becomes visible after auth ──
  await expect(page.locator('.app')).toBeVisible({ timeout: 20000 });
  await expect(page.locator('nav.nav')).toBeVisible({ timeout: 10000 });

  // ── Wait for Supabase data to load ──
  await expect(page.locator('.nav-status')).toContainText('Live', { timeout: 30000 });
  await page.evaluate(() => {
    window.clearAI?.();
    window.setFilter?.('all', document.querySelector('#sbAll'));
  });
  await expect(page.locator('.c-row').first()).toBeVisible({ timeout: 20000 });

  // Save session (Supabase token in localStorage → all tests inherit it)
  await page.context().storageState({ path: 'tests/fixtures/.auth.json' });
  console.log('✓ Auth setup complete — storage state saved');
});
