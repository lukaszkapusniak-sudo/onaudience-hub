/* ═══════════════════════════════════════════════════════════════
   enricher.js — Enricher tab
   AI-powered company find + batch enrichment script generator
   ═══════════════════════════════════════════════════════════════ */

import { companies } from './state.js';
import { _slug, esc, tagCls, avatarColor, initials } from './utils.js';

let enrSelected = new Set();
let enrFiltered = [];

/* ═══ Render Enricher Tab ════════════════════════════════════ */

export function renderEnricherTab() {
  enrFiltered = [...companies];
  enrSelected.clear();
  renderEnrList();
  renderTagCloud();
  updateSelCount();
}

/* ═══ Render Company List ════════════════════════════════════ */

function renderEnrList() {
  const el = document.getElementById('enrCoList');
  if (!el) return;

  el.innerHTML = enrFiltered.map(c => {
    const slug = _slug(c.name);
    const checked = enrSelected.has(slug) ? 'checked' : '';
    return `<div style="display:flex;align-items:center;gap:6px;padding:4px 8px;border-bottom:1px solid var(--rule3)">
      <input type="checkbox" ${checked} onchange="window.enrToggle('${slug}',this.checked)"
        style="flex-shrink:0;accent-color:var(--g)">
      <div class="co-av" style="background:${avatarColor(c.type)};width:22px;height:22px;font-size:9px">${initials(c.name)}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:11px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(c.name)}</div>
      </div>
      <span class="tag ${tagCls(c.type)}" style="flex-shrink:0">${c.type || 'prospect'}</span>
      ${c.icp ? `<span style="font-family:'IBM Plex Mono',monospace;font-size:9px;color:var(--g)">${c.icp}</span>` : ''}
    </div>`;
  }).join('');

  const meta = document.getElementById('enrListMeta');
  if (meta) meta.textContent = `${enrFiltered.length} shown`;
}

/* ═══ Toggle Selection ═══════════════════════════════════════ */

export function enrToggle(slug, on) {
  if (on) enrSelected.add(slug); else enrSelected.delete(slug);
  updateSelCount();
}

export function enrSelectAll() {
  enrFiltered.forEach(c => enrSelected.add(_slug(c.name)));
  renderEnrList();
  updateSelCount();
}

export function enrSelectNone() {
  enrSelected.clear();
  renderEnrList();
  updateSelCount();
}

function updateSelCount() {
  const el = document.getElementById('enrSelCount');
  if (el) el.textContent = `${enrSelected.size} selected`;
}

/* ═══ AI Find ════════════════════════════════════════════════ */

export function enrFind() {
  const desc = document.getElementById('enrDesc')?.value?.trim();
  if (!desc) return;

  /* Simple keyword matching — upgrade to Anthropic API call for smarter matching */
  const kw = desc.toLowerCase().split(/\s+/);
  enrFiltered = companies.filter(c => {
    const hay = `${c.name} ${c.note || ''} ${c.category || ''} ${c.region || ''} ${c.type || ''} ${c.description || ''}`.toLowerCase();
    return kw.some(k => hay.includes(k));
  });

  enrSelected.clear();
  renderEnrList();
  updateSelCount();
}

/* ═══ Generate Script ════════════════════════════════════════ */

export function enrGenerate() {
  if (!enrSelected.size) { alert('Select at least one company'); return; }

  const selected = companies.filter(c => enrSelected.has(_slug(c.name)));
  const domains = selected.map(c => c.website || `${_slug(c.name)}.com`);

  /* Generate a Python enrichment script */
  const script = `#!/usr/bin/env python3
"""Auto-generated enrichment script for ${selected.length} companies"""
import subprocess, json

DOMAINS = ${JSON.stringify(domains, null, 2)}

for d in DOMAINS:
    print(f"Enriching {d}...")
    # TODO: plug in your enrichment pipeline
`;

  /* Show in modal or copy to clipboard */
  navigator.clipboard.writeText(script).then(() => {
    alert(`Script for ${selected.length} companies copied to clipboard`);
  }).catch(() => {
    console.log(script);
    alert('Script logged to console');
  });
}

/* ═══ Tag Cloud ══════════════════════════════════════════════ */

function renderTagCloud() {
  const el = document.getElementById('enrTagCloud');
  if (!el) return;

  const cats = {};
  companies.forEach(c => {
    const cat = c.category || 'Uncategorized';
    cats[cat] = (cats[cat] || 0) + 1;
  });

  el.innerHTML = Object.entries(cats)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, count]) =>
      `<button class="btn sm" onclick="window.enrFilterByTag('${esc(cat)}')">${esc(cat)} (${count})</button>`
    ).join('');
}

export function enrFilterByTag(tag) {
  enrFiltered = companies.filter(c => (c.category || 'Uncategorized') === tag);
  enrSelected.clear();
  renderEnrList();
  updateSelCount();
}
