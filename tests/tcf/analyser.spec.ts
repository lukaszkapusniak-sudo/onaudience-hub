import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('.app')).toBeVisible({ timeout: 20000 });
  await expect(page.locator('nav.nav')).toBeVisible({ timeout: 10000 });
  await page.waitForFunction(() => (window as any)._oaState?.companies?.length > 0, undefined, {
    timeout: 45000,
    polling: 500,
  });
  await page.evaluate(() => {
    window.clearAI();
    window.setFilter('all', document.querySelector('#sbAll'));
  });
  await expect(page.locator('.c-row').first()).toBeVisible({ timeout: 20000 });
  await page.locator('#tab-tcf').click();
  await page.waitForTimeout(500);
});

test('TCF tab is active after click', async ({ page }) => {
  await expect(page.locator('#tab-tcf')).toHaveClass(/active/);
});

test('TCF list renders company rows', async ({ page }) => {
  await expect(page.locator('.c-row').first()).toBeVisible({ timeout: 10000 });
});

test('TCF row select works', async ({ page }) => {
  await expect(page.locator('.c-row').first()).toBeVisible({ timeout: 10000 });
  await page.locator('.c-row').first().click();
  await page.waitForTimeout(500);
  await expect(page.locator('#tcf-sel-bar')).toContainText('1 selected');
});

test('TCF clear selection works', async ({ page }) => {
  await expect(page.locator('.c-row').first()).toBeVisible({ timeout: 10000 });
  await page.locator('.c-row').first().click();
  // wait for selection to register and clear button to appear
  await expect(page.locator('#tcf-sel-bar')).toContainText('1 selected', { timeout: 5000 });
  await expect(page.locator('#tcf-sel-bar button')).toBeVisible({ timeout: 5000 });
  await page.locator('#tcf-sel-bar button').click();
  await page.waitForTimeout(300);
  await expect(page.locator('#tcf-sel-bar')).toContainText('0 selected');
});
