/* ═══ audiences.js — Audience management ═══
   Audiences = saved lists of companies matching a description.
   AI queries DB first (no web lookup needed for most queries).
   Tag/type/region filters are passed as hard context to AI.
   Lemlist export: CSV today, MCP connector stub ready.
   ════════════════════════════════════════════════════════ */

import { SB_URL, MODEL_CREATIVE } from './config.js';
import { authHdr } from './utils.js';
import S from './state.js';
import { classify, _slug, getCoTags, getAv, ini, tClass, tLabel, esc, relTime } from './utils.js';
import { anthropicFetch, geocodeCity, saveGeocode } from './api.js?v=20260328a';
import { clog } from './hub.js';

/* ── Map state ─────────────────────────────────────────────── */
let _audMap = null;
let _audMapMembers = [];

/* ─── Supabase ─────────────────────────────────────────────── */

async function sbLoadAudiences() {
  try {
    const res = await fetch(`${SB_URL}/rest/v1/audiences?select=*&order=updated_at.desc`, {
      headers: authHdr()
    });
    if (!res.ok) throw new Error(await res.text());
    return await res.json();
  } catch (e) {
    clog('db', `audiences load error: ${esc(e.message)}`);
    return [];
  }
}

async function sbSaveAudience(aud) {
  const body = { ...aud, updated_at: new Date().toISOString() };
  const res = await fetch(`${SB_URL}/rest/v1/audiences`, {
    method: 'POST',
    headers: authHdr({'Prefer':'resolution=merge-duplicates,return=representation'}),
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}

async function sbDeleteAudience(id) {
  const res = await fetch(`${SB_URL}/rest/v1/audiences?id=eq.${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: authHdr()
  });
  if (!res.ok) throw new Error(await res.text());
}

async function sbPatchCompanyType(companyId, type) {
  const res = await fetch(`${SB_URL}/rest/v1/companies?id=eq.${encodeURIComponent(companyId)}`, {
    method: 'PATCH',
    headers: authHdr({ 'Prefer': 'return=representation' }),
    body: JSON.stringify({ type })
  });
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}

/* ─── Left panel render ────────────────────────────────────── */

export async function renderAudiencesPanel() {
  const panel = document.getElementById('audiencesPanel');
  if (!panel) return;
  S.audiences = await sbLoadAudiences();
  const sysAuds  = S.audiences.filter(a => a.is_system);
  const userAuds = S.audiences.filter(a => !a.is_system);
  const sysSection = sysAuds.length ? `
<div class="aud-sys-section">
  <div class="aud-section-lbl">SYSTEM LISTS</div>
  ${sysAuds.map(audRowHtml).join('')}
</div>` : '';
  panel.innerHTML = `
<div class="aud-toolbar">
  <span class="aud-count">${userAuds.length} AUDIENCE${userAuds.length !== 1 ? 'S' : ''}</span>
  <button class="btn sm" onclick="icpFindByIcp()">✦ Find by ICP</button>
  <button class="btn sm p" onclick="audNew()">＋ NEW</button>
</div>
${sysSection}
<div class="aud-list">
  ${userAuds.length === 0
    ? '<div class="aud-empty">No audiences yet.<br>Use AI to build your first list.</div>'
    : userAuds.map(audRowHtml).join('')}
</div>`;
}

function audRowHtml(a) {
  const active = S.activeAudience?.id === a.id ? ' aud-row-active' : '';
  if (a.is_system) {
    const targetType = a.system_filter?.type;
    const allCos = window._oaState?.companies || S.companies || [];
    const n = targetType ? allCos.filter(c => c.type === targetType).length : 0;
    return `
<div class="aud-row${active}" onclick="audOpen('${esc(a.id)}')">
  <div class="aud-row-head">
    <span class="aud-row-name">${esc(a.name)}</span>
    <span class="aud-row-count">${n} co</span>
    <span class="sys-lock" title="System audience">🔒</span>
  </div>
  <div class="aud-row-actions">
    <button class="btn sm" onclick="event.stopPropagation();audExportCsv('${esc(a.id)}')">↗ CSV</button>
  </div>
</div>`;
  }
  const n = Array.isArray(a.company_ids) ? a.company_ids.length : 0;
  const f = a.filters || {};
  const tagPills = (f.tags || []).map(t => `<span class="tag tpr" style="font-size:7px">${esc(t)}</span>`).join('');
  const typePill = f.type ? `<span class="tag tp" style="font-size:7px">${esc(f.type)}</span>` : '';
  return `
<div class="aud-row${active}" onclick="audOpen('${esc(a.id)}')">
  <div class="aud-row-head">
    <span class="aud-row-name">${esc(a.name)}</span>
    <span class="aud-row-count">${n} co</span>
  </div>
  ${a.outreach_hook ? `<div class="aud-hook">✦ ${esc(a.outreach_hook)}</div>` : ''}
  <div class="aud-row-pills">${typePill}${tagPills}</div>
  <div class="aud-row-actions">
    <button class="btn sm" onclick="event.stopPropagation();audEdit('${esc(a.id)}')">EDIT</button>
    <button class="btn sm" onclick="event.stopPropagation();audExportCsv('${esc(a.id)}')">↗ CSV</button>
    <button class="btn sm" onclick="event.stopPropagation();audDelete('${esc(a.id)}')" style="color:var(--prc)">✕</button>
  </div>
</div>`;
}

/* ─── Audience detail (center panel) ──────────────────────── */

export function renderAudienceDetail(id) {
  const aud = S.audiences.find(a => a.id === id);
  if (!aud) return;
  S.activeAudience = aud;

  const center = document.getElementById('centerScroll');
  if (!center) return;

  // Hide spoke / company panel
  const es = document.getElementById('emptyState');
  const cp = document.getElementById('coPanel');
  const tc = document.getElementById('tcf-center');
  if (es) es.style.display = 'none';
  if (cp) cp.style.display = 'none';
  if (tc) tc.style.display = 'none';

  let detailEl = document.getElementById('aud-detail-wrap');
  if (!detailEl) {
    detailEl = document.createElement('div');
    detailEl.id = 'aud-detail-wrap';
    center.appendChild(detailEl);
  }
  detailEl.style.display = '';

  if (aud.is_system) {
    const companies = getSystemAudienceCompanies(aud);
    detailEl.innerHTML = renderSystemAudienceDetailHTML(aud, companies);
    return;
  }

  const companies = getAudienceCompanies(aud);
  const f = aud.filters || {};
  const tagPills = (f.tags || []).map(t => `<span class="tag tpr">${esc(t)}</span>`).join('');
  const sortOpts = ['updated_at', 'name', 'icp', 'size'].map(v =>
    `<option value="${v}" ${(aud.sort_field || 'updated_at') === v ? 'selected' : ''}>${sortLabel(v)}</option>`
  ).join('');

  detailEl.innerHTML = `
<div class="aud-detail">
  <div class="aud-detail-header">
    <div class="aud-detail-title">
      <span class="aud-detail-name">${esc(aud.name)}</span>
      <button class="btn sm" onclick="audEdit(${JSON.stringify(aud.id)})">EDIT</button>
      <button class="btn sm" onclick="audCloseDetail()">✕</button>
    </div>
    ${aud.description ? `<div class="aud-detail-desc">${esc(aud.description)}</div>` : ''}
    <div class="aud-detail-meta">
      ${f.type ? `<span class="tag tp">${esc(f.type)}</span>` : ''}
      ${tagPills}
      ${f.region ? `<span class="tag tn">${esc(f.region)}</span>` : ''}
      ${f.minIcp ? `<span class="tag tpr">ICP≥${f.minIcp}</span>` : ''}
    </div>
  </div>
  <div class="aud-co-row-sub">
    ${c.hq_city ? `<span>📍${esc(c.hq_city)}</span>` : ''}
    ${c.size ? `<span>👥${esc(c.size)}</span>` : ''}
    ${c.category ? `<span>${esc(c.category)}</span>` : ''}
  </div>
  <div class="aud-co-expand" id="aud-coe-${esc(slug)}" style="display:none">
    ${c.note ? `<div class="aud-co-desc">${esc(c.note.slice(0, 200))}</div>` : ''}
    ${c.outreach_angle ? `<div class="aud-co-angle">✦ ${esc(c.outreach_angle)}</div>` : ''}
    ${coContacts.length ? `<div class="aud-co-contacts">${coContacts.map(ct => `
      <div class="aud-ct-row">
        <span>${esc(ct.full_name || '?')}</span>
        ${ct.title ? `<span class="aud-ct-title">${esc(ct.title)}</span>` : ''}
        ${ct.email ? `<span class="aud-ct-email">${esc(ct.email)}</span>` : ''}
      </div>`).join('')}</div>`
      : '<div style="font-size:9px;color:var(--t4);padding:4px 0">No contacts yet</div>'}
    <div class="aud-co-expand-actions">
      <button class="btn sm" onclick="event.stopPropagation();audGenAngleForCo(${audIdJ},${slugJ})">✦ Gen angle</button>
      ${hasEmail ? `<button class="btn sm" onclick="event.stopPropagation();audDraftEmailToCo(${audIdJ},${slugJ})">✉ Draft email</button>` : ''}
    </div>
  </div>
</div>`;
}

/* ─── System audience detail helpers ───────────────────────── */

function getSystemAudienceCompanies(aud) {
  const targetType = aud.system_filter?.type;
  if (!targetType) return [];
  const all = window._oaState?.companies || S.companies || [];
  return [...all.filter(c => c.type === targetType)]
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
}

function renderSystemAudienceDetailHTML(aud, companies) {
  const audId = esc(aud.id);
  return `
<div class="aud-detail">
  <div class="aud-detail-header">
    <div class="aud-detail-title">
      <span class="aud-detail-name">${esc(aud.name)}</span>
      <span class="sys-badge">🔒 SYSTEM</span>
      <span class="aud-detail-toolbar-count">${companies.length} COMPANIES</span>
      <button class="btn sm" onclick="audCloseDetail()">✕</button>
    </div>
    ${aud.description ? `<div class="aud-detail-desc">${esc(aud.description)}</div>` : ''}
  </div>
  <div class="aud-co-list" id="aud-co-list-inner">
    ${companies.length === 0
      ? '<div class="aud-empty" style="padding:24px">No companies in this list yet.</div>'
      : companies.map(c => sysAudMemberRowHtml(c, aud)).join('')}
  </div>
  <div class="aud-add-wrap">
    <div style="position:relative">
      <input id="sys-aud-input" class="aud-input aud-add-search"
        placeholder="Add company…"
        oninput="sysAudSearchInput('${audId}',this.value)"
        autocomplete="off"/>
      <div id="sys-aud-suggest" class="sys-suggest-list" style="display:none"></div>
    </div>
  </div>
</div>`;
}

function sysAudMemberRowHtml(c, aud) {
  const slug = esc(c.id || _slug(c.name));
  const audId = esc(aud.id);
  const st = c.icp ? '★'.repeat(Math.min(5, Math.round(c.icp / 2))) : '';
  return `
<div class="aud-member-row">
  <span class="aud-co-name" style="cursor:pointer;flex:1" onclick="openBySlug('${slug}')">${esc(c.name)}</span>
  ${c.category ? `<span style="color:var(--t3);font-size:9px;font-family:'IBM Plex Mono',monospace">${esc(c.category)}</span>` : ''}
  ${st ? `<span class="aud-stars">${st}</span>` : ''}
  <button class="btn sm" style="margin-left:auto;color:var(--prc)" onclick="removeFromSystemAudience('${slug}','${audId}')">✕ Remove</button>
</div>`;
}

function getAudienceCompanies(aud) {
  if (aud.is_system) return getSystemAudienceCompanies(aud);
  if (!S.companies) return [];
  let list = [...S.companies];

  // company_ids takes priority (AI-built or manually curated)
  if (aud.company_ids && aud.company_ids.length > 0) {
    const idSet = new Set(aud.company_ids);
    list = list.filter(c => idSet.has(c.id) || idSet.has(_slug(c.name)));
  }

  // Always apply hard filters on top (in case DB drifted)
  const f = aud.filters || {};
  if (f.type) list = list.filter(c => c.type === f.type);
  if (f.region) list = list.filter(c => c.region === f.region);
  if (f.minIcp) list = list.filter(c => (c.icp || 0) >= f.minIcp);
  if (f.tags && f.tags.length > 0) {
    list = list.filter(c => {
      const ct = getCoTags(c);
      return f.tags.every(t => ct.includes(t));
    });
  }

  // Sort
  const sf = aud.sort_field || 'updated_at';
  list.sort((a, b) => {
    if (sf === 'name') return (a.name || '').localeCompare(b.name || '');
    if (sf === 'icp') return (b.icp || 0) - (a.icp || 0);
    if (sf === 'size') return sizeNum(b.size) - sizeNum(a.size);
    return new Date(b.updated_at || 0) - new Date(a.updated_at || 0);
  });

  return list;
}

function sizeNum(s) {
  if (!s) return 0;
  const n = parseInt(String(s).replace(/[^0-9]/g, ''));
  return isNaN(n) ? 0 : n;
}

function sortLabel(v) {
  return { updated_at: 'RECENTLY UPDATED', name: 'NAME A→Z', icp: 'ICP ↓', size: 'SIZE ↓' }[v] || v.toUpperCase();
}

function audCoRowHtml(c, aud) {
  const tc = tClass(c.type), tl = tLabel(c.type);
  const tags = getCoTags(c);
  const tagHtml = tags.slice(0, 3).map(t =>
    `<span class="c-tag-micro">${esc(t)}</span>`).join('');
  const st = c.icp ? '★'.repeat(Math.min(5, Math.round(c.icp / 2))) : '';
  const slug = c.id || _slug(c.name);

  return `
<div class="aud-co-row" onclick="openBySlug(${JSON.stringify(slug)})">
  <div class="aud-co-row-main">
    <span class="aud-co-name">${esc(c.name)}</span>
    <span class="tag ${tc}" style="font-size:7px">${esc(tl)}</span>
    ${st ? `<span class="aud-stars">${st}</span>` : ''}
  </div>
  <div class="aud-co-row-meta">
    ${c.hq_city ? `<span>📍${esc(c.hq_city)}</span>` : ''}
    ${c.size ? `<span>👥${esc(c.size)}</span>` : ''}
    ${c.category ? `<span>${esc(c.category)}</span>` : ''}
    ${tagHtml}
  </div>
  <div class="aud-co-row-actions">
    <button class="btn sm" onclick="event.stopPropagation();audToggleCo(${JSON.stringify(aud.id)},${JSON.stringify(slug)})">
      ${(aud.company_ids || []).includes(slug) ? '✓ PINNED' : '+ PIN'}
    </button>
    <button class="btn sm" onclick="event.stopPropagation();openBySlug(${JSON.stringify(slug)})">DETAIL →</button>
  </div>
</div>`;
}

/* ─── Modal ────────────────────────────────────────────────── */

/* ── Scout modal state ────────────────────────────────────── */
let _scoutResults    = [];
let _scoutExistingId = null;
let _gapLists        = { noContact: [], noDesc: [], noHq: [], noAngle: [] };

export function openAudienceModal(existingId) {
  _scoutExistingId = existingId || null;
  S._audienceBuiltIds = null;

  const existing = existingId ? S.audiences.find(a => a.id === existingId) : null;
  if (existing?.is_system) {
    clog('info', 'System audiences cannot be edited in Scout.');
    return;
  }

  const f     = existing?.filters || {};
  const isNew = !existingId;

  const allTags = [...new Set((S.companies || []).flatMap(c => getCoTags(c)))].sort();
  const tagCheckboxes = allTags.map(t => {
    const checked = (f.tags || []).includes(t) ? 'checked' : '';
    return `<label class="aud-tag-check"><input type="checkbox" value="${esc(t)}" ${checked}/> ${esc(t)}</label>`;
  }).join('');

  const typeOpts = ['', 'prospect', 'client', 'partner', 'poc', 'nogo']
    .map(v => `<option value="${v}" ${(f.type || '') === v ? 'selected' : ''}>${v || 'Any type'}</option>`).join('');
  const regionOpts = ['', 'EU', 'US', 'APAC', 'LATAM', 'GLOBAL']
    .map(v => `<option value="${v}" ${(f.region || '') === v ? 'selected' : ''}>${v || 'Any region'}</option>`).join('');

  const modal = document.getElementById('audience-modal');
  if (!modal) return;

  modal.innerHTML = `
<div class="aud-modal-overlay" onclick="if(event.target===this)audCloseModal()">
<div class="aud-modal-box scout-modal-box">
  <div class="aud-modal-head">
    <span class="aud-modal-title">${isNew ? '&#128270; SCOUT AUDIENCE' : 'EDIT AUDIENCE'}</span>
    <button class="btn sm" id="scout-close-btn">&#10005;</button>
  </div>
  <div class="scout-cols">
    <div class="scout-left">
      <div class="aud-form-row">
        <label class="aud-label">NAME</label>
        <input id="scout-name" class="aud-input" value="${esc(existing?.name || '')}" placeholder="e.g. EU DSP Prospects"/>
      </div>
      <div id="aud-ai-status" style="min-height:16px;margin-top:3px;font-family:'IBM Plex Mono',monospace;font-size:8px"></div>
    </div>

    <div class="aud-filters-section">
      <div class="aud-label" style="margin-bottom:6px;display:flex;align-items:center;gap:8px">FILTERS <span style="color:var(--t3);font-size:8px;font-weight:400;text-transform:none;letter-spacing:0">pre-filter for AI + permanent hard filter on audience</span><button class="btn sm" style="margin-left:auto" onclick="_audPreviewFilter()">🔍 SCOUT</button></div>
      <div class="aud-filter-row">
        <label class="aud-label" style="min-width:32px">TYPE</label>
        <select id="aud-f-type" class="aud-select">${typeOpts}</select>
        <label class="aud-label" style="min-width:44px">REGION</label>
        <select id="aud-f-region" class="aud-select">${regionOpts}</select>
        <label class="aud-label" style="min-width:48px">MIN ICP</label>
        <input id="aud-f-icp" class="aud-input" style="width:48px" type="number" min="1" max="10" value="${esc(f.minIcp || '')}" placeholder="1–10"/>
      </div>
      <div class="aud-form-row">
        <label class="aud-label">ICP SCOUT PROMPT <span style="color:var(--t3);font-size:8px;font-weight:400;text-transform:none;letter-spacing:0">&#8212; optional AI filter on top of hard filters</span></label>
        <div style="display:flex;gap:6px">
          <input id="scout-prompt" class="aud-input" style="flex:1" value="${esc(existing?.icp_prompt || existing?.filters?.icp_prompt || '')}" placeholder="e.g. EU DSPs with CTV and cookieless interest"/>
          <button class="btn sm p" id="scout-run-btn">&#128270; SCOUT</button>
        </div>
        <div id="scout-status" style="min-height:14px;font-family:'IBM Plex Mono',monospace;font-size:8px;color:var(--t3);margin-top:2px"></div>
      </div>
      <div class="aud-filters-section">
        <div class="aud-label" style="margin-bottom:6px">FILTERS</div>
        <div class="aud-filter-row">
          <label class="aud-label" style="min-width:32px">TYPE</label>
          <select id="scout-f-type" class="aud-select">${typeOpts}</select>
          <label class="aud-label" style="min-width:44px">REGION</label>
          <select id="scout-f-region" class="aud-select">${regionOpts}</select>
          <label class="aud-label" style="min-width:48px">MIN ICP</label>
          <input id="scout-f-icp" class="aud-input" style="width:48px" type="number" min="1" max="10" value="${esc(f.minIcp || '')}" placeholder="1&#8211;10"/>
        </div>
        <div class="aud-filter-row" style="flex-wrap:wrap;gap:4px;margin-top:6px">
          <label class="aud-label" style="width:100%;margin-bottom:2px">TAGS</label>
          ${tagCheckboxes || '<span style="font-family:\'IBM Plex Mono\',monospace;font-size:8px;color:var(--t4)">No tags</span>'}
        </div>
      </div>
      <div class="aud-form-row">
        <label class="aud-label">&#10022; OUTREACH HOOK</label>
        <textarea id="scout-hook" class="aud-input aud-textarea" rows="2" placeholder="2-sentence outreach angle&#8230;">${esc(existing?.outreach_hook || '')}</textarea>
      </div>
      <div class="aud-form-row">
        <label class="aud-label">SORT</label>
        <select id="scout-sort" class="aud-select">
          <option value="updated_at" ${(!existing?.sort_field || existing.sort_field === 'updated_at') ? 'selected' : ''}>RECENTLY UPDATED</option>
          <option value="name" ${existing?.sort_field === 'name' ? 'selected' : ''}>NAME A&#8594;Z</option>
          <option value="icp" ${existing?.sort_field === 'icp' ? 'selected' : ''}>ICP &#8595;</option>
          <option value="size" ${existing?.sort_field === 'size' ? 'selected' : ''}>SIZE &#8595;</option>
        </select>
      </div>
      <div class="scout-footer-bar">
        <button class="btn p" id="scout-save-btn">${isNew ? '&#128190; Save Audience' : '&#128190; Save Changes'}</button>
        <button class="btn" id="scout-cancel-btn">Cancel</button>
        ${!isNew ? `<button class="btn" id="scout-delete-btn" style="margin-left:auto;color:var(--prc);border-color:var(--prr)">DELETE</button>` : ''}
        <div id="scout-err" style="width:100%;color:var(--prc);font-family:'IBM Plex Mono',monospace;font-size:8px;min-height:12px;margin-top:2px"></div>
      </div>
    </div>

    <div class="aud-form-row">
      <label class="aud-label">SORT</label>
      <select id="aud-sort" class="aud-select">
        <option value="updated_at" ${(!existing?.sort_field || existing.sort_field === 'updated_at') ? 'selected' : ''}>RECENTLY UPDATED</option>
        <option value="name" ${existing?.sort_field === 'name' ? 'selected' : ''}>NAME A→Z</option>
        <option value="icp" ${existing?.sort_field === 'icp' ? 'selected' : ''}>ICP ↓</option>
        <option value="size" ${existing?.sort_field === 'size' ? 'selected' : ''}>SIZE ↓</option>
      </select>
    </div>

    <div id="aud-preview" class="aud-preview"></div>

    <div class="aud-modal-foot">
      <button class="btn p" onclick="audSave('${esc(existingId || '')}')">SAVE AUDIENCE</button>
      <button class="btn" onclick="audCloseModal()">CANCEL</button>
      ${existing ? `<button class="btn" onclick="audDelete('${esc(existingId)}')" style="margin-left:auto;color:var(--prc);border-color:var(--prr)">DELETE</button>` : ''}
      <div id="aud-save-err" style="width:100%;color:var(--prc);font-family:'IBM Plex Mono',monospace;font-size:8px;margin-top:4px;display:none"></div>
    </div>
  </div>
</div></div>`;

  // No auto-preview on filter change — preview only fires when user clicks SCOUT
}

async function _scoutRun() {
  // Fix 3 — guard: retry if company list not yet loaded
  if (!S.companies?.length) {
    const statusEl = document.getElementById('scout-status');
    if (statusEl) statusEl.textContent = '⟳ Waiting for data…';
    setTimeout(_scoutRun, 1000);
    return;
  }

  const type   = document.getElementById('scout-f-type')?.value   || '';
  const region = document.getElementById('scout-f-region')?.value || '';
  const minIcp = parseInt(document.getElementById('scout-f-icp')?.value) || 0;
  const tags   = [...document.querySelectorAll('.aud-tag-check input:checked')].map(el => el.value);
  const prompt = document.getElementById('scout-prompt')?.value?.trim() || '';

  const statusEl = document.getElementById('scout-status');
  const bodyEl   = document.getElementById('scout-a-body');
  const countEl  = document.getElementById('scout-a-count');
  if (!bodyEl) return;

  // Hard filter
  let list = S.companies || [];
  if (type)        list = list.filter(c => c.type === type);
  if (region)      list = list.filter(c => c.region === region);
  if (minIcp)      list = list.filter(c => (c.icp || 0) >= minIcp);
  if (tags.length) list = list.filter(c => tags.every(t => getCoTags(c).includes(t)));

  // Optional AI filter when prompt is given
  if (prompt && list.length > 0) {
    if (statusEl) statusEl.textContent = '⟳ AI filtering…';
    bodyEl.innerHTML = '<div class="scout-running">&#9889; AI is scanning your DB&#8230;</div>';
    try {
      const coList = list.map(c =>
        `${c.name}|${getCoTags(c).join(',')}|ICP:${c.icp || '?'}|${c.type || ''}|${(c.description || '').slice(0, 80)}`
      ).join('\n');
      const res = await anthropicFetch({
        model: MODEL_CREATIVE,
        max_tokens: 800,
        messages: [{ role: 'user', content:
          `You are filtering a B2B CRM for onAudience (EU first-party data provider).\nTarget: "${prompt}"\nReturn a JSON array of company names that best match — be selective.\nCompanies (name|tags|icp|type|description):\n${coList}\n\nReturn ONLY a raw JSON array of matching company names.` }],
      });
      const raw  = res.content?.[0]?.text?.trim() || '[]';
      const m    = raw.match(/\[[\s\S]*\]/);
      const names = m ? JSON.parse(m[0]) : [];
      const nameSet = new Set(names.map(n => String(n).toLowerCase()));
      list = list.filter(c => nameSet.has(c.name.toLowerCase()));
      if (statusEl) statusEl.textContent = `✓ AI matched ${list.length}`;
    } catch (e) {
      if (statusEl) statusEl.textContent = '⚠ AI filter failed — showing filter results';
    }
  } else {
    if (statusEl) statusEl.textContent = list.length
      ? `${list.length} match${list.length !== 1 ? 'es' : ''}`
      : 'No matches — relax filters';
  }

  _scoutResults = list;
  const existingIds = new Set(_scoutExistingId
    ? (S.audiences.find(a => a.id === _scoutExistingId)?.company_ids || [])
    : []);

  if (countEl) countEl.textContent = `(${list.length})`;
  if (list.length === 0) {
    bodyEl.innerHTML = '<div class="scout-empty">No companies match — try relaxing filters</div>';
  } else {
    bodyEl.innerHTML = list.map(c => {
      const cid   = c.id || _slug(c.name);
      const chk   = existingIds.has(cid) ? 'checked' : '';
      const chips = getCoTags(c).slice(0, 3).map(t => `<span class="scout-tag">${esc(t)}</span>`).join('');
      const score = c.icp
        ? `<span class="icp-score ${c.icp >= 7 ? 'hi' : c.icp >= 4 ? 'mid' : 'lo'}">${c.icp}</span>`
        : '';
      return `<label class="scout-company-row"><input type="checkbox" class="scout-cb" value="${esc(cid)}" ${chk}/>${score}<span class="icp-name">${esc(c.name)}</span><span class="icp-cat">${esc(tLabel(c.type))}</span>${chips}</label>`;
    }).join('');
  }

  // Section B — gaps (fire-and-forget; _renderGaps updates #scout-b-body when ready)
  _renderGaps(list);
}

function _scoutToggleAll(checked) {
  document.querySelectorAll('#scout-a-body .scout-cb').forEach(cb => { cb.checked = checked; });
}

async function _scoutSave(existingId) {
  const name  = document.getElementById('scout-name')?.value?.trim();
  const errEl = document.getElementById('scout-err');
  if (!name) { if (errEl) errEl.textContent = 'Name required'; return; }
  if (errEl) errEl.textContent = '';

  const desc      = document.getElementById('scout-desc')?.value?.trim()    || '';
  const prompt    = document.getElementById('scout-prompt')?.value?.trim()   || '';
  const hook      = document.getElementById('scout-hook')?.value?.trim()     || '';
  const sortField = document.getElementById('scout-sort')?.value             || 'updated_at';
  const type      = document.getElementById('scout-f-type')?.value           || '';
  const region    = document.getElementById('scout-f-region')?.value         || '';
  const minIcp    = parseInt(document.getElementById('scout-f-icp')?.value)   || 0;
  const tags      = [...document.querySelectorAll('.aud-tag-check input:checked')].map(el => el.value);

  const checkedIds = [...document.querySelectorAll('#scout-a-body .scout-cb:checked')].map(cb => cb.value);
  const companyIds = checkedIds.length > 0 ? checkedIds
    : _scoutResults.length > 0 ? _scoutResults.map(c => c.id || _slug(c.name))
    : (S.companies || []).map(c => c.id || _slug(c.name));

  const filters = { type: type || null, region: region || null, minIcp: minIcp || null, tags, icp_prompt: prompt || null };

  try {
    if (existingId) {
      const res = await fetch(`${SB_URL}/rest/v1/audiences?id=eq.${encodeURIComponent(existingId)}`, {
        method: 'PATCH',
        headers: authHdr(),
        body: JSON.stringify({
          name, description: desc || null, outreach_hook: hook || null,
          filters, icp_prompt: prompt || null, sort_field: sortField,
          company_ids: companyIds, updated_at: new Date().toISOString(),
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const aud = S.audiences.find(a => a.id === existingId);
      if (aud) Object.assign(aud, { name, description: desc, outreach_hook: hook || null, filters, icp_prompt: prompt || null, sort_field: sortField, company_ids: companyIds });
      audCloseModal();
      await renderAudiencesPanel();
      if (S.activeAudience?.id === existingId) renderAudienceDetail(existingId);
      clog('db', `Audience updated: <b>${esc(name)}</b>`);
    } else {
      const id = `aud-${Date.now()}`;
      await sbSaveAudience({ id, name, description: desc || null, company_ids: companyIds, filters, icp_prompt: prompt || null, outreach_hook: hook || null, sort_field: sortField, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
      audCloseModal();
      await renderAudiencesPanel();
      audOpen(id);
      const toast = document.createElement('div');
      toast.className = 'icp-toast';
      toast.textContent = `✓ ${name} saved — ${companyIds.length} companies`;
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
      clog('db', `Audience saved: <b>${esc(name)}</b> (${companyIds.length} companies)`);
    }
  } catch (e) {
    if (errEl) errEl.textContent = 'Save failed: ' + e.message;
    clog('db', `Audience save error: ${esc(e.message)}`);
  }
}

async function _scoutFindSimilar() {
  const prompt = document.getElementById('scout-prompt')?.value?.trim()
    || document.getElementById('scout-name')?.value?.trim() || '';
  const cBody  = document.getElementById('scout-c-body');
  if (!cBody) return;
  if (!prompt) {
    cBody.innerHTML = '<div class="scout-empty">Add a Scout Prompt or Name first</div>';
    return;
  }

  cBody.innerHTML = '<div class="scout-running">&#9889; Searching for similar companies&#8230;</div>';
  const existingNames = new Set((S.companies || []).map(c => c.name.toLowerCase()));
  const exclude = (S.companies || []).slice(0, 40).map(c => c.name).join(', ');

  try {
    const res = await anthropicFetch({
      model: MODEL_CREATIVE,
      max_tokens: 600,
      tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 3 }],
      messages: [{ role: 'user', content:
        `Find 8–10 real companies matching: "${prompt}" — for onAudience EU first-party data partnerships (DSPs, SSPs, agencies, data providers).\nExclude these already in CRM: ${exclude}\nReturn JSON array: [{"name":"...","category":"...","hq":"...","why":"..."}]. Real companies only.` }],
    });
    const raw  = res.content?.find(b => b.type === 'text')?.text?.trim() || '[]';
    const m    = raw.match(/\[[\s\S]*\]/);
    const candidates = m ? JSON.parse(m[0]) : [];
    if (!candidates.length) {
      cBody.innerHTML = '<div class="scout-empty">No new candidates found — try a different prompt</div>';
      return;
    }
    cBody.innerHTML = candidates.map(c => {
      const inDb = existingNames.has((c.name || '').toLowerCase());
      return `<div class="scout-candidate-row${inDb ? ' scout-candidate-exists' : ''}"><span class="icp-name">${esc(c.name || '?')}${inDb ? ' <span style="color:var(--t4)">(in DB)</span>' : ''}</span><span class="icp-cat">${esc(c.category || '')}${c.hq ? ' \xb7 ' + esc(c.hq) : ''}</span><span class="icp-reason">${esc(c.why || '')}</span></div>`;
    }).join('');
  } catch (e) {
    cBody.innerHTML = `<div class="scout-empty">Search failed: ${esc(e.message)}</div>`;
  }
}

/* ── Gap filler ─────────────────────────────────────────────── */

async function _renderGaps(list) {
  const bBody = document.getElementById('scout-b-body');
  if (!bBody) return;
  bBody.innerHTML = '<div class="scout-running">&#9889; Computing gaps&#8230;</div>';

  // Fast local gaps
  const noDesc  = list.filter(c => !c.description?.trim());
  const noHq    = list.filter(c => !c.hq_city?.trim());
  const noAngle = list.filter(c => !c.outreach_angle?.trim());

  // Contacts gap via Supabase for accuracy
  const allIds = list.map(c => c.id || _slug(c.name)).filter(Boolean);
  let noContact = list;
  if (allIds.length) {
    try {
      const res = await fetch(
        `${SB_URL}/rest/v1/contacts?select=company_id&company_id=in.(${allIds.join(',')})`,
        { headers: authHdr() }
      );
      if (res.ok) {
        const rows = await res.json();
        const withContact = new Set(rows.map(r => r.company_id));
        noContact = list.filter(c => !withContact.has(c.id || _slug(c.name)));
      }
    } catch {
      noContact = list.filter(c => !S.contacts?.some(ct => ct.company_id === (c.id || _slug(c.name))));
    }
  }

  _gapLists = { noContact, noDesc, noHq, noAngle };

  const row = (icon, label, n, key, btnLabel) =>
    `<div class="scout-gap-row" style="display:flex;align-items:center;gap:6px">
      <span>${icon}</span>
      <span style="flex:1">${label}</span>
      <span id="scout-gap-cnt-${key}" style="font-family:'IBM Plex Mono',monospace;font-size:9px;color:var(--t3);min-width:18px;text-align:right">${n}</span>
      ${n > 0 ? `<button class="btn sm" id="scout-gap-btn-${key}">${btnLabel}</button>` : `<span style="font-size:9px;color:var(--gr)">&#10003;</span>`}
      <span id="scout-gap-prog-${key}" style="font-family:'IBM Plex Mono',monospace;font-size:8px;color:var(--t3)"></span>
    </div>`;

  bBody.innerHTML =
    row('👤', 'No contacts',        noContact.length, 'contact', 'FIND CONTACTS &#9654;') +
    row('📝', 'No description',     noDesc.length,    'desc',    'ENRICH &#9654;') +
    row('📍', 'No HQ city',         noHq.length,      'hq',      'GEOCODE &#9654;') +
    row('💡', 'No outreach angle',  noAngle.length,   'angle',   'GEN ANGLES &#9654;');

  document.getElementById('scout-gap-btn-contact')?.addEventListener('click', _gapFindContacts);
  document.getElementById('scout-gap-btn-desc')?.addEventListener('click',    _gapEnrichDesc);
  document.getElementById('scout-gap-btn-hq')?.addEventListener('click',      _gapGeocode);
  document.getElementById('scout-gap-btn-angle')?.addEventListener('click',   _gapGenAngles);
}

function _gapFindContacts() {
  const names = _gapLists.noContact.map(c => c.name).join(', ');
  const prompt = `Find decision makers at these companies: ${names}. Use the linkedin-lookup skill.`;
  navigator.clipboard?.writeText(prompt).catch(() => {});
  window.open('https://claude.ai/new', '_blank');
  clog('db', `Prompt copied — finding contacts for ${_gapLists.noContact.length} companies`);
}

function _gapEnrichDesc() {
  if (!_gapLists.noDesc.length) return;
  window.enrFilteredIds = new Set(_gapLists.noDesc.map(c => c.id || _slug(c.name)));
  audCloseModal();
  window.switchTab?.('enricher');
  clog('db', `Enricher queued: ${_gapLists.noDesc.length} companies need description`);
}

function _gapGeocode() {
  if (!_gapLists.noHq.length) return;
  window.enrFilteredIds = new Set(_gapLists.noHq.map(c => c.id || _slug(c.name)));
  audCloseModal();
  window.switchTab?.('enricher');
  clog('db', `Enricher queued: ${_gapLists.noHq.length} companies need HQ city`);
}

async function _gapGenAngles() {
  const companies = _gapLists.noAngle;
  if (!companies.length) return;
  const progEl = document.getElementById('scout-gap-prog-angle');
  const cntEl  = document.getElementById('scout-gap-cnt-angle');
  const btn    = document.getElementById('scout-gap-btn-angle');
  if (btn) btn.disabled = true;

  const BATCH = 3;
  let done = 0;
  for (let i = 0; i < companies.length; i += BATCH) {
    if (progEl) progEl.textContent = `Generating… ${done} / ${companies.length}`;
    await Promise.all(companies.slice(i, i + BATCH).map(async c => {
      try {
        const res = await anthropicFetch({
          model: MODEL_CREATIVE, max_tokens: 120,
          messages: [{ role: 'user', content:
            `Write a 2-sentence outreach angle for selling audience data to ${c.name} (${c.category || 'unknown'}): ${c.description || 'no description'}. Be specific and direct.` }],
        });
        const angle = res.content?.[0]?.text?.trim();
        if (!angle) return;
        c.outreach_angle = angle;
        const sc = S.companies.find(co => (co.id || _slug(co.name)) === (c.id || _slug(c.name)));
        if (sc) sc.outreach_angle = angle;
        await fetch(`${SB_URL}/rest/v1/companies?id=eq.${encodeURIComponent(c.id || _slug(c.name))}`, {
          method: 'PATCH',
          headers: authHdr({ 'Prefer': 'return=minimal' }),
          body: JSON.stringify({ outreach_angle: angle }),
        }).catch(() => {});
        done++;
      } catch { /* skip */ }
    }));
  }

  _gapLists.noAngle = _scoutResults.filter(c => !c.outreach_angle?.trim());
  if (cntEl)  cntEl.textContent  = _gapLists.noAngle.length;
  if (progEl) progEl.textContent = `&#10003; ${done}/${companies.length} done`;
  if (btn)  { btn.disabled = false; btn.textContent = '&#8635; REGEN &#9654;'; }
  clog('db', `Generated ${done} outreach angles`);
}

async function _gapFillAll() {
  if (_gapLists.noContact.length) _gapFindContacts();
  if (_gapLists.noAngle.length)   await _gapGenAngles();
  if (_gapLists.noDesc.length || _gapLists.noHq.length) {
    const combined = [...new Set(
      [..._gapLists.noDesc, ..._gapLists.noHq].map(c => c.id || _slug(c.name))
    )];
    window.enrFilteredIds = new Set(combined);
    audCloseModal();
    window.switchTab?.('enricher');
  }
}


export function audCloseModal() {
  const modal = document.getElementById('audience-modal');
  if (modal) { modal.innerHTML = ''; modal.style.display = ''; }
}

/* ── Audience map view ────────────────────────────────────── */

export function toggleAudienceMap(view) {
  const listWrap = document.getElementById('aud-co-list-wrap');
  const mapWrap  = document.getElementById('aud-map-wrap');
  const btnList  = document.getElementById('aud-toggle-list');
  const btnMap   = document.getElementById('aud-toggle-map');
  if (!listWrap || !mapWrap) return;

  if (view === 'map') {
    listWrap.style.display = 'none';
    mapWrap.style.display  = 'flex';
    btnList?.classList.remove('active');
    btnMap?.classList.add('active');
    _initAudMap(_audMapMembers);
  } else {
    mapWrap.style.display  = 'none';
    listWrap.style.display = '';
    btnList?.classList.add('active');
    btnMap?.classList.remove('active');
    if (_audMap) { _audMap.remove(); _audMap = null; }
  }
}

function _addAudMarker(cluster, c, lat, lng) {
  const av = getAv(c.name);
  const initials = ini(c.name);
  const slug = c.id || _slug(c.name);
  const icon = L.divIcon({
    html: `<div style="background:${av.bg};color:${av.fg};width:28px;height:28px;border-radius:4px;display:flex;align-items:center;justify-content:center;font-family:'IBM Plex Mono',monospace;font-size:9px;font-weight:600;border:1px solid ${av.fg}33;box-shadow:0 1px 4px rgba(0,0,0,.2)">${esc(initials)}</div>`,
    className: '',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
  const marker = L.marker([lat, lng], { icon });
  const tl = tLabel(c.type);
  marker.bindPopup(`
    <div style="font-family:'IBM Plex Sans',sans-serif;font-size:11px;min-width:140px;line-height:1.5">
      <div style="font-weight:600;margin-bottom:2px">${esc(c.name)}</div>
      <div style="color:#888;font-size:10px">${esc(tl)}${c.icp ? ` · ICP ${c.icp}` : ''}</div>
      <a href="#" onclick="event.preventDefault();openCompany(${JSON.stringify(slug)})" style="font-size:10px;color:#178066;text-decoration:none">Open →</a>
    </div>`);
  cluster.addLayer(marker);
}

function _initAudMap(members) {
  if (_audMap) return;

  _audMap = L.map('aud-map').setView([30, 10], 2);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 18,
  }).addTo(_audMap);

  const cluster = L.markerClusterGroup();
  _audMap.addLayer(cluster);

  const cityCounts = {};
  let geocodeDelay = 0;

  members.forEach(c => {
    if (c.hq_lat && c.hq_lng) {
      if (c.hq_city) cityCounts[c.hq_city] = (cityCounts[c.hq_city] || 0) + 1;
      _addAudMarker(cluster, c, c.hq_lat, c.hq_lng);
    } else if (c.hq_city) {
      cityCounts[c.hq_city] = (cityCounts[c.hq_city] || 0) + 1;
      geocodeDelay += 1100;
      setTimeout(async () => {
        const coords = await geocodeCity(c.hq_city);
        if (coords) {
          c.hq_lat = coords.lat;
          c.hq_lng = coords.lng;
          await saveGeocode(c.id || _slug(c.name), coords.lat, coords.lng);
          _addAudMarker(cluster, c, coords.lat, coords.lng);
          clog('enrich', 'geocoded: ' + c.name);
        }
      }, geocodeDelay);
    }
  });

  const geoList = document.getElementById('aud-geo-list');
  if (geoList) {
    const sorted = Object.entries(cityCounts).sort((a, b) => b[1] - a[1]);
    geoList.innerHTML = sorted.map(([city, n]) =>
      `<div class="aud-map-geo-row"><span>${esc(city)}</span><span>${n}</span></div>`
    ).join('') || `<div style="color:var(--t4);font-size:8px">No location data</div>`;
  }

  setTimeout(() => _audMap?.invalidateSize(), 100);
}

function _audPreviewFilter() {
  const type = document.getElementById('aud-f-type')?.value || '';
  const region = document.getElementById('aud-f-region')?.value || '';
  const minIcp = parseInt(document.getElementById('aud-f-icp')?.value) || 0;
  const tags = [...document.querySelectorAll('.aud-tag-check input:checked')].map(el => el.value);

  let list = S.companies || [];
  if (type) list = list.filter(c => c.type === type);
  if (region) list = list.filter(c => c.region === region);
  if (minIcp) list = list.filter(c => (c.icp || 0) >= minIcp);
  if (tags.length) list = list.filter(c => tags.every(t => getCoTags(c).includes(t)));

  const preview = document.getElementById('aud-preview');
  if (!preview) return;

  if (!type && !region && !minIcp && !tags.length) {
    preview.innerHTML = '';
    return;
  }
  if (list.length === 0) {
    preview.innerHTML = `<div class="aud-preview-head">NO MATCHES WITH CURRENT FILTERS</div>`;
    return;
  }
  const shown = list.slice(0, 6);
  const more = list.length - shown.length;
  preview.innerHTML = `
<div class="aud-preview-head">FILTER PREVIEW: ${list.length} MATCH${list.length !== 1 ? 'ES' : ''}</div>
${shown.map(c => `
<div class="aud-preview-row">
  <span>${esc(c.name)}</span>
  <span class="tag ${tClass(c.type)}" style="font-size:7px">${esc(tLabel(c.type))}</span>
  ${c.hq_city ? `<span style="color:var(--t3);font-size:9px">${esc(c.hq_city)}</span>` : ''}
  ${c.icp ? `<span style="color:var(--t3);font-size:9px">ICP ${c.icp}</span>` : ''}
</div>`).join('')}
${more > 0 ? `<div class="aud-preview-more">+${more} MORE</div>` : ''}`;
}

/* ─── AI Build ─────────────────────────────────────────────── */

export async function audAIBuild() {
  const prompt = document.getElementById('aud-ai-prompt')?.value?.trim();
  if (!prompt) return;

  const statusEl = document.getElementById('aud-ai-status');
  const setStatus = msg => { if (statusEl) statusEl.innerHTML = msg; };
  setStatus(`<span style="color:var(--t2)">⟳ Querying DB…</span>`);

  // Read active hard filters
  const type = document.getElementById('aud-f-type')?.value || '';
  const region = document.getElementById('aud-f-region')?.value || '';
  const minIcp = parseInt(document.getElementById('aud-f-icp')?.value) || 0;
  const activeTags = [...document.querySelectorAll('.aud-tag-check input:checked')].map(el => el.value);

  // Pre-filter candidates
  let candidates = S.companies || [];
  if (type) candidates = candidates.filter(c => c.type === type);
  if (region) candidates = candidates.filter(c => c.region === region);
  if (minIcp) candidates = candidates.filter(c => (c.icp || 0) >= minIcp);
  if (activeTags.length) candidates = candidates.filter(c =>
    activeTags.every(t => getCoTags(c).includes(t)));

  // Compact DB summary for Claude (max 200 companies)
  const dbSummary = candidates.slice(0, 200).map(c => ({
    id: c.id || _slug(c.name),
    name: c.name,
    type: c.type,
    category: c.category,
    region: c.region,
    hq_city: c.hq_city,
    size: c.size,
    icp: c.icp,
    tags: getCoTags(c),
    note: (c.note || '').substring(0, 80),
    description: (c.description || '').substring(0, 100),
    tech: Array.isArray(c.tech_stack)
      ? c.tech_stack.slice(0, 4).map(t => (typeof t === 'string' ? t : t?.tool || '')).filter(Boolean)
      : []
  }));

  const system = `You are an audience-building AI for onAudience sales intelligence.
Given a target audience description and a list of companies from the CRM, identify which companies best match.
Return ONLY raw JSON — no markdown, no explanation:
{"company_ids":["id1","id2",...],"name":"suggested short name","description":"1 sentence","reasoning":"brief rationale (max 30 words)"}
Be selective — 10–30 great matches beats 60 mediocre ones.
Filters (type/region/tags) are already applied to the candidate list — treat them as confirmed context.
DB has ${candidates.length} candidates after pre-filtering.`;

  const userMsg = `Target audience: "${prompt}"
Active filters: type=${type || 'any'}, region=${region || 'any'}, minIcp=${minIcp || 'none'}, tags=[${activeTags.join(',')}]

Companies (compact JSON):
${JSON.stringify(dbSummary).substring(0, 14000)}

Return JSON only.`;

  try {
    setStatus(`<span style="color:var(--poc)">⟳ AI matching ${candidates.length} companies…</span>`);
    const data = await anthropicFetch({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      system,
      messages: [{ role: 'user', content: userMsg }]
    });
    const text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
    const clean = text.replace(/```json|```/g, '').trim();
    const objMatch = clean.match(/\{[\s\S]*\}/);
    if (!objMatch) throw new Error('No JSON in response');
    const result = JSON.parse(objMatch[0]);

    S._audienceBuiltIds = result.company_ids || [];
    const matched = S._audienceBuiltIds.map(id =>
      candidates.find(c => (c.id || _slug(c.name)) === id)).filter(Boolean);

    // Auto-fill name/desc if empty
    if (result.name && !document.getElementById('aud-name')?.value) {
      const el = document.getElementById('aud-name');
      if (el) el.value = result.name;
    }
    if (result.description && !document.getElementById('aud-desc')?.value) {
      const el = document.getElementById('aud-desc');
      if (el) el.value = result.description;
    }

    setStatus(`<span style="color:var(--cc)">✓ ${matched.length} companies matched</span>`);

    const preview = document.getElementById('aud-preview');
    if (preview) {
      preview.innerHTML = `
<div class="aud-preview-head">AI MATCHED: ${matched.length} COMPANIES</div>
${result.reasoning ? `<div style="font-family:'IBM Plex Sans',sans-serif;font-size:10px;color:var(--t3);font-style:italic;margin-bottom:6px">${esc(result.reasoning)}</div>` : ''}
${matched.slice(0, 8).map(c => `
<div class="aud-preview-row">
  <span>${esc(c.name)}</span>
  <span class="tag ${tClass(c.type)}" style="font-size:7px">${esc(tLabel(c.type))}</span>
  ${c.category ? `<span style="color:var(--t3);font-size:9px">${esc(c.category)}</span>` : ''}
  ${c.icp ? `<span style="color:var(--t3);font-size:9px">ICP ${c.icp}</span>` : ''}
</div>`).join('')}
${matched.length > 8 ? `<div class="aud-preview-more">+${matched.length - 8} MORE</div>` : ''}`;
    }
    clog('ai', `Audience AI build: "${esc(prompt.slice(0, 40))}" → <b>${matched.length}</b> matches`);
  } catch (e) {
    setStatus(`<span style="color:var(--prc)">✕ ${esc(e.message)}</span>`);
    clog('ai', `Audience AI build error: ${esc(e.message)}`);
  }
}

/* ─── Save ──────────────────────────────────────────────────── */

function _audErr(msg) {
  const el = document.getElementById('aud-save-err');
  if (el) { el.textContent = msg; el.style.display = msg ? 'block' : 'none'; }
}

export async function audSave(existingId) {
  _audErr('');
  const name = document.getElementById('aud-name')?.value?.trim();
  if (!name) { _audErr('Name required'); return; }

  const type = document.getElementById('aud-f-type')?.value || '';
  const region = document.getElementById('aud-f-region')?.value || '';
  const minIcp = parseInt(document.getElementById('aud-f-icp')?.value) || 0;
  const tags = [...document.querySelectorAll('.aud-tag-check input:checked')].map(el => el.value);
  const sortField = document.getElementById('aud-sort')?.value || 'updated_at';
  const desc = document.getElementById('aud-desc')?.value?.trim() || '';

  try {
    // company_ids: AI-built takes priority, else derive from filters
    let companyIds = S._audienceBuiltIds;
    if (!companyIds || companyIds.length === 0) {
      let list = (window._oaState?.companies) || S.companies || [];
      if (type) list = list.filter(c => c.type === type);
      if (region) list = list.filter(c => c.region === region);
      if (minIcp) list = list.filter(c => (c.icp || 0) >= minIcp);
      if (tags.length) list = list.filter(c => tags.every(t => getCoTags(c).includes(t)));
      companyIds = list.map(c => c.id || _slug(c.name));
    }
    S._audienceBuiltIds = null;

    const id = existingId || `aud-${Date.now()}`;
    const payload = {
      id,
      name,
      description: desc,
      company_ids: companyIds,
      filters: { type: type || null, region: region || null, minIcp: minIcp || null, tags },
      sort_field: sortField,
      updated_at: new Date().toISOString()
    };
    if (!existingId) payload.created_at = new Date().toISOString();

    await sbSaveAudience(payload);
    audCloseModal();
    await renderAudiencesPanel();
    audOpen(id);
    clog('db', `Audience saved: <b>${esc(name)}</b> (${companyIds.length} companies)`);
  } catch (e) {
    _audErr('Save failed: ' + e.message);
    clog('db', `Audience save error: ${esc(e.message)}`);
  }
}

/* ─── Actions ───────────────────────────────────────────────── */

export function audOpen(id) {
  S.activeAudience = S.audiences.find(a => a.id === id) || null;
  // Highlight row in left panel
  document.querySelectorAll('.aud-row').forEach(el => el.classList.remove('aud-row-active'));
  const rows = document.querySelectorAll('.aud-row');
  rows.forEach(el => {
    if (el.getAttribute('onclick')?.includes(JSON.stringify(id)))
      el.classList.add('aud-row-active');
  });
  renderAudienceDetail(id);
}

export function audCloseDetail() {
  if (_audMap) { _audMap.remove(); _audMap = null; }
  S.activeAudience = null;
  const wrap = document.getElementById('aud-detail-wrap');
  if (wrap) wrap.style.display = 'none';
  const es = document.getElementById('emptyState');
  if (es) es.style.display = 'flex';
  document.querySelectorAll('.aud-row').forEach(el => el.classList.remove('aud-row-active'));
}

export function audNew() {
  S._audienceBuiltIds = null;
  openAudienceModal(null);
}

export function audEdit(id) {
  const aud = S.audiences.find(a => a.id === id);
  if (!aud) return;
  if (aud.outreach_hook || aud.filters?.icp_prompt || aud.icp_prompt) {
    icpEditModal(id);
  } else {
    S._audienceBuiltIds = null;
    openAudienceModal(id);
  }
}

export async function audDelete(id) {
  const aud = S.audiences.find(a => a.id === id);
  if (!confirm(`Delete audience "${aud?.name || id}"? Companies are not affected.`)) return;
  try {
    await sbDeleteAudience(id);
    if (S.activeAudience?.id === id) audCloseDetail();
    await renderAudiencesPanel();
    clog('db', `Audience deleted: ${esc(id)}`);
  } catch (e) {
    alert('Delete failed: ' + e.message);
  }
}

export async function audToggleCo(audienceId, companyId) {
  const aud = S.audiences.find(a => a.id === audienceId);
  if (!aud) return;
  const ids = Array.isArray(aud.company_ids) ? [...aud.company_ids] : [];
  const idx = ids.indexOf(companyId);
  if (idx >= 0) ids.splice(idx, 1); else ids.push(companyId);
  aud.company_ids = ids;
  try {
    await sbSaveAudience(aud);
    renderAudienceDetail(audienceId);
    // Refresh left panel count
    document.querySelector(`.aud-row-head .aud-row-count`) &&
      renderAudiencesPanel();
  } catch (e) {
    clog('db', `Toggle co error: ${esc(e.message)}`);
  }
}

/* ─── System audience membership (type-sync) ───────────────── */

export async function sysCoSetType(companyId, targetType) {
  const all = window._oaState?.companies || S.companies || [];
  const co = all.find(c => c.id === companyId || _slug(c.name) === companyId);
  if (!co) return;
  const sysTypes = { client: 'Clients', partner: 'Partners', nogo: 'NoOutreach' };
  if (targetType !== 'prospect' && sysTypes[co.type] && co.type !== targetType) {
    if (!confirm(`This will move "${co.name}" from ${sysTypes[co.type]} → ${sysTypes[targetType]}. Continue?`)) return;
  }
  try {
    await sbPatchCompanyType(companyId, targetType);
    co.type = targetType;
    if (window.currentCompany?.id === companyId || _slug(window.currentCompany?.name || '') === companyId) {
      window.currentCompany.type = targetType;
      window.openCompany?.(window.currentCompany);
    }
    if (S.activeAudience?.is_system) renderAudienceDetail(S.activeAudience.id);
    clog('db', `<b>${esc(co.name)}</b> type → ${targetType}`);
  } catch (e) {
    clog('db', `Type update error: ${esc(e.message)}`);
  }
}

export async function addToSystemAudience(companyId, audienceId) {
  const aud = S.audiences.find(a => a.id === audienceId);
  const targetType = aud?.system_filter?.type;
  if (!targetType) return;
  await sysCoSetType(companyId, targetType);
  // Clear search input & suggestions after adding
  const inp = document.getElementById('sys-aud-input');
  const sug = document.getElementById('sys-aud-suggest');
  if (inp) inp.value = '';
  if (sug) { sug.innerHTML = ''; sug.style.display = 'none'; }
}

export async function removeFromSystemAudience(companyId, audienceId) {
  await sysCoSetType(companyId, 'prospect');
}

export function sysAudSearchInput(audienceId, query) {
  const aud = S.audiences.find(a => a.id === audienceId);
  if (!aud) return;
  const targetType = aud.system_filter?.type;
  const all = window._oaState?.companies || S.companies || [];
  const q = (query || '').toLowerCase().trim();
  const el = document.getElementById('sys-aud-suggest');
  if (!el) return;
  if (!q) { el.innerHTML = ''; el.style.display = 'none'; return; }
  const hits = all
    .filter(c => c.type !== targetType && (c.name || '').toLowerCase().includes(q))
    .slice(0, 8);
  if (!hits.length) { el.innerHTML = ''; el.style.display = 'none'; return; }
  el.style.display = 'block';
  const audId = esc(audienceId);
  el.innerHTML = hits.map(c => {
    const slug = esc(c.id || _slug(c.name));
    return `<div class="sys-suggest-row" onclick="addToSystemAudience('${slug}','${audId}')">
  <span>${esc(c.name)}</span>
  <span class="tag ${tClass(c.type)}" style="font-size:7px">${esc(tLabel(c.type))}</span>
</div>`;
  }).join('');
}

export async function audSetSort(audienceId, sortField) {
  const aud = S.audiences.find(a => a.id === audienceId);
  if (!aud) return;
  aud.sort_field = sortField;
  await sbSaveAudience(aud).catch(() => {});
  renderAudienceDetail(audienceId);
}

export function audRefreshDetail(id) {
  renderAudienceDetail(id);
}

/* ─── Export CSV (Lemlist-ready) ────────────────────────────── */

export function audExportCsv(audienceId) {
  const aud = S.audiences.find(a => a.id === audienceId);
  if (!aud) return;

  const companies = getAudienceCompanies(aud);
  const contacts = (S.contacts || []).filter(ct =>
    companies.some(c =>
      (c.name || '').toLowerCase() === (ct.company_name || '').toLowerCase() ||
      (c.id || _slug(c.name)) === (ct.company_slug || _slug(ct.company_name || ''))
    )
  );

  let rows, filename;

  if (contacts.length > 0) {
    // Contacts CSV (Lemlist-ready)
    rows = [['firstName', 'lastName', 'email', 'companyName', 'linkedinUrl', 'title']];
    contacts.forEach(ct => {
      const parts = (ct.full_name || '').split(' ');
      rows.push([
        parts[0] || '',
        parts.slice(1).join(' ') || '',
        ct.email || '',
        ct.company_name || '',
        ct.linkedin_url || '',
        ct.title || ''
      ]);
    });
    filename = `${_slug(aud.name)}-contacts.csv`;
    clog('info', `CSV export: "${esc(aud.name)}" → <b>${contacts.length} contacts</b>`);
  } else {
    // Company CSV fallback
    rows = [['name', 'type', 'category', 'region', 'hq_city', 'size', 'icp', 'website', 'note']];
    companies.forEach(c => {
      rows.push([
        c.name || '',
        c.type || '',
        c.category || '',
        c.region || '',
        c.hq_city || '',
        c.size || '',
        c.icp || '',
        c.website || '',
        (c.note || '').replace(/\n/g, ' ')
      ]);
    });
    filename = `${_slug(aud.name)}-companies.csv`;
    clog('info', `CSV export: "${esc(aud.name)}" → <b>${companies.length} companies</b> (no contacts found — use 👤 GET CONTACTS first)`);
  }

  const csv = rows.map(r =>
    r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
  ).join('\n');

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  // TODO: When Lemlist MCP is connected, push directly:
  // import { lemlistMCP } from './lemlist.js';
  // await lemlistMCP.createCampaign({ name: aud.name, leads: contacts });
}

/* ─── Find contacts — gaps panel ───────────────────────────── */

export function audFindContacts(audienceId) {
  const aud = S.audiences.find(a => a.id === audienceId);
  if (!aud) return;
  const companies = getAudienceCompanies(aud);
  const gaps = companies.filter(c =>
    !(S.contacts || []).some(ct =>
      (ct.company_name || '').toLowerCase() === (c.name || '').toLowerCase()
    )
  );
  _audRenderGapsPanel(audienceId, gaps, companies.length);
}

function _audRenderGapsPanel(audienceId, gaps, total) {
  document.getElementById('aud-gaps-panel')?.remove();

  const wrap = document.getElementById('aud-co-list-inner');
  if (!wrap) return;

  if (gaps.length === 0) {
    const banner = document.createElement('div');
    banner.id = 'aud-gaps-panel';
    banner.style.cssText = 'padding:10px 14px;background:var(--cc-bg,#001800);border:1px solid var(--cc);border-radius:6px;margin-bottom:10px;font-family:\'IBM Plex Mono\',monospace;font-size:10px;color:var(--cc)';
    banner.textContent = `✓ All ${total} companies have contacts — export ↗ CSV for Lemlist.`;
    wrap.parentElement.insertBefore(banner, wrap);
    setTimeout(() => banner.remove(), 4000);
    return;
  }

  const panel = document.createElement('div');
  panel.id = 'aud-gaps-panel';
  panel.style.cssText = 'border:1px solid var(--rule2);border-radius:6px;margin-bottom:12px;overflow:hidden';
  panel.innerHTML = `
<div style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:var(--bg2);border-bottom:1px solid var(--rule2)">
  <span style="font-family:'IBM Plex Mono',monospace;font-size:9px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:var(--t2)">CONTACT GAPS: <b id="aud-gaps-count">${gaps.length}</b> of ${total}</span>
  <div style="display:flex;gap:5px;margin-left:auto">
    <button class="btn sm p" id="aud-gaps-fill-all" onclick="audGapFillAll(${JSON.stringify(audienceId)})">⚡ FILL ALL</button>
    <button class="btn sm" onclick="document.getElementById('aud-gaps-panel')?.remove()">✕</button>
  </div>
</div>
<div id="aud-gaps-list" style="max-height:320px;overflow-y:auto">
  ${gaps.map(c => {
    const id = JSON.stringify(c.id || _slug(c.name));
    const audId = JSON.stringify(audienceId);
    const domId = esc(c.id || _slug(c.name));
    return `
<div class="aud-gap-row" id="aud-gap-${domId}" style="display:flex;align-items:center;gap:6px;padding:6px 12px;border-bottom:1px solid var(--rule2)">
  <span style="flex:1;font-family:'IBM Plex Sans',sans-serif;font-size:11px;font-weight:500">${esc(c.name)}</span>
  <div style="display:flex;gap:4px;flex-shrink:0">
    <button class="btn sm" onclick="audGapAction(${id},${audId},'contacts',this)">👤 FIND</button>
    <button class="btn sm" onclick="audGapAction(${id},${audId},'enrich',this)">✦ ENRICH</button>
    <button class="btn sm" onclick="audGapAction(${id},${audId},'geocode',this)">📍 GEO</button>
    <button class="btn sm" onclick="audGapAction(${id},${audId},'angles',this)">✉ ANGLES</button>
  </div>
  <span id="aud-gap-status-${domId}" style="min-width:56px;font-family:'IBM Plex Mono',monospace;font-size:8px;text-align:right"></span>
</div>`;
  }).join('')}
</div>`;
  wrap.parentElement.insertBefore(panel, wrap);
}

export async function audGapAction(companyId, audienceId, action, btn) {
  const origText = btn?.textContent;
  const setBtn = (txt, color) => { if (btn) { btn.textContent = txt; btn.disabled = !!color; if (color) btn.style.opacity = '.6'; else btn.style.opacity = ''; } };
  const domId = String(companyId).replace(/[^a-z0-9-]/g, '-');
  const statusEl = document.getElementById(`aud-gap-status-${domId}`);
  const setStatus = (txt, color) => { if (statusEl) { statusEl.textContent = txt; statusEl.style.color = color || 'var(--t3)'; } };

  setBtn('Working…', true);
  setStatus('…', 'var(--t3)');

  try {
    if (action === 'contacts') {
      // Delegate to global quickFind if available, else open company panel
      if (typeof window.quickEnrich === 'function') await window.quickEnrich(companyId);
      else if (typeof window.openBySlug === 'function') window.openBySlug(companyId);
    } else if (action === 'enrich') {
      if (typeof window.quickEnrich === 'function') await window.quickEnrich(companyId);
    } else if (action === 'geocode') {
      if (typeof window.geocodeCompany === 'function') await window.geocodeCompany(companyId);
    } else if (action === 'angles') {
      if (typeof window.genAnglesForCo === 'function') await window.genAnglesForCo(companyId);
    }
    setStatus('Done ✓', 'var(--cc)');
    setBtn(origText, false);
    // Update gap count
    audRefreshDetail(audienceId);
    setTimeout(() => setStatus('', ''), 3000);
  } catch (e) {
    setStatus('Error', 'var(--prc)');
    setBtn('↺ retry', false);
    if (btn) btn.onclick = () => audGapAction(companyId, audienceId, action, btn);
    clog('db', `Gap action ${action} error for ${companyId}: ${esc(e.message)}`);
  }
}

export async function audGapFillAll(audienceId) {
  const allRows = document.querySelectorAll('#aud-gaps-list .aud-gap-row');
  const fillBtn = document.getElementById('aud-gaps-fill-all');
  if (fillBtn) { fillBtn.textContent = 'Running…'; fillBtn.disabled = true; }

  let done = 0;
  for (const row of allRows) {
    const statusEl = row.querySelector('[id^="aud-gap-status-"]');
    if (statusEl) { statusEl.textContent = '…'; statusEl.style.color = 'var(--t3)'; }
    // Get company id from row id: "aud-gap-{id}"
    const companyId = row.id.replace('aud-gap-', '');
    const btns = row.querySelectorAll('.btn');
    for (const b of btns) {
      await audGapAction(companyId, audienceId, b.textContent.includes('FIND') ? 'contacts' :
        b.textContent.includes('ENRICH') ? 'enrich' :
        b.textContent.includes('GEO') ? 'geocode' : 'angles', b);
    }
    done++;
    if (fillBtn) fillBtn.textContent = `Running… ${done}/${allRows.length}`;
  }

  if (fillBtn) { fillBtn.textContent = `✓ Done (${done})`; fillBtn.disabled = false; fillBtn.style.color = 'var(--cc)'; }
  audRefreshDetail(audienceId);
  clog('info', `Gap fill all complete: ${done} companies processed`);
}

/* ═══ ICP Matching ══════════════════════════════════════════ */

let _icpPrompt = '';
let _icpResults = [];
let _icpThreshold = 70;

function _icpModal() {
  return document.getElementById('audience-modal');
}

function _icpSetContent(html) {
  const m = _icpModal();
  if (m) m.innerHTML = html;
}

function _icpUpdateSelCount() {
  let cnt = 0;
  document.querySelectorAll('.icp-chk').forEach(b => { if (b.checked) cnt++; });
  const el = document.getElementById('icp-sel-count');
  if (el) el.textContent = `${cnt} selected`;
}
window._icpUpdateSelCount = _icpUpdateSelCount;

/* ── Step 1: Describe modal ─────────────────────────────── */
export function icpFindByIcp() {
  const all = window._oaState?.companies || S.companies || [];
  const n = all.filter(c => c.type !== 'nogo').length;
  _icpSetContent(`
<div class="aud-modal-overlay" onclick="event.target===this&&audCloseModal()">
<div class="aud-modal-box icp-modal">
  <div class="aud-modal-head">
    <span class="aud-modal-title">✦ FIND BY ICP</span>
    <button class="btn sm" onclick="audCloseModal()">✕</button>
  </div>
  <div class="aud-modal-body">
    <div class="aud-form-row">
      <label class="aud-label">DESCRIBE YOUR IDEAL COMPANY PROFILE</label>
      <textarea id="icp-prompt" class="aud-input aud-textarea" rows="4"
        placeholder="e.g. European DSPs with CTV capabilities, cookieless-ready,&#10;50-500 employees, active in programmatic buying">${esc(_icpPrompt)}</textarea>
    </div>
    <div style="font-family:'IBM Plex Sans',sans-serif;font-size:10px;color:var(--t3);margin-top:6px;line-height:1.5">
      AI will match against <b>${n}</b> companies.
    </div>
    <div class="aud-modal-foot" style="margin-top:16px">
      <button class="btn p" onclick="icpMatch()">✦ Find Matches</button>
      <button class="btn" onclick="audCloseModal()">Cancel</button>
    </div>
  </div>
</div>
</div>`);
}

/* ── Step 2: Run match ──────────────────────────────────── */
export async function icpMatch() {
  const promptEl = document.getElementById('icp-prompt');
  const prompt = promptEl?.value?.trim();
  if (!prompt) { promptEl?.focus(); return; }
  _icpPrompt = prompt;
  _icpThreshold = 70;

  _icpSetContent(`
<div class="aud-modal-overlay">
<div class="aud-modal-box icp-modal" style="align-items:center;justify-content:center;min-height:180px;display:flex;flex-direction:column;gap:14px">
  <div class="icp-spinner"></div>
  <div style="font-family:'IBM Plex Mono',monospace;font-size:10px;color:var(--t3);text-transform:uppercase;letter-spacing:.06em">✦ Scoring companies…</div>
</div>
</div>`);

  try {
    const all = window._oaState?.companies || S.companies || [];
    const candidates = all.filter(c => c.type !== 'nogo').slice(0, 500);

    const coList = candidates.map(c => ({
      id: c.id || _slug(c.name),
      name: c.name,
      category: c.category || '',
      desc: (c.description || '').slice(0, 120),
      icp: c.icp || 0,
      region: c.region || '',
      size: c.size || '',
      tags: getCoTags(c).slice(0, 3),
    }));

    const data = await anthropicFetch({
      model: MODEL_CREATIVE,
      max_tokens: 2000,
      system: `You are a B2B sales analyst. Score each company 0-100 for fit with the given ICP. Return ONLY valid JSON array: [{"id":"...","score":85,"reason":"..."}] sorted desc. reason max 10 words. Include only scores >= 40. No markdown, no explanation.`,
      messages: [{ role: 'user', content: `ICP: ${prompt}\n\nCompanies: ${JSON.stringify(coList)}` }],
    });

    const raw = data.content?.[0]?.text || '[]';
    let scores;
    try {
      const match = raw.match(/\[[\s\S]*\]/);
      scores = JSON.parse(match ? match[0] : raw);
    } catch { scores = []; }

    _icpResults = scores.map(s => {
      const co = candidates.find(c => (c.id || _slug(c.name)) === s.id);
      return co ? { ...s, co } : null;
    }).filter(Boolean);

    _icpRenderResults();
  } catch (e) {
    _icpSetContent(`
<div class="aud-modal-overlay" onclick="event.target===this&&audCloseModal()">
<div class="aud-modal-box icp-modal">
  <div class="aud-modal-head"><span class="aud-modal-title">✦ FIND BY ICP</span><button class="btn sm" onclick="audCloseModal()">✕</button></div>
  <div class="aud-modal-body">
    <div style="color:var(--prc);font-family:'IBM Plex Mono',monospace;font-size:10px;padding:16px 0">Error: ${esc(e.message)}</div>
    <div class="aud-modal-foot"><button class="btn" onclick="icpFindByIcp()">← Back</button></div>
  </div>
</div>
</div>`);
    clog('ai', `ICP match error: ${esc(e.message)}`);
  }
}

/* ── Step 2 render ──────────────────────────────────────── */
function _icpRenderResults() {
  // Save currently checked company ids before re-render (Bug 3 fix)
  const prevChecked = new Set();
  document.querySelectorAll('.icp-chk').forEach((b, i) => {
    if (b.checked && _icpResults[i]) {
      const co = _icpResults[i].co;
      prevChecked.add(co.id || _slug(co.name));
    }
  });
  // Also seed from active audience so already-selected companies stay checked
  (S.activeAudience?.company_ids || []).forEach(id => prevChecked.add(id));

  const results = _icpResults;
  if (!results.length) {
    _icpSetContent(`
<div class="aud-modal-overlay" onclick="event.target===this&&audCloseModal()">
<div class="aud-modal-box icp-modal">
  <div class="aud-modal-head"><span class="aud-modal-title">✦ FIND BY ICP</span><button class="btn sm" onclick="audCloseModal()">✕</button></div>
  <div class="aud-modal-body">
    <div style="font-family:'IBM Plex Mono',monospace;font-size:10px;color:var(--t3);padding:24px 0;text-align:center">No matches found. Try a broader description.</div>
    <div class="aud-modal-foot"><button class="btn" onclick="icpFindByIcp()">← Back</button></div>
  </div>
</div>
</div>`);
    return;
  }

  const rows = results.map((r, i) => {
    const sc = r.score;
    const cls = sc >= 80 ? 'hi' : sc >= 60 ? 'mid' : 'lo';
    const co = r.co;
    const presel = sc >= _icpThreshold ? 'checked' : '';
    const meta = [co.region, co.size].filter(Boolean).join(' · ');
    return `
<label class="icp-row">
  <input type="checkbox" class="icp-chk" data-idx="${i}" ${presel} onchange="window._icpUpdateSelCount()"/>
  <span class="icp-score ${cls}">${sc}</span>
  <span class="icp-name">${esc(co.name)}</span>
  <span class="icp-cat">${esc(co.category || '')}</span>
  ${meta ? `<span class="icp-cat">${esc(meta)}</span>` : ''}
  <span class="icp-reason">${esc(r.reason || '')}</span>
</label>`;
  }).join('');

  const preselCount = results.filter(r => r.score >= _icpThreshold).length;
  const threshOpts = [50, 60, 70, 80].map(v =>
    `<option value="${v}" ${_icpThreshold === v ? 'selected' : ''}>${v}</option>`
  ).join('');

  _icpSetContent(`
<div class="aud-modal-overlay" onclick="event.target===this&&audCloseModal()">
<div class="aud-modal-box icp-modal">
  <div class="aud-modal-head">
    <span class="aud-modal-title">✦ ${results.length} MATCHES</span>
    <span id="icp-sel-count" style="font-family:'IBM Plex Mono',monospace;font-size:8px;color:var(--t3);margin-left:8px">${preselCount} selected</span>
    <div style="margin-left:auto;display:flex;gap:6px;align-items:center">
      <button class="btn sm" onclick="icpFindByIcp()">← Back</button>
      <button class="btn sm p" onclick="icpSaveStep()">✦ Save Audience</button>
      <button class="btn sm" onclick="audCloseModal()">✕</button>
    </div>
  </div>
  <div class="aud-modal-body" style="padding:0">
    <div class="icp-toolbar">
      <span onclick="window._icpSelAll(true)" style="cursor:pointer">☑ All</span>
      <span onclick="window._icpSelAll(false)" style="cursor:pointer">☐ None</span>
      <span style="color:var(--rule2)">|</span>
      <span>Score ≥</span>
      <select class="icp-threshold" onchange="window._icpSetThreshold(this.value)">${threshOpts}</select>
    </div>
    <div class="icp-results">${rows}</div>
  </div>
</div>
</div>`);

  // Restore previously checked state (Bug 3 fix)
  if (prevChecked.size > 0) {
    document.querySelectorAll('.icp-chk').forEach((b, i) => {
      if (_icpResults[i]) {
        const coId = _icpResults[i].co.id || _slug(_icpResults[i].co.name);
        if (prevChecked.has(coId)) b.checked = true;
      }
    });
    _icpUpdateSelCount();
  }
}
window._icpBack = () => _icpRenderResults();
window.audGapAction = audGapAction;
window.audGapFillAll = audGapFillAll;

window._icpSelAll = function(sel) {
  document.querySelectorAll('.icp-chk').forEach(b => { b.checked = sel; });
  _icpUpdateSelCount();
};
window._icpSetThreshold = function(val) {
  _icpThreshold = parseInt(val) || 70;
  document.querySelectorAll('.icp-chk').forEach((b, i) => {
    b.checked = _icpResults[i] && _icpResults[i].score >= _icpThreshold;
  });
  _icpUpdateSelCount();
};

/* ── Step 3: Save modal ─────────────────────────────────── */
export async function icpSaveStep() {
  const boxes = document.querySelectorAll('.icp-chk');
  const selected = [];
  boxes.forEach((b, i) => { if (b.checked && _icpResults[i]) selected.push(_icpResults[i]); });
  if (!selected.length) { return; }

  _icpSetContent(`
<div class="aud-modal-overlay">
<div class="aud-modal-box icp-modal" style="align-items:center;justify-content:center;min-height:180px;display:flex;flex-direction:column;gap:14px">
  <div class="icp-spinner"></div>
  <div style="font-family:'IBM Plex Mono',monospace;font-size:10px;color:var(--t3);text-transform:uppercase;letter-spacing:.06em">✦ Generating title & hook…</div>
</div>
</div>`);

  let name = '', hook = '';
  try {
    const [tRes, hRes] = await Promise.all([
      anthropicFetch({
        model: MODEL_CREATIVE, max_tokens: 20,
        messages: [{ role: 'user', content: `Generate a short 3-5 word audience name for this ICP: "${_icpPrompt}". Only the name, no punctuation. Examples: EU CTV DSPs, Cookieless Mid-Market, DACH Agency Groups` }],
      }),
      anthropicFetch({
        model: MODEL_CREATIVE, max_tokens: 100,
        messages: [{ role: 'user', content: `Write a 2-sentence outreach hook for onAudience EU first-party data partnerships targeting: "${_icpPrompt}". Be specific, no fluff.` }],
      }),
    ]);
    name = tRes.content?.[0]?.text?.trim() || '';
    hook = hRes.content?.[0]?.text?.trim() || '';
  } catch (e) {
    clog('ai', `ICP title/hook gen error: ${esc(e.message)}`);
  }

  const ids = selected.map(r => r.co.id || _slug(r.co.name));
  _icpSetContent(`
<div class="aud-modal-overlay" onclick="event.target===this&&audCloseModal()">
<div class="aud-modal-box icp-modal">
  <div class="aud-modal-head">
    <span class="aud-modal-title">💾 SAVE AUDIENCE</span>
    <button class="btn sm" onclick="audCloseModal()">✕</button>
  </div>
  <div class="aud-modal-body">
    <div style="font-family:'IBM Plex Mono',monospace;font-size:9px;color:var(--t3);margin-bottom:12px;text-transform:uppercase;letter-spacing:.05em">${selected.length} COMPANIES SELECTED</div>
    <div class="aud-form-row">
      <label class="aud-label">NAME</label>
      <input id="icp-save-name" class="aud-input" value="${esc(name)}" placeholder="Audience name"/>
    </div>
    <div class="aud-form-row">
      <label class="aud-label" style="display:flex;align-items:center;gap:6px">✦ HOOK <span style="font-size:7px;color:var(--t3);font-weight:400;text-transform:none;letter-spacing:0">AI-generated, editable</span></label>
      <textarea id="icp-save-hook" class="aud-input aud-textarea" rows="3">${esc(hook)}</textarea>
      <div style="font-family:'IBM Plex Sans',sans-serif;font-size:9px;color:var(--t3);margin-top:3px">Use as opener for all companies in this audience</div>
    </div>
    <div id="icp-save-err" style="color:var(--prc);font-family:'IBM Plex Mono',monospace;font-size:8px;min-height:12px;margin-top:4px"></div>
    <div class="aud-modal-foot" style="margin-top:12px">
      <button class="btn" onclick="window._icpBack()">← Back</button>
      <button class="btn p" onclick="icpSaveAudience(${JSON.stringify(ids)})">💾 Save</button>
    </div>
  </div>
</div>
</div>`);
}

/* ── Final save ─────────────────────────────────────────── */
export async function icpSaveAudience(ids) {
  const name = document.getElementById('icp-save-name')?.value?.trim();
  const hook = document.getElementById('icp-save-hook')?.value?.trim() || '';
  const errEl = document.getElementById('icp-save-err');
  if (!name) { if (errEl) errEl.textContent = 'Name required'; return; }
  if (errEl) errEl.textContent = '';

  const id = `aud-${Date.now()}`;
  const payload = {
    id, name,
    company_ids: ids,
    filters: { icp_prompt: _icpPrompt, threshold: _icpThreshold },
    icp_prompt: _icpPrompt,
    outreach_hook: hook || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  try {
    await sbSaveAudience(payload);
    audCloseModal();
    await renderAudiencesPanel();
    const toast = document.createElement('div');
    toast.className = 'icp-toast';
    toast.textContent = `✓ ${name} saved — ${ids.length} companies`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
    clog('db', `ICP audience saved: <b>${esc(name)}</b> · ${ids.length} companies`);
  } catch (e) {
    if (errEl) errEl.textContent = 'Save failed: ' + e.message;
    clog('db', `ICP save error: ${esc(e.message)}`);
  }
}

/* ── ICP audience edit modal ─────────────────────────────── */
export function icpEditModal(id) {
  const aud = S.audiences.find(a => a.id === id);
  if (!aud) return;
  const modal = document.getElementById('audience-modal');
  if (!modal) return;
  const n = Array.isArray(aud.company_ids) ? aud.company_ids.length : 0;
  modal.innerHTML = `
<div class="aud-modal-overlay" onclick="event.target===this&&audCloseModal()">
<div class="aud-modal-box icp-modal">
  <div class="aud-modal-head">
    <span class="aud-modal-title">EDIT AUDIENCE</span>
    <button class="btn sm" onclick="audCloseModal()">✕</button>
  </div>
  <div class="aud-modal-body">
    <div style="font-family:'IBM Plex Mono',monospace;font-size:9px;color:var(--t3);margin-bottom:12px;text-transform:uppercase;letter-spacing:.05em">${n} COMPANIES</div>
    <div class="aud-form-row">
      <label class="aud-label">NAME</label>
      <input id="icp-edit-name" class="aud-input" value="${esc(aud.name)}" placeholder="Audience name"/>
    </div>
    <div class="aud-form-row">
      <label class="aud-label" style="display:flex;align-items:center;gap:6px">
        ✦ HOOK
        <button class="btn sm" onclick="icpRegenHook('${esc(id)}')">↺ Regen</button>
        <span id="icp-regen-status" style="font-size:8px;color:var(--t3)"></span>
      </label>
      <textarea id="icp-edit-hook" class="aud-input aud-textarea" rows="3">${esc(aud.outreach_hook || '')}</textarea>
    </div>
    <div id="icp-edit-err" style="color:var(--prc);font-family:'IBM Plex Mono',monospace;font-size:8px;min-height:12px;margin-top:4px"></div>
    <div class="aud-modal-foot" style="margin-top:12px">
      <button class="btn" onclick="audCloseModal()">Cancel</button>
      <button class="btn" onclick="audDelete('${esc(id)}')" style="color:var(--prc);border-color:var(--prr)">DELETE</button>
      <button class="btn p" onclick="icpPatchAudience('${esc(id)}')">💾 Save</button>
    </div>
  </div>
</div>
</div>`;
}

export async function icpRegenHook(id) {
  const aud = S.audiences.find(a => a.id === id);
  const prompt = aud?.filters?.icp_prompt || aud?.icp_prompt || aud?.name || '';
  const statusEl = document.getElementById('icp-regen-status');
  if (statusEl) statusEl.textContent = '⟳ generating…';
  try {
    const res = await anthropicFetch({
      model: MODEL_CREATIVE, max_tokens: 100,
      messages: [{ role: 'user', content: `Write a 2-sentence outreach hook for onAudience EU first-party data partnerships targeting: "${prompt}". Be specific, no fluff.` }],
    });
    const hook = res.content?.[0]?.text?.trim() || '';
    const el = document.getElementById('icp-edit-hook');
    if (el) el.value = hook;
    if (statusEl) statusEl.textContent = '✓';
    setTimeout(() => { if (statusEl) statusEl.textContent = ''; }, 2000);
  } catch (e) {
    if (statusEl) statusEl.textContent = 'Error';
  }
}

export async function icpPatchAudience(id) {
  const name = document.getElementById('icp-edit-name')?.value?.trim();
  const hook = document.getElementById('icp-edit-hook')?.value?.trim() || '';
  const errEl = document.getElementById('icp-edit-err');
  if (!name) { if (errEl) errEl.textContent = 'Name required'; return; }
  if (errEl) errEl.textContent = '';
  try {
    const res = await fetch(`${SB_URL}/rest/v1/audiences?id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: authHdr(),
      body: JSON.stringify({ name, outreach_hook: hook || null, updated_at: new Date().toISOString() }),
    });
    if (!res.ok) throw new Error(await res.text());
    const aud = S.audiences.find(a => a.id === id);
    if (aud) { aud.name = name; aud.outreach_hook = hook || null; }
    audCloseModal();
    await renderAudiencesPanel();
    if (S.activeAudience?.id === id) renderAudienceDetail(id);
    clog('db', `Audience updated: <b>${esc(name)}</b>`);
  } catch (e) {
    if (errEl) errEl.textContent = 'Save failed: ' + e.message;
  }
}

/* ─── Campaign planning exports ────────────────────────────── */

export function audToggleCoRow(slug) {
  const exp = document.getElementById(`aud-coe-${slug}`);
  if (!exp) return;
  const row = document.getElementById(`aud-cor-${slug}`);
  const open = exp.style.display !== 'none';
  exp.style.display = open ? 'none' : '';
  if (row) row.classList.toggle('expanded', !open);
}

export function audFilterCoList(q) {
  const inner = document.getElementById('aud-co-list-inner');
  if (!inner) return;
  const term = (q || '').toLowerCase();
  inner.querySelectorAll('.aud-co-row').forEach(row => {
    const name = (row.querySelector('.aud-co-name')?.textContent || '').toLowerCase();
    row.style.display = term && !name.includes(term) ? 'none' : '';
  });
}

export function audProviderChange(val) {
  const btn = document.querySelector('.aud-launch-btn');
  if (btn) btn.disabled = !val;
}

export async function generateCampaignHook(audId) {
  const aud = S.audiences.find(a => a.id === audId);
  if (!aud) return;
  const ta = document.getElementById('aud-hook-ta');
  if (ta) ta.placeholder = '⟳ generating…';
  const prompt = aud.filters?.icp_prompt || aud.icp_prompt || aud.name || '';
  const n = (aud.company_ids || []).length;
  try {
    const res = await anthropicFetch({
      model: MODEL_CREATIVE, max_tokens: 120,
      messages: [{ role: 'user', content:
        `Write a 2–3 sentence outreach hook for a B2B email campaign.\nAudience: "${prompt}" (${n} companies).\nContext: onAudience sells EU first-party audience data to DSPs, SSPs, agencies and data providers.\nBe direct, specific, no buzzwords.` }],
    });
    const hook = res.content?.[0]?.text?.trim() || '';
    if (ta) { ta.value = hook; ta.placeholder = ''; }
  } catch (e) {
    if (ta) ta.placeholder = 'Error generating hook';
    clog('ai', `generateCampaignHook error: ${esc(e.message)}`);
  }
}

export async function generateEmailTemplate(audId) {
  const aud = S.audiences.find(a => a.id === audId);
  if (!aud) return;
  const subjectEl = document.getElementById('aud-tpl-subject');
  const bodyEl = document.getElementById('aud-tpl-body');
  if (bodyEl) bodyEl.placeholder = '⟳ generating…';
  const hook = document.getElementById('aud-hook-ta')?.value?.trim() || aud.outreach_hook || '';
  const prompt = aud.filters?.icp_prompt || aud.icp_prompt || aud.name || '';
  const n = (aud.company_ids || []).length;
  try {
    const res = await anthropicFetch({
      model: MODEL_CREATIVE, max_tokens: 400,
      messages: [{ role: 'user', content:
        `Write a cold B2B email template (subject + body) for onAudience EU first-party data partnerships.\nAudience: "${prompt}" (${n} companies).\nHook: "${hook}"\nFormat:\nSUBJECT: <subject line>\n\n<email body — 3–4 short paragraphs, {{first_name}} placeholder, no fluffy sign-off>` }],
    });
    const text = res.content?.[0]?.text?.trim() || '';
    const subjectMatch = text.match(/^SUBJECT:\s*(.+)/im);
    const body = text.replace(/^SUBJECT:.*\n?/im, '').trim();
    if (subjectEl && subjectMatch) subjectEl.value = subjectMatch[1].trim();
    if (bodyEl) { bodyEl.value = body; bodyEl.placeholder = ''; }
  } catch (e) {
    if (bodyEl) bodyEl.placeholder = 'Error generating template';
    clog('ai', `generateEmailTemplate error: ${esc(e.message)}`);
  }
}

export async function saveCampaignTemplate(audId) {
  const aud = S.audiences.find(a => a.id === audId);
  if (!aud) return;
  const hook    = document.getElementById('aud-hook-ta')?.value?.trim() || null;
  const subject = document.getElementById('aud-tpl-subject')?.value?.trim() || null;
  const body    = document.getElementById('aud-tpl-body')?.value?.trim() || null;
  try {
    const res = await fetch(`${SB_URL}/rest/v1/audiences?id=eq.${encodeURIComponent(audId)}`, {
      method: 'PATCH',
      headers: authHdr(),
      body: JSON.stringify({ outreach_hook: hook, template_subject: subject, template_body: body, updated_at: new Date().toISOString() }),
    });
    if (!res.ok) throw new Error(await res.text());
    if (aud) { aud.outreach_hook = hook; aud.template_subject = subject; aud.template_body = body; }
    clog('db', `Campaign template saved for <b>${esc(aud.name)}</b>`);
  } catch (e) {
    clog('db', `saveCampaignTemplate error: ${esc(e.message)}`);
  }
}

export async function launchCampaign(audId) {
  const aud = S.audiences.find(a => a.id === audId);
  if (!aud) return;
  await saveCampaignTemplate(audId);
  clog('info', `Campaign draft saved for <b>${esc(aud.name)}</b> — provider launch coming soon`);
}

export async function audDraftEmailToCo(audId, coSlug) {
  const aud = S.audiences.find(a => a.id === audId);
  const co  = S.companies.find(c => (c.id || _slug(c.name)) === coSlug);
  if (!aud || !co) return;
  const ids = aud.company_ids || [];
  const members = S.companies.filter(c => ids.includes(c.id));
  const audContacts = S.contacts.filter(ct =>
    ids.includes(ct.company_id) || members.some(m => _slug(m.name) === _slug(ct.company_name || '')));
  const coContacts = audContacts.filter(ct =>
    ct.company_id === co.id || _slug(ct.company_name || '') === _slug(co.name));
  const contact = coContacts.find(ct => ct.email) || coContacts[0];
  const hook = aud.outreach_hook || aud.name;
  const body = aud.template_body || '';
  const subject = aud.template_subject || `Partnership opportunity — ${co.name}`;
  const to = contact?.email || '';
  const mailto = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body ? body.replace(/\{\{first_name\}\}/gi, contact?.full_name?.split(' ')[0] || 'there') : hook)}`;
  window.open(mailto, '_blank');
}

export async function audGenAngleForCo(audId, coSlug) {
  const aud = S.audiences.find(a => a.id === audId);
  const co  = S.companies.find(c => (c.id || _slug(c.name)) === coSlug);
  if (!aud || !co) return;
  const expandEl = document.getElementById(`aud-coe-${coSlug}`);
  let angleEl = expandEl?.querySelector('.aud-co-angle');
  if (!angleEl) {
    angleEl = document.createElement('div');
    angleEl.className = 'aud-co-angle';
    if (expandEl) expandEl.insertBefore(angleEl, expandEl.firstChild);
  }
  angleEl.textContent = '⟳ generating angle…';
  try {
    const res = await anthropicFetch({
      model: MODEL_CREATIVE, max_tokens: 80,
      messages: [{ role: 'user', content:
        `Write 1 short outreach angle for approaching ${co.name} (${co.category || co.type || ''}) about onAudience EU first-party audience data partnerships. Audience context: "${aud.name}". 1–2 sentences, very specific.` }],
    });
    const angle = res.content?.[0]?.text?.trim() || '';
    angleEl.textContent = `✦ ${angle}`;
    // persist to company record
    fetch(`${SB_URL}/rest/v1/companies?id=eq.${encodeURIComponent(co.id)}`, {
      method: 'PATCH', headers: authHdr(),
      body: JSON.stringify({ outreach_angle: angle, updated_at: new Date().toISOString() }),
    }).catch(() => {});
    co.outreach_angle = angle;
  } catch (e) {
    angleEl.textContent = 'Error generating angle';
  }
}
