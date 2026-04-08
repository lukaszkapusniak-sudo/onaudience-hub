import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("./");
  await expect(page.locator('.app')).toBeVisible({ timeout: 20000 });
  await expect(page.locator('.app')).toBeVisible({ timeout: 20000 });
  await expect(page.locator("nav.nav")).toBeVisible({ timeout: 10000 });
  await expect(page.locator(".nav-status")).toContainText("Live", { timeout: 20000 });
  await page.evaluate(() => {
    window.clearAI();
    window.setFilter("all", document.querySelector("#sbAll"));
  });
  await expect(page.locator(".c-row").first()).toBeVisible({ timeout: 20000 });
});

test("right-click opens context menu", async ({ page }) => {
  await page.locator(".c-row").first().click({ button: "right" });
  await expect(page.locator("#ctxMenu")).toBeVisible({ timeout: 3000 });
});

test("context menu shows company name", async ({ page }) => {
  const name = await page.locator(".c-row .c-name").first().textContent();
  await page.locator(".c-row").first().click({ button: "right" });
  await expect(page.locator("#ctxMenu .ctx-label")).toContainText(name!.trim());
});

test("context menu has action items", async ({ page }) => {
  await page.locator(".c-row").first().click({ button: "right" });
  await expect(page.locator("#ctxMenu .ctx-item").first()).toBeVisible();
  const count = await page.locator("#ctxMenu .ctx-item").count();
  expect(count).toBeGreaterThanOrEqual(4);
});

test("context menu Draft option opens composer", async ({ page }) => {
  await page.locator(".c-row").first().click({ button: "right" });
  await expect(page.locator("#ctxMenu")).toBeVisible();
  await page.locator("#ctxMenu .ctx-item:has-text('Draft')").click();
  await expect(page.locator("#mcDrawer")).toHaveClass(/open/, { timeout: 5000 });
});

test("clicking outside closes context menu", async ({ page }) => {
  await page.locator(".c-row").first().click({ button: "right" });
  await expect(page.locator("#ctxMenu")).toBeVisible();
  await page.locator("nav.nav").click();
  await page.waitForTimeout(300);
  await expect(page.locator("#ctxMenu")).not.toBeVisible();
});

test("Escape key closes context menu", async ({ page }) => {
  await page.locator(".c-row").first().click({ button: "right" });
  await expect(page.locator("#ctxMenu")).toBeVisible();
  await page.keyboard.press("Escape");
  await page.waitForTimeout(200);
  await expect(page.locator("#ctxMenu")).not.toBeVisible();
});
