import { test, expect } from '@playwright/test';

test('hub loads without blank screen', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('nav')).toBeVisible();
  await expect(page.locator('text=Sales Intelligence Hub')).toBeVisible();
});

test('stats bar renders', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('text=ALL')).toBeVisible();
  await expect(page.locator('text=CLIENTS')).toBeVisible();
});

test('no fatal JS errors on load', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('/');
  await page.waitForTimeout(3000);
  expect(errors.filter(e => !e.includes('403'))).toHaveLength(0);
});
