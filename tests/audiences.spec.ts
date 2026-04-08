import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("./");
  await expect(page.locator("nav.nav")).toBeVisible({ timeout: 15000 });
  await expect(page.locator(".nav-status")).toContainText("Live", { timeout: 20000 });
  await page.locator("#tabAud").click();
  await page.waitForTimeout(500);
});

test("audiences tab is active after click", async ({ page }) => {
  await expect(page.locator("#tabAud")).toHaveClass(/active/);
});

test("audiences panel renders", async ({ page }) => {
  await expect(page.locator("#audiencesPanel")).toBeVisible({ timeout: 5000 });
});

test("switching away from audiences restores list", async ({ page }) => {
  await page.locator("#tabComp").click();
  await page.waitForTimeout(300);
  await expect(page.locator("#tabComp")).toHaveClass(/active/);
  await expect(page.locator("#listScroll")).toBeVisible();
});
