/* ═══ app.js — boot + window exports ═══ */

import S from './state.js';
import { renderStats, loadFromSupabase, setStatus, saveCompany, saveContact } from './api.js';
import { renderList, switchTab as _switchTab, setFilter, onSearch, renderTagPanel, toggleTagPanel, toggleTag, toggleTagEl, clearTags, setTagLogic, matchTags, runAI, clearAI, openCompany, closePanel, coAction, ctAction, bgGenerateAngle, bgFindDMs, bgRefreshIntel, openBySlug, showCtxSlug, showCtx, openDrawer, closeDrawer, drEmail, drLinkedIn, drGmail, drResearch, promptResearch, promptSimilar, closeModal, submitModal, openClaude } from './hub.js';
import { openComposer, closeComposer, openPanel, mcRenderPersonas, mcPickPersona, mcGenerate, mcCopy, mcHint, mcPickContact, mcRenderPicker } from './meeseeks.js';
import { extendSwitchTab, renderTCFList, renderTCFCenter, tcfSelectRow, tcfClearSel, updateTCFSelBar, loadGVL, doGVLMatch, promptGVLConfirm, closeGVLConfirm, executeGVLConfirm } from './tcf.js';

/* ── Theme ────────────────────────────────────────────────── */
let theme = localStorage.getItem('oaTheme') || 'light';
document.documentElement.setAttribute('data-theme', theme);
function toggleTheme() {
  theme = theme === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('oaTheme', theme);
  document.getElementById('themeBtn').textContent = theme === 'dark' ? '☀️' : '🌙';
}
document.getElementById('themeBtn').textContent = theme === 'dark' ? '☀️' : '🌙';

/* ── Wrap switchTab with TCF extension ───────────────────── */
const switchTab = extendSwitchTab(_switchTab);

/* ── Window exports (for onclick handlers in HTML) ───────── */
Object.assign(window, {
  /* state access */
  get currentCompany() { return S.currentCompany; },
  set currentCompany(v) { S.currentCompany = v; },
  /* theme */
  toggleTheme,
  /* nav */
  switchTab, setFilter, onSearch,
  /* tags */
  toggleTagPanel, toggleTag, toggleTagEl, clearTags, setTagLogic, renderTagPanel,
  /* AI */
  runAI, clearAI,
  /* company detail */
  openCompany, closePanel, coAction, ctAction,
  openBySlug, showCtxSlug, showCtx,
  bgGenerateAngle, bgFindDMs, bgRefreshIntel,
  /* drawer */
  openDrawer, closeDrawer, drEmail, drLinkedIn, drGmail, drResearch,
  /* modals */
  promptResearch, promptSimilar, closeModal, submitModal,
  openClaude,
  /* composer */
  openComposer, closeComposer, openPanel,
  mcPickPersona, mcGenerate, mcCopy, mcHint, mcPickContact,
  /* TCF */
  renderTCFList, renderTCFCenter, tcfSelectRow, tcfClearSel,
  doGVLMatch, promptGVLConfirm, closeGVLConfirm, executeGVLConfirm,
  /* DB interface */
  oaDB: {
    saveCompany, saveContact,
    reload: () => { document.getElementById('dbStatus').textContent = '○ Syncing…'; loadFromSupabase(renderStats, renderList, renderTagPanel); },
  },
});

/* ── Event listeners ─────────────────────────────────────── */
document.addEventListener('click', () => document.getElementById('ctxMenu').style.display = 'none');
document.getElementById('mcOverlay').addEventListener('click', closeComposer);
document.getElementById('overlay').addEventListener('click', e => { if (e.target === document.getElementById('overlay')) closeModal(); });
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeComposer(); closeModal(); }
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
    if (document.getElementById('mcDrawer').classList.contains('open')) mcGenerate();
  }
});
document.addEventListener('DOMContentLoaded', () => {
  const mi = document.getElementById('modalInput');
  if (mi) mi.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitModal(); } });
  const ai = document.getElementById('aiInp');
  if (ai) ai.addEventListener('keydown', e => { if (e.key === 'Enter') runAI(); });
  const ov2 = document.getElementById('gvl-confirm-overlay');
  if (ov2) ov2.addEventListener('click', e => { if (e.target === ov2) closeGVLConfirm(); });
  setTimeout(() => loadGVL(), 800);
});

/* ── Init ─────────────────────────────────────────────────── */
setStatus(false);
renderStats();
renderList();
loadFromSupabase(renderStats, renderList, renderTagPanel);
mcRenderPersonas();
