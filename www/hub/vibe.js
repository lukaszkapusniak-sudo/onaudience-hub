/* ═══════════════════════════════════════════════════════════════════
   vibe.js — Vibe Prospecting / Explorium integration
   
   What it can do:
     ✓ match-business   → enrich a known company with firmographics
     ✓ match-prospects  → look up a person by email or name+company
     ✓ enrich-business  → add tech stack, funding, workforce data
     ✓ enrich-prospects → add LinkedIn profile, title, work history
   
   What it CANNOT do (requires fetch-entities MCP, not available):
     ✗ "Find me VPs of Data at DSPs" (bulk criteria search)
     ✗ Free-text prospect search by role/title
   
   Cost (Explorium credits):
     enrich-prospects-profiles:  1 credit / person
     enrich-prospects-contacts:  5 credits / person (email+phone)
     enrich-business-firmographics: 1 credit / company
   ═══════════════════════════════════════════════════════════════════ */

import { anthropicFetch } from './api.js?v=20260410d17';
import { esc } from './utils.js?v=20260410d17';
import { clog } from './hub.js?v=20260410d17';

const VIBE_MCP = { type: 'url', url: 'https://mcp.vibe.ai/mcp', name: 'vibe-prospecting' };

/* ── Internal: call Claude with Vibe MCP ─────────────────────────── */
async function _vibeFetch(prompt, maxTokens = 1500) {
  const key = localStorage.getItem('oaAnthropicKey');
  if (!key) throw new Error('Personal Anthropic key required for Vibe Prospecting. Click 🔑 in nav.');

  const res = await anthropicFetch({
    model: 'claude-sonnet-4-20250514',
    max_tokens: maxTokens,
    mcp_servers: [VIBE_MCP],
    messages: [{ role: 'user', content: prompt }],
  });

  // Extract MCP tool results
  const content = res.content || [];
  const toolResults = content
    .filter(b => b.type === 'mcp_tool_result')
    .map(b => { try { return JSON.parse(b.content?.[0]?.text || '{}'); } catch { return {}; } });
  const textBlocks = content
    .filter(b => b.type === 'text')
    .map(b => b.text).join('\n');

  return { toolResults, textBlocks, raw: content };
}

/* ── Enrich a single company (match + firmographics) ────────────── */
export async function vibeEnrichCompany(company) {
  const domain = (company.website || '').replace(/^https?:\/\//, '').split('/')[0];
  const name = company.name;
  clog('ai', `🔍 Vibe: enriching <b>${esc(name)}</b>…`);
  try {
    const { toolResults, textBlocks } = await _vibeFetch(
      `Use match-business to look up "${name}"${domain ? ` (domain: ${domain})` : ''}.
       Then use enrich-business with firmographics enrichment on the result.
       Return the business_id, revenue, employee count, description, industry, HQ city, and any funding info.
       Respond with a JSON object only.`
    );
    // Try to parse firmographics from tool results
    const data = toolResults.find(r => r.business_id || r.firmographics) || {};
    const firmographics = data.firmographics || data;
    clog('ai', `✓ Vibe: enriched <b>${esc(name)}</b>`);
    return { success: true, data: firmographics, raw: textBlocks };
  } catch (e) {
    clog('info', `Vibe enrich company error: ${e.message}`);
    return { success: false, error: e.message };
  }
}

/* ── Enrich a single contact by email ───────────────────────────── */
export async function vibeEnrichContact({ email, full_name, company_name }) {
  if (!email && !full_name) throw new Error('Need email or name to enrich contact');
  clog('ai', `🔍 Vibe: enriching contact <b>${esc(full_name || email)}</b>…`);
  try {
    const matchPart = email
      ? `email "${email}"`
      : `full_name "${full_name}" at company "${company_name}"`;
    const { toolResults, textBlocks } = await _vibeFetch(
      `Use match-prospects to look up the person with ${matchPart}.
       Then use enrich-prospects with profiles enrichment to get their full name, title, LinkedIn URL, location, and work history.
       Return a JSON object with: full_name, title, linkedin_url, location, company_name, department, seniority, experience.`
    );
    const data = toolResults.find(r => r.profile_full_name || r.full_name || r.prospect_id) || {};
    clog('ai', `✓ Vibe: enriched <b>${esc(full_name || email)}</b>`);
    return { success: true, data, raw: textBlocks };
  } catch (e) {
    clog('info', `Vibe enrich contact error: ${e.message}`);
    return { success: false, error: e.message };
  }
}

/* ── Enrich multiple contacts in batch ──────────────────────────── */
export async function vibeEnrichContacts(contacts) {
  // contacts: [{email, full_name, company_name}]
  const results = [];
  for (const ct of contacts) {
    if (!ct.email && !ct.full_name) { results.push({ ...ct, vibeResult: null }); continue; }
    const res = await vibeEnrichContact(ct);
    results.push({ ...ct, vibeResult: res.success ? res.data : null });
    // Small delay to avoid rate limits
    await new Promise(r => setTimeout(r, 400));
  }
  return results;
}

/* ── Render enrich button for Lemlist lead row ──────────────────── */
export function vibeEnrichBtnHtml(email, firstName, lastName, companyName) {
  if (!email) return ''; // Can't enrich without email
  const name = ((firstName||'') + ' ' + (lastName||'')).trim();
  const safe = esc(email);
  const safeName = esc(name);
  const safeCo = esc(companyName || '');
  return `<button class="btn sm" style="font-size:7px;opacity:.7"
    title="Enrich with Vibe Prospecting (1 credit)"
    onclick="vibeEnrichLead('${safe}','${safeName}','${safeCo}')">⚡ Enrich</button>`;
}

/* ── Window-level: enrich a Lemlist lead row on click ───────────── */
export async function vibeEnrichLead(email, name, companyName) {
  const hasKey = !!localStorage.getItem('oaAnthropicKey');
  if (!hasKey) {
    clog('ai', '🔑 Vibe Prospecting requires a personal Anthropic key. Click <b>🔑</b> in nav.');
    return;
  }
  // Find the row by email and show spinner
  const rows = [...document.querySelectorAll('.ll-table tbody tr')];
  const row = rows.find(r => r.textContent.includes(email));
  const nameCell = row?.querySelector('td:first-child');
  const origHtml = nameCell?.innerHTML;
  if (nameCell) nameCell.innerHTML = `<span style="color:var(--t3);font-size:9px">⟳ enriching…</span>`;

  try {
    const res = await vibeEnrichContact({ email, full_name: name, company_name: companyName });
    if (!res.success) throw new Error(res.error);
    const d = res.data;
    const enrichedName = d.profile_full_name || d.full_name || name || email;
    const title = d.profile_job_title || d.title || '';
    const linkedin = d.profile_linkedin || d.profile_linkedin_url_array
      ? JSON.parse(d.profile_linkedin_url_array || '[]')[0] : '';
    const city = d.profile_city || '';
    const seniority = d.profile_job_seniority_level || '';

    if (nameCell) {
      nameCell.innerHTML = `<div style="font-size:10px">${esc(enrichedName)}</div>
        ${title ? `<div style="font-size:8px;color:var(--t3)">${esc(title)}</div>` : ''}
        ${seniority ? `<div style="font-size:7px;color:var(--t4)">${esc(seniority)}</div>` : ''}
        ${linkedin ? `<a href="${esc(linkedin)}" target="_blank" style="font-size:7px;color:var(--g)">LI ↗</a>` : ''}`;
    }

    // Update company cell if we got location
    if (city && row) {
      const coCell = row.querySelector('td:nth-child(3)');
      if (coCell && companyName) {
        coCell.innerHTML = `<div style="font-size:10px">${esc(companyName)}</div>
          <div style="font-size:8px;color:var(--t3)">${esc(city)}</div>`;
      }
    }
    clog('ai', `✓ Vibe: enriched lead <b>${esc(enrichedName)}</b> (${esc(email)})`);
  } catch (e) {
    if (nameCell && origHtml) nameCell.innerHTML = origHtml;
    clog('info', `Vibe lead enrich error: ${e.message}`);
  }
}

/* ── Company Finder: search by criteria using b2b MCP + Vibe ───── */
export async function vibeSearchCompanies(query) {
  clog('ai', `🔍 b2b search: <b>${esc(query)}</b>…`);
  const q = query.trim().replace(/^https?:\/\//, '').split('/')[0];
  const isDomain = /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(q) && !q.includes(' ');
  try {
    const prompt = isDomain
      ? `Use get_company_details for domain "${q}". Return a JSON array with ONE object: {name, description, website, industry, keywords:[]}. JSON array only.`
      : `Use search_companies with query_text="${query}" and limit=12. Return a JSON array, each with: name, description, website, industry, keywords. JSON array only.`;
    const res = await anthropicFetch({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      mcp_servers: [{ type: 'url', url: 'https://b2b.ctpl.dev/sse', name: 'b2b' }],
      messages: [{ role: 'user', content: prompt }],
    });
    const parts = (res.content || []);
    const toolText = parts.filter(b => b.type === 'mcp_tool_result').map(b => b.content?.[0]?.text || '').join('\n');
    const mainText = parts.filter(b => b.type === 'text').map(b => b.text).join('\n');
    const combined = toolText + '\n' + mainText;
    const arrMatch = combined.match(/\[[\s\S]*?\]/);
    if (arrMatch) { try { const p = JSON.parse(arrMatch[0]); if (Array.isArray(p) && p.length) return { success: true, companies: p }; } catch {} }
    const objMatch = combined.match(/\{[\s\S]*?\}/);
    if (objMatch) { try { const o = JSON.parse(objMatch[0]); if (o.name) return { success: true, companies: [o] }; } catch {} }
    return { success: true, companies: [] };
  } catch (e) {
    clog('info', `b2b search error: ${e.message}`);
    return { success: false, error: e.message, companies: [] };
  }
}

