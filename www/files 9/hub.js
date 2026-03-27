/* ═══ hub.js — main hub logic ═══ */

import { SB_URL, SB_KEY, HDR, TAG_RULES } from './config.js';
import S from './state.js';
import { classify, _slug, getCoTags, getAv, ini, tClass, tLabel, stars, esc, relTime } from './utils.js';
import { renderStats, fetchGoogleNews, saveIntelligence, anthropicFetch } from './api.js';

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
export async function runAI(){const q=document.getElementById('aiInp').value.trim();if(!q)return;const btn=document.getElementById('aiBtn'),stat=document.getElementById('aiStat'),dot=document.getElementById('aiDot'),txt=document.getElementById('aiTxt');btn.disabled=true;stat.className='ai-stat vis';dot.className='ai-dot';dot.style.background='';txt.textContent='Thinking…';clog('ai',`Query: <b>${esc(q)}</b>`);const list=S.companies.map(c=>`${c.name} (${c.type}${c.category?' / '+c.category:''}${c.hq_city?' / '+c.hq_city:''}${c.note?' – '+c.note.slice(0,40):''})`).join('\n');try{const data=await anthropicFetch({model:'claude-sonnet-4-20250514',max_tokens:800,system:'You are a B2B sales filter for onAudience. Given a company list and a query, return ONLY a raw JSON array of matching company names. No markdown, no explanation. Return [] if nothing matches.',messages:[{role:'user',content:`Query: "${q}"\n\nCompany list:\n${list}`}]});const raw=(data.content||[]).filter(b=>b.type==='text').map(b=>b.text).join('').replace(/```json|```/g,'').trim();const names=JSON.parse(raw);if(!Array.isArray(names))throw new Error('not array');S.aiSet=new Set(names);dot.className='ai-dot done';txt.textContent=`${names.length} matches — "${q.length>30?q.slice(0,30)+'…':q}"`;clog('ai',`✓ Found <b>${names.length}</b> matches for "${esc(q.slice(0,30))}"`);renderList();}catch(e){dot.className='ai-dot err';txt.textContent='Error — try again';clog('ai',`✗ Error: ${esc(e.message)}`);console.error(e);}btn.disabled=false;}
export function clearAI(){S.aiSet=null;document.getElementById('aiStat').className='ai-stat';document.getElementById('aiInp').value='';renderList();}
export function aiQuick(q){document.getElementById('aiInp').value=q;runAI();}

function renderMetaPills(){const el=document.getElementById('metaPills');const parts=[];S.activeTags.forEach(t=>{parts.push(`<span class="m-pill tag" data-tag="${t.replace(/"/g,'&quot;')}" onclick="toggleTagEl(this)" title="Remove">${t}</span>`);});if(S.aiSet){parts.push(`<span class="m-pill ai" onclick="clearAI()" title="Clear AI">AI: ${S.aiSet.size}</span>`);}el.innerHTML=parts.join('');}

/* ═══ Tabs / Filter / Search ═════════════════════════════════ */
export function switchTab(t){
  S.activeTab=t;
  document.getElementById('tabComp').className='left-tab'+(t==='companies'?' active':'');
  document.getElementById('tabCont').className='left-tab'+(t==='contacts'?' active':'');
  document.getElementById('filtersRow').style.display=t==='companies'?'flex':'none';
  document.getElementById('tagPanel').style.display=t==='companies'?'':'none';
  document.getElementById('tagBtn').style.display=t==='companies'?'':'none';
  document.getElementById('aiBar').style.display=t==='companies'?'flex':'none';
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
  clog('enrich',`Starting lookup for <b>${c.name}</b>…`);
  openClaude(`Research ${c.name} — full contact report with decision makers, outreach angle, ICP fit, tech stack, and activation path for onAudience`);
}

/* ═══ Completeness indicator ═════════════════════════════════ */
function completeness(c){
  const fields=[c.description,c.category,c.region||c.hq_city,c.size,c.website,c.icp,c.outreach_angle,c.tech_stack?.length,c.dsps?.length];
  const filled=fields.filter(Boolean).length;
  return Math.round(filled/fields.length*100);
}

/* ═══ List Rendering ═════════════════════════════════════════ */
export function renderList(){
  const scroll=document.getElementById('listScroll'),meta=document.getElementById('metaTxt');
  if(S.activeTab==='tcf'){window.renderTCFList?.();return;}
  if(S.activeTab==='contacts'){const filt=S.contacts.filter(c=>{if(!S.searchQ)return true;return(c.full_name||'').toLowerCase().includes(S.searchQ)||(c.company_name||'').toLowerCase().includes(S.searchQ)||(c.title||'').toLowerCase().includes(S.searchQ);});meta.textContent=`${filt.length} of ${S.contacts.length} contacts`;if(!filt.length){scroll.innerHTML='<div style="padding:20px 10px;font-family:\'IBM Plex Mono\',monospace;font-size:9px;color:var(--t3);text-transform:uppercase">No contacts</div>';return;}scroll.innerHTML=filt.map(ct=>{const av=getAv(ct.full_name||'');const n=ini(ct.full_name||'');return`<div class="ct-row" onclick="openDrawer('${ct.id||_slug(ct.full_name||'')}')"><div class="ct-av" style="background:${av.bg};color:${av.fg}">${n}</div><div class="ct-info"><div class="ct-name">${ct.full_name||'—'}</div><div class="ct-sub">${ct.title||''}${ct.company_name?' · '+ct.company_name:''}</div></div></div>`;}).join('');return;}
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

    /* detail line: city · headcount · category · icp */
    const details=[];
    if(c.hq_city||c.region)details.push(`<span class="c-detail-item">📍 <b>${esc(c.hq_city||c.region)}</b></span>`);
    if(c.size)details.push(`<span class="c-detail-item">👥 <b>${esc(c.size)}</b></span>`);
    if(c.category)details.push(`<span class="c-detail-item">${esc(c.category)}</span>`);
    if(c.icp)details.push(`<span class="c-detail-item" style="color:var(--g)">ICP ${c.icp}</span>`);
    if(c.website)details.push(`<a class="c-detail-item" href="https://${c.website}" target="_blank" onclick="event.stopPropagation()" style="color:var(--g);text-decoration:none">${c.website}</a>`);
    const detailHtml=details.length?`<div class="c-detail">${details.join('<span class="c-detail-sep"></span>')}</div>`:'';

    /* note with bold keywords */
    const noteHtml=boldKw((c.note||'').length>60?(c.note||'').slice(0,58)+'…':(c.note||''));

    /* tags row */
    const tagRow=coTags.length?`<div class="c-tags-row">${coTags.slice(0,6).map(t=>`<span class="c-tag-micro${S.activeTags.has(t)?' hit':''}" onclick="event.stopPropagation();toggleTag('${t}')">${t}</span>`).join('')}</div>`:'';

    /* enrich button for incomplete records */
    const enrichBtn=pct<50?`<span class="c-enrich" onclick="event.stopPropagation();quickEnrich('${slug}')" title="${pct}% complete — click to research">✦ enrich</span>`:'';

    /* updated_at relative */
    const updStr=c.updated_at?`<span class="c-detail-item" style="opacity:.7">${relTime(c.updated_at)}</span>`:'';

    return`<div class="c-row${sel}" data-slug="${slug}" onclick="openBySlug(this.dataset.slug)" oncontextmenu="showCtxSlug(event,this);return false;">
      <div class="c-av" style="background:${av.bg};color:${av.fg};border:1px solid ${av.fg}33">${n}</div>
      <div class="c-info">
        <div style="display:flex;align-items:center;gap:4px"><div class="c-name" style="flex:1">${c.name}</div><span class="tag ${tc}" style="flex-shrink:0">${tl}</span>${enrichBtn}</div>
        <div class="c-note">${noteHtml}</div>
        ${detailHtml}
        ${tagRow}
      </div>
    </div>`;
  }).join('');
}

/* ═══ Company Detail Panel ═══════════════════════════════════ */

/* fold toggle helper — used by onclick in section headers */
function ibToggle(id){const b=document.getElementById(id);if(!b)return;const closed=b.style.display==='none';b.style.display=closed?'':'none';const arrow=document.getElementById(id+'-arrow');if(arrow)arrow.textContent=closed?'▾':'▸';}
/* expose for onclick */
window.ibToggle=ibToggle;

export function openCompany(c){
  if(!c)return;S.currentCompany=c;window.currentCompany=c;
  document.getElementById('emptyState').style.display='none';
  const panel=document.getElementById('coPanel');panel.style.display='block';
  const av=getAv(c.name),n=ini(c.name),tc=tClass(c.type),tl=tLabel(c.type),st=stars(c.icp);

  /* ── facts table ── */
  const facts=[
    c.category&&['Category',c.category],
    (c.region||c.hq_city)&&['HQ',[c.region,c.hq_city].filter(Boolean).join(', ')],
    c.size&&['Size',c.size],
    c.founded_year&&['Founded',c.founded_year],
    c.funding&&['Funding',c.funding],
    c.tcf_vendor_id&&['GVL/TCF',c.tcf_vendor_id],
    c.website&&['Website',`<a href="https://${c.website}" target="_blank" style="color:var(--g);text-decoration:none">${c.website} ↗</a>`],
    c.dsps&&c.dsps.length&&['DSPs',(Array.isArray(c.dsps)?c.dsps:c.dsps.split(',')).join(', ')],
    c.updated_at&&['Updated',new Date(c.updated_at).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'2-digit'})]
  ].filter(Boolean);

  /* ── signals bar ── */
  const semnTags=getCoTags(c);const techArr=Array.isArray(c.tech_stack)?c.tech_stack:[];
  const signalHtml=[semnTags.length?`<span class="ib-sig-lbl">Signals</span>${semnTags.map(t=>`<span class="ib-sig-tag">${t}</span>`).join('')}`:'',semnTags.length&&techArr.length?'<span class="ib-sig-div"></span>':'',techArr.length?`<span class="ib-sig-lbl">Tech</span>${techArr.slice(0,8).map(t=>`<span class="ib-tech-pill">${esc(techName(t))}</span>`).join('')}`:''].filter(Boolean).join('');

  /* ── contacts grid ── */
  const coCts=S.contacts.filter(ct=>(ct.company_name||'').toLowerCase()===c.name.toLowerCase());
  const ctGridHtml=coCts.length?`<div class="ib-cts-grid">${coCts.map(ct=>{const a2=getAv(ct.full_name||''),n2=ini(ct.full_name||'');const ctSlug=ct.id||_slug(ct.full_name||'');return`<div class="ib-ct" data-ctslug="${ctSlug}" onclick="openDrawer('${ctSlug}')"><div class="ib-ct-top"><div class="ib-ct-av" style="background:${a2.bg};color:${a2.fg}">${n2}</div><div><div class="ib-ct-name">${ct.full_name||'—'}</div><div class="ib-ct-title">${ct.title||''}</div></div></div>${ct.email?`<div class="ib-ct-email">${ct.email}</div>`:''}<div class="ib-ct-actions"><button class="ib-ct-btn" onclick="event.stopPropagation();ctAction('email','${ctSlug}')">✉ Email</button>${ct.linkedin_url?`<button class="ib-ct-btn" onclick="event.stopPropagation();window.open('${ct.linkedin_url}','_blank')">LI ↗</button>`:''}<button class="ib-ct-btn" onclick="event.stopPropagation();ctAction('research','${ctSlug}')">Research ↗</button></div></div>`;}).join('')}</div>`:`<div style="display:flex;align-items:center;gap:8px"><div style="font-size:11px;color:var(--t3)">No contacts stored</div><button class="ib-cta-btn" onclick="bgFindDMs()" style="margin-left:auto">✨ Find DMs</button></div>`;

  /* ── products ── */
  const prods=c.products?.products||[];
  const prodsHtml=prods.length?prods.map(p=>`<div class="ib-prod-row"><div class="ib-prod-name">${p.name||''}</div><div class="ib-prod-desc">${p.description||''}${p.target_user?` <span style="color:var(--t3)">· ${p.target_user}</span>`:''}</div></div>`).join(''):'';

  /* ── tech helpers ── */
  const techName=(t)=>typeof t==='string'?t:(t&&t.tool)?String(t.tool):(t&&t.name)?String(t.name):typeof t==='object'?JSON.stringify(t):'?';
  const techCat=(t)=>typeof t==='object'&&t?t.category||'':'';

  /* ── tech stack block (categorized, under outreach angle) ── */
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

  /* ── integrations block ── */
  const integ=c.products?.integrations_advertised||[];
  const integBlock=integ.length?`<div style="margin-top:8px"><div style="font-family:'IBM Plex Mono',monospace;font-size:7px;font-weight:600;text-transform:uppercase;letter-spacing:.07em;color:var(--t3);margin-bottom:5px">Integrations</div><div style="display:flex;flex-wrap:wrap;gap:3px">${integ.map(i=>`<span class="ib-sig-tag">${esc(i)}</span>`).join('')}</div></div>`:'';

  /* ── TCF / CCPA / Privacy compliance block ── */
  let privacyHtml='';
  {
    /* purpose squares — green=consent, red=LI, gray=not declared */
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

    /* tags in privacy section */
    const tagPills=semnTags.length?'<div style="margin-top:8px;padding-top:8px;border-top:1px solid var(--rule2)"><div style="font-family:\'IBM Plex Mono\',monospace;font-size:7px;font-weight:600;text-transform:uppercase;letter-spacing:.07em;color:var(--t3);margin-bottom:5px">Tags</div><div style="display:flex;flex-wrap:wrap;gap:3px">'+semnTags.map(t=>`<span class="ib-sig-tag">${t}</span>`).join('')+'</div></div>':'';

    privacyHtml=`<div class="ib-sec"><div class="ib-sh" style="cursor:pointer" onclick="ibToggle('ib-privacy-body')"><span id="ib-privacy-body-arrow" style="font-size:9px;color:var(--t3)">▾</span><span class="ib-sh-lbl">🛡️ Privacy / TCF / CCPA</span>${c.tcf_vendor_id?`<span class="tag tc" style="cursor:default;margin-left:4px">GVL ${c.tcf_vendor_id}</span>`:'<span class="tag tn" style="cursor:default;margin-left:4px">No GVL</span>'}<span class="ib-sh-act" onclick="event.stopPropagation();switchTab('tcf')">TCF Analyser →</span></div><div class="ib-body" id="ib-privacy-body">${purposeGrid}<table class="ib-facts">${c.tcf_vendor_id?`<tr><td>TCF v2.0</td><td>Vendor ID ${c.tcf_vendor_id} — registered in IAB GVL</td></tr>`:''}<tr><td>GDPR</td><td>${c.tcf_vendor_id?'TCF certified — consent-based processing':'No TCF registration found'}</td></tr><tr><td>CCPA</td><td>${c.website?`Check <a href="https://${c.website}/privacy" target="_blank" style="color:var(--g)">privacy policy ↗</a> for CCPA/CPRA disclosures`:'Unknown — no website stored'}</td></tr></table>${tagPills}</div></div>`;
  }

  /* ── section helper ── */
  const sec=(id,icon,label,body,extra,startOpen)=>{
    const arrow=startOpen!==false?'▾':'▸';
    const disp=startOpen!==false?'':'display:none';
    return`<div class="ib-sec"><div class="ib-sh" style="cursor:pointer" onclick="ibToggle('${id}')"><span id="${id}-arrow" style="font-size:9px;color:var(--t3)">${arrow}</span><span class="ib-sh-lbl">${icon} ${label}</span>${extra||''}</div><div class="ib-body" id="${id}" style="${disp}">${body}</div></div>`;
  };

  /* ── assemble panel ── */
  panel.innerHTML=`<div class="ib">
<div class="ib-head"><div class="ib-av${c.type==='nogo'?' nogo':''}">${n}</div><div class="ib-meta"><div class="ib-name">${c.name}</div><div class="ib-row2"><span class="tag ${tc}">${tl}</span>${st?`<span class="ib-icp">${st}</span>`:''}</div>${c.note?`<div class="ib-note">${c.note}</div>`:''}</div><div class="ib-close" onclick="closePanel()">✕</div></div>
<div class="ib-cta"><button class="ib-cta-btn primary" onclick="coAction('email')">✉ Draft Email</button><button class="ib-cta-btn" onclick="bgFindDMs()">👤 Find DMs</button><button class="ib-cta-btn" onclick="bgGenerateAngle()">💡 Gen Angle</button><button class="ib-cta-btn" onclick="bgRefreshIntel()">📰 Refresh News</button><button class="ib-cta-btn" onclick="coAction('similar')">🔗 Find Similar</button><button class="ib-cta-btn" onclick="coAction('linkedin')" style="margin-left:auto">LinkedIn ↗</button></div>
<div class="ib-top">
  ${sec('ib-company','🏢','Company',
    (facts.length?`<table class="ib-facts">${facts.map(([k,v])=>`<tr><td>${k}</td><td>${v}</td></tr>`).join('')}</table>`:'<span style="font-size:11px;color:var(--t3)">No details stored</span>')+(c.description?`<div class="ib-desc">${c.description}</div>`:''),
    null,true)}
  <div class="ib-sec"><div class="ib-sh" style="cursor:pointer" onclick="ibToggle('ib-angle-wrap')"><span id="ib-angle-wrap-arrow" style="font-size:9px;color:var(--t3)">▾</span><span class="ib-sh-lbl">💡 Outreach Angle</span><span class="ib-sh-act" id="ib-angle-btn" onclick="event.stopPropagation();bgGenerateAngle()">${c.outreach_angle?'↺ Regen':'✨ Generate'}</span></div><div class="ib-body" id="ib-angle-wrap" style="padding:0"><div class="ib-angle${c.outreach_angle?'':' empty'}" id="ib-angle-card" style="border:none;border-radius:0;min-height:60px"><div class="ib-angle-lbl">${c.outreach_angle?'Recommended positioning':'No angle stored yet'}</div>${c.outreach_angle?`<div class="ib-angle-text">${c.outreach_angle}</div>`:`<div class="ib-angle-text" style="color:var(--t3);font-size:10px">Click "✨ Generate" to create a personalised positioning.</div>`}</div>${techBlock}${integBlock}</div></div>
</div>
${signalHtml?`<div class="ib-sec"><div class="ib-signals">${signalHtml}</div></div>`:''}
${privacyHtml}
${sec('ib-ct-body','👤','Contacts',ctGridHtml,
  `${coCts.length?`<span class="ib-sh-cnt">${coCts.length}</span>`:''}<span class="ib-sh-act" onclick="event.stopPropagation();bgFindDMs()">✨ Find DMs</span>`,true)}
${sec('ib-intel-body','📰','Intelligence','<div class="ib-loading">Loading…</div>',
  `<span class="ib-sh-cnt" id="ib-intel-cnt"></span><span id="ib-intel-live" style="display:none" class="live-label"><span class="live-dot"></span>Live</span><span class="ib-sh-act" id="ib-intel-refresh" onclick="event.stopPropagation();bgRefreshIntel()">↺ Refresh</span>`,true)}
${prodsHtml?sec('ib-prods-body','📦','Products',prodsHtml,`<span class="ib-sh-cnt">${prods.length}</span>`,false):''}
${sec('ib-rels-body','🔗','Relations','<div class="ib-loading">Loading…</div>',
  `<span class="ib-sh-cnt" id="ib-rels-cnt"></span><span class="ib-sh-act" id="ib-rels-refresh" onclick="event.stopPropagation();loadRelationsBrief(_slug('${c.name.replace(/'/g,"\\'")}'))">↺ Refresh</span>`,true)}
<div class="ib-sec"><div class="ib-sh" style="cursor:pointer" onclick="ibToggle('ib-links-body')"><span id="ib-links-body-arrow" style="font-size:9px;color:var(--t3)">▾</span><span class="ib-sh-lbl">🔗 Quick Links</span></div><div class="ib-links" id="ib-links-body"><a class="ib-link" href="https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(c.name+' data partnerships')}" target="_blank">LI People ↗</a><a class="ib-link" href="https://www.linkedin.com/search/results/companies/?keywords=${encodeURIComponent(c.name)}" target="_blank">LI Company ↗</a>${c.website?`<a class="ib-link" href="https://${c.website}" target="_blank">${c.website} ↗</a>`:''}<a class="ib-link" href="https://news.google.com/search?q=${encodeURIComponent(c.name)}" target="_blank">Google News ↗</a><span class="ib-link" onclick="coAction('gmail')">Gmail History</span></div></div>
</div>`;
  renderList();document.getElementById('centerScroll').scrollTop=0;
  if(c.name){const slug=_slug(c.name);setTimeout(()=>loadRelationsBrief(slug),60);setTimeout(()=>loadIntelligence(slug,c.name),80);}
}
export function closePanel(){S.currentCompany=null;window.currentCompany=null;document.getElementById('coPanel').style.display='none';document.getElementById('emptyState').style.display='flex';renderList();}

/* ═══ Actions ════════════════════════════════════════════════ */
export function coAction(a){const c=S.currentCompany;if(!c)return;const n=c.name;if(a==='report')openClaude(`Full contact report for ${n} — decision makers, outreach angle, ICP fit`);if(a==='dms')openClaude(`Find Head of Data Partnerships or Programmatic at ${n} — LinkedIn, email, background`);if(a==='email')window.openComposer({company:n,note:c.note,status:c.type,icp:c.icp||null,description:c.description||'',angle:c.outreach_angle||'',category:c.category||'',region:c.region||''});if(a==='linkedin')window.open('https://linkedin.com/search/results/companies/?keywords='+encodeURIComponent(n),'_blank');if(a==='similar')openClaude(`Find companies similar to ${n} for onAudience data partnerships — top 10 by ICP fit`);if(a==='gmail')openClaude(`Check Gmail for previous contact history with ${n}`);if(a==='angle')bgGenerateAngle();if(a==='find-contacts')bgFindDMs();}
export function ctAction(action,ctSlug){const ct=S.contacts.find(c=>c.id===ctSlug||(c.full_name&&_slug(c.full_name)===ctSlug));if(!ct)return;if(action==='email')window.openComposer({company:ct.company_name,contactName:ct.full_name,contactTitle:ct.title,linkedin:ct.linkedin_url});if(action==='research')openClaude(`Full research on ${ct.full_name}, ${ct.title||''} at ${ct.company_name||''} — background, LinkedIn activity, outreach hooks`);}

/* ═══ BG Generate Angle ══════════════════════════════════════ */
export async function bgGenerateAngle(){const c=S.currentCompany;if(!c)return;const card=document.getElementById('ib-angle-card'),btn=document.getElementById('ib-angle-btn');if(card){card.className='ib-angle';card.innerHTML=`<div class="ib-angle-lbl"><span class="bg-running">✦ Generating…</span></div>`;}if(btn)btn.style.display='none';const tags=getCoTags(c).join(', ');const techArr2=(Array.isArray(c.tech_stack)?c.tech_stack:[]).slice(0,6).map(t=>typeof t==='string'?t:(t&&t.tool)?String(t.tool):'?').join(', ');try{const data=await anthropicFetch({model:'claude-sonnet-4-20250514',max_tokens:350,system:'You are a senior B2B data partnership sales specialist at onAudience, a European first-party audience data company. Write a concise, specific outreach angle (3–5 sentences) for approaching this company. Focus on what onAudience data solves for their business model, timing signals, and clearest value hook. No bullet points. Flowing prose only.',messages:[{role:'user',content:`Company: ${c.name}\nType: ${c.type}\nCategory: ${c.category||'unknown'}\nNote: ${c.note||''}\nDescription: ${c.description||''}\nTech: ${techArr2}\nDSPs: ${JSON.stringify(c.dsps||[])}\nSignals: ${tags}`}]});const angle=(data.content||[]).filter(b=>b.type==='text').map(b=>b.text).join('').trim();if(!angle)throw new Error('empty');S.currentCompany.outreach_angle=angle;S.companies.forEach(co=>{if(co.name===c.name)co.outreach_angle=angle;});if(card){card.className='ib-angle';card.innerHTML=`<div class="ib-angle-lbl">Recommended positioning <span class="bg-done">✓ generated</span></div><div class="ib-angle-text">${angle}</div>`;}if(btn){btn.textContent='↺ Regen';btn.style.display='';}await fetch(`${SB_URL}/rest/v1/companies?name=eq.${encodeURIComponent(c.name)}`,{method:'PATCH',headers:{...HDR,'Prefer':'return=minimal'},body:JSON.stringify({outreach_angle:angle})}).catch(()=>{});}catch(e){if(card)card.innerHTML=`<div class="ib-angle-lbl"><span class="bg-err">Error — ${e.message}</span></div>`;if(btn){btn.textContent='↺ Retry';btn.style.display='';}}}

/* ═══ BG Find DMs ════════════════════════════════════════════ */
export async function bgFindDMs(){const c=S.currentCompany;if(!c)return;const body=document.getElementById('ib-ct-body');if(!body)return;body.innerHTML=`<div class="ib-loading" style="text-align:left">Finding decision makers at ${c.name}…</div>`;const tags=getCoTags(c).join(', ');try{const data=await anthropicFetch({model:'claude-sonnet-4-20250514',max_tokens:700,system:'You are a B2B sales researcher. Return ONLY a raw JSON array — no markdown, no explanation. Each element: {"full_name":"string","title":"string","linkedin_url":"string","reason":"string (1 sentence why relevant for data partnerships)"}. Construct linkedin_url as: https://www.linkedin.com/search/results/people/?keywords=FIRSTNAME+LASTNAME+COMPANY',messages:[{role:'user',content:`Find 3–5 decision makers at ${c.name} (${c.category||'ad tech'}) relevant for data partnership discussions with onAudience.\nFocus: Head/VP/Director of Programmatic, Data Partnerships, Product, or Platform.\nContext: ${c.note||''} Tags: ${tags}`}]});const raw=(data.content||[]).filter(b=>b.type==='text').map(b=>b.text).join('').replace(/```json|```/g,'').trim();const dms=JSON.parse(raw);if(!Array.isArray(dms)||!dms.length)throw new Error('none found');S.mcAiContacts=dms;body.innerHTML=`<div style="font-family:'IBM Plex Mono',monospace;font-size:7px;font-weight:600;text-transform:uppercase;letter-spacing:.07em;color:var(--poc);margin-bottom:8px;display:flex;align-items:center;gap:5px"><span>✦ AI suggested</span><span style="color:var(--t4)">·</span><span style="color:var(--t3);font-weight:400">not verified</span></div><div class="ib-cts-grid">${dms.map(dm=>{const a2=getAv(dm.full_name||''),n2=ini(dm.full_name||'');return`<div class="ib-ct"><div class="ib-ct-top"><div class="ib-ct-av" style="background:${a2.bg};color:${a2.fg};border:1px solid ${a2.fg}33">${n2}</div><div><div class="ib-ct-name">${dm.full_name}</div><div class="ib-ct-title">${dm.title}</div></div></div><div style="font-size:10px;color:var(--t3);margin:3px 0 6px;line-height:1.4">${dm.reason||''}</div><div class="ib-ct-actions"><button class="ib-ct-btn" onclick="openComposer({company:'${c.name.replace(/'/g,'&apos;')}',contactName:'${dm.full_name.replace(/'/g,'&apos;')}',contactTitle:'${dm.title.replace(/'/g,'&apos;')}',angle:'${(c.outreach_angle||'').replace(/'/g,'&apos;').slice(0,100)}',description:'${(c.description||'').replace(/'/g,'&apos;').slice(0,100)}'})">✉ Email</button><a class="ib-ct-btn" href="${dm.linkedin_url}" target="_blank">LI ↗</a><button class="ib-ct-btn" onclick="openClaude('Research ${dm.full_name} at ${c.name} — LinkedIn, background, outreach hooks')">Research ↗</button></div></div>`;}).join('')}</div>`;}catch(e){body.innerHTML=`<div style="font-size:11px;color:var(--t3)"><span class="bg-err">Error</span> ${e.message} — <span style="cursor:pointer;color:var(--g);text-decoration:underline" onclick="bgFindDMs()">retry</span></div>`;}}

/* ═══ Intelligence ═══════════════════════════════════════════ */
export function renderIntelBody(stored,live){const body=document.getElementById('ib-intel-body'),cnt=document.getElementById('ib-intel-cnt'),liveLabel=document.getElementById('ib-intel-live');if(!body)return;const storedItems=[];(Array.isArray(stored)?stored:[]).forEach(row=>{if(Array.isArray(row.content))storedItems.push(...row.content);else if(row.title||row.url)storedItems.push(row);});const total=storedItems.length+live.length;if(cnt)cnt.textContent=total||'';if(liveLabel)liveLabel.style.display=live.length?'flex':'none';if(!total){body.innerHTML=`<div style="display:flex;align-items:center;gap:8px"><span style="font-size:11px;color:var(--t3)">No intelligence yet</span><button class="ib-ct-btn" style="height:22px;padding:0 8px;font-size:7px;margin-left:auto" onclick="bgRefreshIntel()">↺ Fetch news</button></div>`;return;}const itemHtml=(items,dotColor)=>items.map(r=>{const url=r.url||r.link||'';const title=r.title||r.summary||'—';const src=r.source||r.type||'';const date=r.date||(r.created_at?new Date(r.created_at).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'2-digit'}):'');return`<div class="ib-news-item"><div class="ib-news-dot" style="background:${dotColor}"></div><div class="ib-news-body">${url?`<a class="ib-news-title" href="${url}" target="_blank">${title} ↗</a>`:`<div class="ib-news-title" style="cursor:default">${title}</div>`}<div class="ib-news-meta"><span class="ib-news-src">${src}</span><span class="ib-news-date">${date}</span></div></div></div>`;}).join('');let html='';if(live.length){html+=`<div style="display:flex;align-items:center;gap:5px;margin-bottom:6px"><span class="live-label"><span class="live-dot"></span>Live — Google News</span><span style="font-family:'IBM Plex Mono',monospace;font-size:7px;color:var(--t4)">${live.length} results</span></div>${itemHtml(live,'#E53935')}`;}if(storedItems.length){if(live.length)html+=`<div style="height:10px;border-top:1px solid var(--rule2);margin:8px 0"></div>`;html+=`<div style="font-family:'IBM Plex Mono',monospace;font-size:7px;font-weight:600;text-transform:uppercase;letter-spacing:.07em;color:var(--t3);margin-bottom:6px">📁 Stored</div>${itemHtml(storedItems,'var(--g)')}`;}body.innerHTML=html;}
export async function bgRefreshIntel(){const c=S.currentCompany;if(!c)return;const body=document.getElementById('ib-intel-body'),btn=document.getElementById('ib-intel-refresh');if(body)body.innerHTML=`<div class="ib-loading" style="text-align:left">Fetching news…</div>`;if(btn)btn.textContent='↻ Loading…';const slug=_slug(c.name);const[storedRes,liveRes]=await Promise.allSettled([fetch(`${SB_URL}/rest/v1/intelligence?company_id=eq.${slug}&type=eq.press_links`,{headers:{apikey:SB_KEY,Authorization:`Bearer ${SB_KEY}`}}).then(r=>r.json()),fetchGoogleNews(c.name)]);const stored=storedRes.status==='fulfilled'&&Array.isArray(storedRes.value)?storedRes.value:[];const live=liveRes.status==='fulfilled'?liveRes.value:[];renderIntelBody(stored,live);if(live.length)saveIntelligence(slug,live);if(btn)btn.textContent='↺ Refresh';}
export async function loadIntelligence(slug,name){const body=document.getElementById('ib-intel-body');if(!body)return;const[storedRes,liveRes]=await Promise.allSettled([fetch(`${SB_URL}/rest/v1/intelligence?company_id=eq.${slug}&type=eq.press_links`,{headers:{apikey:SB_KEY,Authorization:`Bearer ${SB_KEY}`}}).then(r=>r.json()),fetchGoogleNews(name)]);const stored=storedRes.status==='fulfilled'&&Array.isArray(storedRes.value)?storedRes.value:[];const live=liveRes.status==='fulfilled'?liveRes.value:[];renderIntelBody(stored,live);if(live.length)saveIntelligence(slug,live);}

/* ═══ Relations ══════════════════════════════════════════════ */
let _relCache=[];let _relView='list';
window.setRelView=function(v){_relView=v;const listEl=document.getElementById('ib-rels-list');const graphEl=document.getElementById('ib-rels-graph');const btnL=document.getElementById('ib-rel-btn-list');const btnG=document.getElementById('ib-rel-btn-graph');if(!listEl||!graphEl)return;listEl.style.display=v==='list'?'':'none';graphEl.style.display=v==='graph'?'':'none';if(btnL){btnL.className='ib-ct-btn'+(v==='list'?' active':'');}if(btnG){btnG.className='ib-ct-btn'+(v==='graph'?' active':'');}if(v==='graph'&&_relCache.length)renderRelGraph();};

export async function loadRelationsBrief(slug){
  const body=document.getElementById('ib-rels-body'),cnt=document.getElementById('ib-rels-cnt');if(!body)return;
  try{
    const res=await fetch(`${SB_URL}/rest/v1/company_relations?or=(from_company.eq.${slug},to_company.eq.${slug})&select=*`,{headers:{apikey:SB_KEY,Authorization:`Bearer ${SB_KEY}`}});
    const rels=await res.json();
    _relCache=Array.isArray(rels)?rels:[];
    if(!_relCache.length){body.innerHTML=`<div style="font-size:11px;color:var(--t3)">No relations recorded</div>`;if(cnt)cnt.textContent='';return;}
    if(cnt)cnt.textContent=_relCache.length;
    const coMap={};S.companies.forEach(x=>{if(x.name)coMap[_slug(x.name)]=x;});
    const TL={data_partner:'Data Partner',dsp_integration:'DSP Integration',marketplace_listed:'Marketplace',tech_integration:'Tech Integration',client_of:'Client Of',acquired_by:'Acquired By',subsidiary_of:'Subsidiary Of',competes_with:'Competes With',co_sell:'Co-Sell',reseller:'Reseller'};
    /* toggle bar + containers */
    const listHtml=_relCache.map(r=>{const isSrc=r.from_company===slug;const oid=isSrc?r.to_company:r.from_company;const co=coMap[oid];const arrow=r.direction==='bidirectional'?'⇄':(isSrc?'→':'←');const nameDisp=co?.name||oid;const type=TL[r.relation_type]||r.relation_type;return`<div class="ib-rel-item"><div class="ib-rel-arrow">${arrow}</div>${co?`<div class="ib-rel-name" data-slug="${oid}" onclick="openBySlug(this.dataset.slug)">${nameDisp}</div>`:`<div class="ib-rel-name no-link">${nameDisp}</div>`}<div class="ib-rel-type">${type}</div><span class="tag ${r.strength==='confirmed'?'tc':'tpr'}" style="flex-shrink:0">${r.strength||'—'}</span></div>${r.notes?`<div class="ib-rel-notes">${r.notes}</div>`:''}`;}).join('');
    body.innerHTML=`<div style="display:flex;gap:3px;margin-bottom:8px"><button id="ib-rel-btn-list" class="ib-ct-btn active" onclick="setRelView('list')" style="height:20px;padding:0 8px;font-size:7px">☰ List</button><button id="ib-rel-btn-graph" class="ib-ct-btn" onclick="setRelView('graph')" style="height:20px;padding:0 8px;font-size:7px">◎ Graph</button></div><div id="ib-rels-list">${listHtml}</div><div id="ib-rels-graph" style="display:none"></div>`;
    _relView='list';
  }catch(e){body.innerHTML=`<div style="font-size:11px;color:var(--t3)">Error loading relations</div>`;}
}

/* ═══ Force-directed Relation Graph ═════════════════════════ */
function renderRelGraph(){
  const container=document.getElementById('ib-rels-graph');if(!container||!_relCache.length)return;
  const slug=_slug(S.currentCompany?.name||'');
  const coMap={};S.companies.forEach(x=>{if(x.name)coMap[_slug(x.name)]=x;});

  /* build nodes + edges */
  const nodeSet=new Map();
  const addNode=(id)=>{if(!nodeSet.has(id)){const co=coMap[id];nodeSet.set(id,{id,name:co?.name||id,type:co?.type||'unknown',isCenter:id===slug,inDB:!!co});}};
  addNode(slug);
  const edges=[];
  _relCache.forEach(r=>{
    addNode(r.from_company);addNode(r.to_company);
    edges.push({source:r.from_company,target:r.to_company,type:r.relation_type,strength:r.strength,direction:r.direction});
  });
  const nodes=[...nodeSet.values()];

  /* layout dimensions */
  const W=620,H=Math.max(320,nodes.length*18);
  container.innerHTML=`<svg id="rel-svg" viewBox="0 0 ${W} ${H}" width="100%" style="max-height:440px;border:1px solid var(--rule);border-radius:2px;background:var(--surf2);cursor:grab"><defs><marker id="rel-arr" viewBox="0 0 10 10" refX="22" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse"><path d="M2 1L8 5L2 9" fill="none" stroke="var(--t3)" stroke-width="1.5" stroke-linecap="round"/></marker></defs></svg>`;
  const svg=document.getElementById('rel-svg');if(!svg)return;

  /* color by relation type */
  const typeColors={data_partner:'var(--g)',dsp_integration:'var(--pc)',marketplace_listed:'var(--prc)',tech_integration:'var(--poc)',client_of:'var(--cc)',acquired_by:'var(--nc)',subsidiary_of:'var(--nc)',competes_with:'#F87171',co_sell:'var(--g)',reseller:'var(--prc)'};

  /* init positions — center node in middle, others in circle */
  const cx=W/2,cy=H/2;
  nodes.forEach((n,i)=>{
    if(n.isCenter){n.x=cx;n.y=cy;n.fx=cx;n.fy=cy;}
    else{const a=(2*Math.PI*i)/nodes.length;const r=Math.min(W,H)*0.35;n.x=cx+r*Math.cos(a)+Math.random()*20;n.y=cy+r*Math.sin(a)+Math.random()*20;}
    n.vx=0;n.vy=0;
  });

  /* simple force sim */
  const nodeById=new Map(nodes.map(n=>[n.id,n]));
  function tick(){
    /* repulsion between all nodes */
    for(let i=0;i<nodes.length;i++){
      for(let j=i+1;j<nodes.length;j++){
        let dx=nodes[j].x-nodes[i].x,dy=nodes[j].y-nodes[i].y;
        let dist=Math.sqrt(dx*dx+dy*dy)||1;
        let force=800/(dist*dist);
        let fx=dx/dist*force,fy=dy/dist*force;
        if(!nodes[i].fx){nodes[i].vx-=fx;nodes[i].vy-=fy;}
        if(!nodes[j].fx){nodes[j].vx+=fx;nodes[j].vy+=fy;}
      }
    }
    /* attraction along edges */
    edges.forEach(e=>{
      const s=nodeById.get(e.source),t=nodeById.get(e.target);if(!s||!t)return;
      let dx=t.x-s.x,dy=t.y-s.y,dist=Math.sqrt(dx*dx+dy*dy)||1;
      let force=(dist-120)*0.02;
      let fx=dx/dist*force,fy=dy/dist*force;
      if(!s.fx){s.vx+=fx;s.vy+=fy;}
      if(!t.fx){t.vx-=fx;t.vy-=fy;}
    });
    /* gravity toward center */
    nodes.forEach(n=>{
      if(n.fx)return;
      n.vx+=(cx-n.x)*0.003;n.vy+=(cy-n.y)*0.003;
      n.vx*=0.85;n.vy*=0.85;
      n.x+=n.vx;n.y+=n.vy;
      n.x=Math.max(40,Math.min(W-40,n.x));n.y=Math.max(25,Math.min(H-25,n.y));
    });
  }
  for(let i=0;i<120;i++)tick();

  /* render edges */
  edges.forEach(e=>{
    const s=nodeById.get(e.source),t=nodeById.get(e.target);if(!s||!t)return;
    const line=document.createElementNS('http://www.w3.org/2000/svg','line');
    line.setAttribute('x1',s.x);line.setAttribute('y1',s.y);
    line.setAttribute('x2',t.x);line.setAttribute('y2',t.y);
    line.setAttribute('stroke',typeColors[e.type]||'var(--rule)');
    line.setAttribute('stroke-width',e.strength==='confirmed'?'1.5':'1');
    if(e.strength!=='confirmed')line.setAttribute('stroke-dasharray','4 3');
    if(e.direction!=='bidirectional')line.setAttribute('marker-end','url(#rel-arr)');
    svg.appendChild(line);
    /* edge label */
    const TL={data_partner:'partner',dsp_integration:'DSP',marketplace_listed:'mkt',tech_integration:'tech',client_of:'client',acquired_by:'acq',subsidiary_of:'sub',competes_with:'compete',co_sell:'co-sell',reseller:'resell'};
    const lbl=document.createElementNS('http://www.w3.org/2000/svg','text');
    lbl.setAttribute('x',(s.x+t.x)/2);lbl.setAttribute('y',(s.y+t.y)/2-4);
    lbl.setAttribute('text-anchor','middle');lbl.setAttribute('font-family','IBM Plex Mono,monospace');
    lbl.setAttribute('font-size','6');lbl.setAttribute('fill','var(--t3)');
    lbl.textContent=TL[e.type]||e.type;
    svg.appendChild(lbl);
  });

  /* render nodes */
  nodes.forEach(n=>{
    const g=document.createElementNS('http://www.w3.org/2000/svg','g');
    g.style.cursor=n.inDB?'pointer':'default';
    if(n.inDB)g.addEventListener('click',()=>openBySlug(n.id));

    const r=n.isCenter?20:13;
    const circle=document.createElementNS('http://www.w3.org/2000/svg','circle');
    circle.setAttribute('cx',n.x);circle.setAttribute('cy',n.y);circle.setAttribute('r',r);
    if(n.isCenter){circle.setAttribute('fill','var(--g)');circle.setAttribute('stroke','var(--gd)');circle.setAttribute('stroke-width','1.5');}
    else{
      const tc={client:'var(--cb)',partner:'var(--pb)',prospect:'var(--prb)',nogo:'var(--nb)',poc:'var(--pob)'};
      const ts={client:'var(--cr)',partner:'var(--pr)',prospect:'var(--prr)',nogo:'var(--nr)',poc:'var(--por)'};
      circle.setAttribute('fill',tc[n.type]||'var(--surf)');
      circle.setAttribute('stroke',ts[n.type]||'var(--rule)');
      circle.setAttribute('stroke-width','1');
    }
    g.appendChild(circle);

    /* initials inside node */
    const ini2=document.createElementNS('http://www.w3.org/2000/svg','text');
    ini2.setAttribute('x',n.x);ini2.setAttribute('y',n.y+(n.isCenter?1:1));
    ini2.setAttribute('text-anchor','middle');ini2.setAttribute('dominant-baseline','central');
    ini2.setAttribute('font-family','IBM Plex Mono,monospace');
    ini2.setAttribute('font-size',n.isCenter?'8':'7');
    ini2.setAttribute('font-weight','600');
    ini2.setAttribute('fill',n.isCenter?'#fff':'var(--t2)');
    ini2.textContent=ini(n.name);
    g.appendChild(ini2);

    /* name label */
    const lbl=document.createElementNS('http://www.w3.org/2000/svg','text');
    lbl.setAttribute('x',n.x);lbl.setAttribute('y',n.y+r+10);
    lbl.setAttribute('text-anchor','middle');
    lbl.setAttribute('font-family','IBM Plex Mono,monospace');
    lbl.setAttribute('font-size',n.isCenter?'9':'8');
    lbl.setAttribute('font-weight',n.isCenter?'600':'400');
    lbl.setAttribute('fill',n.isCenter?'var(--g)':'var(--t1)');
    const dispName=n.name.length>16?n.name.slice(0,14)+'…':n.name;
    lbl.textContent=dispName;
    g.appendChild(lbl);

    /* hover effects */
    g.addEventListener('mouseenter',()=>{circle.setAttribute('stroke','var(--g)');circle.setAttribute('stroke-width','2');lbl.setAttribute('fill','var(--g)');});
    g.addEventListener('mouseleave',()=>{if(!n.isCenter){circle.setAttribute('stroke',{client:'var(--cr)',partner:'var(--pr)',prospect:'var(--prr)',nogo:'var(--nr)',poc:'var(--por)'}[n.type]||'var(--rule)');circle.setAttribute('stroke-width','1');}else{circle.setAttribute('stroke','var(--gd)');circle.setAttribute('stroke-width','1.5');}lbl.setAttribute('fill',n.isCenter?'var(--g)':'var(--t1)');});

    svg.appendChild(g);
  });
}

/* ═══ Navigation helpers ═════════════════════════════════════ */
export function openBySlug(s){const c=S.companies.find(x=>_slug(x.name)===s);if(c)openCompany(c);}
export function showCtxSlug(e,el){e.preventDefault();e.stopPropagation();showCtx(e,el.dataset.slug);}

/* ═══ Context Menu ═══════════════════════════════════════════ */
export function showCtx(e,slugOrName){e.preventDefault();e.stopPropagation();const co=S.companies.find(x=>_slug(x.name)===slugOrName)||S.companies.find(x=>x.name===slugOrName);const name=co?.name||slugOrName;const menu=document.getElementById('ctxMenu');const actions=[{icon:'🔍',text:'Full contact report',fn:()=>openClaude(`Research ${name} — full contact report`)},{icon:'👤',text:'Find decision makers',fn:()=>{openCompany(co);setTimeout(bgFindDMs,200);}},{icon:'✉',text:'Draft outreach email',fn:()=>window.openComposer({company:name,note:co?.note,status:co?.type,description:co?.description||'',angle:co?.outreach_angle||''})},{icon:'💬',text:'LinkedIn message',fn:()=>openClaude(`Draft LinkedIn message for ${name}`)},{icon:'🔗',text:'Find similar',fn:()=>openClaude(`Find companies similar to ${name}`)},{icon:'📧',text:'Email history',fn:()=>openClaude(`Check Gmail history with ${name}`)},];if(co?.type==='nogo')actions.push({icon:'⚠️',text:'Why no outreach?',fn:()=>openClaude(`Why is ${name} marked no-outreach?`)});if(co?.type==='prospect')actions.push({icon:'🚀',text:'Prioritize',fn:()=>openClaude(`Priority outreach plan for ${name}`)});menu.innerHTML=`<div class="ctx-label">${name}</div><div class="ctx-sep"></div>`+actions.map((a,i)=>`<div class="ctx-item" data-i="${i}"><span class="ctx-ico">${a.icon}</span>${a.text}</div>`).join('');menu.querySelectorAll('.ctx-item').forEach((el,i)=>{el.addEventListener('click',()=>{menu.style.display='none';actions[i].fn();});});const x=Math.min(e.clientX,window.innerWidth-230),y=Math.min(e.clientY,window.innerHeight-actions.length*34-20);menu.style.left=x+'px';menu.style.top=y+'px';menu.style.display='block';}

/* ═══ Contact Drawer ═════════════════════════════════════════ */
export function openDrawer(ctId){const ct=S.contacts.find(c=>c.id===ctId||(c.full_name&&_slug(c.full_name)===ctId));if(!ct)return;S.currentContact=ct;const av=getAv(ct.full_name||''),n=ini(ct.full_name||'');const el=document.getElementById('drAv');el.textContent=n;el.style.background=av.bg;el.style.color=av.fg;document.getElementById('drName').textContent=ct.full_name||'—';document.getElementById('drSub').textContent=(ct.title||'')+(ct.company_name?' · '+ct.company_name:'');const flds=[[ct.email,'Email',`<a href="mailto:${ct.email}" style="color:var(--g);font-family:'IBM Plex Mono',monospace;font-size:9px">${ct.email}</a>`],[ct.linkedin_url,'LinkedIn',`<a href="${ct.linkedin_url}" target="_blank" style="color:var(--g);font-family:'IBM Plex Mono',monospace;font-size:9px">${ct.linkedin_url}</a>`],[ct.notes,'Notes',ct.notes]].filter(f=>f[0]);document.getElementById('drBody').innerHTML=flds.map(([,l,v])=>`<div class="dr-field"><label>${l}</label><p>${v}</p></div>`).join('');document.getElementById('ctDrawer').classList.add('open');document.getElementById('ctDrawerOverlay').classList.add('vis');}
export function closeDrawer(){document.getElementById('ctDrawer').classList.remove('open');document.getElementById('ctDrawerOverlay').classList.remove('vis');S.currentContact=null;}
export function drEmail(){if(S.currentContact)window.openComposer({company:S.currentContact.company_name,contactName:S.currentContact.full_name,contactTitle:S.currentContact.title,linkedin:S.currentContact.linkedin_url});}
export function drLinkedIn(){if(S.currentContact?.linkedin_url)window.open(S.currentContact.linkedin_url,'_blank');}
export function drGmail(){if(S.currentContact)openClaude(`Gmail history with ${S.currentContact.full_name} at ${S.currentContact.company_name||''}`);}
export function drResearch(){if(S.currentContact)openClaude(`Full research on ${S.currentContact.full_name} at ${S.currentContact.company_name||''}`);}

/* ═══ Modals ═════════════════════════════════════════════════ */
export function promptResearch(){S._modalMode='research';document.getElementById('modalTitle').textContent='Research a Company';document.getElementById('modalDesc').textContent='Enter company name to generate a full contact report.';document.getElementById('modalInput').value='';document.getElementById('overlay').classList.add('vis');setTimeout(()=>document.getElementById('modalInput').focus(),60);}
export function promptSimilar(){S._modalMode='similar';document.getElementById('modalTitle').textContent='Find Similar Companies';document.getElementById('modalDesc').textContent='Enter a reference company to find lookalikes.';document.getElementById('modalInput').value='';document.getElementById('overlay').classList.add('vis');setTimeout(()=>document.getElementById('modalInput').focus(),60);}
export function closeModal(){document.getElementById('overlay').classList.remove('vis');}
export function submitModal(){const v=document.getElementById('modalInput').value.trim();if(!v)return;closeModal();if(S._modalMode==='similar')openClaude(`Find companies similar to ${v} for onAudience data partnerships`);else openClaude(`Research ${v} — full contact report with decision makers, outreach angle, and ICP fit score`);}
export function openClaude(p){window.open('https://claude.ai/new?q='+encodeURIComponent(p),'_blank');}
