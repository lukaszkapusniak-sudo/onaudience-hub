import { test, expect } from '@playwright/test';

test('hub loads without blank screen', async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('nav.nav')).toBeVisible({ timeout: 10000 });
  await expect(page.locator('.nav-title')).toContainText('Sales Intelligence Hub');
});

test('stats bar renders', async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('.stats-bar')).toBeVisible({ timeout: 10000 });
  await expect(page.locator('.sb-lbl').first()).toBeVisible();
});

test('no fatal JS errors on load', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('./');
  await page.waitForTimeout(3000);
  expect(errors.filter(e => !e.includes('403'))).toHaveLength(0);
});

test('company count is non-zero', async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('#stAll')).not.toHaveText('0', { timeout: 10000 });
});

test('filter chips visible', async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('#sbClient')).toBeVisible({ timeout: 10000 });
  await expect(page.locator('#sbProspect')).toBeVisible();
  await expect(page.locator('#sbPartner')).toBeVisible();
});
