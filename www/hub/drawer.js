/* ═══ drawer.js — Contact drawer ═══ */

import S from './state.js?v=20260409d5';
import { esc, _slug, getAv, ini, relTime } from './utils.js?v=20260409d5';
import { saveContact } from './api.js?v=20260409d5';
import { openComposer } from './meeseeks.js?v=20260409d5';
import { clog } from './hub.js?v=20260409d5';

export function openDrawer(ctId){const ct=S.contacts.find(c=>c.id===ctId||(c.full_name&&_slug(c.full_name)===ctId));if(!ct)return;S.currentContact=ct;const av=getAv(ct.full_name||''),n=ini(ct.full_name||'');const el=document.getElementById('drAv');el.textContent=n;el.style.background=av.bg;el.style.color=av.fg;document.getElementById('drName').textContent=ct.full_name||'—';document.getElementById('drSub').textContent=(ct.title||'')+(ct.company_name?' · '+ct.company_name:'');const _relColor={'warm':'var(--cc)','cold':'var(--t3)','active':'var(--gb)'};const _statusColor={'replied':'var(--cc)','contacted':'var(--gb)','pending':'var(--prc)','bounced':'var(--cr)'};const flds=[[ct.title,'Title',`<span style="font-family:'IBM Plex Mono',monospace;font-size:9px">${esc(ct.title)}</span>`],[ct.email,'Email',`<a href="mailto:${ct.email}" style="color:var(--g);font-family:'IBM Plex Mono',monospace;font-size:9px">${esc(ct.email)}</a>`],[ct.phone,'Phone',`<span style="font-family:'IBM Plex Mono',monospace;font-size:9px">${esc(ct.phone)}</span>`],[ct.linkedin_url,'LinkedIn',`<a href="${ct.linkedin_url}" target="_blank" style="color:var(--g);font-family:'IBM Plex Mono',monospace;font-size:9px">${esc(ct.linkedin_url)}</a>`],[ct.department,'Dept',`<span style="font-family:'IBM Plex Mono',monospace;font-size:9px">${esc(ct.department)}</span>`],[ct.seniority,'Seniority',`<span style="font-family:'IBM Plex Mono',monospace;font-size:9px;text-transform:uppercase">${esc(ct.seniority)}</span>`],[ct.location,'Location',`<span style="font-family:'IBM Plex Mono',monospace;font-size:9px">${esc(ct.location)}</span>`],[ct.outreach_status,'Status',`<span style="font-family:'IBM Plex Mono',monospace;font-size:9px;color:${_statusColor[ct.outreach_status]||'var(--t2)'}">${esc(ct.outreach_status)}</span>`],[ct.relationship_strength,'Relationship',`<span style="font-family:'IBM Plex Mono',monospace;font-size:9px;color:${_relColor[ct.relationship_strength]||'var(--t2)'}">${esc(ct.relationship_strength)}</span>`],[ct.last_contacted_at,'Last Contact',`<span style="font-family:'IBM Plex Mono',monospace;font-size:9px">${esc(ct.last_contacted_at?.slice(0,10))}</span>`],[ct.warm_intro_path,'Warm Intro',`<span style="font-family:'IBM Plex Mono',monospace;font-size:9px">${esc(ct.warm_intro_path)}</span>`],[ct.notes,'Notes',`<span style="font-size:10px;line-height:1.5">${esc(ct.notes)}</span>`]].filter(f=>f[0]);document.getElementById('drBody').innerHTML=flds.map(([,l,v])=>`<div class="dr-field"><label>${l}</label><p>${v}</p></div>`).join('')+_lemlistHistoryHtml(ct);document.getElementById('ctDrawer').classList.add('open');document.getElementById('ctDrawerOverlay').classList.add('vis');}

function _lemlistHistoryHtml(ct) {
  const hasCampaign = ct.lemlist_campaign_id || ct.lemlist_campaign_name;
  const hasActivity = ct.lemlist_status || ct.lemlist_opened_at || ct.lemlist_replied_at || ct.lemlist_clicked_at || ct.lemlist_pushed_at;
  if (!hasCampaign && !hasActivity) return '';

  const statusCls = {
    sent:'tpr', opened:'tp', clicked:'tc', replied:'tc',
    bounced:'tn', unsubscribed:'tn', interested:'tc'
  }[ct.lemlist_status] || 'tpr';

  const fmt = (ts) => ts ? new Date(ts).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'2-digit'}) : null;

  const rows = [
    ct.lemlist_campaign_name && `<div class="dr-field"><label>Campaign</label><p><span style="font-family:'IBM Plex Mono',monospace;font-size:9px">${esc(ct.lemlist_campaign_name)}</span></p></div>`,
    ct.lemlist_status       && `<div class="dr-field"><label>LL Status</label><p><span class="tag ${statusCls}">${esc(ct.lemlist_status)}</span></p></div>`,
    ct.lemlist_pushed_at    && `<div class="dr-field"><label>Pushed</label><p><span style="font-family:'IBM Plex Mono',monospace;font-size:9px">${fmt(ct.lemlist_pushed_at)}</span></p></div>`,
    ct.lemlist_opened_at    && `<div class="dr-field"><label>👁 Opened</label><p><span style="font-family:'IBM Plex Mono',monospace;font-size:9px;color:var(--g)">${fmt(ct.lemlist_opened_at)}</span></p></div>`,
    ct.lemlist_replied_at   && `<div class="dr-field"><label>💬 Replied</label><p><span style="font-family:'IBM Plex Mono',monospace;font-size:9px;color:var(--pc)">${fmt(ct.lemlist_replied_at)}</span></p></div>`,
    ct.lemlist_clicked_at   && `<div class="dr-field"><label>🖱 Clicked</label><p><span style="font-family:'IBM Plex Mono',monospace;font-size:9px;color:var(--prc)">${fmt(ct.lemlist_clicked_at)}</span></p></div>`,
  ].filter(Boolean).join('');

  return `<div class="dr-section-head" style="margin-top:14px;padding:6px 16px 4px;font-size:8px;font-weight:600;letter-spacing:.08em;color:var(--t4);text-transform:uppercase;background:var(--surf2);border-top:1px solid var(--rule)">📤 Lemlist Outreach</div>${rows}`;
}
export function closeDrawer(){document.getElementById('ctDrawer').classList.remove('open');document.getElementById('ctDrawerOverlay').classList.remove('vis');S.currentContact=null;}
export function openContactFull(ctId){
  const ct=S.contacts.find(c=>c.id===ctId||_slug(c.full_name||'')===ctId);
  if(!ct){openDrawer(ctId);return;}
  const co=S.companies.find(c=>
    (c.id&&ct.company_id&&c.id===ct.company_id)||
    (c.name||'').toLowerCase()===(ct.company_name||'').toLowerCase()
  );
  if(co){openCompany(co);}
  else{
    const es=document.getElementById('emptyState');
    const cp=document.getElementById('coPanel');
    if(es)es.style.display='flex';
    if(cp)cp.style.display='none';
    S.currentCompany=null;window.currentCompany=null;
  }
  openDrawer(ctId);
}
export function drEmail(){if(S.currentContact)window.openComposer({company:S.currentContact.company_name,contactName:S.currentContact.full_name,contactTitle:S.currentContact.title,linkedin:S.currentContact.linkedin_url});}
export function drLinkedIn(){if(S.currentContact?.linkedin_url)window.open(S.currentContact.linkedin_url,'_blank');}
export function drGmail(){
  if(!S.currentContact)return;
  const co=S.companies.find(c=>(c.name||'').toLowerCase()===(S.currentContact.company_name||'').toLowerCase());
  if(co){openCompany(co);}
  closeDrawer();
  setTimeout(()=>{
    const ib=document.getElementById('ib-intel-body');
    if(ib)ib.scrollIntoView({behavior:'smooth',block:'nearest'});
    bgRefreshIntel();
  },150);
}
export function drResearch(){
  if(!S.currentContact)return;
  aiQuick(`"${S.currentContact.full_name}" ${S.currentContact.company_name||''}`);
  const aiInp=document.getElementById('aiInp');
  if(aiInp)aiInp.scrollIntoView({behavior:'smooth',block:'nearest'});
  closeDrawer();
}
