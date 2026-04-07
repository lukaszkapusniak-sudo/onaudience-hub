import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('nav.nav')).toBeVisible({ timeout: 15000 });
  await expect(page.locator('.co-row').first()).toBeVisible({ timeout: 15000 });
});

test('click company row opens detail panel', async ({ page }) => {
  await page.locator('.co-row').first().click();
  const detail = page.locator('.detail, .co-detail, [class*="detail"]').first();
  await expect(detail).toBeVisible({ timeout: 8000 });
});

test('detail panel has CTA bar', async ({ page }) => {
  await page.locator('.co-row').first().click();
  const cta = page.locator('.cta-bar, .cta, [class*="cta"]').first();
  await expect(cta).toBeVisible({ timeout: 8000 });
});

test('foldable sections toggle without crash', async ({ page }) => {
  await page.locator('.co-row').first().click();
  await page.waitForTimeout(1000);
  const foldable = page.locator('[onclick*="fold"], .fold-head, [class*="fold"]').first();
  if (await foldable.isVisible()) {
    await foldable.click();
    await page.waitForTimeout(300);
  }
  await expect(page.locator('nav.nav')).toBeVisible();
});
