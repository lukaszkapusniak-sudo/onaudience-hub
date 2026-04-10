import { getSupabaseApp } from './supabaseApp';

export const COMPANIES_PAGE_SIZE = 200;

/** First request matches `www/hub/db.js` `contacts.listAll` Range. */
export const CONTACTS_FIRST_RANGE_END = 4999;
/** Follow-up pages match `www/hub/api.js` `_loadAllContacts` (1000–1999, …). */
export const CONTACTS_PAGE_SIZE = 1000;

const ORDER =
  'icp.desc.nullslast,data_richness.desc,updated_at.desc.nullslast' as const;

const CONTACTS_ORDER = 'full_name.asc' as const;

export async function hubAuthHeaders(): Promise<HeadersInit> {
  const sb = getSupabaseApp();
  const key = import.meta.env.VITE_OA_SB_ANON_KEY;
  if (!sb) {
    return {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    };
  }
  const {
    data: { session },
  } = await sb.auth.getSession();
  const token = session?.access_token || key;
  return {
    apikey: key,
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

export type CompaniesFirstPageResult = {
  rows: unknown[];
  total: number;
};

/** First page of companies + total DB count (same query as `www/hub/db.js` + `api.js`). */
export async function fetchCompaniesFirstPage(): Promise<CompaniesFirstPageResult> {
  const base = import.meta.env.VITE_OA_SB_URL;
  if (!base) throw new Error('VITE_OA_SB_URL missing');
  const url = `${base}/rest/v1/companies?select=*&order=${ORDER}`;
  const res = await fetch(url, {
    headers: {
      ...(await hubAuthHeaders()),
      Range: '0-199',
      Prefer: 'count=exact',
    },
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`companies ${res.status}: ${t.slice(0, 200)}`);
  }
  const rows = await res.json();
  const cr = res.headers.get('content-range');
  const total = parseInt(cr?.split('/')[1] || '0', 10) || 0;
  return { rows: Array.isArray(rows) ? rows : [], total };
}

/**
 * One range slice of companies (same order as first page). Used for pages after 0–199.
 * Mirrors `www/hub/api.js` `_loadRemainingPages` fetch.
 */
export async function fetchCompaniesRange(start: number, end: number): Promise<unknown[]> {
  const base = import.meta.env.VITE_OA_SB_URL;
  if (!base) throw new Error('VITE_OA_SB_URL missing');
  const url = `${base}/rest/v1/companies?select=*&order=${ORDER}`;
  const res = await fetch(url, {
    headers: {
      ...(await hubAuthHeaders()),
      Range: `${start}-${end}`,
    },
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`companies ${res.status}: ${t.slice(0, 200)}`);
  }
  const rows = await res.json();
  return Array.isArray(rows) ? rows : [];
}

/* ── companies — `db.js` `companies.get` / `search` / `patch` / `upsert` (Phase 1.6) ── */

export async function fetchCompanyById(id: string): Promise<unknown | null> {
  const base = import.meta.env.VITE_OA_SB_URL;
  if (!base) throw new Error('VITE_OA_SB_URL missing');
  const url = `${base}/rest/v1/companies?id=eq.${encodeURIComponent(id)}&select=*`;
  const res = await fetch(url, { headers: await hubAuthHeaders() });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`companies get ${res.status}: ${t.slice(0, 200)}`);
  }
  const rows = await res.json();
  if (!Array.isArray(rows) || !rows.length) return null;
  return rows[0] ?? null;
}

export async function searchCompanies(
  q: string,
  cols = 'id,name,type,category,icp',
): Promise<unknown[]> {
  const base = import.meta.env.VITE_OA_SB_URL;
  if (!base) throw new Error('VITE_OA_SB_URL missing');
  const url = `${base}/rest/v1/companies?name=ilike.*${encodeURIComponent(q)}*&select=${cols}`;
  const res = await fetch(url, { headers: await hubAuthHeaders() });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`companies search ${res.status}: ${t.slice(0, 200)}`);
  }
  const rows = await res.json();
  return Array.isArray(rows) ? rows : [];
}

export async function patchCompany(id: string, body: Record<string, unknown>): Promise<void> {
  const base = import.meta.env.VITE_OA_SB_URL;
  if (!base) throw new Error('VITE_OA_SB_URL missing');
  const res = await fetch(`${base}/rest/v1/companies?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: {
      ...(await hubAuthHeaders()),
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`companies patch ${res.status}: ${t.slice(0, 120)}`);
  }
}

export async function patchCompanyByName(
  name: string,
  body: Record<string, unknown>,
): Promise<void> {
  const base = import.meta.env.VITE_OA_SB_URL;
  if (!base) throw new Error('VITE_OA_SB_URL missing');
  const res = await fetch(
    `${base}/rest/v1/companies?name=eq.${encodeURIComponent(name)}`,
    {
      method: 'PATCH',
      headers: {
        ...(await hubAuthHeaders()),
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(body),
    },
  );
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`companies patchByName ${res.status}: ${t.slice(0, 120)}`);
  }
}

export async function upsertCompany(row: Record<string, unknown>): Promise<void> {
  const base = import.meta.env.VITE_OA_SB_URL;
  if (!base) throw new Error('VITE_OA_SB_URL missing');
  const res = await fetch(`${base}/rest/v1/companies`, {
    method: 'POST',
    headers: {
      ...(await hubAuthHeaders()),
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(row),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`companies upsert ${res.status}: ${t.slice(0, 120)}`);
  }
}

export type ContactsFirstPageResult = {
  rows: unknown[];
  total: number;
  /** Next `Range` start (end of this response + 1); mirrors `api.js` cursor after first chunk. */
  nextOffset: number;
};

/** First chunk of contacts + total row count (same query as `db.js` + `api.js`). */
export async function fetchContactsFirstPage(): Promise<ContactsFirstPageResult> {
  const base = import.meta.env.VITE_OA_SB_URL;
  if (!base) throw new Error('VITE_OA_SB_URL missing');
  const url = `${base}/rest/v1/contacts?select=*&order=${CONTACTS_ORDER}`;
  const res = await fetch(url, {
    headers: {
      ...(await hubAuthHeaders()),
      Range: `0-${CONTACTS_FIRST_RANGE_END}`,
      Prefer: 'count=exact',
    },
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`contacts ${res.status}: ${t.slice(0, 200)}`);
  }
  const rows = await res.json();
  const rowArr = Array.isArray(rows) ? rows : [];
  const cr = res.headers.get('content-range');
  const totalPart = cr?.split('/')[1];
  let total =
    totalPart && totalPart !== '*' ? parseInt(totalPart, 10) || 0 : rowArr.length;
  if (!total && rowArr.length) total = rowArr.length;
  const rangeM = cr?.match(/(\d+)-(\d+)\//);
  const nextOffset = rangeM ? parseInt(rangeM[2], 10) + 1 : rowArr.length;
  return { rows: rowArr, total, nextOffset };
}

/** One range slice of contacts (same order as first page). */
export async function fetchContactsRange(start: number, end: number): Promise<unknown[]> {
  const base = import.meta.env.VITE_OA_SB_URL;
  if (!base) throw new Error('VITE_OA_SB_URL missing');
  const url = `${base}/rest/v1/contacts?select=*&order=${CONTACTS_ORDER}`;
  const res = await fetch(url, {
    headers: {
      ...(await hubAuthHeaders()),
      Range: `${start}-${end}`,
    },
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`contacts ${res.status}: ${t.slice(0, 200)}`);
  }
  const rows = await res.json();
  return Array.isArray(rows) ? rows : [];
}

/* ── contacts — `db.js` `byCompany` / `byCompanyName` / `byCompanyIds` (Phase 1.6) ── */

export async function fetchContactsByCompany(slug: string, name: string): Promise<unknown[]> {
  const base = import.meta.env.VITE_OA_SB_URL;
  if (!base) throw new Error('VITE_OA_SB_URL missing');
  const h = await hubAuthHeaders();
  const slugQ = `company_id=eq.${encodeURIComponent(slug)}`;
  const nameQ = `company_name=eq.${encodeURIComponent(name)}`;
  const [byIdRes, byNameRes] = await Promise.all([
    fetch(`${base}/rest/v1/contacts?${slugQ}&select=*&order=${CONTACTS_ORDER}`, {
      headers: h,
    }),
    fetch(`${base}/rest/v1/contacts?${nameQ}&select=*&order=${CONTACTS_ORDER}`, {
      headers: h,
    }),
  ]);
  const parse = async (res: Response): Promise<unknown[]> => {
    if (!res.ok) return [];
    const rows = await res.json();
    return Array.isArray(rows) ? rows : [];
  };
  const [byId, byName] = await Promise.all([parse(byIdRes), parse(byNameRes)]);
  const seen = new Set<string>();
  return [...byId, ...byName].filter((c) => {
    if (!c || typeof c !== 'object') return false;
    const row = c as Record<string, unknown>;
    const k = String(row.id ?? row.email ?? '');
    if (!k || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export async function fetchContactsByCompanyName(name: string): Promise<unknown[]> {
  const base = import.meta.env.VITE_OA_SB_URL;
  if (!base) throw new Error('VITE_OA_SB_URL missing');
  const url = `${base}/rest/v1/contacts?company_name=eq.${encodeURIComponent(name)}&select=*`;
  const res = await fetch(url, { headers: await hubAuthHeaders() });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`contacts byCompanyName ${res.status}: ${t.slice(0, 200)}`);
  }
  const rows = await res.json();
  return Array.isArray(rows) ? rows : [];
}

/** `company_id` values only — same as `db.js` `contacts.byCompanyIds`. */
export async function fetchContactsCompanyIdsOnly(ids: string[]): Promise<unknown[]> {
  if (!ids.length) return [];
  const base = import.meta.env.VITE_OA_SB_URL;
  if (!base) throw new Error('VITE_OA_SB_URL missing');
  const list = ids.map(encodeURIComponent).join(',');
  const url = `${base}/rest/v1/contacts?company_id=in.(${list})&select=company_id`;
  const res = await fetch(url, { headers: await hubAuthHeaders() });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`contacts byCompanyIds ${res.status}: ${t.slice(0, 200)}`);
  }
  const rows = await res.json();
  return Array.isArray(rows) ? rows : [];
}

export async function fetchAudiences(): Promise<unknown[]> {
  const base = import.meta.env.VITE_OA_SB_URL;
  const url = `${base}/rest/v1/audiences?select=*&order=updated_at.desc`;
  const res = await fetch(url, { headers: await hubAuthHeaders() });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`audiences ${res.status}: ${t.slice(0, 200)}`);
  }
  const rows = await res.json();
  return Array.isArray(rows) ? rows : [];
}

/* ── audiences — `db.js` `upsert` / `patch` / `delete` (Phase 1.6) ── */

export async function upsertAudience(row: Record<string, unknown>): Promise<unknown> {
  const base = import.meta.env.VITE_OA_SB_URL;
  if (!base) throw new Error('VITE_OA_SB_URL missing');
  const body = { ...row, updated_at: new Date().toISOString() };
  const res = await fetch(`${base}/rest/v1/audiences`, {
    method: 'POST',
    headers: {
      ...(await hubAuthHeaders()),
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=representation',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`audiences upsert ${res.status}: ${t.slice(0, 200)}`);
  }
  return res.json();
}

export async function patchAudience(id: string, body: Record<string, unknown>): Promise<void> {
  const base = import.meta.env.VITE_OA_SB_URL;
  if (!base) throw new Error('VITE_OA_SB_URL missing');
  const payload = { ...body, updated_at: new Date().toISOString() };
  const res = await fetch(`${base}/rest/v1/audiences?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: {
      ...(await hubAuthHeaders()),
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`audiences patch ${res.status}: ${t.slice(0, 120)}`);
  }
}

export async function deleteAudience(id: string): Promise<void> {
  const base = import.meta.env.VITE_OA_SB_URL;
  if (!base) throw new Error('VITE_OA_SB_URL missing');
  const res = await fetch(`${base}/rest/v1/audiences?id=eq.${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: await hubAuthHeaders(),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`audiences delete ${res.status}: ${t.slice(0, 120)}`);
  }
}

export async function upsertContact(row: Record<string, unknown>): Promise<void> {
  const base = import.meta.env.VITE_OA_SB_URL;
  const res = await fetch(`${base}/rest/v1/contacts`, {
    method: 'POST',
    headers: {
      ...(await hubAuthHeaders()),
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(row),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`contact upsert ${res.status}: ${t.slice(0, 120)}`);
  }
}

export async function patchContact(id: string, body: Record<string, unknown>): Promise<void> {
  const base = import.meta.env.VITE_OA_SB_URL;
  const res = await fetch(`${base}/rest/v1/contacts?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: {
      ...(await hubAuthHeaders()),
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`contact patch ${res.status}: ${t.slice(0, 120)}`);
  }
}

/** Full table read — same as `www/hub/db.js` `relations.listAll`. */
export async function fetchCompanyRelations(): Promise<unknown[]> {
  const base = import.meta.env.VITE_OA_SB_URL;
  if (!base) throw new Error('VITE_OA_SB_URL missing');
  const url = `${base}/rest/v1/company_relations?select=*`;
  const res = await fetch(url, { headers: await hubAuthHeaders() });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`company_relations ${res.status}: ${t.slice(0, 200)}`);
  }
  const rows = await res.json();
  return Array.isArray(rows) ? rows : [];
}

/**
 * Edges touching a company slug — same two-query merge + dedupe as `www/hub/db.js` `relations.byCompany`.
 */
export async function fetchCompanyRelationsForSlug(slug: string): Promise<unknown[]> {
  const base = import.meta.env.VITE_OA_SB_URL;
  if (!base) throw new Error('VITE_OA_SB_URL missing');
  const h = await hubAuthHeaders();
  const [fromRes, toRes] = await Promise.all([
    fetch(
      `${base}/rest/v1/company_relations?from_company=eq.${encodeURIComponent(slug)}&select=*`,
      { headers: h },
    ),
    fetch(
      `${base}/rest/v1/company_relations?to_company=eq.${encodeURIComponent(slug)}&select=*`,
      { headers: h },
    ),
  ]);
  const parse = async (res: Response): Promise<unknown[]> => {
    if (!res.ok) return [];
    const rows = await res.json();
    return Array.isArray(rows) ? rows : [];
  };
  const [from, to] = await Promise.all([parse(fromRes), parse(toRes)]);
  const seen = new Set<string>();
  return [...from, ...to].filter((r) => {
    if (!r || typeof r !== 'object') return false;
    const row = r as Record<string, unknown>;
    const k = `${row.from_company}|${row.to_company}|${row.relation_type}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export async function upsertCompanyRelation(row: Record<string, unknown>): Promise<void> {
  const base = import.meta.env.VITE_OA_SB_URL;
  if (!base) throw new Error('VITE_OA_SB_URL missing');
  const res = await fetch(`${base}/rest/v1/company_relations`, {
    method: 'POST',
    headers: {
      ...(await hubAuthHeaders()),
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(row),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`company_relations upsert ${res.status}: ${t.slice(0, 120)}`);
  }
}

/* ── intelligence — `www/hub/db.js` `intelligence.get` / `upsert` ── */

export async function fetchIntelligenceForCompany(
  companyId: string,
  type: string | null = null,
): Promise<unknown[]> {
  const base = import.meta.env.VITE_OA_SB_URL;
  if (!base) throw new Error('VITE_OA_SB_URL missing');
  const typeQ = type ? `&type=eq.${encodeURIComponent(type)}` : '';
  const url = `${base}/rest/v1/intelligence?company_id=eq.${encodeURIComponent(companyId)}${typeQ}&select=*`;
  const res = await fetch(url, { headers: await hubAuthHeaders() });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`intelligence ${res.status}: ${t.slice(0, 200)}`);
  }
  const rows = await res.json();
  return Array.isArray(rows) ? rows : [];
}

export async function upsertIntelligence(row: Record<string, unknown>): Promise<void> {
  const base = import.meta.env.VITE_OA_SB_URL;
  if (!base) throw new Error('VITE_OA_SB_URL missing');
  const res = await fetch(`${base}/rest/v1/intelligence`, {
    method: 'POST',
    headers: {
      ...(await hubAuthHeaders()),
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(row),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`intelligence upsert ${res.status}: ${t.slice(0, 120)}`);
  }
}

/* ── merge_suggestions — `www/hub/db.js` `mergeSuggestions` ── */

export async function fetchMergeSuggestionsPending(): Promise<unknown[]> {
  const base = import.meta.env.VITE_OA_SB_URL;
  if (!base) throw new Error('VITE_OA_SB_URL missing');
  const url = `${base}/rest/v1/merge_suggestions?status=eq.pending&select=id,company_a,company_b,similarity,reason`;
  const res = await fetch(url, { headers: await hubAuthHeaders() });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`merge_suggestions ${res.status}: ${t.slice(0, 200)}`);
  }
  const rows = await res.json();
  return Array.isArray(rows) ? rows : [];
}

export async function fetchMergeSuggestionsPendingCount(): Promise<number> {
  const base = import.meta.env.VITE_OA_SB_URL;
  if (!base) return 0;
  const url = `${base}/rest/v1/merge_suggestions?status=eq.pending&select=id`;
  const res = await fetch(url, {
    headers: {
      ...(await hubAuthHeaders()),
      Prefer: 'count=exact',
      Range: '0-0',
    },
  });
  if (!res.ok) return 0;
  const cr = res.headers.get('content-range');
  return parseInt(cr?.split('/')[1] || '0', 10) || 0;
}

export async function patchMergeSuggestion(
  id: string,
  body: Record<string, unknown>,
): Promise<void> {
  const base = import.meta.env.VITE_OA_SB_URL;
  if (!base) throw new Error('VITE_OA_SB_URL missing');
  const res = await fetch(
    `${base}/rest/v1/merge_suggestions?id=eq.${encodeURIComponent(id)}`,
    {
      method: 'PATCH',
      headers: {
        ...(await hubAuthHeaders()),
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(body),
    },
  );
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`merge_suggestions patch ${res.status}: ${t.slice(0, 120)}`);
  }
}

/* ── user_profiles — `www/hub/db.js` `userProfiles.get` ── */

export async function fetchUserProfile(userId: string): Promise<unknown | null> {
  const base = import.meta.env.VITE_OA_SB_URL;
  if (!base) throw new Error('VITE_OA_SB_URL missing');
  const url = `${base}/rest/v1/user_profiles?id=eq.${encodeURIComponent(userId)}&select=*`;
  const res = await fetch(url, { headers: await hubAuthHeaders() });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`user_profiles ${res.status}: ${t.slice(0, 200)}`);
  }
  const rows = await res.json();
  if (!Array.isArray(rows) || !rows.length) return null;
  return rows[0] ?? null;
}

/* ── enrich_cache — parity with `www/hub/api.js` cacheGet / cacheSet / cacheInvalidate / withCache ── */

/** Default TTL when `ttl_hours` missing on a row (matches `api.js`). */
export const ENRICH_CACHE_DEFAULT_TTL_HOURS = 168;

/** Suggested `source` keys + TTL hours (from `api.js` comment block; `intel_extraction` from `hub.js`). */
export const ENRICH_CACHE_TTL_HOURS = {
  contact_report: 168,
  web_research: 72,
  press_links: 336,
  tech_stack: 720,
  gmail_history: 24,
  outreach_angle: 336,
  intel_extraction: 336,
} as const;

/**
 * Returns parsed `data` if a row exists and is still within TTL, else `null`.
 * Mirrors `cacheGet(companyId, source)`.
 */
export async function enrichCacheGet(
  companyId: string,
  source: string,
): Promise<unknown | null> {
  const base = import.meta.env.VITE_OA_SB_URL;
  if (!base) return null;
  try {
    const url =
      `${base}/rest/v1/enrich_cache` +
      `?company_id=eq.${encodeURIComponent(companyId)}` +
      `&source=eq.${encodeURIComponent(source)}` +
      `&order=fetched_at.desc&limit=1`;
    const res = await fetch(url, { headers: await hubAuthHeaders() });
    if (!res.ok) return null;
    const rows: unknown = await res.json();
    if (!Array.isArray(rows) || !rows.length) return null;
    const row = rows[0] as Record<string, unknown>;
    const fetchedAt = row.fetched_at;
    if (typeof fetchedAt !== 'string') return null;
    const fetchedMs = new Date(fetchedAt).getTime();
    const ttlHoursRaw = row.ttl_hours;
    const ttlHours =
      typeof ttlHoursRaw === 'number' && Number.isFinite(ttlHoursRaw)
        ? ttlHoursRaw
        : ENRICH_CACHE_DEFAULT_TTL_HOURS;
    const ttlMs = ttlHours * 3600 * 1000;
    if (Date.now() > fetchedMs + ttlMs) return null;
    return row.data ?? null;
  } catch {
    return null;
  }
}

/**
 * DELETE existing `(company_id, source)` then POST upsert — mirrors `cacheSet`.
 * @returns whether the POST succeeded
 */
export async function enrichCacheSet(
  companyId: string,
  source: string,
  data: unknown,
  ttlHours: number = ENRICH_CACHE_DEFAULT_TTL_HOURS,
): Promise<boolean> {
  const base = import.meta.env.VITE_OA_SB_URL;
  if (!base) return false;
  try {
    await fetch(
      `${base}/rest/v1/enrich_cache?company_id=eq.${encodeURIComponent(companyId)}&source=eq.${encodeURIComponent(source)}`,
      { method: 'DELETE', headers: await hubAuthHeaders() },
    );
    const res = await fetch(`${base}/rest/v1/enrich_cache`, {
      method: 'POST',
      headers: {
        ...(await hubAuthHeaders()),
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify({
        company_id: companyId,
        source,
        data,
        ttl_hours: ttlHours,
        fetched_at: new Date().toISOString(),
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Mirrors `cacheInvalidate` — omit `source` to delete all cache rows for the company. */
export async function enrichCacheInvalidate(
  companyId: string,
  source: string | null = null,
): Promise<void> {
  const base = import.meta.env.VITE_OA_SB_URL;
  if (!base) return;
  try {
    let url = `${base}/rest/v1/enrich_cache?company_id=eq.${encodeURIComponent(companyId)}`;
    if (source) url += `&source=eq.${encodeURIComponent(source)}`;
    await fetch(url, { method: 'DELETE', headers: await hubAuthHeaders() });
  } catch {
    /* same as legacy: swallow */
  }
}

/** Mirrors `withCache`: return cached `data` or run `fn`, then store when result is not null/undefined. */
export async function withEnrichCache<T>(
  companyId: string,
  source: string,
  ttlHours: number,
  fn: () => Promise<T>,
): Promise<T> {
  const hit = await enrichCacheGet(companyId, source);
  if (hit !== null) return hit as T;
  const result = await fn();
  if (result !== null && result !== undefined) {
    await enrichCacheSet(companyId, source, result, ttlHours);
  }
  return result;
}

export async function fetchContactIdByEmail(email: string): Promise<string | null> {
  const base = import.meta.env.VITE_OA_SB_URL;
  const url = `${base}/rest/v1/contacts?email=eq.${encodeURIComponent(email)}&select=id&limit=1`;
  const res = await fetch(url, { headers: await hubAuthHeaders() });
  if (!res.ok) return null;
  const rows = await res.json();
  return rows?.[0]?.id ? String(rows[0].id) : null;
}

export async function postCompanyMerge(row: Record<string, unknown>): Promise<boolean> {
  const base = import.meta.env.VITE_OA_SB_URL;
  const res = await fetch(`${base}/rest/v1/companies`, {
    method: 'POST',
    headers: {
      ...(await hubAuthHeaders()),
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(row),
  });
  return res.ok;
}
