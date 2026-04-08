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
});

test("tag panel toggle opens", async ({ page }) => {
  await page.locator("#tagBtn").click();
  await expect(page.locator("#tagPanel")).toHaveClass(/open/, { timeout: 3000 });
});

test("tag panel shows tag pills", async ({ page }) => {
  await page.locator("#tagBtn").click();
  await expect(page.locator("#tpBody .t-pill").first()).toBeVisible({ timeout: 5000 });
});

test("clicking a tag filters the list", async ({ page }) => {
  const countBefore = await page.locator(".c-row").count();
  await page.locator("#tagBtn").click();
  await expect(page.locator("#tpBody .t-pill").first()).toBeVisible({ timeout: 5000 });
  await page.locator("#tpBody .t-pill").first().click();
  await page.waitForTimeout(500);
  const countAfter = await page.locator(".c-row").count();
  expect(countAfter).toBeLessThanOrEqual(countBefore);
  await expect(page.locator("#metaTxt")).toContainText("tag");
});

test("OR AND logic toggle works", async ({ page }) => {
  await page.locator("#tagBtn").click();
  await page.locator("#tlAnd").click();
  await expect(page.locator("#tlAnd")).toHaveClass(/active/);
  await page.locator("#tlOr").click();
  await expect(page.locator("#tlOr")).toHaveClass(/active/);
});

test("clear tags resets filter", async ({ page }) => {
  await page.locator("#tagBtn").click();
  await expect(page.locator("#tpBody .t-pill").first()).toBeVisible({ timeout: 5000 });
  await page.locator("#tpBody .t-pill").first().click();
  await page.waitForTimeout(300);
  await page.locator("#tpClear").click();
  await page.waitForTimeout(300);
  await expect(page.locator("#metaTxt")).not.toContainText("tag");
});

test("tag panel closes on second toggle", async ({ page }) => {
  await page.locator("#tagBtn").click();
  await expect(page.locator("#tagPanel")).toHaveClass(/open/);
  await page.locator("#tagBtn").click();
  await expect(page.locator("#tagPanel")).not.toHaveClass(/open/);
});
