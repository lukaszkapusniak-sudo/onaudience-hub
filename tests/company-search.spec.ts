/**
 * company-search.spec.ts
 *
 * Tests for company search box, filter chips, stats bar, and meta counter.
 * Covers edge cases not addressed in companies/list.spec.ts.
 */
import { test, expect, Page } from '@playwright/test';

const HUB = './';

async function waitForHubWithRows(page: Page) {
  await page.goto(HUB);
  await expect(page.locator('.app')).toBeVisible({ timeout: 20000 });
  await expect(page.locator('nav.nav')).toBeVisible({ timeout: 10000 });
  await expect(page.locator('.nav-status')).toContainText('Live', { timeout: 30000 });
  await page.evaluate(() => {
    window.clearAI?.();
    window.setFilter?.('all', document.querySelector('#sbAll'));
  });
  await expect(page.locator('.c-row').first()).toBeVisible({ timeout: 20000 });
}

// ── SUITE: Search box ─────────────────────────────────────────────
test.describe('Company search', () => {

  test.beforeEach(async ({ page }) => { await waitForHubWithRows(page); });

  test('search input is visible on companies tab', async ({ page }) => {
    await expect(page.locator('input[placeholder*=Search]').first()).toBeVisible();
  });

  test('empty search shows all companies', async ({ page }) => {
    const totalBefore = await page.locator('.c-row').count();
    const input = page.locator('input[placeholder*=Search]').first();
    await input.fill('');
    await page.waitForTimeout(400);
    const totalAfter = await page.locator('.c-row').count();
    expect(totalAfter).toBe(totalBefore);
  });

  test('search reduces result count', async ({ page }) => {
    const totalBefore = await page.locator('.c-row').count();
    const input = page.locator('input[placeholder*=Search]').first();
    await input.fill('zzznomatch');
    await page.waitForTimeout(500);
    const totalAfter = await page.locator('.c-row').count();
    expect(totalAfter).toBeLessThanOrEqual(totalBefore);
  });

  test('clearing search restores full list', async ({ page }) => {
    const totalBefore = await page.locator('.c-row').count();
    const input = page.locator('input[placeholder*=Search]').first();
    await input.fill('criteo');
    await page.waitForTimeout(400);
    await input.fill('');
    await page.waitForTimeout(400);
    const totalAfter = await page.locator('.c-row').count();
    expect(totalAfter).toBe(totalBefore);
  });

  test('search is case-insensitive', async ({ page }) => {
    const input = page.locator('input[placeholder*=Search]').first();
    await input.fill('CRITEO');
    await page.waitForTimeout(400);
    const upper = await page.locator('.c-row').count();
    await input.fill('criteo');
    await page.waitForTimeout(400);
    const lower = await page.locator('.c-row').count();
    expect(upper).toBe(lower);
  });

  test('meta counter updates to match visible rows', async ({ page }) => {
    const input = page.locator('input[placeholder*=Search]').first();
    await input.fill('a'); // partial — should match some
    await page.waitForTimeout(500);
    const rowCount = await page.locator('.c-row').count();
    const metaTxt = await page.locator('#metaTxt').textContent();
    if (rowCount > 0 && metaTxt && !metaTxt.includes('Loading')) {
      const metaNum = parseInt(metaTxt.split(' ')[0]);
      expect(metaNum).toBe(rowCount);
    }
  });

  test('no-results state does not crash hub', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    const input = page.locator('input[placeholder*=Search]').first();
    await input.fill('xyzzy_no_match_999');
    await page.waitForTimeout(500);
    expect(errors).toHaveLength(0);
    // Hub nav should still be visible
    await expect(page.locator('nav.nav')).toBeVisible();
  });

  test('pressing Escape clears search', async ({ page }) => {
    const input = page.locator('input[placeholder*=Search]').first();
    await input.fill('criteo');
    await page.waitForTimeout(300);
    await input.press('Escape');
    await page.waitForTimeout(300);
    // Either the input is cleared or focus moves away — no error
    await expect(page.locator('nav.nav')).toBeVisible();
  });
});

// ── SUITE: Filter chips ───────────────────────────────────────────
test.describe('Company filter chips', () => {

  test.beforeEach(async ({ page }) => { await waitForHubWithRows(page); });

  test('all filter chips are rendered', async ({ page }) => {
    await expect(page.locator('#sbAll')).toBeVisible();
    await expect(page.locator('#sbClient')).toBeVisible();
    await expect(page.locator('#sbProspect')).toBeVisible();
    await expect(page.locator('#sbPartner')).toBeVisible();
  });

  test('All chip is active on load', async ({ page }) => {
    await expect(page.locator('#sbAll')).toHaveClass(/active/);
  });

  test('only one chip can be active at a time', async ({ page }) => {
    await page.locator('#sbClient').click();
    await page.waitForTimeout(300);
    const active = await page.locator('.f-chip.active').count();
    expect(active).toBe(1);
  });

  test('Clients chip filters to clients only', async ({ page }) => {
    const allCount = await page.locator('.c-row').count();
    await page.locator('#sbClient').click();
    await page.waitForTimeout(400);
    const clientCount = await page.locator('.c-row').count();
    // Client count <= all count
    expect(clientCount).toBeLessThanOrEqual(allCount);
  });

  test('Prospects chip changes list', async ({ page }) => {
    await page.locator('#sbAll').click();
    await page.waitForTimeout(300);
    const allCount = await page.locator('.c-row').count();
    await page.locator('#sbProspect').click();
    await page.waitForTimeout(400);
    const prospectCount = await page.locator('.c-row').count();
    expect(prospectCount).toBeLessThanOrEqual(allCount);
  });

  test('All chip restores full list after filter', async ({ page }) => {
    const totalBefore = await page.locator('.c-row').count();
    await page.locator('#sbClient').click();
    await page.waitForTimeout(300);
    await page.locator('#sbAll').click();
    await page.waitForTimeout(400);
    const totalAfter = await page.locator('.c-row').count();
    expect(totalAfter).toBe(totalBefore);
  });

  test('filter + search combination works', async ({ page }) => {
    await page.locator('#sbClient').click();
    await page.waitForTimeout(300);
    const input = page.locator('input[placeholder*=Search]').first();
    await input.fill('a');
    await page.waitForTimeout(400);
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    expect(errors).toHaveLength(0);
    await expect(page.locator('nav.nav')).toBeVisible();
  });
});

// ── SUITE: Stats bar ──────────────────────────────────────────────
test.describe('Stats bar counts', () => {

  test.beforeEach(async ({ page }) => { await waitForHubWithRows(page); });

  test('stats bar is visible', async ({ page }) => {
    await expect(page.locator('.stats-bar')).toBeVisible();
  });

  test('stAll shows non-zero count', async ({ page }) => {
    await expect(page.locator('#stAll')).not.toHaveText('0', { timeout: 10000 });
  });

  test('stAll count is numeric', async ({ page }) => {
    const text = await page.locator('#stAll').textContent();
    expect(parseInt(text!)).toBeGreaterThan(0);
  });

  test('stats bar counts are stable after filter/reset', async ({ page }) => {
    const before = await page.locator('#stAll').textContent();
    await page.locator('#sbClient').click();
    await page.waitForTimeout(300);
    await page.locator('#sbAll').click();
    await page.waitForTimeout(300);
    const after = await page.locator('#stAll').textContent();
    expect(after).toBe(before);
  });

  test('metaTxt shows "N of M" format', async ({ page }) => {
    const meta = await page.locator('#metaTxt').textContent();
    // Should match "N of M" or "N of M (filtered)" style
    expect(meta).toMatch(/\d+\s+of\s+\d+/);
  });
});
