import { test, expect } from '@playwright/test';

/**
 * boot.spec.ts — smoke tests that run on every push.
 * Keep these fast — they're the canary for catastrophic failures.
 */

test('hub loads without blank screen', async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('nav.nav')).toBeVisible({ timeout: 20000 });
  await expect(page.locator('.nav-title')).toContainText('Sales Intelligence Hub');
});

test('stats bar renders', async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('.stats-bar')).toBeVisible({ timeout: 20000 });
  await expect(page.locator('.sb-lbl').first()).toBeVisible();
});

test('no fatal JS errors on load', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('./');
  // Wait for full boot (not just nav) before checking errors
  await expect(page.locator('.nav-status')).toContainText('Live', { timeout: 30000 });
  // Filter out expected 403s (RLS policy on merge_suggestions etc.)
  const fatal = errors.filter(e =>
    !e.includes('403') &&
    !e.includes('Failed to fetch') // network in CI
  );
  expect(fatal).toHaveLength(0);
});

test('company count is non-zero', async ({ page }) => {
  await page.goto('./');
  // Wait for data to fully load before checking count
  await expect(page.locator('.nav-status')).toContainText('Live', { timeout: 30000 });
  await page.evaluate(() => {
    window.clearAI?.();
    window.setFilter?.('all', document.querySelector('#sbAll'));
  });
  await expect(page.locator('.c-row').first()).toBeVisible({ timeout: 20000 });
  await expect(page.locator('#stAll')).not.toHaveText('0');
});

test('filter chips visible', async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('nav.nav')).toBeVisible({ timeout: 20000 });
  await expect(page.locator('#sbClient')).toBeVisible({ timeout: 15000 });
  await expect(page.locator('#sbProspect')).toBeVisible();
  await expect(page.locator('#sbPartner')).toBeVisible();
});
