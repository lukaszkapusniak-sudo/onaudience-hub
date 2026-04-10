/**
 * composer-vue.spec.ts — Vue Composer (Meeseeks) drawer
 *
 * Tests: shell compose button opens drawer,
 * persona grid renders with tiles, close works.
 */
import { test, expect } from '@playwright/test';

import { VUE_URL } from './env';

test.beforeEach(async ({ page }) => {
  await page.goto(VUE_URL + 'data');
  await expect(page.locator('.shell')).toBeVisible({ timeout: 20000 });
  await expect(page.locator('.shell__compose')).toBeVisible({ timeout: 10000 });
});

test('Compose button opens the drawer', async ({ page }) => {
  await page.locator('.shell__compose').click();
  await expect(page.locator('#mcDrawer')).toHaveClass(/mc-drawer--open/, { timeout: 5000 });
});

test('drawer contains Meeseeks title', async ({ page }) => {
  await page.locator('.shell__compose').click();
  await expect(page.locator('#mcDrawer')).toHaveClass(/mc-drawer--open/, { timeout: 5000 });
  await expect(page.locator('#mcDrawer')).toContainText('Meeseeks', { timeout: 3000 });
});

test('persona grid renders inside drawer', async ({ page }) => {
  await page.locator('.shell__compose').click();
  await expect(page.locator('#mcDrawer')).toHaveClass(/mc-drawer--open/, { timeout: 5000 });
  await expect(page.locator('.mc-ptile').first()).toBeVisible({ timeout: 5000 });
});

test('persona grid has at least 8 tiles', async ({ page }) => {
  await page.locator('.shell__compose').click();
  await expect(page.locator('#mcDrawer')).toHaveClass(/mc-drawer--open/, { timeout: 5000 });
  await expect(page.locator('.mc-ptile').first()).toBeVisible({ timeout: 5000 });
  const count = await page.locator('.mc-ptile').count();
  expect(count).toBeGreaterThanOrEqual(8);
});

test('clicking a persona tile marks it active', async ({ page }) => {
  await page.locator('.shell__compose').click();
  await expect(page.locator('#mcDrawer')).toHaveClass(/mc-drawer--open/, { timeout: 5000 });
  await expect(page.locator('.mc-ptile').first()).toBeVisible({ timeout: 5000 });
  const tiles = page.locator('.mc-ptile');
  const second = tiles.nth(1);
  await second.click();
  await expect(second).toHaveClass(/active/, { timeout: 2000 });
});

test('Escape key closes the drawer', async ({ page }) => {
  await page.locator('.shell__compose').click();
  await expect(page.locator('#mcDrawer')).toHaveClass(/mc-drawer--open/, { timeout: 5000 });
  await page.keyboard.press('Escape');
  await expect(page.locator('#mcDrawer')).not.toHaveClass(/mc-drawer--open/, { timeout: 3000 });
});

test('drawer has two-panel layout: mc-left and mc-right', async ({ page }) => {
  await page.locator('.shell__compose').click();
  await expect(page.locator('#mcDrawer')).toHaveClass(/mc-drawer--open/, { timeout: 5000 });
  await expect(page.locator('.mc-left')).toBeVisible({ timeout: 3000 });
  await expect(page.locator('.mc-right')).toBeVisible({ timeout: 3000 });
});

test('drawer fills most of the viewport width when open', async ({ page }) => {
  await page.locator('.shell__compose').click();
  await expect(page.locator('#mcDrawer')).toHaveClass(/mc-drawer--open/, { timeout: 5000 });
  const rect = await page.evaluate(() => {
    const el = document.getElementById('mcDrawer');
    return el ? el.getBoundingClientRect().width : 0;
  });
  const vw = await page.evaluate(() => window.innerWidth);
  expect(rect).toBeGreaterThan(vw * 0.5);
});
