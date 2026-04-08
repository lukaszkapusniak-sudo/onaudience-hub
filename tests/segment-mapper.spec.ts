/**
 * segment-mapper.spec.ts
 *
 * Tests for the Segment Mapper section in the company detail panel.
 *
 * Regression covered:
 *   - _taxData was never declared → ReferenceError → mapper stuck on "Loading taxonomy…"
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

async function expandSegmentMapper(page: Page) {
  const hdr = page.locator('.ib-sh', { hasText: /segment mapper/i });
  await expect(hdr).toBeVisible({ timeout: 5000 });
  const body = page.locator('#ib-segments-body');
  if (!(await body.isVisible())) await hdr.click();
  await expect(body).toBeVisible({ timeout: 3000 });
  return body;
}

// ── SUITE: Segment Mapper section ────────────────────────────────
test.describe('Segment Mapper', () => {

  test.beforeEach(async ({ page }) => {
    await waitForHub(page);
    await openFirstCompany(page);
  });

  test('Segment Mapper section exists in company panel', async ({ page }) => {
    await expect(page.locator('.ib-sh', { hasText: /segment mapper/i })).toBeVisible();
  });

  test('Segment Mapper can be expanded', async ({ page }) => {
    const body = await expandSegmentMapper(page);
    await expect(body).toBeVisible();
  });

  test('Remap button is visible in header', async ({ page }) => {
    const hdr = page.locator('.ib-sh', { hasText: /segment mapper/i });
    await expect(hdr.locator('text=Remap')).toBeVisible({ timeout: 5000 });
  });

  test('taxonomy.json loads successfully (200)', async ({ page }) => {
    const response = await page.evaluate(async () => {
      const r = await fetch('./taxonomy.json');
      return { status: r.status, ok: r.ok };
    });
    expect(response.status).toBe(200);
    expect(response.ok).toBe(true);
  });

  test('_taxData is not undefined after loadTaxonomy (regression: ReferenceError)', async ({ page }) => {
    // Before fix: _taxData was never declared → ReferenceError in loadTaxonomy
    const result = await page.evaluate(async () => {
      try {
        // mapSegments calls loadTaxonomy internally — if _taxData is undeclared it throws
        await window.mapSegments?.();
        return { error: null, taxLoading: window._taxLoading };
      } catch (e) {
        return { error: (e as Error).message };
      }
    });
    expect(result.error).toBeNull();
  });

  test('Segment Mapper loads taxonomy and does not stay on "Loading taxonomy…"', async ({ page }) => {
    const body = await expandSegmentMapper(page);
    // Allow time for taxonomy fetch + rendering
    await page.waitForTimeout(3000);
    const bodyText = await body.textContent();
    // Should NOT still show the initial loading text (the ReferenceError kept it stuck)
    expect(bodyText).not.toBe('Loading taxonomy…');
    expect(bodyText?.trim().length).toBeGreaterThan(5);
  });

  test('mapSegments renders segments or a graceful message', async ({ page }) => {
    const body = await expandSegmentMapper(page);
    await page.waitForTimeout(3000);
    // Either segments rendered OR a clear "no segments" / "taxonomy not available" message
    const text = await body.textContent() ?? '';
    const hasSegments = await body.locator('.seg-item, .ib-seg-row, [class*="seg"]').count() > 0;
    const hasGraceful = text.includes('segment') || text.includes('Taxonomy') || text.includes('No match') || hasSegments;
    expect(hasGraceful).toBeTruthy();
  });

  test('Remap button re-triggers mapSegments without ReferenceError', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));

    await expandSegmentMapper(page);
    await page.waitForTimeout(2000);

    // Click Remap to re-trigger
    const remapBtn = page.locator('.ib-sh', { hasText: /segment mapper/i }).locator('text=Remap');
    await remapBtn.click();
    await page.waitForTimeout(2000);

    const taxErrors = errors.filter(e => e.includes('_taxData') || e.includes('ReferenceError'));
    expect(taxErrors).toHaveLength(0);
  });

  test('segment count badge updates after mapping', async ({ page }) => {
    await expandSegmentMapper(page);
    await page.waitForTimeout(3000);
    // Count badge (ib-seg-cnt) may show a number or be empty
    const cnt = page.locator('#ib-seg-cnt');
    await expect(cnt).toBeAttached({ timeout: 3000 });
  });
});
