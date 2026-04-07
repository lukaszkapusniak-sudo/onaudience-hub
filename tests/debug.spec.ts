import { test } from '@playwright/test';

test('dump page content', async ({ page }) => {
  await page.goto('https://lukaszkapusniak-sudo.github.io/onaudience-hub/hub/');
  await page.waitForTimeout(4000);
  const html = await page.content();
  console.log(html.substring(0, 3000));
  await page.screenshot({ path: 'tests/hub-debug.png', fullPage: true });
});
