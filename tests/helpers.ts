/**
 * helpers.ts — shared test utilities (Hub v2.4 Google OAuth)
 *
 * The hub shows a Google sign-in screen on boot; .app stays hidden until auth.
 * With storageState, the Supabase session is restored automatically and the
 * login screen should not appear. If it does (expired token), we re-inject
 * the session via email/password (CI test account).
 */
import { Page, expect } from '@playwright/test';
import dotenv from 'dotenv';
dotenv.config();

async function ensureSignedIn(page: Page) {
  // If login screen visible, sign in via email/password (CI fallback)
  const loginScreen = page.locator('#oaLoginScreen');
  const loginVisible = await loginScreen.isVisible({ timeout: 5000 }).catch(() => false);
  if (!loginVisible) return;

  const email = process.env.OA_EMAIL;
  const pwd   = process.env.OA_PASSWORD;
  if (!email || !pwd) throw new Error('OA_EMAIL / OA_PASSWORD not set — needed for CI fallback login');

  console.warn('Login screen appeared despite storage state — signing in via CI account');
  await page.waitForFunction(() => !!window.supabase, { timeout: 10000 });
  const result = await page.evaluate(async ({ email, pwd }) => {
    const SB_URL = 'https://nyzkkqqjnkctcmxoirdj.supabase.co';
    const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55emtrcXFqbmtjdGNteG9pcmRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4NzMxMzYsImV4cCI6MjA4OTQ0OTEzNn0.jhAq_C68klOp4iTyj9HmsyyvoxsOI6ACld7t_87TAk0';
    const sb = window.supabase.createClient(SB_URL, SB_KEY, {
      auth: { persistSession: true, storageKey: 'oaHubSession', detectSessionInUrl: false }
    });
    const { error } = await sb.auth.signInWithPassword({ email, password: pwd });
    return error ? { ok: false, msg: error.message } : { ok: true };
  }, { email, pwd });

  if (!result.ok) throw new Error(`CI fallback sign-in failed: ${result.msg}`);
  await page.reload();
}

export async function waitForHub(page: Page) {
  await page.goto('./');
  await ensureSignedIn(page);
  await expect(page.locator('.app')).toBeVisible({ timeout: 20000 });
  await expect(page.locator('nav.nav')).toBeVisible({ timeout: 10000 });
  await expect(page.locator('.nav-status')).toContainText('Live', { timeout: 30000 });
}

export async function waitForHubWithRows(page: Page) {
  await waitForHub(page);
  await page.evaluate(() => {
    window.clearAI?.();
    window.setFilter?.('all', document.querySelector('#sbAll'));
  });
  await expect(page.locator('.c-row').first()).toBeVisible({ timeout: 20000 });
}
