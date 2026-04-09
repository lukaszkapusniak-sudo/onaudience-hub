/* ═══ demo.js — onAudience Hub v2 — Guest Demo Mode ═══
   No auth required. Sample data from real ad-tech companies.
   Sets window._DEMO_MODE = true. App checks this and skips Supabase.
   Tutorial auto-starts. Amber banner shown at bottom.
   ════════════════════════════════════════════════════════ */

export const DEMO_COMPANIES = [
  {
    id:'azerion', name:'Azerion', type:'prospect', icp:5,
    category:'Gaming & Digital Media', hq_city:'Amsterdam', region:'NL',
    website:'https://azerion.com', size:'1001-5000',
    note:'Digital entertainment and monetisation platform. Strong programmatic stack, publisher-direct inventory across gaming and mobile.',
    outreach_angle:"Azerion's first-party gaming audience — 300M+ players — is exactly the kind of deterministic signal onAudience segments are designed to activate across DSPs. A data partnership could unlock CTV extension for their endemic advertisers without relying on third-party cookies.",
    relationship_status:'Contacted', data_richness:9, founded_year:2014, funding:'EUR 900M+',
    tech_stack:[{tool:'Google Ad Manager',category:'Ad Server'},{tool:'Amazon TAM',category:'Header Bidding'},{tool:'Salesforce',category:'CRM'}],
    dsps:'DV360,The Trade Desk,Xandr',
  },
  {
    id:'zeotap', name:'Zeotap', type:'partner', icp:5,
    category:'Customer Data Platform', hq_city:'Berlin', region:'DE',
    website:'https://zeotap.com', size:'201-500',
    note:'Enterprise CDP with strong EU telco data roots. TCF certified. Active in cookie-alternative space.',
    outreach_angle:"Zeotap's CDP layer is the perfect activation surface for onAudience's segment taxonomy — their clients already want pre-built EU audience segments, we just need to be the plug-in data layer.",
    relationship_status:'Meeting', data_richness:10, founded_year:2014, funding:'$120M', tcf_vendor_id:301,
    dsps:'DV360,TTD,Amazon DSP',
  },
  {
    id:'smartclip', name:'Smartclip', type:'client', icp:5,
    category:'Video Advertising', hq_city:'Hamburg', region:'DE',
    website:'https://smartclip.tv', size:'201-500',
    note:"RTL Group's AdTech arm. European video SSP with CTV focus. Active data partnership since Q1.",
    relationship_status:'Partner', data_richness:9, founded_year:2008, tcf_vendor_id:115,
    dsps:'TTD,DV360',
  },
  {
    id:'rakuten-tv', name:'Rakuten TV Enterprise', type:'prospect', icp:4,
    category:'CTV / Streaming', hq_city:'Barcelona', region:'ES',
    website:'https://enterprise.rakuten.tv', size:'51-200',
    note:"European CTV streaming expert. AVOD and FAST channels. Data from 42M+ users across EU.",
    outreach_angle:"Rakuten TV's AVOD audience is one of the richest first-party CTV signals in Europe. onAudience segments could power audience extension campaigns for their FAST channel partners without building the data infrastructure themselves.",
    relationship_status:'Contacted', data_richness:7, founded_year:2012,
    dsps:'TTD,Xandr',
  },
  {
    id:'sourcepoint', name:'Sourcepoint', type:'partner', icp:5,
    category:'Privacy & Consent', hq_city:'New York', region:'US',
    website:'https://sourcepoint.com', size:'201-500',
    note:'CMP and data privacy platform. TCF Certified. Used by major EU publishers for consent collection.',
    relationship_status:'Partner', data_richness:8, founded_year:2015, funding:'$90M', tcf_vendor_id:290,
  },
  {
    id:'piano', name:'Piano Software', type:'prospect', icp:4,
    category:'Audience Intelligence', hq_city:'Amsterdam', region:'NL',
    website:'https://piano.io', size:'501-1000',
    note:'Subscription and audience analytics platform for publishers. First-party data from 1,000+ news sites.',
    outreach_angle:"Piano sits on an enormous reservoir of subscribed, consent-based reader data. Activating that through onAudience's DSP integrations is an obvious win for their publisher clients.",
    data_richness:7, icp:4, founded_year:2012, relationship_status:'No Contact',
  },
  {
    id:'ogury', name:'Ogury', type:'prospect', icp:4,
    category:'Mobile Advertising', hq_city:'London', region:'GB',
    website:'https://ogury.com', size:'201-500',
    note:'Personified advertising platform. Declared data from apps. Strong EU regulatory posture.',
    relationship_status:'Contacted', data_richness:6, icp:4,
    founded_year:2014, funding:'$85M', tcf_vendor_id:145,
  },
  {
    id:'pubmatic', name:'PubMatic', type:'poc', icp:4,
    category:'Supply-Side Platform', hq_city:'Redwood City', region:'US',
    website:'https://pubmatic.com', size:'1001-5000',
    note:'Independent SSP. Growing EU publisher base. CTV and header bidding strong suits. POC for audience data activation.',
    relationship_status:'Proposal', data_richness:8, icp:4, founded_year:2006,
    funding:'Public (PUBM)', tcf_vendor_id:76, dsps:'TTD,DV360,Amazon',
  },
  {
    id:'id5', name:'ID5', type:'prospect', icp:5,
    category:'Identity / Cookieless', hq_city:'Paris', region:'FR',
    website:'https://id5.io', size:'51-200',
    note:'Shared identity solution for publishers and the open web. 400M+ IDs across EU. TCF certified.',
    outreach_angle:"ID5 solves the identity layer — onAudience solves the audience data layer. A joint offering where onAudience segments are pre-matched to ID5 universal IDs gives buyers a turnkey cookieless targeting solution.",
    relationship_status:'No Contact', data_richness:8, icp:5, founded_year:2017, tcf_vendor_id:131,
  },
  {
    id:'yougov', name:'YouGov', type:'nogo', icp:2,
    category:'Market Research', hq_city:'London', region:'GB',
    website:'https://yougov.com', size:'1001-5000',
    note:'Survey-based market research. Limited programmatic activation capability. Not a core data partnership target.',
    relationship_status:'No Contact', data_richness:5, icp:2, founded_year:2000,
  },
];

export const DEMO_CONTACTS = [
  {id:'ct-az1', full_name:'Sebastiaan Moesman', title:'Chief Revenue Officer', email:'s.moesman@azerion.com', company_name:'Azerion', company_id:'azerion', linkedin_url:'https://linkedin.com/in/sebastiaan-moesman'},
  {id:'ct-az2', full_name:'Tania Goutcheva', title:'VP Programmatic', email:'t.goutcheva@azerion.com', company_name:'Azerion', company_id:'azerion'},
  {id:'ct-ze1', full_name:'Daniel Heer', title:'CEO & Co-Founder', email:'daniel@zeotap.com', company_name:'Zeotap', company_id:'zeotap', linkedin_url:'https://linkedin.com/in/danielheer'},
  {id:'ct-ze2', full_name:'Projjol Banerjea', title:'CPO & Co-Founder', email:'projjol@zeotap.com', company_name:'Zeotap', company_id:'zeotap'},
  {id:'ct-sc1', full_name:'Oliver Vesper', title:'Managing Director', email:'o.vesper@smartclip.tv', company_name:'Smartclip', company_id:'smartclip'},
  {id:'ct-rt1', full_name:'Marc Pindado', title:'Head of Data & Monetisation', email:'m.pindado@rakuten.tv', company_name:'Rakuten TV Enterprise', company_id:'rakuten-tv'},
  {id:'ct-pm1', full_name:'Kyle Dozeman', title:'VP EMEA Partnerships', email:'kdozeman@pubmatic.com', company_name:'PubMatic', company_id:'pubmatic'},
  {id:'ct-id1', full_name:'Mathieu Roche', title:'CEO & Co-Founder', email:'mathieu@id5.io', company_name:'ID5', company_id:'id5', linkedin_url:'https://linkedin.com/in/mathieuroche'},
  {id:'ct-id2', full_name:'Chloe Grutchfield', title:'Director of Partnerships', email:'chloe@id5.io', company_name:'ID5', company_id:'id5'},
];

export const DEMO_AUDIENCES = [
  {
    id:'aud-demo-1', name:'EU CTV Publishers Q2',
    description:'Connected TV and streaming publishers in Western Europe with first-party audience data and programmatic monetisation needs.',
    outreach_hook:"While EU publishers scramble to build cookieless alternatives, the real opportunity is simpler: activate the first-party CTV audiences they already have. onAudience segments plug directly into their existing DSP relationships — no SDK, no rebuild.",
    company_ids:['rakuten-tv','smartclip'],
    icp_prompt:'CTV publishers with EU audiences, TCF compliant, programmatic monetisation',
    created_at: new Date(Date.now() - 5*24*3600*1000).toISOString(),
    updated_at: new Date(Date.now() - 2*24*3600*1000).toISOString(),
  },
  {
    id:'aud-demo-2', name:'Cookieless Identity Targets',
    description:'Identity and data infrastructure players positioned around the death of third-party cookies.',
    outreach_hook:"The cookie deprecation narrative is exhausted. But the buyers aren't. The real question for identity players is: whose audience segments will they activate once cookies are gone? onAudience is that answer.",
    company_ids:['id5','sourcepoint','zeotap'],
    icp_prompt:'Cookieless identity, consent management, clean room, privacy-compliant data',
    created_at: new Date(Date.now() - 12*24*3600*1000).toISOString(),
    updated_at: new Date(Date.now() - 1*24*3600*1000).toISOString(),
  },
];

export const DEMO_RELATIONS = [
  {id:'r1', from_company:'zeotap', to_company:'sourcepoint', relation_type:'tech_integration', strength:'confirmed', direction:'bidirectional', notes:'Zeotap CDP integrates Sourcepoint CMP for consent signal ingestion.'},
  {id:'r2', from_company:'smartclip', to_company:'pubmatic', relation_type:'marketplace_listed', strength:'confirmed', direction:'unidirectional'},
  {id:'r3', from_company:'azerion', to_company:'pubmatic', relation_type:'tech_integration', strength:'strong', direction:'unidirectional', notes:'Azerion inventory available via PubMatic header bidding wrapper.'},
];

/* ── Mode management ─────────────────────────────────────────────── */
export function enterDemoMode() {
  localStorage.setItem('oaDemoMode', '1');
  window._DEMO_MODE = true;
}
export function exitDemoMode() {
  localStorage.removeItem('oaDemoMode');
  window._DEMO_MODE = false;
}
export function isDemoMode() {
  return !!(localStorage.getItem('oaDemoMode') || window._DEMO_MODE);
}

/* ── Populate S with demo data ───────────────────────────────────── */
export function loadDemoData(S, classify, renderStats, renderList, renderTagPanel) {
  S.companies = DEMO_COMPANIES.map(c => ({...c, type: c.type || classify(c.note || '')}));
  S.contacts = DEMO_CONTACTS;
  S.allRelations = DEMO_RELATIONS;
  S.audiences = DEMO_AUDIENCES;
  S.totalCompaniesInDb = DEMO_COMPANIES.length;
  if (typeof renderStats === 'function') renderStats();
  if (typeof renderList === 'function') renderList();
  if (typeof renderTagPanel === 'function') renderTagPanel();
  const dot = document.getElementById('statusDot');
  if (dot) dot.className = 'live';
}

/* ── Demo banner (amber, bottom of screen) ───────────────────────── */
export function showDemoBanner() {
  if (document.getElementById('oa-demo-bar')) return;
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
    <span>⚠ DEMO MODE — Sample data · Not connected to live database</span>
    <button class="db-btn" id="oa-demo-signin-btn">Sign In for Live Intelligence →</button>
    <button class="db-btn" style="opacity:.5" onclick="document.getElementById('oa-demo-bar').remove()">✕</button>
  `;
  document.body.appendChild(bar);
  document.getElementById('oa-demo-signin-btn')?.addEventListener('click', () => {
    exitDemoMode(); location.reload();
  });
  const pill = document.getElementById('signOutPill');
  if (pill) pill.style.bottom = '36px';
}

/* ── Nav DEMO badge ─────────────────────────────────────────────── */
export function patchNavForDemo() {
  const check = setInterval(() => {
    const nb = document.getElementById('userBadge');
    if (nb) {
      nb.innerHTML = `<span style="font-family:'IBM Plex Mono',monospace;font-size:8px;font-weight:600;color:#7A4200;background:#FEF2E0;border:1px solid rgba(122,66,0,.35);border-radius:2px;padding:2px 7px;letter-spacing:.06em;text-transform:uppercase;">DEMO</span>`;
      clearInterval(check);
    }
  }, 300);
}
