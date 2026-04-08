import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("./");
  await expect(page.locator('.app')).toBeVisible({ timeout: 20000 });
  await expect(page.locator('.app')).toBeVisible({ timeout: 20000 });
  await expect(page.locator("nav.nav")).toBeVisible({ timeout: 10000 });
  await expect(page.locator(".nav-status")).toContainText("Live", { timeout: 20000 });
  await page.locator("#tabLemlist").click();
  await page.waitForTimeout(500);
});

test("lemlist tab is active after click", async ({ page }) => {
  await expect(page.locator("#tabLemlist")).toHaveClass(/active/);
});

test("lemlist panel renders", async ({ page }) => {
  await expect(page.locator("#lemlistPanel")).toBeVisible({ timeout: 5000 });
});

test("switching away from lemlist restores companies", async ({ page }) => {
  await page.locator("#tabComp").click();
  await page.waitForTimeout(300);
  await expect(page.locator("#tabComp")).toHaveClass(/active/);
});
