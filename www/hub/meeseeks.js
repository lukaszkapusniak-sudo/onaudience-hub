/* ═══ meeseeks.js — Meeseeks Composer ═══ */

import { SB_URL, MC_PERSONAS, MODEL_CREATIVE } from './config.js?v=20260410d11';
import { authHdr, esc, getAv, getCoTags, ini, _slug } from './utils.js?v=20260410d11';
import S from './state.js?v=20260410d11';
import { anthropicFetch } from './api.js?v=20260410d11';
import { contacts as dbContacts } from './db.js?v=20260410d11';

export function mcHint(el,id){const h=document.getElementById(id);if(h)h.textContent=`${el.value.length} chars`;}
export function mcAllContacts(){const seen=new Set(S.mcDbContacts.map(c=>(c.full_name||'').toLowerCase()));const extra=S.mcAiContacts.filter(c=>!seen.has((c.full_name||'').toLowerCase()));return[...S.mcDbContacts,...extra];}

/* ── Company search / picker ─────────────────────────────────── */
export function mcToggleCoSearch(){
  const panel=document.getElementById('mcCoSearch');
  const inp=document.getElementById('mcCoSearchInp');
  if(!panel)return;
  const open=panel.style.display==='none';
  panel.style.display=open?'':'none';
  if(open){inp.value='';mcFilterCos('');inp.focus();}
}

export function mcFilterCos(q){
  const el=document.getElementById('mcCoSearchResults');
  if(!el)return;
  const companies=S.companies||[];
  const lq=q.toLowerCase().trim();
  const results=lq
    ? companies.filter(c=>(c.name||'').toLowerCase().includes(lq)).slice(0,12)
    : companies.slice(0,12);
  el._mcResults=results; // store for mcPickCoIdx
  if(!results.length){el.innerHTML='<div class="mc-co-sr-empty">No matches</div>';return;}
  el.innerHTML=results.map((c,i)=>{
    const av=getAv(c.name||'');
    const n=ini(c.name||'');
    const tag=c.type?`<span class="mc-co-sr-tag">${esc(c.type)}</span>`:'';
    return `<div class="mc-co-sr-row" data-idx="${i}" onclick="mcPickCoIdx(${i})">
      <div class="mc-co-sr-av" style="background:${av.bg};color:${av.fg}">${n}</div>
      <div class="mc-co-sr-body">
        <div class="mc-co-sr-name">${esc(c.name||'')}</div>
        <div class="mc-co-sr-sub">${tag}${c.category?esc(c.category):''}</div>
      </div>
    </div>`;
  }).join('');
}

export function mcCoSearchKey(e){
  if(e.key==='Escape'){document.getElementById('mcCoSearch').style.display='none';return;}
  if(e.key==='Enter'){
    const first=document.querySelector('#mcCoSearchResults .mc-co-sr-row');
    if(first)first.click();
  }
}

export function mcPickCoIdx(i){
  const el=document.getElementById('mcCoSearchResults');
  const c=(el?._mcResults||[])[i];
  if(c)mcPickCo(c);
}

export function mcPickCo(c){
  const panel=document.getElementById('mcCoSearch');
  if(panel)panel.style.display='none';
  openComposer({
    company:      c.name||'',
    note:         c.note||'',
    status:       c.type||'',
    icp:          c.icp||null,
    description:  c.description||'',
    angle:        c.outreach_angle||'',
    category:     c.category||'',
    region:       c.region||'',
  });
}

export function mcRenderPersonas(){const grid=document.getElementById('mcPersonaGrid');grid.innerHTML=MC_PERSONAS.map(p=>`<div class="mc-ptile${S.mcActivePId===p.id?' active':''}" style="${S.mcActivePId===p.id?`background:${p.color};border-color:${p.color}`:''}" data-id="${p.id}" onclick="mcPickPersona('${p.id}')"><div class="mc-pemoji">${p.emoji}</div><div class="mc-pname">${p.name}</div><div class="mc-pvibe">${p.vibe}</div></div>`).join('');const p=MC_PERSONAS.find(x=>x.id===S.mcActivePId);if(p){const nb=document.getElementById('mcNavBadge');nb.textContent=p.name.toUpperCase();nb.style.background=p.color;}}
export function mcPickPersona(id){S.mcActivePId=id;mcRenderPersonas();}

export function openComposer(payload){if(window.demoGuard&&window.demoGuard('COMPOSE EMAIL'))return;const mcDrawer=document.getElementById('mcDrawer');if(!mcDrawer)return;S.mcPayload=payload||{};S.mcDbContacts=[];S.mcSelectedIdx=-1;S.mcLastEmail='';const p=S.mcPayload;
  // Search panel: show if no company, hide if company provided
  const searchPanel=document.getElementById('mcCoSearch');
  const changeBtn=document.getElementById('mcCoChangeBtn');
  if(p.company){
    if(searchPanel)searchPanel.style.display='none';
    if(changeBtn)changeBtn.style.display='';
    document.getElementById('mcCoEmpty').style.display='none';const ne=document.getElementById('mcCoName');ne.style.display='';ne.textContent=p.company;const no=document.getElementById('mcCoNote');if(p.note){no&&(no.style.display='');no&&(no.textContent=p.note);}else{no&&(no.style.display='none');}document.getElementById('mcCoAv').textContent=ini(p.company);document.getElementById('mcCoBlock').className='mc-co filled';const tags=getCoTags(p);const te=document.getElementById('mcCoTags');if(tags.length){te&&(te.style.display='flex');te&&(te.innerHTML=tags.map(t=>`<span class="mc-co-tag">${t}</span>`).join(''));}else{te&&(te.style.display='none');}mcLoadContacts(p.company,p.contactName);}else{
    // No company — auto-open the search
    if(searchPanel){searchPanel.style.display='';const inp=document.getElementById('mcCoSearchInp');if(inp){inp.value='';mcFilterCos('');setTimeout(()=>inp.focus(),120);}}
    if(changeBtn)changeBtn.style.display='none';
    document.getElementById('mcCoEmpty').style.display='';document.getElementById('mcCoName').style.display='none';const _no=document.getElementById('mcCoNote');_no&&(_no.style.display='none');document.getElementById('mcCoBlock').className='mc-co';const _te=document.getElementById('mcCoTags');_te&&(_te.style.display='none');document.getElementById('mcCtList').innerHTML='<div class="mc-ctempty">No company selected</div>';}if(p.company&&S.currentCompany?.name===p.company&&S.mcAiContacts.length===0){S.mcAiContacts=[];}document.getElementById('mcCtx').value=p.description||'';document.getElementById('mcAngle').value=p.angle||'';mcHint(document.getElementById('mcCtx'),'mcCtxHint');mcHint(document.getElementById('mcAngle'),'mcAngleHint');document.getElementById('mcOutContent').style.display='none';document.getElementById('mcEmpty').style.display='flex';const _rb=document.getElementById('mcRBar');if(_rb)_rb.style.display='none';document.getElementById('mcDrawer').classList.add('open');mcRenderPersonas();}
export function closeComposer(){document.getElementById('mcDrawer').classList.remove('open');}

export function openPanel(id,payload){openComposer(payload||{});}

async function mcLoadContacts(companyName,preferName){S.mcDbContacts=[];S.mcSelectedIdx=-1;document.getElementById('mcCtList').innerHTML='<div class="mc-ctempty">Loading contacts…</div>';if(S.currentCompany?.name===companyName)S.mcAiContacts=S.mcAiContacts;try{const data=await dbContacts.byCompanyName(companyName);if(Array.isArray(data))S.mcDbContacts=data;}catch(e){console.warn('mc contacts',e);}if(preferName){const idx=mcAllContacts().findIndex(c=>(c.full_name||'').toLowerCase()===preferName.toLowerCase());if(idx>=0)S.mcSelectedIdx=idx;}mcRenderPicker();}

export function mcRenderPicker(loadingMsg){const list=document.getElementById('mcCtList');if(loadingMsg){list.innerHTML=`<div class="mc-ctempty">${loadingMsg}</div>`;return;}const cts=mcAllContacts();if(!cts.length){list.innerHTML=`<div class="mc-ctempty">No contacts in DB — run "Find DMs" first</div>`;return;}list.innerHTML=cts.map((ct,i)=>{const av=getAv(ct.full_name||'');const n=ini(ct.full_name||'?');const active=S.mcSelectedIdx===i?' active':'';const isAI=i>=S.mcDbContacts.length;return`<div class="mc-ctcard${active}" data-i="${i}" onclick="mcPickContact(${i})"><div class="mc-ctav" style="background:${av.bg};color:${av.fg};border:1px solid ${av.fg}22">${n}</div><div class="mc-ctbody"><div class="mc-ctnm">${ct.full_name||'—'}${isAI?` <span style="font-family:'IBM Plex Mono',monospace;font-size:6px;color:var(--poc);border:1px solid var(--por);border-radius:2px;padding:0 3px;margin-left:3px">AI</span>`:''}</div><div class="mc-ctti">${ct.title||''}</div>${ct.email?`<div class="mc-ctemail">${ct.email}</div>`:''}</div><span class="mc-ctcheck">✓</span></div>`;}).join('');}
export function mcPickContact(i){S.mcSelectedIdx=S.mcSelectedIdx===i?-1:i;mcRenderPicker();}

export async function mcGenerate(){const persona=MC_PERSONAS.find(p=>p.id===S.mcActivePId)||MC_PERSONAS[0];const company=S.mcPayload.company||'the company';const cts=mcAllContacts();const ct=S.mcSelectedIdx>=0?cts[S.mcSelectedIdx]:null;const contactName=ct?.full_name||'there';const contactTitle=ct?.title||'';const ctx=document.getElementById('mcCtx').value.trim();const angle=document.getElementById('mcAngle').value.trim();const tags=getCoTags(S.mcPayload);const btn=document.getElementById('mcGenBtn');btn.disabled=true;btn.innerHTML=`<span class="mc-spin"></span><span>Generating…</span>`;document.getElementById('mcEmpty').style.display='none';document.getElementById('mcOutContent').style.display='none';const _rb2=document.getElementById('mcRBar');if(_rb2)_rb2.style.display='none';document.getElementById('mcOutLabel').textContent='Generating…';const prompt=`Write a cold outreach email FROM a sales person at onAudience TO ${contactName}${contactTitle?' ('+contactTitle+')':''} at ${company}.\n\nonAudience: European first-party audience data company. 500M+ profiles, demographic+behavioral+purchase-intent segments across 30+ EU countries, Web + Mobile + CTV coverage, GDPR-compliant, TCF v2.0 certified. Direct integrations with major DSPs.\n\nCompany signals: ${tags.length?tags.join(', '):'n/a'}\nCompany context: ${ctx||'n/a'}\nOutreach angle: ${angle||'n/a'}\n\nRespond with:\nSUBJECT: [subject line]\n---\n[email body only — no sign-off name]\n\nKeep it 3–4 short paragraphs. End with a low-friction CTA.`;try{const data=await anthropicFetch({model:MODEL_CREATIVE,max_tokens:700,system:persona.system,messages:[{role:'user',content:prompt}]});if(data.error)throw new Error(data.error.message||'API error');const raw=(data.content||[]).filter(b=>b.type==='text').map(b=>b.text).join('').trim();let subject='',body=raw;const sm=raw.match(/^SUBJECT:\s*(.+?)(?:\n---|\n\n)/is);if(sm){subject=sm[1].trim();body=raw.replace(/^SUBJECT:.+?\n(?:---\n)?/is,'').trim();}S.mcLastEmail=body;mcRenderOutput(persona,subject,body,contactName,company);}catch(e){document.getElementById('mcEmpty').style.display='none';const oc=document.getElementById('mcOutContent');oc.style.display='block';oc.innerHTML=`<div class="mc-wrap"><div class="mc-error">Error: ${e.message}</div></div>`;document.getElementById('mcOutLabel').textContent='Error';}btn.disabled=false;btn.innerHTML=`<span>✉</span><span>Generate Email</span>`;}

function mcRenderOutput(persona,subject,body,contact,company){const oc=document.getElementById('mcOutContent');oc.style.display='block';oc.innerHTML=`<div class="mc-wrap mc-out-${persona.id}"><div class="mc-badge" style="background:${persona.color}"><span class="mc-bdot"></span><span class="mc-bemoji">${persona.emoji}</span><span>${persona.name.toUpperCase()}</span><span class="mc-bvibe">/ ${persona.vibe}</span></div>${subject?`<div class="mc-subject"><span>Subject</span><span class="mc-subject-val">${esc(subject)}</span></div>`:''}<div class="mc-email">${esc(body)}</div></div>`;const _rb3=document.getElementById('mcRBar');if(_rb3)_rb3.style.display='flex';document.getElementById('mcOutActs').style.display='flex';document.getElementById('mcOutLabel').textContent=`${persona.name} · ${company}${contact&&contact!=='there'?' → '+contact:''}`;document.getElementById('mcEmpty').style.display='none';const _rs=document.getElementById('mcRScroll');if(_rs)_rs.scrollTop=0;}

export function mcCopy(){const el=document.querySelector('.mc-email');if(!el)return;const txt=el.innerText||el.textContent||'';navigator.clipboard.writeText(txt).then(()=>{const btn=event.target;btn.textContent='Copied!';setTimeout(()=>btn.textContent='Copy',1600);}).catch(()=>{});}

export { MC_PERSONAS };
