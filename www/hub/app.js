/* ═══ app.js — boot + window exports (v2.3 — magic link + audit) ═══ */
import S from './state.js?v=20260410d10';
import { vibeEnrichLead, vibeSearchCompanies, vibeEnrichCompany, vibeEnrichContact, vibeEnrichContacts } from './vibe.js?v=20260410d10';
import { isDemoMode, loadDemoData, showDemoBanner, patchNavForDemo, enterDemoMode, exitDemoMode, demoGuard, initDoom } from './demo.js?v=20260410d10';
import { startTutorial, resetTutorial, isTutorialDone, initKonami } from './tutorial.js?v=20260410d10';
import { _slug, esc } from './utils.js?v=20260410d10';
import { renderStats, loadFromSupabase, setStatus, saveCompany, saveContact, promptApiKey, updateKeyBtn, toggleKeyPanel, saveKeyPanel, clearKeyPanel, cacheGet, cacheSet, cacheInvalidate, withCache, lemlistKey, lemlistFetch, lemlistCampaigns, lemlistAddLead, lemlistWriteBack } from './api.js?v=20260410d10';
import { renderList, switchTab as _switchTab, setFilter, onSearch, renderTagPanel, toggleTagPanel, toggleTag, toggleTagEl, clearTags, setTagLogic, matchTags, runAI, clearAI, aiQuick, openCompany, closePanel, coAction, ctAction, bgGenerateAngle, bgFindDMs, bgRefreshIntel, loadRelationsBrief, openBySlug, showCtxSlug, showCtx, openDrawer, closeDrawer, openContactFull, drEmail, drLinkedIn, drGmail, drResearch, promptResearch, promptSimilar, closeModal, submitModal, openClaude, clog, toggleConsole, clearConsole, setSort, quickEnrich, mapSegments, extractIntelRelations, openClaudeGmail, oaGmailConnect, oaGmailDisconnect, oaEmailScan, oaEmailSaveContacts, initLemlistModal, openLemlistModal, closeLemlistModal, lemlistPush, audPushLemlist, renderLemlistPanel, refreshLemlistCampaigns, selectLemlistCampaign, clearCampaignDetail, llSearchLeads, llPushFromAudience, llUnsubLead, showEnrichPicker, showSimilarPicker,
  llSyncContacts, llSyncCompanies, llSetKey, llClearKey, llIsConnected, _llPushCompany, showPersonaPicker, _onPersonaPick, bgGenerateAngleWithPersona, setCompanyStatus } from './hub.js?v=20260410d10';
import { openComposer, closeComposer, openPanel as mcOpenPanel, mcPickPersona, mcGenerate, mcCopy, mcHint, mcPickContact, mcToggleCoSearch, mcFilterCos, mcCoSearchKey, mcPickCo, mcPickCoIdx, MC_PERSONAS } from './meeseeks.js?v=20260410d10';
import { renderTCFList, renderTCFCenter, tcfSelectRow, tcfClearSel, doGVLMatch, promptGVLConfirm, closeGVLConfirm, executeGVLConfirm, loadGVL } from './tcf.js?v=20260410d10';
import { renderAudiencesPanel, renderAudienceDetail, openAudienceModal, audCloseModal, audNew, audEdit, audOpen, audCloseDetail, audSave, audDelete, audToggleCo, audSetSort, audRefreshDetail, audAIBuild, audExportCsv, audFindContacts, addToSystemAudience, removeFromSystemAudience, sysAudSearchInput, sysCoSetType, icpFindByIcp, icpMatch, icpSaveStep, icpSaveAudience, icpEditModal, icpRegenHook, icpPatchAudience, audToggleCoRow, audFilterCoList, audProviderChange, generateCampaignHook, generateEmailTemplate, saveCampaignTemplate, launchCampaign, audDraftEmailToCo, audGenAngleForCo, audAddExternalCo, audB2bLookup, toggleAudienceMap, audOpenCoOverlay, audCloseCoOverlay } from './audiences.js?v=20260410d10';
import { openMergeModal, loadMergeSuggestionsCount } from './merge.js?v=20260410d10';
import { gmailSectionHTML, gmailConnectAndScan, gmailDisconnectUI, gmailScanCompany, gmailSaveContacts, gmailIsConnected, gmailNavToggle, updateGmailNavBtn, gmailEnrichContacts, gmailSaveAndEnrichContacts, gmailShowSummarizePrompt, gmailRunSummarize, gmailSaveRelationshipSummary, gmailSaveSelectedContacts, gmailRenderResults } from './gmail.js?v=20260410d10';
import {
  getSession, getAuthToken, getCurrentUser, oaEnterDemoMode,
  signIn, signInWithGoogle,
  signOut, onAuthStateChange,
  getUserProfile,
  logActivity,
  renderLoginScreen, hideLoginScreen,
  doGoogleSignIn,
  renderUserBadge,
} from './auth.js?v=20260410d10';

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
async function openProspectFinder(q, event) {
  // Show the company finder modal
  const hasKey = !!localStorage.getItem('oaAnthropicKey');
  if (q) {
    const inp = document.getElementById('aiInp');
    if (inp) { inp.value = q; window.runAI?.(); }
    return;
  }
  // If triggered from nav button (has event), show a picker first
  if (event) {
    showEnrichPicker(event, 'Find Companies', [
      {
        icon: '🔍',
        name: 'Hub AI Search',
        desc: 'Search companies in your hub by criteria, category, or signal.',
        badge: 'free', badgeType: 'free',
        fn: () => { const inp = document.getElementById('aiInp'); if(inp){inp.focus();inp.select();} }
      },
      {
        icon: '🔗',
        name: 'b2b MCP — Search 17.5M+',
        desc: 'Semantic company search by industry, tech, or description.',
        badge: 'free', badgeType: 'free',
        disabled: !hasKey,
        fn: () => _openVibeFinder()
      },
      {
        icon: '⚡',
        name: 'Vibe Prospecting',
        desc: 'Same 17.5M+ DB with richer firmographic enrichment. Free search.',
        badge: 'free', badgeType: 'free',
        disabled: !hasKey,
        fn: () => _openVibeFinder()
      },
    ]);
    return;
  }
  // Show inline finder UI in center panel
  const panel = document.getElementById('coPanel');
  const empty = document.getElementById('emptyState');
  if (!panel) return;
  if (empty) empty.style.display = 'none';
  panel.style.display = 'flex';

  const limitNote = hasKey
    ? ''
    : '<div style="margin-top:6px;padding:6px 8px;background:var(--prb);border:1px solid var(--prr);border-radius:2px;font-size:9px;color:var(--prc)">⚠ Personal Anthropic key required for enrichment. Click 🔑 in nav.</div>';

  panel.innerHTML = `<div style="padding:20px;font-family:'IBM Plex Mono',monospace;width:100%;box-sizing:border-box">
    <div style="font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--t1);margin-bottom:4px">🔍 Company Finder</div>
    <div style="font-size:9px;color:var(--t3);margin-bottom:12px">Search 17.5M+ companies by industry, technology, or description</div>
    ${limitNote}
    <div style="font-size:8px;color:var(--t4);margin:8px 0 4px;letter-spacing:.04em">WHAT THIS CAN DO</div>
    <div style="font-size:9px;color:var(--t2);margin-bottom:12px;line-height:1.6">
      ✓ Search companies by industry / tech / description<br>
      ✓ Enrich a known company with revenue, size, funding<br>
      ✓ Look up a contact by email or name+company → LinkedIn, title<br>
      <span style="color:var(--t4)">✗ Bulk "find me VP of Data" queries (not available in current plan)</span>
    </div>
    <div style="display:flex;gap:6px;margin-bottom:8px">
      <input id="vibeSearchInp" class="inp" placeholder="e.g. programmatic DSP Europe, audience data AdTech…"
        style="flex:1;font-size:10px;padding:6px 10px;height:32px"
        onkeydown="if(event.key==='Enter')vibeDoSearch()">
      <button class="btn sm p" onclick="vibeDoSearch()" style="height:32px;padding:0 16px">Search</button>
    </div>
    <div id="vibeResults" style="margin-top:8px"></div>
  </div>`;

  setTimeout(() => document.getElementById('vibeSearchInp')?.focus(), 80);
}

function _openVibeFinder() {
  // Open the Vibe/b2b Company Finder panel in center
  openProspectFinder('');
}

window.vibeDoSearch = async function() {
  const q = document.getElementById('vibeSearchInp')?.value?.trim();
  if (!q) return;
  const res = document.getElementById('vibeResults');
  if (res) res.innerHTML = '<div style="font-size:10px;color:var(--t3)">⟳ Searching…</div>';
  const result = await window.vibeSearchCompanies(q);
  if (!res) return;
  if (!result.success || !result.companies.length) {
    res.innerHTML = '<div style="font-size:10px;color:var(--t3)">No results found.</div>';
    return;
  }
  const S = window._oaState || {companies:[]};
  const companies = result.companies;
  window._vibeResults = companies; // store for onclick access
  const esc2 = esc;
  res.innerHTML = `<div style="font-size:8px;color:var(--t4);margin-bottom:6px;letter-spacing:.04em">${companies.length} RESULTS</div>` +
    companies.map((c, idx) => {
      const inHub = (S.companies||[]).find(x => (x.name||'').toLowerCase() === (c.name||'').toLowerCase());
      return `<div style="display:flex;align-items:flex-start;gap:8px;padding:8px 0;border-bottom:1px solid var(--rule3)">
        <div style="flex:1;min-width:0">
          <div style="font-size:10px;font-weight:600;color:var(--t1)">${esc2(c.name||'—')}${inHub ? ' <span style="color:var(--g);font-size:7px">✓ in hub</span>' : ''}</div>
          <div style="font-size:8px;color:var(--t3);margin:2px 0">${esc2((c.description||'').slice(0,120))}${(c.description||'').length>120?'…':''}</div>
          ${c.website ? `<a href="${esc2(c.website)}" target="_blank" style="font-size:8px;color:var(--g)">${esc2(c.website)}</a>` : ''}
        </div>
        <div style="flex-shrink:0;display:flex;flex-direction:column;gap:3px">
          ${!inHub ? `<button class="btn sm" style="font-size:7px" onclick="window.vibeAddToHub(window._vibeResults[${idx}])">+ Add</button>` : ''}
          ${c.website ? `<button class="btn sm" style="font-size:7px" onclick="window.vibeEnrichCompany({name:'${esc2(c.name||'')}',website:'${esc2(c.website||'')}',id:''})">⚡ Enrich</button>` : ''}
        </div>
      </div>`;
    }).join('');
};

window.vibeAddToHub = async function(company) {
  const { _slug, esc } = await import('./utils.js?v=20260410d10');
  const { SB_URL } = await import('./config.js?v=20260410d10');
  const { authHdr } = await import('./api.js?v=20260410d10');
  const S = window._oaState || {companies:[]};
  const id = _slug(company.name || '');
  if (!id) return;
  const rec = {
    id, name: company.name,
    website: company.website || '',
    description: (company.description || '').slice(0, 500),
    category: company.industry || '',
    type: 'prospect',
    source: 'vibe_search',
  };
  await fetch(SB_URL + '/rest/v1/companies', {
    method: 'POST',
    headers: { ...authHdr(), 'Content-Type': 'application/json', 'Prefer': 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(rec),
  });
  S.companies.push(rec);
  window.renderList?.();
  window.clog?.('db', `➕ Added <b>${esc(company.name)}</b> from Vibe search`);
};

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
    window.MC_PERSONAS_LIST = MC_PERSONAS;
  loadFromSupabase(renderStats, renderList, renderTagPanel);
    _lastSync = Date.now();
    clog('db', `↺ Synced — ${S.companies.length} companies · ${S.contacts.length} contacts`);
    // Auto-launch tutorial for first-time users
    setTimeout(function(){if(typeof isTutorialDone==='function'&&!isTutorialDone())startTutorial();},1500);
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
window.MC_PERSONAS_LIST = MC_PERSONAS;
window.startTutorial = startTutorial;
// Vibe Prospecting
window.vibeEnrichLead = vibeEnrichLead;
window.vibeSearchCompanies = vibeSearchCompanies;
window.vibeEnrichCompany = vibeEnrichCompany;
window.vibeEnrichContact = vibeEnrichContact;
window.vibeEnrichContacts = vibeEnrichContacts;
window.renderStats = renderStats;
initKonami(); // ↑↑↓↓←→←→BA
window.oaEnterDemo = oaEnterDemoMode;
window.demoGuard = demoGuard;
window.exitDemoMode = exitDemoMode;
window.isDemoMode = isDemoMode;
window.resetTutorial = resetTutorial;
window.isTutorialDone = isTutorialDone;
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
  setSort, quickEnrich, clog, toggleConsole, clearConsole, mapSegments, _slug, showEnrichPicker, showSimilarPicker,

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
  _llPushCompany,
  showPersonaPicker, _onPersonaPick, bgGenerateAngleWithPersona, setCompanyStatus,

  /* Meeseeks */
  openComposer, closeComposer, mcOpenPanel,
  mcPickPersona, mcGenerate, mcCopy, mcHint, mcPickContact,
  mcToggleCoSearch, mcFilterCos, mcCoSearchKey, mcPickCo, mcPickCoIdx,

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
  /* ── Demo mode event listener ─────────────────────── */
  window.addEventListener('oa-demo-enter', () => {
    if (!_hubBooted) {
      _hubBooted = true;
      showDemoBanner();
      initDoom();
      patchNavForDemo();
      loadDemoData(S);
      setTimeout(() => { if(typeof isTutorialDone==='function'&&!isTutorialDone()) startTutorial(); }, 800);
    }
  });

  /* ── Demo mode event listener ────────────────────── */
  window.addEventListener('oa-demo-enter', () => {
    if (!_hubBooted) {
      _hubBooted = true;
      showDemoBanner();
      initDoom();
      patchNavForDemo();
      loadDemoData(S);
      setTimeout(() => { if(typeof isTutorialDone==='function'&&!isTutorialDone()) startTutorial(); }, 800);
    }
  });

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
  // Non-authenticated users always get demo mode.
  // Exception: skip demo if mid-OAuth redirect (URL has access_token / code).
  const _oauthInFlight = window.location.hash.includes('access_token') ||
    window.location.hash.includes('error_description') ||
    window.location.search.includes('code=');

  if (!_oauthInFlight && isDemoMode()) {
    _hubBooted = true;
    hideLoginScreen();
    showDemoBanner();
    initDoom();
    patchNavForDemo();
    loadDemoData(S);
    setTimeout(() => { if(typeof isTutorialDone==='function'&&!isTutorialDone()) startTutorial(); }, 800);
    return;
  }

  const session = await getSession();
  if (session) {
    exitDemoMode(); // clear demo flag on real auth
    await bootHub(session);
    setTimeout(() => {
      if (!(document.getElementById('listScroll')?.children?.length > 0)) {
        window.refreshData(true);
      }
    }, 3000);
  } else if (!_oauthInFlight) {
    // No session, not mid-OAuth → always demo
    enterDemoMode();
    _hubBooted = true;
    hideLoginScreen();
    showDemoBanner();
      initDoom();
    patchNavForDemo();
    loadDemoData(S);
    setTimeout(() => { if(typeof isTutorialDone==='function'&&!isTutorialDone()) startTutorial(); }, 800);
  } else {
    renderLoginScreen(); // mid-OAuth: show login while token processes
  }
});
