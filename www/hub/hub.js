/* ═══ hub.js — main hub logic ═══ */

import { SB_URL, TAG_RULES, MODEL_CREATIVE, MODEL_RESEARCH } from './config.js?v=20260409a';
import S from './state.js?v=20260409a';
import { classify, _slug, getCoTags, getAv, ini, tClass, tLabel, stars, esc, relTime, authHdr, safeUrl } from './utils.js?v=20260409a';
import { renderStats, fetchGoogleNews, saveIntelligence, anthropicFetch, researchFetch, refreshRelationsCache, saveContact, lemlistFetch, lemlistCampaigns, lemlistAddLead, lemlistWriteBack } from './api.js?v=20260409a';
import { resolveAlias } from './merge.js?v=20260409a';

/* ═══ Tag helpers ════════════════════════════════════════════ */
export function tagCountsFor(pool){const m={};TAG_RULES.forEach(r=>{m[r.tag]=0;});pool.forEach(c=>getCoTags(c).forEach(t=>{m[t]=(m[t]||0)+1;}));return m;}
export function countPool(){const t30=Date.now()-30*24*60*60*1000;const cids=new Set(S.contacts.map(c=>_slug(c.company_name||'')));return S.companies.filter(c=>{if(S.activeFilter==='fresh'){if(c.type!=='prospect')return false;if(c.updated_at&&new Date(c.updated_at).getTime()>=t30)return false;if(cids.has(_slug(c.name)))return false;}else if(S.activeFilter!=='all'&&c.type!==S.activeFilter)return false;if(S.searchQ&&!(c.name||'').toLowerCase().includes(S.searchQ)&&!(c.note||'').toLowerCase().includes(S.searchQ))return false;return true;});}
export function matchTags(c){if(!S.activeTags.size)return true;const t=getCoTags(c);return S.tagLogic==='and'?[...S.activeTags].every(x=>t.includes(x)):[...S.activeTags].some(x=>t.includes(x));}

export function renderTagPanel(){const body=document.getElementById('tpBody');if(!body)return;const counts=tagCountsFor(countPool());body.innerHTML=TAG_RULES.filter(r=>counts[r.tag]>0).map(r=>`<span class="t-pill${S.activeTags.has(r.tag)?' active':''}" data-tag="${r.tag.replace(/"/g,'&quot;')}" onclick="toggleTagEl(this)">${r.tag}<span class="t-cnt">${counts[r.tag]}</span></span>`).join('');const cl=document.getElementById('tpClear');if(cl)cl.className='tp-clear'+(S.activeTags.size?' vis':'');}
export function toggleTagPanel(){S.tagPanelOpen=!S.tagPanelOpen;document.getElementById('tagPanel').className='tag-panel'+(S.tagPanelOpen?' open':'');document.getElementById('tagBtn').className='btn sm'+(S.tagPanelOpen?' on':'');if(S.tagPanelOpen)renderTagPanel();}
export function toggleTag(tag){if(S.activeTags.has(tag))S.activeTags.delete(tag);else S.activeTags.add(tag);renderTagPanel();renderList();}
export function toggleTagEl(el){toggleTag(el.dataset.tag);}
export function clearTags(){S.activeTags.clear();renderTagPanel();renderList();}
export function setTagLogic(l){S.tagLogic=l;document.getElementById('tlOr').className='tp-logic-btn'+(l==='or'?' active':'');document.getElementById('tlAnd').className='tp-logic-btn'+(l==='and'?' active':'');if(S.activeTags.size)renderList();}

/* ═══ AI Bar ═════════════════════════════════════════════════ */
export async function runAI(){const q=document.getElementById('aiInp').value.trim();if(!q)return;const btn=document.getElementById('aiBtn'),stat=document.getElementById('aiStat'),dot=document.getElementById('aiDot'),txt=document.getElementById('aiTxt');btn.disabled=true;stat.className='ai-stat vis';dot.className='ai-dot';dot.style.background='';txt.textContent='Thinking…';clog('ai',`Query: <b>${esc(q)}</b>`);const list=S.companies.map(c=>`${c.name} (${c.type}${c.category?' / '+c.category:''}${c.hq_city?' / '+c.hq_city:''}${c.note?' – '+c.note.slice(0,40):''})`).join('\n');try{const data=await anthropicFetch({model:MODEL_CREATIVE,max_tokens:800,system:'You are a B2B sales filter for onAudience. Given a company list and a query, return ONLY a raw JSON array of matching company names. No markdown, no explanation. Return [] if nothing matches.',messages:[{role:'user',content:`Query: "${q}"\n\nCompany list:\n${list}`}]});const raw=(data.content||[]).filter(b=>b.type==='text').map(b=>b.text).join('').replace(/```json|```/g,'').trim();const names=JSON.parse(raw);if(!Array.isArray(names))throw new Error('not array');S.aiSet=new Set(names);dot.className='ai-dot done';txt.textContent=`${names.length} matches — "${q.length>30?q.slice(0,30)+'…':q}"`;clog('ai',`✓ Found <b>${names.length}</b> matches for "${esc(q.slice(0,30))}"`);renderList();}catch(e){dot.className='ai-dot err';txt.textContent='Error — try again';clog('ai',`✗ Error: ${esc(e.message)}`);console.error(e);}btn.disabled=false;}
export function clearAI(){S.aiSet=null;document.getElementById('aiStat').className='ai-stat';document.getElementById('aiInp').value='';renderList();}
export function aiQuick(q){document.getElementById('aiInp').value=q;runAI();}

function renderMetaPills(){const el=document.getElementById('metaPills');const parts=[];S.activeTags.forEach(t=>{parts.push(`<span class="m-pill tag" data-tag="${t.replace(/"/g,'&quot;')}" onclick="toggleTagEl(this)" title="Remove">${t}</span>`);});if(S.aiSet){parts.push(`<span class="m-pill ai" onclick="clearAI()" title="Clear AI">AI: ${S.aiSet.size}</span>`);}el.innerHTML=parts.join('');}

/* ═══ Tabs / Filter / Search ═════════════════════════════════ */
export function switchTab(t){
  S.activeTab=t;
  document.getElementById('tabComp').className='left-tab'+(t==='companies'?' active':'');
  document.getElementById('tabCont').className='left-tab'+(t==='contacts'?' active':'');
  const tll=document.getElementById('tabLemlist');if(tll)tll.className='left-tab'+(t==='lemlist'?' active':'');
  document.getElementById('filtersRow').style.display=t==='companies'?'flex':'none';
  document.getElementById('tagPanel').style.display=t==='companies'?'':'none';
  document.getElementById('tagBtn').style.display=t==='companies'?'':'none';
  document.getElementById('aiBar').style.display=t==='companies'?'flex':'none';
  const llPanel=document.getElementById('lemlistPanel');
  if(t==='lemlist'){
    if(llPanel)llPanel.style.display='flex';
    ['listScroll','sortBar','listMeta','audiencesPanel','tcf-sel-bar'].forEach(id=>{const el=document.getElementById(id);if(el)el.style.display='none';});
    if(!_llInited){_llInited=true;refreshLemlistCampaigns();}
  }else{
    if(llPanel)llPanel.style.display='none';
  }
  renderList();
}
export function setFilter(f,el){S.activeFilter=f;document.querySelectorAll('.f-chip').forEach(c=>c.classList.remove('active'));if(el&&el.classList)el.classList.add('active');const sm={all:'sbAll',client:'sbClient',poc:'sbPoc',partner:'sbPartner',prospect:'sbProspect',nogo:'sbNogo',fresh:'sbFresh'};document.querySelectorAll('.sb-col').forEach(c=>c.classList.remove('active'));const s=document.getElementById(sm[f]);if(s)s.classList.add('active');if(S.tagPanelOpen)renderTagPanel();renderList();}
export function onSearch(){S.searchQ=document.getElementById('searchInput').value.toLowerCase().trim();if(S.tagPanelOpen)renderTagPanel();renderList();}

/* ═══ Console ════════════════════════════════════════════════ */
export function clog(type,msg){S.consoleLog.unshift({ts:new Date().toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',second:'2-digit'}),type,msg});if(S.consoleLog.length>100)S.consoleLog.length=100;renderConsole();}
function renderConsole(){const el=document.getElementById('consoleScroll');const cnt=document.getElementById('consoleCnt');if(!el)return;if(cnt)cnt.textContent=S.consoleLog.length;el.innerHTML=S.consoleLog.map(l=>`<div class="console-line"><span class="console-ts">${l.ts}</span><span class="console-type ${l.type}">${l.type}</span><span class="console-msg">${l.msg}</span></div>`).join('');}
export function toggleConsole(){const p=document.getElementById('consolePanel');if(p)p.classList.toggle('open');}
export function clearConsole(){S.consoleLog=[];renderConsole();}

/* ═══ Sort ═══════════════════════════════════════════════════ */
export function setSort(v){S.sortBy=v;renderList();}
function sortCompanies(arr){
  if(S.sortBy==='recent')return[...arr].sort((a,b)=>{const ta=a.updated_at?new Date(a.updated_at).getTime():0;const tb=b.updated_at?new Date(b.updated_at).getTime():0;return tb-ta;});
  if(S.sortBy==='icp')return[...arr].sort((a,b)=>(b.icp||0)-(a.icp||0));
  return[...arr].sort((a,b)=>(a.name||'').localeCompare(b.name||''));
}

/* ═══ Bold keywords helper ═══════════════════════════════════ */
function boldKw(text){
  if(!text)return'—';
  const kw=['client','partner','prospect','poc','dsp','ssp','agency','data','identity','cookieless','ctv','mobile','marketplace','programmatic','eu','emea','us','apac','integrated','active','expired','failed','no outreach','via','contact'];
  let s=esc(text);
  kw.forEach(k=>{const re=new RegExp('\\b('+k.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+')\\b','gi');s=s.replace(re,'<b>$1</b>');});
  return s;
}

/* ═══ One-click enrich ═══════════════════════════════════════ */
export async function quickEnrich(slug){
  const c=S.companies.find(x=>(x.id||_slug(x.name))===slug);if(!c)return;
  clog('enrich',`Opening research panel for <b>${c.name}</b>…`);
  openCompany(c);
  setTimeout(promptResearch,60);
}

/* ═══ Completeness indicator ═════════════════════════════════ */
function completeness(c){
  const fields=[c.description,c.category,c.region||c.hq_city,c.size,c.website,c.icp,c.outreach_angle,c.tech_stack?.length,c.dsps?.length];
  const filled=fields.filter(Boolean).length;
  return Math.round(filled/fields.length*100);
}

/* ═══ Tech name/cat helpers (module-level — used in openCompany) ══
   NOTE: declared with var to avoid Temporal Dead Zone errors when
   referenced inside openCompany before the const would be initialized.
   ═══════════════════════════════════════════════════════════════════ */
var techName=(t)=>typeof t==='string'?t:(t&&t.tool)?String(t.tool):(t&&t.name)?String(t.name):typeof t==='object'?JSON.stringify(t):'?';
var techCat=(t)=>typeof t==='object'&&t?t.category||'':'';

/* ═══ List Rendering ═════════════════════════════════════════ */
export function renderList(){
  const scroll=document.getElementById('listScroll'),meta=document.getElementById('metaTxt');
  if(S.activeTab==='tcf'){window.renderTCFList?.();return;}
  if(S.activeTab==='contacts'){const filt=S.contacts.filter(c=>{if(!S.searchQ)return true;return(c.full_name||'').toLowerCase().includes(S.searchQ)||(c.company_name||'').toLowerCase().includes(S.searchQ)||(c.title||'').toLowerCase().includes(S.searchQ);});meta.textContent=`${filt.length} of ${S.contacts.length} contacts`;if(!filt.length){scroll.innerHTML='<div style="padding:20px 10px;font-family:\'IBM Plex Mono\',monospace;font-size:9px;color:var(--t3);text-transform:uppercase">No contacts</div>';return;}scroll.innerHTML=filt.map(ct=>{const av=getAv(ct.full_name||'');const n=ini(ct.full_name||'');return`<div class="ct-row" onclick="openContactFull('${ct.id||_slug(ct.full_name||'')}')"><div class="ct-av" style="background:${av.bg};color:${av.fg}">${n}</div><div class="ct-info"><div class="ct-name">${ct.full_name||'—'}</div><div class="ct-sub">${ct.title||''}${ct.company_name?' · '+ct.company_name:''}</div></div></div>`;}).join('');return;}
  const t30=Date.now()-30*24*60*60*1000,cids=new Set(S.contacts.map(c=>_slug(c.company_name||'')));
  let filt=S.companies.filter(c=>{if(S.activeFilter==='fresh'){if(c.type!=='prospect')return false;if(c.updated_at&&new Date(c.updated_at).getTime()>=t30)return false;if(cids.has(_slug(c.name)))return false;}else if(S.activeFilter!=='all'&&c.type!==S.activeFilter)return false;if(S.searchQ&&!(c.name||'').toLowerCase().includes(S.searchQ)&&!(c.note||'').toLowerCase().includes(S.searchQ)&&!(c.category||'').toLowerCase().includes(S.searchQ)&&!(c.hq_city||'').toLowerCase().includes(S.searchQ)&&!(c.region||'').toLowerCase().includes(S.searchQ))return false;if(!matchTags(c))return false;if(S.aiSet&&!S.aiSet.has(c.name))return false;return true;});
  filt=sortCompanies(filt);
  const parts=[`${filt.length} of ${S.companies.length}`];if(S.activeTags.size)parts.push(`· ${S.activeTags.size} tag${S.activeTags.size>1?'s':''} ${S.tagLogic.toUpperCase()}`);if(S.aiSet)parts.push('· AI');meta.textContent=parts.join(' ');renderMetaPills();
  if(!filt.length){scroll.innerHTML='<div style="padding:20px 10px;font-family:\'IBM Plex Mono\',monospace;font-size:9px;color:var(--t3);text-transform:uppercase">No results</div>';return;}

  scroll.innerHTML=filt.map(c=>{
    const av=getAv(c.name),n=ini(c.name);
    const tc=tClass(c.type),tl=tLabel(c.type);
    const sel=S.currentCompany&&S.currentCompany.name===c.name?' selected':'';
    const slug=_slug(c.name);
    const coTags=getCoTags(c);
    const pct=completeness(c);

    const ctCount=S.contacts.filter(ct=>ct.company_id===(c.id||slug)||_slug(ct.company_name||'')===slug).length;
    const details=[];
    if(c.hq_city||c.region)details.push(`<span class="c-detail-item">📍 <b>${esc(c.hq_city||c.region)}</b></span>`);
    if(c.size)details.push(`<span class="c-detail-item">👥 <b>${esc(c.size)}</b></span>`);
    if(c.category)details.push(`<span class="c-detail-item">${esc(c.category)}</span>`);
    if(c.icp)details.push(`<span class="c-detail-item" style="color:var(--g)">ICP ${c.icp}</span>`);
    if(ctCount)details.push(`<span class="c-detail-item">🧑‍💼 ${ctCount} contact${ctCount>1?'s':''}</span>`);
    if(c.relationship_status)details.push(`<span class="c-detail-item" style="color:var(--g);font-weight:600">${esc(c.relationship_status)}</span>`);
    if(c.website)details.push(`<a class="c-detail-item" href="${safeUrl(c.website)}" target="_blank" onclick="event.stopPropagation()" style="color:var(--g);text-decoration:none">${esc(c.website.replace(/^https?:\/\//i,''))}</a>`);
    if(c.updated_at)details.push(`<span class="c-detail-item" style="opacity:.55">${relTime(c.updated_at)}</span>`);
    const detailHtml=details.length?`<div class="c-detail">${details.join('<span class="c-detail-sep"></span>')}</div>`:'';

    const noteHtml=boldKw((c.note||'').length>60?(c.note||'').slice(0,58)+'…':(c.note||''));
    const tagRow=coTags.length?`<div class="c-tags-row">${coTags.slice(0,6).map(t=>`<span class="c-tag-micro${S.activeTags.has(t)?' hit':''}" onclick="event.stopPropagation();toggleTag('${t}')">${t}</span>`).join('')}</div>`:'';
    const enrichBtn=pct<50?`<span class="c-enrich" onclick="event.stopPropagation();quickEnrich('${slug}')" title="${pct}% complete — click to research">✦ enrich</span>`:'';

    return`<div class="c-row${sel}" data-slug="${slug}" onclick="openBySlug(this.dataset.slug)" oncontextmenu="showCtxSlug(event,this);return false;">
      <div class="c-av" style="background:${av.bg};color:${av.fg};border:1px solid ${av.fg}33">${n}</div>
      <div class="c-info">
        <div style="display:flex;align-items:center;gap:4px"><div class="c-name" style="flex:1">${c.name}</div>${c.company_number?`<span class="c-num">#${c.company_number}</span>`:''}<span class="tag ${tc}" style="flex-shrink:0">${tl}</span>${enrichBtn}</div>
        <div class="c-note">${noteHtml}</div>
        ${detailHtml}
        ${tagRow}
      </div>
    </div>`;
  }).join('');
}

/* ═══ Company Detail Panel ═══════════════════════════════════ */
function ibToggle(id){const b=document.getElementById(id);if(!b)return;const closed=b.style.display==='none';b.style.display=closed?'':'none';const arrow=document.getElementById(id+'-arrow');if(arrow)arrow.textContent=closed?'▾':'▸';if(closed&&id==='ib-segments-body'&&b.querySelector('#ib-seg-loading'))mapSegments();if(closed&&id==='ib-email-body')_refreshEmailSection(window._currentEmailSlug);}
window.ibToggle=ibToggle;

export function openCompany(c){
  if(!c)return;
  if(typeof c==='string'){resolveAlias(c).then(rid=>{const found=S.companies.find(x=>x.id===rid);if(found)openCompany(found);});return;}
  S.currentCompany=c;window.currentCompany=c;
  document.getElementById('emptyState').style.display='none';
  const panel=document.getElementById('coPanel');panel.style.display='block';
  const av=getAv(c.name),n=ini(c.name),tc=tClass(c.type),tl=tLabel(c.type),st=stars(c.icp);

  const liSlug=c.linkedin_slug||_slug(c.name);
  const facts=[
    c.category&&['Category',esc(c.category)],
    (c.region||c.hq_city)&&['HQ',esc([c.hq_city,c.region].filter(Boolean).join(', '))],
    c.size&&['Size',esc(c.size)],
    c.founded_year&&['Founded',esc(c.founded_year)],
    c.funding&&['Funding',esc(c.funding)],
    c.tcf_vendor_id&&['GVL/TCF',`<span style="color:var(--g)">${c.tcf_vendor_id}</span>`],
    c.dsps&&c.dsps.length&&['DSPs',esc((Array.isArray(c.dsps)?c.dsps:c.dsps.split(',')).join(', '))],
    c.company_number&&['#',`<span style="font-family:'IBM Plex Mono',monospace;font-weight:600;color:var(--t2)">#${c.company_number}</span>`],
    c.data_richness!=null&&['Richness',`<span style="font-family:'IBM Plex Mono',monospace;font-size:9px">${'█'.repeat(Math.min(c.data_richness,11))}${'░'.repeat(Math.max(0,11-c.data_richness))}</span> <span style="color:var(--t3)">${c.data_richness}/11</span>`],
    c.updated_at&&['Updated',new Date(c.updated_at).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'2-digit'})],
    c.updated_by_name&&['Edited by',`<span style="color:var(--g)">${esc(c.updated_by_name)}</span>`],
    c.relationship_owner&&['Owner',`<span style="color:var(--poc)">${esc(c.relationship_owner)}</span>`]
  ].filter(Boolean);

  const links=[];
  if(c.website)links.push(`<a href="${safeUrl(c.website)}" target="_blank" class="ib-fact-link" title="${esc(c.website.replace(/^https?:\/\//i,''))}">🌐 ${esc(c.website.replace(/^https?:\/\//i,''))}</a>`);
  links.push(`<a href="https://www.linkedin.com/company/${liSlug}" target="_blank" class="ib-fact-link" title="LinkedIn company page">LI Company ↗</a>`);
  links.push(`<a href="https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(c.name+' data partnerships')}" target="_blank" class="ib-fact-link" title="LinkedIn people search">LI People ↗</a>`);
  if(c.website)links.push(`<a href="https://www.crunchbase.com/organization/${_slug(c.name)}" target="_blank" class="ib-fact-link" title="Crunchbase">Crunchbase ↗</a>`);
  if(c.website)links.push(`<a href="${safeUrl(c.website)+'/privacy'}" target="_blank" class="ib-fact-link" title="Privacy policy">Privacy ↗</a>`);
  links.push(`<a href="https://news.google.com/search?q=${encodeURIComponent(c.name)}" target="_blank" class="ib-fact-link" title="Google News">News ↗</a>`);
  const linksHtml=`<div class="ib-fact-links">${links.join('')}</div>`;

  const semnTags=getCoTags(c);const techArr=Array.isArray(c.tech_stack)?c.tech_stack:[];
  const signalHtml=[semnTags.length?`<span class="ib-sig-lbl">Signals</span>${semnTags.map(t=>`<span class="ib-sig-tag">${t}</span>`).join('')}`:'',semnTags.length&&techArr.length?'<span class="ib-sig-div"></span>':'',techArr.length?`<span class="ib-sig-lbl">Tech</span>${techArr.slice(0,8).map(t=>`<span class="ib-tech-pill">${esc(techName(t))}</span>`).join('')}`:''].filter(Boolean).join('');

  const _ctMatchSlug=c.id||slug;const coCts=S.contacts.filter(ct=>ct.company_id===_ctMatchSlug||_slug(ct.company_name||'')===_ctMatchSlug||(ct.company_name||'').toLowerCase()===(c.name||"").toLowerCase()||_slug(ct.company_name||'')===_slug(c.name||''));
  const ctGridHtml=coCts.length?`<div class="ib-cts-grid">${coCts.map(ct=>{const a2=getAv(ct.full_name||''),n2=ini(ct.full_name||'');const ctSlug=ct.id||_slug(ct.full_name||'');return`<div class="ib-ct" data-ctslug="${ctSlug}" onclick="openDrawer('${ctSlug}')"><div class="ib-ct-top"><div class="ib-ct-av" style="background:${a2.bg};color:${a2.fg}">${n2}</div><div><div class="ib-ct-name">${ct.full_name||'—'}</div><div class="ib-ct-title">${ct.title||''}</div></div></div>${ct.email?`<div class="ib-ct-email">${ct.email}</div>`:''}<div class="ib-ct-actions"><button class="ib-ct-btn" onclick="event.stopPropagation();ctAction('email','${ctSlug}')">✉ Email</button>${ct.linkedin_url?`<button class="ib-ct-btn" onclick="event.stopPropagation();window.open('${ct.linkedin_url}','_blank')">LI ↗</button>`:''}<button class="ib-ct-btn" onclick="event.stopPropagation();ctAction('research','${ctSlug}')">Research ↗</button>${ct.email?`<button class="ib-ct-btn" onclick="event.stopPropagation();openClaudeGmail('draft',currentCompany,'${esc(ct.email)}','${esc(ct.full_name||'')}')">✉ Draft</button>`:''}${ct.email?`<button class="ib-ct-btn" onclick="event.stopPropagation();openLemlistModal([{id:'${ctSlug}',email:'${esc(ct.email||'')}',name:'${esc(ct.full_name||'')}',company_name:'${esc(ct.company_name||'')}',title:'${esc(ct.title||'')}',linkedin:'${esc(ct.linkedin_url||'')}'}])">📤</button>`:''}</div></div>`;}).join('')}</div>`:`<div style="display:flex;align-items:center;gap:8px"><div style="font-size:11px;color:var(--t3)">No contacts stored</div><button class="ib-cta-btn" onclick="bgFindDMs()" style="margin-left:auto">✨ Find DMs</button></div>`;

  const prods=c.products?.products||[];
  const prodsHtml=prods.length?prods.map(p=>`<div class="ib-prod-row"><div class="ib-prod-name">${p.name||''}</div><div class="ib-prod-desc">${p.description||''}${p.target_user?` <span style="color:var(--t3)">· ${p.target_user}</span>`:''}</div></div>`).join(''):'';

  let techBlock='';
  if(techArr.length){
    const cats={};techArr.forEach(t=>{const c2=techCat(t)||'Other';if(!cats[c2])cats[c2]=[];cats[c2].push(t);});
    techBlock=`<div style="margin-top:10px;padding-top:8px;border-top:1px solid var(--rule2)">
      <div style="font-family:'IBM Plex Mono',monospace;font-size:7px;font-weight:600;text-transform:uppercase;letter-spacing:.07em;color:var(--t3);margin-bottom:6px">Tech Stack · ${techArr.length}</div>
      ${Object.entries(cats).map(([cat,items])=>`<div style="margin-bottom:6px">
        <div style="font-family:'IBM Plex Mono',monospace;font-size:6px;text-transform:uppercase;letter-spacing:.05em;color:var(--t4);margin-bottom:3px">${esc(cat)}</div>
        <div style="display:flex;flex-wrap:wrap;gap:2px">${items.map(t=>{
          const nm=techName(t);const conf=typeof t==='object'&&t?.confidence;
          return`<span style="font-family:'IBM Plex Mono',monospace;font-size:8px;padding:2px 6px;border-radius:2px;border:1px solid ${conf==='high'?'var(--gr)':'var(--rule)'};background:${conf==='high'?'var(--gb)':'var(--surf3)'};color:${conf==='high'?'var(--g)':'var(--t2)'};white-space:nowrap">${esc(nm)}</span>`;
        }).join('')}</div>
      </div>`).join('')}
    </div>`;
  }

  const integ=c.products?.integrations_advertised||[];
  const integBlock=integ.length?`<div style="margin-top:8px"><div style="font-family:'IBM Plex Mono',monospace;font-size:7px;font-weight:600;text-transform:uppercase;letter-spacing:.07em;color:var(--t3);margin-bottom:5px">Integrations</div><div style="display:flex;flex-wrap:wrap;gap:3px">${integ.map(i=>`<span class="ib-sig-tag">${esc(i)}</span>`).join('')}</div></div>`:'';

  let privacyHtml='';
  {
    const gvl=window.gvlData;
    const vendor=gvl&&c.tcf_vendor_id?gvl.vendors[String(c.tcf_vendor_id)]||null:null;
    const pLabels=['','Store/access','Basic ads','Ad profiles','Use ad profiles','Content profiles','Use content profiles','Measure ads','Measure content','Audience stats','Develop/improve'];
    let purposeGrid='';
    if(c.tcf_vendor_id&&vendor){
      const co=vendor.purposes||[],li=vendor.legIntPurposes||[];
      purposeGrid='<div style="display:flex;gap:2px;flex-wrap:wrap;margin-bottom:8px">'+[1,2,3,4,5,6,7,8,9,10].map(id=>{
        const inC=co.indexOf(id)!==-1,inLI=li.indexOf(id)!==-1;
        const bg=inC?'#4ADE80':inLI?'#F87171':'var(--surf4)';
        const label=inC?'Consent':inLI?'Leg.Int.':'—';
        return`<span title="P${id}: ${pLabels[id]} (${label})" style="display:inline-flex;flex-direction:column;align-items:center;gap:1px;cursor:default"><span style="display:block;width:14px;height:10px;border-radius:1px;background:${bg}"></span><span style="font-family:'IBM Plex Mono',monospace;font-size:6px;color:var(--t3)">${id}</span></span>`;
      }).join('')+'</div><div style="display:flex;gap:8px;margin-bottom:8px;font-family:\'IBM Plex Mono\',monospace;font-size:7px;color:var(--t3)"><span><span style="display:inline-block;width:8px;height:6px;border-radius:1px;background:#4ADE80;margin-right:2px"></span>Consent</span><span><span style="display:inline-block;width:8px;height:6px;border-radius:1px;background:#F87171;margin-right:2px"></span>Leg. Interest</span><span><span style="display:inline-block;width:8px;height:6px;border-radius:1px;background:var(--surf4);margin-right:2px"></span>Not declared</span></div>';
    }else if(c.tcf_vendor_id&&!vendor&&gvl){
      purposeGrid='<div style="font-size:10px;color:var(--t3);margin-bottom:8px">GVL ID '+c.tcf_vendor_id+' not found in vendor list</div>';
    }else if(c.tcf_vendor_id&&!gvl){
      purposeGrid='<div style="font-size:10px;color:var(--t3);margin-bottom:8px">GVL loading… <span style="cursor:pointer;color:var(--g)" onclick="loadGVL().then(()=>openCompany(currentCompany))">↺ retry</span></div>';
    }
    const tagPills=semnTags.length?'<div style="margin-top:8px;padding-top:8px;border-top:1px solid var(--rule2)"><div style="font-family:\'IBM Plex Mono\',monospace;font-size:7px;font-weight:600;text-transform:uppercase;letter-spacing:.07em;color:var(--t3);margin-bottom:5px">Tags</div><div style="display:flex;flex-wrap:wrap;gap:3px">'+semnTags.map(t=>`<span class="ib-sig-tag">${t}</span>`).join('')+'</div></div>':'';
    privacyHtml=`<div class="ib-sec"><div class="ib-sh" style="cursor:pointer" onclick="ibToggle('ib-privacy-body')"><span id="ib-privacy-body-arrow" style="font-size:9px;color:var(--t3)">▾</span><span class="ib-sh-lbl">🛡️ Privacy / TCF / CCPA</span>${c.tcf_vendor_id?`<span class="tag tc" style="cursor:default;margin-left:4px">GVL ${c.tcf_vendor_id}</span>`:'<span class="tag tn" style="cursor:default;margin-left:4px">No GVL</span>'}<span class="ib-sh-act" onclick="event.stopPropagation();switchTab('tcf')">TCF Analyser →</span></div><div class="ib-body" id="ib-privacy-body">${purposeGrid}<table class="ib-facts">${c.tcf_vendor_id?`<tr><td>TCF v2.0</td><td>Vendor ID ${c.tcf_vendor_id} — registered in IAB GVL</td></tr>`:''}<tr><td>GDPR</td><td>${c.tcf_vendor_id?'TCF certified — consent-based processing':'No TCF registration found'}</td></tr><tr><td>CCPA</td><td>${c.website?`Check <a href="${safeUrl(c.website)+'/privacy'}" target="_blank" style="color:var(--g)">privacy policy ↗</a> for CCPA/CPRA disclosures`:'Unknown — no website stored'}</td></tr></table>${tagPills}</div></div>`;
  }

  const sec=(id,icon,label,body,extra,startOpen)=>{
    const arrow=startOpen!==false?'▾':'▸';
    const disp=startOpen!==false?'':'display:none';
    return`<div class="ib-sec"><div class="ib-sh" style="cursor:pointer" onclick="ibToggle('${id}')"><span id="${id}-arrow" style="font-size:9px;color:var(--t3)">${arrow}</span><span class="ib-sh-lbl">${icon} ${label}</span>${extra||''}</div><div class="ib-body" id="${id}" style="${disp}">${body}</div></div>`;
  };

  // System audience membership chips
  const _sysMap={client:'Clients',partner:'Partners',nogo:'NoOutreach'};
  const _coSlug=esc(c.id||_slug(c.name));
  const _memberChip=_sysMap[c.type]?`<span class="sys-chip" onclick="sysCoSetType('${_coSlug}','prospect')" title="Remove from ${_sysMap[c.type]}">● ${_sysMap[c.type]} ✕</span>`:'';
  const _addOpts=Object.entries(_sysMap).filter(([t])=>t!==c.type).map(([t,l])=>`<div class="sys-dd-item" onclick="sysCoSetType('${_coSlug}','${t}')">${l}</div>`).join('');
  const sysSection=`<div class="ib-sys-row">${_memberChip}<div style="position:relative;display:inline-block"><span class="sys-chip sys-chip-add" onclick="this.nextElementSibling.classList.toggle('open')">+ List ▾</span><div class="sys-dd">${_addOpts}</div></div></div>`;

  const _rs=c.relationship_status||'';
  const _statusBtns=['Contacted','Meeting','Proposal','Partner','Paused'].map(s=>`<button class="btn sm${_rs===s?' on':''}" onclick="setCompanyStatus('${_coSlug}','${s}')">${s}</button>`).join('');

  const slug=_slug(c.name);
  window._currentEmailSlug=slug;

  panel.innerHTML=`<div class="ib">
<div class="ib-head"><div class="ib-av${c.type==='nogo'?' nogo':''}">${n}</div><div class="ib-meta"><div class="ib-name">${c.name}</div><div class="ib-row2"><span class="tag ${tc}">${tl}</span>${st?`<span class="ib-icp">${st}</span>`:''}</div>${c.note?`<div class="ib-note">${c.note}</div>`:''}${sysSection}</div><div class="ib-close" onclick="closePanel()">✕</div></div>
<div class="ib-cta"><button class="ib-cta-btn primary" onclick="coAction('email')">✉ Draft Email</button><button class="ib-cta-btn" onclick="bgFindDMs()">👤 Find DMs</button><button class="ib-cta-btn" onclick="bgGenerateAngle()">💡 Gen Angle</button><button class="ib-cta-btn" onclick="bgRefreshIntel()">📰 Refresh News</button><button class="ib-cta-btn" onclick="coAction('similar')">🔗 Find Similar</button><button class="ib-cta-btn" onclick="coAction('linkedin')" style="margin-left:auto">LinkedIn ↗</button><button class="btn sm" onclick="openMergeModal('${esc(c.id)}')">⚙ Merge</button><button class="btn sm" onclick="openClaudeGmail('history',currentCompany)">📬 Gmail History</button>${coCts.length?`<button class="btn sm" onclick="openClaudeGmail('draft',currentCompany,${JSON.stringify(coCts[0]?.email||'')},${JSON.stringify(coCts[0]?.full_name||'')})">✉ Draft Email</button>`:''}</div>
<div class="ib-status-bar"><span class="ib-status-lbl">&#127991; Mark as:</span>${_statusBtns}</div>
<div class="ib-top">
  ${sec('ib-company','🏢','Company',
    (facts.length?`<table class="ib-facts">${facts.map(([k,v])=>`<tr><td>${k}</td><td>${v}</td></tr>`).join('')}</table>`:'<span style="font-size:11px;color:var(--t3)">No details stored</span>')+linksHtml+(c.description?`<div class="ib-desc">${c.description}</div>`:''),
    null,true)}
  <div class="ib-sec"><div class="ib-sh" style="cursor:pointer" onclick="ibToggle('ib-angle-wrap')"><span id="ib-angle-wrap-arrow" style="font-size:9px;color:var(--t3)">▾</span><span class="ib-sh-lbl">💡 Outreach Angle</span><span class="ib-sh-act" id="ib-angle-btn" onclick="event.stopPropagation();bgGenerateAngle()">${c.outreach_angle?'↺ Regen':'✨ Generate'}</span></div><div class="ib-body" id="ib-angle-wrap" style="padding:0"><div class="ib-angle${c.outreach_angle?'':' empty'}" id="ib-angle-card" style="border:none;border-radius:0;min-height:60px"><div class="ib-angle-lbl">${c.outreach_angle?'Recommended positioning':'No angle stored yet'}</div>${c.outreach_angle?`<div class="ib-angle-text">${c.outreach_angle}</div>`:`<div class="ib-angle-text" style="color:var(--t3);font-size:10px">Click "✨ Generate" to create a personalised positioning.</div>`}</div>${techBlock}${integBlock}</div></div>
</div>
${signalHtml?`<div class="ib-sec"><div class="ib-signals">${signalHtml}</div></div>`:''}
${privacyHtml}
${sec('ib-ct-body','👤','Contacts',ctGridHtml,
  `${coCts.length?`<span class="ib-sh-cnt">${coCts.length}</span>`:''}<span class="ib-sh-act" onclick="event.stopPropagation();bgFindDMs()">✨ Find DMs</span>`,true)}
${sec('ib-intel-body','📰','Intelligence','<div class="ib-loading">Loading…</div>',
  `<span class="ib-sh-cnt" id="ib-intel-cnt"></span><span id="ib-intel-live" style="display:none" class="live-label"><span class="live-dot"></span>Live</span><span class="ib-sh-act" id="ib-intel-refresh" onclick="event.stopPropagation();bgRefreshIntel()">↺ Refresh</span>`,false)}
${sec('ib-email-body','📧','Email History',_getEmailSectionHTML(slug,c.name),``,false)}
${prodsHtml?sec('ib-prods-body','📦','Products',prodsHtml,`<span class="ib-sh-cnt">${prods.length}</span>`,false):''}
${sec('ib-segments-body','🎯','Segment Mapper','<div class="ib-loading" id="ib-seg-loading">Loading taxonomy…</div>',
  `<span class="ib-sh-cnt" id="ib-seg-cnt"></span><span class="ib-sh-act" onclick="event.stopPropagation();mapSegments()">↺ Remap</span>`,false)}
${sec('ib-rels-body','🔗','Relations','<div class="ib-loading">Loading…</div>',
  `<span class="ib-sh-cnt" id="ib-rels-cnt"></span><span class="ib-sh-act" id="ib-rels-refresh" onclick="event.stopPropagation();loadRelationsBrief(_slug('${c.name.replace(/'/g,"\\'")}'),true)">↺ Refresh</span>`,true)}
<div class="ib-sec"><div class="ib-sh" style="cursor:pointer" onclick="ibToggle('ib-links-body')"><span id="ib-links-body-arrow" style="font-size:9px;color:var(--t3)">▾</span><span class="ib-sh-lbl">🔗 Quick Links</span></div><div class="ib-links" id="ib-links-body"><a class="ib-link" href="https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(c.name+' data partnerships')}" target="_blank">LI People ↗</a><a class="ib-link" href="https://www.linkedin.com/search/results/companies/?keywords=${encodeURIComponent(c.name)}" target="_blank">LI Company ↗</a>${c.website?`<a class="ib-link" href="${safeUrl(c.website)}" target="_blank">${c.website.replace(/^https?:\/\//i,'')} ↗</a>`:''}<a class="ib-link" href="https://news.google.com/search?q=${encodeURIComponent(c.name)}" target="_blank">Google News ↗</a><span class="ib-link" onclick="coAction('gmail')">Gmail History</span></div></div>
</div>`;
  renderList();document.getElementById('centerScroll').scrollTop=0;
  if(c.name){setTimeout(()=>loadRelationsBrief(slug),60);setTimeout(()=>loadIntelligence(slug,c.name),80);}
}
export function closePanel(){S.currentCompany=null;window.currentCompany=null;document.getElementById('coPanel').style.display='none';document.getElementById('emptyState').style.display='flex';renderList();}

/* ═══ Actions ════════════════════════════════════════════════ */
export function coAction(a){
  const c=S.currentCompany;if(!c)return;const n=c.name;
  if(a==='report'){promptResearch();}
  if(a==='dms')bgFindDMs();
  if(a==='email')window.openComposer({company:n,note:c.note,status:c.type,icp:c.icp||null,description:c.description||'',angle:c.outreach_angle||'',category:c.category||'',region:c.region||''});
  if(a==='linkedin')window.open('https://linkedin.com/search/results/companies/?keywords='+encodeURIComponent(n),'_blank');
  if(a==='similar')promptSimilar();
  if(a==='gmail'){const ib=document.getElementById('ib-intel-body');if(ib)ib.scrollIntoView({behavior:'smooth',block:'nearest'});bgRefreshIntel();}
  if(a==='angle')bgGenerateAngle();
  if(a==='find-contacts')bgFindDMs();
}
export function openClaudeGmail(type, company, contactEmail, contactName) {
  if (!company) return;
  let prompt;
  if (type === 'history') {
    const domain = company.website
      ? company.website.replace(/^https?:\/\//i,'').split('/')[0]
      : (company.name||'').toLowerCase().replace(/\s+/g,'') + '.com';
    prompt = `Check Gmail for existing contact history with ${company.name} (domain: ${domain}). Show: relationship score (🔥/♻️/🌡️/🧊), contacts found with titles and emails, last thread date, topic and outcome, and who from onAudience owns the relationship. Cross-reference any found contacts against web to verify current roles.`;
  } else if (type === 'draft') {
    const techStack = (company.tech_stack||[]).map(t=>t.tool||t).filter(Boolean).join(', ');
    prompt = `Draft a cold outreach email to ${contactName||'the recipient'} <${contactEmail||''}> at ${company.name}. Company: ${company.description||''}. Category: ${company.category||''}. ICP score: ${company.icp||''}. Outreach angle: ${company.outreach_angle||'data partnership'}. Tech stack: ${techStack}. Keep it under 150 words, specific hook, one clear value prop. Then use Gmail connector to save it as a draft.`;
  } else {
    return;
  }
  window.open('https://claude.ai/new?q=' + encodeURIComponent(prompt), '_blank');
}

export async function setCompanyStatus(id,status){
  const co=S.companies.find(c=>(c.id||_slug(c.name))===id);
  if(!co)return;
  co.relationship_status=status;
  if(S.currentCompany&&(S.currentCompany.id||_slug(S.currentCompany.name))===id)S.currentCompany.relationship_status=status;
  // toggle .on on status bar buttons
  document.querySelectorAll('.ib-status-bar .btn').forEach(b=>{b.classList.toggle('on',b.textContent===status);});
  renderList();
  clog('db',`Status set: <b>${esc(co.name)}</b> → ${esc(status)}`);
  await fetch(`${SB_URL}/rest/v1/companies?id=eq.${encodeURIComponent(id)}`,{method:'PATCH',headers:authHdr({'Prefer':'return=minimal'}),body:JSON.stringify({relationship_status:status})}).catch(e=>clog('db',`Status PATCH error: ${esc(e.message)}`));
}

export function ctAction(action,ctSlug){
  const ct=S.contacts.find(c=>c.id===ctSlug||(c.full_name&&_slug(c.full_name)===ctSlug));if(!ct)return;
  if(action==='email')window.openComposer({company:ct.company_name,contactName:ct.full_name,contactTitle:ct.title,linkedin:ct.linkedin_url});
  if(action==='research')openDrawer(ctSlug);
}

/* ═══ BG Generate Angle ══════════════════════════════════════ */
export async function bgGenerateAngle(){const c=S.currentCompany;if(!c)return;const card=document.getElementById('ib-angle-card'),btn=document.getElementById('ib-angle-btn');if(card){card.className='ib-angle';card.innerHTML=`<div class="ib-angle-lbl"><span class="bg-running">✦ Generating…</span></div>`;}if(btn)btn.style.display='none';const tags=getCoTags(c).join(', ');const techArr2=(Array.isArray(c.tech_stack)?c.tech_stack:[]).slice(0,6).map(t=>typeof t==='string'?t:(t&&t.tool)?String(t.tool):'?').join(', ');try{const data=await anthropicFetch({model:MODEL_CREATIVE,max_tokens:350,system:'You are a senior B2B data partnership sales specialist at onAudience, a European first-party audience data company. Write a concise, specific outreach angle (3–5 sentences) for approaching this company. Focus on what onAudience data solves for their business model, timing signals, and clearest value hook. No bullet points. Flowing prose only.',messages:[{role:'user',content:`Company: ${c.name}\nType: ${c.type}\nCategory: ${c.category||'unknown'}\nNote: ${c.note||''}\nDescription: ${c.description||''}\nTech: ${techArr2}\nDSPs: ${JSON.stringify(c.dsps||[])}\nSignals: ${tags}`}]});const angle=(data.content||[]).filter(b=>b.type==='text').map(b=>b.text).join('').trim();if(!angle)throw new Error('empty');S.currentCompany.outreach_angle=angle;S.companies.forEach(co=>{if(co.name===c.name)co.outreach_angle=angle;});if(card){card.className='ib-angle';card.innerHTML=`<div class="ib-angle-lbl">Recommended positioning <span class="bg-done">✓ generated</span></div><div class="ib-angle-text">${angle}</div>`;}if(btn){btn.textContent='↺ Regen';btn.style.display='';}await fetch(`${SB_URL}/rest/v1/companies?name=eq.${encodeURIComponent(c.name)}`,{method:'PATCH',headers:authHdr({'Prefer':'return=minimal'}),body:JSON.stringify({outreach_angle:angle})}).catch(()=>{});}catch(e){if(card)card.innerHTML=`<div class="ib-angle-lbl"><span class="bg-err">Error — ${e.message}</span></div>`;if(btn){btn.textContent='↺ Retry';btn.style.display='';}}}

/* ═══ BG Find DMs (Opus + web_search — zero hallucination) ═══ */
const FIND_DMS_SYSTEM=`You are a B2B sales researcher finding REAL decision makers and outreach signals for data partnership outreach.

CRITICAL RULES — ABSOLUTE:
1. ONLY return people you have VERIFIED via web search. Use the web_search tool to find real LinkedIn profiles, company team pages, press releases, and conference speakers.
2. NEVER invent names. NEVER guess titles. If web search returns no results for a company's team, return an EMPTY contacts array [].
3. Every person you return MUST have appeared in at least one web search result. Include the source URL.
4. LinkedIn URLs must be REAL profile URLs found via search (https://www.linkedin.com/in/real-slug), NOT constructed search queries.
   If you cannot find a real LinkedIn URL, set linkedin_url to "" (empty string).
5. Uncertainty is ALWAYS better than fiction. Return fewer verified people rather than more guessed ones.

ALSO EXTRACT outreach signals — things a sales person would care about:
- Hiring for data/programmatic/partnership roles (buying_signal)
- New leadership hires or departures (org_change)
- Technology adoption/migration — new DSP, CDP, identity solution (tech_change)
- Conference appearances, speaking, panel participation (event)
- Existing data partnerships with competitors (competitive_intel)
- Funding rounds, expansion, new market entry (timing_signal)

RESPONSE FORMAT — raw JSON object, no markdown:
{
  "contacts": [{"full_name":"string","title":"string","linkedin_url":"string","source_url":"string","confidence":"verified|probable","reason":"string"}],
  "signals": [{"signal_type":"buying_signal|org_change|tech_change|event|competitive_intel|timing_signal","title":"string (short)","detail":"string (1-2 sentences)","source_url":"string","confidence":"verified|probable","relevance":1-5}]
}

Search strategy for contacts:
- Search: "[company name] head of data partnerships" or "VP programmatic"
- Search: "site:linkedin.com/in [company name] data partnerships"
- Search: "[company name] team leadership"
- If a name appears in multiple sources, confidence = "verified"

Search strategy for signals:
- Search: "[company name] hiring data partnerships"
- Search: "[company name] data partnership announcement"
- Note tech vendors mentioned on their website or in job postings
- Check for recent funding, expansion, conference talks`;

export async function bgFindDMs(){
  const c=S.currentCompany;if(!c)return;
  const body=document.getElementById('ib-ct-body');if(!body)return;
  body.innerHTML=`<div class="ib-loading" style="text-align:left"><span class="bg-running">🔍 Researching</span> decision makers at ${esc(c.name)}…<br><span style="font-size:8px;color:var(--t4);animation:none">Using Opus + web search — this takes 15–30s</span></div>`;
  clog('ai',`🔍 Finding DMs at <b>${esc(c.name)}</b> (Opus + web search)`);
  const tags=getCoTags(c).join(', ');
  const slug=_slug(c.name);
  try{
    const data=await anthropicFetch({
      model:MODEL_RESEARCH,
      max_tokens:2000,
      system:FIND_DMS_SYSTEM,
      tools:[{type:'web_search_20250305',name:'web_search',max_uses:8}],
      messages:[{role:'user',content:`Find 3–5 REAL decision makers AND outreach signals at ${c.name} (${c.category||'ad tech'}, ${c.website||'no website'}) relevant for data partnership discussions with onAudience.\nFocus: Head/VP/Director of Programmatic, Data Partnerships, Product, Revenue, or Platform.\nCompany context: ${c.note||'none'}\nCompany description: ${(c.description||'').slice(0,200)}\nSignals: ${tags||'none'}\n\nUse web search to find REAL people and signals. Return empty arrays if you can't verify anything.`}]
    });
    const textBlocks=(data.content||[]).filter(b=>b.type==='text').map(b=>b.text).join('\n');
    let dms=[],signals=[];
    const objMatch=textBlocks.match(/\{[\s\S]*"contacts"[\s\S]*\}/);
    if(objMatch){try{const parsed=JSON.parse(objMatch[0].replace(/```json|```/g,'').trim());dms=Array.isArray(parsed.contacts)?parsed.contacts:[];signals=Array.isArray(parsed.signals)?parsed.signals:[];}catch(e2){}}
    if(!dms.length){const arrMatch=textBlocks.match(/\[[\s\S]*\]/);if(arrMatch){try{dms=JSON.parse(arrMatch[0].replace(/```json|```/g,'').trim());}catch(e3){}}}
    dms.forEach(dm=>{dm.source=dm.confidence==='verified'?'web_verified':'ai_probable';});
    S.mcAiContacts=dms;
    if(signals.length){
      const expiry={buying_signal:60,org_change:90,tech_change:180,event:30,competitive_intel:120,timing_signal:60};
      const rows=signals.map(s=>({company_id:slug,signal_type:s.signal_type||'timing_signal',title:(s.title||'').slice(0,200),detail:s.detail||'',source_url:s.source_url||'',source:'web_search',confidence:s.confidence||'probable',relevance:Math.min(5,Math.max(1,s.relevance||3))}));
      for(const r of rows){const days=expiry[r.signal_type]||60;fetch(`${SB_URL}/rest/v1/outreach_signals`,{method:'POST',headers:authHdr({'Prefer':'resolution=merge-duplicates,return=minimal'}),body:JSON.stringify({...r,expires_at:new Date(Date.now()+days*86400000).toISOString()})}).catch(()=>{});}
      clog('db',`Stored <b>${rows.length}</b> outreach signals for ${esc(c.name)}`);
    }
    clog('ai',`✓ Found <b>${dms.length}</b> contacts + <b>${signals.length}</b> signals at ${esc(c.name)} (${dms.filter(d=>d.confidence==='verified').length} verified)`);
    const contactsHtml=dms.length?`
      <div style="font-family:'IBM Plex Mono',monospace;font-size:7px;font-weight:600;text-transform:uppercase;letter-spacing:.07em;margin-bottom:8px;display:flex;align-items:center;gap:5px">
        <span style="color:var(--g)">✓ Web-verified</span><span style="color:var(--t4)">·</span>
        <span style="color:var(--t3);font-weight:400">Opus + search · ${dms.length} found</span>
      </div>
      <div class="ib-cts-grid">${dms.map(dm=>{
        const a2=getAv(dm.full_name||''),n2=ini(dm.full_name||'');
        const confBadge=dm.confidence==='verified'?'<span style="font-family:\'IBM Plex Mono\',monospace;font-size:6px;color:var(--cc);border:1px solid var(--cr);background:var(--cb);border-radius:2px;padding:0 3px;margin-left:3px">VERIFIED</span>':'<span style="font-family:\'IBM Plex Mono\',monospace;font-size:6px;color:var(--prc);border:1px solid var(--prr);background:var(--prb);border-radius:2px;padding:0 3px;margin-left:3px">PROBABLE</span>';
        const srcLink=dm.source_url?`<a href="${dm.source_url}" target="_blank" style="font-family:'IBM Plex Mono',monospace;font-size:7px;color:var(--g);text-decoration:none;display:block;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">source ↗</a>`:'';
        return`<div class="ib-ct"><div class="ib-ct-top"><div class="ib-ct-av" style="background:${a2.bg};color:${a2.fg};border:1px solid ${a2.fg}33">${n2}</div><div><div class="ib-ct-name">${esc(dm.full_name)}${confBadge}</div><div class="ib-ct-title">${esc(dm.title)}</div></div></div><div style="font-size:10px;color:var(--t3);margin:3px 0 4px;line-height:1.4">${esc(dm.reason||'')}</div>${srcLink}<div class="ib-ct-actions"><button class="ib-ct-btn" onclick="openComposer({company:'${c.name.replace(/'/g,'&apos;')}',contactName:'${(dm.full_name||'').replace(/'/g,'&apos;')}',contactTitle:'${(dm.title||'').replace(/'/g,'&apos;')}',angle:'${(c.outreach_angle||'').replace(/'/g,'&apos;').slice(0,100)}',description:'${(c.description||'').replace(/'/g,'&apos;').slice(0,100)}'})">✉ Email</button>${dm.linkedin_url?`<a class="ib-ct-btn" href="${dm.linkedin_url}" target="_blank">LI ↗</a>`:`<a class="ib-ct-btn" href="https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(dm.full_name+' '+c.name)}" target="_blank">LI Search ↗</a>`}<button class="ib-ct-btn" onclick="aiQuick('${esc(dm.full_name)} ${esc(c.name)}')">Research ↗</button></div></div>`;
      }).join('')}</div>`:'<div style="font-size:11px;color:var(--t3)">No contacts verified via web search</div>';
    const sigIcons={buying_signal:'🎯',org_change:'👤',tech_change:'⚙️',event:'🎤',competitive_intel:'🏁',timing_signal:'⏱️'};
    const sigLabels={buying_signal:'Buying Signal',org_change:'Org Change',tech_change:'Tech Change',event:'Event',competitive_intel:'Competitive',timing_signal:'Timing'};
    const signalsHtml=signals.length?`<div style="margin-top:12px;padding-top:10px;border-top:1px solid var(--rule2)"><div style="font-family:'IBM Plex Mono',monospace;font-size:7px;font-weight:600;text-transform:uppercase;letter-spacing:.07em;color:var(--poc);margin-bottom:6px">⚡ Outreach Signals · ${signals.length}</div>${signals.map(s=>{const icon=sigIcons[s.signal_type]||'📌';const label=sigLabels[s.signal_type]||s.signal_type;const relBar='█'.repeat(Math.min(5,s.relevance||3))+'░'.repeat(5-Math.min(5,s.relevance||3));return`<div style="display:flex;gap:6px;padding:4px 0;border-bottom:1px solid var(--rule3);font-family:'IBM Plex Mono',monospace;font-size:9px"><span style="flex-shrink:0">${icon}</span><div style="flex:1;min-width:0"><div style="display:flex;align-items:center;gap:4px;margin-bottom:2px"><span style="font-size:6px;text-transform:uppercase;letter-spacing:.05em;padding:1px 4px;border-radius:2px;background:var(--pob);color:var(--poc);border:1px solid var(--por)">${label}</span><span style="font-size:7px;color:var(--t4);letter-spacing:.05em">${relBar}</span>${s.confidence==='verified'?'<span style="font-size:6px;color:var(--cc);border:1px solid var(--cr);background:var(--cb);border-radius:2px;padding:0 3px">✓</span>':''}</div><div style="color:var(--t1);font-weight:500">${esc(s.title)}</div>${s.detail?`<div style="color:var(--t3);font-size:8px;margin-top:1px">${esc(s.detail)}</div>`:''}${s.source_url?`<a href="${s.source_url}" target="_blank" style="color:var(--g);font-size:7px;text-decoration:none">source ↗</a>`:''}</div></div>`;}).join('')}</div>`:'';
    body.innerHTML=contactsHtml+signalsHtml;
    if(!dms.length&&signals.length){body.innerHTML=`<div style="font-size:11px;color:var(--t3);margin-bottom:8px">No contacts verified — <a href="https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(c.name+' data partnerships')}" target="_blank" style="color:var(--g)">Manual LI search ↗</a></div>`+signalsHtml;}
  }catch(e){
    clog('ai',`✗ DM search failed for ${esc(c.name)}: ${esc(e.message)}`);
    body.innerHTML=`<div style="font-size:11px;color:var(--t3)"><span class="bg-err">Error</span> ${esc(e.message)}<div style="margin-top:6px;display:flex;gap:4px"><span style="cursor:pointer;color:var(--g);text-decoration:underline" onclick="bgFindDMs()">↺ retry with Opus</span><span style="color:var(--t4)">·</span><a href="https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(c.name+' data partnerships')}" target="_blank" style="color:var(--g)">Manual LI search ↗</a></div></div>`;
  }
}

/* ═══ Company Resolver — 4-tier fuzzy matching ══════════════
   Resolves a raw company name string to an existing companies.id.
   Tiers (in order, returns first hit):
     1. Exact slug match            "The Trade Desk" → "the-trade-desk" ✓
     2. Normalized token match      strip legal suffixes, punctuation
     3. Prefix match (≥5 chars)     "Amazon Ads" tokens ∋ "amazon" → amazon
     4. Contained-in match          "IPG Mediabrands" ⊃ "ipg" in existing slug
   Returns null if no match found (caller creates stub).
   ═══════════════════════════════════════════════════════════ */
function resolveCompany(rawName, coIndex){
  if(!rawName)return null;

  /* strip common suffixes for normalization */
  const norm = s => s
    .replace(/\s+(Ltd|Inc|LLC|S\.A\.|GmbH|Corp|B\.V\.|AG|PLC|SAS|Group|Media|Advertising|Digital|Technologies|Solutions|Platform|Networks?|Labs?)\.?$/gi,'')
    .toLowerCase().trim()
    .replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');

  const rawSlug  = _slug(rawName);
  const normSlug = norm(rawName);

  /* tier 1 — exact slug */
  if(coIndex[rawSlug])return coIndex[rawSlug].id||rawSlug;

  /* tier 2 — normalized slug */
  if(normSlug!==rawSlug&&coIndex[normSlug])return coIndex[normSlug].id||normSlug;

  /* build token set from raw name for tiers 3+4 */
  const tokens = normSlug.split('-').filter(t=>t.length>=4);

  /* tier 3 — any significant token is a prefix of an existing slug */
  for(const tok of tokens){
    for(const key of Object.keys(coIndex)){
      if(key.startsWith(tok)&&Math.abs(key.length-normSlug.length)<12){
        return coIndex[key].id||key;
      }
    }
  }

  /* tier 4 — existing slug is fully contained in raw tokens OR vice versa */
  for(const tok of tokens){
    if(coIndex[tok])return coIndex[tok].id||tok;
  }
  for(const key of Object.keys(coIndex)){
    const keyTokens=key.split('-').filter(t=>t.length>=4);
    if(keyTokens.length>=1&&keyTokens.every(kt=>normSlug.includes(kt))&&key.length>=5){
      return coIndex[key].id||key;
    }
  }

  return null; /* no match — caller creates stub */
}

/* ═══ Intelligence Extraction from News ═════════════════════
   Fires after articles load. Sends titles to Claude Haiku,
   extracts relations + products, writes to Supabase.
   Uses enrich_cache to avoid re-processing same article set.
   Uses 4-tier resolver to maximise matches to existing records.
   ═══════════════════════════════════════════════════════════ */
export async function extractIntelRelations(slug, companyName, articles){
  if(!articles||articles.length===0)return;

  /* cache check — skip if already extracted from this many articles */
  const cacheKey='intel_extraction';
  const cached=await window.cacheGet?.(slug,cacheKey);
  if(cached?.article_count>=articles.length){
    clog('info',`Extraction cache HIT — ${esc(companyName)} (${cached.article_count} arts)`);
    return;
  }

  clog('ai',`🔍 Extracting relations/products from ${articles.length} articles for <b>${esc(companyName)}</b>…`);

  const articleLines=articles.slice(0,20).map((a,i)=>{
    const title=a.title||'';const summary=a.summary||'';const source=a.source||'';const date=a.date||'';
    return`${i+1}. [${source} ${date}] ${title}${summary?' — '+summary.slice(0,120):''}`;
  }).join('\n');

  const EXTRACT_SYS=`You are a data extraction engine for an AdTech CRM. Extract structured intelligence from news article titles.

Return ONLY valid JSON with exactly two keys:
{
  "relations": [{"other_company":"exact name from article","relation_type":"acquired_by|data_partner|tech_integration|client_of|competes_with|marketplace_listed|dsp_integration|subsidiary_of","direction":"from_target|to_target|bidirectional","strength":"confirmed|probable","evidence":"short quote from title"}],
  "products": [{"name":"named product/platform","description":"1 sentence","features":[],"target_user":"advertiser|publisher|agency|both"}]
}

RULES: Only extract EXPLICIT mentions. partnerships/integrations→bidirectional. acquisitions→acquired_by with direction. Only NAMED products. Empty arrays if nothing qualifies. Raw JSON only.`;

  try{
    const data=await anthropicFetch({
      model:MODEL_CREATIVE,
      max_tokens:1000,
      system:EXTRACT_SYS,
      messages:[{role:'user',content:`Target company: "${companyName}"\n\nArticles:\n${articleLines}\n\nExtract relations and products. JSON only.`}]
    });
    const text=(data.content||[]).filter(b=>b.type==='text').map(b=>b.text).join('');
    let relations=[],products=[];
    const cleaned=text.replace(/```json|```/g,'').trim();
    const objMatch=cleaned.match(/\{[\s\S]*\}/);
    if(objMatch){
      try{const parsed=JSON.parse(objMatch[0]);relations=Array.isArray(parsed.relations)?parsed.relations:[];products=Array.isArray(parsed.products)?parsed.products:[];}
      catch(e){clog('ai',`⚠️ JSON parse error for ${esc(companyName)}: ${esc(e.message)}`);return;}
    }
    clog('ai',`✓ Extracted: <b>${relations.length}</b> relations, <b>${products.length}</b> products from ${esc(companyName)} news`);

    /* ── Upsert relations ── */
    if(relations.length){
      /* build coIndex from ALL companies in state — id + name slug → company */
      const coIndex={};
      S.companies.forEach(c=>{
        const s=_slug(c.name);
        coIndex[s]=c;
        if(c.id&&c.id!==s)coIndex[c.id]=c;
      });

      const existingKeys=new Set(S.allRelations.map(r=>`${r.from_company}|${r.to_company}|${r.relation_type}`));
      const validTypes=new Set(['acquired_by','data_partner','tech_integration','client_of','competes_with','marketplace_listed','dsp_integration','subsidiary_of']);
      let inserted=0,matched=0,stubbed=0;

      for(const rel of relations){
        const otherName=(rel.other_company||'').trim();
        if(!otherName||otherName.toLowerCase()===companyName.toLowerCase())continue;
        const relType=validTypes.has(rel.relation_type)?rel.relation_type:'data_partner';
        const strength=['confirmed','probable','inferred'].includes(rel.strength)?rel.strength:'probable';

        /* ── 4-tier resolve ── */
        let resolvedId=resolveCompany(otherName,coIndex);
        if(resolvedId){
          matched++;
          clog('info',`  ↳ Resolved "${esc(otherName)}" → <b>${esc(resolvedId)}</b>`);
        } else {
          /* create stub only if no match found */
          const stubId=_slug(otherName);
          await fetch(`${SB_URL}/rest/v1/companies`,{
            method:'POST',
            headers:authHdr({'Prefer':'resolution=merge-duplicates,return=minimal'}),
            body:JSON.stringify({id:stubId,name:otherName,type:'prospect',note:'auto-created by intel extraction'})
          }).catch(()=>{});
          resolvedId=stubId;
          stubbed++;
          clog('db',`➕ Stub: <b>${esc(otherName)}</b> (${stubId})`);
          S.companies.push({id:stubId,name:otherName,type:'prospect',note:'auto-created by intel extraction'});
          coIndex[stubId]={id:stubId,name:otherName,type:'prospect'};
        }

        let fromSlug,toSlug,direction;
        if(rel.direction==='bidirectional'){fromSlug=slug;toSlug=resolvedId;direction='bidirectional';}
        else if(rel.direction==='from_target'){fromSlug=slug;toSlug=resolvedId;direction='unidirectional';}
        else{fromSlug=resolvedId;toSlug=slug;direction='unidirectional';}

        const key=`${fromSlug}|${toSlug}|${relType}`;
        const keyRev=`${toSlug}|${fromSlug}|${relType}`;
        if(existingKeys.has(key)||existingKeys.has(keyRev))continue;

        const res=await fetch(`${SB_URL}/rest/v1/company_relations`,{
          method:'POST',
          headers:authHdr({'Prefer':'resolution=merge-duplicates,return=minimal'}),
          body:JSON.stringify({from_company:fromSlug,to_company:toSlug,relation_type:relType,direction,strength,source:'intelligence_extraction',notes:(rel.evidence||'').slice(0,300)||null})
        }).catch(()=>null);

        if(res?.ok||res?.status===201||res?.status===409){
          existingKeys.add(key);
          S.allRelations.push({from_company:fromSlug,to_company:toSlug,relation_type:relType,direction,strength,source:'intelligence_extraction'});
          inserted++;
        }
      }

      if(inserted>0||matched>0){
        clog('db',`⚡ Relations: <b>${inserted}</b> saved · ${matched} matched existing · ${stubbed} stubs created`);
        if(S.currentCompany&&_slug(S.currentCompany.name)===slug){
          const rb=document.getElementById('ib-rels-body');
          if(rb&&!rb.innerHTML.includes('ib-loading'))setTimeout(()=>loadRelationsBrief(slug,false),200);
        }
      }
    }

    /* ── Upsert products ── */
    if(products.length){
      const coRow=S.companies.find(c=>(c.id||_slug(c.name))===slug);
      const existingProds=coRow?.products?.products||[];
      const existingNames=new Set(existingProds.map(p=>(p.name||'').toLowerCase()));
      const newProds=products.filter(p=>p.name&&!existingNames.has(p.name.toLowerCase()));
      if(newProds.length){
        const merged=[...existingProds,...newProds];
        const payload={products:{products:merged,inferred:false,extracted_from:'intelligence',extracted_at:new Date().toISOString().slice(0,10),positioning:coRow?.products?.positioning||[],integrations_advertised:coRow?.products?.integrations_advertised||[],pricing_model:coRow?.products?.pricing_model||'contact_us'}};
        await fetch(`${SB_URL}/rest/v1/companies?id=eq.${slug}`,{method:'PATCH',headers:authHdr({'Prefer':'return=minimal'}),body:JSON.stringify(payload)}).catch(()=>{});
        if(coRow)coRow.products=payload.products;
        clog('db',`📦 Products: ${newProds.map(p=>esc(p.name)).join(', ')} → ${esc(companyName)}`);
      }
    }

    /* cache result — 14 day TTL */
    await window.cacheSet?.(slug,cacheKey,{article_count:articles.length,relations_found:relations.length,products_found:products.length,extracted_at:new Date().toISOString()},336);

  }catch(e){
    clog('ai',`✗ Intel extraction failed for ${esc(companyName)}: ${esc(e.message)}`);
    console.error('extractIntelRelations',e);
  }
}

/* ═══ Intelligence ═══════════════════════════════════════════ */
export function renderIntelBody(stored,live){const body=document.getElementById('ib-intel-body'),cnt=document.getElementById('ib-intel-cnt'),liveLabel=document.getElementById('ib-intel-live');if(!body)return;const storedItems=[];(Array.isArray(stored)?stored:[]).forEach(row=>{if(Array.isArray(row.content))storedItems.push(...row.content);else if(row.title||row.url)storedItems.push(row);});const total=storedItems.length+live.length;if(cnt)cnt.textContent=total||'';if(liveLabel)liveLabel.style.display=live.length?'flex':'none';if(!total){body.innerHTML=`<div style="display:flex;align-items:center;gap:8px"><span style="font-size:11px;color:var(--t3)">No intelligence yet</span><button class="ib-ct-btn" style="height:22px;padding:0 8px;font-size:7px;margin-left:auto" onclick="bgRefreshIntel()">↺ Fetch news</button></div>`;return;}const itemHtml=(items,dotColor)=>items.map(r=>{const url=r.url||r.link||'';const title=r.title||r.summary||'—';const src=r.source||r.type||'';const date=r.date||(r.created_at?new Date(r.created_at).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'2-digit'}):'');return`<div class="ib-news-item"><div class="ib-news-dot" style="background:${dotColor}"></div><div class="ib-news-body">${url?`<a class="ib-news-title" href="${url}" target="_blank">${title} ↗</a>`:`<div class="ib-news-title" style="cursor:default">${title}</div>`}<div class="ib-news-meta"><span class="ib-news-src">${src}</span><span class="ib-news-date">${date}</span></div></div></div>`;}).join('');let html='';if(live.length){html+=`<div style="display:flex;align-items:center;gap:5px;margin-bottom:6px"><span class="live-label"><span class="live-dot"></span>Live — Google News</span><span style="font-family:'IBM Plex Mono',monospace;font-size:7px;color:var(--t4)">${live.length} results</span></div>${itemHtml(live,'#E53935')}`;}if(storedItems.length){if(live.length)html+=`<div style="height:10px;border-top:1px solid var(--rule2);margin:8px 0"></div>`;html+=`<div style="font-family:'IBM Plex Mono',monospace;font-size:7px;font-weight:600;text-transform:uppercase;letter-spacing:.07em;color:var(--t3);margin-bottom:6px">📁 Stored</div>${itemHtml(storedItems,'var(--g)')}`;}body.innerHTML=html;}

export async function bgRefreshIntel(){
  const c=S.currentCompany;if(!c)return;
  const body=document.getElementById('ib-intel-body'),btn=document.getElementById('ib-intel-refresh');
  if(body)body.innerHTML=`<div class="ib-loading" style="text-align:left">Fetching news…</div>`;
  if(btn)btn.textContent='↻ Loading…';
  const slug=_slug(c.name);
  const[storedRes,liveRes]=await Promise.allSettled([
    fetch(`${SB_URL}/rest/v1/intelligence?company_id=eq.${slug}&type=eq.press_links`,{headers:authHdr()}).then(r=>r.json()),
    fetchGoogleNews(c.name)
  ]);
  const stored=storedRes.status==='fulfilled'&&Array.isArray(storedRes.value)?storedRes.value:[];
  const live=liveRes.status==='fulfilled'?liveRes.value:[];
  renderIntelBody(stored,live);
  if(live.length){
    saveIntelligence(slug,live);
    /* extract relations + products from combined article set in background */
    const storedItems=[];stored.forEach(row=>{if(Array.isArray(row.content))storedItems.push(...row.content);});
    const allArticles=[...storedItems,...live];
    if(allArticles.length>=2)setTimeout(()=>extractIntelRelations(slug,c.name,allArticles),500);
  }
  if(btn)btn.textContent='↺ Refresh';
}

/* ═══ Email History — Gmail AI Scanner ══════════════════════ */

function _getEmailSectionHTML(slug,companyName){
  return window.gmailSectionHTML?.(slug,companyName)||'';
}

function _refreshEmailSection(slug){
  const c=S.currentCompany;if(!c)return;
  const body=document.getElementById('ib-email-body');if(!body)return;
  // Preserve existing scan results so toggling the section doesn't wipe them
  const existingResults = document.getElementById('ib-email-results')?.innerHTML||'';
  const existingStrip   = document.getElementById('ib-email-contacts-strip')?.innerHTML||'';
  const stripDisplay    = document.getElementById('ib-email-contacts-strip')?.style.display||'none';
  body.innerHTML=_getEmailSectionHTML(slug||_slug(c.name),c.name);
  // Restore preserved results
  const newResults = document.getElementById('ib-email-results');
  const newStrip   = document.getElementById('ib-email-contacts-strip');
  if(newResults && existingResults) newResults.innerHTML=existingResults;
  if(newStrip && existingStrip){ newStrip.innerHTML=existingStrip; newStrip.style.display=stripDisplay; }
  if(newStrip && existingStrip) window._gmailFoundContacts=window._gmailFoundContacts||[];
}

export function oaGmailConnect(){ window.gmailConnectAndScan?.(window._currentEmailSlug, window.currentCompany?.name||''); }

export function oaGmailDisconnect(){ window.gmailDisconnectUI?.(); }

export function oaEmailScan(slug, companyName){ window.gmailScanCompany?.(slug, companyName); }

export async function oaEmailSaveContacts(){
  const contacts=S.emailScanContacts;if(!contacts?.length)return;
  const btn=document.querySelector('#ib-email-contacts-strip .btn');
  if(btn){btn.disabled=true;btn.textContent='Saving…';}
  let saved=0;
  for(const ct of contacts){try{await saveContact(ct);saved++;}catch(e){console.warn('save contact failed',e);}}
  const strip=document.getElementById('ib-email-contacts-strip');
  if(strip)strip.innerHTML=`<div style="font:400 9px 'IBM Plex Mono',monospace;color:var(--g)">✓ Saved ${saved} contact${saved===1?'':'s'} to CRM</div>`;
  S.emailScanContacts=[];
}

async function _saveEmailIntelligence(slug,summary){
  if(!slug||!summary)return;
  try{
    await fetch(`${SB_URL}/rest/v1/intelligence`,{
      method:'POST',
      headers:authHdr({'Prefer':'resolution=merge-duplicates,return=minimal','Content-Type':'application/json'}),
      body:JSON.stringify({company_id:slug,type:'gmail_history',content:summary,updated_at:new Date().toISOString()}),
    });
  }catch(e){console.warn('save email intel failed',e);}
}

export async function loadIntelligence(slug,name){
  const body=document.getElementById('ib-intel-body');if(!body)return;
  const[storedRes,liveRes]=await Promise.allSettled([
    fetch(`${SB_URL}/rest/v1/intelligence?company_id=eq.${slug}&type=eq.press_links`,{headers:authHdr()}).then(r=>r.json()),
    fetchGoogleNews(name)
  ]);
  const stored=storedRes.status==='fulfilled'&&Array.isArray(storedRes.value)?storedRes.value:[];
  const live=liveRes.status==='fulfilled'?liveRes.value:[];
  renderIntelBody(stored,live);
  if(live.length)saveIntelligence(slug,live);
  /* extract on first open if stored articles exist + not yet cached */
  const storedItems=[];stored.forEach(row=>{if(Array.isArray(row.content))storedItems.push(...row.content);});
  const allArticles=[...storedItems,...live];
  if(allArticles.length>=3)setTimeout(()=>extractIntelRelations(slug,name,allArticles),800);
}

/* ═══ Relations ══════════════════════════════════════════════ */
let _relCache=[];let _relView='list';let _relDepth=1;

/* Graph filter state — which node/edge categories to show */
let _relFilters={
  data_partner:     true,   /* data + tech partnerships — SIGNIFICANT */
  tech_integration: true,
  marketplace_listed:true,
  dsp_integration:  true,
  activation_path:  true,   /* computed via-platform paths to OA */
  client_of:        true,
  acquired_by:      true,
  subsidiary_of:    false,  /* off by default — very noisy */
  competes_with:    false,  /* off by default */
  hop2:             false,  /* 2-hop nodes off by default */
};

window.setRelView=function(v){
  _relView=v;
  const listEl=document.getElementById('ib-rels-list');
  const graphEl=document.getElementById('ib-rels-graph');
  const btnL=document.getElementById('ib-rel-btn-list');
  const btnG=document.getElementById('ib-rel-btn-graph');
  if(!listEl||!graphEl)return;
  listEl.style.display=v==='list'?'':'none';
  graphEl.style.display=v==='graph'?'':'none';
  if(btnL)btnL.className='ib-ct-btn'+(v==='list'?' active':'');
  if(btnG)btnG.className='ib-ct-btn'+(v==='graph'?' active':'');
  if(v==='graph'){
    const ctrl=document.getElementById('ib-rels-controls');
    if(ctrl)ctrl.style.display='flex';
    _renderGraphControls();
    renderRelGraph();
  } else {
    const ctrl=document.getElementById('ib-rels-controls');
    if(ctrl)ctrl.style.display='none';
  }
};

window.setRelDepth=function(d){
  _relDepth=d;
  const btn1=document.getElementById('ib-rel-d1');
  const btn2=document.getElementById('ib-rel-d2');
  if(btn1)btn1.className='ib-ct-btn'+(d===1?' active':'');
  if(btn2)btn2.className='ib-ct-btn'+(d===2?' active':'');
  /* sync hop2 filter with depth button */
  _relFilters.hop2=d===2;
  _renderGraphControls();
  renderRelGraph();
};

window.toggleRelFilter=function(key){
  _relFilters[key]=!_relFilters[key];
  /* keep depth button in sync if hop2 toggled */
  if(key==='hop2'){
    _relDepth=_relFilters.hop2?2:1;
    const btn1=document.getElementById('ib-rel-d1');
    const btn2=document.getElementById('ib-rel-d2');
    if(btn1)btn1.className='ib-ct-btn'+(_relDepth===1?' active':'');
    if(btn2)btn2.className='ib-ct-btn'+(_relDepth===2?' active':'');
  }
  _renderGraphControls();
  renderRelGraph();
};

/* Render the filter pill row inside #ib-rels-controls */
function _renderGraphControls(){
  const el=document.getElementById('ib-rels-controls');if(!el)return;
  /* filter groups */
  const groups=[
    {label:'Partnerships',keys:['data_partner','tech_integration','marketplace_listed','dsp_integration'],
     labels:['Data','Tech','Marketplace','DSP']},
    {label:'Relationships',keys:['client_of','acquired_by','subsidiary_of','competes_with'],
     labels:['Client','M&A','Subsidiary','Compete']},
    {label:'Graph',keys:['activation_path','hop2'],
     labels:['Activate paths','2-hop nodes']},
  ];
  el.innerHTML=groups.map(g=>`
    <div style="display:flex;align-items:center;gap:3px;flex-wrap:wrap">
      <span style="font-family:'IBM Plex Mono',monospace;font-size:6px;text-transform:uppercase;letter-spacing:.06em;color:var(--t4);margin-right:2px">${g.label}</span>
      ${g.keys.map((k,i)=>{
        const on=_relFilters[k];
        /* colour coding: partnerships = green tint, relationships = neutral, graph = purple tint */
        const grp=g.label==='Partnerships'?'var(--gb)':'var(--surf3)';
        const grpOn=g.label==='Partnerships'?'var(--gb)':g.label==='Graph'?'var(--pob)':'var(--surf3)';
        const txtOn=g.label==='Partnerships'?'var(--g)':g.label==='Graph'?'var(--poc)':'var(--t1)';
        const bdrOn=g.label==='Partnerships'?'var(--gr)':g.label==='Graph'?'var(--por)':'var(--rule2)';
        return`<span onclick="toggleRelFilter('${k}')" style="cursor:pointer;font-family:'IBM Plex Mono',monospace;font-size:7px;padding:2px 6px;border-radius:2px;border:1px solid ${on?bdrOn:'var(--rule)'};background:${on?grpOn:'var(--surf2)'};color:${on?txtOn:'var(--t4)'};user-select:none;transition:all .1s">${g.labels[i]}</span>`;
      }).join('')}
    </div>`).join('');
}

export async function loadRelationsBrief(slug,forceRefresh){
  const body=document.getElementById('ib-rels-body'),cnt=document.getElementById('ib-rels-cnt');if(!body)return;
  try{
    if(forceRefresh||!S.allRelations.length){body.innerHTML='<div class="ib-loading">Refreshing relations…</div>';await refreshRelationsCache();}
    const rels=S.allRelations.filter(r=>r.from_company===slug||r.to_company===slug);
    _relCache=rels;
    if(!_relCache.length){body.innerHTML=`<div style="font-size:11px;color:var(--t3)">No relations recorded</div>`;if(cnt)cnt.textContent='';return;}
    if(cnt)cnt.textContent=_relCache.length;
    clog('info',`Relations for <b>${slug}</b>: ${_relCache.length} (from cache of ${S.allRelations.length})`);
    const coMap={};S.companies.forEach(x=>{if(x.name)coMap[_slug(x.name)]=x;});
    const TL={data_partner:'Data Partner',dsp_integration:'DSP Integration',marketplace_listed:'Marketplace',tech_integration:'Tech Integration',client_of:'Client Of',acquired_by:'Acquired By',subsidiary_of:'Subsidiary Of',competes_with:'Competes With',co_sell:'Co-Sell',reseller:'Reseller'};
    const listHtml=_relCache.map(r=>{const isSrc=r.from_company===slug;const oid=isSrc?r.to_company:r.from_company;const co=coMap[oid];const arrow=r.direction==='bidirectional'?'⇄':(isSrc?'→':'←');const nameDisp=co?.name||oid;const type=TL[r.relation_type]||r.relation_type;return`<div class="ib-rel-item"><div class="ib-rel-arrow">${arrow}</div>${co?`<div class="ib-rel-name" data-slug="${oid}" onclick="openBySlug(this.dataset.slug)">${nameDisp}</div>`:`<div class="ib-rel-name no-link">${nameDisp}</div>`}<div class="ib-rel-type">${type}</div><span class="tag ${r.strength==='confirmed'?'tc':'tpr'}" style="flex-shrink:0">${r.strength||'—'}</span></div>${r.notes?`<div class="ib-rel-notes">${r.notes}</div>`:''}`;}).join('');
    body.innerHTML=`<div style="display:flex;gap:3px;margin-bottom:6px;flex-wrap:wrap;align-items:center">
      <button id="ib-rel-btn-list" class="ib-ct-btn active" onclick="setRelView('list')" style="height:20px;padding:0 8px;font-size:7px">☰ List</button>
      <button id="ib-rel-btn-graph" class="ib-ct-btn" onclick="setRelView('graph')" style="height:20px;padding:0 8px;font-size:7px">◎ Graph</button>
      <span style="display:inline-block;width:1px;height:16px;background:var(--rule);margin:0 2px"></span>
      <button id="ib-rel-d1" class="ib-ct-btn active" onclick="setRelDepth(1)" style="height:20px;padding:0 8px;font-size:7px">1-hop</button>
      <button id="ib-rel-d2" class="ib-ct-btn" onclick="setRelDepth(2)" style="height:20px;padding:0 8px;font-size:7px">2-hop</button>
    </div>
    <div id="ib-rels-controls" style="display:none;flex-direction:column;gap:5px;padding:6px 0 8px;border-bottom:1px solid var(--rule2);margin-bottom:6px"></div>
    <div id="ib-rels-list">${listHtml}</div>
    <div id="ib-rels-graph" style="display:none"></div>`;
    _relView='list';_relDepth=1;
  }catch(e){clog('info',`Relations error: ${e.message}`);body.innerHTML=`<div style="font-size:11px;color:var(--t3)">Error loading relations — <span style="cursor:pointer;color:var(--g)" onclick="loadRelationsBrief('${slug}',true)">retry</span></div>`;}
}

/* ═══ Force-directed Relation Graph — 1-hop + 2-hop + onAudience path ══ */
function renderRelGraph(){
  const container=document.getElementById('ib-rels-graph');if(!container)return;
  const centerSlug=_slug(S.currentCompany?.name||'');
  const OA='onaudience';
  const coMap={};S.companies.forEach(x=>{if(x.name){coMap[_slug(x.name)]=x;if(x.id)coMap[x.id]=x;}});

  /* ── build node + edge sets ── */
  const nodeSet=new Map(); /* id → {id,name,type,isCenter,isOA,hop} */
  const edgeSet=[];        /* {source,target,type,strength,direction,hop,onPath} */

  const addNode=(id,hop)=>{
    if(nodeSet.has(id)){
      /* upgrade hop if seen at lower hop */
      if(nodeSet.get(id).hop>hop)nodeSet.get(id).hop=hop;
      return;
    }
    const co=coMap[id];
    nodeSet.set(id,{id,name:co?.name||id,type:co?.type||'unknown',isCenter:id===centerSlug,isOA:id===OA,hop,inDB:!!co});
  };

  addNode(centerSlug,0);

  /* hop-1 edges from _relCache */
  _relCache.forEach(r=>{
    addNode(r.from_company,1);
    addNode(r.to_company,1);
    edgeSet.push({source:r.from_company,target:r.to_company,type:r.relation_type,strength:r.strength,direction:r.direction,hop:1,onPath:false});
  });

  /* ── Inject onAudience + all logical sell paths ─────────────
     Two mechanisms:

     A) DIRECT: OA has an explicit relation to a node already in graph
        → add OA node + that edge (hop:'oa')

     B) ACTIVATION PATH: center (or its hop-1 neighbor) uses a platform
        that OA is listed on (TTD, DV360, Amazon DSP, Adform, LiveRamp…)
        → add OA node + a computed "activation_path" edge through that platform
        This represents "you can buy onAudience data when you use TTD"

     Result: onAudience always appears when there is ANY logical sell path,
     not just when an explicit relation record exists.
  ── */
  if(centerSlug!==OA){
    /* Platforms onAudience is activated through — built from S.allRelations */
    const oaPlatforms=new Set(
      S.allRelations
        .filter(r=>r.from_company===OA&&
          ['marketplace_listed','dsp_integration','data_partner'].includes(r.relation_type))
        .map(r=>r.to_company)
    );

    const knownIds=new Set(nodeSet.keys());

    /* A) Direct OA edges to known nodes */
    const oaDirectEdges=S.allRelations.filter(r=>
      (r.from_company===OA&&knownIds.has(r.to_company))||
      (r.to_company===OA&&knownIds.has(r.from_company))
    );

    /* B) Activation paths: known node uses a platform OA is on */
    /* e.g. center uses TTD → OA is on TTD → draw center→TTD→OA path */
    const activationEdges=[];
    const alreadyLinkedToOA=new Set([
      ...oaDirectEdges.map(r=>r.from_company===OA?r.to_company:r.from_company)
    ]);
    S.allRelations.forEach(r=>{
      /* a known node (not OA itself) uses an OA platform */
      const knownNode=knownIds.has(r.from_company)&&r.from_company!==OA?r.from_company
                     :knownIds.has(r.to_company)&&r.to_company!==OA?r.to_company:null;
      const platform=r.from_company===knownNode?r.to_company:r.from_company;
      if(!knownNode)return;
      if(!oaPlatforms.has(platform))return;
      if(alreadyLinkedToOA.has(knownNode))return; /* already has direct OA link */
      if(platform===centerSlug)return;
      /* find the platform node name for label */
      activationEdges.push({via:platform,from:knownNode});
      alreadyLinkedToOA.add(knownNode); /* one activation path per node is enough */
    });

    if(oaDirectEdges.length||activationEdges.length){
      addNode(OA,1);

      /* add direct edges */
      oaDirectEdges.forEach(r=>{
        edgeSet.push({source:r.from_company,target:r.to_company,type:r.relation_type,
          strength:r.strength,direction:r.direction,hop:'oa',onPath:false});
      });

      /* add activation path edges — drawn as dashed green from known node to OA
         with the platform name as edge label */
      activationEdges.forEach(({via,from})=>{
        /* make sure the platform node is in the graph */
        if(!nodeSet.has(via))addNode(via,1);
        edgeSet.push({source:from,target:OA,type:'activation_path',
          strength:'probable',direction:'unidirectional',
          hop:'oa',onPath:false,viaLabel:via});
      });

      clog('info',`Graph: OA injected — ${oaDirectEdges.length} direct + ${activationEdges.length} activation paths`);
    }
  }

  /* hop-2: if depth=2, find neighbors-of-neighbors from S.allRelations */
  if(_relDepth===2){
    const hop1Ids=new Set([...nodeSet.keys()]);
    S.allRelations.forEach(r=>{
      /* exclude center and OA from generating hop-2 children — both have too many edges */
      const fIn=hop1Ids.has(r.from_company)&&r.from_company!==centerSlug&&r.from_company!==OA;
      const tIn=hop1Ids.has(r.to_company)&&r.to_company!==centerSlug&&r.to_company!==OA;
      if(fIn&&!hop1Ids.has(r.to_company)){
        addNode(r.to_company,2);
        edgeSet.push({source:r.from_company,target:r.to_company,type:r.relation_type,strength:r.strength,direction:r.direction,hop:2,onPath:false});
      }else if(tIn&&!hop1Ids.has(r.from_company)){
        addNode(r.from_company,2);
        edgeSet.push({source:r.from_company,target:r.to_company,type:r.relation_type,strength:r.strength,direction:r.direction,hop:2,onPath:false});
      }
    });
    /* cap at 60 total nodes to keep graph readable */
    if(nodeSet.size>60){
      /* keep: center, all hop-1, OA if present, then top hop-2 by path count */
      const hop2Nodes=[...nodeSet.values()].filter(n=>n.hop===2);
      const keep=new Set([centerSlug,...[...nodeSet.values()].filter(n=>n.hop===1).map(n=>n.id),OA]);
      /* count how many edges reference each hop-2 node */
      const hop2Degree={};
      edgeSet.filter(e=>e.hop===2).forEach(e=>{
        const h2=nodeSet.get(e.source)?.hop===2?e.source:e.target;
        hop2Degree[h2]=(hop2Degree[h2]||0)+1;
      });
      hop2Nodes.sort((a,b)=>(hop2Degree[b.id]||0)-(hop2Degree[a.id]||0))
               .slice(0,60-keep.size).forEach(n=>keep.add(n.id));
      /* prune */
      [...nodeSet.keys()].forEach(id=>{if(!keep.has(id))nodeSet.delete(id);});
    }
    /* remove edges to pruned nodes */
    for(let i=edgeSet.length-1;i>=0;i--){
      if(!nodeSet.has(edgeSet[i].source)||!nodeSet.has(edgeSet[i].target))edgeSet.splice(i,1);
    }
  }

  /* ── Apply _relFilters: remove edges/nodes for hidden categories ── */
  {
    /* remove edges whose type is filtered off */
    const ALWAYS_KEEP_TYPES=new Set(['activation_path']); /* handled via activation_path filter */
    for(let i=edgeSet.length-1;i>=0;i--){
      const e=edgeSet[i];
      const key=e.type==='activation_path'?'activation_path':e.type;
      if(key in _relFilters&&!_relFilters[key]){
        edgeSet.splice(i,1);continue;
      }
      /* filter hop-2 edges if hop2 is off */
      if(e.hop===2&&!_relFilters.hop2){edgeSet.splice(i,1);continue;}
    }
    /* remove nodes that have no remaining edges AND are not center/OA */
    const connectedIds=new Set([centerSlug,OA]);
    edgeSet.forEach(e=>{connectedIds.add(e.source);connectedIds.add(e.target);});
    [...nodeSet.keys()].forEach(id=>{
      if(!connectedIds.has(id))nodeSet.delete(id);
    });
    /* tag nodes by their MOST SIGNIFICANT edge type for sizing */
    const sigTypes=new Set(['data_partner','tech_integration','marketplace_listed','dsp_integration','activation_path','client_of']);
    nodeSet.forEach(n=>{
      if(n.isCenter||n.isOA)return;
      const myEdges=edgeSet.filter(e=>e.source===n.id||e.target===n.id);
      n.significant=myEdges.some(e=>sigTypes.has(e.type));
    });
  }

  /* ── Find shortest path from centerSlug to OA ── */
  /* BFS over edgeSet */
  if(nodeSet.has(OA)&&centerSlug!==OA){
    const adj=new Map();
    nodeSet.forEach((_,id)=>adj.set(id,[]));
    edgeSet.forEach(e=>{
      if(adj.has(e.source)&&adj.has(e.target)){
        adj.get(e.source).push(e.target);
        adj.get(e.target).push(e.source);
      }
    });
    const prev=new Map(),visited=new Set([centerSlug]),queue=[centerSlug];
    outer:while(queue.length){
      const cur=queue.shift();
      for(const nb of (adj.get(cur)||[])){
        if(!visited.has(nb)){visited.add(nb);prev.set(nb,cur);if(nb===OA)break outer;queue.push(nb);}
      }
    }
    if(prev.has(OA)){
      /* reconstruct path */
      const pathNodes=new Set();let cur=OA;
      while(cur){pathNodes.add(cur);cur=prev.get(cur);}
      /* mark edges on path */
      edgeSet.forEach(e=>{
        if(pathNodes.has(e.source)&&pathNodes.has(e.target))e.onPath=true;
      });
      /* mark nodes */
      pathNodes.forEach(id=>{if(nodeSet.has(id))nodeSet.get(id).onPath=true;});
    }
  }

  const nodes=[...nodeSet.values()];
  const edges=edgeSet;
  if(!nodes.length){container.innerHTML='<div style="font-size:11px;color:var(--t3);padding:8px">No graph data</div>';return;}

  /* ── Layout ── */
  const W=640,H=Math.max(360,Math.min(600,nodes.length*22));
  container.innerHTML=`<svg id="rel-svg" viewBox="0 0 ${W} ${H}" width="100%"
    style="max-height:520px;border:1px solid var(--rule);border-radius:2px;background:var(--surf2);cursor:grab;display:block">
    <defs>
      <marker id="arr-n" viewBox="0 0 10 10" refX="22" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
        <path d="M2 1L8 5L2 9" fill="none" stroke="var(--t3)" stroke-width="1.5" stroke-linecap="round"/>
      </marker>
      <marker id="arr-g" viewBox="0 0 10 10" refX="22" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
        <path d="M2 1L8 5L2 9" fill="none" stroke="var(--g)" stroke-width="1.5" stroke-linecap="round"/>
      </marker>
    </defs>
  </svg>`;
  const svg=document.getElementById('rel-svg');if(!svg)return;

  const typeColors={data_partner:'var(--g)',dsp_integration:'var(--pc)',marketplace_listed:'var(--prc)',tech_integration:'var(--poc)',client_of:'var(--cc)',acquired_by:'var(--nc)',subsidiary_of:'var(--nc)',competes_with:'#F87171',co_sell:'var(--g)',reseller:'var(--prc)'};
  const cx=W/2,cy=H/2;

  /* radial init — hop-0 center, hop-1 inner ring, hop-2 outer ring */
  const hop1Nodes=nodes.filter(n=>n.hop===1);
  const hop2Nodes=nodes.filter(n=>n.hop===2);
  const r1=Math.min(W,H)*0.28,r2=Math.min(W,H)*0.46;
  nodes.forEach((n,i)=>{
    if(n.isCenter){n.x=cx;n.y=cy;n.fx=cx;n.fy=cy;}
    else if(n.hop===1){
      const idx=hop1Nodes.indexOf(n);
      const a=(2*Math.PI*idx)/Math.max(hop1Nodes.length,1);
      n.x=cx+r1*Math.cos(a)+(Math.random()-.5)*10;
      n.y=cy+r1*Math.sin(a)+(Math.random()-.5)*10;
    } else {
      const idx=hop2Nodes.indexOf(n);
      const a=(2*Math.PI*idx)/Math.max(hop2Nodes.length,1);
      n.x=cx+r2*Math.cos(a)+(Math.random()-.5)*14;
      n.y=cy+r2*Math.sin(a)+(Math.random()-.5)*14;
    }
    n.vx=0;n.vy=0;
  });

  /* force sim — stronger repulsion between hop-2 nodes */
  const nodeById=new Map(nodes.map(n=>[n.id,n]));
  const repulsion=(a,b)=>a.hop===2&&b.hop===2?1200:700;
  const ideal=(e)=>e.hop===2?160:110;
  function tick(){
    for(let i=0;i<nodes.length;i++){
      for(let j=i+1;j<nodes.length;j++){
        const a=nodes[i],b=nodes[j];
        const dx=b.x-a.x,dy=b.y-a.y,dist=Math.sqrt(dx*dx+dy*dy)||1;
        const force=repulsion(a,b)/(dist*dist);
        const fx=dx/dist*force,fy=dy/dist*force;
        if(!a.fx){a.vx-=fx;a.vy-=fy;}
        if(!b.fx){b.vx+=fx;b.vy+=fy;}
      }
    }
    edges.forEach(e=>{
      const s=nodeById.get(e.source),t=nodeById.get(e.target);if(!s||!t)return;
      const dx=t.x-s.x,dy=t.y-s.y,dist=Math.sqrt(dx*dx+dy*dy)||1;
      const force=(dist-ideal(e))*0.018;
      const fx=dx/dist*force,fy=dy/dist*force;
      if(!s.fx){s.vx+=fx;s.vy+=fy;}
      if(!t.fx){t.vx-=fx;t.vy-=fy;}
    });
    nodes.forEach(n=>{
      if(n.fx)return;
      n.vx+=(cx-n.x)*0.002;n.vy+=(cy-n.y)*0.002;
      n.vx*=0.82;n.vy*=0.82;
      n.x+=n.vx;n.y+=n.vy;
      const pad=n.hop===2?30:40;
      n.x=Math.max(pad,Math.min(W-pad,n.x));
      n.y=Math.max(20,Math.min(H-20,n.y));
    });
  }
  for(let i=0;i<180;i++)tick();

  /* ── render: back-to-front: hop-2 edges → hop-1 edges → path edges → nodes ── */
  const TL={data_partner:'partner',dsp_integration:'DSP',marketplace_listed:'mkt',tech_integration:'tech',client_of:'client',acquired_by:'acq',subsidiary_of:'sub',competes_with:'vs',co_sell:'co-sell',reseller:'resell'};

  /* layer groups for z-ordering */
  const gEdgesBack=document.createElementNS('http://www.w3.org/2000/svg','g');
  const gEdgesPath=document.createElementNS('http://www.w3.org/2000/svg','g');
  const gNodes=document.createElementNS('http://www.w3.org/2000/svg','g');
  svg.appendChild(gEdgesBack);svg.appendChild(gEdgesPath);svg.appendChild(gNodes);

  edges.forEach(e=>{
    const s=nodeById.get(e.source),t=nodeById.get(e.target);if(!s||!t)return;
    const isPath=e.onPath;
    const layer=isPath?gEdgesPath:gEdgesBack;
    const line=document.createElementNS('http://www.w3.org/2000/svg','line');
    line.setAttribute('x1',s.x);line.setAttribute('y1',s.y);
    line.setAttribute('x2',t.x);line.setAttribute('y2',t.y);
    if(isPath){
      line.setAttribute('stroke','var(--g)');
      line.setAttribute('stroke-width','2');
    } else if(e.hop==='oa'&&e.type==='activation_path'){
      /* activation path edge — can sell via shared platform — dotted green */
      line.setAttribute('stroke','var(--g)');
      line.setAttribute('stroke-width','1');
      line.setAttribute('opacity','0.4');
      line.setAttribute('stroke-dasharray','2 5');
    } else if(e.hop==='oa'){
      /* direct OA relation edge — green tint */
      line.setAttribute('stroke','var(--g)');
      line.setAttribute('stroke-width','1');
      line.setAttribute('opacity','0.55');
      line.setAttribute('stroke-dasharray','5 3');
    } else {
      line.setAttribute('stroke',e.hop===2?'var(--rule2)':typeColors[e.type]||'var(--rule)');
      line.setAttribute('stroke-width',e.hop===2?'0.8':e.strength==='confirmed'?'1.5':'1');
      if(e.hop===2||e.strength!=='confirmed')line.setAttribute('stroke-dasharray',e.hop===2?'3 4':'4 3');
      line.setAttribute('opacity',e.hop===2?'0.5':'1');
    }
    if(e.direction!=='bidirectional')line.setAttribute('marker-end',isPath?'url(#arr-g)':'url(#arr-n)');
    layer.appendChild(line);
    /* edge label — only for hop-1, oa and path edges */
    if(e.hop===1||e.hop==='oa'||isPath){
      if(e.type==='activation_path'&&e.viaLabel){
        const co2=coMap[e.viaLabel];const viaName=(co2?.name||e.viaLabel);
        const shortVia=viaName.length>10?viaName.slice(0,9)+'…':viaName;
        const lbl2=document.createElementNS('http://www.w3.org/2000/svg','text');
        lbl2.setAttribute('x',(s.x+t.x)/2);lbl2.setAttribute('y',(s.y+t.y)/2-4);
        lbl2.setAttribute('text-anchor','middle');lbl2.setAttribute('font-family','IBM Plex Mono,monospace');
        lbl2.setAttribute('font-size','6');lbl2.setAttribute('fill','var(--g)');lbl2.setAttribute('opacity','0.7');
        lbl2.textContent='via '+shortVia;layer.appendChild(lbl2);
      } else if(e.hop===1||isPath){
      const lbl=document.createElementNS('http://www.w3.org/2000/svg','text');
      lbl.setAttribute('x',(s.x+t.x)/2);lbl.setAttribute('y',(s.y+t.y)/2-4);
      lbl.setAttribute('text-anchor','middle');lbl.setAttribute('font-family','IBM Plex Mono,monospace');
      lbl.setAttribute('font-size','6');
      lbl.setAttribute('fill',isPath?'var(--g)':'var(--t4)');
      lbl.textContent=TL[e.type]||e.type;
      layer.appendChild(lbl);
      } /* end else-if hop-1/path */
    }
  });

  /* ── render nodes ── */
  nodes.forEach(n=>{
    const g=document.createElementNS('http://www.w3.org/2000/svg','g');
    g.style.cursor=n.inDB?'pointer':'default';
    if(n.inDB)g.addEventListener('click',()=>openBySlug(n.id));

    const r=n.isCenter?20:n.isOA?17:n.hop===2?9:n.significant!==false?14:11;
    const circle=document.createElementNS('http://www.w3.org/2000/svg','circle');
    circle.setAttribute('cx',n.x);circle.setAttribute('cy',n.y);circle.setAttribute('r',r);

    if(n.isCenter){
      circle.setAttribute('fill','var(--g)');circle.setAttribute('stroke','var(--gd)');circle.setAttribute('stroke-width','1.5');
    } else if(n.isOA){
      circle.setAttribute('fill','var(--g)');circle.setAttribute('stroke','var(--gd)');circle.setAttribute('stroke-width','2');
    } else if(n.onPath){
      const tc={client:'var(--cb)',partner:'var(--pb)',prospect:'var(--gb)',nogo:'var(--nb)',poc:'var(--pob)'};
      const ts={client:'var(--cr)',partner:'var(--pr)',prospect:'var(--gr)',nogo:'var(--nr)',poc:'var(--por)'};
      circle.setAttribute('fill',tc[n.type]||'var(--gb)');
      circle.setAttribute('stroke',ts[n.type]||'var(--gr)');circle.setAttribute('stroke-width','2');
    } else {
      const tc={client:'var(--cb)',partner:'var(--pb)',prospect:'var(--prb)',nogo:'var(--nb)',poc:'var(--pob)'};
      const ts={client:'var(--cr)',partner:'var(--pr)',prospect:'var(--prr)',nogo:'var(--nr)',poc:'var(--por)'};
      circle.setAttribute('fill',tc[n.type]||'var(--surf)');
      circle.setAttribute('stroke',ts[n.type]||'var(--rule)');circle.setAttribute('stroke-width','1');
      if(n.hop===2)circle.setAttribute('opacity','0.7');
    }
    g.appendChild(circle);

    /* initials */
    if(r>=9){
      const ini2=document.createElementNS('http://www.w3.org/2000/svg','text');
      ini2.setAttribute('x',n.x);ini2.setAttribute('y',n.y+1);
      ini2.setAttribute('text-anchor','middle');ini2.setAttribute('dominant-baseline','central');
      ini2.setAttribute('font-family','IBM Plex Mono,monospace');
      ini2.setAttribute('font-size',n.isCenter||n.isOA?'8':n.hop===2?'5':n.significant!==false?'7':'6');
      ini2.setAttribute('font-weight','600');
      ini2.setAttribute('fill',(n.isCenter||n.isOA)?'#fff':'var(--t2)');
      ini2.textContent=ini(n.name);
      g.appendChild(ini2);
    }

    /* name label */
    const maxLen=n.hop===2?12:16;
    const dispName=n.name.length>maxLen?n.name.slice(0,maxLen-1)+'…':n.name;
    const lbl=document.createElementNS('http://www.w3.org/2000/svg','text');
    lbl.setAttribute('x',n.x);lbl.setAttribute('y',n.y+r+9);
    lbl.setAttribute('text-anchor','middle');
    lbl.setAttribute('font-family','IBM Plex Mono,monospace');
    lbl.setAttribute('font-size',n.isCenter||n.isOA?'9':n.hop===2?'6':'8');
    lbl.setAttribute('font-weight',(n.isCenter||n.isOA||n.onPath)?'600':'400');
    lbl.setAttribute('fill',(n.isCenter||n.isOA)?'var(--g)':n.onPath?'var(--g)':n.hop===2?'var(--t3)':'var(--t1)');
    if(n.hop===2)lbl.setAttribute('opacity','0.8');
    lbl.textContent=dispName;
    g.appendChild(lbl);

    /* hop-2 badge */
    if(n.hop===2){
      const badge=document.createElementNS('http://www.w3.org/2000/svg','text');
      badge.setAttribute('x',n.x+r-1);badge.setAttribute('y',n.y-r+2);
      badge.setAttribute('text-anchor','middle');badge.setAttribute('font-family','IBM Plex Mono,monospace');
      badge.setAttribute('font-size','5');badge.setAttribute('fill','var(--t4)');
      badge.textContent='2';
      g.appendChild(badge);
    }

    /* OA badge */
    if(n.isOA&&!n.isCenter){
      const oaBadge=document.createElementNS('http://www.w3.org/2000/svg','text');
      oaBadge.setAttribute('x',n.x);oaBadge.setAttribute('y',n.y+r+18);
      oaBadge.setAttribute('text-anchor','middle');oaBadge.setAttribute('font-family','IBM Plex Mono,monospace');
      oaBadge.setAttribute('font-size','6');oaBadge.setAttribute('fill','var(--g)');oaBadge.setAttribute('font-weight','600');
      oaBadge.textContent='onAudience';
      g.appendChild(oaBadge);
    }

    /* hover */
    const origFill=circle.getAttribute('fill');
    const origStroke=circle.getAttribute('stroke');
    g.addEventListener('mouseenter',()=>{circle.setAttribute('stroke','var(--g)');circle.setAttribute('stroke-width','2');lbl.setAttribute('fill','var(--g)');circle.setAttribute('opacity','1');});
    g.addEventListener('mouseleave',()=>{circle.setAttribute('stroke',origStroke);circle.setAttribute('stroke-width',n.isCenter||n.isOA?'1.5':'1');lbl.setAttribute('fill',(n.isCenter||n.isOA)?'var(--g)':n.onPath?'var(--g)':n.hop===2?'var(--t3)':'var(--t1)');if(n.hop===2)circle.setAttribute('opacity','0.7');});

    gNodes.appendChild(g);
  });

  /* ── legend ── */
  const leg=document.createElementNS('http://www.w3.org/2000/svg','g');
  const legendItems=[];
  if(nodeSet.has(OA)&&centerSlug!==OA){
    legendItems.push({color:'var(--g)',label:'→ onAudience (direct)',bold:true});
    legendItems.push({color:'var(--g)',label:'→ onAudience (via platform)',dash:'2 5',opacity:'0.5'});
  }
  if(_relDepth===2)legendItems.push({color:'var(--rule2)',label:'2-hop indirect',dash:'3 3'});
  legendItems.forEach((item,i)=>{
    const ly=H-14-(legendItems.length-1-i)*13;
    const line=document.createElementNS('http://www.w3.org/2000/svg','line');
    line.setAttribute('x1',8);line.setAttribute('y1',ly);line.setAttribute('x2',20);line.setAttribute('y2',ly);
    line.setAttribute('stroke',item.color);line.setAttribute('stroke-width',item.bold?'2':'1.5');
    if(item.dash)line.setAttribute('stroke-dasharray',item.dash);
    if(item.opacity)line.setAttribute('opacity',item.opacity);
    leg.appendChild(line);
    const t=document.createElementNS('http://www.w3.org/2000/svg','text');
    t.setAttribute('x',24);t.setAttribute('y',ly+3);
    t.setAttribute('font-family','IBM Plex Mono,monospace');t.setAttribute('font-size','6');
    t.setAttribute('fill','var(--t3)');t.textContent=item.label;
    leg.appendChild(t);
  });
  svg.appendChild(leg);
}

/* ═══ Navigation helpers ═════════════════════════════════════ */
export function openBySlug(s){const c=S.companies.find(x=>_slug(x.name)===s);if(c)openCompany(c);}
export function showCtxSlug(e,el){e.preventDefault();e.stopPropagation();showCtx(e,el.dataset.slug);}

/* ═══ Context Menu ═══════════════════════════════════════════ */
export function showCtx(e,slugOrName){
  e.preventDefault();e.stopPropagation();
  const co=S.companies.find(x=>_slug(x.name)===slugOrName)||S.companies.find(x=>x.name===slugOrName);
  const name=co?.name||slugOrName;
  const menu=document.getElementById('ctxMenu');
  const actions=[
    {icon:'🔍',text:'Full contact report',fn:()=>{if(co)openCompany(co);promptResearch();}},
    {icon:'👤',text:'Find decision makers',fn:()=>{openCompany(co);setTimeout(bgFindDMs,200);}},
    {icon:'✉',text:'Draft outreach email',fn:()=>window.openComposer({company:name,note:co?.note,status:co?.type,description:co?.description||'',angle:co?.outreach_angle||''})},
    {icon:'💬',text:'LinkedIn message',fn:()=>window.openComposer({company:name,note:co?.note,status:co?.type,description:co?.description||'',angle:co?.outreach_angle||''})},
    {icon:'🔗',text:'Find similar',fn:()=>promptSimilar()},
    {icon:'📧',text:'Email history',fn:()=>{if(co)openCompany(co);setTimeout(()=>{const ib=document.getElementById('ib-intel-body');if(ib)ib.scrollIntoView({behavior:'smooth',block:'nearest'});bgRefreshIntel();},100);}},
  ];
  if(co?.type==='nogo')actions.push({icon:'⚠️',text:'Why no outreach?',fn:()=>{aiQuick(`no outreach "${name}"`);document.getElementById('aiInp').scrollIntoView({behavior:'smooth',block:'nearest'});}});
  if(co?.type==='prospect')actions.push({icon:'🚀',text:'Prioritize',fn:()=>{aiQuick(`priority ${name}`);document.getElementById('aiInp').scrollIntoView({behavior:'smooth',block:'nearest'});}});
  menu.innerHTML=`<div class="ctx-label">${name}</div><div class="ctx-sep"></div>`+actions.map((a,i)=>`<div class="ctx-item" data-i="${i}"><span class="ctx-ico">${a.icon}</span>${a.text}</div>`).join('');
  menu.querySelectorAll('.ctx-item').forEach((el,i)=>{el.addEventListener('click',()=>{menu.style.display='none';actions[i].fn();});});
  const x=Math.min(e.clientX,window.innerWidth-230),y=Math.min(e.clientY,window.innerHeight-actions.length*34-20);
  menu.style.left=x+'px';menu.style.top=y+'px';menu.style.display='block';
}

/* ═══ Contact Drawer ═════════════════════════════════════════ */
export function openDrawer(ctId){const ct=S.contacts.find(c=>c.id===ctId||(c.full_name&&_slug(c.full_name)===ctId));if(!ct)return;S.currentContact=ct;const av=getAv(ct.full_name||''),n=ini(ct.full_name||'');const el=document.getElementById('drAv');el.textContent=n;el.style.background=av.bg;el.style.color=av.fg;document.getElementById('drName').textContent=ct.full_name||'—';document.getElementById('drSub').textContent=(ct.title||'')+(ct.company_name?' · '+ct.company_name:'');const _relColor={'warm':'var(--cc)','cold':'var(--t3)','active':'var(--gb)'};const _statusColor={'replied':'var(--cc)','contacted':'var(--gb)','pending':'var(--prc)','bounced':'var(--cr)'};const flds=[[ct.title,'Title',`<span style="font-family:'IBM Plex Mono',monospace;font-size:9px">${esc(ct.title)}</span>`],[ct.email,'Email',`<a href="mailto:${ct.email}" style="color:var(--g);font-family:'IBM Plex Mono',monospace;font-size:9px">${esc(ct.email)}</a>`],[ct.phone,'Phone',`<span style="font-family:'IBM Plex Mono',monospace;font-size:9px">${esc(ct.phone)}</span>`],[ct.linkedin_url,'LinkedIn',`<a href="${ct.linkedin_url}" target="_blank" style="color:var(--g);font-family:'IBM Plex Mono',monospace;font-size:9px">${esc(ct.linkedin_url)}</a>`],[ct.department,'Dept',`<span style="font-family:'IBM Plex Mono',monospace;font-size:9px">${esc(ct.department)}</span>`],[ct.seniority,'Seniority',`<span style="font-family:'IBM Plex Mono',monospace;font-size:9px;text-transform:uppercase">${esc(ct.seniority)}</span>`],[ct.location,'Location',`<span style="font-family:'IBM Plex Mono',monospace;font-size:9px">${esc(ct.location)}</span>`],[ct.outreach_status,'Status',`<span style="font-family:'IBM Plex Mono',monospace;font-size:9px;color:${_statusColor[ct.outreach_status]||'var(--t2)'}">${esc(ct.outreach_status)}</span>`],[ct.relationship_strength,'Relationship',`<span style="font-family:'IBM Plex Mono',monospace;font-size:9px;color:${_relColor[ct.relationship_strength]||'var(--t2)'}">${esc(ct.relationship_strength)}</span>`],[ct.last_contacted_at,'Last Contact',`<span style="font-family:'IBM Plex Mono',monospace;font-size:9px">${esc(ct.last_contacted_at?.slice(0,10))}</span>`],[ct.warm_intro_path,'Warm Intro',`<span style="font-family:'IBM Plex Mono',monospace;font-size:9px">${esc(ct.warm_intro_path)}</span>`],[ct.notes,'Notes',`<span style="font-size:10px;line-height:1.5">${esc(ct.notes)}</span>`]].filter(f=>f[0]);document.getElementById('drBody').innerHTML=flds.map(([,l,v])=>`<div class="dr-field"><label>${l}</label><p>${v}</p></div>`).join('');document.getElementById('ctDrawer').classList.add('open');document.getElementById('ctDrawerOverlay').classList.add('vis');
  // Inject / update "Draft in Claude" button in drawer actions
  const _drAct=document.querySelector('#ctDrawer .dr-actions');
  if(_drAct){_drAct.querySelectorAll('.dr-claude-btn').forEach(b=>b.remove());if(ct.email){const _co2=S.companies.find(x=>(x.name||'').toLowerCase()===(ct.company_name||'').toLowerCase())||{name:ct.company_name||''};const _cb=document.createElement('button');_cb.className='btn sm full dr-claude-btn';_cb.textContent='✉ Draft in Claude';_cb.onclick=()=>openClaudeGmail('draft',_co2,ct.email,ct.full_name);_drAct.appendChild(_cb);}}
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

/* ═══ Modals ═════════════════════════════════════════════════ */
export function promptResearch(){S._modalMode='research';document.getElementById('modalTitle').textContent='Research a Company';document.getElementById('modalDesc').textContent='Enter company name to generate a full contact report.';document.getElementById('modalInput').value='';document.getElementById('overlay').classList.add('vis');setTimeout(()=>document.getElementById('modalInput').focus(),60);}
export function promptSimilar(){S._modalMode='similar';document.getElementById('modalTitle').textContent='Find Similar Companies';document.getElementById('modalDesc').textContent='Enter a reference company to find lookalikes.';document.getElementById('modalInput').value='';document.getElementById('overlay').classList.add('vis');setTimeout(()=>document.getElementById('modalInput').focus(),60);}
export function closeModal(){document.getElementById('overlay').classList.remove('vis');}
export function submitModal(){
  const v=document.getElementById('modalInput').value.trim();if(!v)return;closeModal();
  if(S._modalMode==='similar'){
    document.getElementById('aiInp').value=`similar to ${v}`;
    runAI();
  } else {
    /* try to find existing company first and open it */
    const found=S.companies.find(x=>(x.name||'').toLowerCase().includes(v.toLowerCase()));
    if(found){openCompany(found);}
    else{document.getElementById('aiInp').value=v;runAI();}
  }
}

/** Legacy escape hatch — only for truly unroutable actions that have no hub-native equivalent. */
export function openClaude(p){window.open('https://claude.ai/new?q='+encodeURIComponent(p),'_blank');}

/* ══════════════════════════════════════════════════════════════
   ── Lemlist campaign push modal ──────────────────────────────
   initLemlistModal()   — creates DOM once on boot
   openLemlistModal(contacts)  — contacts = [{id,email,name,company_name,title,linkedin}]
   closeLemlistModal()
   lemlistPush()        — pushes leads, writes back to DB
   audPushLemlist(audId) — audience-level helper
   ══════════════════════════════════════════════════════════════ */
let _llContacts=[];
let _llCampaigns=[];
let _llSelCampaign=null;
let _llLeads=[];
let _llInited=false;
let _llLeadSearch='';

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

async function loadTaxonomy(){
  if(_taxData)return _taxData;
  if(_taxLoading)return null;
  _taxLoading=true;
  try{const res=await fetch('./taxonomy.json');_taxData=await res.json();clog('info',`Taxonomy loaded: <b>${_taxData.length}</b> segments`);}
  catch(e){clog('info',`Taxonomy load failed: ${e.message}`);_taxData=[];}
  _taxLoading=false;
  return _taxData;
}

function extractKeywords(c){
  const text=[c.name,c.category,c.description,c.note,(Array.isArray(c.dsps)?c.dsps:[]).join(' '),(Array.isArray(c.tech_stack)?c.tech_stack.map(t=>typeof t==='string'?t:t?.tool||'').join(' '):'')].filter(Boolean).join(' ').toLowerCase();
  const stop=new Set(['the','and','for','with','that','this','from','our','are','has','its','will','can','all','about','into','over','also','they','their','been','who','which','more','other','than','each','but','not','data','company','users','user','provider']);
  const words=text.replace(/[^a-z0-9 ]/g,' ').split(/\s+/).filter(w=>w.length>2&&!stop.has(w));
  const seen=new Set();
  return words.filter(w=>{if(seen.has(w))return false;seen.add(w);return true;});
}

function matchSegments(c,tax){
  const kw=extractKeywords(c);
  if(!kw.length||!tax.length)return[];
  const results=[];
  let currentPath=[];
  for(const[depth,name,desc]of tax){
    currentPath=currentPath.slice(0,depth);currentPath.push(name);
    const searchText=(currentPath.join(' > ')+' '+desc).toLowerCase();
    let score=0;const matchedKw=[];
    for(const w of kw){if(searchText.includes(w)){const s=name.toLowerCase().includes(w)?3:1;score+=s;matchedKw.push(w);}}
    if(score>=2)results.push({path:currentPath.slice(),name,desc,depth,score,keywords:matchedKw.slice(0,5)});
  }
  results.sort((a,b)=>b.score-a.score);
  return results.slice(0,50);
}

function renderSegTree(matches){
  if(!matches.length)return'<div style="font-size:11px;color:var(--t3)">No matching segments. Add more company details to improve matching.</div>';
  const groups={};
  for(const m of matches){const top=m.path[0]||'Other';if(!groups[top])groups[top]=[];groups[top].push(m);}
  const topIcons={'Interest':'📊','Brands':'🏷️','Connected TV (CTV)':'📺'};
  let html='';
  for(const[top,items]of Object.entries(groups)){
    const icon=topIcons[top]||'📁';
    const subs={};for(const m of items){const sub=m.path.length>=2?m.path[1]:'General';if(!subs[sub])subs[sub]=[];subs[sub].push(m);}
    const topId='seg-'+top.replace(/[^a-z0-9]/gi,'');
    html+=`<div style="margin-bottom:8px"><div style="display:flex;align-items:center;gap:4px;cursor:pointer;padding:3px 0" onclick="ibToggle('${topId}')"><span id="${topId}-arrow" style="font-size:9px;color:var(--t3)">▾</span><span style="font-family:'IBM Plex Mono',monospace;font-size:8px;font-weight:600;color:var(--t1)">${icon} ${esc(top)}</span><span style="font-family:'IBM Plex Mono',monospace;font-size:7px;color:var(--t3)">${items.length} segments · ${Object.keys(subs).length} categories</span></div><div id="${topId}" style="margin-left:12px">`;
    for(const[sub,segs]of Object.entries(subs).sort((a,b)=>b[1].reduce((s,m)=>s+m.score,0)-a[1].reduce((s,m)=>s+m.score,0))){
      const subId=topId+'-'+sub.replace(/[^a-z0-9]/gi,'');
      const barW=Math.min(100,Math.round(segs.reduce((s,m)=>s+m.score,0)/segs[0].score*20));
      html+=`<div style="margin-bottom:4px"><div style="display:flex;align-items:center;gap:4px;cursor:pointer;padding:2px 0" onclick="ibToggle('${subId}')"><span id="${subId}-arrow" style="font-size:8px;color:var(--t4)">▸</span><span style="font-family:'IBM Plex Mono',monospace;font-size:8px;color:var(--t2)">${esc(sub)}</span><span style="font-family:'IBM Plex Mono',monospace;font-size:6px;color:var(--t4)">${segs.length}</span><span style="display:inline-block;width:${barW}px;height:3px;border-radius:1px;background:var(--g);opacity:.5;margin-left:auto"></span></div><div id="${subId}" style="display:none;margin-left:14px">`;
      for(const seg of segs.slice(0,10)){const leaf=seg.path[seg.path.length-1];const kwHtml=seg.keywords.map(k=>`<span style="background:var(--gb);color:var(--g);padding:0 3px;border-radius:1px;font-size:6px">${k}</span>`).join(' ');html+=`<div style="display:flex;align-items:baseline;gap:4px;padding:2px 0;border-bottom:1px solid var(--rule3)"><span style="font-family:'IBM Plex Mono',monospace;font-size:8px;color:var(--t1)">${esc(leaf)}</span><span style="font-family:'IBM Plex Mono',monospace;font-size:6px;color:var(--t4);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:180px">${esc(seg.desc)}</span><div style="display:flex;gap:2px;margin-left:auto;flex-shrink:0">${kwHtml}</div></div>`;}
      if(segs.length>10)html+=`<div style="font-size:7px;color:var(--t4);padding:2px 0">… and ${segs.length-10} more</div>`;
      html+=`</div></div>`;
    }
    html+=`</div></div>`;
  }
  return html;
}

export async function mapSegments(){
  const c=S.currentCompany;if(!c)return;
  const body=document.getElementById('ib-segments-body'),cnt=document.getElementById('ib-seg-cnt');if(!body)return;
  body.innerHTML='<div class="ib-loading">Loading taxonomy…</div>';
  const tax=await loadTaxonomy();
  if(!tax||!tax.length){body.innerHTML='<div style="font-size:11px;color:var(--t3)">Taxonomy not available — check taxonomy.json</div>';return;}
  const matches=matchSegments(c,tax);
  if(cnt)cnt.textContent=matches.length||'';
  clog('info',`Segment mapper: <b>${matches.length}</b> matches for ${esc(c.name)}`);
  body.innerHTML=renderSegTree(matches);
}
