/* ═══ api.js — Supabase, status, stats, Google News ═══ */

import { SB_URL, SB_KEY, HDR } from './config.js';
import S from './state.js';
import { classify, _slug } from './utils.js';

/* ── Status ───────────────────────────────────────────────── */
export function setStatus(live){const el=document.getElementById('dbStatus');if(live){el.textContent=`● Live · ${S.companies.length}`;el.className='nav-status live';}else{el.textContent=`○ Seed · ${S.companies.length}`;el.className='nav-status';}}

/* ── Load from Supabase ───────────────────────────────────── */
export async function loadFromSupabase(renderStats,renderList,renderTagPanel){
  const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),8000);
  try{
    const[cr,ct]=await Promise.all([
      fetch(`${SB_URL}/rest/v1/companies?select=*&order=name.asc`,{headers:HDR,signal:ctrl.signal}),
      fetch(`${SB_URL}/rest/v1/contacts?select=*&order=full_name.asc`,{headers:HDR,signal:ctrl.signal})
    ]);
    clearTimeout(timer);
    if(!cr.ok)throw new Error(cr.status);
    const dbc=await cr.json(),dbt=ct.ok?await ct.json():[];
    if(Array.isArray(dbc)&&dbc.length)S.companies=dbc.map(r=>({...r,type:r.type||classify(r.note||''),note:r.note||''}));
    if(Array.isArray(dbt))S.contacts=dbt;
    setStatus(true);
  }catch(e){clearTimeout(timer);console.warn('seed',e.message);setStatus(false);}
  renderStats();renderList();if(S.tagPanelOpen)renderTagPanel();
}

/* ── Save ─────────────────────────────────────────────────── */
export async function saveCompany(r){return fetch(`${SB_URL}/rest/v1/companies`,{method:'POST',headers:{...HDR,'Prefer':'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(r)});}
export async function saveContact(r){return fetch(`${SB_URL}/rest/v1/contacts`,{method:'POST',headers:{...HDR,'Prefer':'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(r)});}

/* ── Stats ────────────────────────────────────────────────── */
export function renderStats(){
  const t30=Date.now()-30*24*60*60*1000,cids=new Set(S.contacts.map(c=>_slug(c.company_name||'')));
  const fresh=S.companies.filter(c=>c.type==='prospect'&&(!c.updated_at||new Date(c.updated_at).getTime()<t30)&&!cids.has(_slug(c.name))).length;
  document.getElementById('stAll').textContent=S.companies.length;
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
    if(doc.querySelector('parsererror'))throw new Error('parse error');
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

/* ── Intelligence save ────────────────────────────────────── */
export async function saveIntelligence(slug,items){
  if(!items.length)return;
  try{
    const ex=await fetch(`${SB_URL}/rest/v1/intelligence?company_id=eq.${slug}&type=eq.press_links`,{headers:{apikey:SB_KEY,Authorization:`Bearer ${SB_KEY}`}}).then(r=>r.json());
    const existing=Array.isArray(ex)&&ex[0]?.content||[];
    const seen=new Set(existing.map(l=>l.url));
    const merged=[...existing,...items.filter(i=>!seen.has(i.url))];
    if(ex&&ex[0]){
      await fetch(`${SB_URL}/rest/v1/intelligence?company_id=eq.${slug}&type=eq.press_links`,{method:'PATCH',headers:{...HDR,'Prefer':'return=minimal'},body:JSON.stringify({content:merged})});
    }else{
      await fetch(`${SB_URL}/rest/v1/intelligence`,{method:'POST',headers:{...HDR,'Prefer':'resolution=merge-duplicates,return=minimal'},body:JSON.stringify({company_id:slug,type:'press_links',content:merged})});
    }
  }catch(e){console.warn('Intel save',e);}
}
