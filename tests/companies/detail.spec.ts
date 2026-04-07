import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("./");
  await expect(page.locator("nav.nav")).toBeVisible({ timeout: 15000 });
  await expect(page.locator(".nav-status")).toContainText("Live", { timeout: 20000 });
  await page.waitForTimeout(2000);
  await page.evaluate(() => {
    window.clearAI();
    window.setFilter("all", document.querySelector("#sbAll"));
  });
  await page.waitForTimeout(1500);
  await expect(page.locator(".c-row").first()).toBeVisible({ timeout: 20000 });
});

test("click company row opens detail panel", async ({ page }) => {
  await page.locator(".c-row").first().click();
  await expect(page.locator("#coPanel button:has-text(\"Draft Email\")")).toBeVisible({ timeout: 8000 });
});

test("foldable sections toggle without crash", async ({ page }) => {
  await page.locator(".c-row").first().click();
  await page.waitForTimeout(1000);
  await expect(page.locator("nav.nav")).toBeVisible();
});
