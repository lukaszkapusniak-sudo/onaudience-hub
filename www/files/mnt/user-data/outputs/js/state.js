/* ═══════════════════════════════════════════════════════════════
   state.js — Reactive app state
   All modules import from here. Mutations go through setters.
   ═══════════════════════════════════════════════════════════════ */

export let companies = [];
export let contacts  = [];
export let currentCompany = null;
export let currentTab = 'companies';  // companies | contacts | tcf | enricher
export let activeFilter = 'all';      // all | client | partner | prospect | poc | nogo | fresh
export let searchQuery = '';
export let isLive = false;            // true when Supabase responded

/* ── Setters ────────────────────────────────────────────────── */
export function setCompanies(c) { companies = c; }
export function setContacts(c)  { contacts = c; }
export function setCurrent(c)   { currentCompany = c; }
export function setTab(t)       { currentTab = t; }
export function setFilter(f)    { activeFilter = f; }
export function setSearch(q)    { searchQuery = q; }
export function setLive(v)      { isLive = v; }
