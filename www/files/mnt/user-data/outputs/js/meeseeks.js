/* ═══════════════════════════════════════════════════════════════
   meeseeks.js — Meeseeks / Composer modal
   In-hub email composer with persona selection and AI generation
   ═══════════════════════════════════════════════════════════════ */

import { companies, contacts, currentCompany } from './state.js';
import { _slug, esc } from './utils.js';
import { fetchContactsForCompany } from './api.js';

/* ── Personas ────────────────────────────────────────────────── */
const PERSONAS = [
  { id: 'steve', name: 'STEVE', desc: 'Direct, data-driven, concise. Default outreach persona.' },
  { id: 'chill', name: 'CHILL', desc: 'Warm, conversational, relationship-first.' },
  { id: 'exec',  name: 'EXEC',  desc: 'Formal, brief, C-level appropriate.' },
];

let meesState = {
  persona: 'steve',
  company: '',
  contact: null,
  context: '',
  angle: '',
  output: '',
};

/* ═══ Open Meeseeks ══════════════════════════════════════════ */

export function openMeeseeks(prefill) {
  const modal = document.getElementById('meeseeksModal');
  if (!modal) return;

  /* apply prefill */
  if (prefill) {
    meesState.company = prefill.company || currentCompany?.name || '';
    meesState.contact = prefill.contactName ? { full_name: prefill.contactName, title: prefill.contactTitle || '' } : null;
    meesState.context = prefill.description || currentCompany?.description || '';
    meesState.angle   = prefill.angle || currentCompany?.outreach_angle || '';
  } else if (currentCompany) {
    meesState.company = currentCompany.name || '';
    meesState.context = currentCompany.description || '';
    meesState.angle   = currentCompany.outreach_angle || '';
  }

  renderMeeseeks();
  modal.classList.add('vis');
}

export function closeMeeseeks() {
  const modal = document.getElementById('meeseeksModal');
  if (modal) modal.classList.remove('vis');
}

/* ═══ Render ═════════════════════════════════════════════════ */

function renderMeeseeks() {
  const box = document.querySelector('.meesBox');
  if (!box) return;

  box.innerHTML = `
    <!-- Header -->
    <div style="padding:10px 14px;border-bottom:1px solid var(--rule);display:flex;align-items:center;gap:8px">
      <div class="nav-logo" style="width:24px;height:24px;font-size:11px">oA</div>
      <span style="font-family:'IBM Plex Mono',monospace;font-size:11px;font-weight:500">
        Meeseeks <span style="color:var(--t3);font-weight:300">/ Composer</span>
      </span>
      <span class="tag tpo" style="margin-left:4px">${meesState.persona.toUpperCase()}</span>
      <button onclick="window.closeMeeseeks()" style="margin-left:auto;background:none;border:none;font-size:16px;cursor:pointer;color:var(--t3)">✕</button>
    </div>

    <!-- Body -->
    <div style="flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px">

      <!-- Persona -->
      <div>
        <div style="font-family:'IBM Plex Mono',monospace;font-size:8px;text-transform:uppercase;letter-spacing:.06em;color:var(--t3);margin-bottom:4px">Pick Meeseeks</div>
        <div style="display:flex;gap:4px">
          ${PERSONAS.map(p => `<button class="btn sm ${p.id === meesState.persona ? 'p' : ''}" onclick="window.meesSetPersona('${p.id}')">${p.name}</button>`).join('')}
        </div>
      </div>

      <!-- Company -->
      <div>
        <div style="font-family:'IBM Plex Mono',monospace;font-size:8px;text-transform:uppercase;letter-spacing:.06em;color:var(--t3);margin-bottom:4px">Company</div>
        <input id="meesCompany" value="${esc(meesState.company)}" placeholder="Company name"
          style="width:100%;height:26px;padding:0 8px;border:1px solid var(--rule);border-radius:2px;
                 font-family:'IBM Plex Mono',monospace;font-size:11px;background:var(--surf2);color:var(--t1);outline:none">
      </div>

      <!-- Contact -->
      <div>
        <div style="font-family:'IBM Plex Mono',monospace;font-size:8px;text-transform:uppercase;letter-spacing:.06em;color:var(--t3);margin-bottom:4px">Contact</div>
        <div id="meesContactSlot" style="font-size:11px;color:var(--t2)">
          ${meesState.contact ? `${esc(meesState.contact.full_name)} — ${esc(meesState.contact.title)}` : 'Open a company from the hub to load contacts'}
        </div>
      </div>

      <!-- Context -->
      <div>
        <div style="font-family:'IBM Plex Mono',monospace;font-size:8px;text-transform:uppercase;letter-spacing:.06em;color:var(--t3);margin-bottom:4px">
          Context — signals, news, what they do
        </div>
        <textarea id="meesContext" rows="3" placeholder="What you know about them…"
          style="width:100%;resize:vertical;padding:6px 8px;border:1px solid var(--rule);border-radius:2px;
                 font-family:'IBM Plex Mono',monospace;font-size:10px;background:var(--surf2);color:var(--t1);outline:none;line-height:1.4"
        >${esc(meesState.context)}</textarea>
        <div style="font-family:'IBM Plex Mono',monospace;font-size:8px;color:var(--t4);text-align:right">${meesState.context.length} chars</div>
      </div>

      <!-- Angle -->
      <div>
        <div style="font-family:'IBM Plex Mono',monospace;font-size:8px;text-transform:uppercase;letter-spacing:.06em;color:var(--t3);margin-bottom:4px">Outreach angle</div>
        <textarea id="meesAngle" rows="2" placeholder="Positioning / hook"
          style="width:100%;resize:vertical;padding:6px 8px;border:1px solid var(--rule);border-radius:2px;
                 font-family:'IBM Plex Mono',monospace;font-size:10px;background:var(--surf2);color:var(--t1);outline:none;line-height:1.4"
        >${esc(meesState.angle)}</textarea>
      </div>

      <!-- Generate -->
      <button class="btn p full" onclick="window.meesGenerate()">✉ Generate Email</button>

      <!-- Output -->
      <div id="meesOutput" style="display:${meesState.output ? 'block' : 'none'}">
        <div style="font-family:'IBM Plex Mono',monospace;font-size:8px;text-transform:uppercase;letter-spacing:.06em;color:var(--t3);margin-bottom:4px">Output</div>
        <div id="meesOutputText" style="padding:10px;background:var(--surf2);border:1px solid var(--rule);border-radius:2px;
             font-size:12px;line-height:1.5;white-space:pre-wrap;max-height:200px;overflow-y:auto">${esc(meesState.output)}</div>
        <div style="display:flex;gap:4px;margin-top:6px">
          <button class="btn sm" onclick="window.meesCopy()">Copy</button>
          <button class="btn sm" onclick="window.meesGenerate()">↺ Regen</button>
          <button class="btn sm p" onclick="window.closeMeeseeks()">Done ✓</button>
        </div>
      </div>

    </div>

    <!-- Footer hint -->
    <div style="padding:6px 14px;border-top:1px solid var(--rule2);font-family:'IBM Plex Mono',monospace;font-size:8px;color:var(--t4);text-align:center">
      ← Pick persona · select contact · generate
    </div>
  `;
}

/* ═══ Actions ════════════════════════════════════════════════ */

export function meesSetPersona(id) {
  meesState.persona = id;
  renderMeeseeks();
}

export function meesGenerate() {
  /* Collect current form state */
  meesState.company = document.getElementById('meesCompany')?.value || meesState.company;
  meesState.context = document.getElementById('meesContext')?.value || '';
  meesState.angle   = document.getElementById('meesAngle')?.value || '';

  /* Build Claude prompt and open */
  const parts = [
    `Write a ${meesState.persona === 'exec' ? 'formal C-level' : meesState.persona === 'chill' ? 'warm conversational' : 'direct data-driven'} outreach email`,
    `from onAudience (EU audience data provider) to ${meesState.company}`,
  ];
  if (meesState.contact) parts.push(`addressed to ${meesState.contact.full_name}, ${meesState.contact.title}`);
  if (meesState.context) parts.push(`Context: ${meesState.context}`);
  if (meesState.angle) parts.push(`Angle: ${meesState.angle}`);
  parts.push('Keep it under 150 words. No fluff. Include a specific ask.');

  const prompt = parts.join('. ');

  /* For now, open in Claude. Replace with Anthropic API call for in-hub generation. */
  window.open('https://claude.ai/new?q=' + encodeURIComponent(prompt), '_blank');
}

export function meesCopy() {
  const text = document.getElementById('meesOutputText')?.textContent;
  if (text) navigator.clipboard.writeText(text);
}
