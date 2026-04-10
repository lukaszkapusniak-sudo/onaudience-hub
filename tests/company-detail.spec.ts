/**
 * company-detail.spec.ts — Vue company detail module
 *
 * Tests: click company row → navigate to /companies/:slug,
 * panel renders with back nav, CompanyHeader CTA bar has actions.
 */
import { test, expect } from '@playwright/test';

import { VUE_URL } from './env';

test.beforeEach(async ({ page }) => {
  await page.goto(VUE_URL + 'data');
  // Wait for shell to boot
  await expect(page.locator('.shell')).toBeVisible({ timeout: 20000 });
  // Wait for at least one company row
  await expect(page.locator('.c-row').first()).toBeVisible({ timeout: 45000 });
});

test('clicking company row navigates to detail route', async ({ page }) => {
  await page.locator('.c-row').first().click();
  await expect(page).toHaveURL(/\/companies\//, { timeout: 10000 });
});

test('detail view shows back navigation', async ({ page }) => {
  await page.locator('.c-row').first().click();
  await expect(page.locator('.cdv__back')).toBeVisible({ timeout: 10000 });
});

test('company header renders after navigation', async ({ page }) => {
  await page.locator('.c-row').first().click();
  // Wait for panel to load (either fast from cache or after fetch)
  await expect(page.locator('.cdv__panel')).toBeVisible({ timeout: 15000 });
  await expect(page.locator('.ch__name')).toBeVisible({ timeout: 5000 });
});

test('CTA bar is visible with action buttons', async ({ page }) => {
  await page.locator('.c-row').first().click();
  await expect(page.locator('.cdv__panel')).toBeVisible({ timeout: 15000 });
  await expect(page.locator('.ch__cta')).toBeVisible({ timeout: 5000 });
  const btnCount = await page.locator('.ch__cta .ch__btn, .ch__cta a.ch__btn').count();
  expect(btnCount).toBeGreaterThanOrEqual(4);
});

test('back button returns to companies list', async ({ page }) => {
  await page.locator('.c-row').first().click();
  await expect(page.locator('.cdv__back')).toBeVisible({ timeout: 10000 });
  await page.locator('.cdv__back').click();
  await expect(page).toHaveURL(/\/data/, { timeout: 5000 });
});

test('company facts table renders', async ({ page }) => {
  await page.locator('.c-row').first().click();
  await expect(page.locator('.cdv__panel')).toBeVisible({ timeout: 15000 });
  await expect(page.locator('.cft')).toBeVisible({ timeout: 5000 });
});
