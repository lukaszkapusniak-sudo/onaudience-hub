import { test, expect } from "@playwright/test";

test("wait and observe naturally", async ({ page }) => {
  const rows: number[] = [];
  
  await page.goto("./");
  await expect(page.locator("nav.nav")).toBeVisible({ timeout: 15000 });
  
  // poll every second for 20 seconds
  for (let i = 0; i < 20; i++) {
    await page.waitForTimeout(1000);
    const count = await page.locator(".c-row").count();
    const meta = await page.locator("#metaTxt").textContent();
    const nav = await page.locator("#dbStatus").textContent();
    rows.push(count);
    console.log(`t=${i+1}s rows=${count} meta="${meta}" nav="${nav}"`);
    if (count > 0) break;
  }

  expect(rows).toBeTruthy();
});
