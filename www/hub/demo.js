/* ═══ demo.js — onAudience Hub v2 — Guest Demo Mode ═══
   No auth. Sample data only. All company/contact names are
   fictional — inspired by poets and writers. No real PII.
   ════════════════════════════════════════════════════════ */

export const DEMO_COMPANIES = [
  {
    id:'byronics', name:'Byronics', type:'prospect', icp:5,
    category:'Gaming & Digital Media', hq_city:'Amsterdam', region:'NL',
    website:'https://byronics.example', size:'1001-5000',
    note:'Digital entertainment and monetisation platform. Strong programmatic stack, publisher-direct inventory across gaming and mobile.',
    outreach_angle:"Byronics' first-party gaming audience — 300M+ players — is exactly the kind of deterministic signal onAudience segments activate across DSPs. A data partnership unlocks CTV extension for endemic advertisers without relying on third-party cookies.",
    relationship_status:'Contacted', data_richness:9, founded_year:2014, funding:'EUR 900M+',
    tech_stack:[{tool:'Google Ad Manager',category:'Ad Server'},{tool:'Header Bidding Wrapper',category:'Monetisation'},{tool:'Internal CRM',category:'CRM'}],
    dsps:'DV360,The Trade Desk,Xandr',
  },
  {
    id:'kafkatech', name:'Kafkatech', type:'partner', icp:5,
    category:'Customer Data Platform', hq_city:'Berlin', region:'DE',
    website:'https://kafkatech.example', size:'201-500',
    note:'Enterprise CDP with strong EU telco data roots. TCF certified. Active in cookie-alternative space.',
    outreach_angle:"Kafkatech's CDP layer is the perfect activation surface for onAudience's segment taxonomy — their clients already want pre-built EU audience segments, we just need to be the plug-in data layer.",
    relationship_status:'Meeting', data_richness:10, founded_year:2014, funding:'$120M', tcf_vendor_id:301,
    dsps:'DV360,TTD,Amazon DSP',
  },
  {
    id:'verlaine-media', name:'Verlaine Media', type:'client', icp:5,
    category:'Video Advertising', hq_city:'Hamburg', region:'DE',
    website:'https://verlaine-media.example', size:'201-500',
    note:'European video SSP with CTV focus. Part of a major European broadcaster group. Active data partnership since Q1.',
    relationship_status:'Partner', data_richness:9, founded_year:2008, tcf_vendor_id:115,
    dsps:'TTD,DV360',
  },
  {
    id:'pushkin-stream', name:'Pushkin Stream', type:'prospect', icp:4,
    category:'CTV / Streaming', hq_city:'Barcelona', region:'ES',
    website:'https://pushkinstream.example', size:'51-200',
    note:'European CTV streaming expert. AVOD and FAST channels. Data from 42M+ users across EU.',
    outreach_angle:"Pushkin Stream's AVOD audience is one of the richest first-party CTV signals in Europe. onAudience segments could power audience extension campaigns for their FAST channel partners without building the data infrastructure themselves.",
    relationship_status:'Contacted', data_richness:7, founded_year:2012,
    dsps:'TTD,Xandr',
  },
  {
    id:'addison-consent', name:'Addison Consent', type:'partner', icp:5,
    category:'Privacy & Consent', hq_city:'New York', region:'US',
    website:'https://addisonconsent.example', size:'201-500',
    note:'CMP and data privacy platform. TCF Certified. Used by major EU publishers for consent collection.',
    relationship_status:'Partner', data_richness:8, founded_year:2015, funding:'$90M', tcf_vendor_id:290,
  },
  {
    id:'neruda-analytics', name:'Neruda Analytics', type:'prospect', icp:4,
    category:'Audience Intelligence', hq_city:'Amsterdam', region:'NL',
    website:'https://nerudaanalytics.example', size:'501-1000',
    note:'Subscription and audience analytics platform for publishers. First-party data from 1,000+ news sites.',
    outreach_angle:"Neruda Analytics sits on an enormous reservoir of subscribed, consent-based reader data. Activating that through onAudience's DSP integrations is an obvious win for their publisher clients.",
    data_richness:7, icp:4, founded_year:2012, relationship_status:'No Contact',
  },
  {
    id:'woolf-mobile', name:'Woolf Mobile', type:'prospect', icp:4,
    category:'Mobile Advertising', hq_city:'London', region:'GB',
    website:'https://woolfmobile.example', size:'201-500',
    note:'Personified advertising platform built on declared data from apps. Strong EU regulatory posture.',
    relationship_status:'Contacted', data_richness:6, icp:4,
    founded_year:2014, funding:'$85M', tcf_vendor_id:145,
  },
  {
    id:'dickens-supply', name:'Dickens Supply', type:'poc', icp:4,
    category:'Supply-Side Platform', hq_city:'Redwood City', region:'US',
    website:'https://dickenssupply.example', size:'1001-5000',
    note:'Independent SSP. Growing EU publisher base. CTV and header bidding strong suits. POC for audience data activation.',
    relationship_status:'Proposal', data_richness:8, icp:4, founded_year:2006,
    funding:'Public', tcf_vendor_id:76, dsps:'TTD,DV360,Amazon',
  },
  {
    id:'borges-identity', name:'Borges Identity', type:'prospect', icp:5,
    category:'Identity / Cookieless', hq_city:'Paris', region:'FR',
    website:'https://borgesidentity.example', size:'51-200',
    note:'Shared identity solution for publishers and the open web. 400M+ IDs across EU. TCF certified.',
    outreach_angle:"Borges Identity solves the identity layer — onAudience solves the audience data layer. A joint offering where onAudience segments are pre-matched to universal IDs gives buyers a turnkey cookieless targeting solution.",
    relationship_status:'No Contact', data_richness:8, icp:5, founded_year:2017, tcf_vendor_id:131,
  },
  {
    id:'orwell-research', name:'Orwell Research', type:'nogo', icp:2,
    category:'Market Research', hq_city:'London', region:'GB',
    website:'https://orwellresearch.example', size:'1001-5000',
    note:'Survey-based market research firm. Limited programmatic activation capability. Not a core data partnership target.',
    relationship_status:'No Contact', data_richness:5, icp:2, founded_year:2000,
  },
];

export const DEMO_CONTACTS = [
  {id:'ct-by1', full_name:'Keats Verlaine', title:'Chief Revenue Officer', email:'k.verlaine@byronics.example', company_name:'Byronics', company_id:'byronics'},
  {id:'ct-by2', full_name:'Sappho Kafka', title:'VP Programmatic', email:'s.kafka@byronics.example', company_name:'Byronics', company_id:'byronics'},
  {id:'ct-kf1', full_name:'Tagore Brecht', title:'CEO & Co-Founder', email:'t.brecht@kafkatech.example', company_name:'Kafkatech', company_id:'kafkatech'},
  {id:'ct-kf2', full_name:'Rilke Hugo', title:'CPO & Co-Founder', email:'r.hugo@kafkatech.example', company_name:'Kafkatech', company_id:'kafkatech'},
  {id:'ct-vm1', full_name:'Bashō Cervantes', title:'Managing Director', email:'b.cervantes@verlaine-media.example', company_name:'Verlaine Media', company_id:'verlaine-media'},
  {id:'ct-ps1', full_name:'Pessoa Ibsen', title:'Head of Data & Monetisation', email:'p.ibsen@pushkinstream.example', company_name:'Pushkin Stream', company_id:'pushkin-stream'},
  {id:'ct-ds1', full_name:'Akhmatova Dumas', title:'VP EMEA Partnerships', email:'a.dumas@dickenssupply.example', company_name:'Dickens Supply', company_id:'dickens-supply'},
  {id:'ct-bi1', full_name:'Rumi Chekhov', title:'CEO & Co-Founder', email:'r.chekhov@borgesidentity.example', company_name:'Borges Identity', company_id:'borges-identity'},
  {id:'ct-bi2', full_name:'Lorca Woolf', title:'Director of Partnerships', email:'l.woolf@borgesidentity.example', company_name:'Borges Identity', company_id:'borges-identity'},
];

export const DEMO_AUDIENCES = [
  {
    id:'aud-demo-1', name:'EU CTV Publishers Q2',
    description:'Connected TV and streaming publishers in Western Europe with first-party audience data and programmatic monetisation needs.',
    outreach_hook:"While EU publishers scramble to build cookieless alternatives, the real opportunity is simpler: activate the first-party CTV audiences they already have. onAudience segments plug directly into their existing DSP relationships — no SDK, no rebuild.",
    company_ids:['pushkin-stream','verlaine-media'],
    icp_prompt:'CTV publishers with EU audiences, TCF compliant, programmatic monetisation',
    created_at:new Date(Date.now()-5*24*3600*1000).toISOString(),
    updated_at:new Date(Date.now()-2*24*3600*1000).toISOString(),
  },
  {
    id:'aud-demo-2', name:'Cookieless Identity Targets',
    description:'Identity and data infrastructure players positioned around the death of third-party cookies.',
    outreach_hook:"The cookie deprecation narrative is exhausted. But the buyers aren't. The real question for identity players is: whose audience segments will they activate once cookies are gone? onAudience is that answer.",
    company_ids:['borges-identity','addison-consent','kafkatech'],
    icp_prompt:'Cookieless identity, consent management, clean room, privacy-compliant data',
    created_at:new Date(Date.now()-12*24*3600*1000).toISOString(),
    updated_at:new Date(Date.now()-1*24*3600*1000).toISOString(),
  },
];

export const DEMO_RELATIONS = [
  {id:'r1', from_company:'kafkatech', to_company:'addison-consent', relation_type:'tech_integration', strength:'confirmed', direction:'bidirectional', notes:'Kafkatech CDP integrates Addison Consent CMP for EU consent signal ingestion.'},
  {id:'r2', from_company:'verlaine-media', to_company:'dickens-supply', relation_type:'marketplace_listed', strength:'confirmed', direction:'unidirectional'},
  {id:'r3', from_company:'byronics', to_company:'dickens-supply', relation_type:'tech_integration', strength:'strong', direction:'unidirectional', notes:'Byronics inventory available via Dickens Supply header bidding wrapper.'},
];

/* ── Mode management ─────────────────────────────────────────── */
export function enterDemoMode() {
  localStorage.setItem('oaDemoMode','1');
  window._DEMO_MODE = true;
}
export function exitDemoMode() {
  localStorage.removeItem('oaDemoMode');
  window._DEMO_MODE = false;
}
export function isDemoMode() {
  return !!(localStorage.getItem('oaDemoMode') || window._DEMO_MODE);
}

/* ── Populate S with demo data ───────────────────────────────── */
export function loadDemoData(S) {
  // All DEMO_COMPANIES already have type set — no classify needed
  S.companies = DEMO_COMPANIES.map(c=>({...c}));
  S.contacts  = DEMO_CONTACTS;
  S.allRelations = DEMO_RELATIONS;
  S.audiences = DEMO_AUDIENCES;
  S.totalCompaniesInDb = DEMO_COMPANIES.length;
  // Use window-exposed renderers — safe to call after DOM ready
  if(typeof window.renderStats==='function') window.renderStats();
  if(typeof window.renderList==='function') window.renderList();
  if(typeof window.renderTagPanel==='function') window.renderTagPanel();
  const dot = document.getElementById('statusDot');
  if(dot) dot.className='live';
}

/* ── Demo guard — call at start of any DB-writing function ───── */
export function demoGuard(label) {
  if(!isDemoMode()) return false;
  _showDemoToast(label);
  return true;
}

function _showDemoToast(label) {
  const id='oa-demo-toast';
  let el = document.getElementById(id);
  if(!el) {
    el = document.createElement('div');
    el.id = id;
    el.style.cssText=`position:fixed;bottom:40px;left:50%;transform:translateX(-50%);
      z-index:9998;background:#7A4200;color:#FEF2E0;
      font-family:'IBM Plex Mono',monospace;font-size:10px;font-weight:600;
      letter-spacing:.06em;text-transform:uppercase;
      padding:10px 18px;border-radius:2px;
      box-shadow:0 4px 16px rgba(0,0,0,.3);
      display:flex;align-items:center;gap:12px;
      transition:opacity .3s;white-space:nowrap;`;
    document.body.appendChild(el);
  }
  el.innerHTML = `🔒 ${label||'SIGN IN'} — Demo mode · Live operations disabled
    <button onclick="exitDemoMode();location.reload()" style="height:20px;padding:0 8px;border-radius:2px;
      border:1px solid rgba(255,255,255,.5);background:rgba(255,255,255,.2);color:#FEF2E0;
      cursor:pointer;font-family:'IBM Plex Mono',monospace;font-size:8px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;">
      Sign In →</button>`;
  el.style.opacity='1';
  clearTimeout(el._timer);
  el._timer = setTimeout(()=>{ el.style.opacity='0'; },3500);
}

/* ── Demo banner (amber, fixed bottom) ──────────────────────── */
export function showDemoBanner() {
  if(document.getElementById('oa-demo-bar')) return;
  const bar = document.createElement('div');
  bar.id = 'oa-demo-bar';
  bar.innerHTML = `
    <style>
    #oa-demo-bar{
      position:fixed;bottom:0;left:0;right:0;z-index:8999;
      height:28px;background:#7A4200;color:#FEF2E0;
      display:flex;align-items:center;justify-content:center;gap:12px;
      font-family:'IBM Plex Mono',monospace;font-size:8px;font-weight:600;
      letter-spacing:.06em;text-transform:uppercase;
      box-shadow:0 -2px 8px rgba(122,66,0,.25);
    }
    #oa-demo-bar .db-btn{
      height:18px;padding:0 8px;border-radius:2px;
      border:1px solid rgba(255,255,255,.4);
      background:rgba(255,255,255,.15);color:#FEF2E0;cursor:pointer;
      font-family:'IBM Plex Mono',monospace;font-size:7px;font-weight:600;
      letter-spacing:.06em;text-transform:uppercase;
    }
    #oa-demo-bar .db-btn:hover{background:rgba(255,255,255,.28);}
    </style>
    <span>⚠ DEMO MODE — Fictional sample data · No live database connection</span>
    <button class="db-btn" id="oa-demo-signin-btn">Sign In for Live Intelligence →</button>
    <button class="db-btn" style="opacity:.5" onclick="document.getElementById('oa-demo-bar').remove()">✕</button>
  `;
  document.body.appendChild(bar);
  document.getElementById('oa-demo-signin-btn')?.addEventListener('click',()=>{
    exitDemoMode();
    // Trigger Google OAuth directly
    if(typeof window.oaGoogleSignIn==='function') window.oaGoogleSignIn();
    else location.reload();
  });
  const pill = document.getElementById('signOutPill');
  if(pill) pill.style.bottom='36px';
}

/* ── Nav DEMO badge ──────────────────────────────────────────── */
export function patchNavForDemo() {
  const check = setInterval(()=>{
    const nb = document.getElementById('userBadge');
    if(nb){
      nb.innerHTML=`<span style="font-family:'IBM Plex Mono',monospace;font-size:8px;font-weight:600;color:#7A4200;background:#FEF2E0;border:1px solid rgba(122,66,0,.35);border-radius:2px;padding:2px 7px;letter-spacing:.06em;text-transform:uppercase;">DEMO</span>`;
      clearInterval(check);
    }
  },300);
}
