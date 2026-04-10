/* ═══ aud-icp.js — ICP-based audience finder ═══ */

import { SB_URL, MODEL_CREATIVE } from './config.js?v=20260410d22';
import S from './state.js?v=20260410d22';
import { esc, _slug, getCoTags, authHdr } from './utils.js?v=20260410d22';
import { anthropicFetch } from './api.js?v=20260410d22';
import { audiences as dbAud } from './db.js?v=20260410d22';
import { clog } from './hub.js?v=20260410d22';
import {
  sbSaveAudience,
  audCloseModal,
  renderAudiencesPanel,
  openAudienceModal,
} from './audiences.js?v=20260410d22';

export function icpFindByIcp() {
  const all = S.companies;
  const n = all.filter((c) => c.type !== 'nogo').length;
  _icpSetContent(`
<div class="aud-modal-overlay" onmousedown="event.target===this&&audCloseModal()">
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
      <button class="btn p" onclick="window._setScoutPending();icpMatch()">✦ Find Matches</button>
      <button class="btn" onclick="audCloseModal()">Cancel</button>
    </div>
  </div>
</div>
</div>`);
}

/* ── Step 2: Run match ──────────────────────────────────── */
export async function icpMatch() {
  // Bug 1: only proceed when triggered by the Find Matches button
  if (!_scoutPending) return;
  _scoutPending = false;

  const promptEl = document.getElementById('icp-prompt');
  const prompt = promptEl?.value?.trim();
  if (!prompt) {
    promptEl?.focus();
    return;
  }
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
    const all = S.companies;
    const candidates = all.filter((c) => c.type !== 'nogo').slice(0, 500);

    const coList = candidates.map((c) => ({
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
      messages: [
        { role: 'user', content: `ICP: ${prompt}\n\nCompanies: ${JSON.stringify(coList)}` },
      ],
    });

    const raw = data.content?.[0]?.text || '[]';
    let scores;
    try {
      const match = raw.match(/\[[\s\S]*\]/);
      scores = JSON.parse(match ? match[0] : raw);
    } catch {
      scores = [];
    }

    _icpResults = scores
      .map((s) => {
        const co = candidates.find((c) => (c.id || _slug(c.name)) === s.id);
        return co ? { ...s, co } : null;
      })
      .filter(Boolean);

    _icpRenderResults();
  } catch (e) {
    _icpSetContent(`
<div class="aud-modal-overlay" onmousedown="event.target===this&&audCloseModal()">
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
  const results = _icpResults;
  if (!results.length) {
    _icpSetContent(`
<div class="aud-modal-overlay" onmousedown="event.target===this&&audCloseModal()">
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

  const rows = results
    .map((r, i) => {
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
    })
    .join('');

  const preselCount = results.filter((r) => r.score >= _icpThreshold).length;
  const threshOpts = [50, 60, 70, 80]
    .map((v) => `<option value="${v}" ${_icpThreshold === v ? 'selected' : ''}>${v}</option>`)
    .join('');

  _icpSetContent(`
<div class="aud-modal-overlay" onmousedown="event.target===this&&audCloseModal()">
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
}
window._icpBack = () => _icpRenderResults();

window._icpSelAll = function (sel) {
  document.querySelectorAll('.icp-chk').forEach((b) => {
    b.checked = sel;
  });
  _icpUpdateSelCount();
};
window._icpSetThreshold = function (val) {
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
  boxes.forEach((b, i) => {
    if (b.checked && _icpResults[i]) selected.push(_icpResults[i]);
  });
  if (!selected.length) {
    return;
  }

  _icpSetContent(`
<div class="aud-modal-overlay">
<div class="aud-modal-box icp-modal" style="align-items:center;justify-content:center;min-height:180px;display:flex;flex-direction:column;gap:14px">
  <div class="icp-spinner"></div>
  <div style="font-family:'IBM Plex Mono',monospace;font-size:10px;color:var(--t3);text-transform:uppercase;letter-spacing:.06em">✦ Generating title & hook…</div>
</div>
</div>`);

  let name = '',
    hook = '';
  try {
    const [tRes, hRes] = await Promise.all([
      anthropicFetch({
        model: MODEL_CREATIVE,
        max_tokens: 20,
        messages: [
          {
            role: 'user',
            content: `Generate a short 3-5 word audience name for this ICP: "${_icpPrompt}". Only the name, no punctuation. Examples: EU CTV DSPs, Cookieless Mid-Market, DACH Agency Groups`,
          },
        ],
      }),
      anthropicFetch({
        model: MODEL_CREATIVE,
        max_tokens: 100,
        messages: [
          {
            role: 'user',
            content: `Write a 2-sentence outreach hook for onAudience EU first-party data partnerships targeting: "${_icpPrompt}". Be specific, no fluff.`,
          },
        ],
      }),
    ]);
    name = tRes.content?.[0]?.text?.trim() || '';
    hook = hRes.content?.[0]?.text?.trim() || '';
  } catch (e) {
    clog('ai', `ICP title/hook gen error: ${esc(e.message)}`);
  }

  const ids = selected.map((r) => r.co.id || _slug(r.co.name));
  _icpSetContent(`
<div class="aud-modal-overlay" onmousedown="event.target===this&&audCloseModal()">
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
      <button class="btn p" id="icp-save-btn" data-ids="${ids.join(',')}" onclick="icpSaveAudience(this.dataset.ids.split(','))">💾 Save</button>
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
  if (!name) {
    if (errEl) errEl.textContent = 'Name required';
    return;
  }
  if (errEl) errEl.textContent = '';

  const id = `aud-${Date.now()}`;
  const payload = {
    id,
    name,
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
  const aud = S.audiences.find((a) => a.id === id);
  if (!aud) return;
  const modal = document.getElementById('audience-modal');
  if (!modal) return;
  const n = Array.isArray(aud.company_ids) ? aud.company_ids.length : 0;
  modal.innerHTML = `
<div class="aud-modal-overlay" onmousedown="event.target===this&&audCloseModal()">
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
  const aud = S.audiences.find((a) => a.id === id);
  const prompt = aud?.filters?.icp_prompt || aud?.icp_prompt || aud?.name || '';
  const statusEl = document.getElementById('icp-regen-status');
  if (statusEl) statusEl.textContent = '⟳ generating…';
  try {
    const res = await anthropicFetch({
      model: MODEL_CREATIVE,
      max_tokens: 100,
      messages: [
        {
          role: 'user',
          content: `Write a 2-sentence outreach hook for onAudience EU first-party data partnerships targeting: "${prompt}". Be specific, no fluff.`,
        },
      ],
    });
    const hook = res.content?.[0]?.text?.trim() || '';
    const el = document.getElementById('icp-edit-hook');
    if (el) el.value = hook;
    if (statusEl) statusEl.textContent = '✓';
    setTimeout(() => {
      if (statusEl) statusEl.textContent = '';
    }, 2000);
  } catch (e) {
    if (statusEl) statusEl.textContent = 'Error';
  }
}

export async function icpPatchAudience(id) {
  const name = document.getElementById('icp-edit-name')?.value?.trim();
  const hook = document.getElementById('icp-edit-hook')?.value?.trim() || '';
  const errEl = document.getElementById('icp-edit-err');
  if (!name) {
    if (errEl) errEl.textContent = 'Name required';
    return;
  }
  if (errEl) errEl.textContent = '';
  try {
    await dbAud.patch(id, { name, outreach_hook: hook || null });
    const aud = S.audiences.find((a) => a.id === id);
    if (aud) {
      aud.name = name;
      aud.outreach_hook = hook || null;
    }
    audCloseModal();
    await renderAudiencesPanel();
    if (S.activeAudience?.id === id) renderAudienceDetail(id);
    clog('db', `Audience updated: <b>${esc(name)}</b>`);
  } catch (e) {
    if (errEl) errEl.textContent = 'Save failed: ' + e.message;
  }
}
