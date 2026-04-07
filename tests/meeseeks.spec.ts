import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("./");
  await expect(page.locator("nav.nav")).toBeVisible({ timeout: 15000 });
});

test("compose button opens meeseeks drawer", async ({ page }) => {
  await page.locator("button[onclick*=openComposer]").first().click();
  await expect(page.locator("#mcDrawer")).toHaveClass(/open/, { timeout: 8000 });
});

test("meeseeks drawer has persona grid", async ({ page }) => {
  await page.locator("button[onclick*=openComposer]").first().click();
  await expect(page.locator("#mcDrawer")).toHaveClass(/open/, { timeout: 8000 });
  await expect(page.locator("text=Pick Meeseeks")).toBeVisible();
});

test("meeseeks close button works", async ({ page }) => {
  await page.locator("button[onclick*=openComposer]").first().click();
  await expect(page.locator("#mcDrawer")).toHaveClass(/open/, { timeout: 8000 });
  await page.evaluate(() => window.closeComposer());
  await expect(page.locator("#mcDrawer")).not.toHaveClass(/open/, { timeout: 5000 });
});
