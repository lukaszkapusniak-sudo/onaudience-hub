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
});

test("companies load from Supabase (RLS SELECT ok)", async ({ page }) => {
  await expect(page.locator(".c-row").first()).toBeVisible({ timeout: 20000 });
  const meta = await page.locator("#metaTxt").textContent();
  expect(meta).not.toBe("0 of 0");
});

test("contacts load from Supabase (RLS SELECT ok)", async ({ page }) => {
  await page.evaluate(() => window.switchTab("contacts"));
  await page.waitForTimeout(500);
  const scroll = page.locator("#listScroll");
  await expect(scroll).toBeVisible({ timeout: 5000 });
  const html = await scroll.innerHTML();
  expect(html).not.toContain("undefined");
  expect(html.length).toBeGreaterThan(10);
});

test("company relations section renders in detail panel", async ({ page }) => {
  await expect(page.locator(".c-row").first()).toBeVisible({ timeout: 20000 });
  await page.locator(".c-row").first().click();
  await expect(page.locator("#coPanel")).toBeVisible({ timeout: 8000 });
  await expect(page.locator(".ib-sh-lbl:has-text('Relations')")).toBeVisible({ timeout: 5000 });
});

test("nav status shows Live not error", async ({ page }) => {
  await expect(page.locator(".nav-status")).toContainText("Live");
  await expect(page.locator(".nav-status")).not.toContainText("error");
  await expect(page.locator(".nav-status")).not.toContainText("failed");
});

test("no critical JS errors on load", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.reload();
  await expect(page.locator(".nav-status")).toContainText("Live", { timeout: 20000 });
  await page.waitForTimeout(2000);
  const critical = errors.filter(e =>
    !e.includes("403") &&
    !e.includes("404") &&
    !e.includes("favicon")
  );
  expect(critical).toHaveLength(0);
});
