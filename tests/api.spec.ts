import { test, expect } from '@playwright/test';

test('merge_suggestions 403 does not crash hub', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  // Mock the RLS-protected endpoint before navigation
  await page.route('**/merge_suggestions**', route =>
    route.fulfill({ status: 403, body: 'Forbidden' })
  );
  await page.goto('./');
  await expect(page.locator('.app')).toBeVisible({ timeout: 20000 });
  await expect(page.locator('nav.nav')).toBeVisible({ timeout: 10000 });
  await expect(page.locator('.stats-bar')).toBeVisible({ timeout: 15000 });
  // No fatal JS errors (403 is expected and handled)
  const fatal = errors.filter(e => !e.includes('403') && !e.includes('Failed to fetch'));
  expect(fatal).toHaveLength(0);
});

test('Supabase companies endpoint returns data', async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('.app')).toBeVisible({ timeout: 20000 });
  // Robust boot check — wait for companies to load (avoids nav-status text race)
  await page.waitForFunction(
    () => (window as any)._oaState?.companies?.length > 0,
    undefined,
    { timeout: 45000, polling: 500 }
  );
  // Companies loaded into state
  const count = await page.evaluate(() => window._oaState?.companies?.length || 0);
  expect(count).toBeGreaterThan(0);
});

test('AI bar input is visible and accepts text', async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('.app')).toBeVisible({ timeout: 20000 });
  await expect(page.locator('nav.nav')).toBeVisible({ timeout: 10000 });
  // Robust boot check — wait for companies to load (avoids nav-status text race)
  await page.waitForFunction(
    () => (window as any)._oaState?.companies?.length > 0,
    undefined,
    { timeout: 45000, polling: 500 }
  );
  await page.evaluate(() => {
    window.clearAI?.();
    window.setFilter?.('all', document.querySelector('#sbAll'));
  });
  const aiInput = page.locator('#aiInp');
  await expect(aiInput).toBeVisible({ timeout: 10000 });
  await aiInput.fill('EU DSPs with CTV');
  await expect(aiInput).toHaveValue('EU DSPs with CTV');
});
