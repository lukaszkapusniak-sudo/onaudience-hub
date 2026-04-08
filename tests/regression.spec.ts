import { test, expect } from "@playwright/test";

test("state.js shared correctly — companies load and render (regression: version mismatch)", async ({ page }) => {
  await page.goto("./");
  await expect(page.locator('.app')).toBeVisible({ timeout: 20000 });
  await expect(page.locator("nav.nav")).toBeVisible({ timeout: 10000 });
  await expect(page.locator(".nav-status")).toContainText("Live", { timeout: 30000 });
  // This test catches the bug where api.js and hub.js had different state.js
  // versions causing S.companies to be in a different module instance
  // symptom: companies load (nav shows count) but list shows "0 of 0"
  await page.evaluate(() => {
    window.clearAI();
    window.setFilter("all", document.querySelector("#sbAll"));
  });
  await expect(page.locator(".c-row").first()).toBeVisible({ timeout: 20000 });
  const meta = await page.locator("#metaTxt").textContent();
  expect(meta).not.toBe("0 of 0");
  expect(meta).not.toBe("Loading…");
});
