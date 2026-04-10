import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('.app')).toBeVisible({ timeout: 20000 });
  await expect(page.locator('nav.nav')).toBeVisible({ timeout: 10000 });
  // Robust boot check — wait for companies to load (avoids nav-status text race)
  await page.waitForFunction(() => (window as any)._oaState?.companies?.length > 0, undefined, {
    timeout: 45000,
    polling: 500,
  });
  // Open composer
  await page.locator('button[onclick*=openComposer]').first().click();
  await expect(page.locator('#mcDrawer')).toHaveClass(/open/, { timeout: 8000 });
  // Tiles now in .mc-right
  await expect(page.locator('.mc-right .mc-ptile').first()).toBeVisible({ timeout: 5000 });
});

test('compose button opens meeseeks drawer', async ({ page }) => {
  await expect(page.locator('#mcDrawer')).toHaveClass(/open/);
  await expect(page.locator('#mcDrawer')).toContainText('Meeseeks');
});

test('meeseeks drawer has persona grid', async ({ page }) => {
  await expect(page.locator('#mcPersonaGrid')).toBeVisible();
  await expect(page.locator('.mc-right .mc-ptile').first()).toBeVisible();
});

test('persona grid has at least 8 personas', async ({ page }) => {
  const count = await page.locator('.mc-right .mc-ptile').count();
  expect(count).toBeGreaterThanOrEqual(8);
});

test('clicking persona changes active state', async ({ page }) => {
  const tiles = page.locator('.mc-right .mc-ptile');
  if ((await tiles.count()) > 1) {
    await tiles.nth(1).click();
    await page.waitForTimeout(300);
    await expect(tiles.nth(1)).toHaveClass(/active/);
  }
});

test('meeseeks close button works', async ({ page }) => {
  await page.evaluate(() => window.closeComposer?.());
  await expect(page.locator('#mcDrawer')).not.toHaveClass(/open/, { timeout: 5000 });
});

test.describe('Meeseeks drawer — full width layout', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('./');
    await expect(page.locator('.app')).toBeVisible({ timeout: 20000 });
    await expect(page.locator('nav.nav')).toBeVisible({ timeout: 10000 });
    // Robust boot check — wait for companies to load (avoids nav-status text race)
    await page.waitForFunction(() => (window as any)._oaState?.companies?.length > 0, undefined, {
      timeout: 45000,
      polling: 500,
    });
    await page.locator('button[onclick*=openComposer]').first().click();
    await expect(page.locator('#mcDrawer')).toHaveClass(/open/, { timeout: 8000 });
    await expect(page.locator('.mc-right .mc-ptile').first()).toBeVisible({ timeout: 5000 });
  });

  test('drawer fills at least 70% of viewport width when open', async ({ page }) => {
    const drawerWidth = await page.evaluate(
      () => document.getElementById('mcDrawer')?.getBoundingClientRect().width || 0,
    );
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(drawerWidth).toBeGreaterThan(viewportWidth * 0.7);
  });

  test('drawer right edge is at viewport right when open', async ({ page }) => {
    const rect = await page.evaluate(() => {
      const r = document.getElementById('mcDrawer')?.getBoundingClientRect();
      return r ? { right: r.right, viewW: window.innerWidth } : null;
    });
    if (rect) {
      expect(rect.right).toBeCloseTo(rect.viewW, -1); // within 10px
    }
  });

  test('mc-left panel has adequate width', async ({ page }) => {
    const leftWidth = await page.evaluate(
      () => document.querySelector('.mc-left')?.getBoundingClientRect().width || 0,
    );
    expect(leftWidth).toBeGreaterThanOrEqual(290);
  });

  test('mc-right output area is wider than mc-left', async ({ page }) => {
    const [leftW, rightW] = await page.evaluate(() => [
      document.querySelector('.mc-left')?.getBoundingClientRect().width || 0,
      document.querySelector('.mc-right')?.getBoundingClientRect().width || 0,
    ]);
    expect(rightW).toBeGreaterThan(leftW);
  });
});
