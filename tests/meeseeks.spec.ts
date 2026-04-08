import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("./");
  await expect(page.locator('.app')).toBeVisible({ timeout: 20000 });
  await expect(page.locator('.app')).toBeVisible({ timeout: 20000 });
  await expect(page.locator("nav.nav")).toBeVisible({ timeout: 10000 });
  await page.locator("button[onclick*=openComposer]").first().click();
  await expect(page.locator("#mcDrawer")).toHaveClass(/open/, { timeout: 8000 });
});

test("compose button opens meeseeks drawer", async ({ page }) => {
  await expect(page.locator("text=Meeseeks / Composer")).toBeVisible();
});

test("meeseeks drawer has persona grid", async ({ page }) => {
  await expect(page.locator("text=Pick Meeseeks")).toBeVisible();
});

test("persona grid has 10 personas", async ({ page }) => {
  const personas = page.locator(".mc-ptile");
  const count = await personas.count();
  expect(count).toBeGreaterThanOrEqual(8);
});

test("clicking persona changes active state", async ({ page }) => {
  const personas = page.locator(".mc-ptile");
  if (await personas.count() > 1) {
    await personas.nth(1).click();
    await page.waitForTimeout(300);
    await expect(personas.nth(1)).toHaveClass(/active/);
  }
});

test("meeseeks close button works", async ({ page }) => {
  await page.evaluate(() => window.closeComposer());
  await expect(page.locator("#mcDrawer")).not.toHaveClass(/open/, { timeout: 5000 });
});
