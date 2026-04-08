/**
 * segment-mapper.spec.ts
 *
 * Tests for the Segment Mapper section in company detail panel.
 * Covers the taxonomy loading bug (ReferenceError: _taxData not defined).
 */
import { test, expect, Page } from '@playwright/test';

async function waitForHub(page: Page) {
  await page.goto('./');
  await expect(page.locator('.app')).toBeVisible({ timeout: 20000 });
  await expect(page.locator('nav.nav')).toBeVisible({ timeout: 10000 });
  await expect(page.locator('.nav-status')).toContainText('Live', { timeout: 30000 });
  await page.evaluate(() => {
    window.clearAI?.();
    window.setFilter?.('all', document.querySelector('#sbAll'));
  });
  await expect(page.locator('.c-row').first()).toBeVisible({ timeout: 20000 });
}

async function openFirstCompany(page: Page) {
  await page.locator('.c-row').first().click();
  await expect(page.locator('#coPanel')).toBeVisible({ timeout: 8000 });
}

async function expandSection(page: Page, labelText: string) {
  const hdr = page.locator('.ib-sh', { hasText: new RegExp(labelText, 'i') }).first();
  await expect(hdr).toBeVisible({ timeout: 5000 });
  const bodyId = labelText.toLowerCase().includes('segment') ? '#ib-segments-body' : '#ib-email-body';
  const body = page.locator(bodyId);
  const isOpen = await body.isVisible();
  if (!isOpen) await hdr.click();
  await expect(body).toBeVisible({ timeout: 3000 });
  return body;
}

test.describe('Segment Mapper', () => {

  test.beforeEach(async ({ page }) => {
    await waitForHub(page);
    await openFirstCompany(page);
  });

  test('Segment Mapper section exists in company panel', async ({ page }) => {
    await expect(page.locator('.ib-sh', { hasText: /segment mapper/i })).toBeVisible({ timeout: 5000 });
  });

  test('Segment Mapper section can be expanded', async ({ page }) => {
    const body = await expandSection(page, 'Segment');
    await expect(body).toBeVisible();
  });

  test('taxonomy.json loads without JS errors (regression: _taxData ReferenceError)', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => {
      if (e.message.includes('_taxData') || e.message.includes('ReferenceError')) {
        errors.push(e.message);
      }
    });
    // Re-open to trigger fresh render
    await page.evaluate(() => window.closePanel?.());
    await page.waitForTimeout(200);
    await page.locator('.c-row').first().click();
    await expect(page.locator('#coPanel')).toBeVisible({ timeout: 8000 });
    const body = await expandSection(page, 'Segment');
    await page.waitForTimeout(2000); // give taxonomy time to load
    expect(errors).toHaveLength(0);
  });

  test('taxonomy fetch returns 200', async ({ page }) => {
    const status = await page.evaluate(async () => {
      const r = await fetch('./taxonomy.json');
      return r.status;
    });
    expect(status).toBe(200);
  });

  test('mapSegments replaces loading placeholder after open', async ({ page }) => {
    await expandSection(page, 'Segment');
    // Give time for async taxonomy load + segment matching
    await page.waitForTimeout(3000);
    const body = page.locator('#ib-segments-body');
    // Should NOT still show the loading placeholder
    await expect(body).not.toContainText('Loading taxonomy', { timeout: 5000 });
  });

  test('mapSegments does not crash (no _taxData ReferenceError)', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    // Call mapSegments directly
    await page.evaluate(() => window.mapSegments?.());
    await page.waitForTimeout(2000);
    const taxErrors = errors.filter(e => e.includes('_taxData') || e.includes('ReferenceError'));
    expect(taxErrors).toHaveLength(0);
  });

  test('Remap button triggers re-mapping', async ({ page }) => {
    await expandSection(page, 'Segment');
    const remapBtn = page.locator('.ib-sh-act', { hasText: /remap/i });
    await expect(remapBtn).toBeVisible({ timeout: 5000 });
    // Click remap — should not throw
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await remapBtn.click();
    await page.waitForTimeout(1000);
    expect(errors).toHaveLength(0);
  });
});
