/**
 * auth.setup.ts
 *
 * The hub is a static GitHub Pages site — no login wall.
 * Just navigate, wait for boot, save storage state so downstream
 * tests inherit any localStorage tokens set by api.js.
 */
import { test as setup, expect } from '@playwright/test';

const HUB = 'https://lukaszkapusniak-sudo.github.io/onaudience-hub/hub/';

setup('authenticate', async ({ page }) => {
  await page.goto(HUB);

  // Hub boots without credentials — just wait for nav
  await expect(page.locator('nav.nav')).toBeVisible({ timeout: 20000 });

  // Wait for Supabase connection ("Live" in status)
  await expect(page.locator('.nav-status')).toContainText('Live', { timeout: 30000 });

  // Ensure data loaded
  await page.evaluate(() => {
    window.clearAI?.();
    window.setFilter?.('all', document.querySelector('#sbAll'));
  });
  await expect(page.locator('.c-row').first()).toBeVisible({ timeout: 20000 });

  // Save storage state (Supabase anon token in localStorage)
  await page.context().storageState({ path: 'tests/fixtures/.auth.json' });
  console.log('✓ Auth setup complete');
});
