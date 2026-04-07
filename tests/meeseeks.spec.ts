import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('nav.nav')).toBeVisible({ timeout: 15000 });
});

test('compose button opens meeseeks drawer', async ({ page }) => {
  await page.locator('button[onclick*="openComposer"]').first().click();
  await page.waitForTimeout(1000);
  const drawer = page.locator('.mc-drawer').first();
  await expect(drawer).toBeVisible({ timeout: 8000 });
});

test('meeseeks drawer has persona nav', async ({ page }) => {
  await page.locator('button[onclick*="openComposer"]').first().click();
  const personaNav = page.locator('.mc-nav').first();
  await expect(personaNav).toBeVisible({ timeout: 8000 });
});
