import { test, expect } from '@playwright/test';

/**
 * audiences-buttons.spec.ts
 *
 * Runtime checks for the 3 bug patterns that caused blank screens / silent buttons:
 *   1. No JS SyntaxError → hub loads (catches duplicate import, unescaped quotes)
 *   2. Audience tab renders correctly
 *   3. Audience detail buttons have valid, non-truncated onclick attributes
 *      (catches JSON.stringify-in-onclick-attr bug)
 */

test.beforeEach(async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('.app')).toBeVisible({ timeout: 20000 });
  await expect(page.locator('.nav-status')).toContainText('Live', { timeout: 30000 });
});

test('no SyntaxError in any hub JS module', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.reload();
  await expect(page.locator('.app')).toBeVisible({ timeout: 20000 });
  const syntaxErrors = errors.filter(e => e.includes('SyntaxError') || e.includes('Unexpected identifier') || e.includes('Unexpected token'));
  expect(syntaxErrors, `SyntaxErrors found: ${syntaxErrors.join(', ')}`).toHaveLength(0);
});

test('audiences tab renders panel', async ({ page }) => {
  await page.evaluate(() => window.switchTab('audiences'));
  await expect(page.locator('#audiencesPanel')).toBeVisible({ timeout: 8000 });
  await expect(page.locator('.aud-toolbar')).toBeVisible();
  // NEW button must be present and clickable
  const newBtn = page.locator('.aud-toolbar .btn', { hasText: 'NEW' });
  await expect(newBtn).toBeVisible();
});

test('audience NEW opens scout modal', async ({ page }) => {
  await page.evaluate(() => window.switchTab('audiences'));
  await page.locator('.aud-toolbar .btn', { hasText: 'NEW' }).click();
  await expect(page.locator('#audience-modal')).toBeVisible({ timeout: 5000 });
  await expect(page.locator('.aud-modal-title')).toContainText('SCOUT');
  // Modal can be closed
  await page.locator('#scout-close-btn').click();
  await expect(page.locator('#audience-modal')).toBeHidden({ timeout: 3000 });
});

test('audience detail EDIT and B2B buttons have valid onclick', async ({ page }) => {
  // Open first non-system audience
  const audId = await page.evaluate(() => {
    const aud = window._oaState?.audiences?.find((a: any) => !a.is_system);
    if (aud) { window.audOpen(aud.id); return aud.id; }
    return null;
  });
  if (!audId) { test.skip(); return; }

  await expect(page.locator('.aud-detail-title')).toBeVisible({ timeout: 8000 });

  // Get all buttons in detail title bar
  const buttons = page.locator('.aud-detail-title .btn');
  const count = await buttons.count();
  expect(count).toBeGreaterThanOrEqual(2); // at least EDIT + ✕

  // Check each button's onclick is not truncated (broken JSON.stringify bug)
  for (let i = 0; i < count; i++) {
    const btn = buttons.nth(i);
    const onclick = await btn.getAttribute('onclick');
    if (!onclick) continue;
    // Verify no JSON.stringify in onclick attributes (was causing truncated attrs)
    expect(onclick, `Button ${i} onclick contains JSON.stringify`).not.toContain('JSON.stringify');
    // Verify onclick ends with ')' — not truncated mid-function
    const trimmed = onclick.trim();
    expect(trimmed.endsWith(')') || trimmed.endsWith(';'), 
      `Button ${i} onclick truncated: ${onclick}`).toBe(true);
  }
});

test('clicking EDIT button opens scout modal', async ({ page }) => {
  const audId = await page.evaluate(() => {
    const aud = window._oaState?.audiences?.find((a: any) => !a.is_system);
    if (aud) { window.audOpen(aud.id); return aud.id; }
    return null;
  });
  if (!audId) { test.skip(); return; }

  await expect(page.locator('.aud-detail-title')).toBeVisible({ timeout: 8000 });

  const editBtn = page.locator('.aud-detail-title .btn', { hasText: 'EDIT' });
  await expect(editBtn).toBeVisible({ timeout: 5000 });
  await editBtn.click();

  // Scout modal should open with EDIT AUDIENCE title
  await expect(page.locator('#audience-modal')).toBeVisible({ timeout: 5000 });
  await expect(page.locator('.aud-modal-title')).toContainText('EDIT AUDIENCE');
});

// ── Gmail button regression tests ─────────────────────────────────────────

test('no JSON.stringify in any rendered onclick attribute', async ({ page }) => {
  // Boot and load some data
  await expect(page.locator('.nav-status')).toContainText('Live', { timeout: 30000 });
  await page.waitForTimeout(2000); // let pagination finish

  // Collect all onclick attrs across the whole page
  const badOnclicks = await page.evaluate(() => {
    const all = document.querySelectorAll('[onclick]');
    const bad: string[] = [];
    all.forEach(el => {
      const v = el.getAttribute('onclick') || '';
      if (v.includes('JSON.stringify')) bad.push(v.slice(0, 80));
    });
    return bad;
  });
  expect(badOnclicks, `JSON.stringify found in onclick: ${badOnclicks.join(', ')}`).toHaveLength(0);
});

// ── Window export coverage ─────────────────────────────────────────────────

test('all onclick functions are defined on window', async ({ page }) => {
  await expect(page.locator('.nav-status')).toContainText('Live', { timeout: 30000 });
  await page.waitForTimeout(2000);

  const missing = await page.evaluate(() => {
    // Collect all onclick attribute values from DOM
    const fns = new Set<string>();
    document.querySelectorAll('[onclick]').forEach(el => {
      const v = el.getAttribute('onclick') || '';
      // Extract function names: word before (
      const matches = v.matchAll(/\b([a-zA-Z_]\w*)\s*\(/g);
      for (const m of matches) {
        const name = m[1];
        if (!['event','window','document','this','encodeURIComponent','parseInt','String'].includes(name))
          fns.add(name);
      }
    });
    // Check each is defined on window
    return [...fns].filter(fn => typeof (window as any)[fn] !== 'function');
  });

  expect(missing, `onclick functions not on window: ${missing.join(', ')}`).toHaveLength(0);
});
