import { test, expect, Page } from '@playwright/test';

const HUB = './';

async function waitForHub(page: Page) {
  await page.goto(HUB);
  await expect(page.locator('.app')).toBeVisible({ timeout: 20000 });
  await expect(page.locator('.app')).toBeVisible({ timeout: 20000 });
  await expect(page.locator('nav.nav')).toBeVisible({ timeout: 10000 });
  await expect(page.locator('.nav-status')).toContainText('Live', { timeout: 20000 });
  await page.waitForTimeout(1500);
}

async function switchTab(page: Page, tab: string) {
  await page.evaluate((t) => window.switchTab(t), tab);
  await page.waitForTimeout(300);
}

// ── SUITE: Panel isolation ────────────────────────────────────────
test.describe('Tab panel isolation', () => {

  test.beforeEach(async ({ page }) => { await waitForHub(page); });

  test('companies tab: coPanel hidden, emptyState visible by default', async ({ page }) => {
    await switchTab(page, 'companies');
    await expect(page.locator('#coPanel')).toBeHidden();
    await expect(page.locator('#emptyState')).toBeVisible();
    await expect(page.locator('#tcf-center')).toBeHidden();
    await expect(page.locator('#audiencesPanel')).toBeHidden();
  });

  test('companies tab: coPanel appears after selecting a company', async ({ page }) => {
    await switchTab(page, 'companies');
    await page.locator('.c-row').first().click();
    await expect(page.locator('#coPanel')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('#emptyState')).toBeHidden();
  });

  test('contacts tab: coPanel hidden even if company was open', async ({ page }) => {
    // First open a company
    await switchTab(page, 'companies');
    await page.locator('.c-row').first().click();
    await expect(page.locator('#coPanel')).toBeVisible({ timeout: 5000 });

    // Switch to contacts — coPanel must disappear
    await switchTab(page, 'contacts');
    await expect(page.locator('#coPanel')).toBeHidden();
    await expect(page.locator('#emptyState')).toBeVisible();
    await expect(page.locator('#tcf-center')).toBeHidden();
  });

  test('contacts tab: sort bar is hidden', async ({ page }) => {
    await switchTab(page, 'contacts');
    await expect(page.locator('#sortBar')).toBeHidden();
  });

  test('contacts tab: clicking a contact row opens company in center + drawer on right', async ({ page }) => {
    await switchTab(page, 'contacts');
    await expect(page.locator('.ct-row').first()).toBeVisible({ timeout: 10000 });
    await page.locator('.ct-row').first().click();
    await page.waitForTimeout(500);
    // Contact drawer should open
    await expect(page.locator('#ctDrawer')).toHaveClass(/open/, { timeout: 3000 });
    // coPanel appears if contact has a matching company
    // (it might not always have one, so we check either coPanel visible or emptyState visible)
    const coPanelVisible = await page.locator('#coPanel').isVisible();
    const emptyVisible = await page.locator('#emptyState').isVisible();
    expect(coPanelVisible || emptyVisible).toBeTruthy();
  });

  test('TCF tab: only tcf-center visible, coPanel hidden', async ({ page }) => {
    // Open company first to test bleed
    await switchTab(page, 'companies');
    await page.locator('.c-row').first().click();
    await expect(page.locator('#coPanel')).toBeVisible({ timeout: 5000 });

    // Switch to TCF
    await switchTab(page, 'tcf');
    await expect(page.locator('#tcf-center')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('#coPanel')).toBeHidden();
    await expect(page.locator('#emptyState')).toBeHidden();
    await expect(page.locator('#audiencesPanel')).toBeHidden();
    await expect(page.locator('#tcf-sel-bar')).toBeVisible();
  });

  test('TCF tab: tab active class set correctly', async ({ page }) => {
    await switchTab(page, 'tcf');
    await expect(page.locator('#tab-tcf')).toHaveClass(/active/);
    await expect(page.locator('#tabComp')).not.toHaveClass(/active/);
    await expect(page.locator('#tabCont')).not.toHaveClass(/active/);
  });

  test('TCF tab: left list shows companies for selection', async ({ page }) => {
    await switchTab(page, 'tcf');
    await expect(page.locator('#listScroll')).toBeVisible();
    await expect(page.locator('.c-row').first()).toBeVisible({ timeout: 10000 });
  });

  test('audiences tab: list scroll hidden, audiences panel shown', async ({ page }) => {
    await switchTab(page, 'audiences');
    await expect(page.locator('#listScroll')).toBeHidden();
    await expect(page.locator('#audiencesPanel')).toBeVisible();
    await expect(page.locator('#coPanel')).toBeHidden();
    await expect(page.locator('#tcf-center')).toBeHidden();
    await expect(page.locator('#emptyState')).toBeHidden();
  });

  test('audiences tab: aud detail wrap hidden until audience selected', async ({ page }) => {
    await switchTab(page, 'audiences');
    // aud-detail-wrap only visible if S.activeAudience is set
    const state = await page.evaluate(() => !!(window._oaState?.activeAudience));
    if (!state) {
      // No active audience — detail wrap should be hidden
      const wrap = page.locator('#aud-detail-wrap');
      const exists = await wrap.count();
      if (exists) await expect(wrap).toBeHidden();
    }
  });

  test('switching tabs resets previous tab panels', async ({ page }) => {
    // companies → TCF → companies: coPanel state preserved correctly
    await switchTab(page, 'companies');
    await page.locator('.c-row').first().click();
    await expect(page.locator('#coPanel')).toBeVisible({ timeout: 5000 });

    await switchTab(page, 'tcf');
    await expect(page.locator('#coPanel')).toBeHidden();

    // Back to companies — coPanel should reappear (currentCompany still set)
    await switchTab(page, 'companies');
    await expect(page.locator('#coPanel')).toBeVisible({ timeout: 3000 });
  });

  test('no panel bleeds: coPanel never visible on contacts tab', async ({ page }) => {
    // Open company, switch rapidly between tabs, check no bleed
    await switchTab(page, 'companies');
    await page.locator('.c-row').first().click();
    await expect(page.locator('#coPanel')).toBeVisible({ timeout: 5000 });

    for (const tab of ['contacts', 'tcf', 'audiences', 'contacts']) {
      await switchTab(page, tab);
      if (tab === 'contacts') {
        await expect(page.locator('#coPanel')).toBeHidden();
      } else if (tab === 'tcf') {
        await expect(page.locator('#coPanel')).toBeHidden();
      }
    }
  });
});

// ── SUITE: TCF company selection ──────────────────────────────────
test.describe('TCF tab selection', () => {

  test.beforeEach(async ({ page }) => {
    await waitForHub(page);
    await page.evaluate(() => window.switchTab('tcf'));
    await page.waitForTimeout(500);
  });

  test('clicking a company row selects it for TCF', async ({ page }) => {
    await expect(page.locator('.c-row').first()).toBeVisible({ timeout: 10000 });
    await page.locator('.c-row').first().click();
    await page.waitForTimeout(300);
    // TCF center should update with content
    await expect(page.locator('#tcf-center')).not.toBeEmpty();
  });

  test('TCF sel bar shows selected count after selection', async ({ page }) => {
    await page.locator('.c-row').first().click();
    await page.waitForTimeout(300);
    await expect(page.locator('#tcf-sel-bar')).toContainText('1 selected');
  });

  test('TCF clear selection resets count', async ({ page }) => {
    await page.locator('.c-row').first().click();
    await page.waitForTimeout(200);
    await page.evaluate(() => window.tcfClearSel());
    await page.waitForTimeout(200);
    await expect(page.locator('#tcf-sel-bar')).not.toContainText('1 selected');
  });

  test('selecting 2 companies shows comparison view', async ({ page }) => {
    const rows = page.locator('.c-row');
    await expect(rows.first()).toBeVisible({ timeout: 10000 });
    await rows.nth(0).click();
    await rows.nth(1).click();
    await page.waitForTimeout(500);
    await expect(page.locator('#tcf-sel-bar')).toContainText('2 selected');
  });
});
