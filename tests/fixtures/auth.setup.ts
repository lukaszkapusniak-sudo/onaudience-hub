/**
 * auth.setup.ts — Hub v2.4
 *
 * Signs in via Supabase REST API (pure Node HTTP — no browser JS eval needed).
 * Injects the session into localStorage via addInitScript so the app finds it
 * immediately on page load without any race conditions.
 */
import { test as setup, expect, request } from '@playwright/test';
import { ENV } from '../env';
const HUB    = ENV.HUB_URL;
const SB_URL = ENV.SB_URL;
const SB_KEY = ENV.SB_ANON_KEY;

setup('authenticate', async ({ page }) => {
  const email = process.env.OA_EMAIL;
  const pwd   = process.env.OA_PASSWORD;
  if (!email || !pwd) throw new Error('OA_EMAIL and OA_PASSWORD must be set in GitHub Secrets');

  // ── Step 1: Sign in via REST API (pure Node, no browser JS) ──────────
  const api = await request.newContext();
  const res = await api.post(`${SB_URL}/auth/v1/token?grant_type=password`, {
    headers: {
      'apikey': SB_KEY,
      'Content-Type': 'application/json',
    },
    data: { email, password: pwd },
    timeout: 60_000,  // Supabase auth can spike to 7s — give it 60s in CI
  });

  if (!res.ok()) {
    const body = await res.text();
    throw new Error(`Supabase sign-in failed (${res.status()}): ${body}`);
  }

  const session = await res.json();
  if (session.error) throw new Error(`Auth error: ${session.error_description || session.error}`);
  console.log(`✓ Signed in as ${session.user?.email} (REST API)`);
  await api.dispose();

  // ── Step 2: Inject session into localStorage BEFORE page loads ────────
  // This runs before any page scripts — Supabase finds it immediately
  await page.addInitScript((sessionData: string) => {
    try { localStorage.setItem('oaHubSession', sessionData); } catch {}
  }, JSON.stringify(session));

  // ── Step 3: Navigate — hub boots with pre-injected session ────────────
  await page.goto(HUB);

  // Wait for auth.js to call hideLoginScreen() → .app becomes visible
  await expect(page.locator('.app')).toBeVisible({ timeout: 30000 });
  await expect(page.locator('nav.nav')).toBeVisible({ timeout: 10000 });
  // Wait for hub to load data — poll S.companies until non-empty
  // Avoids brittle nav-status text/class checks that race with pagination
  await page.waitForFunction(
    () => (window as any)._oaState?.companies?.length > 0,
    { timeout: 45000, polling: 500 }
  );

  await page.evaluate(() => {
    window.clearAI?.();
    window.setFilter?.('all', document.querySelector('#sbAll'));
  });
  await expect(page.locator('.c-row').first()).toBeVisible({ timeout: 25000 });

  // ── Step 4: Save storage state (localStorage with session) ────────────
  await page.context().storageState({ path: 'tests/fixtures/.auth.json' });
  console.log('✓ Storage state saved');
});
