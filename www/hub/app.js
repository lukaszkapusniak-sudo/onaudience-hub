/* ═══ app.js — boot + window exports (v2.3 — magic link + audit) ═══ */
import S from './state.js?v=20260327d';
import { _slug } from './utils.js?v=20260327d';
import { renderStats, loadFromSupabase, setStatus, saveCompany, saveContact, promptApiKey, updateKeyBtn, toggleKeyPanel, saveKeyPanel, clearKeyPanel, cacheGet, cacheSet, cacheInvalidate, withCache } from './api.js?v=20260327d';
import { renderList, switchTab as _switchTab, setFilter, onSearch, renderTagPanel, toggleTagPanel, toggleTag, toggleTagEl, clearTags, setTagLogic, matchTags, runAI, clearAI, aiQuick, openCompany, closePanel, coAction, ctAction, bgGenerateAngle, bgFindDMs, bgRefreshIntel, loadRelationsBrief, openBySlug, showCtxSlug, showCtx, openDrawer, closeDrawer, drEmail, drLinkedIn, drGmail, drResearch, promptResearch, promptSimilar, closeModal, submitModal, openClaude, clog, toggleConsole, clearConsole, setSort, quickEnrich, mapSegments, extractIntelRelations } from './hub.js?v=20260327d';
import { openComposer, closeComposer, openPanel as mcOpenPanel, mcPickPersona, mcGenerate, mcCopy, mcHint, mcPickContact } from './meeseeks.js?v=20260327d';
import { renderTCFList, renderTCFCenter, tcfSelectRow, tcfClearSel, doGVLMatch, promptGVLConfirm, closeGVLConfirm, executeGVLConfirm, loadGVL } from './tcf.js?v=20260327d';
import { renderAudiencesPanel, openAudienceModal, audCloseModal, audNew, audEdit, audOpen, audCloseDetail, audSave, audDelete, audToggleCo, audSetSort, audRefreshDetail, audAIBuild, audExportCsv, audFindContacts } from './audiences.js?v=20260327d';
import { openMergeModal, loadMergeSuggestionsCount } from './merge.js';
import {
  getSession, getAuthToken, getCurrentUser,
  signOut, onAuthStateChange,
  getUserProfile,
  logActivity,
  renderLoginScreen, hideLoginScreen,
  doSignIn,
  renderUserBadge,
} from './auth.js?v=20260327d';

/* ── Theme ──────────────────────────────────────────────────── */
function applyTheme(t){ document.documentElement.setAttribute('data-theme',t); localStorage.setItem('oaTheme',t); }
function toggleTheme(){ applyTheme(document.documentElement.getAttribute('data-theme')==='dark'?'light':'dark'); }
applyTheme(localStorage.getItem('oaTheme')||'dark');

/* ── Auth token store ───────────────────────────────────────────
   api.js reads window._oaToken directly on each request — a simple
   shared variable avoids the ES-module fetch-interception deadlock.
   bootHub() primes it from the session; auth.js refreshes it.
   ─────────────────────────────────────────────────────────────── */
window._oaToken = null;

/* ── Audit trail helpers ────────────────────────────────────────
   Thin wrappers that add context then call logActivity().
   Call these AFTER any successful DB write in hub.js / api.js.
   Since we can't easily patch hub.js internals, we expose them
   on window so the existing hub code can call window.oaLog*().
   ─────────────────────────────────────────────────────────────── */
function oaLogCompany(action, company, diff=null) {
  logActivity({
    action,
    entity_type: 'company',
    entity_id:   company?.id || _slug(company?.name||''),
    entity_name: company?.name || company?.id || '?',
    diff,
  }).catch(()=>{});
}

function oaLogContact(action, contact, diff=null) {
  logActivity({
    action,
    entity_type: 'contact',
    entity_id:   contact?.id || _slug(contact?.full_name||''),
    entity_name: contact?.full_name || contact?.id || '?',
    diff,
  }).catch(()=>{});
}

function oaLogAudience(action, audience, diff=null) {
  logActivity({
    action,
    entity_type: 'audience',
    entity_id:   audience?.id,
    entity_name: audience?.name || audience?.id || '?',
    diff,
  }).catch(()=>{});
}

/* ── Tab switch ─────────────────────────────────────────────── */
function switchTab(t) {
  _switchTab(t);
  const audPanel   = document.getElementById('audiencesPanel');
  const listScroll = document.getElementById('listScroll');
  const leftSearch = document.getElementById('leftSearch');
  const filtersRow = document.getElementById('filtersRow');
  const listMeta   = document.getElementById('listMeta');
  const sortBar    = document.getElementById('sortBar');
  const aiBar      = document.getElementById('aiBar');
  const tagPanel   = document.getElementById('tagPanel');
  const tabAud     = document.getElementById('tabAud');

  if (t==='audiences') {
    if (audPanel)   audPanel.style.display   = 'flex';
    if (listScroll) listScroll.style.display = 'none';
    if (leftSearch) leftSearch.style.display = 'none';
    if (filtersRow) filtersRow.style.display = 'none';
    if (listMeta)   listMeta.style.display   = 'none';
    if (sortBar)    sortBar.style.display    = 'none';
    if (aiBar)      aiBar.style.display      = 'none';
    if (tagPanel)   tagPanel.style.display   = 'none';
    if (tabAud)     tabAud.classList.add('active');
    renderAudiencesPanel();
  } else {
    if (audPanel)   audPanel.style.display   = 'none';
    if (listScroll) listScroll.style.display = '';
    if (leftSearch) leftSearch.style.display = '';
    if (listMeta)   listMeta.style.display   = '';
    if (sortBar)    sortBar.style.display    = '';
    if (tabAud)     tabAud.classList.remove('active');
  }
}

/* ── Prospect finder shim ───────────────────────────────────── */
function openProspectFinder(q) {
  openClaude(q
    ? `Find companies matching: ${q} — for onAudience data partnerships`
    : 'Find 10 high-priority prospect companies for onAudience data partnerships — DSPs, SSPs, agencies, data providers not yet in our CRM');
}

/* ── Sign out ───────────────────────────────────────────────── */
async function oaSignOut() {
  if (!confirm('Sign out?')) return;
  await signOut();
}

/* ── Manual DB sync ─────────────────────────────────────────────
   Callable from the nav status badge (click) and auto-triggered
   on tab refocus if data is >5 min stale.
   ─────────────────────────────────────────────────────────────── */
let _lastSync = 0;
let _syncing  = false;

async function refreshData(force = false) {
  if (_syncing) return;
  const el = document.getElementById('dbStatus');

  // Throttle: skip if synced <60s ago and not forced
  if (!force && Date.now() - _lastSync < 60_000) {
    if (el) {
      el.classList.add('synced');
      setTimeout(() => el.classList.remove('synced'), 600);
    }
    return;
  }

  _syncing = true;
  if (el) { el.classList.add('syncing'); el.title = 'Syncing…'; }

  try {
    await loadFromSupabase(renderStats, renderList, renderTagPanel);
    _lastSync = Date.now();
    clog('db', `↺ Synced — ${S.companies.length} companies · ${S.contacts.length} contacts`);
  } catch(e) {
    clog('db', `↺ Sync failed: ${e.message}`);
  } finally {
    _syncing = false;
    if (el) { el.classList.remove('syncing'); el.title = 'Click to sync'; }
  }
}

/* Auto-sync on tab refocus if data is >5 min stale */
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && Date.now() - _lastSync > 300_000) {
    refreshData();
  }
});

/* ── window exports ─────────────────────────────────────────── */
Object.assign(window, {
  /* theme */
  getCurrentCompany: () => S.currentCompany,
  setTheme:    v => applyTheme(v),
  toggleTheme,

  /* auth */
  oaSignIn: doSignIn,
  oaSignOut,

  /* audit (callable from hub.js, api.js, meeseeks etc.) */
  oaLogCompany,
  oaLogContact,
  oaLogAudience,
  logActivity,

  /* tabs / filter / search */
  switchTab, setFilter, onSearch,
  toggleTagPanel, toggleTag, toggleTagEl, clearTags, setTagLogic, renderTagPanel,

  /* AI bar */
  runAI, clearAI, aiQuick,

  /* sort / utils */
  setSort, quickEnrich, clog, toggleConsole, clearConsole, mapSegments, _slug,

  /* company detail */
  openCompany, closePanel, coAction, ctAction,
  openBySlug, showCtxSlug, showCtx,
  bgGenerateAngle, bgFindDMs, bgRefreshIntel,
  loadRelationsBrief, extractIntelRelations,

  /* drawers / modals */
  openDrawer, closeDrawer,
  drEmail, drLinkedIn, drGmail, drResearch,
  promptResearch, promptSimilar,
  closeModal, submitModal,
  openClaude, openProspectFinder,

  /* sync */
  refreshData,

  /* API key */
  promptApiKey, toggleKeyPanel, saveKeyPanel, clearKeyPanel,

  /* Meeseeks */
  openComposer, closeComposer, mcOpenPanel,
  mcPickPersona, mcGenerate, mcCopy, mcHint, mcPickContact,

  /* TCF */
  renderTCFList, renderTCFCenter, tcfSelectRow, tcfClearSel,
  doGVLMatch, promptGVLConfirm, closeGVLConfirm, executeGVLConfirm, loadGVL,

  /* Cache */
  cacheGet, cacheSet, cacheInvalidate, withCache,

  /* Audiences */
  renderAudiencesPanel, openAudienceModal, audCloseModal,
  audNew, audEdit, audOpen, audCloseDetail, audSave, audDelete,
  audToggleCo, audSetSort, audRefreshDetail, audAIBuild, audExportCsv, audFindContacts,

  /* Merge */
  openMergeModal,
  _mergeTab:           (...a) => window._mergeTab?.(...a),
  _mergeSearch:        (...a) => window._mergeSearch?.(...a),
  _confirmMerge:       (...a) => window._confirmMerge?.(...a),
  mergeSuggestion:     (...a) => window.mergeSuggestion?.(...a),
  rejectMergeSuggestion: (...a) => window.rejectMergeSuggestion?.(...a),
  _pickMergeSource:    (...a) => window._pickMergeSource?.(...a),
});

/* ── Boot ───────────────────────────────────────────────────── */

/* bootHub — idempotent, called from both INITIAL_SESSION and the
   explicit getSession() check below. Guard prevents double-boot. */
let _hubBooted = false;
async function bootHub(session) {
  if (_hubBooted) return;
  _hubBooted = true;
  /* Prime the shared token store from the session we already hold */
  if (session?.access_token) {
    window._oaToken = session.access_token;
  }
  hideLoginScreen();
  updateKeyBtn();
  const profile = await getUserProfile(session.user.id).catch(() => null);
  if (profile) {
    S.currentUserProfile = profile;
    renderUserBadge(profile);
    clog('info', `Signed in as <b>${profile.full_name || session.user.email}</b> · ${profile.active_role}`);
  }
  await loadFromSupabase(renderStats, renderList, renderTagPanel);
  _lastSync = Date.now();
  loadMergeSuggestionsCount().then(n => {
    if (n > 0) { const badge = document.getElementById('mergeBadge'); if (badge) { badge.textContent = n; badge.style.display = 'inline'; } }
  });
  /* Retry on cold CORS start — poll up to 4× at 1s intervals */
  if (!S.companies.length) {
    let _retries = 0;
    const _retryTimer = setInterval(async () => {
      if (S.companies.length || ++_retries > 4) { clearInterval(_retryTimer); return; }
      await loadFromSupabase(renderStats, renderList, renderTagPanel);
      _lastSync = Date.now();
    }, 1000);
  }
}

document.addEventListener('DOMContentLoaded', async () => {

  /* 1. Subscribe to future auth changes (SIGNED_IN after login, SIGNED_OUT) */
  onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session) {
      /* Fresh login — reset boot guard so hub re-initialises cleanly */
      _hubBooted = false;
      await bootHub(session);
    } else if (event === 'INITIAL_SESSION' && session && !_hubBooted) {
      /* Caught the initial session event — boot if not already done */
      await bootHub(session);
    } else if (event === 'SIGNED_OUT') {
      _hubBooted = false;
      window._oaToken = null;
      S.currentUserProfile = null;
      renderLoginScreen();
    }
  });

  /* 2. Explicitly check for an existing session.
        INITIAL_SESSION may have already fired before the callback above
        was registered (race on page reload). This is the reliable fallback. */
  const session = await getSession();
  if (session) {
    await bootHub(session);   // no-op if INITIAL_SESSION already triggered it
  } else {
    renderLoginScreen();
  }
});
