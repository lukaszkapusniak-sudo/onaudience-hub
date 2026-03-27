/* ═══════════════════════════════════════════════════════════════
   detail.js — Company detail panel (center area)
   ═══════════════════════════════════════════════════════════════ */

import { companies, contacts, setCurrent } from './state.js';
import { _slug, tagCls, avatarColor, initials, esc, relTime, icpStars } from './utils.js';
import { loadRelations } from './relations.js';
import { fetchContactsForCompany } from './api.js';
import { highlightRow } from './list.js';

/* ═══ Open Company ═══════════════════════════════════════════ */

export function openCompany(c) {
  if (!c) return;
  setCurrent(c);
  window.currentCompany = c;

  const center = document.getElementById('center');
  center.innerHTML = renderPanel(c);

  highlightRow(_slug(c.name));

  /* async: load relations */
  if (c.name) setTimeout(() => loadRelations(_slug(c.name)), 80);

  /* async: load contacts count */
  loadContactsBadge(c);
}

/* ═══ Close / empty state ════════════════════════════════════ */

export function closeCompany() {
  setCurrent(null);
  window.currentCompany = null;
  const center = document.getElementById('center');
  center.innerHTML = renderEmptyState();
  document.querySelectorAll('.co-row').forEach(r => r.classList.remove('act'));
}

export function renderEmptyState() {
  return `<div class="empty-state">
    <div class="qa-grid">
      <div class="qa-card" onclick="window.openResearchModal()">
        <div class="qa-card-icon">🔍</div>
        <div class="qa-card-title">Research a company</div>
        <div class="qa-card-desc">Full contact report with DMs and outreach angle</div>
      </div>
      <div class="qa-card" onclick="window.openClaude('Find 10 DSPs in EMEA that buy 3rd party audience data for onAudience')">
        <div class="qa-card-icon">🎯</div>
        <div class="qa-card-title">Find prospects</div>
        <div class="qa-card-desc">AI-powered prospect discovery</div>
      </div>
      <div class="qa-card" onclick="window.openClaude('Review my top ICP accounts this week for onAudience outreach')">
        <div class="qa-card-icon">⭐</div>
        <div class="qa-card-title">Top picks this week</div>
        <div class="qa-card-desc">AI picks based on ICP fit and freshness</div>
      </div>
      <div class="qa-card" onclick="window.openResearchModal()">
        <div class="qa-card-icon">🔗</div>
        <div class="qa-card-title">Find similar</div>
        <div class="qa-card-desc">Companies like your best clients</div>
      </div>
      <div class="qa-card" onclick="window.openClaude('Which dormant prospects in my pipeline should I re-engage for onAudience?')">
        <div class="qa-card-icon">♻️</div>
        <div class="qa-card-title">Re-engage dormant</div>
        <div class="qa-card-desc">Revive stale conversations</div>
      </div>
      <div class="qa-card" onclick="window.openPanel('meeseeks')">
        <div class="qa-card-icon">✉</div>
        <div class="qa-card-title">Draft email</div>
        <div class="qa-card-desc">Meeseeks composer for outreach</div>
      </div>
    </div>
  </div>`;
}

/* ═══ Panel Renderer ═════════════════════════════════════════ */

function renderPanel(c) {
  const cls = tagCls(c.type);
  const bg  = avatarColor(c.type);
  const slug = _slug(c.name);

  return `<div class="co-panel">
    <!-- Header -->
    <div class="co-header">
      <div class="co-header-av" style="background:${bg}">${initials(c.name)}</div>
      <div>
        <div class="co-header-name">${esc(c.name)}</div>
        <div style="display:flex;gap:6px;align-items:center;margin-top:2px">
          <span class="tag ${cls}">${c.type || 'prospect'}</span>
          ${c.icp ? `<span style="font-family:'IBM Plex Mono',monospace;font-size:11px;color:var(--g)">${icpStars(c.icp)} (${c.icp})</span>` : ''}
        </div>
      </div>
      <button class="co-header-close" onclick="window.closeCompany()">✕</button>
    </div>

    <!-- 🏢 Company Overview -->
    <div class="ps">
      <div class="ps-head" onclick="this.nextElementSibling.classList.toggle('closed')">🏢 Company Overview</div>
      <div class="ps-body">
        <div style="display:flex;gap:16px">
          <table class="info-tbl" style="flex:1">
            ${infoRow('Category', c.category)}
            ${infoRow('Region / HQ', c.region || c.hq_city)}
            ${infoRow('Employees', c.size)}
            ${infoRow('Description', c.description)}
            ${infoRow('Founded', c.founded_year)}
            ${infoRow('Website', c.website ? `<a href="https://${c.website}" target="_blank" style="color:var(--g)">${esc(c.website)}</a>` : null)}
            ${infoRow('GVL / TCF ID', c.tcf_vendor_id)}
            ${infoRow('Funding', c.funding)}
            ${infoRow('DSPs', c.dsps ? (Array.isArray(c.dsps) ? c.dsps.join(', ') : c.dsps) : null)}
            ${infoRow('DB Updated', relTime(c.updated_at))}
          </table>
          <div style="flex-shrink:0;max-width:200px">
            ${renderTechPills(c.tech_stack)}
          </div>
        </div>
      </div>
    </div>

    <!-- 📦 Products -->
    ${renderProducts(c)}

    <!-- 👤 Contacts -->
    <div class="ps">
      <div class="ps-head" onclick="this.nextElementSibling.classList.toggle('closed')">
        👤 Contacts <span id="contact-count-badge" style="margin-left:auto;font-size:9px;color:var(--t3)"></span>
      </div>
      <div class="ps-body" id="contacts-section">
        <button class="btn sm" onclick="window.openClaude('Find decision makers at ${esc(c.name)} for onAudience data partnership outreach')">Find contacts ↗</button>
      </div>
    </div>

    <!-- 💡 Outreach Angle -->
    ${c.outreach_angle ? `<div class="ps">
      <div class="ps-head" onclick="this.nextElementSibling.classList.toggle('closed')">💡 Outreach Angle</div>
      <div class="ps-body">
        <div style="font-size:12px;line-height:1.5;color:var(--t2)">${esc(c.outreach_angle)}</div>
      </div>
    </div>` : ''}

    <!-- 🔗 Relations -->
    <div class="ps">
      <div class="ps-head" onclick="this.nextElementSibling.classList.toggle('closed')">
        🔗 Relations <span id="rel-count-badge" style="margin-left:auto;font-size:9px;color:var(--t3)"></span>
      </div>
      <div class="ps-body" id="rel-body">
        <div style="font-family:'IBM Plex Mono',monospace;font-size:10px;color:var(--t3)">Loading…</div>
      </div>
    </div>

    <!-- 🔗 Quick Links -->
    <div class="ps">
      <div class="ps-head" onclick="this.nextElementSibling.classList.toggle('closed')">🔗 Quick Links</div>
      <div class="ps-body">
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          <a class="btn sm" href="https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(c.name)}" target="_blank">LinkedIn People ↗</a>
          ${c.linkedin_slug ? `<a class="btn sm" href="https://www.linkedin.com/company/${c.linkedin_slug}" target="_blank">Company LI ↗</a>` : ''}
          ${c.website ? `<a class="btn sm" href="https://${c.website}" target="_blank">Website ↗</a>` : ''}
        </div>
      </div>
    </div>

    <!-- ⚡ Actions -->
    <div class="ps">
      <div class="ps-head" onclick="this.nextElementSibling.classList.toggle('closed')">⚡ Actions</div>
      <div class="ps-body">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
          <button class="btn sm" onclick="window.openClaude('Full contact report for ${esc(c.name)} — onAudience data partnership')">Full report ↗</button>
          <button class="btn sm" onclick="window.openClaude('Find decision makers at ${esc(c.name)}')">Find DMs ↗</button>
          <button class="btn sm p" onclick="window.openPanel('meeseeks', {company:'${esc(c.name)}'})">✉ Draft email</button>
          <a class="btn sm" href="https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(c.name)}" target="_blank">LinkedIn ↗</a>
          <button class="btn sm" onclick="window.openClaude('Find companies similar to ${esc(c.name)} for onAudience')">Find similar ↗</button>
          <button class="btn sm" onclick="window.openClaude('Check gmail history for ${esc(c.name)}')">Gmail history ↗</button>
        </div>
      </div>
    </div>

  </div>`;
}

/* ── Helpers ──────────────────────────────────────────────────── */

function infoRow(label, value) {
  if (value === null || value === undefined || value === '') return '';
  return `<tr><td>${label}</td><td>${typeof value === 'string' && value.startsWith('<') ? value : esc(String(value))}</td></tr>`;
}

function renderTechPills(stack) {
  if (!stack || !Array.isArray(stack) || !stack.length) return '';
  return `<div style="font-family:'IBM Plex Mono',monospace;font-size:8px;text-transform:uppercase;letter-spacing:.06em;color:var(--t3);margin-bottom:4px">Tech Stack</div>
    <div style="display:flex;flex-wrap:wrap;gap:2px">
      ${stack.map(t => `<span class="pill">${esc(t.tool || t)}</span>`).join('')}
    </div>`;
}

function renderProducts(c) {
  if (!c.products?.products?.length) return '';
  const p = c.products;
  return `<div class="ps">
    <div class="ps-head" onclick="this.nextElementSibling.classList.toggle('closed')">📦 Products</div>
    <div class="ps-body">
      <table class="info-tbl">
        <tr><td style="font-weight:500">Name</td><td style="font-weight:500">Description</td><td style="font-weight:500">Target</td></tr>
        ${p.products.map(pr => `<tr><td>${esc(pr.name)}</td><td>${esc(pr.description || '')}</td><td>${esc(pr.target_user || '')}</td></tr>`).join('')}
      </table>
      ${p.integrations_advertised?.length ? `<div style="margin-top:8px;font-size:10px;color:var(--t3)"><b>Integrations:</b> ${p.integrations_advertised.map(i => esc(i)).join(', ')}</div>` : ''}
      ${p.positioning?.length ? `<div style="margin-top:4px;font-size:10px;color:var(--t3)"><b>Positioning:</b> ${p.positioning.map(i => esc(i)).join(', ')}</div>` : ''}
    </div>
  </div>`;
}

/* ── Load contacts badge asynchronously ──────────────────────── */

async function loadContactsBadge(c) {
  try {
    const slug = _slug(c.name);
    const cts = await fetchContactsForCompany(slug);
    const badge = document.getElementById('contact-count-badge');
    const section = document.getElementById('contacts-section');
    if (badge) badge.textContent = `(${cts.length})`;
    if (section && cts.length) {
      section.innerHTML = cts.map(ct => `
        <div style="display:flex;align-items:center;gap:8px;padding:4px 0;border-bottom:1px solid var(--rule3);cursor:pointer"
             onclick='window.openContact(${JSON.stringify(ct).replace(/'/g,"\\'")})'> 
          <div class="co-av" style="background:var(--g);width:24px;height:24px;font-size:9px;border-radius:50%">${initials(ct.full_name)}</div>
          <div style="flex:1;min-width:0">
            <div style="font-size:11px;font-weight:500">${esc(ct.full_name)}</div>
            <div style="font-size:10px;color:var(--t3)">${esc(ct.title || '')}</div>
          </div>
          ${ct.email ? `<span style="font-family:'IBM Plex Mono',monospace;font-size:9px;color:var(--g)">${esc(ct.email)}</span>` : ''}
        </div>
      `).join('') + `<button class="btn sm" style="margin-top:6px" onclick="window.openClaude('Find decision makers at ${esc(c.name)} for onAudience data partnership outreach')">Find more ↗</button>`;
    }
  } catch (e) { /* silent */ }
}
