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

function optional(name: string, fallback = ''): string {
  return process.env[name] || fallback;
}

// ── Supabase ──────────────────────────────────────────────────────────────────
const SB_URL = optional('SB_URL', 'https://nyzkkqqjnkctcmxoirdj.supabase.co');

// Public anon key — no admin privileges, safe to commit to .env.example
// Inline fallback kept so tests work without any .env setup (read-only access only)
const SB_ANON_KEY = optional(
  'SB_ANON_KEY',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55emtrcXFqbmtjdGNteG9pcmRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4NzMxMzYsImV4cCI6MjA4OTQ0OTEzNn0.jhAq_C68klOp4iTyj9HmsyyvoxsOI6ACld7t_87TAk0',
);

// ── Lemlist ───────────────────────────────────────────────────────────────────
// Rotate at: https://app.lemlist.com/settings/integrations → API
// Set LEMLIST_API_KEY in .env locally and in GitHub Secrets for CI
// Inline default is temp — will break when key is rotated in production
const LEMLIST_API_KEY = optional(
  'LEMLIST_API_KEY',
  'f83f42f7fe5054879499222e393eba95', // ← rotate this: update .env + GitHub Secret
);

// ── Anthropic ─────────────────────────────────────────────────────────────────
// Required for AI/Vibe integration tests
// Get from: https://console.anthropic.com/settings/keys
const ANTHROPIC_API_KEY = optional('ANTHROPIC_API_KEY', '');

// ── Auth (browser tests) ──────────────────────────────────────────────────────
// Set in .env locally and as GitHub Secrets OA_EMAIL / OA_PASSWORD for CI
// If absent: auth.setup.ts skips gracefully, browser tests are skipped
const OA_EMAIL = optional('OA_EMAIL', '');
const OA_PASSWORD = optional('OA_PASSWORD', '');

// ── Derived constants ─────────────────────────────────────────────────────────
export const ENV = {
  // Supabase
  SB_URL,
  SB_ANON_KEY,
  SB_HEADERS: {
    apikey: SB_ANON_KEY,
    Authorization: `Bearer ${SB_ANON_KEY}`,
  } as Record<string, string>,

  // Edge functions
  LEMLIST_PROXY: `${SB_URL}/functions/v1/lemlist-proxy`,
  LEMLIST_SYNC: `${SB_URL}/functions/v1/lemlist-sync`,
  CLAUDE_PROXY: `${SB_URL}/functions/v1/claude-proxy`,

  // Auth
  LEMLIST_API_KEY,
  ANTHROPIC_API_KEY,
  OA_EMAIL,
  OA_PASSWORD,
  // Computed: true when all browser-test credentials are present
  HAS_AUTH: !!(optional('OA_EMAIL', '') && optional('OA_PASSWORD', '')),
  HAS_LEMLIST: !!optional('LEMLIST_API_KEY', 'f83f42f7fe5054879499222e393eba95'),

  // Well-known test fixtures (stable Lemlist campaign IDs)
  // These are archived/ended campaigns — safe to use as test seeds
  CAMPAIGNS: {
    ORACLE_B2B: 'cam_qCnf7FZ7cR4mn6tcr', // "Oracle B2B data" — archived, 100 leads
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
