/* ═══ state.js — shared mutable state ═══ */

const S = {
  /* ── core data ─────────────────────────────────────── */
  companies: [],
  totalCompaniesInDb: 0, // real DB count from content-range header
  contacts: [],
  allRelations: [],

  /* ── UI ────────────────────────────────────────────── */
  activeTab: 'companies',
  activeFilter: 'all',
  searchQ: '',
  activeTags: new Set(),
  tagLogic: 'or',
  sortBy: 'icp',
  tagPanelOpen: false,
  currentCompany: null,
  currentContact: null,
  consoleLog: [],
  aiSet: null,
  _modalMode: 'research',
  mcAiContacts: [],

  /* ── TCF analyser ──────────────────────────────────── */
  tcfSelected: new Set(), // slugs selected for comparison (max 4)

  /* ── audiences ─────────────────────────────────────── */
  audiences: [],
  activeAudience: null,
  _audienceBuiltIds: null, // temp: company_ids from AI build, cleared after save
};

export default S;
