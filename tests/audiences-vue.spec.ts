/**
 * audiences-vue.spec.ts — Vue Audiences module
 *
 * Tests: route renders, + New button opens scout modal,
 * AI build button present, audience list interaction.
 */
import { test, expect } from '@playwright/test';

import { VUE_URL } from './env';

test.beforeEach(async ({ page }) => {
  await page.goto(VUE_URL + 'audiences');
  await expect(page.locator('.shell')).toBeVisible({ timeout: 20000 });
  await expect(page.locator('.av')).toBeVisible({ timeout: 15000 });
});

test('audiences route renders the audience view', async ({ page }) => {
  await expect(page.locator('.av')).toBeVisible();
  await expect(page.locator('h1', { hasText: 'Audiences' })).toBeVisible();
});

test('+ New button is visible', async ({ page }) => {
  await expect(page.locator('.av__btn--new')).toBeVisible({ timeout: 10000 });
});

test('clicking + New opens the scout modal', async ({ page }) => {
  await page.locator('.av__btn--new').click();
  // AudienceScoutModal renders with .asm-overlay wrapper and .asm dialog
  await expect(page.locator('.asm-overlay')).toBeVisible({ timeout: 5000 });
  await expect(page.locator('.asm')).toBeVisible({ timeout: 3000 });
});

test('scout modal has AI build input and button', async ({ page }) => {
  await page.locator('.av__btn--new').click();
  await expect(page.locator('.asm')).toBeVisible({ timeout: 5000 });
  // AI build section: label text + input + button
  await expect(page.locator('.asm__lbl', { hasText: 'AI Build' })).toBeVisible({ timeout: 3000 });
  await expect(page.locator('.asm__btn--ai')).toBeVisible({ timeout: 3000 });
});

test('scout modal can be closed via Cancel button', async ({ page }) => {
  await page.locator('.av__btn--new').click();
  await expect(page.locator('.asm')).toBeVisible({ timeout: 5000 });
  // Click the Cancel button (plain .asm__btn with text "Cancel")
  await page.locator('.asm__foot .asm__btn', { hasText: 'Cancel' }).click();
  await expect(page.locator('.asm-overlay')).not.toBeVisible({ timeout: 3000 });
});

test('search input filters audience list', async ({ page }) => {
  const searchInput = page.locator('.av__search');
  await expect(searchInput).toBeVisible({ timeout: 5000 });
  await searchInput.fill('nonexistentaudience_xyz');
  // Should show empty-state or no rows
  const rows = page.locator('.aud-row');
  const count = await rows.count();
  expect(count).toBe(0);
});
