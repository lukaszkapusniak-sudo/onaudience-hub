/**
 * auth.setup.ts — Hub v2.4 (Google OAuth)
 *
 * CI signs in via Supabase email/password directly (bypasses OAuth popup).
 * Saves session to storage state for all downstream tests.
 *
 * Requires: OA_EMAIL, OA_PASSWORD in GitHub Secrets / .env
 */
import { test as setup, expect } from '@playwright/test';
import dotenv from 'dotenv';
dotenv.config();

const HUB = 'https://lukaszkapusniak-sudo.github.io/onaudience-hub/hub/';
const SB_URL = 'https://nyzkkqqjnkctcmxoirdj.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55emtrcXFqbmtjdGNteG9pcmRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4NzMxMzYsImV4cCI6MjA4OTQ0OTEzNn0.jhAq_C68klOp4iTyj9HmsyyvoxsOI6ACld7t_87TAk0';

setup('authenticate', async ({ page }) => {
  const email = process.env.OA_EMAIL;
  const pwd   = process.env.OA_PASSWORD;
  if (!email || !pwd) throw new Error('OA_EMAIL and OA_PASSWORD must be set');

  await page.goto(HUB);

  // Wait for Supabase SDK to load
  await page.waitForFunction(() => !!window.supabase, { timeout: 15000 });

  // Sign in via email/password directly — no OAuth popup, works headless
  const result = await page.evaluate(
    async ({ email, pwd, SB_URL, SB_KEY }) => {
      try {
        const sb = window.supabase.createClient(SB_URL, SB_KEY, {
          auth: {
            persistSession: true,
            storageKey: 'oaHubSession',
            detectSessionInUrl: false,
          }
        });
        const { data, error } = await sb.auth.signInWithPassword({ email, password: pwd });
        if (error) return { ok: false, error: error.message };
        return { ok: true, email: data.user?.email };
      } catch(e) {
        return { ok: false, error: String(e) };
      }
    },
    { email, pwd, SB_URL, SB_KEY }
  );

  if (!result.ok) throw new Error(`Sign-in failed: ${result.error}`);
  console.log(`✓ Signed in as ${result.email}`);

  // Reload — Supabase restores the persisted session, hub boots normally
  await page.reload();

  // Wait for full boot
  await expect(page.locator('.app')).toBeVisible({ timeout: 25000 });
  await expect(page.locator('nav.nav')).toBeVisible({ timeout: 10000 });
  await expect(page.locator('.nav-status')).toContainText('Live', { timeout: 35000 });
  await page.evaluate(() => {
    window.clearAI?.();
    window.setFilter?.('all', document.querySelector('#sbAll'));
  });
  await expect(page.locator('.c-row').first()).toBeVisible({ timeout: 20000 });

  await page.context().storageState({ path: 'tests/fixtures/.auth.json' });
  console.log('✓ Storage state saved');
});
