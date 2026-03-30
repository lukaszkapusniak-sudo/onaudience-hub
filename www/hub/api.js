/* ═══ api.js — Supabase, status, stats, Google News, Anthropic ═══ */

import { SB_URL, HDR, NOMINATIM_URL, MODEL_RESEARCH } from './config.js?v=20260330c';
import S from './state.js';
import { classify, _slug, authHdr } from './utils.js';



/* ── clog — console logger proxy ─────────────────────────────
   clog lives in hub.js but other modules (audiences.js, prospect.js)
   import it from here. We proxy through window.clog which hub.js
   sets up via app.js. Falls back to console.log if not yet available.
   ─────────────────────────────────────────────────────────── */
export function clog(type, msg){
  if(typeof window.clog === 'function'){
    window.clog(type, msg);
  } else {
    console.log(`[${type}]`, msg);
  }
}

/* ── Anthropic API key management ─────────────────────────────
   Key stored in localStorage under 'oaAnthropicKey'.
   UI: clicking the 🔑 nav button toggles an inline panel —
   no browser prompt(), no page disruption.
   ─────────────────────────────────────────────────────────── */
export function getApiKey(){ return localStorage.getItem('oaAnthropicKey')||''; }
export function setApiKey(k){ if(k)localStorage.setItem('oaAnthropicKey',k); else localStorage.removeItem('oaAnthropicKey'); }
export function hasApiKey(){ return !!getApiKey(); }

export function updateKeyBtn(){
  const btn=document.getElementById('apiKeyBtn');
  if(!btn)return;
  const has=hasApiKey();
  btn.style.color=has?'var(--cc)':'var(--prc)';
  btn.title=has?'Anthropic key set — click to change':'Set Anthropic API key';
}

export function promptApiKey(){
  // Open the inline panel instead of browser prompt
  toggleKeyPanel(true);
  return false; // caller should await panel, not prompt
}

export function toggleKeyPanel(forceOpen){
  let panel=document.getElementById('keyPanel');
  if(!panel){
    panel=document.createElement('div');
    panel.id='keyPanel';
    panel.innerHTML=`
<div id="keyPanelInner">
  <div class="kp-head">
    <span class="kp-title">🔑 Anthropic API Key</span>
    <button class="btn sm" onclick="toggleKeyPanel(false)" style="margin-left:auto">✕</button>
  </div>
  <div class="kp-body">
    <div class="kp-desc">Used for AI features (Find DMs, Gen Angle, AI filter). Stored in your browser only — never sent to any server except Anthropic.</div>
    <div class="kp-row">
      <input id="keyPanelInp" class="kp-inp" type="password" placeholder="sk-ant-api03-…" autocomplete="off" spellcheck="false"/>
      <button class="btn sm p" onclick="saveKeyPanel()">Save</button>
      <button class="btn sm" onclick="clearKeyPanel()" title="Remove key" style="color:var(--prc)">✕</button>
    </div>
    <div id="keyPanelStatus" class="kp-status"></div>
  </div>
</div>`;
    document.body.appendChild(panel);
    panel.addEventListener('click', e => { if(e.target===panel) toggleKeyPanel(false); });
    document.getElementById('keyPanelInp').addEventListener('keydown', e => {
      if(e.key==='Enter') saveKeyPanel();
      if(e.key==='Escape') toggleKeyPanel(false);
    });
  }
  const inp=document.getElementById('keyPanelInp');
  const current=getApiKey();
  if(current) inp.placeholder='sk-ant-•••••••'+current.slice(-6);
  inp.value='';
  document.getElementById('keyPanelStatus').textContent='';
  const open=forceOpen===true||(forceOpen===undefined&&panel.style.display==='none');
  panel.style.display=open?'flex':'none';
  if(open) setTimeout(()=>inp.focus(),60);
}

export function saveKeyPanel(){
  const v=(document.getElementById('keyPanelInp')?.value||'').trim();
  const st=document.getElementById('keyPanelStatus');
  if(!v){if(st)st.textContent='Enter a key first.';return;}
  if(!v.startsWith('sk-ant-')){if(st){st.textContent='Key should start with sk-ant-';st.style.color='var(--prc)';}return;}
  setApiKey(v);
  updateKeyBtn();
  if(st){st.textContent='✓ Key saved';st.style.color='var(--cc)';}
  setTimeout(()=>toggleKeyPanel(false),800);
}

export function clearKeyPanel(){
  setApiKey('');
  updateKeyBtn();
  const inp=document.getElementById('keyPanelInp');
  if(inp){inp.value='';inp.placeholder='sk-ant-api03-…';}
  const st=document.getElementById('keyPanelStatus');
  if(st){st.textContent='Key removed';st.style.color='var(--t3)';}
}

/* ── Anthropic fetch helper (retries on 429/529) ──────────── */
export async function anthropicFetch(body){
  const key=getApiKey();
  if(!key){if(!promptApiKey())throw new Error('API key required — click 🔑 in the nav bar');}
  const maxRetries=3;
  for(let attempt=0;attempt<maxRetries;attempt++){
    const res=await fetch('https://api.anthropic.com/v1/messages',{
      method:'POST',
      headers:{
        'Content-Type':'application/json',
        'x-api-key':getApiKey(),
        'anthropic-version':'2023-06-01',
        'anthropic-dangerous-direct-browser-access':'true',
      },
      body:JSON.stringify(body),
    });
    if(res.status===529||res.status===429){
      const wait=Math.min(2000*Math.pow(2,attempt),10000);
      console.warn(`[API] ${res.status} — retry ${attempt+1}/${maxRetries} in ${wait}ms`);
      await new Promise(r=>setTimeout(r,wait));
      continue;
    }
    if(!res.ok){const txt=await res.text().catch(()=>'');throw new Error(`API ${res.status}: ${txt.slice(0,200)}`);}
    return res.json();
  }
  throw new Error('API overloaded after 3 retries — try again in a minute');
}

/* ── Research fetch — Opus + web_search, extracts text from multi-block responses ── */
export async function researchFetch(system, userPrompt){
  const data = await anthropicFetch({
    model: MODEL_RESEARCH,
    max_tokens: 1600,
    system,
    tools: [{ type: 'web_search_20250305', name: 'web_search' }],
    messages: [{ role: 'user', content: userPrompt }],
  });
  const textParts = (data.content || []).filter(b => b.type === 'text').map(b => b.text);
  return { raw: data, text: textParts.join('\n').trim(), content: data.content };
}

/* ══════════════════════════════════════════════════════════════
   ── enrich_cache — read/write/invalidate ────────────────────
   
   TTL guide (ttl_hours):
     contact_report   168  (7 days)
     web_research      72  (3 days)
     press_links      336  (14 days)
     tech_stack       720  (30 days)
     gmail_history     24  (1 day)
     outreach_angle   336  (14 days)
   ══════════════════════════════════════════════════════════════ */

/**
 * cacheGet — returns parsed data if a fresh cache entry exists, else null.
 * @param {string} companyId  — companies.id slug
 * @param {string} source     — cache key, e.g. 'contact_report'
 * @returns {object|null}
 */
export async function cacheGet(companyId, source){
  try {
    const url = `${SB_URL}/rest/v1/enrich_cache`
      + `?company_id=eq.${encodeURIComponent(companyId)}`
      + `&source=eq.${encodeURIComponent(source)}`
      + `&order=fetched_at.desc&limit=1`;
    const res = await fetch(url, { headers: authHdr() });
    if (!res.ok) return null;
    const rows = await res.json();
    if (!rows.length) return null;
    const row = rows[0];
    /* TTL check — fetched_at + ttl_hours > now */
    const fetchedMs = new Date(row.fetched_at).getTime();
    const ttlMs = (row.ttl_hours || 168) * 3600 * 1000;
    if (Date.now() > fetchedMs + ttlMs) {
      if (window.clog) window.clog('db', `Cache STALE — ${companyId}:${source}`);
      return null;
    }
    if (window.clog) window.clog('db', `Cache HIT ✅ — ${companyId}:${source} (saved ~tokens)`);
    return row.data;
  } catch(e) {
    console.warn('cacheGet error', e);
    return null;
  }
}

/**
 * cacheSet — upserts a cache entry. Replaces existing same company+source row.
 * @param {string} companyId
 * @param {string} source
 * @param {object} data       — any JSON-serialisable payload
 * @param {number} ttlHours   — default 168 (7 days)
 */
export async function cacheSet(companyId, source, data, ttlHours = 168){
  try {
    /* Delete existing entry for same company+source first (clean upsert) */
    await fetch(
      `${SB_URL}/rest/v1/enrich_cache?company_id=eq.${encodeURIComponent(companyId)}&source=eq.${encodeURIComponent(source)}`,
      { method: 'DELETE', headers: authHdr() }
    );
    const res = await fetch(`${SB_URL}/rest/v1/enrich_cache`, {
      method: 'POST',
      headers: authHdr({'Prefer':'resolution=merge-duplicates,return=minimal'}),
      body: JSON.stringify({ company_id: companyId, source, data, ttl_hours: ttlHours, fetched_at: new Date().toISOString() }),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      console.warn('cacheSet failed', res.status, txt.slice(0, 200));
      return false;
    }
    if (window.clog) window.clog('db', `Cache SET — ${companyId}:${source} TTL=${ttlHours}h`);
    return true;
  } catch(e) {
    console.warn('cacheSet error', e);
    return false;
  }
}

/**
 * cacheInvalidate — force-clears one or all sources for a company.
 * Pass source=null to wipe everything for that company.
 * @param {string} companyId
 * @param {string|null} source
 */
export async function cacheInvalidate(companyId, source = null){
  try {
    let url = `${SB_URL}/rest/v1/enrich_cache?company_id=eq.${encodeURIComponent(companyId)}`;
    if (source) url += `&source=eq.${encodeURIComponent(source)}`;
    await fetch(url, { method: 'DELETE', headers: authHdr() });
    if (window.clog) window.clog('db', `Cache INVALIDATED — ${companyId}${source ? ':'+source : ' (all)'}`);
  } catch(e) {
    console.warn('cacheInvalidate error', e);
  }
}

/**
 * withCache — convenience wrapper: returns cached data or runs fn(), stores result.
 * Usage:
 *   const result = await withCache(companyId, 'outreach_angle', 336, async () => {
 *     return await generateAngle(company);
 *   });
 *
 * @param {string}   companyId
 * @param {string}   source
 * @param {number}   ttlHours
 * @param {Function} fn        — async function that returns the data to cache
 * @returns {object}
 */
export async function withCache(companyId, source, ttlHours, fn){
  const hit = await cacheGet(companyId, source);
  if (hit !== null) return hit;
  const result = await fn();
  if (result !== null && result !== undefined) {
    await cacheSet(companyId, source, result, ttlHours);
  }
  return result;
}

/* ── Status ───────────────────────────────────────────────── */
export function setStatus(live){
  const el=document.getElementById('dbStatus');
  if(!el) return;
  const loaded=S.companies.length;
  const total=S.totalCompaniesInDb||0;
  const countStr = total && total>loaded ? `${loaded} / ${total}` : `${loaded}`;
  if(live){ el.textContent=`● Live · ${countStr}`; el.className='nav-status live'; }
  else     { el.textContent=`○ ${countStr}`;         el.className='nav-status'; }
}

/* ── Load from Supabase (companies + contacts + relations in parallel) ── */
/* ── loadFromSupabase — paginated streaming ──────────────────
   Page 1 (200 rows) loads first → renders immediately.
   Remaining pages load silently in background, list grows.
   Order: ICP DESC, richness DESC → best accounts always first.
   ─────────────────────────────────────────────────────────── */
const _PAGE = 200;

export async function loadFromSupabase(renderStats,renderList,renderTagPanel){
  try{
    const hdr1 = authHdr({'Range':`0-${_PAGE-1}`,'Prefer':'count=exact'});
    const hdrCt = authHdr({'Range':'0-4999','Prefer':'count=exact'});
    const[cr,ct,rl] = await Promise.all([
      fetch(`${SB_URL}/rest/v1/companies?select=*&order=icp.desc.nullslast,data_richness.desc,updated_at.desc.nullslast`,{headers:hdr1}),
      fetch(`${SB_URL}/rest/v1/contacts?select=*&order=full_name.asc`,{headers:hdrCt}),
      fetch(`${SB_URL}/rest/v1/company_relations?select=*`,{headers:authHdr()}),
    ]);
    if(!cr.ok) throw new Error(`HTTP ${cr.status}`);
    const dbc=await cr.json(), dbt=ct.ok?await ct.json():[], dbr=rl.ok?await rl.json():[];
    const total=parseInt((cr.headers.get('content-range')||'').match(/\/(\d+)/)?.[1]||0);
    S.totalCompaniesInDb=total;
    if(Array.isArray(dbc)&&dbc.length) S.companies=dbc.map(r=>({...r,type:r.type||classify(r.note||''),note:r.note||''}));
    if(Array.isArray(dbt)) S.contacts=dbt;
    if(Array.isArray(dbr)) S.allRelations=dbr;
    setStatus(true);
    renderStats();renderList();if(S.tagPanelOpen)renderTagPanel();
    if(window.clog) window.clog('db',`<b>${S.companies.length}</b> / ${total} companies · <b>${S.contacts.length}</b> contacts — loading remaining…`);
    if(total>_PAGE) _loadRemainingPages(total,renderStats,renderList,renderTagPanel);
  }catch(e){
    console.warn('[load]',e.message);
    setStatus(false);
    if(window.clog) window.clog('db',`Load failed — ${e.message}`);
    renderStats();renderList();
  }
}

async function _loadRemainingPages(total,renderStats,renderList,renderTagPanel){
  let offset=_PAGE;
  while(offset<total){
    const end=Math.min(offset+_PAGE-1,total-1);
    try{
      const r=await fetch(
        `${SB_URL}/rest/v1/companies?select=*&order=icp.desc.nullslast,data_richness.desc,updated_at.desc.nullslast`,
        {headers:authHdr({'Range':`${offset}-${end}`})}
      );
      if(!r.ok) break;
      const page=await r.json();
      if(!Array.isArray(page)||!page.length) break;
      S.companies=[...S.companies,...page.map(r=>({...r,type:r.type||classify(r.note||''),note:r.note||''}))];
      setStatus(true);
      renderStats();renderList();if(S.tagPanelOpen)renderTagPanel();
    }catch(e){ break; }
    offset+=_PAGE;
  }
  if(window.clog) window.clog('db',`✓ All loaded: <b>${S.companies.length}</b> / ${total} companies`);
}

/* ── Refresh relations cache only ─────────────────────────── */
export async function refreshRelationsCache(){
  try{
    const r=await fetch(`${SB_URL}/rest/v1/company_relations?select=*`,{headers:authHdr()});
    const data=await r.json();
    if(Array.isArray(data)){S.allRelations=data;if(window.clog)window.clog('db',`Relations refreshed: <b>${data.length}</b> rows`);}
    return data;
  }catch(e){console.warn('relations refresh',e);return S.allRelations;}
}

/* ── Save ─────────────────────────────────────────────────── */
export async function saveCompany(r){return fetch(`${SB_URL}/rest/v1/companies`,{method:'POST',headers:authHdr({'Prefer':'resolution=merge-duplicates,return=minimal'}),body:JSON.stringify(r)});}
export async function saveContact(r){return fetch(`${SB_URL}/rest/v1/contacts`,{method:'POST',headers:authHdr({'Prefer':'resolution=merge-duplicates,return=minimal'}),body:JSON.stringify(r)});}

/* ── Stats ────────────────────────────────────────────────── */
export function renderStats(){
  const t30=Date.now()-30*24*60*60*1000,cids=new Set(S.contacts.map(c=>_slug(c.company_name||'')));
  const fresh=S.companies.filter(c=>c.type==='prospect'&&(!c.updated_at||new Date(c.updated_at).getTime()<t30)&&!cids.has(_slug(c.name))).length;
  document.getElementById('stAll').textContent=S.totalCompaniesInDb||S.companies.length;
  document.getElementById('stClient').textContent=S.companies.filter(c=>c.type==='client').length;
  document.getElementById('stPoc').textContent=S.companies.filter(c=>c.type==='poc').length;
  document.getElementById('stPartner').textContent=S.companies.filter(c=>c.type==='partner').length;
  document.getElementById('stProspect').textContent=S.companies.filter(c=>c.type==='prospect').length;
  document.getElementById('stNogo').textContent=S.companies.filter(c=>c.type==='nogo').length;
  document.getElementById('stFresh').textContent=fresh;
}

/* ── Google News ──────────────────────────────────────────── */
export async function fetchGoogleNews(name){
  const q=encodeURIComponent(`"${name}" programmatic OR "data partnership" OR adtech`);
  const proxy=`https://corsproxy.io/?url=${encodeURIComponent('https://news.google.com/rss/search?q='+q+'&hl=en-US&gl=US&ceid=US:en')}`;
  try{
    const res=await fetch(proxy,{signal:AbortSignal.timeout(7000)});
    if(!res.ok)throw new Error('proxy '+res.status);
    const xml=await res.text();
    const doc=new DOMParser().parseFromString(xml,'application/xml');
    if(doc.querySelector('parseerror'))throw new Error('parse error');
    return[...doc.querySelectorAll('item')].slice(0,10).map(item=>{
      const linkNode=item.querySelector('link');
      const url=linkNode?.nextSibling?.nodeValue?.trim()||item.querySelector('link')?.textContent?.trim()||'';
      const rawTitle=item.querySelector('title')?.textContent||'';
      const title=rawTitle.replace(/ - [^-]+$/,'').trim();
      const src=item.querySelector('source')?.textContent||'Google News';
      const dateRaw=item.querySelector('pubDate')?.textContent;
      const date=dateRaw?new Date(dateRaw).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'2-digit'}):'';
      return{title,url,source:src,date,link_type:'press',summary:''};
    }).filter(i=>i.title&&i.url);
  }catch(e){console.warn('Google News error',e.message);return[];}
}

/* ── Geocoding ────────────────────────────────────────────── */
export async function geocodeCity(cityStr) {
  try {
    const url = `${NOMINATIM_URL}?q=${encodeURIComponent(cityStr)}&format=json&limit=1`;
    const r = await fetch(url, { headers: { 'User-Agent': 'onAudience-Hub/2' } });
    if (!r.ok) return null;
    const data = await r.json();
    if (!data.length) return null;
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch (e) {
    return null;
  }
}

export async function saveGeocode(companyId, lat, lng) {
  try {
    await fetch(`${SB_URL}/rest/v1/companies`, {
      method: 'POST',
      headers: { ...HDR, 'Prefer': 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({ id: companyId, hq_lat: lat, hq_lng: lng }),
    });
  } catch (e) {
    console.warn('saveGeocode error', e);
  }
}

/* ── Intelligence save ────────────────────────────────────── */
export async function saveIntelligence(slug,items){
  if(!items.length)return;
  try{
    const ex=await fetch(`${SB_URL}/rest/v1/intelligence?company_id=eq.${slug}&type=eq.press_links`,{headers:authHdr()}).then(r=>r.json());
    const existing=Array.isArray(ex)&&ex[0]?.content||[];
    const seen=new Set(existing.map(l=>l.url));
    const merged=[...existing,...items.filter(i=>!seen.has(i.url))];
    if(ex&&ex[0]){
      await fetch(`${SB_URL}/rest/v1/intelligence?company_id=eq.${slug}&type=eq.press_links`,{method:'PATCH',headers:authHdr({'Prefer':'return=minimal'}),body:JSON.stringify({content:merged})});
    }else{
      await fetch(`${SB_URL}/rest/v1/intelligence`,{method:'POST',headers:authHdr({'Prefer':'resolution=merge-duplicates,return=minimal'}),body:JSON.stringify({company_id:slug,type:'press_links',content:merged})});
    }
  }catch(e){console.warn('Intel save',e);}
}
