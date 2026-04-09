/* ═══ lemlist.js — Lemlist CRM integration ═══ */

import { SB_URL, LEMLIST_PROXY } from './config.js?v=20260409y';
import S from './state.js?v=20260409y';
import { esc, _slug, relTime, authHdr } from './utils.js?v=20260409y';
import { lemlistFetch, lemlistCampaigns, lemlistAddLead, lemlistWriteBack, anthropicFetch, saveContact } from './api.js?v=20260409y';
import { clog } from './hub.js?v=20260409y';

export function initLemlistModal(){
  if(document.getElementById('llModal'))return;
  const d=document.createElement('div');
  d.innerHTML=`<div id="llModal" class="modal-overlay" style="display:none" onclick="if(event.target===this)closeLemlistModal()">
    <div class="modal" style="width:460px">
      <div class="modal-header">
        <span class="modal-title">📤 Push to lemlist</span>
        <button class="btn sm" onclick="closeLemlistModal()">✕</button>
      </div>
      <div class="modal-body" style="padding:16px 20px">
        <div id="llStatus" style="font-size:11px;color:var(--t3);margin-bottom:10px">Loading campaigns…</div>
        <select id="llCampaignSel" class="inp" style="display:none;width:100%;margin-bottom:10px"></select>
        <div id="llPreview" style="font-size:11px;color:var(--t3)"></div>
      </div>
      <div class="modal-footer">
        <button class="btn" onclick="closeLemlistModal()">Cancel</button>
        <button class="btn p" id="llPushBtn" onclick="lemlistPush()" style="pointer-events:none;opacity:.5">📤 Push</button>
      </div>
    </div>
  </div>`;
  document.body.appendChild(d.firstElementChild);
}

export async function openLemlistModal(contacts){
  _llContacts=(contacts||[]).filter(c=>c.email);
  let modal=document.getElementById('llModal');
  if(!modal){initLemlistModal();modal=document.getElementById('llModal');}
  const status=document.getElementById('llStatus');
  const sel=document.getElementById('llCampaignSel');
  const preview=document.getElementById('llPreview');
  const btn=document.getElementById('llPushBtn');
  modal.style.display='flex';
  status.textContent='Loading campaigns…';
  status.style.display='block';
  sel.style.display='none';
  btn.style.opacity='.5';
  btn.style.pointerEvents='none';
  preview.textContent=_llContacts.length+' contact(s) with email selected.';
  try{
    const campaigns=await lemlistCampaigns();
    if(!campaigns.length){status.textContent='No campaigns found in lemlist. Create one first.';return;}
    status.style.display='none';
    sel.innerHTML=campaigns.map(c=>'<option value="'+esc(c._id)+'">'+esc(c.name)+(c.status?' ['+esc(c.status)+']':'')+'</option>').join('');
    sel.style.display='block';
    if(_llContacts.length>0){btn.style.opacity='1';btn.style.pointerEvents='auto';}
  }catch(e){
    status.textContent='Error: '+esc(String(e.message));
  }
}

export function closeLemlistModal(){
  const m=document.getElementById('llModal');
  if(m)m.style.display='none';
  const btn=document.getElementById('llPushBtn');
  if(btn){btn.textContent='📤 Push';btn.style.opacity='.5';btn.style.pointerEvents='none';}
}

export async function lemlistPush(){
  const sel=document.getElementById('llCampaignSel');
  const btn=document.getElementById('llPushBtn');
  const prev=document.getElementById('llPreview');
  const campaignId=sel?.value;
  const campaignName=sel?.options[sel.selectedIndex]?.text?.replace(/\s*\[.*\]$/,'')||'';
  if(!campaignId||!_llContacts.length)return;
  btn.textContent='Pushing…';
  btn.style.pointerEvents='none';
  let ok=0,fail=0;
  for(const ct of _llContacts){
    try{await lemlistAddLead(campaignId,ct);ok++;}
    catch(e){fail++;clog('info','lemlist skip '+esc(ct.email)+': '+e.message);}
  }
  const ids=_llContacts.map(c=>c.id).filter(Boolean);
  if(ids.length){
    try{await lemlistWriteBack(ids,campaignId,campaignName);}
    catch(e){clog('info','lemlist writeback error: '+e.message);}
  }
  clog('db','📤 lemlist: '+ok+'/'+_llContacts.length+' pushed → '+campaignName);
  prev.textContent='✓ '+ok+' pushed'+(fail?', '+fail+' skipped':'')+' → '+campaignName;
  btn.textContent='✓ Done';
  setTimeout(closeLemlistModal,2000);
}

export async function audPushLemlist(audId,campaignId=null){
  const aud=S.audiences?.find(a=>a.id===audId);
  if(!aud)return;
  const coIds=aud.company_ids||[];
  const contacts=(S.contacts||[]).filter(c=>coIds.includes(c.company_id)&&c.email);
  if(!contacts.length){alert('No contacts with email found for this audience.');return;}
  if(campaignId){
    const camp=_llCampaigns.find(c=>c._id===campaignId);
    const campaignName=camp?.name||campaignId;
    clog('db','📤 Pushing <b>'+contacts.length+'</b> contacts to <b>'+esc(campaignName)+'</b>…');
    let ok=0,fail=0;
    for(const ct of contacts){
      try{await lemlistAddLead(campaignId,ct);ok++;}
      catch(e){fail++;clog('info','skip '+esc(ct.email||'')+': '+e.message);}
    }
    const ids=contacts.map(c=>c.id).filter(Boolean);
    if(ids.length){try{await lemlistWriteBack(ids,campaignId,campaignName);}catch(e){clog('info','writeback: '+e.message);}}
    clog('db','📤 '+ok+'/'+contacts.length+' pushed → '+esc(campaignName)+(fail?' ('+fail+' failed)':''));
    if(_llSelCampaign?._id===campaignId)await selectLemlistCampaign(campaignId);
  }else{
    openLemlistModal(contacts);
  }
}

// ── LEMLIST CAMPAIGNS TAB ─────────────────────────────────────────────────

export async function refreshLemlistCampaigns(){
  const panel=document.getElementById('lemlistPanel');
  if(!panel)return;
  panel.innerHTML='<div style="padding:20px 16px;font-size:11px;font-family:\'IBM Plex Mono\',monospace;color:var(--t3)">Loading campaigns\u2026</div>';
  try{
    _llCampaigns=await lemlistCampaigns();
    _llInited=true;
    renderLemlistPanel();
  }catch(e){
    panel.innerHTML='<div style="padding:20px 16px;font-size:11px;font-family:\'IBM Plex Mono\',monospace;color:var(--cr)">\u26a0 '+esc(e.message)+'</div>';
  }
}

export function renderLemlistPanel(){
  const panel=document.getElementById('lemlistPanel');
  if(!panel)return;
  const n=_llCampaigns.length;
  panel.innerHTML=`<div class="ll-toolbar">
    <span class="ll-count">${n} CAMPAIGN${n!==1?'S':''}</span>
    <button class="btn sm" onclick="refreshLemlistCampaigns()">\u21ba Refresh</button>
  </div>
  <div class="ll-list" id="llList">
    ${n===0
      ?`<div class="ll-empty">No campaigns yet.<br>Create one in <a href="https://app.lemlist.com" target="_blank" style="color:var(--g)">lemlist \u2197</a> then refresh.</div>`
      :_llCampaigns.map(c=>_renderLemlistRow(c)).join('')
    }
  </div>`;
}

function _renderLemlistRow(c){
  const active=_llSelCampaign?._id===c._id;
  const statusCls={active:'tc',paused:'tpo',draft:'tpr',stopped:'tn'}[c.status]||'tpr';
  return `<div class="ll-row${active?' ll-row-active':''}" onclick="selectLemlistCampaign('${esc(c._id)}')">
    <div class="ll-row-head">
      <span class="ll-row-name">${esc(c.name)}</span>
      <span class="tag ${statusCls}">${esc(c.status||'draft')}</span>
    </div>
    <div class="ll-row-meta">${c.createdAt?relTime(c.createdAt):''}</div>
  </div>`;
}

export async function selectLemlistCampaign(campaignId){
  _llSelCampaign=_llCampaigns.find(c=>c._id===campaignId)||null;
  renderLemlistPanel();
  const center=document.getElementById('coPanel');
  if(!center)return;
  center.style.display='flex';
  center.innerHTML='<div style="padding:24px;font-size:11px;color:var(--t3);font-family:\'IBM Plex Mono\',monospace">Loading leads\u2026</div>';
  try{
    const d=await lemlistFetch('/campaigns/'+campaignId+'/leads');
    _llLeads=Array.isArray(d)?d:(d.leads??[]);
  }catch(e){
    _llLeads=[];
    clog('info','lemlist leads error: '+e.message);
  }
  _llLeadSearch='';
  _renderCampaignDetail();
}

export function clearCampaignDetail(){
  _llSelCampaign=null;
  _llLeads=[];
  _llLeadSearch='';
  renderLemlistPanel();
  const center=document.getElementById('coPanel');
  if(center)center.style.display='none';
}

function _renderCampaignDetail(){
  const center=document.getElementById('coPanel');
  if(!center||!_llSelCampaign)return;
  const c=_llSelCampaign;
  const leads=_llLeads;
  const filtered=_llLeadSearch
    ?leads.filter(l=>((l.email||'')+(l.firstName||'')+(l.lastName||'')+(l.companyName||'')).toLowerCase().includes(_llLeadSearch.toLowerCase()))
    :leads;
  const audOptions=(S.audiences||[])
    .filter(a=>!a.is_system)
    .map(a=>`<option value="${esc(a.id)}">${esc(a.name)} (${(a.company_ids||[]).length} co)</option>`)
    .join('');
  center.style.display='flex';
  center.style.flexDirection='column';
  center.style.overflow='hidden';
  center.innerHTML=`<div class="ll-detail">
    <div class="ll-detail-header">
      <span class="ll-detail-back" onclick="clearCampaignDetail()">\u2190 BACK</span>
      <span class="ll-detail-name">${esc(c.name)}</span>
      <span class="tag ${{active:'tc',paused:'tpo',draft:'tpr',stopped:'tn'}[c.status]||'tpr'}">${esc(c.status||'draft')}</span>
    </div>
    <div class="ll-detail-stats">
      <span>${leads.length} LEADS</span>
      ${c.createdAt?'<span>CREATED '+esc(relTime(c.createdAt).toUpperCase())+'</span>':''}
    </div>
    <div class="ll-detail-actions">
      <select class="inp" id="llAudSel" style="font-size:10px;padding:4px 8px;height:26px;min-width:160px">
        <option value="">\u2014 push from audience \u2014</option>
        ${audOptions}
      </select>
      <button class="btn sm p" onclick="llPushFromAudience()">\ud83d\udce4 Push</button>
      <button class="btn sm" onclick="selectLemlistCampaign('${esc(c._id)}')">\u21ba</button>
    </div>
    <input class="inp" id="llLeadSearch" placeholder="search leads\u2026"
      style="margin-bottom:8px;font-size:10px;padding:4px 8px;height:26px"
      oninput="llSearchLeads(this.value)" value="${esc(_llLeadSearch)}">
    ${filtered.length===0
      ?`<div class="ll-empty">${leads.length===0?'No leads yet.':'No results.'}</div>`
      :`<div style="overflow-y:auto;flex:1;min-height:0">
          <table class="ll-table">
            <thead><tr>
              <th>NAME</th><th>EMAIL</th><th>COMPANY</th><th>STATUS</th><th>ADDED</th><th></th>
            </tr></thead>
            <tbody>
              ${filtered.map(l=>_renderLeadRow(l,c._id)).join('')}
            </tbody>
          </table>
        </div>`
    }
  </div>`;
}

function _renderLeadRow(l,campaignId){
  const statusCls={sent:'tpr',opened:'tp',clicked:'tc',replied:'tc',bounced:'tn',unsubscribed:'tn',interested:'tc'}[l.status]||'tpr';
  const name=esc(((l.firstName||'')+' '+(l.lastName||'')).trim())||'\u2014';
  const pushed=l.addedAt?relTime(l.addedAt):'\u2014';
  return `<tr>
    <td>${name}</td>
    <td style="color:var(--t3)">${esc(l.email||'\u2014')}</td>
    <td style="color:var(--t3)">${esc(l.companyName||'\u2014')}</td>
    <td><span class="tag ${statusCls}">${esc(l.status||'\u2014')}</span></td>
    <td style="color:var(--t4)">${pushed}</td>
    <td><button class="btn sm" style="color:var(--cr)" title="Unsubscribe"
      onclick="llUnsubLead('${esc(campaignId)}','${esc(l.email||'')}')">&#10005;</button></td>
  </tr>`;
}

export function llSearchLeads(q){
  _llLeadSearch=q;
  _renderCampaignDetail();
}

export async function llPushFromAudience(){
  const sel=document.getElementById('llAudSel');
  const audId=sel?.value;
  if(!audId||!_llSelCampaign){alert('Select an audience first.');return;}
  const aud=(S.audiences||[]).find(a=>a.id===audId);
  if(!aud)return;
  const coIds=aud.company_ids||[];
  const contacts=(S.contacts||[]).filter(c=>coIds.includes(c.company_id)&&c.email);
  if(!contacts.length){alert('No contacts with email in this audience.');return;}
  openLemlistModal(contacts);
}

export async function llUnsubLead(campaignId,email){
  if(!confirm('Unsubscribe '+email+' from this campaign?'))return;
  try{
    await lemlistFetch('/campaigns/'+campaignId+'/leads/'+encodeURIComponent(email),'DELETE');
    clog('db','lemlist: unsubscribed '+esc(email));
    selectLemlistCampaign(campaignId);
  }catch(e){
    clog('info','lemlist unsub error: '+esc(e.message));
  }
}

let _taxLoading=false;
let _taxData=null;

