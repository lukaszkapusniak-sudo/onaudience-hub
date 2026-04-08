import dotenv from "dotenv";
dotenv.config();

/**
 * helpers.ts — shared test utilities
 *
 * The hub renders a login screen on boot (.app stays display:none until auth).
 * With storageState the Supabase session is restored automatically, but we
 * still need to wait for auth.js to finish before asserting nav visibility.
 */
import { Page, expect } from '@playwright/test';

/**
 * waitForHub — navigate to hub and wait until it is fully booted and data loaded.
 * Works whether or not a login screen appears (storageState should prevent it,
 * but this is defensive).
 */
export async function waitForHub(page: Page) {
  await page.goto('./');

  // If login screen appears despite storage state (e.g. expired token), sign in
  const loginScreen = page.locator('#oaLoginScreen');
  const loginVisible = await loginScreen.isVisible({ timeout: 5000 }).catch(() => false);
  if (loginVisible) {
    const email = process.env.OA_EMAIL;
    const pwd   = process.env.OA_PASSWORD;
    if (!email || !pwd) throw new Error('OA_EMAIL / OA_PASSWORD env vars not set');
    await page.locator('#oa-email').fill(email);
    await page.locator('#oa-pwd').fill(pwd);
    await page.locator('#oa-btn').click();
    await expect(loginScreen).toBeHidden({ timeout: 15000 });
  }

  // .app becomes visible after auth completes
  await expect(page.locator('.app')).toBeVisible({ timeout: 20000 });
  // nav.nav is inside .app — safe to check now
  await expect(page.locator('nav.nav')).toBeVisible({ timeout: 10000 });
  // Wait for Supabase data
  await expect(page.locator('.nav-status')).toContainText('Live', { timeout: 30000 });
}

/**
 * waitForHubWithRows — waitForHub + ensures company list is loaded and visible.
 */
export async function waitForHubWithRows(page: Page) {
  await waitForHub(page);
  await page.evaluate(() => {
    window.clearAI?.();
    window.setFilter?.('all', document.querySelector('#sbAll'));
  });
  await expect(page.locator('.c-row').first()).toBeVisible({ timeout: 20000 });
}
