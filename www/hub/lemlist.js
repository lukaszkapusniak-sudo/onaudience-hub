/* ═══ lemlist.js — Lemlist CRM integration ═══ */

import { SB_URL, LEMLIST_PROXY } from './config.js?v=20260409a6';
import S from './state.js?v=20260409a6';
import { esc, _slug, relTime, authHdr } from './utils.js?v=20260409a6';
import { lemlistFetch, lemlistCampaigns, lemlistAddLead, lemlistWriteBack, anthropicFetch, saveContact } from './api.js?v=20260409a6';
import { clog } from './hub.js?v=20260409a6';

let _llContacts   = [];
let _llLeads      = [];
let _llCampaigns  = [];
let _llInited     = false;
let _llSelCampaign= null;
let _llLeadSearch = '';
let _llSyncing    = false;
let _llLastSync   = null;

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
  console.log('[Lemlist] contacts with email:', _llContacts.length, 'of', (contacts||[]).length);
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
  // Guard — if modal DOM not ready, abort
  if(!status||!sel||!preview||!btn){console.error('[Lemlist] modal DOM not ready');return;}
  try{
    const campaigns=await lemlistCampaigns();
    console.log('[Lemlist] campaigns loaded:', campaigns?.length);
    if(!campaigns.length){status.textContent='No campaigns found in lemlist. Create one first.';return;}
    status.style.display='none';
    sel.innerHTML=campaigns.map(c=>'<option value="'+esc(c._id)+'">'+esc(c.name)+(c.status?' ['+esc(c.status)+']':'')+'</option>').join('');
    sel.style.display='block';
    if(_llContacts.length>0){btn.style.opacity='1';btn.style.pointerEvents='auto';}
  }catch(e){
    console.error('[Lemlist] campaign load error:',e);
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
  const connected=llIsConnected();
  const n=_llCampaigns.length;
  const keyHint=connected?'● '+localStorage.getItem('oaLemlistKey').slice(0,8)+'…':'not connected';
  const syncAgo=_llLastSync?(' · synced '+Math.round((Date.now()-_llLastSync)/60000)+'m ago'):'';
  panel.innerHTML=`
  <div class="ll-header">
    <div class="ll-key-row">
      <span class="ll-key-status ${connected?'ll-connected':'ll-disconnected'}">${keyHint}</span>
      ${connected
        ?`<button class="btn sm" onclick="llSetKey()">Change</button>
          <button class="btn sm" style="color:var(--cr)" onclick="llClearKey()">✕</button>`
        :`<button class="btn sm p" onclick="llSetKey()">⚙ Connect Lemlist</button>`}
    </div>
    ${connected?`<div class="ll-sync-row">
      <button class="btn sm" id="llSyncCtBtn" onclick="llSyncContacts()">📥 Sync Contacts</button>
      <button class="btn sm" id="llSyncCoBtn" onclick="llSyncCompanies()">🏢 Sync Companies</button>
      <span class="ll-sync-meta">${syncAgo}</span>
    </div>`:''}
  </div>
  <div class="ll-toolbar">
    <span class="ll-count">${connected?n+' CAMPAIGN'+(n!==1?'S':''):'—'}</span>
    ${connected?`<button class="btn sm" onclick="refreshLemlistCampaigns()">↺ Refresh</button>`:''}
  </div>
  <div class="ll-list" id="llList">
    ${!connected
      ?`<div class="ll-empty">Connect your Lemlist API key above to sync campaigns and contacts.</div>`
      :n===0
        ?`<div class="ll-empty">No campaigns.<br>Create one in <a href="https://app.lemlist.com" target="_blank" style="color:var(--g)">lemlist ↗</a> then refresh.</div>`
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
    const leads=Array.isArray(d)?d:(d.leads??[]);
    // Enrich each lead with full contact details from Lemlist + match SB contacts
    _llLeads=await Promise.all(leads.map(async l=>{
      // First try matching against SB contacts by lemlist_campaign_id
      const sbMatch=S.contacts?.find(c=>
        c.lemlist_campaign_id===campaignId&&c.lemlist_pushed_at&&
        (c.email===l.email||(!l.email&&c.lemlist_campaign_id))
      );
      if(sbMatch){
        return{...l,
          firstName:sbMatch.full_name?.split(' ')[0]||l.firstName||'',
          lastName:sbMatch.full_name?.split(' ').slice(1).join(' ')||l.lastName||'',
          email:sbMatch.email||l.email||'',
          companyName:sbMatch.company_name||l.companyName||'',
          jobTitle:sbMatch.title||l.jobTitle||'',
        };
      }
      // Fetch from Lemlist API if contactId available
      if(l.contactId){
        try{
          const cd=await lemlistFetch('/contacts/'+l.contactId);
          if(cd&&(cd.email||cd.firstName)){
            return{...l,...cd,
              firstName:cd.firstName||l.firstName||'',
              lastName:cd.lastName||l.lastName||'',
              email:cd.email||l.email||'',
              companyName:cd.companyName||l.companyName||'',
              jobTitle:cd.fields?.jobTitle||cd.jobTitle||l.jobTitle||'',
            };
          }
        }catch(e){/* use minimal data */}
      }
      return l;
    }));
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


// ── KEY MANAGEMENT ────────────────────────────────────────────────────────

export function llIsConnected() {
  return !!localStorage.getItem('oaLemlistKey');
}

export function llSetKey() {
  const k = prompt('Enter Lemlist API key:');
  if (!k) return;
  localStorage.setItem('oaLemlistKey', k.trim());
  clog('db', '🔑 Lemlist key saved');
  renderLemlistPanel();
}

export function llClearKey() {
  if (!confirm('Disconnect Lemlist?')) return;
  localStorage.removeItem('oaLemlistKey');
  clog('info', 'Lemlist key cleared');
  renderLemlistPanel();
}

// ── SYNC FROM LEMLIST → SUPABASE ─────────────────────────────────────────

export async function llSyncContacts() {
  if (_llSyncing) return;
  _llSyncing = true;
  const btn = document.getElementById('llSyncCtBtn');
  if (btn) { btn.textContent = '⟳ Syncing…'; btn.disabled = true; }

  try {
    // Collect all leads across all campaigns
    const camps = await lemlistCampaigns();
    const seen = new Set();
    const allLeads = [];
    for (const camp of camps) {
      const d = await lemlistFetch('/campaigns/' + camp._id + '/leads');
      const leads = Array.isArray(d) ? d : (d.leads ?? []);
      for (const l of leads) {
        if (!l.email || seen.has(l.email)) continue;
        seen.add(l.email);
        allLeads.push({ ...l, campaignId: camp._id, campaignName: camp.name });
      }
    }

    // For each lead, fetch full contact details (leads endpoint is minimal)
    const now = new Date().toISOString();
    let saved = 0;
    for (const l of allLeads) {
      let detail = l;
      if (l.contactId) {
        try {
          const cd = await lemlistFetch('/contacts/' + l.contactId);
          if (cd && cd.email) detail = { ...l, ...cd };
        } catch (e) { /* use minimal data */ }
      }
      const firstName = detail.firstName || '';
      const lastName  = detail.lastName  || '';
      const fullName  = (firstName + ' ' + lastName).trim() || detail.email || '';
      const company   = detail.companyName || '';
      const email     = detail.email || '';
      // Look up existing SB contact by email to preserve their existing ID
      let contactId = null;
      if (email) {
        try {
          const existing = await fetch(
            SB_URL + '/rest/v1/contacts?email=eq.' + encodeURIComponent(email) + '&select=id&limit=1',
            { headers: authHdr() }
          );
          const rows = await existing.json();
          if (rows?.[0]?.id) contactId = rows[0].id;
        } catch (e) { /* generate one */ }
      }
      if (!contactId) {
        // Transliterate + slug
        const clean = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g,'')
          .toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
        contactId = (clean(fullName) + (company ? '-'+clean(company) : '')).slice(0,80)
          || email.replace('@','--at--').replace(/\./g,'-') || detail.contactId;
      }
      const rec = {
        id: contactId,
        full_name: fullName || detail.email,
        email: detail.email || '',
        company_name: company,
        title: detail.jobTitle || detail.fields?.jobTitle || '',
        linkedin_url: detail.linkedinUrl || '',
        lemlist_campaign_id: l.campaignId,
        lemlist_campaign_name: l.campaignName,
        lemlist_pushed_at: detail.addedAt || now,
        source: 'lemlist',
      };
      try {
        await saveContact(rec);
        saved++;
      } catch (e) { clog('info', 'Lemlist contact save error: ' + e.message); }
    }

    _llLastSync = new Date();
    clog('db', `📥 Lemlist sync: ${saved} contacts upserted from ${camps.length} campaigns`);
    renderLemlistPanel();
  } catch (e) {
    clog('info', 'Lemlist sync error: ' + e.message);
  } finally {
    _llSyncing = false;
    const b = document.getElementById('llSyncCtBtn');
    if (b) { b.textContent = '📥 Sync Contacts'; b.disabled = false; }
  }
}

export async function llSyncCompanies() {
  if (_llSyncing) return;
  _llSyncing = true;
  const btn = document.getElementById('llSyncCoBtn');
  if (btn) { btn.textContent = '⟳ Syncing…'; btn.disabled = true; }

  try {
    const camps = await lemlistCampaigns();
    const seen = new Set();
    let saved = 0;
    for (const camp of camps) {
      const d = await lemlistFetch('/campaigns/' + camp._id + '/leads');
      const leads = Array.isArray(d) ? d : (d.leads ?? []);
      for (const l of leads) {
        const name = (l.companyName || '').trim();
        if (!name || seen.has(name.toLowerCase())) continue;
        seen.add(name.toLowerCase());
        const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        try {
          const r = await fetch(SB_URL + '/rest/v1/companies', {
            method: 'POST',
            headers: { ...authHdr(), 'Content-Type': 'application/json', 'Prefer': 'resolution=merge-duplicates,return=minimal' },
            body: JSON.stringify({ id: slug, name, source: 'lemlist' }),
          });
          if (r.ok) saved++;
        } catch (e) { /* skip */ }
      }
    }
    clog('db', `🏢 Lemlist sync: ${saved} companies upserted`);
    renderLemlistPanel();
  } catch (e) {
    clog('info', 'Lemlist company sync error: ' + e.message);
  } finally {
    _llSyncing = false;
    const b = document.getElementById('llSyncCoBtn');
    if (b) { b.textContent = '🏢 Sync Companies'; b.disabled = false; }
  }
}

// _taxData/_taxLoading moved to hub.js

