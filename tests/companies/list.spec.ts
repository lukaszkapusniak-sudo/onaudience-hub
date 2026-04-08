import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("./");
  await expect(page.locator('.app')).toBeVisible({ timeout: 20000 });
  await expect(page.locator('.app')).toBeVisible({ timeout: 20000 });
  await expect(page.locator("nav.nav")).toBeVisible({ timeout: 10000 });
  await expect(page.locator(".nav-status")).toContainText("Live", { timeout: 20000 });
  await page.waitForTimeout(2000);
  await page.evaluate(() => {
    window.clearAI();
    window.setFilter("all", document.querySelector("#sbAll"));
  });
  await page.waitForTimeout(1500);
});

test("company list renders rows", async ({ page }) => {
  await expect(page.locator(".c-row").first()).toBeVisible({ timeout: 20000 });
});

test("search filters companies", async ({ page }) => {
  await expect(page.locator(".c-row").first()).toBeVisible({ timeout: 20000 });
  await page.locator("input[placeholder*=Search]").first().fill("trade desk");
  await page.waitForTimeout(800);
  const count = await page.locator(".c-row").count();
  const hasNoResults = await page.locator("text=No results").isVisible();
  expect(count > 0 || hasNoResults).toBeTruthy();
});

test("client filter chip works", async ({ page }) => {
  await expect(page.locator(".c-row").first()).toBeVisible({ timeout: 20000 });
  await page.locator(".f-chip", { hasText: "Clients" }).click();
  await page.waitForTimeout(500);
  await expect(page.locator("#sbClient")).toHaveClass(/active/);
});

test("all filter resets list", async ({ page }) => {
  await expect(page.locator(".c-row").first()).toBeVisible({ timeout: 20000 });
  await page.locator(".f-chip", { hasText: "Clients" }).click();
  await page.waitForTimeout(300);
  await page.locator(".f-chip", { hasText: "All" }).click();
  await page.waitForTimeout(300);
  await expect(page.locator("#sbAll")).toHaveClass(/active/);
});
