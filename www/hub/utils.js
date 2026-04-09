/* ═══ utils.js — pure utility functions ═══ */

import { TAG_RULES, PAL, SB_KEY } from './config.js?v=20260409b3';

export function classify(n){const s=(n||'').toLowerCase();if(s.includes('no outreach')||s.includes('no fit')||s.includes('no business')||s.includes('internal')||s.includes('closed')||s.includes('unwanted'))return'nogo';if(s.includes('poc client'))return'poc';if(s.includes('client'))return'client';if(s.includes('partner'))return'partner';if(s.includes('prospect')||s.includes('to check')||s.includes('to continue'))return'prospect';return'partner';}

export function _slug(n){return(n||'').replace(/\s+(Ltd|Inc|LLC|S\.A\.|GmbH|Corp|B\.V\.|AG|PLC|SAS)\.?$/i,'').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');}

export function getCoTags(c){const hay=((c.name||'')+' '+(c.note||'')+' '+(c.category||'')+' '+(c.region||'')+' '+(c.description||'')).toLowerCase();return TAG_RULES.filter(r=>r.kw.some(k=>hay.includes(k))).map(r=>r.tag);}

export function getAv(n){let h=0;for(let c of(n||''))h=(h*31+c.charCodeAt(0))&0xffff;return PAL[h%PAL.length];}
export function ini(n){return(n||'').replace(/[^A-Za-z ]/g,'').split(' ').filter(Boolean).map(w=>w[0]).slice(0,2).join('').toUpperCase()||'?';}
export function tClass(t){return{client:'tc',partner:'tp',prospect:'tpr',nogo:'tn',poc:'tpo'}[t]||'tn';}
export function tLabel(t){return{client:'Client',partner:'Partner',prospect:'Prospect',nogo:'No Outreach',poc:'POC'}[t]||t;}
export function stars(n){if(!n)return'';return'★'.repeat(Math.min(n,5))+'☆'.repeat(Math.max(0,5-n));}
export function esc(s){if(s===null||s===undefined)return'';if(typeof s!=='string')s=String(s);return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
export function safeUrl(w){return(!w||/^https?:\/\//i.test(w))?(w||''):'https://'+w;}
export function relTime(iso){if(!iso)return'—';const d=new Date(iso);const diff=Date.now()-d.getTime();const m=Math.floor(diff/60000);if(m<60)return m+'m ago';const h=Math.floor(m/60);if(h<24)return h+'h ago';const dy=Math.floor(h/24);if(dy<30)return dy+'d ago';return d.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'2-digit'});}

/* ── authHdr — live JWT header for every Supabase REST call ─────
   Single source of truth. Uses window._oaToken (JWT, set by
   bootHub) and falls back to the anon key so reads always work
   even before login completes. Import in every module — never
   construct Supabase headers inline.
   ─────────────────────────────────────────────────────────────── */

export function authHdr(extra) {
  const token = window._oaToken;
  const base = {
    apikey:        SB_KEY,
    Authorization: `Bearer ${token || SB_KEY}`,
    'Content-Type': 'application/json',
  };
  return extra ? { ...base, ...extra } : base;
}

/* ── Safe HTML helpers — prevents onclick attr injection ────── */

/** Button with plain string args only (safe for onclick="...") */
export function safeBtn(label, fn, args=[], cls='') {
  // args must be plain strings/numbers — no objects/arrays
  const argsStr = args.map(a => `'${String(a).replace(/'/g,"\\'")}' `).join(',');
  return `<button class="btn${cls?' '+cls:''}" onclick="${fn}(${argsStr})">${esc(label)}</button>`;
}

/** Button that passes complex data via data-* attrs, not onclick args */
export function dataBtn(label, fn, data={}, cls='') {
  const attrs = Object.entries(data)
    .map(([k,v]) => `data-${k}="${esc(String(v))}"`)
    .join(' ');
  return `<button class="btn${cls?' '+cls:''}" ${attrs} onclick="${fn}(this.dataset)">${esc(label)}</button>`;
}
