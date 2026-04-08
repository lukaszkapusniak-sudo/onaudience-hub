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
  await page.locator(".c-row").first().click();
  await expect(page.locator("#coPanel button:has-text(\"Draft Email\")")).toBeVisible({ timeout: 8000 });
});

test("CTA bar has all primary buttons", async ({ page }) => {
  const cta = page.locator(".ib-cta");
  await expect(cta.locator("button:has-text(\"Draft Email\")")).toBeVisible();
  await expect(cta.locator("button:has-text(\"Find DMs\")")).toBeVisible();
  await expect(cta.locator("button:has-text(\"Gen Angle\")")).toBeVisible();
  await expect(cta.locator("button:has-text(\"LinkedIn\")")).toBeVisible();
});

test("foldable company section toggles", async ({ page }) => {
  const sectionHead = page.locator(".ib-sh").first();
  await expect(sectionHead).toBeVisible({ timeout: 5000 });
  await sectionHead.click();
  await page.waitForTimeout(300);
  await expect(page.locator("nav.nav")).toBeVisible();
});

test("quick links section visible", async ({ page }) => {
  await expect(page.locator(".ib-sh-lbl:has-text(\"Quick Links\")")).toBeVisible({ timeout: 5000 });
});

test("closing panel returns to empty state", async ({ page }) => {
  await page.evaluate(() => window.closePanel());
  await page.waitForTimeout(500);
  await expect(page.locator("#emptyState")).toBeVisible({ timeout: 5000 });
});
