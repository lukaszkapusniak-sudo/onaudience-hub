/* ═══ aud-campaign.js — Campaign generation, email templates, Lemlist launch ═══ */

import { SB_URL, MODEL_CREATIVE } from './config.js?v=20260409y';
import S from './state.js?v=20260409y';
import { esc, _slug, authHdr } from './utils.js?v=20260409y';
import { anthropicFetch, lemlistFetch } from './api.js?v=20260409y';
import { clog } from './hub.js?v=20260409y';
import { sbSaveAudience, renderAudiencesPanel, openAudienceModal } from './audiences.js?v=20260409y';

export async function generateCampaignHook(audId) {
  const aud = S.audiences.find(a => a.id === audId);
  if (!aud) return;
  const ta = document.getElementById('aud-hook-ta');
  if (ta) ta.placeholder = '⟳ generating…';
  const prompt = aud.filters?.icp_prompt || aud.icp_prompt || aud.name || '';
  const n = (aud.company_ids || []).length;
  try {
    const res = await anthropicFetch({
      model: MODEL_CREATIVE, max_tokens: 120,
      messages: [{ role: 'user', content:
        `Write a 2–3 sentence outreach hook for a B2B email campaign.\nAudience: "${prompt}" (${n} companies).\nContext: onAudience sells EU first-party audience data to DSPs, SSPs, agencies and data providers.\nBe direct, specific, no buzzwords.` }],
    });
    const hook = res.content?.[0]?.text?.trim() || '';
    if (ta) { ta.value = hook; ta.placeholder = ''; }
  } catch (e) {
    if (ta) ta.placeholder = 'Error generating hook';
    clog('ai', `generateCampaignHook error: ${esc(e.message)}`);
  }
}

export async function generateEmailTemplate(audId) {
  const aud = S.audiences.find(a => a.id === audId);
  if (!aud) return;
  const subjectEl = document.getElementById('aud-tpl-subject');
  const bodyEl = document.getElementById('aud-tpl-body');
  if (bodyEl) bodyEl.placeholder = '⟳ generating…';
  const hook = document.getElementById('aud-hook-ta')?.value?.trim() || aud.outreach_hook || '';
  const prompt = aud.filters?.icp_prompt || aud.icp_prompt || aud.name || '';
  const n = (aud.company_ids || []).length;
  try {
    const res = await anthropicFetch({
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
    const res = await fetch(`${SB_URL}/rest/v1/audiences?id=eq.${encodeURIComponent(audId)}`, {
      method: 'PATCH',
      headers: authHdr(),
      body: JSON.stringify({ outreach_hook: hook, template_subject: subject, template_body: body, updated_at: new Date().toISOString() }),
    });
    if (!res.ok) throw new Error(await res.text());
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
    fetch(`${SB_URL}/rest/v1/companies?id=eq.${encodeURIComponent(co.id)}`, {
      method: 'PATCH', headers: authHdr(),
      body: JSON.stringify({ outreach_angle: angle, updated_at: new Date().toISOString() }),
    }).catch(() => {});
    co.outreach_angle = angle;
  } catch (e) {
    angleEl.textContent = 'Error generating angle';
  }
}

/* ─── B2B Lookup Dialog ───────────────────────────────────────────────── */

