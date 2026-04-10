/**
 * merge-vue.spec.ts — Vue Merge module
 *
 * Tests: route renders, suggestion list or empty state shows,
 * action buttons present per suggestion, API errors don't break UI.
 */
import { test, expect } from '@playwright/test';

import { VUE_URL } from './env';

test.beforeEach(async ({ page }) => {
  await page.goto(VUE_URL + 'merge');
  await expect(page.locator('.shell')).toBeVisible({ timeout: 20000 });
  await expect(page.locator('.mv')).toBeVisible({ timeout: 10000 });
});

test('merge route renders heading', async ({ page }) => {
  await expect(page.locator('h1', { hasText: 'Merge Suggestions' })).toBeVisible({ timeout: 5000 });
});

test('merge view shows either suggestions or empty-state message', async ({ page }) => {
  // Either suggestions list or "No pending" message must appear after load
  const loaded = page.locator('.mv__list, .mv__msg:not(.mv__msg--err)');
  await expect(loaded.first()).toBeVisible({ timeout: 15000 });
});

test('refresh button is visible', async ({ page }) => {
  await expect(page.locator('.mv__head .mv__btn', { hasText: '↻ Refresh' })).toBeVisible({
    timeout: 5000,
  });
});

test('suggestion rows have Merge and Dismiss buttons when present', async ({ page }) => {
  // Wait for load to complete
  await page.waitForFunction(
    () => {
      const mv = document.querySelector('.mv');
      return mv && !mv.textContent?.includes('Loading suggestions');
    },
    { timeout: 15000 },
  );
  const rows = page.locator('.mv__row');
  const count = await rows.count();
  if (count > 0) {
    const firstRow = rows.first();
    await expect(firstRow.locator('.mv__btn--merge').first()).toBeVisible();
    await expect(firstRow.locator('.mv__btn--dismiss')).toBeVisible();
  }
  // If no rows, the empty-state message is present — no assertion needed
});

test('merge API 403 does not crash the view', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await page.route('**/merge_suggestions**', (route) => {
    void route.fulfill({ status: 403, body: 'Forbidden' });
  });

  await page.reload();
  await expect(page.locator('.mv')).toBeVisible({ timeout: 10000 });
  expect(errors).toHaveLength(0);
});

test('company name links navigate to company detail', async ({ page }) => {
  await page.waitForFunction(
    () => {
      const mv = document.querySelector('.mv');
      return mv && !mv.textContent?.includes('Loading suggestions');
    },
    { timeout: 15000 },
  );
  const rows = page.locator('.mv__row');
  if ((await rows.count()) > 0) {
    await rows.first().locator('.mv__co').first().click();
    await expect(page).toHaveURL(/\/companies\//, { timeout: 5000 });
  }
});
