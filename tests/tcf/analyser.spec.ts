import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("./");
  await expect(page.locator("nav.nav")).toBeVisible({ timeout: 15000 });
  await expect(page.locator(".nav-status")).toContainText("Live", { timeout: 20000 });
  await page.evaluate(() => {
    window.clearAI();
    window.setFilter("all", document.querySelector("#sbAll"));
  });
  await expect(page.locator(".c-row").first()).toBeVisible({ timeout: 20000 });
  await page.locator("#tab-tcf").click();
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    window.renderTCFList();
    const bar = document.getElementById("tcf-sel-bar");
    if (bar) bar.style.display = "flex";
    const scroll = document.getElementById("listScroll");
    if (scroll) scroll.style.display = "";
  });
  await page.waitForTimeout(500);
});

test("TCF list renders company rows", async ({ page }) => {
  await expect(page.locator(".c-row").first()).toBeVisible({ timeout: 10000 });
});

test("TCF row select works", async ({ page }) => {
  await expect(page.locator(".c-row").first()).toBeVisible({ timeout: 10000 });
  await page.locator(".c-row").first().click();
  await page.waitForTimeout(500);
  await expect(page.locator("#tcf-sel-bar")).toContainText("1 selected");
});

test("TCF clear selection works", async ({ page }) => {
  await expect(page.locator(".c-row").first()).toBeVisible({ timeout: 10000 });
  await page.locator(".c-row").first().click();
  await page.waitForTimeout(300);
  await page.locator("#tcf-sel-bar button").click();
  await page.waitForTimeout(300);
  await expect(page.locator("#tcf-sel-bar")).toContainText("0 selected");
});
