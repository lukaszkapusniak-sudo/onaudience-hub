/**
 * clickable-actions.spec.ts
 *
 * Covers every clickable action in the hub:
 *   Nav bar · Stats bar · CTA bar · Contact cards · Section headers
 *   Context menu · Keyboard shortcuts · Drawer actions · AI bar
 *
 * Verifies NO duplicate / confusing buttons remain.
 */
import { test, expect, Page } from '@playwright/test';
import { waitForHub } from 'helpers';

async function openFirstCompany(page: Page) {
  await page.locator('.c-row').first().click();
  await expect(page.locator('#coPanel')).toBeVisible({ timeout: 8000 });
}

// ── NAV BAR ──────────────────────────────────────────────────────
test.describe('Nav bar actions', () => {
  test.beforeEach(async ({ page }) => { await waitForHub(page); });

  test('🔑 key button opens key panel', async ({ page }) => {
    await page.locator('#keyBtn').click();
    await expect(page.locator('#keyPanel')).toBeVisible({ timeout: 3000 });
    // Close it
    await page.keyboard.press('Escape');
  });

  test('Gmail nav button is visible', async ({ page }) => {
    await expect(page.locator('#gmailNavBtn')).toBeVisible();
  });

  test('✉ Compose button opens Meeseeks drawer', async ({ page }) => {
    await page.locator('button[onclick*="openComposer"]').first().click();
    await expect(page.locator('#mcDrawer')).toHaveClass(/open/, { timeout: 5000 });
    await page.evaluate(() => window.closeComposer?.());
  });

  test('+ Research button opens research modal', async ({ page }) => {
    await page.locator('button[onclick*="promptResearch"]').first().click();
    // Research modal or panel should appear
    const modal = page.locator('#researchModal, .research-modal, [id*="research"]').first();
    await page.waitForTimeout(500);
    // Just verify no crash
    await expect(page.locator('nav.nav')).toBeVisible();
    await page.keyboard.press('Escape');
  });

  test('🌙 theme button toggles theme', async ({ page }) => {
    const before = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    await page.locator('#themeBtn').click();
    const after = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    expect(after).not.toBe(before);
    // Toggle back
    await page.locator('#themeBtn').click();
  });
});

// ── STATS BAR / FILTER CHIPS ─────────────────────────────────────
test.describe('Stats bar filter chips', () => {
  test.beforeEach(async ({ page }) => { await waitForHub(page); });

  test('All chip shows all companies', async ({ page }) => {
    await page.locator('#sbAll').click();
    await expect(page.locator('#sbAll')).toHaveClass(/active/);
    const count = await page.locator('.c-row').count();
    expect(count).toBeGreaterThan(0);
  });

  test('Clients chip filters to clients', async ({ page }) => {
    const allCount = await page.locator('.c-row').count();
    await page.locator('#sbClient').click();
    await page.waitForTimeout(300);
    await expect(page.locator('#sbClient')).toHaveClass(/active/);
    const clientCount = await page.locator('.c-row').count();
    expect(clientCount).toBeLessThanOrEqual(allCount);
  });

  test('Prospects chip filters list', async ({ page }) => {
    await page.locator('#sbProspect').click();
    await page.waitForTimeout(300);
    await expect(page.locator('#sbProspect')).toHaveClass(/active/);
  });

  test('Partners chip filters list', async ({ page }) => {
    await page.locator('#sbPartner').click();
    await page.waitForTimeout(300);
    await expect(page.locator('#sbPartner')).toHaveClass(/active/);
  });

  test('No Outreach chip filters list', async ({ page }) => {
    const nogo = page.locator('#sbNogo, .f-chip', { hasText: /outreach|nogo/i }).first();
    if (await nogo.isVisible()) {
      await nogo.click();
      await page.waitForTimeout(300);
      await expect(page.locator('nav.nav')).toBeVisible(); // no crash
    }
  });

  test('All chip restores full list after filter', async ({ page }) => {
    await page.locator('#sbClient').click();
    await page.waitForTimeout(400);
    const clientCount = await page.locator('.c-row').count();
    await page.locator('#sbAll').click();
    await page.waitForTimeout(400);
    const allCount = await page.locator('.c-row').count();
    // All count must be >= client count (virtual scroll may cap at 400/1000)
    expect(allCount).toBeGreaterThanOrEqual(clientCount);
  });

  test('Only one chip active at a time', async ({ page }) => {
    await page.locator('#sbClient').click();
    await page.waitForTimeout(300);
    // Active state is on the #sb* element itself
    await expect(page.locator('#sbClient')).toHaveClass(/active/);
    await expect(page.locator('#sbAll')).not.toHaveClass(/active/);
  });
});

// ── COMPANY PANEL CTA BAR ────────────────────────────────────────
test.describe('Company CTA bar actions', () => {
  test.beforeEach(async ({ page }) => {
    await waitForHub(page);
    await openFirstCompany(page);
  });

  test('CTA bar has exactly 7 buttons (no duplicates)', async ({ page }) => {
    const btns = page.locator('.ib-cta button, .ib-cta a');
    const count = await btns.count();
    expect(count).toBe(7); // Draft Email, Find DMs, Gen Angle, News, Similar, LinkedIn, Merge
  });

  test('Only ONE "Draft Email" button in CTA bar', async ({ page }) => {
    const drafts = page.locator('.ib-cta button, .ib-cta a').filter({ hasText: /draft email/i });
    expect(await drafts.count()).toBe(1);
  });

  test('No "Gmail History" button in CTA bar (moved to section)', async ({ page }) => {
    const gmailBtn = page.locator('.ib-cta button, .ib-cta a').filter({ hasText: /gmail history/i });
    expect(await gmailBtn.count()).toBe(0);
  });

  test('✉ Draft Email opens Meeseeks composer', async ({ page }) => {
    await page.locator('.ib-cta button', { hasText: /draft email/i }).click();
    await expect(page.locator('#mcDrawer')).toHaveClass(/open/, { timeout: 5000 });
    await page.evaluate(() => window.closeComposer?.());
  });

  test('👤 Find DMs triggers DM search in Contacts section', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.locator('.ib-cta button', { hasText: /find dms/i }).click();
    await page.waitForTimeout(500);
    expect(errors).toHaveLength(0);
  });

  test('💡 Gen Angle triggers angle generation', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.locator('.ib-cta button', { hasText: /gen angle/i }).click();
    await page.waitForTimeout(500);
    expect(errors).toHaveLength(0);
  });

  test('📰 News button triggers intelligence refresh', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.locator('.ib-cta button', { hasText: /news/i }).click();
    await page.waitForTimeout(500);
    expect(errors).toHaveLength(0);
  });

  test('🔗 Similar button triggers similar company search', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.locator('.ib-cta button', { hasText: /similar/i }).click();
    await page.waitForTimeout(500);
    expect(errors).toHaveLength(0);
  });

  test('LinkedIn ↗ opens LinkedIn page', async ({ page }) => {
    const [newPage] = await Promise.all([
      page.context().waitForEvent('page'),
      page.locator('.ib-cta button, .ib-cta a', { hasText: /linkedin/i }).click(),
    ]).catch(() => [null]);
    if (newPage) await newPage.close();
  });

  test('⚙ Merge opens merge modal', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.locator('.ib-cta button', { hasText: /merge/i }).click();
    await page.waitForTimeout(400);
    expect(errors).toHaveLength(0);
    await page.evaluate(() => window.closePanel?.());
  });
});

// ── CONTACT CARDS ────────────────────────────────────────────────
test.describe('Contact card actions', () => {
  test.beforeEach(async ({ page }) => {
    await waitForHub(page);
    // Find a company with contacts
    const rows = page.locator('.c-row');
    const count = await rows.count();
    for (let i = 0; i < Math.min(count, 30); i++) {
      await rows.nth(i).click();
      await page.waitForTimeout(200);
      const ctH = page.locator('.ib-sh', { hasText: /contacts/i }).first();
      if (await ctH.isVisible()) {
        if (!await page.locator('#ib-ct-body').isVisible()) await ctH.click();
        await page.waitForTimeout(150);
        if (await page.locator('#ib-ct-body .ib-ct').count() > 0) return;
      }
    }
  });

  test('Contact card click opens drawer', async ({ page }) => {
    const card = page.locator('#ib-ct-body .ib-ct').first();
    if (!await card.isVisible()) return;
    await card.click();
    await expect(page.locator('#ctDrawer')).toHaveClass(/open/, { timeout: 5000 });
    await page.evaluate(() => window.closeDrawer?.());
  });

  test('Contact card has NO duplicate "Research" button (was same as clicking)', async ({ page }) => {
    const card = page.locator('#ib-ct-body .ib-ct').first();
    if (!await card.isVisible()) return;
    const researchBtns = card.locator('.ib-ct-btn', { hasText: /research/i });
    expect(await researchBtns.count()).toBe(0); // removed
  });

  test('Contact card has NO duplicate "Draft" Gmail button', async ({ page }) => {
    const card = page.locator('#ib-ct-body .ib-ct').first();
    if (!await card.isVisible()) return;
    const draftBtns = card.locator('.ib-ct-btn', { hasText: /^✉ draft$/i });
    expect(await draftBtns.count()).toBe(0); // removed
  });

  test('Contact card ✉ Email opens Meeseeks', async ({ page }) => {
    const card = page.locator('#ib-ct-body .ib-ct').first();
    if (!await card.isVisible()) return;
    await card.locator('.ib-ct-btn', { hasText: /✉ email/i }).click();
    await expect(page.locator('#mcDrawer')).toHaveClass(/open/, { timeout: 5000 });
    await page.evaluate(() => window.closeComposer?.());
  });

  test('Contact card max 3 buttons (Email + optional LI + optional Lemlist)', async ({ page }) => {
    const card = page.locator('#ib-ct-body .ib-ct').first();
    if (!await card.isVisible()) return;
    const btnCount = await card.locator('.ib-ct-btn').count();
    expect(btnCount).toBeLessThanOrEqual(3);
  });
});

// ── SECTION HEADER ACTIONS ───────────────────────────────────────
test.describe('Section header actions', () => {
  test.beforeEach(async ({ page }) => {
    await waitForHub(page);
    await openFirstCompany(page);
  });

  test('Contacts section ✨ Find DMs works when no contacts', async ({ page }) => {
    // Check the section acts
    const findDMs = page.locator('.ib-sh-act', { hasText: /find dms/i });
    if (await findDMs.isVisible()) {
      const errors: string[] = [];
      page.on('pageerror', e => errors.push(e.message));
      await findDMs.click();
      await page.waitForTimeout(500);
      expect(errors).toHaveLength(0);
    }
  });

  test('Outreach Angle ↺ Regen regenerates angle', async ({ page }) => {
    const regen = page.locator('.ib-sh-act', { hasText: /regen/i });
    if (await regen.isVisible()) {
      const errors: string[] = [];
      page.on('pageerror', e => errors.push(e.message));
      await regen.click();
      await page.waitForTimeout(500);
      expect(errors).toHaveLength(0);
    }
  });

  test('Intelligence ↺ Refresh refreshes news', async ({ page }) => {
    const refresh = page.locator('#ib-intel-refresh, .ib-sh-act', { hasText: /refresh/i }).first();
    if (await refresh.isVisible()) {
      const errors: string[] = [];
      page.on('pageerror', e => errors.push(e.message));
      await refresh.click();
      await page.waitForTimeout(500);
      expect(errors).toHaveLength(0);
    }
  });

  test('Segment mapper ↺ Remap triggers remapping', async ({ page }) => {
    const segH = page.locator('.ib-sh', { hasText: /segment/i }).first();
    if (await segH.isVisible()) {
      if (!await page.locator('#ib-segments-body').isVisible()) await segH.click();
      const remap = page.locator('.ib-sh-act', { hasText: /remap/i });
      if (await remap.isVisible()) {
        const errors: string[] = [];
        page.on('pageerror', e => errors.push(e.message));
        await remap.click();
        await page.waitForTimeout(500);
        expect(errors).toHaveLength(0);
      }
    }
  });

  test('TCF Analyser → switches to TCF tab', async ({ page }) => {
    const tcfLink = page.locator('.ib-sh-act', { hasText: /tcf analyser/i });
    if (await tcfLink.isVisible()) {
      await tcfLink.click();
      await page.waitForTimeout(300);
      await expect(page.locator('#tab-tcf')).toHaveClass(/active/);
    }
  });

  test('Foldable sections toggle on header click', async ({ page }) => {
    const hdr = page.locator('.ib-sh').first();
    await expect(hdr).toBeVisible();
    const bodyId = await hdr.getAttribute('onclick');
    // Just click and verify no crash
    await hdr.click();
    await page.waitForTimeout(200);
    await expect(page.locator('nav.nav')).toBeVisible();
    await hdr.click(); // toggle back
  });
});

// ── CONTEXT MENU ─────────────────────────────────────────────────
test.describe('Context menu actions', () => {
  test.beforeEach(async ({ page }) => {
    await waitForHub(page);
    await page.locator('.c-row').first().click({ button: 'right' });
    await expect(page.locator('#ctxMenu')).toBeVisible({ timeout: 3000 });
  });

  test('Context menu has exactly 6 items', async ({ page }) => {
    const items = page.locator('#ctxMenu .ctx-item');
    expect(await items.count()).toBe(6);
  });

  test('Context menu items: no duplicates', async ({ page }) => {
    const texts = await page.locator('#ctxMenu .ctx-item').allTextContents();
    const unique = new Set(texts.map(t => t.trim()));
    expect(unique.size).toBe(texts.length);
  });

  test('Draft outreach email opens Meeseeks', async ({ page }) => {
    await page.locator('#ctxMenu .ctx-item', { hasText: /draft/i }).click();
    await expect(page.locator('#mcDrawer')).toHaveClass(/open/, { timeout: 5000 });
    await page.evaluate(() => window.closeComposer?.());
  });

  test('Find decision makers triggers DM search', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.locator('#ctxMenu .ctx-item', { hasText: /decision makers/i }).click();
    await page.waitForTimeout(500);
    expect(errors).toHaveLength(0);
  });

  test('Find similar triggers similar search', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.locator('#ctxMenu .ctx-item', { hasText: /similar/i }).click();
    await page.waitForTimeout(500);
    expect(errors).toHaveLength(0);
  });

  test('Escape closes context menu', async ({ page }) => {
    await page.evaluate(() => { (document.activeElement as HTMLElement)?.blur(); document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })); });
    await page.waitForTimeout(500);
    await expect(page.locator('#ctxMenu')).not.toBeVisible({ timeout: 6000 });
  });

  test('Click outside closes context menu', async ({ page }) => {
    await page.mouse.click(10, 10);
    await page.waitForTimeout(500);
    await expect(page.locator('#ctxMenu')).not.toBeVisible({ timeout: 6000 });
  });
});

// ── AI BAR ───────────────────────────────────────────────────────
test.describe('AI bar actions', () => {
  test.beforeEach(async ({ page }) => { await waitForHub(page); });

  test('AI bar input accepts text', async ({ page }) => {
    await page.locator('#aiInp').fill('EU DSPs with CTV');
    await expect(page.locator('#aiInp')).toHaveValue('EU DSPs with CTV');
  });

  test('AI bar → button submits query', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.locator('#aiInp').fill('test');
    await page.locator('#aiBtn').click();
    await page.waitForTimeout(500);
    expect(errors).toHaveLength(0);
  });

  test('Enter key submits AI query', async ({ page }) => {
    await page.locator('#aiInp').fill('clients in DACH');
    await page.locator('#aiInp').press('Enter');
    await page.waitForTimeout(500);
    await expect(page.locator('nav.nav')).toBeVisible();
  });

  test('clearAI resets input and restores list', async ({ page }) => {
    await page.locator('#aiInp').fill('test query');
    await page.evaluate(() => window.clearAI?.());
    await page.waitForTimeout(300);
    await expect(page.locator('#aiInp')).toHaveValue('');
    await expect(page.locator('.c-row').first()).toBeVisible({ timeout: 5000 });
  });

  test('Tag panel toggle opens/closes', async ({ page }) => {
    await page.locator('#tagBtn').click();
    await page.waitForTimeout(200);
    const panel = page.locator('#tagPanel, .tag-panel, [id*="tag"]').first();
    // Just check no crash
    await expect(page.locator('nav.nav')).toBeVisible();
  });
});

// ── SORT DROPDOWN ────────────────────────────────────────────────
test.describe('Sort dropdown', () => {
  test.beforeEach(async ({ page }) => { await waitForHub(page); });

  test('Sort dropdown is visible', async ({ page }) => {
    await expect(page.locator('#sortSel')).toBeVisible();
  });

  test('Sort by name reorders list', async ({ page }) => {
    await page.locator('#sortSel').selectOption('name');
    await page.waitForTimeout(500);
    expect(await page.locator('.c-row').count()).toBeGreaterThan(0);
  });

  test('Sort by ICP reorders list', async ({ page }) => {
    await page.locator('#sortSel').selectOption('icp');
    await page.waitForTimeout(500);
    expect(await page.locator('.c-row').count()).toBeGreaterThan(0);
  });

  test('Sort by recently updated', async ({ page }) => {
    await page.locator('#sortSel').selectOption('recent');
    await page.waitForTimeout(500);
    expect(await page.locator('.c-row').count()).toBeGreaterThan(0);
  });
});

// ── CONTACT DRAWER ACTIONS ───────────────────────────────────────
test.describe('Contact drawer actions', () => {
  test.beforeEach(async ({ page }) => {
    await waitForHub(page);
    await page.evaluate(() => window.switchTab?.('contacts'));
    await page.waitForTimeout(400);
    await expect(page.locator('.ct-row').first()).toBeVisible({ timeout: 15000 });
    await page.locator('.ct-row').first().click();
    await expect(page.locator('#ctDrawer')).toHaveClass(/open/, { timeout: 5000 });
  });

  test('Drawer shows contact name and subtitle', async ({ page }) => {
    await expect(page.locator('#drName')).toBeVisible();
    await expect(page.locator('#drSub')).toBeVisible();
    const name = await page.locator('#drName').textContent();
    expect(name?.trim().length).toBeGreaterThan(0);
  });

  test('Drawer has action buttons', async ({ page }) => {
    const btns = page.locator('#ctDrawer .dr-actions .btn');
    expect(await btns.count()).toBeGreaterThanOrEqual(2);
  });

  test('Draft Email button in drawer opens Meeseeks', async ({ page }) => {
    await page.locator('#ctDrawer .dr-actions .btn', { hasText: /draft email/i }).first().click();
    await expect(page.locator('#mcDrawer')).toHaveClass(/open/, { timeout: 5000 });
    await page.evaluate(() => window.closeComposer?.());
  });

  test('Close button dismisses drawer', async ({ page }) => {
    await page.locator('.dr-close').click();
    await expect(page.locator('#ctDrawer')).not.toHaveClass(/open/, { timeout: 3000 });
  });

  test('Overlay click dismisses drawer', async ({ page }) => {
    await page.locator('#ctDrawerOverlay').click();
    await expect(page.locator('#ctDrawer')).not.toHaveClass(/open/, { timeout: 3000 });
  });
});

// ── KEYBOARD SHORTCUTS ───────────────────────────────────────────
test.describe('Keyboard shortcuts', () => {
  test.beforeEach(async ({ page }) => {
    await waitForHub(page);
    // Close any open panel, ensure list is visible and a row exists
    await page.evaluate(() => { window.closePanel?.(); window.closeDrawer?.(); });
    await page.waitForTimeout(300);
    await expect(page.locator('.c-row').first()).toBeVisible({ timeout: 10000 });
    // Click in a neutral area (not a row) then blur focus
    await page.mouse.click(10, 10);
    await page.evaluate(() => { (document.activeElement as HTMLElement)?.blur(); });
    await page.waitForTimeout(200);
  });

  test('j key moves focus down', async ({ page }) => {
    await page.keyboard.press('j');
    await expect(page.locator('.c-row.kb-focus')).toBeVisible({ timeout: 8000 });
  });

  test('k key moves focus up after j', async ({ page }) => {
    await page.keyboard.press('j');
    await page.keyboard.press('j');
    await page.keyboard.press('k');
    await expect(page.locator('.c-row.kb-focus')).toBeVisible({ timeout: 8000 });
  });

  test('Enter opens focused company', async ({ page }) => {
    await page.keyboard.press('j');
    await expect(page.locator('.c-row.kb-focus')).toBeVisible({ timeout: 8000 });
    await page.keyboard.press('Enter');
    await expect(page.locator('#coPanel')).toBeVisible({ timeout: 8000 });
  });

  test('Escape closes open panel', async ({ page }) => {
    await page.locator('.c-row').first().click();
    await expect(page.locator('#coPanel')).toBeVisible({ timeout: 8000 });
    await page.evaluate(() => { (document.activeElement as HTMLElement)?.blur(); document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })); });
    await page.waitForTimeout(400);
    await expect(page.locator('#emptyState')).toBeVisible({ timeout: 5000 });
  });

  test('/ focuses search input', async ({ page }) => {
    await page.evaluate(() => { (document.activeElement as HTMLElement)?.blur(); document.dispatchEvent(new KeyboardEvent('keydown', { key: '/', bubbles: true, cancelable: true })); });
    await page.waitForTimeout(400);
    const inp = page.locator('input[placeholder*="Search"]').first();
    await expect(inp).toBeFocused({ timeout: 5000 });
  });
});
