/* ═══ app.js — boot + window exports (v2.3 — magic link + audit) ═══ */
import S from './state.js?v=20260409a3';
import { _slug } from './utils.js?v=20260409a3';
import { renderStats, loadFromSupabase, setStatus, saveCompany, saveContact, promptApiKey, updateKeyBtn, toggleKeyPanel, saveKeyPanel, clearKeyPanel, cacheGet, cacheSet, cacheInvalidate, withCache, lemlistKey, lemlistFetch, lemlistCampaigns, lemlistAddLead, lemlistWriteBack } from './api.js?v=20260409a3';
import { renderList, switchTab as _switchTab, setFilter, onSearch, renderTagPanel, toggleTagPanel, toggleTag, toggleTagEl, clearTags, setTagLogic, matchTags, runAI, clearAI, aiQuick, openCompany, closePanel, coAction, ctAction, bgGenerateAngle, bgFindDMs, bgRefreshIntel, loadRelationsBrief, openBySlug, showCtxSlug, showCtx, openDrawer, closeDrawer, openContactFull, drEmail, drLinkedIn, drGmail, drResearch, promptResearch, promptSimilar, closeModal, submitModal, openClaude, clog, toggleConsole, clearConsole, setSort, quickEnrich, mapSegments, extractIntelRelations, openClaudeGmail, oaGmailConnect, oaGmailDisconnect, oaEmailScan, oaEmailSaveContacts, initLemlistModal, openLemlistModal, closeLemlistModal, lemlistPush, audPushLemlist, renderLemlistPanel, refreshLemlistCampaigns, selectLemlistCampaign, clearCampaignDetail, llSearchLeads, llPushFromAudience, llUnsubLead,
  llSyncContacts, llSyncCompanies, llSetKey, llClearKey, llIsConnected } from './hub.js?v=20260409a3';
import { openComposer, closeComposer, openPanel as mcOpenPanel, mcPickPersona, mcGenerate, mcCopy, mcHint, mcPickContact } from './meeseeks.js?v=20260409a3';
import { renderTCFList, renderTCFCenter, tcfSelectRow, tcfClearSel, doGVLMatch, promptGVLConfirm, closeGVLConfirm, executeGVLConfirm, loadGVL } from './tcf.js?v=20260409a3';
import { renderAudiencesPanel, renderAudienceDetail, openAudienceModal, audCloseModal, audNew, audEdit, audOpen, audCloseDetail, audSave, audDelete, audToggleCo, audSetSort, audRefreshDetail, audAIBuild, audExportCsv, audFindContacts, addToSystemAudience, removeFromSystemAudience, sysAudSearchInput, sysCoSetType, icpFindByIcp, icpMatch, icpSaveStep, icpSaveAudience, icpEditModal, icpRegenHook, icpPatchAudience, audToggleCoRow, audFilterCoList, audProviderChange, generateCampaignHook, generateEmailTemplate, saveCampaignTemplate, launchCampaign, audDraftEmailToCo, audGenAngleForCo, audAddExternalCo, audB2bLookup, toggleAudienceMap, audOpenCoOverlay, audCloseCoOverlay } from './audiences.js?v=20260409a3';
import { openMergeModal, loadMergeSuggestionsCount } from './merge.js?v=20260409a3';
import { gmailSectionHTML, gmailConnectAndScan, gmailDisconnectUI, gmailScanCompany, gmailSaveContacts, gmailIsConnected, gmailNavToggle, updateGmailNavBtn, gmailEnrichContacts, gmailSaveAndEnrichContacts, gmailShowSummarizePrompt, gmailRunSummarize, gmailSaveRelationshipSummary, gmailSaveSelectedContacts, gmailRenderResults } from './gmail.js?v=20260409a3';
import {
  getSession, getAuthToken, getCurrentUser,
  signIn, signInWithGoogle,
  signOut, onAuthStateChange,
  getUserProfile,
  logActivity,
  renderLoginScreen, hideLoginScreen,
  doGoogleSignIn,
  renderUserBadge,
} from './auth.js?v=20260409a3';

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
window._oaState = S;   // shared ref so modules with mismatched version URLs can access canonical state

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

  const coPanel    = document.getElementById('coPanel');
  const emptyState = document.getElementById('emptyState');
  const tcfCenter  = document.getElementById('tcf-center');
  const audDetail  = document.getElementById('aud-detail-wrap');
  const audPanel   = document.getElementById('audiencesPanel');
  const listScroll = document.getElementById('listScroll');
  const leftSearch = document.getElementById('leftSearch');
  const listMeta   = document.getElementById('listMeta');
  const sortBar    = document.getElementById('sortBar');
  const selBar     = document.getElementById('tcf-sel-bar');
  const tabAud     = document.getElementById('tabAud');
  const tcfTab     = document.getElementById('tab-tcf');

  if (coPanel)    coPanel.style.display    = 'none';
  if (emptyState) emptyState.style.display = 'none';
  if (tcfCenter)  tcfCenter.style.display  = 'none';
  if (audDetail)  audDetail.style.display  = 'none';
  if (audPanel)   audPanel.style.display   = 'none';
  if (selBar)     selBar.style.display     = 'none';
  if (tabAud)     tabAud.classList.remove('active');
  if (tcfTab)     tcfTab.className         = 'left-tab';

  if (t === 'companies') {
    if (listScroll) listScroll.style.display = '';
    if (leftSearch) leftSearch.style.display = '';
    if (listMeta)   listMeta.style.display   = '';
    if (sortBar)    sortBar.style.display    = '';
    if (S.currentCompany && coPanel) coPanel.style.display = 'block';
    else if (emptyState)             emptyState.style.display = 'flex';

  } else if (t === 'contacts') {
    if (listScroll) listScroll.style.display = '';
    if (leftSearch) leftSearch.style.display = '';
    if (listMeta)   listMeta.style.display   = '';
    if (sortBar)    sortBar.style.display    = 'none';
    if (emptyState) emptyState.style.display = 'flex';

  } else if (t === 'audiences') {
    if (listScroll) listScroll.style.display = 'none';
    if (leftSearch) leftSearch.style.display = 'none';
    if (listMeta)   listMeta.style.display   = 'none';
    if (sortBar)    sortBar.style.display    = 'none';
    if (audPanel)   audPanel.style.display   = 'flex';
    if (tabAud)     tabAud.classList.add('active');
    if (S.activeAudience && audDetail) audDetail.style.display = '';
    renderAudiencesPanel();

  } else if (t === 'tcf') {
    if (listScroll) listScroll.style.display = '';
    if (leftSearch) leftSearch.style.display = '';
    if (listMeta)   listMeta.style.display   = '';
    if (sortBar)    sortBar.style.display    = 'none';
    if (selBar)     selBar.style.display     = 'flex';
    if (tcfCenter)  tcfCenter.style.display  = 'block';
    if (tcfTab)     tcfTab.className         = 'left-tab active';
    window.renderTCFList?.();
    renderTCFCenter();

  } else if (t === 'lemlist') {
    if (listScroll) listScroll.style.display = 'none';
    if (leftSearch) leftSearch.style.display = 'none';
    if (listMeta)   listMeta.style.display   = 'none';
    if (sortBar)    sortBar.style.display    = 'none';
  }
}

/* ── Prospect finder shim ───────────────────────────────────── */
function openProspectFinder(q) {
  if (q) {
    // Fill AI bar and run search internally
    const inp = document.getElementById('aiInp');
    if (inp) { inp.value = q; window.runAI?.(); }
  } else {
    // Open Meeseeks composer for a new prospecting email
    window.openComposer?.({});
  }
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
  oaSignIn: doGoogleSignIn,
  oaGoogleSignIn: doGoogleSignIn,
  oaSignOut,
  renderLoginScreen,
  hideLoginScreen,

  /* audit (callable from hub.js, api.js, meeseeks etc.) */
  oaLogCompany,
  oaLogContact,
  oaLogAudience,
  logActivity,

  /* tabs / filter / search */
  switchTab, renderList, setFilter, onSearch, setSort,
  toggleTagPanel, toggleTag, toggleTagEl, clearTags, setTagLogic, renderTagPanel,

  /* AI bar */
  runAI, clearAI, aiQuick,

  /* sort / utils */
  setSort, quickEnrich, clog, toggleConsole, clearConsole, mapSegments, _slug,

  /* company detail */
  openCompany, closePanel, coAction, ctAction,
  openBySlug, showCtxSlug, showCtx,
  bgGenerateAngle, bgFindDMs, bgRefreshIntel, openClaudeGmail,
  loadRelationsBrief, extractIntelRelations,
  oaGmailConnect, oaGmailDisconnect, oaEmailScan, oaEmailSaveContacts,

  /* contact */
  openContactFull,

  /* gmail */
  gmailSectionHTML, gmailConnectAndScan, gmailDisconnectUI, gmailScanCompany, gmailSaveContacts, gmailIsConnected,
  gmailNavToggle, updateGmailNavBtn,
  gmailEnrichContacts, gmailSaveAndEnrichContacts,
  gmailShowSummarizePrompt, gmailRunSummarize, gmailSaveRelationshipSummary, gmailSaveSelectedContacts, gmailRenderResults,

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

  /* Lemlist push modal */
  lemlistKey,
  initLemlistModal, openLemlistModal, closeLemlistModal, lemlistPush, audPushLemlist,

  /* Lemlist campaigns tab */
  renderLemlistPanel, refreshLemlistCampaigns, selectLemlistCampaign, clearCampaignDetail,
  llSearchLeads, llPushFromAudience, llUnsubLead,
  llSyncContacts, llSyncCompanies, llSetKey, llClearKey, llIsConnected,

  /* Meeseeks */
  openComposer, closeComposer, mcOpenPanel,
  mcPickPersona, mcGenerate, mcCopy, mcHint, mcPickContact,

  /* TCF */
  renderTCFList, renderTCFCenter, tcfSelectRow, tcfClearSel,
  doGVLMatch, promptGVLConfirm, closeGVLConfirm, executeGVLConfirm, loadGVL,

  /* Cache */
  cacheGet, cacheSet, cacheInvalidate, withCache,

  /* Audiences */
  renderAudiencesPanel, renderAudienceDetail, openAudienceModal, audCloseModal,
  audNew, audEdit, audOpen, audCloseDetail, audSave, audDelete,
  audToggleCo, audSetSort, audRefreshDetail, audAIBuild, audExportCsv, audFindContacts,
  addToSystemAudience, removeFromSystemAudience, sysAudSearchInput, sysCoSetType,
  icpFindByIcp, icpMatch, icpSaveStep, icpSaveAudience, icpEditModal, icpRegenHook, icpPatchAudience,
  audToggleCoRow, audFilterCoList, audProviderChange,
  generateCampaignHook, generateEmailTemplate, saveCampaignTemplate, launchCampaign,
  audDraftEmailToCo, audGenAngleForCo, audAddExternalCo, audB2bLookup,
  toggleAudienceMap,
  audOpenCoOverlay, audCloseCoOverlay,

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
const ALLOWED_DOMAINS = ['cloudtechnologies.pl', 'onaudience.com'];

async function bootHub(session) {
  if (_hubBooted) return;

  /* ── Domain enforcement — Google OAuth only ───────────── */
  // email/password accounts (CI, dev) are manually created in Supabase → trusted
  // Only Google OAuth accounts need the domain check
  const provider = session?.user?.app_metadata?.provider || '';
  if (provider === 'google') {
    const email  = session?.user?.email || '';
    const domain = email.split('@')[1] || '';
    if (!ALLOWED_DOMAINS.includes(domain)) {
      await signOut().catch(() => {});
      renderLoginScreen();
      const err = document.getElementById('oa-err');
      if (err) err.textContent = `Access restricted — ${email} is not an authorised domain.`;
      return;
    }
  }

  _hubBooted = true;
  /* Prime the shared token store from the session we already hold */
  if (session?.access_token) {
    window._oaToken = session.access_token;
  }
  hideLoginScreen();
  const _pill = document.getElementById('signOutPill');
  if (_pill) _pill.style.display = 'block';
  updateKeyBtn();
  updateGmailNavBtn();
  const profile = await Promise.race([
    getUserProfile(session.user.id).catch(() => null),
    new Promise(r => setTimeout(() => r(null), 3000))
  ]);
  if (profile) S.currentUserProfile = profile;
  // Always render badge — falls back to session email if no user_profiles row
  renderUserBadge(profile || { email: session.user.email, full_name: null, avatar_color: 'var(--g)', active_role: 'user' });
  clog('info', `Signed in as <b>${profile?.full_name || session.user.email}</b>`);
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
  initLemlistModal();

  /* ── Context menu: close on Escape or click outside ─────── */
  document.addEventListener('keydown', e => {
    const menu = document.getElementById('ctxMenu');
    if (menu?.style.display !== 'none') {
      if (e.key === 'Escape') { menu.style.display = 'none'; e.stopPropagation(); return; }
    }

    // Skip if typing in an input / textarea
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;

    /* ── Keyboard navigation ─────────────────────────────── */
    if (e.key === 'Escape') {
      closePanel(); closeDrawer(); window.closeComposer?.();
      return;
    }
    if (e.key === '/' || (e.key === 'f' && !e.metaKey && !e.ctrlKey)) {
      const inp = document.querySelector('input[placeholder*="Search"]');
      if (inp) { e.preventDefault(); inp.focus(); inp.select(); }
      return;
    }

    const rows = [...document.querySelectorAll('#listScroll .c-row')];
    if (!rows.length) return;

    const cur = rows.findIndex(r => r.classList.contains('kb-focus'));

    if (e.key === 'j' || e.key === 'ArrowDown') {
      e.preventDefault();
      const next = cur < rows.length - 1 ? cur + 1 : 0;
      rows.forEach(r => r.classList.remove('kb-focus'));
      rows[next].classList.add('kb-focus');
      rows[next].scrollIntoView({ block: 'nearest' });
      return;
    }
    if (e.key === 'k' || e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = cur > 0 ? cur - 1 : rows.length - 1;
      rows.forEach(r => r.classList.remove('kb-focus'));
      rows[prev].classList.add('kb-focus');
      rows[prev].scrollIntoView({ block: 'nearest' });
      return;
    }
    if (e.key === 'Enter') {
      const focused = rows[cur];
      if (focused?.dataset.slug) { e.preventDefault(); openBySlug(focused.dataset.slug); }
      return;
    }
  });

  document.addEventListener('click', e => {
    const menu = document.getElementById('ctxMenu');
    if (menu && !menu.contains(e.target)) menu.style.display = 'none';
    // Clear kb-focus when clicking outside the list
    if (!e.target.closest('#listScroll')) {
      document.querySelectorAll('.c-row.kb-focus').forEach(r => r.classList.remove('kb-focus'));
    }
  });


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
    setTimeout(() => {
      if (!(document.getElementById('listScroll')?.children?.length > 0)) {
        window.refreshData(true);
      }
    }, 3000);
  } else {
    renderLoginScreen();
  }
});
