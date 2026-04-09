/* ═══ merge.js — company merge system ═══ */

import { SB_URL } from './config.js?v=20260409zj';
import { mergeSuggestions as dbMerge } from './db.js?v=20260409zj';
import S from './state.js?v=20260409zj';
import { esc, _slug, authHdr } from './utils.js?v=20260409zj';
import { clog } from './api.js?v=20260409zj';

/* ── 1. executeMerge ─────────────────────────────────────── */
export async function executeMerge(winnerId, loserId) {
  const winner = S.companies.find(c => c.id === winnerId);
  const loser  = S.companies.find(c => c.id === loserId);
  const res = await fetch(`${SB_URL}/rest/v1/rpc/merge_companies`, {
    method: 'POST',
    headers: authHdr(),
    body: JSON.stringify({ p_winner_id: winnerId, p_loser_id: loserId, p_merged_by: 'hub_user' }),
  });
  if (!res.ok) { const t = await res.text().catch(() => ''); throw new Error(`Merge failed ${res.status}: ${t.slice(0, 200)}`); }
  S.companies = S.companies.filter(c => c.id !== loserId);
  clog('db', `Merged "${loser?.name || loserId}" → "${winner?.name || winnerId}"`);
  return res.json();
}

/* ── 2. resolveAlias ─────────────────────────────────────── */
export async function resolveAlias(companyId) {
  try {
    const res = await fetch(
      `${SB_URL}/rest/v1/company_aliases?alias_id=eq.${encodeURIComponent(companyId)}&select=canonical_id&limit=1`,
      { headers: authHdr() }
    );
    if (!res.ok) return companyId;
    const rows = await res.json();
    return rows.length ? rows[0].canonical_id : companyId;
  } catch { return companyId; }
}

/* ── 3. loadMergeSuggestionsCount ─────────────────────────── */
export async function loadMergeSuggestionsCount() {
  try {
    const res = await fetch(
      `${SB_URL}/rest/v1/merge_suggestions?status=eq.pending&select=id`,
      { headers: authHdr({ Prefer: 'count=exact', Range: '0-0' }) }
    );
    const cr = res.headers.get('content-range');
    if (cr) { const m = cr.match(/\/(\d+)/); if (m) return parseInt(m[1]); }
    return 0;
  } catch { return 0; }
}

/* ── 4. loadMergeSuggestions ──────────────────────────────── */
export async function loadMergeSuggestions() {
  const res = await fetch(
    `${SB_URL}/rest/v1/merge_suggestions?status=eq.pending&select=id,company_a,company_b,similarity,reason&order=similarity.desc&limit=80`,
    { headers: authHdr() }
  );
  if (!res.ok) return [];
  const rows = await res.json();
  if (!rows.length) return [];
  const ids = [...new Set(rows.flatMap(r => [r.company_a, r.company_b]))];
  const cr = await fetch(
    `${SB_URL}/rest/v1/companies?id=in.(${ids.join(',')})\&select=id,name,type,category,website`,
    { headers: authHdr() }
  );
  const cos = cr.ok ? await cr.json() : [];
  const map = Object.fromEntries(cos.map(c => [c.id, c]));
  return rows.map(r => ({
    ...r,
    a: map[r.company_a] || { id: r.company_a, name: '?', type: '', category: '' },
    b: map[r.company_b] || { id: r.company_b, name: '?', type: '', category: '' },
  }));
}

/* ── 5. rejectSuggestion ─────────────────────────────────── */
export async function rejectSuggestion(id) {
  await dbMerge.patch(id, { status: 'ignored' });
}

/* ── 6. searchCompaniesForMerge ───────────────────────────── */
export async function searchCompaniesForMerge(q) {
  if (q.length < 2) return [];
  const res = await fetch(
    `${SB_URL}/rest/v1/companies?name=ilike.*${encodeURIComponent(q)}*&select=id,name,type,category,website&order=name&limit=15`,
    { headers: authHdr() }
  );
  return res.ok ? res.json() : [];
}

/* ── 7. openMergeModal ────────────────────────────────────── */
export function openMergeModal(companyId) {
  const modal = document.getElementById('mergeModal');
  if (!modal) return;
  modal.style.display = 'flex';
  const tab = companyId ? 'manual' : 'suggestions';
  const seed = companyId ? S.companies.find(c => c.id === companyId) : null;
  renderMergeModal(modal, tab, seed);
}

/* ═══ Internal render functions ═══════════════════════════════ */

let _mergeSource = null;
let _mergeTarget = null;
let _mergeCount = 0;

function renderMergeModal(modal, tab, seedCompany) {
  _mergeSource = seedCompany || null;
  _mergeTarget = null;

  loadMergeSuggestionsCount().then(n => { _mergeCount = n; updateTabBtns(); });

  modal.innerHTML = `
<div style="background:var(--surf);border:1px solid var(--rule);border-radius:4px;width:90%;max-width:560px;max-height:80vh;display:flex;flex-direction:column;box-shadow:var(--sh)">
  <div style="display:flex;align-items:center;border-bottom:1px solid var(--rule);padding:10px 14px;gap:8px">
    <span style="font:600 11px/1 'IBM Plex Mono',monospace;letter-spacing:.05em;text-transform:uppercase;color:var(--t1)">Merge Companies</span>
    <div style="margin-left:auto;display:flex;gap:4px">
      <button class="btn sm${tab==='manual'?' p':''}" id="mergeTabManual" onclick="window._mergeTab('manual')">Manual Merge</button>
      <button class="btn sm${tab==='suggestions'?' p':''}" id="mergeTabSugg" onclick="window._mergeTab('suggestions')">Suggestions <span id="mergeTabCount" style="font-size:9px">(${_mergeCount})</span></button>
    </div>
    <button class="btn sm" onclick="document.getElementById('mergeModal').style.display='none'" style="margin-left:4px">✕</button>
  </div>
  <div id="mergeModalBody" style="flex:1;overflow-y:auto;padding:14px"></div>
</div>`;

  modal.onclick = e => { if (e.target === modal) modal.style.display = 'none'; };

  const body = document.getElementById('mergeModalBody');
  if (tab === 'manual') renderManualMergeTab(body, seedCompany);
  else renderSuggestionsTab(body);
}

function updateTabBtns() {
  const el = document.getElementById('mergeTabCount');
  if (el) el.textContent = `(${_mergeCount})`;
}

window._mergeTab = function(t) {
  const modal = document.getElementById('mergeModal');
  renderMergeModal(modal, t, _mergeSource);
};

/* ── Manual merge tab ─────────────────────────────────────── */
function renderManualMergeTab(body, seedCompany) {
  _mergeSource = seedCompany || null;
  _mergeTarget = null;

  body.innerHTML = `<div class="mrg-manual">
  <div>
    <div class="mrg-section-lbl">Source (will be deleted)</div>
    <div class="mrg-picked" id="mergeSourcePick">
      ${seedCompany ? renderPicked(seedCompany) : `<button class="btn sm" onclick="window._pickMergeSource()">Pick source…</button>`}
    </div>
  </div>
  <div class="mrg-arrow-big">⬇ merged into ⬇</div>
  <div>
    <div class="mrg-section-lbl">Target / Winner</div>
    <div class="mrg-search-wrap">
      <input class="mrg-search" id="mergeTargetSearch" placeholder="Search target company…" oninput="window._mergeSearch(this.value)"/>
      <div class="mrg-results" id="mergeTargetResults" style="display:none"></div>
    </div>
  </div>
  <div id="mergeDiffWrap"></div>
  <div id="mergeActions" style="display:flex;gap:6px;margin-top:4px"></div>
</div>`;
}

function renderPicked(c) {
  return `<div class="mrg-picked-co">
    <span class="mrg-name">${esc(c.name)}</span>
    <span class="mrg-meta">${esc(c.type||'')}${c.category?' · '+esc(c.category):''}</span>
    <span class="mrg-id">${esc(c.id)}</span>
  </div>`;
}

window._pickMergeSource = function() {
  const body = document.getElementById('mergeModalBody');
  body.innerHTML = `<div class="mrg-manual">
    <div class="mrg-section-lbl">Pick source company</div>
    <input class="mrg-search" placeholder="Search…" oninput="window._mergeSourceSearch(this.value)"/>
    <div class="mrg-results" id="mergeSourceResults" style="display:none"></div>
  </div>`;
  window._mergeSourceSearch = async function(q) {
    const wrap = document.getElementById('mergeSourceResults');
    if (!q || q.length < 2) { wrap.style.display = 'none'; return; }
    const hits = await searchCompaniesForMerge(q);
    wrap.style.display = hits.length ? '' : 'none';
    wrap.innerHTML = hits.map(c => `<div class="mrg-result-row" onclick="window._selectMergeSource('${esc(c.id)}')">${esc(c.name)} <span style="color:var(--t3);font-size:10px">${esc(c.type||'')}${c.category?' · '+esc(c.category):''}</span></div>`).join('');
  };
  window._selectMergeSource = function(id) {
    _mergeSource = S.companies.find(c => c.id === id) || { id, name: id };
    const mbody = document.getElementById('mergeModalBody');
    renderManualMergeTab(mbody, _mergeSource);
  };
};

window._mergeSearch = async function(q) {
  const wrap = document.getElementById('mergeTargetResults');
  if (!q || q.length < 2) { wrap.style.display = 'none'; return; }
  const hits = await searchCompaniesForMerge(q);
  const filtered = hits.filter(c => !_mergeSource || c.id !== _mergeSource.id);
  wrap.style.display = filtered.length ? '' : 'none';
  wrap.innerHTML = filtered.map(c => `<div class="mrg-result-row" onclick="window._selectMergeTarget('${esc(c.id)}')">${esc(c.name)} <span style="color:var(--t3);font-size:10px">${esc(c.type||'')}${c.category?' · '+esc(c.category):''}</span></div>`).join('');
};

window._selectMergeTarget = function(id) {
  _mergeTarget = S.companies.find(c => c.id === id) || { id, name: id };
  document.getElementById('mergeTargetResults').style.display = 'none';
  document.getElementById('mergeTargetSearch').value = _mergeTarget.name;
  renderDiff();
};

function renderDiff() {
  const wrap = document.getElementById('mergeDiffWrap');
  const acts = document.getElementById('mergeActions');
  if (!_mergeSource || !_mergeTarget) { wrap.innerHTML = ''; acts.innerHTML = ''; return; }
  const fields = ['name', 'type', 'category', 'website', 'hq_city', 'size', 'founded_year', 'description'];
  const rows = fields.map(f => {
    const sv = _mergeSource[f] || '';
    const tv = _mergeTarget[f] || '';
    const svDisplay = f === 'description' ? (sv.length > 80 ? sv.slice(0, 80) + '…' : sv) : sv;
    const tvDisplay = f === 'description' ? (tv.length > 80 ? tv.slice(0, 80) + '…' : tv) : tv;
    return `<tr><td>${f}</td><td class="lose">${esc(String(svDisplay))}</td><td class="win">${esc(String(tvDisplay))}</td></tr>`;
  }).join('');
  wrap.innerHTML = `<table class="mrg-diff"><tr><th>Field</th><th>Source (deleted)</th><th>Target (kept)</th></tr>${rows}</table>`;
  acts.innerHTML = `<button class="btn sm p" id="mergeConfirmBtn" onclick="window._confirmMerge()">⚙ Merge — keep TARGET name</button><button class="btn sm" onclick="document.getElementById('mergeModal').style.display='none'">✕ Cancel</button>`;
}

window._confirmMerge = async function() {
  if (!_mergeSource || !_mergeTarget) return;
  const btn = document.getElementById('mergeConfirmBtn');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Merging…'; }
  try {
    await executeMerge(_mergeTarget.id, _mergeSource.id);
    document.getElementById('mergeModal').style.display = 'none';
    if (typeof window.renderList === 'function') window.renderList();
    showToast('✓ Merged');
  } catch (e) {
    const acts = document.getElementById('mergeActions');
    if (acts) acts.innerHTML += `<div style="color:var(--prc);font-size:11px;margin-top:4px">${esc(e.message)}</div>`;
    if (btn) { btn.disabled = false; btn.textContent = '⚙ Merge — keep TARGET name'; }
  }
};

/* ── Suggestions tab ──────────────────────────────────────── */
async function renderSuggestionsTab(body) {
  body.innerHTML = '<div class="mrg-loading">Loading suggestions…</div>';
  const items = await loadMergeSuggestions();
  _mergeCount = items.length;
  updateTabBtns();
  if (!items.length) { body.innerHTML = '<div class="mrg-empty">✓ No merge suggestions</div>'; return; }
  body.innerHTML = items.map(s => {
    const simPct = Math.round((s.similarity || 0) * 100);
    const simColor = simPct >= 90 ? 'var(--g)' : simPct >= 70 ? 'var(--prc)' : 'var(--t3)';
    return `<div class="mrg-row" id="mrg-row-${s.id}">
      <div class="mrg-pair">
        <div class="mrg-co"><span class="mrg-name">${esc(s.a.name)}</span><span class="mrg-meta">${esc(s.a.type||'')}${s.a.category?' · '+esc(s.a.category):''}</span></div>
        <span class="mrg-arrow">⇌</span>
        <div class="mrg-co"><span class="mrg-name">${esc(s.b.name)}</span><span class="mrg-meta">${esc(s.b.type||'')}${s.b.category?' · '+esc(s.b.category):''}</span></div>
      </div>
      <div class="mrg-meta2">
        <span class="mrg-reason">${esc(s.reason || 'name match')}</span>
        <span class="mrg-sim" style="color:${simColor}">${simPct}% match</span>
      </div>
      <div class="mrg-actions">
        <button class="btn sm p" onclick="window.mergeSuggestion('${esc(s.a.id)}','${esc(s.b.id)}','${esc(s.id)}')">Keep A</button>
        <button class="btn sm p" onclick="window.mergeSuggestion('${esc(s.b.id)}','${esc(s.a.id)}','${esc(s.id)}')">Keep B</button>
        <button class="btn sm" onclick="window.rejectMergeSuggestion('${esc(s.id)}')">✕ Skip</button>
      </div>
    </div>`;
  }).join('');
}

window.mergeSuggestion = async function(winnerId, loserId, suggId) {
  const row = document.getElementById(`mrg-row-${suggId}`);
  if (row) row.style.opacity = '0.4';
  try {
    await executeMerge(winnerId, loserId);
    if (row) { row.style.transition = 'opacity .3s'; row.style.opacity = '0'; setTimeout(() => row.remove(), 350); }
    _mergeCount = Math.max(0, _mergeCount - 1);
    updateTabBtns();
    if (typeof window.renderList === 'function') window.renderList();
    showToast('✓ Merged');
  } catch (e) {
    if (row) row.style.opacity = '1';
    showToast('Error: ' + e.message);
  }
};

window.rejectMergeSuggestion = async function(id) {
  const row = document.getElementById(`mrg-row-${id}`);
  try {
    await rejectSuggestion(id);
    if (row) { row.style.transition = 'opacity .3s'; row.style.opacity = '0'; setTimeout(() => row.remove(), 350); }
    _mergeCount = Math.max(0, _mergeCount - 1);
    updateTabBtns();
  } catch (e) {
    showToast('Error: ' + e.message);
  }
};

/* ── Toast helper ─────────────────────────────────────────── */
function showToast(msg) {
  let t = document.getElementById('mergeToast');
  if (!t) { t = document.createElement('div'); t.id = 'mergeToast'; t.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:var(--surf2);border:1px solid var(--rule);border-radius:2px;padding:7px 16px;font:500 11px/1 "IBM Plex Mono",monospace;color:var(--t1);z-index:1100;box-shadow:var(--sh);transition:opacity .3s'; document.body.appendChild(t); }
  t.textContent = msg; t.style.opacity = '1';
  setTimeout(() => { t.style.opacity = '0'; }, 2200);
}
