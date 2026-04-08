/* âââ app.js â boot + window exports (v2.3 â magic link + audit) âââ */
import S from './state.js?v=20260331d';
import { _slug } from './utils.js?v=20260331d';
import { renderStats, loadFromSupabase, setStatus, saveCompany, saveContact, promptApiKey, updateKeyBtn, toggleKeyPanel, saveKeyPanel, clearKeyPanel, cacheGet, cacheSet, cacheInvalidate, withCache, lemlistKey, lemlistFetch, lemlistCampaigns, lemlistAddLead, lemlistWriteBack } from './api.js?v=20260331d';
import { renderList, switchTab as _switchTab, setFilter, onSearch, renderTagPanel, toggleTagPanel, toggleTag, toggleTagEl, clearTags, setTagLogic, matchTags, runAI, clearAI, aiQuick, openCompany, closePanel, coAction, ctAction, bgGenerateAngle, bgFindDMs, bgRefreshIntel, loadRelationsBrief, openBySlug, showCtxSlug, showCtx, openDrawer, closeDrawer, openContactFull, drEmail, drLinkedIn, drGmail, drResearch, promptResearch, promptSimilar, closeModal, submitModal, openClaude, clog, toggleConsole, clearConsole, setSort, quickEnrich, mapSegments, extractIntelRelations, openClaudeGmail, oaGmailConnect, oaGmailDisconnect, oaEmailScan, oaEmailSaveContacts, initLemlistModal, openLemlistModal, closeLemlistModal, lemlistPush, audPushLemlist, renderLemlistPanel, refreshLemlistCampaigns, selectLemlistCampaign, clearCampaignDetail, llSearchLeads, llPushFromAudience, llUnsubLead } from './hub.js?v=20260331d';
import { openComposer, closeComposer, openPanel as mcOpenPanel, mcPickPersona, mcGenerate, mcCopy, mcHint, mcPickContact } from './meeseeks.js?v=20260331d';
import { renderTCFList, renderTCFCenter, tcfSelectRow, tcfClearSel, doGVLMatch, promptGVLConfirm, closeGVLConfirm, executeGVLConfirm, loadGVL, extendSwitchTab } from './tcf.js?v=20260331d';
import { renderAudiencesPanel, renderAudienceDetail, openAudienceModal, audCloseModal, audNew, audEdit, audOpen, audCloseDetail, audSave, audDelete, audToggleCo, audSetSort, audRefreshDetail, audAIBuild, audExportCsv, audFindContacts, addToSystemAudience, removeFromSystemAudience, sysAudSearchInput, sysCoSetType, icpFindByIcp, icpMatch, icpSaveStep, icpSaveAudience, icpEditModal, icpRegenHook, icpPatchAudience, audToggleCoRow, audFilterCoList, audProviderChange, generateCampaignHook, generateEmailTemplate, saveCampaignTemplate, launchCampaign, audDraftEmailToCo, audGenAngleForCo, toggleAudienceMap, audOpenCoOverlay, audCloseCoOverlay } from './audiences.js?v=20260331d';
import { openMergeModal, loadMergeSuggestionsCount } from './merge.js?v=20260331d';
import {
  getSession, getAuthToken, getCurrentUser,
  signOut, onAuthStateChange,
  getUserProfile,
  logActivity,
  renderLoginScreen, hideLoginScreen,
  doSignIn,
  renderUserBadge,
} from './auth.js?v=20260331d';

/* ââ Theme ââââââââââââââââââââââââââââââââââââââââââââââââââââ */
function applyTheme(t){ document.documentElement.setAttribute('data-theme',t); localStorage.setItem('oaTheme',t); }
function toggleTheme(){ applyTheme(document.documentElement.getAttribute('data-theme')==='dark'?'light':'dark'); }
applyTheme(localStorage.getItem('oaTheme')||'dark');

/* ââ Auth token store âââââââââââââââââââââââââââââââââââââââââââ
   api.js reads window._oaToken directly on each request â a simple
   shared variable avoids the ES-module fetch-interception deadlock.
   bootHub() primes it from the session; auth.js refreshes it.
   âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ */
window._oaToken = null;
window._oaState = S;   // shared ref so modules with mismatched version URLs can access canonical state

/* ââ Audit trail helpers ââââââââââââââââââââââââââââââââââââââââ
   Thin wrappers that add context then call logActivity().
   Call these AFTER any successful DB write in hub.js / api.js.
   Since we can't easily patch hub.js internals, we expose them
   on window so the existing hub code can call window.oaLog*().
   âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ */
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

/* ââ Tab switch âââââââââââââââââââââââââââââââââââââââââââââââ */
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

/* ââ Prospect finder shim âââââââââââââââââââââââââââââââââââââ */
function openProspectFinder(q) {
  openClaude(q
    ? `Find companies matching: ${q} â for onAudience data partnerships`
    : 'Find 10 high-priority prospect companies for onAudience data partnerships â DSPs, SSPs, agencies, data providers not yet in our CRM');
}

/* ââ Sign out âââââââââââââââââââââââââââââââââââââââââââââââââ */
async function oaSignOut() {
  if (!confirm('Sign out?')) return;
  await signOut();
}

/* ââ Manual DB sync âââââââââââââââââââââââââââââââââââââââââââââ
   Callable from the nav status badge (click) and auto-triggered
   on tab refocus if data is >5 min stale.
   âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ */
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
  if (el) { el.classList.add('syncing'); el.title = 'Syncingâ¦'; }

  try {
    await loadFromSupabase(renderStats, renderList, renderTagPanel);
    _lastSync = Date.now();
    clog('db', `âº Synced â ${S.companies.length} companies Â· ${S.contacts.length} contacts`);
  } catch(e) {
    clog('db', `âº Sync failed: ${e.message}`);
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

/* ââ window exports âââââââââââââââââââââââââââââââââââââââââââ */
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
  bgGenerateAngle, bgFindDMs, bgRefreshIntel, openClaudeGmail,
  loadRelationsBrief, extractIntelRelations,
  oaGmailConnect, oaGmailDisconnect, oaEmailScan, oaEmailSaveContacts,

  /* drawers / modals */
  openDrawer, closeDrawer, openContactFull,
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
  openLemlistModal, closeLemlistModal, lemlistPush, audPushLemlist,

  /* Lemlist campaigns tab */
  renderLemlistPanel, refreshLemlistCampaigns, selectLemlistCampaign, clearCampaignDetail,
  llSearchLeads, llPushFromAudience, llUnsubLead,

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
  addToSystemAudience, removeFromSystemAudience, sysAudSearchInput, sysCoSetType,
  icpFindByIcp, icpMatch, icpSaveStep, icpSaveAudience, icpEditModal, icpRegenHook, icpPatchAudience,
  audToggleCoRow, audFilterCoList, audProviderChange,
  generateCampaignHook, generateEmailTemplate, saveCampaignTemplate, launchCampaign,
  audDraftEmailToCo, audGenAngleForCo,
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

/* ââ Boot âââââââââââââââââââââââââââââââââââââââââââââââââââââ */

/* bootHub â idempotent, called from both INITIAL_SESSION and the
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
  const profile = await Promise.race([
    getUserProfile(session.user.id).catch(() => null),
    new Promise(r => setTimeout(() => r(null), 3000))
  ]);
  if (profile) {
    S.currentUserProfile = profile;
    renderUserBadge(profile);
    clog('info', `Signed in as <b>${profile.full_name || session.user.email}</b> Â· ${profile.active_role}`);
  }
  await loadFromSupabase(renderStats, renderList, renderTagPanel);
  _lastSync = Date.now();
  loadMergeSuggestionsCount().then(n => {
    if (n > 0) { const badge = document.getElementById('mergeBadge'); if (badge) { badge.textContent = n; badge.style.display = 'inline'; } }
  });
  /* Retry on cold CORS start â poll up to 4Ã at 1s intervals */
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

  /* 1. Subscribe to future auth changes (SIGNED_IN after login, SIGNED_OUT) */
  onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session) {
      /* Fresh login â reset boot guard so hub re-initialises cleanly */
      _hubBooted = false;
      await bootHub(session);
    } else if (event === 'INITIAL_SESSION' && session && !_hubBooted) {
      /* Caught the initial session event â boot if not already done */
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

/* ââ Context menu â close on outside click or Escape âââââââ */
document.addEventListener('click', () => {
  const menu = document.getElementById('ctxMenu');
  if (menu && menu.style.display === 'block') menu.style.display = 'none';
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const menu = document.getElementById('ctxMenu');
    if (menu && menu.style.display === 'block') { menu.style.display = 'none'; return; }
  }
});

/* ââ Keyboard navigation âââââââââââââââââââââââââââââââââââââ
   j/â  â next company row
   k/â  â previous company row
   Enter â open focused row
   Escape â close panel / drawer / context menu
   /    â focus search input
   ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ */
(function initKeyNav() {
  let _focusIdx = -1;

  function getRows() {
    return Array.from(document.querySelectorAll('#listScroll .c-row'));
  }

  function setFocus(idx) {
    const rows = getRows();
    if (!rows.length) return;
    // clamp
    idx = Math.max(0, Math.min(idx, rows.length - 1));
    // remove previous highlight
    rows.forEach(r => r.classList.remove('kb-focus'));
    rows[idx].classList.add('kb-focus');
    rows[idx].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    _focusIdx = idx;
  }

  function isTyping() {
    const el = document.activeElement;
    return el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
  }

  document.addEventListener('keydown', (e) => {
    const menu = document.getElementById('ctxMenu');
    const drawer = document.getElementById('ctDrawer');
    const mcDrawer = document.getElementById('mcDrawer');

    // Escape â priority chain
    if (e.key === 'Escape') {
      if (menu && menu.style.display === 'block') { menu.style.display = 'none'; return; }
      if (mcDrawer && mcDrawer.classList.contains('open')) { window.closeComposer?.(); return; }
      if (drawer && drawer.classList.contains('open')) { window.closeDrawer?.(); return; }
      if (document.getElementById("coPanel")?.style.display !== "none") { window.closePanel?.(); _focusIdx = -1; return; }
      return;
    }

    // / â focus search (don't interfere if already typing)
    if (e.key === '/' && !isTyping()) {
      e.preventDefault();
      document.getElementById('searchInput')?.focus();
      return;
    }

    // Skip nav keys if user is typing in an input
    if (isTyping()) return;

    // Skip if any drawer/modal is open
    if (mcDrawer?.classList.contains('open')) return;
    if (drawer?.classList.contains('open')) return;

    const rows = getRows();
    if (!rows.length) return;

    if (e.key === 'j' || e.key === 'ArrowDown') {
      e.preventDefault();
      setFocus(_focusIdx < 0 ? 0 : _focusIdx + 1);
      return;
    }

    if (e.key === 'k' || e.key === 'ArrowUp') {
      e.preventDefault();
      setFocus(_focusIdx <= 0 ? 0 : _focusIdx - 1);
      return;
    }

    if (e.key === 'Enter' && _focusIdx >= 0) {
      e.preventDefault();
      const slug = rows[_focusIdx]?.dataset?.slug;
      if (slug) window.openBySlug?.(slug);
      return;
    }
  });

  // Reset focus index when list re-renders
  const listScroll = document.getElementById('listScroll');
  if (listScroll) {
    new MutationObserver(() => { _focusIdx = -1; })
      .observe(listScroll, { childList: true });
  }
})();
