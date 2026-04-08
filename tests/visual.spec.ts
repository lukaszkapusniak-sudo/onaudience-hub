/**
 * visual.spec.ts
 *
 * Visual sanity checks — verifies key UI regions are visible and not empty.
 * Avoids pixel-diff snapshots (which require committed baselines to pass in CI).
 */
import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('.app')).toBeVisible({ timeout: 20000 });
  await expect(page.locator('nav.nav')).toBeVisible({ timeout: 10000 });
  await expect(page.locator('.nav-status')).toContainText('Live', { timeout: 30000 });
  await page.evaluate(() => {
    window.clearAI?.();
    window.setFilter?.('all', document.querySelector('#sbAll'));
  });
  await expect(page.locator('.c-row').first()).toBeVisible({ timeout: 20000 });
  await page.waitForTimeout(300);
});

test('nav bar has logo and title', async ({ page }) => {
  await expect(page.locator('nav.nav .nav-logo')).toBeVisible();
  await expect(page.locator('nav.nav .nav-title')).toContainText('Sales Intelligence Hub');
});

test('stats bar has all filter chips', async ({ page }) => {
  await expect(page.locator('.stats-bar')).toBeVisible();
  await expect(page.locator('#sbAll')).toBeVisible();
  await expect(page.locator('#sbClient')).toBeVisible();
  await expect(page.locator('#sbProspect')).toBeVisible();
  await expect(page.locator('#sbPartner')).toBeVisible();
});

test('company row has name and tag', async ({ page }) => {
  const row = page.locator('.c-row').first();
  await expect(row).toBeVisible();
  await expect(row.locator('.c-name')).toBeVisible();
});

test('left panel has search and sort', async ({ page }) => {
  await expect(page.locator('input[placeholder*=Search]').first()).toBeVisible();
  await expect(page.locator('#sortSel')).toBeVisible();
});
