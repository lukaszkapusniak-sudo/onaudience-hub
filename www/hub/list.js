/* ═══ list.js — Company list rendering, filters, tags, sort ═══ */

import { SB_URL, TAG_RULES } from './config.js?v=20260409zr';
import S from './state.js?v=20260409zr';
import { classify, _slug, getCoTags, getAv, ini, tClass, tLabel, stars, esc, relTime, authHdr, safeUrl } from './utils.js?v=20260409zr';
import { anthropicFetch } from './api.js?v=20260409zr';
import { openCompany, sortCompanies, boldKw, completeness, clog } from './hub.js?v=20260409zr';

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
export function renderMetaPills(){const el=document.getElementById('metaPills');const parts=[];S.activeTags.forEach(t=>{parts.push(`<span class="m-pill tag" data-tag="${t.replace(/"/g,'&quot;')}" onclick="toggleTagEl(this)" title="Remove">${t}</span>`);});if(S.aiSet){parts.push(`<span class="m-pill ai" onclick="clearAI()" title="Clear AI">AI: ${S.aiSet.size}</span>`);}el.innerHTML=parts.join('');}

/* ═══ Tabs / Filter / Search ═════════════════════════════════ */
export function setFilter(f,el){S.activeFilter=f;document.querySelectorAll('.f-chip').forEach(c=>c.classList.remove('active'));if(el&&el.classList)el.classList.add('active');const sm={all:'sbAll',client:'sbClient',poc:'sbPoc',partner:'sbPartner',prospect:'sbProspect',nogo:'sbNogo',fresh:'sbFresh'};document.querySelectorAll('.sb-col').forEach(c=>c.classList.remove('active'));const s=document.getElementById(sm[f]);if(s)s.classList.add('active');if(S.tagPanelOpen)renderTagPanel();renderList();}
export function onSearch(){S.searchQ=document.getElementById('searchInput').value.toLowerCase().trim();if(S.tagPanelOpen)renderTagPanel();renderList();}

/* ═══ Console ════════════════════════════════════════════════ */
export function setSort(v){S.sortBy=v;renderList();}
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
