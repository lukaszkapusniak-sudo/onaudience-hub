import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("./");
  await expect(page.locator("nav.nav")).toBeVisible({ timeout: 15000 });
  await expect(page.locator(".nav-status")).toContainText("Live", { timeout: 20000 });
  await page.evaluate(() => {
    window.clearAI();
    window.setFilter("all", document.querySelector("#sbAll"));
  });
  await expect(page.locator(".c-row").first()).toBeVisible({ timeout: 20000 });
  await page.waitForTimeout(500);
});

test("nav bar visual", async ({ page }) => {
  await expect(page.locator("nav.nav")).toHaveScreenshot("nav-bar.png", {
    maxDiffPixelRatio: 0.02,
  });
});

test("stats bar visual", async ({ page }) => {
  await expect(page.locator(".stats-bar")).toHaveScreenshot("stats-bar.png", {
    maxDiffPixelRatio: 0.02,
  });
});

test("company row visual", async ({ page }) => {
  await expect(page.locator(".c-row").first()).toHaveScreenshot("company-row.png", {
    maxDiffPixelRatio: 0.05,
  });
});

test("full hub layout visual", async ({ page }) => {
  await expect(page).toHaveScreenshot("hub-full.png", {
    maxDiffPixelRatio: 0.03,
    fullPage: false,
  });
});
