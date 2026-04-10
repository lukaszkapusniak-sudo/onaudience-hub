/**
 * tests/env.ts — canonical source for all test keys & URLs
 *
 * Priority order (first defined wins):
 *   1. Process env vars  — set in CI via GitHub Secrets
 *   2. .env file values  — local development (loaded by dotenv)
 *   3. Inline defaults   — non-secret public values (SB_ANON, URLs)
 *
 * To rotate a key: update GitHub Secret + local .env
 * NEVER hardcode secrets elsewhere in test files — import from here.
 *
 * Usage:
 *   import { ENV } from './env';
 *   const res = await request.post(ENV.LEMLIST_PROXY, { ... });
 */

import dotenv from 'dotenv';
dotenv.config();

function required(name: string, fallback?: string): string {
  const v = process.env[name] || fallback;
  if (!v) throw new Error(`Missing required env var: ${name} — add it to .env or GitHub Secrets`);
  return v;
}

function optional(name: string, fallback = ''): string {
  return process.env[name] || fallback;
}

// ── Supabase ──────────────────────────────────────────────────────────────────
const SB_URL = optional(
  'SB_URL',
  'https://nyzkkqqjnkctcmxoirdj.supabase.co'
);

const SB_ANON_KEY = optional(
  'SB_ANON_KEY',
  // Public anon key — safe to have as fallback (no elevated privileges)
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55emtrcXFqbmtjdGNteG9pcmRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4NzMxMzYsImV4cCI6MjA4OTQ0OTEzNn0.jhAq_C68klOp4iTyj9HmsyyvoxsOI6ACld7t_87TAk0'
);

// ── Lemlist ───────────────────────────────────────────────────────────────────
// Rotate at: https://app.lemlist.com/settings/integrations
const LEMLIST_API_KEY = optional(
  'LEMLIST_API_KEY',
  // Temp key — override via .env or CI secret when rotating
  'f83f42f7fe5054879499222e393eba95'
);

// ── Auth (browser tests) ──────────────────────────────────────────────────────
const OA_EMAIL    = optional('OA_EMAIL',    'test@onaudience.internal');
const OA_PASSWORD = optional('OA_PASSWORD', '');

// ── Derived constants ─────────────────────────────────────────────────────────
export const ENV = {
  // Supabase
  SB_URL,
  SB_ANON_KEY,
  SB_HEADERS: {
    apikey:        SB_ANON_KEY,
    Authorization: `Bearer ${SB_ANON_KEY}`,
  } as Record<string, string>,

  // Edge functions
  LEMLIST_PROXY: `${SB_URL}/functions/v1/lemlist-proxy`,
  LEMLIST_SYNC:  `${SB_URL}/functions/v1/lemlist-sync`,
  CLAUDE_PROXY:  `${SB_URL}/functions/v1/claude-proxy`,

  // Auth
  LEMLIST_API_KEY,
  OA_EMAIL,
  OA_PASSWORD,

  // Well-known test fixtures (stable Lemlist campaign IDs)
  // These are archived/ended campaigns — safe to use as test seeds
  CAMPAIGNS: {
    ORACLE_B2B: 'cam_qCnf7FZ7cR4mn6tcr',         // "Oracle B2B data" — archived, 100 leads
  },

  // Hub URL
  HUB_URL: 'https://lukaszkapusniak-sudo.github.io/onaudience-hub/hub/',
} as const;

// ── Convenience helpers ───────────────────────────────────────────────────────

/** POST to lemlist-proxy with the configured API key */
export function llProxyRequest(path: string, method = 'GET', body: unknown = null) {
  return {
    data: { path, method, body, apiKey: ENV.LEMLIST_API_KEY },
    timeout: 30_000,
  };
}

/** GET from Supabase REST API */
export function sbGetRequest(table: string, qs = '') {
  return {
    headers: ENV.SB_HEADERS,
    timeout: 15_000,
    // The full URL is: ENV.SB_URL + '/rest/v1/' + table + '?' + qs
    _url: `${ENV.SB_URL}/rest/v1/${table}?${qs}&limit=50000`,
  };
}

/** True when running in CI (GitHub Actions) */
export const IS_CI = !!process.env.CI;

/** Skip a test with a message when a condition is met */
export function skipWhen(condition: boolean, reason: string) {
  if (condition) {
    console.warn(`[SKIP] ${reason}`);
  }
  return condition;
}
