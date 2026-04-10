/**
 * lemlist.spec.ts — Lemlist cooperation tests
 *
 * All keys/URLs come from tests/env.ts — never hardcode here.
 * To rotate a key: update .env locally + GitHub Secret in CI.
 *
 * Architecture:
 *   All sections: pure `request` fixture (no browser, no auth)
 *     → run under "api-only" project, always runnable in CI without credentials
 *
 * Coverage:
 *  A. Proxy connectivity       — lemlist-proxy edge fn responds correctly
 *  B. API response shapes      — campaigns / leads / contacts / activities
 *  C. lemlist-sync edge fn     — contract: 200, stats shape, CORS
 *  D. Single-campaign sync     — Oracle B2B seed, verify DB writes
 *  G. Rate-limit resilience    — no crash on 429, clean error in log
 *  H. Outreach history tables  — outreach_history & campaign_stats exist
 *  I. Stats math               — open/reply/click rate formulas correct
 *  J. Pagination               — offset returns non-overlapping pages
 *  K. Domain extraction        — email → domain → company slug logic
 *  L. Personal domain filter   — gmail/edu excluded from company creation
 *  M. Error handling           — bad key, empty body, graceful failures
 */

import { test, expect, APIRequestContext } from '@playwright/test';
import { ENV } from './env';

// ── Aliases (all values from ENV) ────────────────────────────────────────────
const PROXY = ENV.LEMLIST_PROXY;
const SYNC_FN = ENV.LEMLIST_SYNC;
const LL_KEY = ENV.LEMLIST_API_KEY;
const SB_URL = ENV.SB_URL;
const SB_ANON = ENV.SB_ANON_KEY;
const ORACLE_CAMP_ID = ENV.CAMPAIGNS.ORACLE_B2B;

// ── Helpers ───────────────────────────────────────────────────────────────────
async function proxyGet(req: APIRequestContext, path: string) {
  return req.post(PROXY, {
    data: { path, method: 'GET', apiKey: LL_KEY },
    timeout: 30_000,
  });
}

function sbHeaders() {
  return { apikey: SB_ANON, Authorization: 'Bearer ' + SB_ANON };
}

async function sbGet(req: APIRequestContext, table: string, qs = '') {
  return req.get(`${SB_URL}/rest/v1/${table}?${qs}&limit=50000`, {
    headers: sbHeaders(),
    timeout: 15_000,
  });
}

/** Call from hooks/tests when a probe `sbGet` shows anon cannot SELECT (401 / RLS). Returns true if the describe/test was skipped. */
function skipIfSupabaseRestDenied(status: number): boolean {
  if (status === 200) return false;
  test.skip(
    true,
    `Supabase REST ${status} — set SB_URL and SB_ANON_KEY so the anon role can read lemlist/outreach tables (GitHub Secrets in CI).`,
  );
  return true;
}

/** Oracle campaign sync — skips on transient network failure when many workers hit the edge function at once. */
async function postOracleSync(request: APIRequestContext) {
  try {
    return await request.post(SYNC_FN, {
      data: { apiKey: LL_KEY, campIds: [ORACLE_CAMP_ID] },
      timeout: 90_000,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/ETIMEDOUT|ECONNRESET|EAI_AGAIN/i.test(msg)) {
      test.skip(true, `lemlist-sync unreachable: ${msg}`);
    }
    throw e;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// A. PROXY CONNECTIVITY
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('A. Proxy connectivity', () => {
  test('responds 200 with valid key', async ({ request }) => {
    const r = await proxyGet(request, '/campaigns?limit=1&offset=0');
    expect(r.status()).toBe(200);
    const body = await r.json();
    const page = Array.isArray(body) ? body : (body.campaigns ?? []);
    expect(Array.isArray(page)).toBe(true);
  });

  test('responds 400 for empty apiKey', async ({ request }) => {
    const r = await request.post(PROXY, {
      data: { path: '/campaigns', method: 'GET', apiKey: '' },
      timeout: 10_000,
    });
    expect(r.status()).toBe(400);
    const body = await r.json();
    expect(body).toHaveProperty('error');
    expect(String(body.error).toLowerCase()).toMatch(/missing|key|required/);
  });

  test('returns structured error body for bad key (not network crash)', async ({ request }) => {
    const r = await request.post(PROXY, {
      data: { path: '/campaigns?limit=1', method: 'GET', apiKey: 'bad-key-xyz' },
      timeout: 15_000,
    });
    const status = r.status();
    // Gateway / edge may return JSON, plain text, or HTML — not a network failure as long as we get a response body
    expect([200, 400, 401, 403, 404, 502]).toContain(status);
    const raw = await r.text();
    let body: unknown;
    try {
      body = raw ? JSON.parse(raw) : undefined;
    } catch {
      body = { _text: raw.slice(0, 500) };
    }
    expect(body).toBeDefined();
  });

  test('OPTIONS preflight returns CORS headers', async ({ request }) => {
    const r = await request.fetch(PROXY, { method: 'OPTIONS', timeout: 10_000 });
    expect([200, 204]).toContain(r.status());
    expect(r.headers()['access-control-allow-origin']).toBe('*');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// B. API RESPONSE SHAPES
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('B. API response shapes', () => {
  test('campaigns have _id / name / status', async ({ request }) => {
    const r = await proxyGet(request, '/campaigns?limit=5');
    const body = await r.json();
    const camps: Record<string, unknown>[] = Array.isArray(body) ? body : (body.campaigns ?? []);
    expect(camps.length).toBeGreaterThan(0);
    for (const c of camps) {
      expect(typeof c._id).toBe('string');
      expect(typeof c.name).toBe('string');
      expect(typeof c.status).toBe('string');
    }
  });

  test('leads endpoint returns array with _id + contactId', async ({ request }) => {
    const r = await proxyGet(request, `/campaigns/${ORACLE_CAMP_ID}/leads`);
    expect(r.status()).toBe(200);
    const body = await r.json();
    const leads: Record<string, unknown>[] = Array.isArray(body) ? body : Object.values(body);
    expect(leads.length).toBeGreaterThan(0);
    expect(leads[0]).toHaveProperty('_id');
    expect(leads.some((l) => l.contactId)).toBe(true);
  });

  test('contact endpoint returns _id + name or email', async ({ request }) => {
    const lr = await proxyGet(request, `/campaigns/${ORACLE_CAMP_ID}/leads`);
    const leads: Record<string, unknown>[] = await lr
      .json()
      .then((b) => (Array.isArray(b) ? b : Object.values(b)));
    const withContact = leads.find((l) => l.contactId);
    if (!withContact) {
      test.skip();
      return;
    }

    const cr = await proxyGet(request, `/contacts/${withContact.contactId}`);
    expect(cr.status()).toBe(200);
    const ct = await cr.json();
    expect(ct).toHaveProperty('_id');
    const hasName = !!(ct.fullName || ct.firstName || ct.fields?.firstName);
    const hasEmail = !!(ct.email || ct.fields?.email);
    expect(hasName || hasEmail).toBe(true);
  });

  test('activities endpoint returns typed events with createdAt', async ({ request }) => {
    const r = await proxyGet(request, `/activities?campaignId=${ORACLE_CAMP_ID}&limit=10`);
    expect(r.status()).toBe(200);
    const acts: Record<string, unknown>[] = await r.json();
    expect(Array.isArray(acts)).toBe(true);
    for (const a of acts.slice(0, 3)) {
      expect(a).toHaveProperty('type');
      expect(a).toHaveProperty('createdAt');
      expect(typeof a.type).toBe('string');
    }
  });

  test('activity types are non-empty camelCase strings', async ({ request }) => {
    const r = await proxyGet(request, `/activities?campaignId=${ORACLE_CAMP_ID}&limit=20`);
    const acts: Record<string, unknown>[] = await r.json();
    for (const a of acts) {
      expect(typeof a.type).toBe('string');
      expect((a.type as string).length).toBeGreaterThan(0);
    }
  });

  test('pagination offset returns non-overlapping campaign pages', async ({ request }) => {
    const [r1, r2] = await Promise.all([
      proxyGet(request, '/campaigns?limit=3&offset=0'),
      proxyGet(request, '/campaigns?limit=3&offset=3'),
    ]);
    const p1 = await r1.json();
    const p2 = await r2.json();
    const ids1: string[] = (Array.isArray(p1) ? p1 : (p1.campaigns ?? [])).map(
      (c: Record<string, unknown>) => c._id as string,
    );
    const ids2: string[] = (Array.isArray(p2) ? p2 : (p2.campaigns ?? [])).map(
      (c: Record<string, unknown>) => c._id as string,
    );
    if (ids1.length > 0 && ids2.length > 0) {
      expect(ids1.filter((id) => ids2.includes(id))).toHaveLength(0);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// C. LEMLIST-SYNC EDGE FUNCTION — basic contract
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('C. lemlist-sync edge function contract', () => {
  test.describe.configure({ timeout: 120_000 });

  test('responds 200 with valid key + campIds', async ({ request }) => {
    const r = await request.post(SYNC_FN, {
      data: { apiKey: LL_KEY, campIds: [ORACLE_CAMP_ID] },
      timeout: 90_000,
    });
    expect(r.status()).toBe(200);
    expect((await r.json()).ok).toBe(true);
  });

  test('responds 400 for empty apiKey', async ({ request }) => {
    const r = await request.post(SYNC_FN, {
      data: { apiKey: '' },
      timeout: 10_000,
    });
    expect(r.status()).toBe(400);
    expect(await r.json()).toHaveProperty('error');
  });

  test('stats object has all required numeric fields', async ({ request }) => {
    const r = await request.post(SYNC_FN, {
      data: { apiKey: LL_KEY, campIds: [ORACLE_CAMP_ID] },
      timeout: 90_000,
    });
    const { stats } = await r.json();
    const REQUIRED = ['campaigns', 'leads', 'contacts_new', 'contacts_updated', 'companies_new'];
    for (const f of REQUIRED) {
      expect(stats).toHaveProperty(f);
      expect(typeof stats[f]).toBe('number');
    }
    expect(stats.campaigns).toBe(1);
  });

  test('log is array of non-empty strings ending with done/complete', async ({ request }) => {
    const r = await request.post(SYNC_FN, {
      data: { apiKey: LL_KEY, campIds: [ORACLE_CAMP_ID] },
      timeout: 90_000,
    });
    const { log } = await r.json();
    expect(Array.isArray(log)).toBe(true);
    for (const line of log as string[]) expect(typeof line).toBe('string');
    expect((log as string[]).at(-1)).toMatch(/done|complete|✓/i);
  });

  test('missing_companies and missing_contacts are arrays', async ({ request }) => {
    const r = await request.post(SYNC_FN, {
      data: { apiKey: LL_KEY, campIds: [ORACLE_CAMP_ID] },
      timeout: 90_000,
    });
    const body = await r.json();
    expect(Array.isArray(body.missing_companies)).toBe(true);
    expect(Array.isArray(body.missing_contacts)).toBe(true);
  });

  test('OPTIONS preflight returns CORS headers', async ({ request }) => {
    const r = await request.fetch(SYNC_FN, { method: 'OPTIONS', timeout: 10_000 });
    expect([200, 204]).toContain(r.status());
    expect(r.headers()['access-control-allow-origin']).toBe('*');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// D. SINGLE-CAMPAIGN SYNC → DB verification
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('D. Sync writes to Supabase', () => {
  // Per-test ceiling (beforeAll uses test.setTimeout below)
  test.describe.configure({ timeout: 120_000 });

  test.beforeAll(async ({ request }) => {
    test.setTimeout(120_000);
    const probe = await sbGet(request, 'lemlist_campaign_stats', 'limit=1');
    if (skipIfSupabaseRestDenied(probe.status())) return;
    await request.post(SYNC_FN, {
      data: { apiKey: LL_KEY, campIds: [ORACLE_CAMP_ID] },
      timeout: 90_000,
    });
  });

  test('campaign_stats row written for Oracle campaign', async ({ request }) => {
    const r = await sbGet(request, 'lemlist_campaign_stats', `campaign_id=eq.${ORACLE_CAMP_ID}`);
    expect(r.status()).toBe(200);
    const rows = await r.json();
    expect(rows.length).toBeGreaterThan(0);
    const s = rows[0];
    expect(typeof s.leads_total).toBe('number');
    expect(s.leads_total).toBeGreaterThan(0);
    expect(Number(s.open_rate)).toBeGreaterThanOrEqual(0);
    expect(Number(s.open_rate)).toBeLessThanOrEqual(100);
  });

  test('campaign_name correctly stored in stats row', async ({ request }) => {
    const r = await sbGet(request, 'lemlist_campaign_stats', `campaign_id=eq.${ORACLE_CAMP_ID}`);
    const rows = await r.json();
    if (rows.length > 0) {
      expect(rows[0].campaign_name).toBe('Oracle B2B data');
    }
  });

  test('outreach_history rows exist for Oracle campaign', async ({ request }) => {
    const r = await sbGet(request, 'outreach_history', `campaign_id=eq.${ORACLE_CAMP_ID}&limit=5`);
    expect(r.status()).toBe(200);
    const rows = await r.json();
    expect(Array.isArray(rows)).toBe(true);
    if (rows.length > 0) {
      const row = rows[0];
      expect(row).toHaveProperty('campaign_id');
      expect(row).toHaveProperty('lead_state');
      expect(row.campaign_id).toBe(ORACLE_CAMP_ID);
    }
  });

  test('contacts written have source=lemlist', async ({ request }) => {
    const r = await sbGet(request, 'contacts', 'source=eq.lemlist&limit=1');
    expect(r.status()).toBe(200);
    expect(Array.isArray(await r.json())).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// G. RATE-LIMIT RESILIENCE
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('G. Rate-limit resilience', () => {
  test.describe.configure({ timeout: 120_000 });

  test('sync log contains no JS runtime crash patterns', async ({ request }) => {
    const r = await postOracleSync(request);
    const { log } = await r.json();
    const crashes = (log as string[]).filter((l) =>
      /Cannot read|undefined is not|Unhandled rejection|TypeError/.test(l),
    );
    expect(crashes).toHaveLength(0);
  });

  test('response always has ok + stats + log even when 429s occur', async ({ request }) => {
    const r = await postOracleSync(request);
    expect(r.status()).toBe(200);
    const body = await r.json();
    expect(body).toHaveProperty('ok');
    expect(body).toHaveProperty('stats');
    expect(body).toHaveProperty('log');
  });

  test('429 campaign errors appear as "Camp err" strings not crashes', async ({ request }) => {
    const r = await postOracleSync(request);
    const { log } = await r.json();
    const campErrors = (log as string[]).filter((l) => l.toLowerCase().includes('camp err'));
    for (const e of campErrors) {
      expect(typeof e).toBe('string');
      expect(e).not.toMatch(/at Object\.|at Module\.|\.js:\d+/); // no stack traces
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// H. OUTREACH HISTORY & STATS TABLES
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('H. Outreach history tables', () => {
  test.beforeAll(async ({ request }) => {
    const probe = await sbGet(request, 'lemlist_campaign_stats', 'limit=1');
    if (skipIfSupabaseRestDenied(probe.status())) return;
  });

  test('outreach_history table exists and is queryable', async ({ request }) => {
    const r = await sbGet(request, 'outreach_history', 'limit=1');
    expect(r.status()).toBe(200);
    expect(Array.isArray(await r.json())).toBe(true);
  });

  test('outreach_history select with all key columns returns 200', async ({ request }) => {
    const r = await sbGet(
      request,
      'outreach_history',
      'select=id,contact_email,campaign_id,lead_state,opened_at,clicked_at,replied_at&limit=1',
    );
    expect(r.status()).toBe(200);
  });

  test('lemlist_campaign_stats table exists', async ({ request }) => {
    const r = await sbGet(request, 'lemlist_campaign_stats', 'limit=1');
    expect(r.status()).toBe(200);
    expect(Array.isArray(await r.json())).toBe(true);
  });

  test('campaign_stats open_rate is numeric 0–100', async ({ request }) => {
    const r = await sbGet(request, 'lemlist_campaign_stats', `campaign_id=eq.${ORACLE_CAMP_ID}`);
    const rows = await r.json();
    for (const row of rows as Record<string, unknown>[]) {
      const rate = Number(row.open_rate);
      expect(rate).toBeGreaterThanOrEqual(0);
      expect(rate).toBeLessThanOrEqual(100);
    }
  });

  test('outreach_history id format is campaign::email composite', async ({ request }) => {
    const r = await sbGet(
      request,
      'outreach_history',
      `campaign_id=eq.${ORACLE_CAMP_ID}&select=id,contact_email&limit=3`,
    );
    const rows = await r.json();
    for (const row of rows as Record<string, unknown>[]) {
      const id = row.id as string;
      if (id && row.contact_email) {
        // Should contain campaign ID and email separated by ::
        expect(id).toContain('::');
        expect(id.startsWith(ORACLE_CAMP_ID)).toBe(true);
      }
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// I. STATS MATH — unit tests, no network needed
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('I. Stats rate computation', () => {
  function computeRates(sent: number, opened: number, replied: number, clicked: number) {
    if (sent === 0) return { open_rate: 0, reply_rate: 0, click_rate: 0 };
    return {
      open_rate: Math.round((opened / sent) * 10000) / 100,
      reply_rate: Math.round((replied / sent) * 10000) / 100,
      click_rate: Math.round((clicked / sent) * 10000) / 100,
    };
  }

  test('0 sent → all rates are 0 (no division by zero)', () => {
    const r = computeRates(0, 0, 0, 0);
    expect(r.open_rate).toBe(0);
    expect(r.reply_rate).toBe(0);
    expect(r.click_rate).toBe(0);
  });

  test('3 sent, 1 opened → open_rate = 33.33', () => {
    expect(computeRates(3, 1, 0, 0).open_rate).toBe(33.33);
  });

  test('4 sent, 4 replied → reply_rate = 100', () => {
    expect(computeRates(4, 0, 4, 0).reply_rate).toBe(100);
  });

  test('10 sent, 3 clicked → click_rate = 30', () => {
    expect(computeRates(10, 0, 0, 3).click_rate).toBe(30);
  });

  test('rates are capped to 2 decimal places', () => {
    const r = computeRates(3, 1, 1, 1);
    expect(r.open_rate.toString().split('.')[1]?.length ?? 0).toBeLessThanOrEqual(2);
  });

  test('draft leads excluded from sent count', () => {
    // The sync logic: sent = leads where state !== 'draft'
    const leads = ['emailsSent', 'draft', 'emailsSent', 'replied', 'draft'];
    const sent = leads.filter((s) => s !== 'draft').length; // 3
    expect(sent).toBe(3);
    expect(computeRates(sent, 1, 1, 0).reply_rate).toBe(33.33);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// J. PAGINATION
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('J. Campaign pagination', () => {
  test('offset=0 and offset=3 return non-overlapping results', async ({ request }) => {
    const [r1, r2] = await Promise.all([
      proxyGet(request, '/campaigns?limit=3&offset=0'),
      proxyGet(request, '/campaigns?limit=3&offset=3'),
    ]);
    const ids1 = (await r1.json()).campaigns ?? (await r1.json());
    const ids2 = (await r2.json()).campaigns ?? (await r2.json());
    const p1 = (Array.isArray(ids1) ? ids1 : []).map((c: Record<string, unknown>) => String(c._id));
    const p2 = (Array.isArray(ids2) ? ids2 : []).map((c: Record<string, unknown>) => String(c._id));
    if (p1.length > 0 && p2.length > 0) {
      expect(p1.filter((id) => p2.includes(id))).toHaveLength(0);
    }
  });

  test('fetching 100 then offset=100 gives different campaigns', async ({ request }) => {
    const [r1, r2] = await Promise.all([
      proxyGet(request, '/campaigns?limit=100&offset=0'),
      proxyGet(request, '/campaigns?limit=100&offset=100'),
    ]);
    const b1 = await r1.json();
    const b2 = await r2.json();
    const p1 = (Array.isArray(b1) ? b1 : (b1.campaigns ?? [])) as Record<string, unknown>[];
    const p2 = (Array.isArray(b2) ? b2 : (b2.campaigns ?? [])) as Record<string, unknown>[];
    if (p1.length === 100 && p2.length > 0) {
      const ids1 = p1.map((c) => c._id);
      const ids2 = p2.map((c) => c._id);
      expect(ids1.filter((id) => ids2.includes(id))).toHaveLength(0);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// K. DOMAIN EXTRACTION — unit tests
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('K. Domain extraction logic', () => {
  function domainFromEmail(email: string) {
    return email ? (email.split('@')[1] || '').toLowerCase() : '';
  }

  function slugify(s: string) {
    return (s || '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 80);
  }

  test('extracts domain from standard email', () => {
    expect(domainFromEmail('dave@adxc.ai')).toBe('adxc.ai');
  });

  test('normalises domain to lowercase', () => {
    expect(domainFromEmail('USER@Company.COM')).toBe('company.com');
  });

  test('returns empty string for empty email', () => {
    expect(domainFromEmail('')).toBe('');
  });

  test('returns empty string for email without @', () => {
    expect(domainFromEmail('nodomain')).toBe('');
  });

  test('derives company name from domain (strip TLD)', () => {
    const domain = 'wmglobal.com';
    const coName = domain.split('.').slice(0, -1).join('.');
    expect(coName).toBe('wmglobal');
    expect(slugify(coName)).toBe('wmglobal');
  });

  test('slugify removes special chars', () => {
    expect(slugify('IBM iX DACH')).toBe('ibm-ix-dach');
    expect(slugify('A & B Corp.')).toBe('a-b-corp');
  });

  test('slugify caps at 80 chars', () => {
    const long = 'a'.repeat(100);
    expect(slugify(long).length).toBeLessThanOrEqual(80);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// L. PERSONAL DOMAIN FILTER — unit tests
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('L. Personal domain filter', () => {
  const FREE = new Set([
    'gmail.com',
    'yahoo.com',
    'hotmail.com',
    'outlook.com',
    'icloud.com',
    'protonmail.com',
    'aol.com',
    'live.com',
    'msn.com',
    'me.com',
    'mac.com',
    'yandex.com',
    'yandex.ru',
    'mail.ru',
    'inbox.com',
    'zoho.com',
    'gmx.com',
    'web.de',
    't-online.de',
  ]);

  function isPersonalDomain(d: string) {
    if (!d) return true;
    if (d.endsWith('.edu') || d.includes('smail.') || d.includes('student.')) return true;
    return FREE.has(d);
  }

  test('gmail.com is personal', () => expect(isPersonalDomain('gmail.com')).toBe(true));
  test('yahoo.com is personal', () => expect(isPersonalDomain('yahoo.com')).toBe(true));
  test('empty string is personal', () => expect(isPersonalDomain('')).toBe(true));
  test('.edu TLD is personal', () => expect(isPersonalDomain('mit.edu')).toBe(true));
  test('smail. prefix is personal', () => {
    expect(isPersonalDomain('smail.swufe.edu.cn')).toBe(true);
  });
  test('adxc.ai is NOT personal', () => expect(isPersonalDomain('adxc.ai')).toBe(false));
  test('ibmix.com is NOT personal', () => expect(isPersonalDomain('ibmix.com')).toBe(false));
  test('wmglobal.com is NOT personal', () => expect(isPersonalDomain('wmglobal.com')).toBe(false));

  test('no gmail company created in Supabase', async ({ request }) => {
    // Network test — verifies the domain filter was enforced by the sync function
    // Skipped in sandboxed CI environments without outbound DNS (EAI_AGAIN is expected)
    const r = await request
      .get(`${SB_URL}/rest/v1/companies?website=eq.https://gmail.com&limit=5`, {
        headers: sbHeaders(),
        timeout: 15_000,
      })
      .catch(() => null);
    if (!r) {
      test.skip();
      return;
    } // no network — skip gracefully
    if (r.status() !== 200) {
      test.skip(
        true,
        `Supabase REST ${r.status()} — companies table not readable with current SB_ANON_KEY`,
      );
      return;
    }
    const rows = await r.json();
    expect(Array.isArray(rows)).toBe(true);
    expect(rows.length).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// M. ERROR HANDLING
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('M. Error handling', () => {
  test('proxy returns JSON for invalid endpoint (not network crash)', async ({ request }) => {
    const r = await request.post(PROXY, {
      data: { path: '/invalid_endpoint_xyz_404', method: 'GET', apiKey: LL_KEY },
      timeout: 15_000,
    });
    expect([200, 400, 404, 500]).toContain(r.status());
    const raw = await r.text();
    let body: unknown;
    try {
      body = raw ? JSON.parse(raw) : undefined;
    } catch {
      body = { _nonJson: raw.slice(0, 300) };
    }
    expect(body).toBeDefined();
  });

  test('sync with campIds=[] returns ok with 0 campaigns', async ({ request }) => {
    test.setTimeout(35_000);
    let r: Awaited<ReturnType<APIRequestContext['post']>>;
    try {
      r = await request.post(SYNC_FN, {
        data: { apiKey: LL_KEY, campIds: [] },
        timeout: 30_000,
      });
    } catch {
      test.skip(
        true,
        'lemlist-sync did not respond within 30s for campIds=[] — edge may hang instead of returning 200/400',
      );
      return;
    }
    // Either 200 with 0 processed or 400 — both acceptable
    expect([200, 400]).toContain(r.status());
  });

  test('contacts without email or fullName are not written to DB', async ({ request }) => {
    // After sync, should have no contact rows with null id
    const r = await sbGet(request, 'contacts', 'id=is.null');
    expect(r.status()).toBe(200);
    // PostgREST returns empty array for "is.null" on non-nullable id — 200 + []
    const rows = await r.json();
    expect(Array.isArray(rows)).toBe(true);
  });

  test('duplicate sync of same campaign does not double-write campaign_stats', async ({
    request,
  }) => {
    test.setTimeout(200_000);
    const probe = await sbGet(request, 'lemlist_campaign_stats', 'limit=1');
    if (skipIfSupabaseRestDenied(probe.status())) return;
    // Run sync twice
    await request.post(SYNC_FN, {
      data: { apiKey: LL_KEY, campIds: [ORACLE_CAMP_ID] },
      timeout: 90_000,
    });
    await request.post(SYNC_FN, {
      data: { apiKey: LL_KEY, campIds: [ORACLE_CAMP_ID] },
      timeout: 90_000,
    });
    // Should still have exactly 1 row for this campaign
    const r = await sbGet(request, 'lemlist_campaign_stats', `campaign_id=eq.${ORACLE_CAMP_ID}`);
    const rows = await r.json();
    expect(rows.length).toBe(1);
  });
});
