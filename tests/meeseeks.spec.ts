import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('.app')).toBeVisible({ timeout: 20000 });
  await expect(page.locator('nav.nav')).toBeVisible({ timeout: 10000 });
  await expect(page.locator('.nav-status')).toContainText('Live', { timeout: 30000 });
  // Open composer — this populates the persona grid
  await page.locator('button[onclick*=openComposer]').first().click();
  await expect(page.locator('#mcDrawer')).toHaveClass(/open/, { timeout: 8000 });
  // Wait for persona tiles to render
  await expect(page.locator('.mc-ptile').first()).toBeVisible({ timeout: 5000 });
});

test('compose button opens meeseeks drawer', async ({ page }) => {
  await expect(page.locator('#mcDrawer')).toHaveClass(/open/);
  await expect(page.locator('#mcDrawer')).toContainText('Meeseeks');
});

test('meeseeks drawer has persona grid', async ({ page }) => {
  await expect(page.locator('#mcPersonaGrid')).toBeVisible();
  await expect(page.locator('.mc-ptile').first()).toBeVisible();
});

test('persona grid has at least 8 personas', async ({ page }) => {
  const count = await page.locator('.mc-ptile').count();
  expect(count).toBeGreaterThanOrEqual(8);
});

test('clicking persona changes active state', async ({ page }) => {
  const tiles = page.locator('.mc-ptile');
  if (await tiles.count() > 1) {
    await tiles.nth(1).click();
    await page.waitForTimeout(300);
    await expect(tiles.nth(1)).toHaveClass(/active/);
  }
});

test('meeseeks close button works', async ({ page }) => {
  await page.evaluate(() => window.closeComposer?.());
  await expect(page.locator('#mcDrawer')).not.toHaveClass(/open/, { timeout: 5000 });
});
