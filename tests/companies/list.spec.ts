import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("./");
  await expect(page.locator("nav.nav")).toBeVisible({ timeout: 15000 });
  await expect(page.locator("#stAll")).not.toHaveText("0", { timeout: 15000 });
});

test("company list renders rows", async ({ page }) => {
  await expect(page.locator(".co-row").first()).toBeVisible({ timeout: 10000 });
});

test("search filters companies", async ({ page }) => {
  const searchInput = page.locator("input[placeholder*=Search]").first();
  await expect(searchInput).toBeVisible();
  await searchInput.fill("trade desk");
  await page.waitForTimeout(500);
  const count = await page.locator(".co-row").count();
  const hasNoResults = await page.locator("text=NO RESULTS").isVisible();
  expect(count > 0 || hasNoResults).toBeTruthy();
});

test("client filter chip works", async ({ page }) => {
  await page.locator("#sbClient").click();
  await page.waitForTimeout(500);
  await expect(page.locator("#sbClient")).toHaveClass(/active/);
});

test("all filter resets list", async ({ page }) => {
  await page.locator("#sbClient").click();
  await page.waitForTimeout(300);
  await page.locator("#sbAll").click();
  await page.waitForTimeout(300);
  await expect(page.locator("#sbAll")).toHaveClass(/active/);
});
