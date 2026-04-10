/* ═══ db.js — Supabase data access layer ═══
   All SB_URL/rest/v1 calls centralised here.
   Consistent auth headers, error handling, Prefer headers.
   ══════════════════════════════════════════════════════════════ */

import { SB_URL } from './config.js?v=__OA_ASSET_VERSION__';
import { authHdr } from './utils.js?v=__OA_ASSET_VERSION__';

const UPSERT = { Prefer: 'resolution=merge-duplicates,return=minimal' };
const REPR = { Prefer: 'resolution=merge-duplicates,return=representation' };

async function _req(method, path, body, extraHdr = {}) {
  const res = await fetch(`${SB_URL}/rest/v1/${path}`, {
    method,
    headers: authHdr({ ...extraHdr }),
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.status);
    throw new Error(`DB ${method} ${path}: ${text}`);
  }
  const ct = res.headers.get('content-type') || '';
  return ct.includes('json') ? res.json() : null;
}

/* ── Companies ─────────────────────────────────────────────────── */
export const companies = {
  list: (
    range = '0-199',
    order = 'icp.desc.nullslast,data_richness.desc,updated_at.desc.nullslast',
  ) =>
    _req('GET', `companies?select=*&order=${order}`, null, { Range: range, Prefer: 'count=exact' }),
  get: (id) => _req('GET', `companies?id=eq.${encodeURIComponent(id)}&select=*`),
  search: (q, cols = 'id,name,type,category,icp') =>
    _req('GET', `companies?name=ilike.*${encodeURIComponent(q)}*&select=${cols}`),
  upsert: (row) => _req('POST', 'companies', row, UPSERT),
  patch: (id, fld) => _req('PATCH', `companies?id=eq.${encodeURIComponent(id)}`, fld),
  patchByName: (name, fld) => _req('PATCH', `companies?name=eq.${encodeURIComponent(name)}`, fld),
};

/* ── Contacts ──────────────────────────────────────────────────── */
export const contacts = {
  listAll: () => _req('GET', 'contacts?select=*&order=full_name.asc', null, { Range: '0-4999' }),
  byCompany: (slug, name) => {
    const slugQ = `company_id=eq.${encodeURIComponent(slug)}`;
    const nameQ = `company_name=eq.${encodeURIComponent(name)}`;
    const nameQ2 = `company_name=eq.${encodeURIComponent((name || '').toLowerCase())}`;
    // OR query: id match OR name match (SB doesn't support OR easily, use two requests)
    return Promise.all([
      _req('GET', `contacts?${slugQ}&select=*&order=full_name.asc`),
      _req('GET', `contacts?${nameQ}&select=*&order=full_name.asc`),
    ]).then(([byId, byName]) => {
      const seen = new Set();
      return [
        ...(Array.isArray(byId) ? byId : []),
        ...(Array.isArray(byName) ? byName : []),
      ].filter((c) => {
        const k = c.id || c.email;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
    });
  },
  byCompanyName: (name) =>
    _req('GET', `contacts?company_name=eq.${encodeURIComponent(name)}&select=*`),
  byCompanyIds: (ids) =>
    _req(
      'GET',
      `contacts?company_id=in.(${ids.map(encodeURIComponent).join(',')})&select=company_id`,
    ),
  upsert: (row) => _req('POST', 'contacts', row, UPSERT),
};

/* ── Audiences ─────────────────────────────────────────────────── */
export const audiences = {
  list: () => _req('GET', 'audiences?select=*&order=updated_at.desc'),
  upsert: (row) =>
    _req('POST', 'audiences', { ...row, updated_at: new Date().toISOString() }, REPR),
  patch: (id, fld) =>
    _req('PATCH', `audiences?id=eq.${encodeURIComponent(id)}`, {
      ...fld,
      updated_at: new Date().toISOString(),
    }),
  delete: (id) => _req('DELETE', `audiences?id=eq.${encodeURIComponent(id)}`),
};

/* ── Company relations ─────────────────────────────────────────── */
export const relations = {
  listAll: () => _req('GET', 'company_relations?select=*'),
  byCompany: (slug) =>
    Promise.all([
      _req('GET', `company_relations?from_company=eq.${encodeURIComponent(slug)}&select=*`),
      _req('GET', `company_relations?to_company=eq.${encodeURIComponent(slug)}&select=*`),
    ]).then(([from, to]) => {
      const seen = new Set();
      return [...(Array.isArray(from) ? from : []), ...(Array.isArray(to) ? to : [])].filter(
        (r) => {
          const k = `${r.from_company}|${r.to_company}|${r.relation_type}`;
          if (seen.has(k)) return false;
          seen.add(k);
          return true;
        },
      );
    }),
  upsert: (row) => _req('POST', 'company_relations', row, UPSERT),
};

/* ── Intelligence ──────────────────────────────────────────────── */
export const intelligence = {
  get: (companyId, type) =>
    _req(
      'GET',
      `intelligence?company_id=eq.${encodeURIComponent(companyId)}${type ? `&type=eq.${type}` : ''}&select=*`,
    ),
  upsert: (row) => _req('POST', 'intelligence', row, UPSERT),
};

/* ── Merge suggestions ─────────────────────────────────────────── */
export const mergeSuggestions = {
  pending: () =>
    _req(
      'GET',
      'merge_suggestions?status=eq.pending&select=id,company_a,company_b,similarity,reason',
    ),
  pendingCount: () =>
    fetch(`${SB_URL}/rest/v1/merge_suggestions?status=eq.pending&select=id`, {
      headers: authHdr({ Prefer: 'count=exact', Range: '0-0' }),
    }).then((r) => parseInt(r.headers.get('content-range')?.split('/')[1] || '0')),
  patch: (id, fld) => _req('PATCH', `merge_suggestions?id=eq.${encodeURIComponent(id)}`, fld),
};

/* ── Enrich cache ──────────────────────────────────────────────── */
export const enrichCache = {
  get: (companyId, source) =>
    _req(
      'GET',
      `enrich_cache?company_id=eq.${encodeURIComponent(companyId)}${source ? `&source=eq.${encodeURIComponent(source)}` : ''}&select=*`,
    ),
  upsert: (row) => _req('POST', 'enrich_cache', row, UPSERT),
};

/* ── User profiles ─────────────────────────────────────────────── */
export const userProfiles = {
  get: (userId) =>
    _req('GET', `user_profiles?id=eq.${encodeURIComponent(userId)}&select=*`).then(
      (r) => r?.[0] || null,
    ),
};
