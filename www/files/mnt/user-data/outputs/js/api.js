/* ═══════════════════════════════════════════════════════════════
   api.js — Supabase data layer
   Every Supabase call goes through here. No fetch() elsewhere.
   ═══════════════════════════════════════════════════════════════ */

import { SB_URL, SB_HEADERS, SB_WRITE_HEADERS, FETCH_TIMEOUT } from './config.js';

/* ── Timeout wrapper ─────────────────────────────────────────── */
function fetchWithTimeout(url, opts, ms = FETCH_TIMEOUT) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), ms);
  return fetch(url, { ...opts, signal: ctrl.signal }).finally(() => clearTimeout(id));
}

/* ═══ Companies ══════════════════════════════════════════════ */

export async function fetchCompanies() {
  const r = await fetchWithTimeout(
    `${SB_URL}/rest/v1/companies?select=*&order=name.asc`,
    { headers: SB_HEADERS }
  );
  if (!r.ok) throw new Error(`Companies ${r.status}`);
  return r.json();
}

export async function upsertCompany(data) {
  return fetch(`${SB_URL}/rest/v1/companies`, {
    method: 'POST',
    headers: SB_WRITE_HEADERS,
    body: JSON.stringify(data),
  });
}

/* ═══ Contacts ═══════════════════════════════════════════════ */

export async function fetchContacts() {
  const r = await fetchWithTimeout(
    `${SB_URL}/rest/v1/contacts?select=*&order=full_name.asc`,
    { headers: SB_HEADERS }
  );
  if (!r.ok) throw new Error(`Contacts ${r.status}`);
  return r.json();
}

export async function fetchContactsForCompany(slug) {
  const r = await fetch(
    `${SB_URL}/rest/v1/contacts?company_slug=eq.${slug}&select=*`,
    { headers: SB_HEADERS }
  );
  return r.json();
}

export async function upsertContact(data) {
  return fetch(`${SB_URL}/rest/v1/contacts`, {
    method: 'POST',
    headers: SB_WRITE_HEADERS,
    body: JSON.stringify(data),
  });
}

/* ═══ Relations ══════════════════════════════════════════════ */

export async function fetchRelations(slug) {
  const r = await fetch(
    `${SB_URL}/rest/v1/company_relations?or=(from_company.eq.${slug},to_company.eq.${slug})&select=*`,
    { headers: SB_HEADERS }
  );
  if (!r.ok) throw new Error(`Relations ${r.status}`);
  return r.json();
}

/* ═══ Intelligence ═══════════════════════════════════════════ */

export async function fetchIntelligence(slug) {
  const r = await fetch(
    `${SB_URL}/rest/v1/intelligence?company_slug=eq.${slug}&select=*&order=created_at.desc`,
    { headers: SB_HEADERS }
  );
  return r.json();
}

export async function upsertIntelligence(data) {
  return fetch(`${SB_URL}/rest/v1/intelligence`, {
    method: 'POST',
    headers: SB_WRITE_HEADERS,
    body: JSON.stringify(data),
  });
}

/* ═══ Email History ══════════════════════════════════════════ */

export async function fetchEmailHistory(slug) {
  const r = await fetch(
    `${SB_URL}/rest/v1/email_history?company_slug=eq.${slug}&select=*&order=sent_at.desc`,
    { headers: SB_HEADERS }
  );
  return r.json();
}

/* ═══ Enrich Cache ═══════════════════════════════════════════ */

export async function fetchEnrichCache(domain) {
  const r = await fetch(
    `${SB_URL}/rest/v1/enrich_cache?domain=eq.${domain}&select=*`,
    { headers: SB_HEADERS }
  );
  return r.json();
}

export async function upsertEnrichCache(data) {
  return fetch(`${SB_URL}/rest/v1/enrich_cache`, {
    method: 'POST',
    headers: SB_WRITE_HEADERS,
    body: JSON.stringify(data),
  });
}

/* ═══ GVL (TCF) — via corsproxy ══════════════════════════════ */

export async function fetchGVL() {
  const r = await fetch('https://corsproxy.io/?' + encodeURIComponent('https://vendor-list.consensu.org/v3/vendor-list.json'));
  if (!r.ok) throw new Error(`GVL ${r.status}`);
  return r.json();
}

/* ═══ Public DB interface (for window.oaDB) ══════════════════ */

export const oaDB = {
  saveCompany: upsertCompany,
  saveContact: upsertContact,
  reload: fetchCompanies,
};
