import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("./");
  await expect(page.locator("nav.nav")).toBeVisible({ timeout: 15000 });
});

test("compose button opens meeseeks drawer", async ({ page }) => {
  await page.locator("button[onclick*=openComposer]").first().click();
  await page.waitForTimeout(1000);
  await expect(page.locator("text=Meeseeks / Composer")).toBeVisible({ timeout: 8000 });
});

test("meeseeks drawer has persona grid", async ({ page }) => {
  await page.locator("button[onclick*=openComposer]").first().click();
  await expect(page.locator("text=Pick Meeseeks")).toBeVisible({ timeout: 8000 });
});

test("meeseeks close button works", async ({ page }) => {
  await page.locator("button[onclick*=openComposer]").first().click();
  await expect(page.locator("text=Meeseeks / Composer")).toBeVisible({ timeout: 8000 });
  await page.locator("button:has-text(\'✕\')").last().click();
  await page.waitForTimeout(500);
  await expect(page.locator("text=Meeseeks / Composer")).not.toBeVisible({ timeout: 3000 });
});
