/* âââ config.js â constants, SEED, TAG_RULES, personas, TCF data âââ */

export const SB_URL='https://nyzkkqqjnkctcmxoirdj.supabase.co';
export const SB_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55emtrcXFqbmtjdGNteG9pcmRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4NzMxMzYsImV4cCI6MjA4OTQ0OTEzNn0.jhAq_C68klOp4iTyj9HmsyyvoxsOI6ACld7t_87TAk0';
export const HDR={apikey:SB_KEY,Authorization:`Bearer ${SB_KEY}`,'Content-Type':'application/json'};

/* ââ Model tiers âââââââââââââââââââââââââââââââââââââââââââ */
export const MODEL_RESEARCH = 'claude-opus-4-20250514';     // factual tasks â contacts, relations, company data
export const MODEL_CREATIVE = 'claude-sonnet-4-20250514';   // emails, angles, filtering, creative writing

export const TAG_RULES=[
  {tag:'DSP',kw:['dsp','demand-side','demand side','madhive','mntn','bidtheatre','splicky','xandr','thetradedesk','criteo','stackadapt','liquid advertising']},
  {tag:'SSP',kw:['ssp','supply-side','supply side','pubmatic','equativ','openx','sharethrough','sovrn','scoota']},
  {tag:'Agency',kw:['agency','havas','dentsu','omd','publicis','wpp','omg','interpublic','media buy']},
  {tag:'Data',kw:['data provider','data exchange','data platform','datonics','mobilewalla','globaldata','global data','true data','epsilon','experian','nielsen','claritas','precisely','ventiveiq','weborama','beklever']},
  {tag:'Identity',kw:['cookieless','identity','id5','liveramp','tapad','kochava','bango']},
  {tag:'CDP/DMP',kw:['dmp','cdp','adobe','zeotap','permutive','lotame','semasio','audigent']},
  {tag:'CTV',kw:['ctv','connected tv','vistar','mntn','madhive','samba','aniview']},
  {tag:'Mobile',kw:['mobile','moboost','memob','anzu','kochava','bango','intuizi','opensignal']},
  {tag:'Marketplace',kw:['marketplace','curation','liveramp','audigent','equativ','sharethrough','pubmatic']},
  {tag:'EU/EMEA',kw:['europe','european','emea','scandinavia','spain','poland',' pl ','germany','france','uk','netherlands','sweden','nordic','adform','bidtheatre','eskimi','belogic','beintoo','eyeota','weborama']},
  {tag:'US',kw:['usa','north america','datonics','claritas','epsilon','foursquare','mastercard','oracle','samba tv','madhive','mntn','stackadapt']},
  {tag:'APAC',kw:['apac','asia','thailand','china','india','japan','australia','bytedance','tiktok','dentsu thailand','omd thailand']},
  {tag:'Retail/OOH',kw:['retail','wowcher','ooh','out-of-home','foursquare','vistar']},
  {tag:'Programmatic',kw:['programmatic','rtb','bidder','exchange','trading desk','bidberry','bidscube','hybrid']},
  {tag:'Research',kw:['research','analytics','insights','sportradar','national research','big village','dynata','echo analytics']},
];

export const SEED_RAW=[
  ['6sense','POC client'],['Adform','integrated partner / DSP Europe'],['Admixer','no outreach'],['Adobe','partner â DMP integration'],
  ['Adtonos','client'],['Alikeaudience','client'],['Aniview','no outreach â failed deal'],['Anzu','POC client'],
  ['Amazon','partner'],['Audience Network','internal â group company'],['Audigent','partner / curation'],['Bango','prospect â via LiveRamp'],
  ['Beintoo','prospect â to continue'],['Belogic TR','partner'],['Bidberry / Carbon / Clickso','partner'],['Bidscube','no outreach â former client'],
  ['Bidtheatre','partner / DSP Scandinavia'],['Big Village','to check'],['Bright Mountain Media','prospect â to continue'],['Bytedance (TikTok)','client â APAC only'],
  ['Captify UK','client'],['Claritas','prospect â to continue'],['Clue','prospect â to continue'],['Criteo','partner â contact: Adrian'],
  ['Datonics','client'],['Dynata','no outreach â former client'],['Echo Analytics','POC client'],['Entity X','client â Adrian'],
  ['Epsilon','partner â Matt deal'],['Equativ','partner / SSP curation'],['Eskimi','no outreach â bad timing'],['Experian','prospect â Karo/Maciek'],
  ['Eyeota','partner'],['Foursquare','partner'],['Fyllo','partner'],['Synthesi','partner â to be'],
  ['GlobalDataResources','partner â NDR acquisition'],['Google','partner'],['Havas PL','client / agency'],['Hybrid','partner'],
  ['ID5','partner / cookieless product'],['Intuizi','client â Adrian'],['Kochava','partner / data provider'],['Lifesight','no outreach â unwanted'],
  ['LiveRamp','partner / marketplace'],['Lotame','no outreach â contract ended'],['Madhive','prospect / DSP â Karolina'],['Mastercard','partner'],
  ['Medianation','no outreach'],['Mediasmart','no outreach â low revenue'],['MediaWallah','partner / data exchange'],['MeMob','client'],
  ['Meta','no outreach â via LiveRamp only'],['Microsoft Advertising (Xandr)','partner'],['Mindvalley','POC client â no renewal'],['MNTN','partner / DSP'],
  ['Mobilewalla','client'],['Moboost','client'],['Multilocal','client â Adrian'],['National Research Group','to check'],
  ['Nexxen','prospect'],['Nielsen','no outreach'],['OpenSignal','client'],['OpenX','prospect'],
  ['Oracle','no outreach â closed ad division'],['Permutive','client'],['Pubmatic','partner'],['Precisely','no outreach'],
  ['Razorpod','no outreach'],['Roq Ad','no outreach â cross-device'],['RTB House','no business'],['Samba TV','prospect'],
  ['Scoota','prospect'],['Semantec','client'],['Semasio','partner â acquired by Fyllo'],['Sharethrough','partner / data exchange'],
  ['Sovrn','client â Adrian'],['Sportradar','prospect â Karolina'],['Taboola','prospect â via MSFT Curate'],['Tapad','no fit'],
  ['TheTradeDesk','partner'],['TikTok','partner â via Bytedance'],['TL1','internal â our company'],['True Data','client'],
  ['Twitch','no fit'],['Twitter','no fit'],['VentiveIQ','prospect â Maciek + Adrian'],['VistarMedia (T-Mobile)','prospect'],
  ['Wowcher','client'],['Zeotap','client'],['Beklever','prospect'],['Havas Spain','prospect'],
  ['Dentsu Thailand','prospect'],['OMD Thailand','prospect'],['Splicky DSP','prospect'],['Traveldesk Global','prospect'],
  ['Liquid Advertising','prospect'],['Stackadapt','prospect'],['Weborama','prospect'],['Memob','client']
];

export const PAL=[{bg:'rgba(23,128,102,0.1)',fg:'#0F6E56'},{bg:'rgba(26,79,138,0.1)',fg:'#1A4F8A'},{bg:'rgba(122,66,0,0.1)',fg:'#7A4200'},{bg:'rgba(75,45,158,0.1)',fg:'#4B2D9E'},{bg:'rgba(107,107,100,0.1)',fg:'#6B6B64'}];

export const MC_PERSONAS=[
  {id:'steve',   emoji:'ð',name:'Steve',   vibe:'Visionary',  color:'#1d1d1f',system:'Write emails like Steve Jobs presenting â visionary, minimal, magnetic. One bold idea per paragraph. Short, declarative sentences. No filler. End with a quiet, confident invitation. Never say "I hope this email finds you well."'},
  {id:'barack',  emoji:'ð¤',name:'Barack',  vibe:'Inspiring',  color:'#1a3a5c',system:'Write emails like an inspiring leader â warm, purposeful, building toward a clear point. Use "we" and shared purpose. One strong image or analogy. Close with conviction.'},
  {id:'margaret',emoji:'âï¸',name:'Margaret',vibe:'Conviction', color:'#2c2c54',system:'Write with iron conviction â direct, factual, no hedging. Lead with the strongest argument. Short assertive sentences. No pleasantries.'},
  {id:'winston', emoji:'ðï¸',name:'Winston', vibe:'Rallying',   color:'#7b341e',system:'Write with Churchillian flair â rallying, bold, dramatic rhythm. Short punchy lines alternating with a sweeping sentence. Make the close memorable.'},
  {id:'david',   emoji:'ðï¸',name:'David',   vibe:'Research',   color:'#2d6a4f',system:'Write analytical, research-driven emails. Reference specific signals. Back claims with data points. Subject line = a hypothesis.'},
  {id:'jeff',    emoji:'â¡',name:'Jeff',    vibe:'Metrics',    color:'#1a4b6e',system:'Write crisp metrics-first emails. Open with a number or result. No story â just outcome, mechanism, ask. Three paragraphs max.'},
  {id:'gary',    emoji:'ð¦',name:'Gary',    vibe:'No-BS',      color:'#c05621',system:'Write raw and direct. Use "here\'s the thing:" or "real talk". Short sharp paragraphs. No fluff. End with urgency.'},
  {id:'maya',    emoji:'ð',name:'Maya',    vibe:'Story',      color:'#553c9a',system:'Write emails that tell a micro-story. Open with a scene or image. Build tension toward the solution. Close with emotional resonance.'},
  {id:'elon',    emoji:'ð',name:'Elon',    vibe:'Disruptive', color:'#000000',system:'Write blunt, bold, contrarian. One punchy paragraph. Maybe two. Challenge assumptions. End with a direct binary question: "Worth a call?" Nothing more.'},
  {id:'oprah',   emoji:'â¨',name:'Oprah',   vibe:'Authentic',  color:'#8b4513',system:'Write warm, authentic, deeply human. Open with acknowledgment. Build genuine curiosity. Close with an open invitation, not a demand.'},
];

export const OA_GVL={id:716,name:'OnAudience Ltd',purposes:[1,2,3,4,5,6,7,8,9,10],legIntPurposes:[],
  specialPurposes:[1,3],features:[1,2,3],specialFeatures:[],
  dataRetention:{stdRetention:365},policyUrl:'https://www.onaudience.com/internet-advertising-privacy-policy'};

export const TCF_P={1:'Store/access info on device',2:'Select basic ads',3:'Create personalised ad profiles',4:'Use personalised ad profiles',5:'Create personalised content profiles',6:'Use personalised content profiles',7:'Measure advertising performance',8:'Measure content performance',9:'Understand audiences via statistics',10:'Develop & improve services',11:'Select basic content'};
export const TCF_SP={1:'Security & fraud prevention',2:'Deliver advertising & content'};
export const TCF_F={1:'Match offline data sources',2:'Link different devices',3:'Auto device ID'};
export const TCF_SF={1:'Precise geolocation data',2:'Active device scanning'};

export const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
export const GMAIL_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID'; // replace after Google Cloud setup
export const LEMLIST_PROXY = 'https://nyzkkqqjnkctcmxoirdj.supabase.co/functions/v1/lemlist-proxy';
