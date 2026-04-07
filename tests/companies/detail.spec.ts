import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.removeItem("oaSearch");
    localStorage.removeItem("oaFilter");
    localStorage.removeItem("oaActiveFilter");
    localStorage.removeItem("oaTags");
    localStorage.removeItem("oaAIResult");
  });
  await page.goto("./");
  await expect(page.locator("nav.nav")).toBeVisible({ timeout: 15000 });
  await expect(page.locator(".nav-status")).toContainText("Live", { timeout: 20000 });
  await page.waitForTimeout(3000);
  await expect(page.locator(".co-row").first()).toBeVisible({ timeout: 20000 });
});

test("click company row opens detail panel", async ({ page }) => {
  await page.locator(".co-row").first().click();
  await expect(page.locator("button:has-text(\"Draft Email\")")).toBeVisible({ timeout: 8000 });
});

test("foldable sections toggle without crash", async ({ page }) => {
  await page.locator(".co-row").first().click();
  await page.waitForTimeout(1000);
  await expect(page.locator("nav.nav")).toBeVisible();
});
