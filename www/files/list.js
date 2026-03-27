/* ═══════════════════════════════════════════════════════════════
   list.js — Left panel: company list, contact list, search, filters
   ═══════════════════════════════════════════════════════════════ */

import { companies, contacts, activeFilter, searchQuery, setFilter, setSearch } from './state.js';
import { _slug, tagCls, avatarColor, initials, esc, debounce } from './utils.js';

/* ═══ Companies Tab ══════════════════════════════════════════ */

export function renderCompanyList() {
  const el = document.getElementById('coList');
  if (!el) return;

  const q = searchQuery.toLowerCase();
  const filtered = companies.filter(c => {
    /* type filter */
    if (activeFilter !== 'all') {
      if (activeFilter === 'fresh') {
        if (c.type !== 'prospect') return false;
        if (c.updated_at) {
          const age = Date.now() - new Date(c.updated_at).getTime();
          if (age < 30 * 86400000) return false;
        }
      } else {
        if (c.type !== activeFilter) return false;
      }
    }
    /* search */
    if (q) {
      const hay = `${c.name} ${c.note || ''} ${c.category || ''} ${c.region || ''}`.toLowerCase();
      return hay.includes(q);
    }
    return true;
  });

  /* meta */
  const meta = document.getElementById('listMeta');
  if (meta) meta.textContent = `${filtered.length} of ${companies.length} companies`;

  /* render rows */
  el.innerHTML = filtered.map(c => {
    const cls  = tagCls(c.type);
    const bg   = avatarColor(c.type);
    const slug = _slug(c.name);
    return `<div class="co-row" data-slug="${slug}" onclick="window.openCompany(window._coBySlug('${slug}'))" oncontextmenu="window.showCtx(event,'${slug}')">
      <div class="co-av" style="background:${bg}">${initials(c.name)}</div>
      <div class="co-info">
        <div class="co-name">${esc(c.name)}</div>
        <div class="co-note">${esc(c.note || c.category || '')}</div>
      </div>
      ${c.icp ? `<span class="co-icp">${c.icp}</span>` : ''}
      <span class="tag ${cls}">${c.type || 'prospect'}</span>
    </div>`;
  }).join('');
}

/* ═══ Contacts Tab ═══════════════════════════════════════════ */

export function renderContactList() {
  const el = document.getElementById('ctList');
  if (!el) return;

  const q = searchQuery.toLowerCase();
  const filtered = contacts.filter(c => {
    if (!q) return true;
    return `${c.full_name} ${c.title || ''} ${c.company_name || ''}`.toLowerCase().includes(q);
  });

  const meta = document.getElementById('listMeta');
  if (meta) meta.textContent = `${filtered.length} contacts`;

  el.innerHTML = filtered.map(c => `
    <div class="co-row" onclick="window.openContact(${JSON.stringify(c).replace(/"/g,'&quot;')})">
      <div class="co-av" style="background:var(--g);border-radius:50%">${initials(c.full_name)}</div>
      <div class="co-info">
        <div class="co-name">${esc(c.full_name)}</div>
        <div class="co-note">${esc(c.title || '')} · ${esc(c.company_name || '')}</div>
      </div>
    </div>
  `).join('');
}

/* ═══ Stats Bar ══════════════════════════════════════════════ */

export function renderStats() {
  const counts = { all: companies.length };
  const types = ['client', 'poc', 'partner', 'prospect', 'nogo'];
  types.forEach(t => { counts[t] = companies.filter(c => c.type === t).length; });
  counts.fresh = companies.filter(c => {
    if (c.type !== 'prospect') return false;
    if (!c.updated_at) return true;
    return Date.now() - new Date(c.updated_at).getTime() > 30 * 86400000;
  }).length;

  const ids = ['stat-all', 'stat-client', 'stat-poc', 'stat-partner', 'stat-prospect', 'stat-nogo', 'stat-fresh'];
  const keys = ['all', 'client', 'poc', 'partner', 'prospect', 'nogo', 'fresh'];
  ids.forEach((id, i) => {
    const el = document.getElementById(id);
    if (el) {
      const n = el.querySelector('.stat-n');
      if (n) n.textContent = counts[keys[i]] || 0;
    }
  });
}

/* ═══ Filter Click ═══════════════════════════════════════════ */

export function applyFilter(type) {
  setFilter(type);
  /* update active class on stat elements */
  document.querySelectorAll('.stat').forEach(el => el.classList.remove('act'));
  const active = document.getElementById('stat-' + type);
  if (active) active.classList.add('act');
  renderCompanyList();
}

/* ═══ Search ═════════════════════════════════════════════════ */

export function handleSearch(q) {
  setSearch(q);
  renderCompanyList();
  renderContactList();
}

export const debouncedSearch = debounce(handleSearch, 150);

/* ═══ Highlight active row ═══════════════════════════════════ */

export function highlightRow(slug) {
  document.querySelectorAll('.co-row').forEach(r => r.classList.remove('act'));
  const row = document.querySelector(`.co-row[data-slug="${slug}"]`);
  if (row) {
    row.classList.add('act');
    row.scrollIntoView({ block: 'nearest' });
  }
}
