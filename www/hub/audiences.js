/* ═══ audiences.js — Audience management ═══
   Audiences = saved lists of companies matching a description.
   AI queries DB first (no web lookup needed for most queries).
   Tag/type/region filters are passed as hard context to AI.
   Lemlist export: CSV today, MCP connector stub ready.
   ════════════════════════════════════════════════════════ */

import { SB_URL, MODEL_CREATIVE } from './config.js?v=20260409d2';
import { authHdr, classify, esc, getAv, getCoTags, ini, relTime, _slug, tClass, tLabel } from './utils.js?v=20260409d2';
import S from './state.js?v=20260409d2';
import { anthropicFetch, anthropicMcpFetch, geocodeCity, saveGeocode } from './api.js?v=20260409d2';
import { companies as dbCo, audiences as dbAud } from './db.js?v=20260409d2';
import { clog } from './hub.js?v=20260409d2';

/* ── Map state ─────────────────────────────────────────────── */
let _audMap = null;
let _audMapMembers = [];

/* ─── Supabase ─────────────────────────────────────────────── */

async function sbLoadAudiences() {
  try {
    return await dbAud.list();
  } catch (e) {
    clog('db', `audiences load error: ${esc(e.message)}`);
    return [];
  }
}

export async function sbSaveAudience(aud) {
  return await dbAud.upsert(aud);
}

async function sbDeleteAudience(id) {
  await dbAud.delete(id);
}

async function sbPatchCompanyType(companyId, type) {
  return await dbCo.patch(companyId, { type });
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
  const n = a.is_system
    ? (a.system_filter?.type ? S.companies.filter(c => c.type === a.system_filter.type).length : (a.company_ids?.length ?? 0))
    : (Array.isArray(a.company_ids) ? a.company_ids.length : 0);

  /* Line 1: name + count + lock */
  const line1 = `<div class="aud-row-head">
    <span class="aud-row-name">${esc(a.name)}</span>
    <span style="display:flex;align-items:center;gap:4px;flex-shrink:0">
      <span class="aud-row-count">${n} co</span>
      ${a.is_system ? '<span style="font-size:9px" title="System audience">🔒</span>' : ''}
    </span>
  </div>`;

  /* Line 2: desc (truncated 60) + tag chips — or SYSTEM chip */
  let line2;
  if (a.is_system) {
    line2 = `<div class="aud-row-line2"><span class="tag tpr" style="font-size:7px">SYSTEM</span></div>`;
  } else {
    const desc = a.description ? a.description.slice(0, 60) + (a.description.length > 60 ? '…' : '') : '';
    const f = a.filters || {};
    const typePill  = f.type ? `<span class="tag tp" style="font-size:7px">${esc(f.type)}</span>` : '';
    const tagChips  = (f.tags || []).map(t => `<span class="tag tpr" style="font-size:7px">${esc(t)}</span>`).join('');
    line2 = `<div class="aud-row-line2">
      ${desc ? `<span class="aud-row-desc2">${esc(desc)}</span>` : ''}
      ${typePill}${tagChips}
    </div>`;
  }

  /* Line 3: relTime */
  const line3 = a.updated_at
    ? `<div class="aud-row-time">${relTime(a.updated_at)}</div>`
    : '';

  const actions = a.is_system
    ? `<div class="aud-row-actions">
        <button class="btn sm" onclick="event.stopPropagation();audExportCsv('${esc(a.id)}')">↗ CSV</button>
      </div>`
    : `<div class="aud-row-actions">
        <button class="btn sm" onclick="event.stopPropagation();audEdit('${esc(a.id)}')">EDIT</button>
        <button class="btn sm" onclick="event.stopPropagation();audExportCsv('${esc(a.id)}')">↗ CSV</button>
        <button class="btn sm" onclick="event.stopPropagation();audDelete('${esc(a.id)}')" style="color:var(--prc)">✕</button>
      </div>`;

  return `
<div class="aud-row${active}" onclick="audOpen('${esc(a.id)}')">
  ${line1}
  ${line2}
  ${line3}
  ${actions}
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

  const ids = aud.company_ids || [];
  const members = S.companies.filter(c => ids.includes(c.id));
  const audContacts = S.contacts.filter(ct =>
    ids.includes(ct.company_id) || members.some(m => _slug(m.name) === _slug(ct.company_name || '')));
  detailEl.innerHTML = renderCampaignDetailHTML(aud, members, audContacts);
}

/* ─── Campaign planning view (user audiences) ─────────────── */

function _audCoverage(members, audContacts) {
  const withContacts = members.filter(c =>
    audContacts.some(ct => ct.company_id === c.id || _slug(ct.company_name || '') === _slug(c.name)));
  const withEmail = audContacts.filter(ct => ct.email);
  const pct = members.length ? Math.round(withEmail.length / members.length * 100) : 0;
  return { members: members.length, withContacts: withContacts.length,
    contacts: audContacts.length, withEmail: withEmail.length, pct };
}

function renderCampaignCoRowHtml(c, aud, audContacts) {
  const slug = c.id || _slug(c.name);
  const tc = tClass(c.type), tl = tLabel(c.type);
  const st = c.icp ? '★'.repeat(Math.min(5, Math.round(c.icp / 2))) : '';
  const av = getAv(c.name);
  const coContacts = audContacts.filter(ct =>
    ct.company_id === c.id || _slug(ct.company_name || '') === _slug(c.name));
  const hasEmail = coContacts.some(ct => ct.email);
  const audIdJ = aud.id, slugJ = slug; // safe slug
  const desc = (c.description || c.note || '').slice(0, 90);
  const descTrunc = desc + ((c.description || c.note || '').length > 90 ? '…' : '');
  return `
<div class="aud-co-row" id="aud-cor-${esc(slug)}" onclick="audOpenCoOverlay(${slugJ},${audIdJ})">
  <div class="aud-co-row-main">
    <span class="c-av" style="background:${av.bg};color:${av.fg};width:22px;height:22px;font-size:9px;border-radius:3px;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0">${ini(c.name)}</span>
    <span class="aud-co-name">${esc(c.name)}</span>
    <span class="tag ${tc}" style="font-size:7px">${esc(tl)}</span>
    ${st ? `<span class="aud-stars">${st}</span>` : ''}
    ${coContacts.length ? `<span class="aud-ct-badge">${coContacts.length}</span>` : ''}
    ${c.outreach_angle ? `<span class="aud-co-angle-chip">💡 ANGLE</span>` : ''}
    <div class="aud-co-row-actions" onclick="event.stopPropagation()">
      <button class="btn sm" onclick="openBySlug('${esc(slug)}')" title="Open company detail">···</button>
      ${hasEmail ? `<button class="btn sm" onclick="audDraftEmailToCo(${audIdJ},${slugJ})">✉</button>` : ''}
      <button class="btn sm" style="color:var(--prc)" onclick="audToggleCo(${audIdJ},${slugJ})">✗</button>
    </div>
  </div>
  <div class="aud-co-row-sub">
    ${c.hq_city ? `<span>📍${esc(c.hq_city)}</span>` : ''}
    ${c.size ? `<span>👥${esc(c.size)}</span>` : ''}
    ${c.category ? `<span>${esc(c.category)}</span>` : ''}
  </div>
  ${descTrunc ? `<div class="aud-co-desc-line">${esc(descTrunc)}</div>` : ''}
</div>`;
}

function renderCampaignDetailHTML(aud, members, audContacts) {
  _audMapMembers = members;
  const cov = _audCoverage(members, audContacts);
  const f = aud.filters || {};
  const icpFull = f.icp_prompt || aud.icp_prompt || '';
  const icpTrunc = icpFull.slice(0, 120) + (icpFull.length > 120 ? '…' : '');
  const audIdJ = aud.id; // safe alphanumeric-dash, no JSON.stringify needed
  const coRows = members.length === 0
    ? '<div class="aud-empty" style="padding:24px">No companies in this audience.</div>'
    : members.map(c => renderCampaignCoRowHtml(c, aud, audContacts)).join('');
  const sortBtns = ['updated_at', 'icp', 'name', 'size'].map(v =>
    `<button class="btn sm${(aud.sort_field || 'updated_at') === v ? ' active' : ''}" onclick="audSetSort(${audIdJ},'${v}')">${sortLabel(v).split(' ')[0]}</button>`
  ).join('');
  return `
<div class="aud-detail-full">
  <div class="aud-detail-hd">
    <div class="aud-detail-title">
      <span class="aud-detail-name">${esc(aud.name)}</span>
      <span style="font:400 9px 'IBM Plex Mono',monospace;color:var(--t3)">${members.length} CO</span>
      <span style="font:400 9px 'IBM Plex Mono',monospace;color:var(--t3)">${cov.contacts} CT</span>
      <button class="btn sm" onclick="audEdit('${esc(aud.id)}')">✎ EDIT</button>
      <button class="btn sm" onclick="audB2bLookup('${esc(aud.id)}')">🔍 b2b</button>
      <button class="btn sm" onclick="audCloseDetail()">✕</button>
    </div>
    ${aud.outreach_hook ? `<div class="aud-hook-box">✦ ${esc(aud.outreach_hook)}</div>` : ''}
    ${icpTrunc ? `<div style="font:400 9px 'IBM Plex Mono',monospace;color:var(--t3);margin-top:4px">ICP: ${esc(icpTrunc)}</div>` : ''}
    <div class="aud-detail-source">
      ${aud.created_at ? `<span>Created ${relTime(aud.created_at)}</span>` : ''}
      <span>Updated ${relTime(aud.updated_at)}</span>
    </div>
  </div>
  <div class="aud-campaign-bar">
    <button class="btn sm p" onclick="showPersonaPicker('aud-hook-ta',pid=>generateCampaignHook(${audIdJ},pid))">✦ Generate Hook</button>
    <button class="btn sm" onclick="showPersonaPicker('aud-tpl-body',pid=>generateEmailTemplate(${audIdJ},pid))">✉ Draft Campaign</button>
    <button class="btn sm" onclick="audExportCsv(${audIdJ})">↗ Export CSV</button>
    <div style="margin-left:auto;display:flex;gap:4px">
      ${localStorage.getItem('oaLemlistKey')
        ?`<button class="btn sm p" onclick="audPushLemlist(${audIdJ})">📤 Lemlist</button>`
        :`<button class="btn sm" onclick="llSetKey()" title="Connect Lemlist to push contacts">⚙ Lemlist</button>`}
    </div>
  </div>
  <div class="aud-map-toggle">
    <button class="btn sm active" id="aud-toggle-list" onclick="toggleAudienceMap('list')">&#9776; List</button>
    <button class="btn sm" id="aud-toggle-map" onclick="toggleAudienceMap('map')">&#x1F5FA;&#xFE0F; Map</button>
  </div>
  <div class="aud-body">
    <div class="aud-co-list-wrap" id="aud-co-list-wrap">
      <div style="display:flex;gap:6px;align-items:center;margin-bottom:8px;flex-wrap:wrap">
        <input class="aud-input" style="flex:1;min-width:120px;font-size:10px;padding:4px 8px"
          placeholder="Filter companies…" oninput="audFilterCoList(this.value)"/>
        <div style="display:flex;gap:3px">${sortBtns}</div>
      </div>
      <div id="aud-co-list-inner">${coRows}</div>
    </div>
    <div class="aud-map-wrap" id="aud-map-wrap" style="display:none;flex:1;min-width:0">
      <div id="aud-map"></div>
      <div class="aud-map-geo-panel">
        <h4>GEO MIX</h4>
        <div id="aud-geo-list"></div>
      </div>
    </div>
    <div class="aud-sidebar">
      <div class="aud-sidebar-section">
        <div class="aud-sidebar-lbl" style="display:flex;align-items:center;gap:6px">
          ✦ Campaign Hook
          <button class="btn sm" style="margin-left:auto" onclick="showPersonaPicker('aud-hook-ta',pid=>generateCampaignHook(${audIdJ},pid))" title="Choose style then generate">✦ AI</button>
        </div>
        <textarea id="aud-hook-ta" class="aud-input aud-textarea" rows="3"
          placeholder="Outreach hook for this audience…">${esc(aud.outreach_hook || '')}</textarea>
        <div style="display:flex;gap:4px">
          <button class="btn sm p" onclick="saveCampaignTemplate(${audIdJ})">💾 Save</button>
        </div>
      </div>
      <div class="aud-sidebar-section">
        <div class="aud-sidebar-lbl" style="display:flex;align-items:center;gap:6px">
          ✦ Email Template
          <button class="btn sm" style="margin-left:auto" onclick="showPersonaPicker('aud-tpl-body',pid=>generateEmailTemplate(${audIdJ},pid))" title="Choose style then generate">✦ AI</button>
        </div>
        <input id="aud-tpl-subject" class="aud-input" style="font-size:10px"
          placeholder="Subject line…" value="${esc(aud.template_subject || '')}"/>
        <textarea id="aud-tpl-body" class="aud-input aud-textarea" rows="8"
          placeholder="Email body… (AI will generate from hook + ICP)">${esc(aud.template_body || '')}</textarea>
        <div style="display:flex;gap:4px">
          <button class="btn sm p" onclick="saveCampaignTemplate(${audIdJ})">💾 Save template</button>
        </div>
      </div>
      <div class="aud-sidebar-section">
        <div class="aud-sidebar-lbl">✦ Coverage</div>
        <div style="font:400 10px 'IBM Plex Mono',monospace;color:var(--t2);display:flex;flex-direction:column;gap:3px">
          <span>${cov.members} companies · ${cov.withContacts} with contacts</span>
          <span>${cov.contacts} contacts found · ${cov.withEmail} with email</span>
        </div>
        <div class="aud-coverage-bar"><div class="aud-coverage-fill" style="width:${cov.pct}%"></div></div>
        <div style="font:400 8px 'IBM Plex Mono',monospace;color:var(--t4)">${cov.pct}% email coverage</div>
        <button class="btn sm" onclick="audFindContacts(${audIdJ})">👤 Find missing contacts</button>
      </div>
      <div class="aud-sidebar-section">
        <div class="aud-sidebar-lbl">✦ Past Campaigns</div>
        <div id="aud-campaigns-list" style="font:400 9px 'IBM Plex Mono',monospace;color:var(--t4)">No campaigns yet.</div>
      </div>
      <div class="aud-sidebar-section" style="border-top:1px solid var(--rule);padding-top:12px">
        <div class="aud-sidebar-lbl">⚡ Launch</div>
        <select class="aud-provider-select" id="aud-launch-provider" onchange="audProviderChange(this.value)">
          <option value="">not connected — select ▾</option>
          <option disabled>Instantly (coming soon)</option>
          <option disabled>Lemlist (coming soon)</option>
          <option disabled>Brevo (coming soon)</option>
          <option disabled>Mailchimp (coming soon)</option>
        </select>
        <button class="btn sm aud-launch-btn" disabled
          title="Connect a mailing provider to launch">🚀 Create Campaign in Provider</button>
        <button class="btn sm" onclick="launchCampaign(${audIdJ})">💾 Save Draft</button>
      </div>
    </div>
  </div>
</div>`;
}

/* ─── System audience detail helpers ───────────────────────── */

function getSystemAudienceCompanies(aud) {
  if (aud.system_filter?.type) {
    return [...S.companies.filter(c => c.type === aud.system_filter.type)]
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }
  const idSet = new Set(aud.company_ids || []);
  return [...S.companies.filter(c => idSet.has(c.id))]
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
    <div class="aud-detail-source">
      <span>Source: companies.type = ${esc(aud.system_filter?.type || '?')}</span>
      <span>Auto-synced · Last updated: ${relTime(aud.updated_at)}</span>
    </div>
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
<div class="aud-co-row" onclick="openBySlug('${slug}')">
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
    <button class="btn sm" onclick="event.stopPropagation();audToggleCo('${aud.id}','${slug}')">
      ${(aud.company_ids || []).includes(slug) ? '✓ PINNED' : '+ PIN'}
    </button>
    <button class="btn sm" onclick="event.stopPropagation();openBySlug('${slug}')">DETAIL →</button>
  </div>
</div>`;
}

/* ─── Modal ────────────────────────────────────────────────── */

/* ── Scout modal state ────────────────────────────────────── */
let _scoutResults    = [];
let _scoutExistingId = null;
let _gapLists        = { noContact: [], noDesc: [], noHq: [], noAngle: [] };
let _scoutPending    = false;   // Bug 1: gate — only true when SCOUT button fires
window._setScoutPending = () => { _scoutPending = true; };

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
<div class="aud-modal-overlay" onmousedown="if(event.target===this)audCloseModal()">
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
      <div class="aud-form-row">
        <label class="aud-label">DESCRIPTION</label>
        <textarea id="scout-desc" class="aud-input aud-textarea" rows="2" placeholder="What is this audience for?">${esc(existing?.description || '')}</textarea>
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
        <div class="aud-filter-row" style="margin-top:4px">
          <label class="aud-label" style="min-width:50px">COUNTRY</label>
          <input id="scout-f-country" class="aud-input" style="flex:1" value="${esc(f.country || '')}" placeholder="e.g. Poland, Germany, UK&#8230;"/>
          <label class="aud-label" style="min-width:32px;margin-left:6px">CITY</label>
          <input id="scout-f-city" class="aud-input" style="flex:1" value="${esc(f.city || '')}" placeholder="e.g. Warsaw, Berlin&#8230;"/>
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
    <div class="scout-right">
      <div class="scout-section">
        <div class="scout-section-head">
          <span>A &#8212; IN YOUR DB</span>
          <span id="scout-a-count" style="font-weight:400;color:var(--t3);margin-left:6px"></span>
          <label style="margin-left:auto;display:flex;align-items:center;gap:4px;font-weight:400;cursor:pointer"><input type="checkbox" id="scout-check-all"/> ALL</label>
        </div>
        <div class="scout-section-body" id="scout-a-body"><div class="scout-empty">Run &#128270; SCOUT to find matching companies from your DB</div></div>
      </div>
      <div class="scout-section">
        <div class="scout-section-head">
          <span>B &#8212; GAPS</span>
          <button class="btn sm" id="scout-fill-all-btn" style="margin-left:auto">&#9654; FILL ALL</button>
        </div>
        <div class="scout-section-body" id="scout-b-body"><div class="scout-empty">Run &#128270; SCOUT to see gaps</div></div>
      </div>
      <div class="scout-section">
        <div class="scout-section-head">
          <span>C &#8212; CANDIDATES</span>
          <button class="btn sm" id="scout-similar-btn" style="margin-left:auto">Find Similar &#8599;</button>
        </div>
        <div class="scout-section-body" id="scout-c-body"><div class="scout-empty">Click &#8220;Find Similar &#8599;&#8221; to discover companies not yet in your DB</div></div>
      </div>
    </div>
  </div>
</div></div>`;

  // Bug 1 — ensure modal is visible for both new and edit modes
  modal.style.display = 'block';

  // Wire events
  document.getElementById('scout-close-btn')?.addEventListener('click', audCloseModal);
  document.getElementById('scout-cancel-btn')?.addEventListener('click', audCloseModal);
  document.getElementById('scout-run-btn')?.addEventListener('click', () => { _scoutPending = true; _scoutRun(); });
  document.getElementById('scout-save-btn')?.addEventListener('click', () => _scoutSave(existingId));
  document.getElementById('scout-similar-btn')?.addEventListener('click', _scoutFindSimilar);
  document.getElementById('scout-check-all')?.addEventListener('change', e => _scoutToggleAll(e.target.checked));
  if (existingId) document.getElementById('scout-delete-btn')?.addEventListener('click', () => audDelete(existingId));
  document.getElementById('scout-fill-all-btn')?.addEventListener('click', _gapFillAll);

  // Bug 2 — prefill fields after modal is visible, then auto-run scout
  if (existing && !existing.is_system) {
    document.querySelector('#scout-name').value        = existing.name || '';
    document.querySelector('#scout-desc').value        = existing.description || '';
    document.querySelector('#scout-prompt').value      = existing.icp_prompt || '';
    document.querySelector('#scout-f-type').value      = existing.filters?.type || '';
    document.querySelector('#scout-f-region').value    = existing.filters?.region || '';
    document.querySelector('#scout-f-icp').value       = existing.filters?.minIcp || '';
    document.querySelector('#scout-hook').value        = existing.outreach_hook || '';
    document.querySelector('#scout-sort').value        = existing.sort_field || 'updated_at';
    // pre-check tag checkboxes
    const savedTags = existing.filters?.tags || [];
    document.querySelectorAll('.aud-modal-box input[type=checkbox][value]').forEach(cb => {
      cb.checked = savedTags.includes(cb.value);
    });
    // Bug 1: do NOT auto-run scout on open — user must click SCOUT explicitly
  }
}

async function _scoutRun() {
  // Bug 1: only proceed when triggered by the SCOUT button
  if (!_scoutPending) return;
  _scoutPending = false;

  // guard: retry if company list not yet loaded
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

  const country = document.getElementById('scout-f-country')?.value?.trim().toLowerCase() || '';
  const city    = document.getElementById('scout-f-city')?.value?.trim().toLowerCase()    || '';

  // Hard filter — deduplicate first
  const seen = new Set();
  let list = (S.companies || []).filter(c => { if (seen.has(c.id)) return false; seen.add(c.id); return true; });
  if (type)        list = list.filter(c => c.type === type);
  if (region)      list = list.filter(c => c.region === region);
  if (minIcp)      list = list.filter(c => (c.icp || 0) >= minIcp);
  if (tags.length) list = list.filter(c => tags.every(t => getCoTags(c).includes(t)));

  // Geo filter: check hq_country, hq_city, description, note, region — any field mentioning the value
  if (country) {
    list = list.filter(c => {
      const haystack = [c.hq_country, c.hq_city, c.description, c.note, c.region, c.category]
        .join(' ').toLowerCase();
      return haystack.includes(country);
    });
  }
  if (city) {
    list = list.filter(c => {
      const haystack = [c.hq_city, c.description, c.note, c.region]
        .join(' ').toLowerCase();
      return haystack.includes(city);
    });
  }

  // Optional AI filter when prompt is given
  if (prompt && list.length > 0) {
    if (statusEl) statusEl.textContent = '⟳ AI filtering…';
    bodyEl.innerHTML = '<div class="scout-running">&#9889; AI is scanning your DB&#8230;</div>';
    try {
      const coList = list.map(c =>
        `${c.name}|${[c.hq_city, c.hq_country].filter(Boolean).join(',')||'?'}|${getCoTags(c).join(',')}|ICP:${c.icp || '?'}|${c.type || ''}|${(c.description || '').slice(0, 60)}`
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

  // Bug 3: preserve currently-checked boxes across re-runs + seed from saved company_ids on first open
  const existingIds = new Set(_scoutExistingId
    ? (S.audiences.find(a => a.id === _scoutExistingId)?.company_ids || [])
    : []);
  document.querySelectorAll('#scout-a-body .scout-cb:checked').forEach(cb => existingIds.add(cb.value));

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
  const country   = document.getElementById('scout-f-country')?.value?.trim().toLowerCase() || '';
  const city      = document.getElementById('scout-f-city')?.value?.trim().toLowerCase()    || '';
  const tags      = [...document.querySelectorAll('.aud-tag-check input:checked')].map(el => el.value);

  const checkedIds = [...document.querySelectorAll('#scout-a-body .scout-cb:checked')].map(cb => cb.value);
  const companyIds = checkedIds.length > 0 ? checkedIds
    : _scoutResults.length > 0 ? _scoutResults.map(c => c.id || _slug(c.name))
    : (S.companies || []).map(c => c.id || _slug(c.name));

  const filters = { type: type || null, region: region || null, minIcp: minIcp || null, country: country || null, city: city || null, tags, icp_prompt: prompt || null };

  try {
    if (existingId) {
      await dbAud.patch(existingId, {
          name, description: desc || null, outreach_hook: hook || null,
          filters, icp_prompt: prompt || null, sort_field: sortField,
          company_ids: companyIds
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
  const prompt  = document.getElementById('scout-prompt')?.value?.trim()
    || document.getElementById('scout-name')?.value?.trim() || '';
  const country = document.getElementById('scout-f-country')?.value?.trim() || '';
  const city    = document.getElementById('scout-f-city')?.value?.trim()    || '';
  const type    = document.getElementById('scout-f-type')?.value            || '';
  const cBody   = document.getElementById('scout-c-body');
  if (!cBody) return;
  if (!prompt && !country && !city) {
    cBody.innerHTML = '<div class="scout-empty">Add a Scout Prompt or Country/City filter first</div>';
    return;
  }

  cBody.innerHTML = '<div class="scout-running">&#9889; Searching external databases&#8230;</div>';
  const existingNames = new Set((S.companies || []).map(c => c.name.toLowerCase()));

  // Build a focused query from all available context
  const geoCtx   = [city, country].filter(Boolean).join(', ');
  const typeCtx  = type ? `${type} companies` : 'companies';
  const fullQ    = [prompt, geoCtx ? `located in ${geoCtx}` : ''].filter(Boolean).join(', ');

  let candidates = [];

  // ── Attempt 1: b2b MCP (17.5M+ company database, best for geo+industry) ─
  try {
    cBody.innerHTML = '<div class="scout-running">&#9889; Querying b2b database&#8230;</div>';
    const b2bRes = await anthropicMcpFetch({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      mcp_servers: [{ type: 'url', url: 'https://b2b.ctpl.dev/sse', name: 'b2b' }],
      messages: [{ role: 'user', content:
        `Use the b2b search tool to find 10-15 ${typeCtx} matching: "${fullQ}" for potential data partnership with onAudience (EU first-party audience data).

Find companies that: ${prompt || 'match the specified criteria'}
${geoCtx ? `Location: ${geoCtx}` : ''}
Exclude these already in CRM: ${(S.companies || []).slice(0,30).map(c=>c.name).join(', ')}

After searching, return ONLY a JSON array:
[{"name":"...","category":"...","hq":"...","website":"...","why":"..."}]` }],
    });

    // Extract JSON from response (may be in tool results or text)
    const textBlocks = (b2bRes.content||[]).filter(b => b.type === 'text').map(b => b.text).join('');
    const toolResults = (b2bRes.content||[]).filter(b => b.type === 'mcp_tool_result')
      .map(b => b.content?.[0]?.text || '').join('\n');
    const raw = textBlocks.trim() || toolResults;
    const m = raw.match(/\[[\s\S]*\]/);
    if (m) {
      const parsed = JSON.parse(m[0]);
      if (parsed.length) {
        candidates = parsed;
        cBody.innerHTML = '<div class="scout-running">&#9889; b2b matched ' + parsed.length + ' — verifying&#8230;</div>';
      }
    }
  } catch (e) {
    console.warn('[scout] b2b MCP failed:', e.message);
  }

  // ── Attempt 2: web_search fallback if b2b returned nothing ─────────────
  if (!candidates.length) {
    try {
      cBody.innerHTML = '<div class="scout-running">&#9889; Web search fallback&#8230;</div>';
      const res = await anthropicFetch({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 700,
        tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 3 }],
        messages: [{ role: 'user', content:
          `Find 8-10 real ${typeCtx} matching: "${fullQ}" — for onAudience EU first-party data partnerships.
Exclude: ${(S.companies || []).slice(0, 30).map(c => c.name).join(', ')}
Return ONLY JSON: [{"name":"...","category":"...","hq":"...","website":"...","why":"..."}]` }],
      });
      const raw2 = res.content?.find(b => b.type === 'text')?.text?.trim() || '[]';
      const m2 = raw2.match(/\[[\s\S]*\]/);
      if (m2) candidates = JSON.parse(m2[0]);
    } catch (e2) {
      cBody.innerHTML = '<div class="scout-empty">Search failed — check API key</div>';
      return;
    }
  }

  if (!candidates.length) {
    cBody.innerHTML = '<div class="scout-empty">No new candidates found — try a different prompt or location</div>';
    return;
  }

  // Render candidates (filter out existing companies)
  const fresh = candidates.filter(co => !existingNames.has((co.name||'').toLowerCase()));
  cBody.innerHTML = fresh.map(co => {
    const slug = _slug(co.name||'');
    return `<div class="scout-row" style="padding:5px 8px;border-bottom:1px solid var(--rule2)">
      <div style="display:flex;align-items:baseline;gap:6px">
        <span style="font-family:'IBM Plex Mono',monospace;font-size:10px;font-weight:500;color:var(--t1)">${esc(co.name)}</span>
        ${co.hq ? `<span style="font-family:'IBM Plex Mono',monospace;font-size:8px;color:var(--t3)">${esc(co.hq)}</span>` : ''}
      </div>
      <div style="font-size:10px;color:var(--t2);margin:1px 0 3px">${esc(co.why||co.category||'')}</div>
      ${co.website ? `<a href="https://${co.website.replace(/^https?:\/\//,'')}" target="_blank" style="font-family:'IBM Plex Mono',monospace;font-size:8px;color:var(--g)">${esc(co.website)}</a>` : ''}
      <div style="display:flex;gap:4px;margin-top:4px">
        <button class="btn sm" onclick="audAddExternalCo('${esc(slug)}','${esc(co.name||'')}','${esc(co.category||'')}','${esc(co.hq||'')}','${esc(co.website||'')}')">+ Add to DB</button>
      </div>
    </div>`;
  }).join('') || '<div class="scout-empty">All found companies are already in your DB</div>';
}


async function wrapGapAction(btnEl, label, actionFn) {
  btnEl.disabled = true;
  btnEl.textContent = 'Working…';
  try {
    await actionFn();
    btnEl.textContent = 'Done ✓';
    btnEl.style.color = 'var(--g)';
    audRefreshDetail(_scoutExistingId || S.activeAudience?.id);
    setTimeout(() => { btnEl.textContent = label; btnEl.style.color = ''; btnEl.disabled = false; }, 2000);
  } catch(e) {
    btnEl.textContent = 'Error — retry';
    btnEl.style.color = 'var(--cr)';
    setTimeout(() => { btnEl.textContent = label; btnEl.style.color = ''; btnEl.disabled = false; }, 2000);
  }
}

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

  // Bug 2: wrap each button with loading state + feedback
  const btnContact = document.getElementById('scout-gap-btn-contact');
  const btnDesc    = document.getElementById('scout-gap-btn-desc');
  const btnHq      = document.getElementById('scout-gap-btn-hq');
  const btnAngle   = document.getElementById('scout-gap-btn-angle');
  if (btnContact) btnContact.addEventListener('click', () => wrapGapAction(btnContact, 'FIND CONTACTS &#9654;', _gapFindContacts));
  if (btnDesc)    btnDesc.addEventListener('click',    () => wrapGapAction(btnDesc,    'ENRICH &#9654;',        _gapEnrichDesc));
  if (btnHq)      btnHq.addEventListener('click',      () => wrapGapAction(btnHq,      'GEOCODE &#9654;',       _gapGeocode));
  if (btnAngle)   btnAngle.addEventListener('click',   () => wrapGapAction(btnAngle,   'GEN ANGLES &#9654;',    _gapGenAngles));
}

function _gapFindContacts() {
  if (!_gapLists.noContact.length) return;
  const names = _gapLists.noContact.map(c => c.name).join(', ');
  // Use internal AI bar to find contacts — no external session
  const inp = document.getElementById('aiInp');
  if (inp) {
    inp.value = `Find decision makers at: ${names.slice(0, 200)}`;
    window.runAI?.();
    // Close modal and show AI results in main hub
    audCloseModal();
  }
  clog('db', `Finding contacts for ${_gapLists.noContact.length} companies via AI bar`);
}

function _gapEnrichDesc() {
  if (!_gapLists.noDesc.length) return;
  window.enrFilteredIds = new Set(_gapLists.noDesc.map(c => c.id || _slug(c.name)));
  const _se=document.getElementById('scout-status'); if(_se) _se.textContent=`Queued for enrichment — switch to Enricher tab`;
  clog('db', `Enricher queued: ${_gapLists.noDesc.length} companies need description`);
}

function _gapGeocode() {
  if (!_gapLists.noHq.length) return;
  window.enrFilteredIds = new Set(_gapLists.noHq.map(c => c.id || _slug(c.name)));
  const _se=document.getElementById('scout-status'); if(_se) _se.textContent=`Queued for enrichment — switch to Enricher tab`;
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
        await dbCo.patch(c.id || _slug(c.name), { outreach_angle: angle }).catch(() => {});
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
  // Bug 2: run each gap action sequentially with per-step status
  const fillBtn = document.getElementById('scout-fill-all-btn');
  const steps = [
    { key: 'contact', label: 'FIND CONTACTS ▶', fn: _gapFindContacts, hasItems: () => _gapLists.noContact.length > 0 },
    { key: 'desc',    label: 'ENRICH ▶',         fn: _gapEnrichDesc,  hasItems: () => _gapLists.noDesc.length > 0 },
    { key: 'hq',      label: 'GEOCODE ▶',        fn: _gapGeocode,     hasItems: () => _gapLists.noHq.length > 0 },
    { key: 'angle',   label: 'GEN ANGLES ▶',     fn: _gapGenAngles,   hasItems: () => _gapLists.noAngle.length > 0 },
  ].filter(s => s.hasItems());

  if (!steps.length) return;

  if (fillBtn) { fillBtn.disabled = true; fillBtn.textContent = 'Running…'; }

  for (let i = 0; i < steps.length; i++) {
    const s = steps[i];
    if (fillBtn) fillBtn.textContent = `Step ${i + 1}/${steps.length}… ${s.label}`;
    const btn = document.getElementById(`scout-gap-btn-${s.key}`);
    try {
      await s.fn();
      if (btn) { btn.textContent = 'Done ✓'; btn.style.color = 'var(--g)'; }
    } catch(e) {
      if (btn) { btn.textContent = 'Error'; btn.style.color = 'var(--cr)'; }
    }
  }

  if (fillBtn) { fillBtn.textContent = `✓ Done (${steps.length}/${steps.length})`; fillBtn.disabled = false; }
  audRefreshDetail(_scoutExistingId || S.activeAudience?.id);
}


export function audCloseModal() {
  const modal = document.getElementById('audience-modal');
  if (modal) { modal.innerHTML = ''; modal.style.display = 'none'; }
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
      <a href="#" onclick="event.preventDefault();openCompany('${slug}')" style="font-size:10px;color:#178066;text-decoration:none">Open →</a>
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
      let list = S.companies;
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
  // Auto-generate hook if empty
  const _aud = S.audiences?.find(a => a.id === id);
  if (_aud && !_aud.outreach_hook && (_aud.company_ids || []).length > 0) {
    setTimeout(() => generateCampaignHook(id), 600);
  }
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
  if (aud?.is_system) { clog('info','System audiences cannot be edited'); return; }
  S._audienceBuiltIds = null;
  openAudienceModal(id); // works even if aud is undefined — modal handles missing gracefully
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
  const all = S.companies;
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
  const all = S.companies;
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

/* ─── Find contacts (trigger per-company lookup hint) ────────── */

export function audFindContacts(audienceId) {
  const aud = S.audiences.find(a => a.id === audienceId);
  if (!aud) return;
  const companies = getAudienceCompanies(aud);
  const noContacts = companies.filter(c =>
    !(S.contacts || []).some(ct =>
      (ct.company_name || '').toLowerCase() === (c.name || '').toLowerCase()
    )
  );
  if (noContacts.length === 0) {
    alert(`All ${companies.length} companies already have contacts in DB. Use ↗ CSV to export.`);
    return;
  }
  const names = noContacts.slice(0, 5).map(c => c.name).join(', ');
  const more = noContacts.length - 5;
  alert(`${noContacts.length} companies have no contacts yet:\n${names}${more > 0 ? ` … +${more} more` : ''}\n\nClick each company → 👤 Find DMs to research decision-makers.\nThen come back and export ↗ CSV for Lemlist.`);
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

/* ─── Campaign planning exports ────────────────────────────── */


/* ─── Company detail overlay inside audience detail ─────────── */

// (moved to later declaration)





export function audToggleCoRow(slug) {
  const exp = document.getElementById(`aud-coe-${slug}`);
  if (!exp) return;
  const row = document.getElementById(`aud-cor-${slug}`);
  const open = exp.style.display !== 'none';
  exp.style.display = open ? 'none' : '';
  if (row) row.classList.toggle('expanded', !open);
}

/* ─── Company detail overlay inside audience detail ─────────── */

let _ovClickOutsideHandler = null;

export function audOpenCoOverlay(slug, audId) {
  audCloseCoOverlay();

  const co = S.companies.find(c => (c.id || _slug(c.name)) === slug);
  if (!co) return;

  const wrap = document.getElementById('aud-detail-wrap');
  if (!wrap) return;
  wrap.style.position = 'relative';

  const aud = audId ? S.audiences.find(a => a.id === audId) : null;
  const contacts = (S.contacts || []).filter(ct =>
    ct.company_id === (co.id || slug) ||
    _slug(ct.company_name || '') === _slug(co.name));

  const tc = tClass(co.type), tl = tLabel(co.type);
  const st = co.icp ? '★'.repeat(Math.min(5, Math.round(co.icp / 2))) : '';
  const rs = co.relationship_status || '';
  const audIdJ = JSON.stringify(audId || '');
  const slugJ  = JSON.stringify(slug);

  const factsArr = [co.category, co.hq_city, co.size].filter(Boolean);
  const factsHtml = factsArr.map((v, i) =>
    `<span>${esc(v)}</span>${i < factsArr.length - 1 ? '<span style="opacity:.35">·</span>' : ''}`
  ).join('');

  const ctHtml = contacts.length
    ? contacts.map(ct => `
      <div class="aud-co-ov-ct">
        <span class="aud-co-ov-ct-name">${esc(ct.full_name || '?')}</span>
        ${ct.title  ? `<span class="aud-co-ov-ct-title">${esc(ct.title)}</span>`  : ''}
        ${ct.email  ? `<span class="aud-co-ov-ct-email">${esc(ct.email)}</span>`  : ''}
      </div>`).join('')
    : `<div style="font:400 9px 'IBM Plex Sans',sans-serif;color:var(--t4);padding:3px 0">No contacts yet</div>`;

  const ov = document.createElement('div');
  ov.id = 'aud-co-overlay';
  ov.className = 'aud-co-overlay';
  ov.innerHTML = `
<div class="aud-co-ov-inner">
  <div class="aud-co-ov-hd">
    <div style="display:flex;flex-direction:column;gap:4px;min-width:0;flex:1">
      <span class="aud-co-ov-name">${esc(co.name)}</span>
      <div style="display:flex;align-items:center;gap:5px;flex-wrap:wrap">
        <span class="tag ${tc}" style="font-size:7px">${esc(tl)}</span>
        ${rs ? `<span class="tag" style="font-size:7px;background:var(--gb);color:var(--g)">${esc(rs)}</span>` : ''}
        ${st ? `<span class="aud-stars">${st}</span>` : ''}
      </div>
    </div>
    <button class="btn sm" id="aud-co-ov-close" style="flex-shrink:0;margin-left:8px">✕</button>
  </div>
  ${factsHtml ? `<div class="aud-co-ov-facts">${factsHtml}</div>` : ''}
  ${(co.description || co.note) ? `
  <div class="aud-co-ov-section">
    <div class="aud-co-ov-lbl">DESCRIPTION</div>
    <div class="aud-co-ov-text">${esc((co.description || co.note || '').slice(0, 500))}</div>
  </div>` : ''}
  ${co.outreach_angle ? `
  <div class="aud-co-ov-section">
    <div class="aud-co-ov-lbl">OUTREACH ANGLE</div>
    <div class="aud-co-ov-text" style="color:var(--g)">${esc(co.outreach_angle)}</div>
  </div>` : ''}
  <div class="aud-co-ov-section" style="flex:1">
    <div class="aud-co-ov-lbl">CONTACTS (${contacts.length})</div>
    ${ctHtml}
  </div>
  <div class="aud-co-ov-actions">
    <button class="btn sm p" id="aud-ov-email">✉ DRAFT EMAIL</button>
    <button class="btn sm"   id="aud-ov-dms">👤 FIND DMs</button>
    <button class="btn sm"   id="aud-ov-full">↗ OPEN FULL</button>
  </div>
</div>`;

  wrap.appendChild(ov);
  requestAnimationFrame(() => ov.classList.add('open'));

  /* Close button */
  ov.querySelector('#aud-co-ov-close')?.addEventListener('click', e => {
    e.stopPropagation(); audCloseCoOverlay();
  });

  /* Action buttons */
  ov.querySelector('#aud-ov-email')?.addEventListener('click', e => {
    e.stopPropagation();
    window.openComposer?.({ company: co.name, companyId: co.id || slug });
    audCloseCoOverlay();
  });
  ov.querySelector('#aud-ov-dms')?.addEventListener('click', e => {
    e.stopPropagation();
    window.openCompany?.(co);
    window.bgFindDMs?.();
    audCloseCoOverlay();
  });
  ov.querySelector('#aud-ov-full')?.addEventListener('click', e => {
    e.stopPropagation();
    window.openCompany?.(co);
    audCloseCoOverlay();
  });

  /* Click-outside: use capture so we intercept before any row onclick fires.
     Stop propagation entirely — only the overlay close should happen,
     NOT whatever is underneath (row open, audCloseDetail, etc.) */
  _ovClickOutsideHandler = e => {
    if (!ov.contains(e.target)) {
      e.stopPropagation();
      audCloseCoOverlay();
    }
  };
  setTimeout(() => wrap.addEventListener('click', _ovClickOutsideHandler, true), 50);
}

export function audCloseCoOverlay() {
  const ov = document.getElementById('aud-co-overlay');
  if (!ov) return;
  const wrap = ov.parentElement;
  ov.classList.remove('open');
  setTimeout(() => ov.remove(), 200);
  if (wrap && _ovClickOutsideHandler) {
    wrap.removeEventListener('click', _ovClickOutsideHandler, true);
    _ovClickOutsideHandler = null;
  }
  /* restore position so aud-detail-wrap is unaffected */
  if (wrap) wrap.style.position = '';
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

export async function audB2bLookup(audId) {
  const aud = S.audiences.find(a => a.id === audId);
  if (!aud) return;

  // Build / reuse dialog element
  let dlg = document.getElementById('b2b-dlg');
  if (!dlg) {
    dlg = document.createElement('div');
    dlg.id = 'b2b-dlg';
    document.body.appendChild(dlg);
  }
  dlg.style.cssText = 'position:fixed;inset:0;z-index:11000;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.55)';

  const prompt  = aud.icp_prompt || aud.description || aud.name || '';
  const country = aud.filters?.country || '';
  const city    = aud.filters?.city    || '';
  const geoCtx  = [city, country].filter(Boolean).join(', ');
  const fullQ   = [prompt, geoCtx ? `in ${geoCtx}` : ''].filter(Boolean).join(' ');

  dlg.innerHTML = `
<div style="background:var(--surf);border:1px solid var(--rule);border-radius:4px;width:640px;max-height:80vh;display:flex;flex-direction:column;overflow:hidden">
  <div style="display:flex;align-items:center;gap:8px;padding:10px 14px;border-bottom:1px solid var(--rule);flex-shrink:0">
    <span style="font-family:'IBM Plex Mono',monospace;font-size:10px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--t1)">🔍 B2B LOOKUP</span>
    <span style="font-family:'IBM Plex Mono',monospace;font-size:9px;color:var(--t3);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(fullQ)}</span>
    <button class="btn sm" id="b2b-close-btn">✕</button>
  </div>
  <div id="b2b-results" style="flex:1;overflow-y:auto;padding:8px 14px">
    <div style="font-family:'IBM Plex Mono',monospace;font-size:9px;color:var(--t3);padding:16px 0;text-align:center">⚡ Querying b2b database…</div>
  </div>
  <div style="padding:10px 14px;border-top:1px solid var(--rule);display:flex;align-items:center;gap:8px;flex-shrink:0">
    <span id="b2b-sel-count" style="font-family:'IBM Plex Mono',monospace;font-size:9px;color:var(--t3)">0 selected</span>
    <button class="btn p" id="b2b-add-btn" style="margin-left:auto" disabled>+ Add to Audience</button>
    <button class="btn" id="b2b-cancel-btn">Cancel</button>
  </div>
</div>`;

  // Wire close buttons
  const close = () => { dlg.style.display = 'none'; dlg.innerHTML = ''; };
  document.getElementById('b2b-close-btn').addEventListener('click', close);
  document.getElementById('b2b-cancel-btn').addEventListener('click', close);
  dlg.addEventListener('mousedown', e => { if (e.target === dlg) close(); });

  // Wire add button
  const addBtn = document.getElementById('b2b-add-btn');
  const selCount = document.getElementById('b2b-sel-count');
  const resultsEl = document.getElementById('b2b-results');

  const updateSelCount = () => {
    const n = document.querySelectorAll('#b2b-results .b2b-cb:checked').length;
    selCount.textContent = `${n} selected`;
    addBtn.disabled = n === 0;
  };

  // ── Query b2b MCP ──────────────────────────────────────────────────────
  let candidates = [];
  const existingIds = new Set(aud.company_ids || []);
  const existingNames = new Set((S.companies || []).map(c => c.name.toLowerCase()));

  try {
    const res = await anthropicMcpFetch({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1400,
      mcp_servers: [{ type: 'url', url: 'https://b2b.ctpl.dev/sse', name: 'b2b' }],
      messages: [{ role: 'user', content:
        `Use the b2b search_companies tool to find 15-20 companies for: "${fullQ}".
Focus on adtech, media, data, or publisher companies relevant to EU data partnerships.
${geoCtx ? `Prioritise companies based in or operating in: ${geoCtx}.` : ''}
Deduplicate — skip subdomains, blogs, or case-study sites of the same company.
Return ONLY a compact JSON array, no prose:
[{"name":"...","category":"...","hq":"...","website":"...","why":"one sentence"}]` }],
    });
    const textBlocks = (res.content||[]).filter(b => b.type==='text').map(b=>b.text).join('');
    const toolResults = (res.content||[]).filter(b => b.type==='mcp_tool_result')
      .map(b => b.content?.[0]?.text || '').join('\n');
    const raw = textBlocks.trim() || toolResults;
    const m = raw.match(/\[[\s\S]*\]/);
    candidates = m ? JSON.parse(m[0]) : [];
  } catch(e) {
    resultsEl.innerHTML = `<div style="font-family:'IBM Plex Mono',monospace;font-size:9px;color:var(--prc);padding:16px 0;text-align:center">b2b lookup failed: ${esc(e.message)}</div>`;
    return;
  }

  if (!candidates.length) {
    resultsEl.innerHTML = `<div style="font-family:'IBM Plex Mono',monospace;font-size:9px;color:var(--t3);padding:16px 0;text-align:center">No results — try editing the audience prompt</div>`;
    return;
  }

  // Render results as checkboxes
  resultsEl.innerHTML = candidates.map((co, i) => {
    const slug = _slug(co.name||'');
    const inAud = existingIds.has(slug);
    const inDb  = existingNames.has((co.name||'').toLowerCase());
    const badge = inAud ? '<span style="font-size:8px;color:var(--g);margin-left:4px">✓ in audience</span>'
                : inDb  ? '<span style="font-size:8px;color:var(--t3);margin-left:4px">in DB</span>' : '';
    return `<label style="display:flex;align-items:flex-start;gap:8px;padding:6px 0;border-bottom:1px solid var(--rule3);cursor:pointer">
      <input type="checkbox" class="b2b-cb" data-idx="${i}" data-slug="${esc(slug)}"
        style="margin-top:3px;flex-shrink:0" ${inAud ? 'disabled' : ''} />
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap">
          <span style="font-family:'IBM Plex Mono',monospace;font-size:10px;font-weight:500;color:var(--t1)">${esc(co.name)}</span>
          ${co.hq ? `<span style="font-family:'IBM Plex Mono',monospace;font-size:8px;color:var(--t3)">${esc(co.hq)}</span>` : ''}
          ${badge}
        </div>
        <div style="font-size:10px;color:var(--t2);margin-top:1px">${esc(co.why||co.category||'')}</div>
        ${co.website ? `<a href="https://${co.website.replace(/^https?:\/\//,'')}" target="_blank" style="font-family:'IBM Plex Mono',monospace;font-size:8px;color:var(--g)">${esc(co.website)}</a>` : ''}
      </div>
    </label>`;
  }).join('');

  // Checkbox change listener
  resultsEl.addEventListener('change', updateSelCount);
  updateSelCount();

  // ── Add selected to audience ────────────────────────────────────────────
  addBtn.addEventListener('click', async () => {
    const checked = [...document.querySelectorAll('#b2b-results .b2b-cb:checked')];
    if (!checked.length) return;

    addBtn.disabled = true;
    addBtn.textContent = '⟳ Adding…';

    const SB = 'https://nyzkkqqjnkctcmxoirdj.supabase.co';
    const HDR = { 'apikey': window._oaToken||'', 'Authorization': 'Bearer '+(window._oaToken||''), 'Content-Type': 'application/json' };

    const newIds = [];
    for (const cb of checked) {
      const idx = parseInt(cb.dataset.idx);
      const co = candidates[idx];
      const slug = _slug(co.name||'');
      if (!slug) continue;

      // Save to Supabase companies if not already there
      if (!existingNames.has((co.name||'').toLowerCase())) {
        const body = { id: slug, name: co.name, category: co.category||null,
          hq_city: co.hq||null, website: co.website||null,
          type: 'prospect', note: 'Added via b2b Lookup',
          updated_at: new Date().toISOString() };
        const r = await fetch(`${SB}/rest/v1/companies`, {
          method: 'POST',
          headers: { ...HDR, 'Prefer': 'resolution=merge-duplicates,return=minimal' },
          body: JSON.stringify(body)
        });
        if (r.ok && !S.companies.find(c => c.id === slug)) S.companies.push({...body});
      }
      newIds.push(slug);
    }

    // Update audience company_ids
    const merged = [...new Set([...(aud.company_ids||[]), ...newIds])];
    const r = await fetch(`https://nyzkkqqjnkctcmxoirdj.supabase.co/rest/v1/audiences?id=eq.${encodeURIComponent(audId)}`, {
      method: 'PATCH',
      headers: { ...HDR, 'Prefer': 'return=minimal' },
      body: JSON.stringify({ company_ids: merged, updated_at: new Date().toISOString() })
    });

    if (r.ok) {
      aud.company_ids = merged;
      addBtn.textContent = `✓ Added ${newIds.length}`;
      setTimeout(() => {
        close();
        // Refresh detail view
        window.renderAudienceDetail?.(audId);
      }, 800);
    } else {
      addBtn.textContent = '✗ Failed';
      addBtn.disabled = false;
    }
  });
}


export async function audAddExternalCo(slug, name, category, hq, website) {
  if (!name) return;
  try {
    const body = {
      id:         slug || _slug(name),
      name,
      category:   category || null,
      hq_city:    hq || null,
      website:    website || null,
      type:       'prospect',
      note:       'Added via Audience Scout (external)',
      updated_at: new Date().toISOString(),
    };
    await dbCo.upsert(body);
    if (!S.companies.find(c => c.id === body.id)) S.companies.push({ ...body });
    const btn = document.querySelector(`[data-add-slug="${slug}"]`);
    if (btn) { btn.textContent = '✓ Added'; btn.disabled = true; btn.style.color = 'var(--g)'; }
    clog('db', `Added <b>${esc(name)}</b> to CRM as prospect`);
  } catch (e) {
    clog('db', `Failed to add ${esc(name)}: ${e.message}`);
  }
}

/* ── Re-exports from extracted modules ──────────────────────── */
export { icpFindByIcp, icpMatch, icpSaveStep, icpSaveAudience,
  icpEditModal, icpRegenHook, icpPatchAudience } from './aud-icp.js?v=20260409d2';

export { generateCampaignHook, generateEmailTemplate, saveCampaignTemplate,
  launchCampaign, audDraftEmailToCo, audGenAngleForCo } from './aud-campaign.js?v=20260409d2';
