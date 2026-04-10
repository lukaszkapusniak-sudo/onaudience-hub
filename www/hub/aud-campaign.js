/* ═══ aud-campaign.js — Campaign generation, email templates, Lemlist launch ═══ */

import { SB_URL, MODEL_CREATIVE } from './config.js?v=20260410d21';
import S from './state.js?v=20260410d21';
import { esc, _slug, authHdr } from './utils.js?v=20260410d21';
import { anthropicFetch, lemlistFetch } from './api.js?v=20260410d21';
import { audiences as dbAud, companies as dbCo } from './db.js?v=20260410d21';
import { clog } from './hub.js?v=20260410d21';
import { sbSaveAudience, renderAudiencesPanel, openAudienceModal } from './audiences.js?v=20260410d21';

export async function generateCampaignHook(audId, personaId) {
  const aud = S.audiences.find(a => a.id === audId);
  if (!aud) return;
  const ta = document.getElementById('aud-hook-ta');
  if (ta) { ta.value = ''; ta.placeholder = '⟳ generating…'; }
  const persona = personaId ? (window.MC_PERSONAS_LIST||[]).find(p=>p.id===personaId) : null;
  const icp = aud.filters?.icp_prompt || aud.icp_prompt || aud.description || aud.name || '';
  const coIds = aud.company_ids || [];
  // Pull up to 6 company descriptions for context
  const cos = (S.companies || []).filter(c => coIds.includes(c.id || c.name?.toLowerCase().replace(/[^a-z0-9]+/g,'-'))).slice(0, 6);
  const coCtx = cos.map(c => `- ${c.name}: ${(c.description||'').slice(0,120)}`).join('\n');
  try {
    const res = await anthropicFetch({
      model: MODEL_CREATIVE, max_tokens: 140,
      system: persona ? persona.system + '\n\nYou are writing B2B outreach hooks for onAudience, which sells EU first-party audience data.' : undefined,
      messages: [{ role: 'user', content:
        `Write a punchy 2–3 sentence B2B outreach hook for a cold email.\n\nAudience segment: "${icp}"\n${coCtx ? '\nCompanies in this segment:\n'+coCtx+'\n' : ''}\nWe are onAudience — we provide EU first-party audience data to DSPs, SSPs, agencies and data providers.\n\nRules:\n- Focus on BUSINESS VALUE relevant to what these companies DO (their tech, clients, products)\n- NEVER mention country, city, region, or market name — not even indirectly (no 'Polish', 'German', 'UK-based' etc.)\n- Be direct and specific, no buzzwords\n- Start with an insight or challenge they face, not "I"\n- 2–3 sentences max` }],
    });
    const hook = res.content?.[0]?.text?.trim() || '';
    if (ta) { ta.value = hook; ta.placeholder = ''; }
  } catch (e) {
    if (ta) ta.placeholder = 'Error generating hook';
    clog('ai', `generateCampaignHook error: ${esc(e.message)}`);
  }
}

export async function generateEmailTemplate(audId, personaId) {
  const aud = S.audiences.find(a => a.id === audId);
  if (!aud) return;
  const persona = personaId ? (window.MC_PERSONAS_LIST||[]).find(p=>p.id===personaId) : null;
  const subjectEl = document.getElementById('aud-tpl-subject');
  const bodyEl = document.getElementById('aud-tpl-body');
  if (bodyEl) bodyEl.placeholder = '⟳ generating…';
  const hook = document.getElementById('aud-hook-ta')?.value?.trim() || aud.outreach_hook || '';
  const prompt = aud.filters?.icp_prompt || aud.icp_prompt || aud.name || '';
  const n = (aud.company_ids || []).length;
  try {
    const res = await anthropicFetch({
      system: persona ? persona.system + '\n\nYou are writing B2B email templates for onAudience, which sells EU first-party audience data.' : undefined,
      model: MODEL_CREATIVE, max_tokens: 400,
      messages: [{ role: 'user', content:
        `Write a cold B2B email template (subject + body) for onAudience EU first-party data partnerships.\nAudience: "${prompt}" (${n} companies).\nHook: "${hook}"\nFormat:\nSUBJECT: <subject line>\n\n<email body — 3–4 short paragraphs, {{first_name}} placeholder, no fluffy sign-off>` }],
    });
    const text = res.content?.[0]?.text?.trim() || '';
    const subjectMatch = text.match(/^SUBJECT:\s*(.+)/im);
    const body = text.replace(/^SUBJECT:.*\n?/im, '').trim();
    if (subjectEl && subjectMatch) subjectEl.value = subjectMatch[1].trim();
    if (bodyEl) { bodyEl.value = body; bodyEl.placeholder = ''; }
  } catch (e) {
    if (bodyEl) bodyEl.placeholder = 'Error generating template';
    clog('ai', `generateEmailTemplate error: ${esc(e.message)}`);
  }
}

export async function saveCampaignTemplate(audId) {
  const aud = S.audiences.find(a => a.id === audId);
  if (!aud) return;
  const hook    = document.getElementById('aud-hook-ta')?.value?.trim() || null;
  const subject = document.getElementById('aud-tpl-subject')?.value?.trim() || null;
  const body    = document.getElementById('aud-tpl-body')?.value?.trim() || null;
  try {
    await dbAud.patch(audId, { outreach_hook: hook, template_subject: subject, template_body: body });
    if (aud) { aud.outreach_hook = hook; aud.template_subject = subject; aud.template_body = body; }
    clog('db', `Campaign template saved for <b>${esc(aud.name)}</b>`);
  } catch (e) {
    clog('db', `saveCampaignTemplate error: ${esc(e.message)}`);
  }
}

export async function launchCampaign(audId) {
  const aud = S.audiences.find(a => a.id === audId);
  if (!aud) return;
  await saveCampaignTemplate(audId);
  clog('info', `Campaign draft saved for <b>${esc(aud.name)}</b> — provider launch coming soon`);
}

export async function audDraftEmailToCo(audId, coSlug) {
  const aud = S.audiences.find(a => a.id === audId);
  const co  = S.companies.find(c => (c.id || _slug(c.name)) === coSlug);
  if (!aud || !co) return;
  const ids = aud.company_ids || [];
  const members = S.companies.filter(c => ids.includes(c.id));
  const audContacts = S.contacts.filter(ct =>
    ids.includes(ct.company_id) || members.some(m => _slug(m.name) === _slug(ct.company_name || '')));
  const coContacts = audContacts.filter(ct =>
    ct.company_id === co.id || _slug(ct.company_name || '') === _slug(co.name));
  const contact = coContacts.find(ct => ct.email) || coContacts[0];
  const hook = aud.outreach_hook || aud.name;
  const body = aud.template_body || '';
  const subject = aud.template_subject || `Partnership opportunity — ${co.name}`;
  const to = contact?.email || '';
  const mailto = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body ? body.replace(/\{\{first_name\}\}/gi, contact?.full_name?.split(' ')[0] || 'there') : hook)}`;
  window.open(mailto, '_blank');
}

export async function audGenAngleForCo(audId, coSlug) {
  const aud = S.audiences.find(a => a.id === audId);
  const co  = S.companies.find(c => (c.id || _slug(c.name)) === coSlug);
  if (!aud || !co) return;
  const expandEl = document.getElementById(`aud-coe-${coSlug}`);
  let angleEl = expandEl?.querySelector('.aud-co-angle');
  if (!angleEl) {
    angleEl = document.createElement('div');
    angleEl.className = 'aud-co-angle';
    if (expandEl) expandEl.insertBefore(angleEl, expandEl.firstChild);
  }
  angleEl.textContent = '⟳ generating angle…';
  try {
    const res = await anthropicFetch({
      model: MODEL_CREATIVE, max_tokens: 80,
      messages: [{ role: 'user', content:
        `Write 1 short outreach angle for approaching ${co.name} (${co.category || co.type || ''}) about onAudience EU first-party audience data partnerships. Audience context: "${aud.name}". 1–2 sentences, very specific.` }],
    });
    const angle = res.content?.[0]?.text?.trim() || '';
    angleEl.textContent = `✦ ${angle}`;
    // persist to company record
    dbCo.patch(co.id, { outreach_angle: angle }).catch(() => {});
    co.outreach_angle = angle;
  } catch (e) {
    angleEl.textContent = 'Error generating angle';
  }
}

/* ─── B2B Lookup Dialog ───────────────────────────────────────────────── */

