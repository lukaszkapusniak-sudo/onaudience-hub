import { test, expect } from '@playwright/test';

test('merge_suggestions 403 does not crash hub', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.route('**/merge_suggestions**', route => {
    route.fulfill({ status: 403, body: 'Forbidden' });
  });
  await page.goto('./');
  await expect(page.locator('.app')).toBeVisible({ timeout: 20000 });
  await expect(page.locator('.app')).toBeVisible({ timeout: 20000 });
  await expect(page.locator('nav.nav')).toBeVisible({ timeout: 10000 });
  await expect(page.locator('.stats-bar')).toBeVisible({ timeout: 10000 });
  expect(errors).toHaveLength(0);
});

test('AI bar accepts input', async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('.app')).toBeVisible({ timeout: 20000 });
  await expect(page.locator('.app')).toBeVisible({ timeout: 20000 });
  await expect(page.locator('nav.nav')).toBeVisible({ timeout: 10000 });
  const aiInput = page.locator('input[placeholder*="EU DSPs"]').first();
  if (await aiInput.isVisible()) {
    await aiInput.fill('EU DSPs with CTV');
    await expect(aiInput).toHaveValue('EU DSPs with CTV');
  }
});
