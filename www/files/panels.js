/* ═══════════════════════════════════════════════════════════════
   panels.js — Panel modal (iframe host), research modal, context menu
   ═══════════════════════════════════════════════════════════════ */

import { PANELS } from './config.js';
import { companies } from './state.js';
import { _slug, esc } from './utils.js';
import { getTheme } from './theme.js';

/* ═══ Panel Modal (iframe host) ══════════════════════════════ */

export function openPanel(id, payload) {
  const p = PANELS[id];
  if (!p) return;
  const modal  = document.getElementById('panelModal');
  const iframe = document.getElementById('panelIframe');
  if (!modal || !iframe) return;

  modal.style.display = 'flex';
  iframe.src = p.src;
  iframe.onload = () => {
    iframe.contentWindow.postMessage({ type: 'COMPOSE_PREFILL', payload }, '*');
    iframe.contentWindow.postMessage({ type: 'THEME_SYNC', payload: { theme: getTheme() } }, '*');
  };
}

export function closePanel() {
  const modal  = document.getElementById('panelModal');
  const iframe = document.getElementById('panelIframe');
  if (modal) modal.style.display = 'none';
  if (iframe) iframe.src = '';
}

/* ═══ Research Modal ═════════════════════════════════════════ */

export function openResearchModal() {
  const ov = document.getElementById('overlay');
  if (ov) ov.classList.add('vis');
}

export function closeResearchModal() {
  const ov = document.getElementById('overlay');
  if (ov) ov.classList.remove('vis');
}

export function submitResearch() {
  const input = document.getElementById('modalInput');
  const name = input?.value?.trim();
  if (!name) return;
  closeResearchModal();
  /* Open Claude with research prompt */
  const prompt = `Full contact report for ${name} — onAudience data partnership outreach. Include decision makers, tech stack, activation path, outreach angle.`;
  window.open('https://claude.ai/new?q=' + encodeURIComponent(prompt), '_blank');
}

/* ═══ Context Menu ═══════════════════════════════════════════ */

let ctxSlug = null;

export function showCtx(e, slug) {
  e.preventDefault();
  ctxSlug = slug;
  const menu = document.getElementById('ctxMenu');
  if (!menu) return;

  const co = companies.find(c => _slug(c.name) === slug);
  const name = co?.name || slug;

  menu.innerHTML = `
    <div style="padding:5px 12px;font-family:'IBM Plex Mono',monospace;font-size:10px;font-weight:500;color:var(--t1);border-bottom:1px solid var(--rule2);margin-bottom:2px">${esc(name)}</div>
    <div class="ctx-item" onclick="window.openClaude('Full contact report for ${esc(name)} — onAudience outreach')">🔍 Full contact report</div>
    <div class="ctx-item" onclick="window.openClaude('Find decision makers at ${esc(name)}')">👤 Find decision makers</div>
    <div class="ctx-item" onclick="window.openPanel('meeseeks',{company:'${esc(name)}'})">✉ Draft outreach</div>
    <div class="ctx-item" onclick="window.open('https://www.linkedin.com/messaging/?recipient=${encodeURIComponent(name)}','_blank')">💬 LinkedIn message</div>
    <div class="ctx-item" onclick="window.openClaude('Find companies similar to ${esc(name)} for onAudience')">🔗 Find similar</div>
    <div class="ctx-item" onclick="window.openClaude('Check gmail history for ${esc(name)}')">📧 Check email history</div>
    ${co?.type === 'nogo' ? `<div class="ctx-sep"></div><div class="ctx-item" onclick="window.openClaude('Why was ${esc(name)} marked as no-go for onAudience?')">⚠️ Why no outreach?</div>` : ''}
    ${co?.type === 'prospect' ? `<div class="ctx-sep"></div><div class="ctx-item" onclick="window.openClaude('Prioritize ${esc(name)} — what makes them a hot prospect for onAudience?')">🚀 Prioritize</div>` : ''}
  `;

  menu.style.display = 'block';
  menu.style.left = Math.min(e.clientX, window.innerWidth - 220) + 'px';
  menu.style.top  = Math.min(e.clientY, window.innerHeight - 300) + 'px';
}

export function hideCtx() {
  const menu = document.getElementById('ctxMenu');
  if (menu) menu.style.display = 'none';
}

/* ═══ Listen for panel messages ══════════════════════════════ */

export function initPanelListener() {
  window.addEventListener('message', e => {
    if (e.data?.type === 'COMPOSE_READY') {
      /* store result, optionally close panel */
      console.log('Panel result:', e.data.payload);
    }
  });
}
