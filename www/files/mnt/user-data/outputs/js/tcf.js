/* ═══════════════════════════════════════════════════════════════
   tcf.js — TCF / GVL tab
   Spoke list-select, OA GVL 716 reference, GVL vendor fetch
   ═══════════════════════════════════════════════════════════════ */

import { companies } from './state.js';
import { _slug, esc } from './utils.js';
import { fetchGVL } from './api.js';

let gvlData = null;
let gvlLoading = false;

/* ═══ Render TCF Tab ═════════════════════════════════════════ */

export function renderTCFTab() {
  const el = document.getElementById('tcfList');
  if (!el) return;

  /* filter companies with tcf_vendor_id */
  const tcfCos = companies.filter(c => c.tcf_vendor_id);

  el.innerHTML = `
    <div style="padding:8px;border-bottom:1px solid var(--rule2)">
      <div style="font-family:'IBM Plex Mono',monospace;font-size:9px;text-transform:uppercase;letter-spacing:.06em;color:var(--t3);margin-bottom:4px">
        onAudience GVL ID: <span style="color:var(--g);font-weight:600">716</span>
      </div>
      <div style="display:flex;gap:6px">
        <input id="tcfSearch" placeholder="Search vendor or ID…" oninput="window.filterTCF(this.value)"
          style="flex:1;height:24px;padding:0 8px;border:1px solid var(--rule);border-radius:2px;
                 font-family:'IBM Plex Mono',monospace;font-size:10px;background:var(--surf2);color:var(--t1);outline:none">
        <button class="btn sm" onclick="window.loadGVLVendors()">Load GVL</button>
      </div>
    </div>
    <div style="padding:4px 8px;font-family:'IBM Plex Mono',monospace;font-size:9px;color:var(--t3);border-bottom:1px solid var(--rule3)">
      ${tcfCos.length} companies with TCF vendor ID
    </div>
    <div id="tcfRows">
      ${tcfCos.map(c => `
        <div class="co-row" onclick="window.openCompany(window._coBySlug('${_slug(c.name)}'))">
          <span style="font-family:'IBM Plex Mono',monospace;font-size:11px;font-weight:600;color:var(--g);width:40px;flex-shrink:0">${c.tcf_vendor_id}</span>
          <div class="co-info">
            <div class="co-name">${esc(c.name)}</div>
            <div class="co-note">${esc(c.category || '')}</div>
          </div>
        </div>
      `).join('')}
    </div>
    <div id="gvlResults" style="display:none;padding:8px"></div>
  `;
}

/* ═══ Filter TCF list ════════════════════════════════════════ */

export function filterTCF(q) {
  const rows = document.getElementById('tcfRows');
  if (!rows) return;
  const items = rows.querySelectorAll('.co-row');
  const ql = q.toLowerCase();
  items.forEach(row => {
    const text = row.textContent.toLowerCase();
    row.style.display = text.includes(ql) ? '' : 'none';
  });
}

/* ═══ Load GVL Vendors ═══════════════════════════════════════ */

export async function loadGVLVendors() {
  if (gvlLoading) return;
  gvlLoading = true;
  const el = document.getElementById('gvlResults');
  if (el) { el.style.display = 'block'; el.innerHTML = '<div style="font-size:10px;color:var(--t3)">Loading GVL…</div>'; }

  try {
    if (!gvlData) {
      gvlData = await fetchGVL();
    }
    const vendors = Object.values(gvlData.vendors || {});
    if (el) {
      el.innerHTML = `<div style="font-family:'IBM Plex Mono',monospace;font-size:9px;color:var(--t3);margin-bottom:4px">${vendors.length} GVL vendors loaded</div>`;
    }
  } catch (e) {
    if (el) el.innerHTML = `<div style="font-size:10px;color:var(--t3)">GVL error: ${esc(e.message)}</div>`;
  }
  gvlLoading = false;
}
