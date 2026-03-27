/* ═══ audiences.js — Audience management ═══
   Audiences = saved lists of companies matching a description.
   AI queries DB first (no web lookup needed for most queries).
   Tag/type/region filters are passed as hard context to AI.
   Lemlist export: CSV today, MCP connector stub ready.
   ════════════════════════════════════════════════════════ */

import { SB_URL } from './config.js';
import { authHdr } from './utils.js';
import S from './state.js';
import { classify, _slug, getCoTags, getAv, ini, tClass, tLabel, esc } from './utils.js';
import { anthropicFetch } from './api.js';
import { clog } from './hub.js';

/* ─── Supabase ─────────────────────────────────────────────── */

async function sbLoadAudiences() {
  try {
    const res = await fetch(`${SB_URL}/rest/v1/audiences?order=updated_at.desc`, {
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

/* ─── Left panel render ────────────────────────────────────── */

export async function renderAudiencesPanel() {
  const panel = document.getElementById('audiencesPanel');
  if (!panel) return;
  S.audiences = await sbLoadAudiences();
  panel.innerHTML = `
<div class="aud-toolbar">
  <span class="aud-count">${S.audiences.length} AUDIENCE${S.audiences.length !== 1 ? 'S' : ''}</span>
  <button class="btn sm p" onclick="audNew()">＋ NEW</button>
</div>
<div class="aud-list">
  ${S.audiences.length === 0
    ? '<div class="aud-empty">No audiences yet.<br>Use AI to build your first list.</div>'
    : S.audiences.map(audRowHtml).join('')}
</div>`;
}

function audRowHtml(a) {
  const n = Array.isArray(a.company_ids) ? a.company_ids.length : 0;
  const f = a.filters || {};
  const tagPills = (f.tags || []).map(t => `<span class="tag tpr" style="font-size:7px">${esc(t)}</span>`).join('');
  const typePill = f.type ? `<span class="tag tp" style="font-size:7px">${esc(f.type)}</span>` : '';
  const active = S.activeAudience?.id === a.id ? ' aud-row-active' : '';
  return `
<div class="aud-row${active}" onclick="audOpen(${JSON.stringify(a.id)})">
  <div class="aud-row-head">
    <span class="aud-row-name">${esc(a.name)}</span>
    <span class="aud-row-count">${n} co</span>
  </div>
  ${a.description ? `<div class="aud-row-desc">${esc(a.description)}</div>` : ''}
  <div class="aud-row-pills">${typePill}${tagPills}</div>
  <div class="aud-row-actions">
    <button class="btn sm" onclick="event.stopPropagation();audEdit(${JSON.stringify(a.id)})">EDIT</button>
    <button class="btn sm" onclick="event.stopPropagation();audExportCsv(${JSON.stringify(a.id)})">↗ CSV</button>
    <button class="btn sm" onclick="event.stopPropagation();audDelete(${JSON.stringify(a.id)})" style="color:var(--prc)">✕</button>
  </div>
</div>`;
}

/* ─── Audience detail (center panel) ──────────────────────── */

export function renderAudienceDetail(id) {
  const aud = S.audiences.find(a => a.id === id);
  if (!aud) return;
  S.activeAudience = aud;

  const companies = getAudienceCompanies(aud);
  const center = document.getElementById('centerScroll');
  if (!center) return;

  // Hide spoke / company panel
  const es = document.getElementById('emptyState');
  const cp = document.getElementById('coPanel');
  const tc = document.getElementById('tcf-center');
  if (es) es.style.display = 'none';
  if (cp) cp.style.display = 'none';
  if (tc) tc.style.display = 'none';

  const f = aud.filters || {};
  const tagPills = (f.tags || []).map(t => `<span class="tag tpr">${esc(t)}</span>`).join('');
  const sortOpts = ['updated_at', 'name', 'icp', 'size'].map(v =>
    `<option value="${v}" ${(aud.sort_field || 'updated_at') === v ? 'selected' : ''}>${sortLabel(v)}</option>`
  ).join('');

  // Inject detail HTML — wraps inside an existing named div so it scrolls naturally
  let detailEl = document.getElementById('aud-detail-wrap');
  if (!detailEl) {
    detailEl = document.createElement('div');
    detailEl.id = 'aud-detail-wrap';
    center.appendChild(detailEl);
  }
  detailEl.style.display = '';

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
  <div class="aud-detail-toolbar">
    <span class="aud-detail-toolbar-count">${companies.length} COMPANIES</span>
    <div style="display:flex;gap:5px;align-items:center;margin-left:auto">
      <label style="font-family:'IBM Plex Mono',monospace;font-size:8px;color:var(--t3);text-transform:uppercase;letter-spacing:.05em">SORT</label>
      <select class="aud-sort-sel" onchange="audSetSort(${JSON.stringify(aud.id)},this.value)">${sortOpts}</select>
    </div>
    <button class="btn sm p" onclick="audFindContacts(${JSON.stringify(aud.id)})">👤 GET CONTACTS</button>
    <button class="btn sm" onclick="audExportCsv(${JSON.stringify(aud.id)})">↗ CSV</button>
    <button class="btn sm" onclick="audRefreshDetail(${JSON.stringify(aud.id)})">↺</button>
  </div>
  <div class="aud-co-list" id="aud-co-list-inner">
    ${companies.length === 0
      ? '<div class="aud-empty" style="padding:24px">No companies match this audience.</div>'
      : companies.map(c => audCoRowHtml(c, aud)).join('')}
  </div>
</div>`;
}

function getAudienceCompanies(aud) {
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

export function openAudienceModal(existingId) {
  S._audienceBuiltIds = null;
  const existing = existingId ? S.audiences.find(a => a.id === existingId) : null;
  const f = existing?.filters || {};

  // Collect all tags from DB
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
<div class="aud-modal-overlay" onclick="event.target===this&&audCloseModal()">
<div class="aud-modal-box">
  <div class="aud-modal-head">
    <span class="aud-modal-title">${existing ? 'EDIT AUDIENCE' : 'NEW AUDIENCE'}</span>
    <button class="btn sm" onclick="audCloseModal()">✕</button>
  </div>
  <div class="aud-modal-body">

    <div class="aud-form-row">
      <label class="aud-label">NAME</label>
      <input id="aud-name" class="aud-input" value="${esc(existing?.name || '')}" placeholder="e.g. EU DSP Prospects"/>
    </div>

    <div class="aud-form-row">
      <label class="aud-label">DESCRIPTION</label>
      <textarea id="aud-desc" class="aud-input aud-textarea" placeholder="What is this audience for?">${esc(existing?.description || '')}</textarea>
    </div>

    <div class="aud-form-row">
      <label class="aud-label">AI BUILD <span style="color:var(--t3);font-size:8px;text-transform:none;letter-spacing:0">— describe target, AI matches from DB using active filters as context</span></label>
      <div style="display:flex;gap:6px">
        <input id="aud-ai-prompt" class="aud-input" style="flex:1" placeholder="e.g. EU-based programmatic DSPs with CTV capabilities and cookieless interest"/>
        <button class="btn sm p" onclick="audAIBuild()">✨ BUILD</button>
      </div>
      <div id="aud-ai-status" style="min-height:16px;margin-top:3px;font-family:'IBM Plex Mono',monospace;font-size:8px"></div>
    </div>

    <div class="aud-filters-section">
      <div class="aud-label" style="margin-bottom:6px">FILTERS <span style="color:var(--t3);font-size:8px;font-weight:400;text-transform:none;letter-spacing:0">pre-filter for AI + permanent hard filter on audience</span></div>
      <div class="aud-filter-row">
        <label class="aud-label" style="min-width:32px">TYPE</label>
        <select id="aud-f-type" class="aud-select">${typeOpts}</select>
        <label class="aud-label" style="min-width:44px">REGION</label>
        <select id="aud-f-region" class="aud-select">${regionOpts}</select>
        <label class="aud-label" style="min-width:48px">MIN ICP</label>
        <input id="aud-f-icp" class="aud-input" style="width:48px" type="number" min="1" max="10" value="${esc(f.minIcp || '')}" placeholder="1–10"/>
      </div>
      <div class="aud-filter-row" style="flex-wrap:wrap;gap:4px;margin-top:6px">
        <label class="aud-label" style="width:100%;margin-bottom:2px">TAGS</label>
        ${tagCheckboxes || '<span style="font-family:\'IBM Plex Mono\',monospace;font-size:8px;color:var(--t4)">No tags in DB yet</span>'}
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
      <button class="btn p" onclick="audSave(${JSON.stringify(existingId || '')})">SAVE AUDIENCE</button>
      <button class="btn" onclick="audCloseModal()">CANCEL</button>
      ${existing ? `<button class="btn" onclick="audDelete(${JSON.stringify(existingId)})" style="margin-left:auto;color:var(--prc);border-color:var(--prr)">DELETE</button>` : ''}
    </div>
  </div>
</div>
</div>`;

  // Wire live preview
  ['aud-f-type', 'aud-f-region', 'aud-f-icp'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', _audPreviewFilter);
    document.getElementById(id)?.addEventListener('input', _audPreviewFilter);
  });
  modal.querySelectorAll('.aud-tag-check input').forEach(cb =>
    cb.addEventListener('change', _audPreviewFilter));
  _audPreviewFilter();
}

export function audCloseModal() {
  const modal = document.getElementById('audience-modal');
  if (modal) modal.innerHTML = '';
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

export async function audSave(existingId) {
  const name = document.getElementById('aud-name')?.value?.trim();
  if (!name) { alert('Name required'); return; }

  const type = document.getElementById('aud-f-type')?.value || '';
  const region = document.getElementById('aud-f-region')?.value || '';
  const minIcp = parseInt(document.getElementById('aud-f-icp')?.value) || 0;
  const tags = [...document.querySelectorAll('.aud-tag-check input:checked')].map(el => el.value);
  const sortField = document.getElementById('aud-sort')?.value || 'updated_at';
  const desc = document.getElementById('aud-desc')?.value?.trim() || '';

  // company_ids: AI-built takes priority, else derive from filters
  let companyIds = S._audienceBuiltIds;
  if (!companyIds || companyIds.length === 0) {
    let list = S.companies || [];
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

  try {
    await sbSaveAudience(payload);
    audCloseModal();
    await renderAudiencesPanel();
    audOpen(id);
    clog('db', `Audience saved: <b>${esc(name)}</b> (${companyIds.length} companies)`);
  } catch (e) {
    alert('Save failed: ' + e.message);
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
  S._audienceBuiltIds = null;
  openAudienceModal(id);
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
