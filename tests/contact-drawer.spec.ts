import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("./");
  await expect(page.locator('.app')).toBeVisible({ timeout: 20000 });
  await expect(page.locator('.app')).toBeVisible({ timeout: 20000 });
  await expect(page.locator("nav.nav")).toBeVisible({ timeout: 10000 });
  await expect(page.locator(".nav-status")).toContainText("Live", { timeout: 20000 });
  await page.evaluate(() => window.switchTab("contacts"));
  await page.waitForTimeout(500);
  await expect(page.locator(".ct-row").first()).toBeVisible({ timeout: 10000 });
});

test("clicking contact row opens drawer", async ({ page }) => {
  await page.locator(".ct-row").first().click();
  await expect(page.locator("#ctDrawer")).toHaveClass(/open/, { timeout: 5000 });
});

test("drawer shows contact name", async ({ page }) => {
  const name = await page.locator(".ct-row .ct-name").first().textContent();
  await page.locator(".ct-row").first().click();
  await expect(page.locator("#ctDrawer")).toHaveClass(/open/, { timeout: 5000 });
  await expect(page.locator("#drName")).toContainText(name!.trim());
});

test("drawer has action buttons", async ({ page }) => {
  await page.locator(".ct-row").first().click();
  await expect(page.locator("#ctDrawer")).toHaveClass(/open/, { timeout: 5000 });
  await expect(page.locator("#ctDrawer .btn").first()).toBeVisible();
});

test("close button dismisses drawer", async ({ page }) => {
  await page.locator(".ct-row").first().click();
  await expect(page.locator("#ctDrawer")).toHaveClass(/open/, { timeout: 5000 });
  await page.evaluate(() => window.closeDrawer());
  await expect(page.locator("#ctDrawer")).not.toHaveClass(/open/, { timeout: 3000 });
});

test("overlay click dismisses drawer", async ({ page }) => {
  await page.locator(".ct-row").first().click();
  await expect(page.locator("#ctDrawer")).toHaveClass(/open/, { timeout: 5000 });
  await page.locator("#ctDrawerOverlay").click();
  await expect(page.locator("#ctDrawer")).not.toHaveClass(/open/, { timeout: 3000 });
});
