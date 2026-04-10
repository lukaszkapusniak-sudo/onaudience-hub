/* ═══ api.js — Supabase, status, stats, Google News, Anthropic ═══ */

import { SB_URL, HDR, NOMINATIM_URL, MODEL_RESEARCH, LEMLIST_PROXY } from './config.js?v=20260410d12';
import S from './state.js?v=20260410d12';
import { classify, _slug, authHdr } from './utils.js?v=20260410d12';
import { companies as dbCo, contacts as dbContacts, relations as dbRelations,
  intelligence as dbIntel, enrichCache as dbEnrich,
  mergeSuggestions as dbMerge, userProfiles } from './db.js?v=20260410d12';



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
  // Proxy always available — green either way.
  btn.style.color='var(--cc)';
  btn.style.opacity=has?'1':'0.55';
  btn.title=has?'Using your API key — click to change or remove':'AI via shared proxy · click to use your own key';
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
    <span class="kp-title">🔑 API Key Override</span>
    <button class="btn sm" onclick="toggleKeyPanel(false)" style="margin-left:auto">✕</button>
  </div>
  <div class="kp-body">
    <div class="kp-desc" style="margin-bottom:6px">
      <span style="color:var(--cc);font-weight:600">✓ AI runs via shared proxy — no key needed.</span><br/>
      Optionally enter your own Anthropic key to use your personal quota / billing instead.
    </div>
    <div class="kp-row">
      <input id="keyPanelInp" class="kp-inp" type="password" placeholder="sk-ant-api03-… (optional)" autocomplete="off" spellcheck="false"/>
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

/* ── Anthropic proxy URL ───────────────────────────────────────
   All AI calls go through the Supabase edge function so no user-
   supplied API key is needed.  If the user has set their own key
   (via 🔑 nav button) that key is used directly instead — useful
   for higher rate limits or personal billing.
   ─────────────────────────────────────────────────────────── */
const CLAUDE_PROXY = `${SB_URL}/functions/v1/claude-proxy`;

/* Core fetch — proxy-first, direct fallback if personal key set */
async function _anthropicCall(body, beta){
  const key = getApiKey();
  const maxRetries = 3;

  /* ── Personal key path (direct to Anthropic) ── */
  if(key){
    const headers = {
      'Content-Type':'application/json',
      'x-api-key':key,
      'anthropic-version':'2023-06-01',
      'anthropic-dangerous-direct-browser-access':'true',
    };
    if(beta) headers['anthropic-beta'] = beta;
    for(let attempt=0;attempt<maxRetries;attempt++){
      const res=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers,body:JSON.stringify(body)});
      if(res.status===529||res.status===429){
        const wait=Math.min(2000*Math.pow(2,attempt),10000);
        console.warn(`[API] direct ${res.status} — retry ${attempt+1}/${maxRetries} in ${wait}ms`);
        await new Promise(r=>setTimeout(r,wait));
        continue;
      }
      if(!res.ok){const txt=await res.text().catch(()=>'');throw new Error(`API ${res.status}: ${txt.slice(0,200)}`);}
      return res.json();
    }
    throw new Error('API overloaded after 3 retries — try again in a minute');
  }

  /* ── Proxy path (no key needed) ── */
  const sbHdr = authHdr();  // Supabase anon JWT for edge function auth
  for(let attempt=0;attempt<maxRetries;attempt++){
    const res=await fetch(CLAUDE_PROXY,{
      method:'POST',
      headers:{'Content-Type':'application/json',...sbHdr},
      body:JSON.stringify({body, ...(beta ? {beta} : {})}),
    });
    if(res.status===529||res.status===429){
      const wait=Math.min(2000*Math.pow(2,attempt),10000);
      console.warn(`[API] proxy ${res.status} — retry ${attempt+1}/${maxRetries} in ${wait}ms`);
      await new Promise(r=>setTimeout(r,wait));
      continue;
    }
    if(!res.ok){const txt=await res.text().catch(()=>'');throw new Error(`Proxy ${res.status}: ${txt.slice(0,200)}`);}
    return res.json();
  }
  throw new Error('API overloaded after 3 retries — try again in a minute');
}

/* ── Anthropic fetch helper (retries on 429/529) ──────────── */
export async function anthropicFetch(body){
  return _anthropicCall(body, null);
}

/* ── Anthropic MCP fetch — adds mcp-client beta header ──────── */
export async function anthropicMcpFetch(body){
  return _anthropicCall(body, 'mcp-client-2025-04-04');
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
    await dbEnrich.upsert({ company_id: companyId, source, data, ttl_hours: ttlHours, fetched_at: new Date().toISOString() });
    // _req throws on error, so reaching here means success
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
    const[cr,ct,rl] = await Promise.all([
      dbCo.list('0-199'),
      dbContacts.listAll(),   // first 1000 (SB row limit)
      dbRelations.listAll(),
    ]);
    if(!Array.isArray(cr)) throw new Error('companies load failed');
    const dbc=cr, dbt=Array.isArray(ct)?ct:[], dbr=Array.isArray(rl)?rl:[];
    // Paginate contacts beyond the first 1000 (SB limit per request)
    const _loadAllContacts = async (initial) => {
      let all=[...initial], page=1000;
      while(true){
        try{
          const r=await fetch(`${SB_URL}/rest/v1/contacts?select=*&order=full_name.asc`,
            {headers:authHdr({'Range':`${page}-${page+999}`})});
          if(!r.ok || r.status===416) break;
          const rows=await r.json();
          if(!Array.isArray(rows)||!rows.length) break;
          all=[...all,...rows];
          page+=1000;
          if(r.status!==206) break;  // 200 = got all
        }catch(e){break;}
      }
      return all;
    };
    // Start bg contacts pagination immediately (don't block first render)
    _loadAllContacts(dbt).then(all=>{ S.contacts=all; });
    // cr is a plain array from db.js — get total from SB separately
    const totalRes = await fetch(`${SB_URL}/rest/v1/companies?select=id`,
      {headers:authHdr({'Prefer':'count=exact','Range':'0-0'})});
    const total = parseInt(totalRes.headers.get('content-range')?.split('/')[1]||'0');
    S.totalCompaniesInDb=total;
    if(Array.isArray(dbc)&&dbc.length){ const fresh=dbc.map(r=>({...r,type:r.type||classify(r.note||''),note:r.note||''})); S.companies=fresh; _loadingPages=false; /* reset flag so bg load can proceed */ }
    if(Array.isArray(dbt)) S.contacts=dbt;
    if(Array.isArray(dbr)) S.allRelations=dbr;
    setStatus(true);
    renderStats();renderList();if(S.tagPanelOpen)renderTagPanel();
    if(window.clog) window.clog('db',`<b>${S.companies.length}</b> / ${total} companies · <b>${S.contacts.length}</b> contacts — loading remaining…`);
    if(total>_PAGE) _loadRemainingPages(total,renderStats,renderList,renderTagPanel);
  }catch(e){
    console.warn('[load]',e.message);
    setStatus(false);
    // 522 = Cloudflare/Supabase transient timeout — auto-retry once after 3s
    if(e.message&&(e.message.includes('522')||e.message.includes('failed to fetch')||e.message.includes('NetworkError')||e.message.includes('Load failed')||e.message.includes('companies load failed'))){
      if(window.clog) window.clog('db','⟳ Connection dropped (522) — retrying in 3s…');
      setTimeout(()=>loadFromSupabase(renderStats,renderList,renderTagPanel),3000);
      return;
    }
    if(window.clog) window.clog('db',`Load failed — ${e.message}`);
    renderStats();renderList();
  }
}

let _loadingPages=false;
async function _loadRemainingPages(total,renderStats,renderList,renderTagPanel){
  if(_loadingPages) return; // already loading — don't run twice
  _loadingPages=true;
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
      // Deduplicate by id to prevent doubles when loadFromSupabase is called multiple times
      const incoming=page.map(r=>({...r,type:r.type||classify(r.note||''),note:r.note||''}));
      const existingIds=new Set(S.companies.map(c=>c.id));
      const newOnly=incoming.filter(c=>!existingIds.has(c.id));
      if(!newOnly.length) break; // already have this page — stop
      S.companies=[...S.companies,...newOnly];
      setStatus(true);
      renderStats();renderList();if(S.tagPanelOpen)renderTagPanel();
    }catch(e){ break; }
    offset+=_PAGE;
  }
  _loadingPages=false;
  if(window.clog) window.clog('db',`✓ All loaded: <b>${S.companies.length}</b> / ${total} companies`);
}

/* ── Refresh relations cache only ─────────────────────────── */
export async function refreshRelationsCache(){
  try{
    const r=await dbRelations.listAll();
    const data=r;
    if(Array.isArray(data)){S.allRelations=data;if(window.clog)window.clog('db',`Relations refreshed: <b>${data.length}</b> rows`);}
    return data;
  }catch(e){console.warn('relations refresh',e);return S.allRelations;}
}

/* ── Save ─────────────────────────────────────────────────── */
export async function saveCompany(r){return dbCo.upsert(r);}
export async function saveContact(r){return dbContacts.upsert(r);}

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
    await dbCo.upsert({ id: companyId, hq_lat: lat, hq_lng: lng });
  } catch (e) {
    console.warn('saveGeocode error', e);
  }
}

/* ── Intelligence save ────────────────────────────────────── */
export async function saveIntelligence(slug,items){
  if(!items.length)return;
  try{
    const ex=await dbIntel.get(slug,'press_links');
    const existing=Array.isArray(ex)&&ex[0]?.content||[];
    const seen=new Set(existing.map(l=>l.url));
    const merged=[...existing,...items.filter(i=>!seen.has(i.url))];
    if(ex&&ex[0]){
      await dbIntel.upsert({company_id:slug,type:'press_links',content:merged,updated_at:new Date().toISOString()});
    }else{
      await dbIntel.upsert({company_id:slug,type:'press_links',content:merged,updated_at:new Date().toISOString()});
    }
  }catch(e){console.warn('Intel save',e);}
}

/* ══════════════════════════════════════════════════════════════
   ── Lemlist integration — proxy-based helpers ────────────────
   Key stored in localStorage under 'oaLemlistKey'.
   All calls go via Supabase Edge Function (avoids CORS + exposes no key).
   ══════════════════════════════════════════════════════════════ */
export function lemlistKey(){
  let k=localStorage.getItem('oaLemlistKey');
  if(!k){k=prompt('lemlist API key:');if(k)localStorage.setItem('oaLemlistKey',k.trim());}
  return k?.trim()||null;
}

export async function lemlistFetch(path,method='GET',body=null){
  const apiKey=lemlistKey();
  if(!apiKey)throw new Error('No lemlist key');
  const r=await fetch(LEMLIST_PROXY,{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({path,method,body,apiKey}),
  });
  if(!r.ok)throw new Error('lemlist '+r.status+': '+await r.text());
  return r.json();
}

export async function lemlistCampaigns(){
  // Paginate through all campaigns (API max 100 per page)
  const all = [];
  let offset = 0;
  const limit = 100;
  while (true) {
    const d = await lemlistFetch('/campaigns?limit=' + limit + '&offset=' + offset);
    const page = Array.isArray(d) ? d : (d.campaigns ?? []);
    all.push(...page);
    // Stop if fewer than limit returned — last page
    if (page.length < limit) break;
    offset += limit;
  }
  return all;
}

export async function lemlistAddLead(campaignId,contact){
  const name=contact.full_name||contact.name||'';
  const parts=name.split(' ');
  return lemlistFetch('/campaigns/'+campaignId+'/leads/','POST',{
    email:      contact.email||'',
    firstName:  parts[0]||'',
    lastName:   parts.slice(1).join(' ')||'',
    companyName:contact.company_name||'',
    jobTitle:   contact.title||'',
    linkedinUrl:contact.linkedin_url||contact.linkedin||'',
  });
}

export async function lemlistWriteBack(contactIds,campaignId,campaignName){
  const now=new Date().toISOString();
  await Promise.all(contactIds.map(id=>
    fetch(SB_URL+'/rest/v1/contacts?id=eq.'+id,{
      method:'PATCH',
      headers:{...HDR,'Prefer':'return=minimal'},
      body:JSON.stringify({lemlist_campaign_id:campaignId,lemlist_campaign_name:campaignName,lemlist_pushed_at:now}),
    })
  ));
}
