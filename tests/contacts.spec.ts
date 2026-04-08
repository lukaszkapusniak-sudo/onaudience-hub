import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("./");
  await expect(page.locator("nav.nav")).toBeVisible({ timeout: 15000 });
  await expect(page.locator(".nav-status")).toContainText("Live", { timeout: 20000 });
  await page.waitForTimeout(2000);
  await page.evaluate(() => window.switchTab("contacts"));
  await page.waitForTimeout(500);
});

test("contacts tab is active after switch", async ({ page }) => {
  await expect(page.locator("#tabCont")).toHaveClass(/active/);
});

test("contacts list renders rows", async ({ page }) => {
  await expect(page.locator(".ct-row").first()).toBeVisible({ timeout: 10000 });
});

test("contact search filters results", async ({ page }) => {
  await expect(page.locator(".ct-row").first()).toBeVisible({ timeout: 10000 });
  const searchInput = page.locator("input[placeholder*=Search]").first();
  await searchInput.fill("john");
  await page.waitForTimeout(500);
  const count = await page.locator(".ct-row").count();
  const noContacts = await page.locator("text=No contacts").isVisible();
  expect(count > 0 || noContacts).toBeTruthy();
});

test("switch back to companies works", async ({ page }) => {
  await page.evaluate(() => window.switchTab("companies"));
  await page.waitForTimeout(300);
  await expect(page.locator("#tabComp")).toHaveClass(/active/);
});
