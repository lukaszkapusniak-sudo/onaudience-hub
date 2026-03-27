/* ═══════════════════════════════════════════════════════════════
   contacts.js — Contact drawer + contacts tab logic
   ═══════════════════════════════════════════════════════════════ */

import { esc, initials } from './utils.js';

/* ═══ Open Contact Drawer ════════════════════════════════════ */

export function openContact(ct) {
  const drawer  = document.getElementById('contactDrawer');
  const overlay = document.getElementById('drawerOverlay');
  if (!drawer || !ct) return;

  drawer.innerHTML = renderDrawerContent(ct);
  drawer.classList.add('open');
  if (overlay) overlay.classList.add('vis');
}

export function closeContact() {
  const drawer  = document.getElementById('contactDrawer');
  const overlay = document.getElementById('drawerOverlay');
  if (drawer)  drawer.classList.remove('open');
  if (overlay) overlay.classList.remove('vis');
}

function renderDrawerContent(ct) {
  return `
    <div style="padding:12px;border-bottom:1px solid var(--rule);display:flex;align-items:center;gap:10px">
      <div class="co-av" style="background:var(--g);border-radius:50%;width:36px;height:36px;font-size:13px">${initials(ct.full_name)}</div>
      <div style="flex:1">
        <div style="font-size:14px;font-weight:500">${esc(ct.full_name)}</div>
        <div style="font-size:11px;color:var(--t3)">${esc(ct.title || '')} · ${esc(ct.company_name || '')}</div>
      </div>
      <button onclick="window.closeContact()" style="background:none;border:none;font-size:16px;cursor:pointer;color:var(--t3)">✕</button>
    </div>

    <div style="padding:12px;flex:1;overflow-y:auto">
      <table class="info-tbl">
        ${ct.email ? `<tr><td>Email</td><td><a href="mailto:${esc(ct.email)}" style="color:var(--g)">${esc(ct.email)}</a></td></tr>` : ''}
        ${ct.title ? `<tr><td>Title</td><td>${esc(ct.title)}</td></tr>` : ''}
        ${ct.company_name ? `<tr><td>Company</td><td>${esc(ct.company_name)}</td></tr>` : ''}
        ${ct.linkedin_url ? `<tr><td>LinkedIn</td><td><a href="${esc(ct.linkedin_url)}" target="_blank" style="color:var(--g)">Profile ↗</a></td></tr>` : ''}
        ${ct.notes ? `<tr><td>Notes</td><td>${esc(ct.notes)}</td></tr>` : ''}
      </table>

      <div style="display:flex;flex-direction:column;gap:6px;margin-top:12px">
        <button class="btn p full" onclick="window.openPanel('meeseeks', {company:'${esc(ct.company_name)}',contactName:'${esc(ct.full_name)}',contactTitle:'${esc(ct.title || '')}'})">✉ Draft Email</button>
        ${ct.linkedin_url ? `<a class="btn full" href="${esc(ct.linkedin_url)}" target="_blank">LinkedIn ↗</a>` : ''}
        <button class="btn full" onclick="window.openClaude('Check gmail history for ${esc(ct.full_name)} at ${esc(ct.company_name)}')">Gmail History ↗</button>
        <button class="btn full" onclick="window.openClaude('Full research on ${esc(ct.full_name)} at ${esc(ct.company_name)} for onAudience outreach')">Full Research ↗</button>
      </div>
    </div>
  `;
}
