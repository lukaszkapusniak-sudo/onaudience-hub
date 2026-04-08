/**
 * auth.setup.ts
 *
 * Hub v2.4 uses Google OAuth for humans. CI uses a dedicated test
 * account via email/password (signInWithPassword) injected directly
 * into localStorage — no OAuth popup needed.
 *
 * Requires: OA_EMAIL, OA_PASSWORD in GitHub Secrets (test account).
 */
import { test as setup, expect } from '@playwright/test';
import dotenv from 'dotenv';
dotenv.config();

const HUB = 'https://lukaszkapusniak-sudo.github.io/onaudience-hub/hub/';

setup('authenticate', async ({ page }) => {
  const email = process.env.OA_EMAIL;
  const pwd   = process.env.OA_PASSWORD;
  if (!email || !pwd) throw new Error('OA_EMAIL and OA_PASSWORD must be set in env / GitHub Secrets');

  await page.goto(HUB);

  // Wait for Supabase SDK and auth.js to load
  await page.waitForFunction(() => !!window.supabase, { timeout: 15000 });

  // Sign in via email/password — bypasses OAuth popup, works headless
  const result = await page.evaluate(async ({ email, pwd }) => {
    // Use the Supabase client already initialized by auth.js
    // Access it through the exported signIn function on window (app.js exports it)
    // Fallback: call Supabase directly if not yet exported
    try {
      if (typeof window.signIn === 'function') {
        await window.signIn(email, pwd);
        return { ok: true, via: 'window.signIn' };
      }
      // Direct Supabase call as fallback
      const SB_URL = 'https://nyzkkqqjnkctcmxoirdj.supabase.co';
      const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55emtrcXFqbmtjdGNteG9pcmRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4NzMxMzYsImV4cCI6MjA4OTQ0OTEzNn0.jhAq_C68klOp4iTyj9HmsyyvoxsOI6ACld7t_87TAk0';
      const sb = window.supabase.createClient(SB_URL, SB_KEY, {
        auth: { persistSession: true, storageKey: 'oaHubSession', detectSessionInUrl: false }
      });
      const { error } = await sb.auth.signInWithPassword({ email, password: pwd });
      if (error) return { ok: false, error: error.message };
      return { ok: true, via: 'direct supabase' };
    } catch(e) {
      return { ok: false, error: String(e) };
    }
  }, { email, pwd });

  if (!result.ok) throw new Error(`Auth failed: ${result.error}`);
  console.log(`✓ Signed in via ${result.via}`);

  // Now reload — Supabase restores session from localStorage, hub boots
  await page.reload();

  // Wait for .app to appear (auth.js calls hideLoginScreen on SIGNED_IN)
  await expect(page.locator('.app')).toBeVisible({ timeout: 20000 });
  await expect(page.locator('nav.nav')).toBeVisible({ timeout: 10000 });
  await expect(page.locator('.nav-status')).toContainText('Live', { timeout: 30000 });

  await page.evaluate(() => {
    window.clearAI?.();
    window.setFilter?.('all', document.querySelector('#sbAll'));
  });
  await expect(page.locator('.c-row').first()).toBeVisible({ timeout: 20000 });

  // Save storage state (oaHubSession in localStorage)
  await page.context().storageState({ path: 'tests/fixtures/.auth.json' });
  console.log('✓ Auth setup complete — storage state saved');
});
