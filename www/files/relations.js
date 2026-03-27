/* ═══════════════════════════════════════════════════════════════
   relations.js — Company relations graph rendering
   ═══════════════════════════════════════════════════════════════ */

import { companies } from './state.js';
import { _slug, esc } from './utils.js';
import { fetchRelations as apiFetchRelations } from './api.js';

const TYPE_ICONS = {
  data_partner: '🤝', dsp_integration: '📡', marketplace_listed: '🛒',
  tech_integration: '⚙️', client_of: '💰', acquired_by: '🏢',
  subsidiary_of: '🏢', competes_with: '⚔️', co_sell: '🤲', reseller: '🏪',
};

const TYPE_LABELS = {
  data_partner: 'Data Partner', dsp_integration: 'DSP Integration',
  marketplace_listed: 'Marketplace Listed', tech_integration: 'Tech Integration',
  client_of: 'Client Of', acquired_by: 'Acquired By',
  subsidiary_of: 'Subsidiary Of', competes_with: 'Competes With',
  co_sell: 'Co-Sell', reseller: 'Reseller',
};

export async function loadRelations(slug) {
  const body  = document.getElementById('rel-body');
  const badge = document.getElementById('rel-count-badge');
  if (!body) return;

  try {
    const rels = await apiFetchRelations(slug);

    if (!Array.isArray(rels) || !rels.length) {
      body.innerHTML = '<div style="font-family:\'IBM Plex Mono\',monospace;font-size:10px;color:var(--t3);text-transform:uppercase">No relations recorded</div>';
      if (badge) badge.textContent = '';
      return;
    }

    /* build slug→company lookup */
    const coMap = {};
    companies.forEach(x => { if (x.name) coMap[_slug(x.name)] = x; });

    /* group by type */
    const groups = {};
    rels.forEach(r => {
      groups[r.relation_type] = groups[r.relation_type] || [];
      const isSrc = r.from_company === slug;
      const oid   = isSrc ? r.to_company : r.from_company;
      const co    = coMap[oid];
      groups[r.relation_type].push({
        oid, name: co?.name || oid,
        arrow: r.direction === 'bidirectional' ? '⇄' : (isSrc ? '→' : '←'),
        scls: r.strength === 'confirmed' ? 'tc' : 'tpr',
        strength: r.strength, notes: r.notes, has: !!co,
      });
    });

    body.innerHTML = Object.entries(groups).map(([tp, items]) => `
      <div style="margin-bottom:10px">
        <div style="font-family:'IBM Plex Mono',monospace;font-size:9px;text-transform:uppercase;letter-spacing:.06em;color:var(--t3);margin-bottom:4px;display:flex;align-items:center;gap:5px">
          <span>${TYPE_ICONS[tp] || '•'}</span><span>${TYPE_LABELS[tp] || tp}</span>
          <span style="margin-left:auto;background:var(--surf3);border-radius:2px;padding:0 5px">${items.length}</span>
        </div>
        ${items.map(it => `<div style="display:flex;align-items:flex-start;gap:8px;padding:5px 0;border-bottom:1px solid var(--rule3)">
          <span style="font-family:'IBM Plex Mono',monospace;font-size:13px;color:var(--g);flex-shrink:0;margin-top:1px">${it.arrow}</span>
          <div style="flex:1;min-width:0">
            <div style="display:flex;align-items:center;gap:6px">
              ${it.has
                ? `<span style="font-size:12px;font-weight:500;color:var(--g);cursor:pointer" onclick="window.openCompany(window._coBySlug('${it.oid}'))">${esc(it.name)}</span>`
                : `<span style="font-size:12px;font-weight:500;color:var(--t1)">${esc(it.name)}</span>`
              }
              <span class="tag ${it.scls}" style="margin-left:auto;flex-shrink:0">${it.strength}</span>
            </div>
            ${it.notes ? `<div style="font-size:11px;color:var(--t3);margin-top:2px;line-height:1.4">${esc(it.notes)}</div>` : ''}
          </div>
        </div>`).join('')}
      </div>
    `).join('');

    if (badge) badge.textContent = `(${rels.length})`;
  } catch (e) {
    body.innerHTML = `<div style="font-size:11px;color:var(--t3)">Error: ${esc(e.message)}</div>`;
  }
}
