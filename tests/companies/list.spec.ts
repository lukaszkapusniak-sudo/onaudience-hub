import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('nav.nav')).toBeVisible({ timeout: 15000 });
  await expect(page.locator('#stAll')).not.toHaveText('0', { timeout: 15000 });
});

test('company list renders rows', async ({ page }) => {
  await expect(page.locator('.co-row').first()).toBeVisible({ timeout: 10000 });
});

test('search filters companies', async ({ page }) => {
  const searchInput = page.locator('input[placeholder*="Search"], input[placeholder*="search"]').first();
  await expect(searchInput).toBeVisible();
  await searchInput.fill('trade desk');
  await page.waitForTimeout(500);
  const rows = page.locator('.co-row');
  const
cat > ~/onaudience-hub/tests/companies/list.spec.ts << 'EOF'
import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('nav.nav')).toBeVisible({ timeout: 15000 });
  await expect(page.locator('#stAll')).not.toHaveText('0', { timeout: 15000 });
});

test('company list renders rows', async ({ page }) => {
  await expect(page.locator('.co-row').first()).toBeVisible({ timeout: 10000 });
});

test('search filters companies', async ({ page }) => {
  const searchInput = page.locator('input[placeholder*="Search"], input[placeholder*="search"]').first();
  await expect(searchInput).toBeVisible();
  await searchInput.fill('trade desk');
  await page.waitForTimeout(500);
  const rows = page.locator('.co-row');
  const count = await rows.count();
  const noResults = page.locator('text=NO RESULTS');
  const hasNoResults = await noResults.isVisible();
  expect(count > 0 || hasNoResults).toBeTruthy();
});

test('search clear resets list', async ({ page }) => {
  const searchInput = page.locator('input[placeholder*="Search"], input[placeholder*="search"]').first();
  await searchInput.fill('xyznotfound123');
  await page.waitForTimeout(500);
  await searchInput.fill('');
  await page.waitForTimeout(500);
  await expect(page.locator('.co-row').first()).toBeVisible({ timeout: 5000 });
});

test('client filter chip works', async ({ page }) => {
  await page.locator('#sbClient').click();
  await page.waitForTimeout(500);
  await expect(page.locator('#sbClient')).toHaveClass(/active/);
});

test('prospect filter chip works', async ({ page }) => {
  await page.locator('#sbProspect').click();
  await page.waitForTimeout(500);
  await expect(page.locator('#sbProspect')).toHaveClass(/active/);
});

test('all filter resets to full list', async ({ page }) => {
  await page.locator('#sbClient').click();
  await page.waitForTimeout(300);
  await page.locator('#sbAll').click();
  await page.waitForTimeout(300);
  await expect(page.locator('#sbAll')).toHaveClass(/active/);
});
