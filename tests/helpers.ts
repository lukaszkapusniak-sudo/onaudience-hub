/**
 * helpers.ts — shared test utilities (Hub v2.4)
 */
import { Page, expect } from '@playwright/test';
import dotenv from 'dotenv';
dotenv.config();

const SB_URL = 'https://nyzkkqqjnkctcmxoirdj.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55emtrcXFqbmtjdGNteG9pcmRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4NzMxMzYsImV4cCI6MjA4OTQ0OTEzNn0.jhAq_C68klOp4iTyj9HmsyyvoxsOI6ACld7t_87TAk0';

async function ensureSignedIn(page: Page) {
  const loginVisible = await page.locator('#oaLoginScreen').isVisible({ timeout: 4000 }).catch(() => false);
  if (!loginVisible) return;

  const email = process.env.OA_EMAIL;
  const pwd   = process.env.OA_PASSWORD;
  if (!email || !pwd) throw new Error('OA_EMAIL / OA_PASSWORD not set');

  console.warn('Login screen appeared — signing in via CI account');
  await page.waitForFunction(() => !!window.supabase, { timeout: 10000 });
  const r = await page.evaluate(
    async ({ email, pwd, SB_URL, SB_KEY }) => {
      const sb = window.supabase.createClient(SB_URL, SB_KEY, {
        auth: { persistSession: true, storageKey: 'oaHubSession', detectSessionInUrl: false }
      });
      const { error } = await sb.auth.signInWithPassword({ email, password: pwd });
      return error ? { ok: false, msg: error.message } : { ok: true };
    },
    { email, pwd, SB_URL, SB_KEY }
  );
  if (!r.ok) throw new Error(`CI sign-in failed: ${(r as any).msg}`);
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
