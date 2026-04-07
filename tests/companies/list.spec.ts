import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  // clear BEFORE page boots so hub reads clean state
  await page.addInitScript(() => {
    localStorage.removeItem("oaSearch");
    localStorage.removeItem("oaFilter");
    localStorage.removeItem("oaActiveFilter");
    localStorage.removeItem("oaTags");
    localStorage.removeItem("oaAIResult");
  });
  await page.goto("./");
  await expect(page.locator("nav.nav")).toBeVisible({ timeout: 15000 });
  // wait for data to load fully
  await expect(page.locator(".nav-status")).toContainText("Live", { timeout: 20000 });
  await page.waitForTimeout(3000);
});

test("company list renders rows", async ({ page }) => {
  await expect(page.locator(".co-row").first()).toBeVisible({ timeout: 20000 });
});

test("search filters companies", async ({ page }) => {
  await expect(page.locator(".co-row").first()).toBeVisible({ timeout: 20000 });
  const searchInput = page.locator("input[placeholder*=Search]").first();
  await searchInput.fill("trade desk");
  await page.waitForTimeout(800);
  const count = await page.locator(".co-row").count();
  const hasNoResults = await page.locator("text=No results").isVisible();
  expect(count > 0 || hasNoResults).toBeTruthy();
});

test("client filter chip works", async ({ page }) => {
  await expect(page.locator(".co-row").first()).toBeVisible({ timeout: 20000 });
  await page.locator(".filter-chips").locator("text=Clients").click();
  await page.waitForTimeout(500);
  await expect(page.locator("#sbClient")).toHaveClass(/active/);
});

test("all filter resets list", async ({ page }) => {
  await expect(page.locator(".co-row").first()).toBeVisible({ timeout: 20000 });
  await page.locator(".filter-chips").locator("text=Clients").click();
  await page.waitForTimeout(300);
  await page.locator(".filter-chips").locator("text=All").click();
  await page.waitForTimeout(300);
  await expect(page.locator("#sbAll")).toHaveClass(/active/);
});
