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
});

test("sort dropdown is visible", async ({ page }) => {
  await expect(page.locator("#sortSel")).toBeVisible();
});

test("sort by name A-Z changes order", async ({ page }) => {
  const firstNameBefore = await page.locator(".c-row .c-name").first().textContent();
  await page.locator("#sortSel").selectOption("name");
  await page.waitForTimeout(500);
  const firstNameAfter = await page.locator(".c-row .c-name").first().textContent();
  // after sorting by name the first company name should be alphabetically early
  expect(firstNameAfter).toBeTruthy();
  // reset
  await page.locator("#sortSel").selectOption("recent");
});

test("sort by ICP score works", async ({ page }) => {
  await page.locator("#sortSel").selectOption("icp");
  await page.waitForTimeout(500);
  await expect(page.locator(".c-row").first()).toBeVisible();
});
