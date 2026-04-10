/**
 * helpers.ts — shared test utilities (Hub v2.4)
 *
 * All tests use storageState from auth.setup, so the session is pre-injected.
 * This helper just navigates and waits for the hub to be ready.
 * If the login screen appears anyway (expired token), it re-injects via REST API.
 */
import { Page, expect, request } from '@playwright/test';
import { ENV } from './env';
const SB_URL = ENV.SB_URL;
const SB_KEY = ENV.SB_ANON_KEY;

async function signInAndInject(page: Page) {
  const email = process.env.OA_EMAIL;
  const pwd   = process.env.OA_PASSWORD;
  if (!email || !pwd) return; // skip — no credentials

  const api = await request.newContext();
  const res = await api.post(`${SB_URL}/auth/v1/token?grant_type=password`, {
    headers: { 'apikey': SB_KEY, 'Content-Type': 'application/json' },
    data: { email, password: pwd },
  });
  await api.dispose();
  if (!res.ok()) return;

  const session = await res.json();
  if (session.error) return;

  await page.evaluate((s: string) => {
    try { localStorage.setItem('oaHubSession', s); } catch {}
    location.reload();
  }, JSON.stringify(session));
}

export async function waitForHub(page: Page) {
  await page.goto('./');

  // If login screen appears despite storage state, re-inject session
  const loginVisible = await page.locator('#oaLoginScreen').isVisible({ timeout: 4000 }).catch(() => false);
  if (loginVisible) {
    console.warn('Login screen appeared — re-injecting session');
    await signInAndInject(page);
  }

  await expect(page.locator('.app')).toBeVisible({ timeout: 20000 });
  await expect(page.locator('nav.nav')).toBeVisible({ timeout: 10000 });
  // Robust boot check — wait for companies to load (avoids nav-status text race)
  await page.waitForFunction(
    () => (window as any)._oaState?.companies?.length > 0,
    undefined,
    { timeout: 45000, polling: 500 }
  );
}

export async function waitForHubWithRows(page: Page) {
  await waitForHub(page);
  await page.evaluate(() => {
    window.clearAI?.();
    window.setFilter?.('all', document.querySelector('#sbAll'));
  });
  await expect(page.locator('.c-row').first()).toBeVisible({ timeout: 20000 });
}
