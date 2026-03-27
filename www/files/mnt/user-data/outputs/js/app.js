/* ═══════════════════════════════════════════════════════════════
   app.js — Boot sequence + event wiring
   This is the single entry point: <script type="module" src="js/app.js">
   ═══════════════════════════════════════════════════════════════ */

/* ── Imports ─────────────────────────────────────────────────── */
import { toggleTheme } from './theme.js';
import { companies, contacts, setCompanies, setContacts, setLive, setTab } from './state.js';
import { fetchCompanies, fetchContacts, oaDB } from './api.js';
import { _slug, openClaude } from './utils.js';
import { renderCompanyList, renderContactList, renderStats, applyFilter, debouncedSearch, highlightRow } from './list.js';
import { openCompany, closeCompany, renderEmptyState } from './detail.js';
import { openContact, closeContact } from './contacts.js';
import { renderTCFTab, filterTCF, loadGVLVendors } from './tcf.js';
import { renderEnricherTab, enrToggle, enrSelectAll, enrSelectNone, enrFind, enrGenerate, enrFilterByTag } from './enricher.js';
import { openMeeseeks, closeMeeseeks, meesSetPersona, meesGenerate, meesCopy } from './meeseeks.js';
import { openPanel, closePanel, openResearchModal, closeResearchModal, submitResearch, showCtx, hideCtx, initPanelListener } from './panels.js';

/* ── SEED (fallback when Supabase is down) ───────────────────── */
const SEED = [
  // ['Name','note','type','Category','Region','size', icp, 'website', 'li-slug'],
  // Add seed data here if needed for offline fallback
];
const SEED_CONTACTS = [];

function classify(note) {
  if (!note) return 'prospect';
  const n = note.toLowerCase();
  if (n.includes('client') || n.includes('active'))  return 'client';
  if (n.includes('partner') || n.includes('integ'))  return 'partner';
  if (n.includes('nogo') || n.includes('no-go'))     return 'nogo';
  if (n.includes('poc'))                              return 'poc';
  return 'prospect';
}

/* ═══ Init ═══════════════════════════════════════════════════ */

async function init() {
  updateNavStatus('loading');

  /* Init from SEED immediately */
  if (SEED.length) {
    const seedCos = SEED.map(([n, note, t, cat, reg, sz, icp, web, li]) => ({
      name: n, note: note || '', type: t || classify(note),
      icp: icp || null, category: cat || null, region: reg || null,
      size: sz || null, website: web || null, linkedin_slug: li || null,
    }));
    setCompanies(seedCos);
    setContacts([...SEED_CONTACTS]);
    renderCompanyList();
    renderStats();
  }

  /* Load from Supabase */
  try {
    const [dbCos, dbCts] = await Promise.all([fetchCompanies(), fetchContacts()]);
    setCompanies(dbCos);
    setContacts(dbCts);
    setLive(true);
    updateNavStatus('live', dbCos.length);
  } catch (e) {
    console.warn('Supabase unavailable, using SEED:', e.message);
    setLive(false);
    updateNavStatus('seed', companies.length);
  }

  renderCompanyList();
  renderContactList();
  renderStats();

  /* Empty state in center */
  document.getElementById('center').innerHTML = renderEmptyState();
}

/* ═══ Nav Status ═════════════════════════════════════════════ */

function updateNavStatus(mode, count) {
  const el = document.getElementById('navStatus');
  if (!el) return;
  if (mode === 'loading') {
    el.innerHTML = '<span class="dot dot-seed"></span> Loading…';
  } else if (mode === 'live') {
    el.innerHTML = `<span class="dot dot-live"></span> Live · ${count}`;
  } else {
    el.innerHTML = `<span class="dot dot-seed"></span> Seed · ${count}`;
  }
}

/* ═══ Tab Switching ══════════════════════════════════════════ */

function switchTab(tab) {
  setTab(tab);

  /* toggle tab buttons */
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('act'));
  const tabBtn = document.getElementById('tab-' + tab.substring(0, 2));
  if (tabBtn) tabBtn.classList.add('act');

  /* toggle panes */
  const panes = { companies: 'coList', contacts: 'ctList', tcf: 'tcfList', enricher: 'pane-enricher' };
  Object.values(panes).forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
  const active = panes[tab];
  if (active) {
    const el = document.getElementById(active);
    if (el) el.style.display = tab === 'enricher' ? 'flex' : '';
  }

  /* tab-specific init */
  if (tab === 'contacts') renderContactList();
  if (tab === 'tcf')      renderTCFTab();
  if (tab === 'enricher') renderEnricherTab();
}

/* ═══ Sync (reload from DB) ══════════════════════════════════ */

async function syncDB() {
  updateNavStatus('loading');
  try {
    const [dbCos, dbCts] = await Promise.all([fetchCompanies(), fetchContacts()]);
    setCompanies(dbCos);
    setContacts(dbCts);
    setLive(true);
    updateNavStatus('live', dbCos.length);
    renderCompanyList();
    renderContactList();
    renderStats();
  } catch (e) {
    updateNavStatus('seed', companies.length);
    console.error('Sync failed:', e);
  }
}

/* ═══ Lookup helper (used by onclick in rendered HTML) ════════ */

function _coBySlug(slug) {
  return companies.find(c => _slug(c.name) === slug) || null;
}

/* ═══ Window Exports ═════════════════════════════════════════
   These are needed because onclick handlers in dynamically
   rendered HTML can't see module-scoped functions.
   Keep this list minimal — only functions called from HTML.
   ═══════════════════════════════════════════════════════════ */

Object.assign(window, {
  /* core nav */
  toggleTheme,
  switchTab,
  syncDB,
  applyFilter,

  /* company/contact */
  openCompany,
  closeCompany,
  openContact,
  closeContact,
  _coBySlug,

  /* panels + modals */
  openPanel,
  closePanel,
  openResearchModal,
  closeResearchModal,
  submitResearch,
  showCtx,
  hideCtx,
  openClaude,

  /* meeseeks */
  openMeeseeks,
  closeMeeseeks,
  meesSetPersona,
  meesGenerate,
  meesCopy,

  /* enricher */
  enrToggle,
  enrSelectAll,
  enrSelectNone,
  enrFind,
  enrGenerate,
  enrFilterByTag,

  /* tcf */
  filterTCF,
  loadGVLVendors,

  /* DB interface (for external scripts / console) */
  oaDB,
  currentCompany: null,
});

/* ═══ Global Listeners ═══════════════════════════════════════ */

/* Close context menu on click anywhere */
document.addEventListener('click', hideCtx);

/* Close panel modal on backdrop click */
document.getElementById('panelModal')?.addEventListener('click', function (e) {
  if (e.target === this) closePanel();
});

/* Close drawer overlay */
document.getElementById('drawerOverlay')?.addEventListener('click', closeContact);

/* Search input */
document.getElementById('searchInput')?.addEventListener('input', e => debouncedSearch(e.target.value));

/* Research modal — Enter key */
document.addEventListener('DOMContentLoaded', () => {
  const mi = document.getElementById('modalInput');
  if (mi) mi.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitResearch(); }
  });
});

/* Panel message listener */
initPanelListener();

/* ═══ Boot ═══════════════════════════════════════════════════ */
init();
