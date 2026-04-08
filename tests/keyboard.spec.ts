import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("./");
  await expect(page.locator('.app')).toBeVisible({ timeout: 20000 });
  await expect(page.locator("nav.nav")).toBeVisible({ timeout: 10000 });
  await expect(page.locator(".nav-status")).toContainText("Live", { timeout: 30000 });
  await page.evaluate(() => {
    window.clearAI();
    window.setFilter("all", document.querySelector("#sbAll"));
  });
  await expect(page.locator(".c-row").first()).toBeVisible({ timeout: 20000 });
  // click body to ensure page has focus
  await page.locator("body").click();
});

test("j key moves focus to first row", async ({ page }) => {
  await page.keyboard.press("j");
  await expect(page.locator(".c-row.kb-focus").first()).toBeVisible({ timeout: 3000 });
});

test("j/k keys navigate up and down", async ({ page }) => {
  await page.keyboard.press("j");
  await page.keyboard.press("j");
  const secondFocus = await page.locator(".c-row.kb-focus").first().textContent();
  await page.keyboard.press("k");
  const firstFocus = await page.locator(".c-row.kb-focus").first().textContent();
  expect(firstFocus).not.toBe(secondFocus);
});

test("ArrowDown moves focus to first row", async ({ page }) => {
  await page.keyboard.press("ArrowDown");
  await expect(page.locator(".c-row.kb-focus").first()).toBeVisible({ timeout: 3000 });
});

test("Enter opens focused company", async ({ page }) => {
  await page.keyboard.press("j");
  await expect(page.locator(".c-row.kb-focus")).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(page.locator("#coPanel")).toBeVisible({ timeout: 5000 });
});

test("Escape closes open panel", async ({ page }) => {
  await page.locator(".c-row").first().click();
  await expect(page.locator("#coPanel")).toBeVisible({ timeout: 5000 });
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  await expect(page.locator("#emptyState")).toBeVisible({ timeout: 3000 });
});

test("/ key focuses search input", async ({ page }) => {
  await page.keyboard.press("/");
  await expect(page.locator("#searchInput")).toBeFocused({ timeout: 3000 });
});

test("j key does not trigger when typing in search", async ({ page }) => {
  await page.locator("#searchInput").click();
  await page.keyboard.press("j");
  // j should type into search, not navigate
  await expect(page.locator("#searchInput")).toHaveValue("j");
});
