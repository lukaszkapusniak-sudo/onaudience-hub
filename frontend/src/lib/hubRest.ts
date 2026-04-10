import { getSupabaseApp } from './supabaseApp';

export const COMPANIES_PAGE_SIZE = 200;

const ORDER =
  'icp.desc.nullslast,data_richness.desc,updated_at.desc.nullslast' as const;

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

/** Contacts bulk (matches legacy first chunk; extend later for pagination). */
export async function fetchContactsBulk(): Promise<unknown[]> {
  const base = import.meta.env.VITE_OA_SB_URL;
  if (!base) throw new Error('VITE_OA_SB_URL missing');
  const url = `${base}/rest/v1/contacts?select=*&order=full_name.asc`;
  const res = await fetch(url, {
    headers: {
      ...(await hubAuthHeaders()),
      Range: '0-4999',
    },
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`contacts ${res.status}: ${t.slice(0, 200)}`);
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
