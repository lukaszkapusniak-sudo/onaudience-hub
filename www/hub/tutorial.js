import { LANG_META, STEP_I18N } from './tutorial-i18n.js?v=20260410d16';
/* ═══ tutorial.js — onAudience Hub v2 — In-Game Tutorial ═══
   Self-contained. Reads from/writes to localStorage only.
   Never touches S, never calls hub functions (except oaGmailConnect via window).
   Safe to skip, restart, or ignore entirely.
   ═══════════════════════════════════════════════════════════ */


/* ═══════════════════════════════════════════════════════════════════
   CHIPTUNE SOUND ENGINE — Nintendo JRPG style (Web Audio API)
   All sounds generated procedurally. No external files.
   ═══════════════════════════════════════════════════════════════════ */
let _ctx = null;

function _ac() {
  if (!_ctx) {
    try { _ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) { return null; }
  }
  if (_ctx.state === 'suspended') _ctx.resume();
  return _ctx;
}

function _beep(freq, dur, type='square', gain=0.15, delay=0) {
  const ac = _ac(); if(!ac) return;
  const g = ac.createGain();
  const o = ac.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, ac.currentTime + delay);
  g.gain.setValueAtTime(0, ac.currentTime + delay);
  g.gain.linearRampToValueAtTime(gain, ac.currentTime + delay + 0.01);
  g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + delay + dur);
  o.connect(g); g.connect(ac.destination);
  o.start(ac.currentTime + delay);
  o.stop(ac.currentTime + delay + dur + 0.05);
}

function _chord(notes, dur, type='square', gain=0.12, delay=0) {
  notes.forEach(f => _beep(f, dur, type, gain, delay));
}

const SFX = {
  // Menu cursor — short blip (Pokemon menu boop)
  cursor() {
    _beep(440, 0.06, 'square', 0.12);
    _beep(880, 0.04, 'square', 0.05, 0.04);
  },

  // Next step confirm — two-tone rising (Zelda chest open intro)
  next() {
    _beep(330, 0.08, 'square', 0.14);
    _beep(440, 0.08, 'square', 0.14, 0.09);
    _beep(660, 0.14, 'square', 0.16, 0.18);
  },

  // Tutorial start — 4-note fanfare (classic JRPG intro jingle)
  start() {
    const notes = [262,330,392,524];
    const times = [0, 0.12, 0.24, 0.36];
    notes.forEach((f,i) => _beep(f, i===3?0.35:0.10, 'square', 0.14, times[i]));
  },

  // Achievement unlock — ascending arpeggio + sparkle (FF item get)
  achievement() {
    [523, 659, 784, 1047].forEach((f, i) => _beep(f, 0.10, 'square', 0.14, i * 0.07));
    // Sparkle overtone
    [2093, 2637].forEach((f, i) => _beep(f, 0.08, 'sine', 0.06, 0.35 + i * 0.06));
  },

  // Level up — classic FF level-up arpeggio
  levelUp() {
    const seq = [
      [262, 0.08, 0.00],
      [330, 0.08, 0.09],
      [392, 0.08, 0.18],
      [524, 0.08, 0.27],
      [392, 0.08, 0.36],
      [524, 0.08, 0.45],
      [659, 0.20, 0.54],
    ];
    seq.forEach(([f, d, t]) => _beep(f, d, 'square', 0.16, t));
    // Harmony
    const harm = [
      [330, 0.08, 0.27],
      [415, 0.08, 0.36],
      [524, 0.24, 0.45],
    ];
    harm.forEach(([f, d, t]) => _beep(f, d, 'square', 0.08, t));
  },

  // Victory fanfare — tutorial complete (short FF victory theme)
  victory() {
    const melody = [
      [392,0.12,0.0],[392,0.12,0.13],[392,0.12,0.26],
      [523,0.30,0.40],[392,0.12,0.72],[523,0.50,0.85],
    ];
    const bass = [
      [196,0.12,0.0],[196,0.12,0.13],[196,0.12,0.26],
      [262,0.30,0.40],[196,0.12,0.72],[262,0.50,0.85],
    ];
    melody.forEach(([f,d,t]) => _beep(f, d, 'square', 0.16, t));
    bass.forEach(([f,d,t])   => _beep(f, d, 'square', 0.10, t));
  },

  // Konami code — dramatic power-up fanfare + power chord
  konami() {
    // Ascending sweep
    [131,165,196,247,262,330,392,494,523].forEach((f,i) =>
      _beep(f, 0.06, 'square', 0.14, i * 0.055)
    );
    // Power chord hit at 0.5s
    [131,196,262,392].forEach(f => _beep(f, 0.4, 'square', 0.12, 0.5));
    // Final high notes
    _beep(1047, 0.15, 'square', 0.18, 0.92);
    _beep(1319, 0.35, 'square', 0.20, 1.08);
    // Overtone shimmer
    [2093,2637,3136].forEach((f,i) => _beep(f, 0.12, 'sine', 0.05, 1.1 + i*0.06));
  },

  // Error / close — descending minor (Zelda wrong answer)
  close() {
    _beep(330, 0.08, 'square', 0.12);
    _beep(262, 0.12, 'square', 0.12, 0.09);
  },

  // Gmail connect — water/magic sound (Zelda secret)
  gmail() {
    [523,659,784,1047,784,659,523].forEach((f,i) =>
      _beep(f, 0.07, 'sine', 0.10, i * 0.06)
    );
  },

  // XP tick — tiny point sound
  xpTick() {
    _beep(880, 0.04, 'square', 0.06);
  },

  // Mario coin — NES-accurate Super Mario Bros coin (B5→E6)
  marioCoin() {
    _beep(987.77, 0.035, 'square', 0.22);           // B5 blip
    _beep(1318.51, 0.13, 'square', 0.20, 0.04);    // E6 sustain
    _beep(2637, 0.07, 'sine', 0.05, 0.04);          // sine shimmer
  },
};

const TKEY_DONE  = 'oaTutorialDone';
const TKEY_XP    = 'oaTutXP';
const TKEY_ACHV  = 'oaAchievements';
const TKEY_STEP  = 'oaTutStep';

const XP_LEVELS = [0, 100, 350, 700, 1100, 1750];
const LEVEL_NAMES = ['RECRUIT', 'PRIVATE', 'CORPORAL', 'SERGEANT', 'LIEUTENANT', 'OPERATOR'];
const LEVEL_ICONS = ['○','◉','◈','◆','★','⬡'];

const STEPS = [
  {
    id: 'welcome', xp: 100,
    levelUp: 1,
    title: '★  INTEL BRIEF  ★',
    sub: 'Operator Onboarding — Sequence Initiated',
    body: 'Welcome to the <b>Sales Intelligence Hub</b>.\n\nYou are about to become very dangerous in a sales meeting. This 5-minute training covers six essential operations. Everything else lives in the manual — <b>FM-OA-2026</b>.',
    target: null, card: 'center',
    btn: 'BEGIN TRAINING  ▶',
    achievement: {id:'enlisted', icon:'🪖', name:'ENLISTED', desc:'Joined the operator corps', xp:50},
  },
  {
    id: 'company_list', xp: 150,
    title: '📋  THE COMPANY LIST',
    sub: 'SECTION 2  //  FM-OA-2026',
    body: '<b>2,062 companies</b>. Sorted by ICP score — highest potential first.\n\nClick any row to open the company dossier. The list is your entire target universe. Scroll it. Filter it. Own it.',
    target: '.list-scroll', card: 'right',
    btn: 'ROGER THAT  →',
    hint: 'TIP: Right-click any row for 8 quick actions',
  },
  {
    id: 'stats_bar', xp: 100,
    title: '📊  PIPELINE FILTERS',
    sub: 'SECTION 2.1  //  FM-OA-2026',
    body: 'The stats bar shows your pipeline split:\n<b>Clients · POC · Partners · Prospects · No Outreach · Fresh</b>\n\nClick <b>PROSPECTS</b> to focus on targets that have not been converted yet. That is your primary hunting ground.',
    target: '.stats-bar', card: 'below',
    btn: 'UNDERSTOOD  →',
  },
  {
    id: 'company_panel', xp: 150,
    title: '🏢  THE DOSSIER',
    sub: 'SECTION 3  //  FM-OA-2026',
    body: 'Click any company to open its full profile. <b>Eleven collapsible sections</b> load from the database in real time:\n\nContacts · News · Outreach Angle · Email History · Lemlist · Products · Segment Mapper · Relations\n\nAll of it. One click.',
    target: '.left', card: 'right',
    btn: 'CONTINUE  →',
    achievement: {id:'eyes_open', icon:'👁', name:'EYES OPEN', desc:'Opened a company dossier', xp:75},
  },
  {
    id: 'outreach_angle', xp: 200,
    levelUp: 2,
    title: '💡  OUTREACH ANGLE  +  PERSONAS',
    sub: 'SECTION 5  //  FM-OA-2026',
    body: 'Open any company → expand <b>💡 Outreach Angle</b> → click <b>↺ Regen</b>.\n\nA row of <b>10 persona buttons</b> appears. Each one writes in a completely different voice:\n🍎 Steve — minimal  · ⚡ Jeff — metrics · 📦 Gary — blunt\n🌊 Maya — story · 🏛 Winston — dramatic\n\nPick one. The AI writes your angle in 3 seconds.',
    target: '.left', card: 'right',
    btn: 'EXCELLENT  →',
    achievement: {id:'wordsmith', icon:'✍', name:'WORDSMITH', desc:'Unlocked the persona system', xp:100},
  },
  {
    id: 'ai_bar', xp: 150,
    title: '🤖  THE AI QUERY BAR',
    sub: 'SECTION 5.1  //  FM-OA-2026',
    body: 'The AI bar at the bottom of the left panel filters your company list using natural language.\n\nType <b>"high ICP no outreach"</b> or click the <b>No angle</b> chip. The list instantly shows only high-potential companies with no angle written yet.\n\nMonday morning starts here.',
    target: '.ai-bar', card: 'above',
    btn: 'LOUD AND CLEAR  →',
    hint: 'TIP: Use the quick chips for the most common queries',
  },
  {
    id: 'compose', xp: 250,
    levelUp: 3,
    title: '✉  MEESEEKS COMPOSER',
    sub: 'SECTION 5.2  //  FM-OA-2026',
    body: 'Click <b>✉ Compose</b> in the nav (top right). The Meeseeks Composer opens.\n\nSelect a company → select a contact → pick a persona → click <b>✉ Generate Email</b>.\n\nSubject line + full email body in ~3 seconds. Edit one sentence. Send. Take the credit.',
    target: '[onclick="openComposer(null)"]', card: 'below',
    btn: 'MISSION CLEAR  →',
    achievement: {id:'first_contact', icon:'📨', name:'FIRST CONTACT', desc:'Discovered the Meeseeks Composer', xp:125},
  },
  {
    id: 'gmail', xp: 300,
    levelUp: 4,
    title: '📧  CONNECT GMAIL',
    sub: 'SECTION 4.1  //  FM-OA-2026',
    body: 'The hub can scan your Gmail inbox to:\n• Find existing threads with any company\n• Extract contact names and emails\n• Show relationship history in the Email History section\n\nOperators who connect Gmail see <b>3× more contact data</b>. It takes 10 seconds.',
    target: null, card: 'center',
    btn: '⚡ CONNECT GMAIL',
    btnAlt: 'SKIP FOR NOW',
    achievement: {id:'inbox_raider', icon:'📬', name:'INBOX RAIDER', desc:'Connected Gmail for relationship intelligence', xp:200},
    isGmail: true,
  },
  {
    id: 'complete', xp: 500,
    levelUp: 5,
    title: '🏆  OPERATOR CERTIFIED',
    sub: 'TRAINING COMPLETE  //  ALL OBJECTIVES CLEARED',
    body: 'You are now cleared for solo operations.\n\nThe <b>Field Manual FM-OA-2026</b> covers every feature in detail — check your downloads folder.\n\nGo find some data partners.',
    target: null, card: 'center',
    btn: 'DISMISS  ⇒  HUB',
    isFinale: true,
  },
];



/* ═══════════════════════════════════════════════════════════════════
   MARIO COIN SHAKE DETECTOR  —  DeviceMotion API
   Wrist shake on phone → Mario coin sound + coin emoji burst
   ═══════════════════════════════════════════════════════════════════ */

function _initShake() {
  if (typeof DeviceMotionEvent === 'undefined') return;

  if (typeof DeviceMotionEvent.requestPermission === 'function') {
    // iOS 13+ — need explicit permission, ask on first touch
    document.addEventListener('touchend', function _ask() {
      DeviceMotionEvent.requestPermission()
        .then(s => { if (s === 'granted') _attachShake(); })
        .catch(() => {});
      document.removeEventListener('touchend', _ask);
    }, {once: true});
  } else {
    _attachShake();
  }
}

function _attachShake() {
  const THRESHOLD = 18; // m/s² — firm wrist shake, not pocket jitter
  const COOLDOWN  = 1200;
  let _last = {x:0, y:0, z:0};
  let _lastTime = 0;

  window.addEventListener('devicemotion', (e) => {
    const a = e.accelerationIncludingGravity || e.acceleration;
    if (!a) return;
    const dx = Math.abs((a.x||0) - _last.x);
    const dy = Math.abs((a.y||0) - _last.y);
    const dz = Math.abs((a.z||0) - _last.z);
    _last = {x: a.x||0, y: a.y||0, z: a.z||0};

    const now = Date.now();
    if (Math.sqrt(dx*dx + dy*dy + dz*dz) > THRESHOLD && now - _lastTime > COOLDOWN) {
      _lastTime = now;
      SFX.marioCoin();
      _showCoinBurst();
    }
  });
}

function _showCoinBurst() {
  // Coin keyframe — inject once
  if (!document.getElementById('oa-coin-kf')) {
    const s = document.createElement('style');
    s.id = 'oa-coin-kf';
    s.textContent = '@keyframes oa-coin-rise{0%{transform:translateY(0) scale(1);opacity:1}60%{transform:translateY(-55px) scale(1.3);opacity:1}100%{transform:translateY(-95px) scale(.7);opacity:0}}';
    document.head.appendChild(s);
  }
  // Spawn 1-3 coins at random x
  const count = 1 + Math.floor(Math.random() * 2);
  for (let i = 0; i < count; i++) {
    const coin = document.createElement('div');
    coin.textContent = '🪙';
    const x = 20 + Math.random() * 60;
    const delay = i * 0.12;
    coin.style.cssText = [
      'position:fixed',
      `left:${x}vw`,
      'bottom:18vh',
      'font-size:clamp(26px,6vw,40px)',
      'z-index:10020',
      'pointer-events:none',
      `animation:oa-coin-rise .85s ${delay}s ease-out forwards`,
      'filter:drop-shadow(0 0 6px gold)',
    ].join(';');
    document.body.appendChild(coin);
    setTimeout(() => coin.remove(), 1100 + delay * 1000);
  }
}

/* ═══════════════════════════════════════════════════════════════════
   KONAMI CODE EASTER EGG  ↑↑↓↓←→←→BA
   Active at all times — no tutorial required.
   Sequence detected globally. Matrix overlay. 1337 XP. HACKER badge.
   Personal invitation from Łukasz to whoever found this.
   ═══════════════════════════════════════════════════════════════════ */

const _KONAMI_SEQ = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown',
                     'ArrowLeft','ArrowRight','ArrowLeft','ArrowRight',
                     'b','a']; // case-insensitive: matches b/B, a/A
let _konamiIdx = 0;

function _initKonami() {
  document.addEventListener('keydown', (e) => {
    // Use e.code for arrow keys (physical), e.key.toLowerCase() for letters
    const _k = e.code.startsWith('Arrow') ? e.code : (e.key||'').toLowerCase();
    if (_k === _KONAMI_SEQ[_konamiIdx]) {
      _konamiIdx++;
      SFX.cursor();
      if (_konamiIdx === _KONAMI_SEQ.length) {
        _konamiIdx = 0;
        _triggerKonami();
      }
    } else {
      _konamiIdx = (_k === _KONAMI_SEQ[0]) ? 1 : 0;
    }
  });
}

function _triggerKonami() {
  // XP + achievement
  _injectStyles();
  _ensureDom();
  _addXP(1337);
  setTimeout(() => _unlock({
    id:'hacker', icon:'🎩', name:'HACKER',
    desc:'Found the Konami Code. Łukasz wants to meet you.', xp:0
  }), 800);

  // Sound: dramatic power-up fanfare
  SFX.konami();

  // Matrix overlay
  _showKonamiOverlay();
}

function _showKonamiOverlay() {
  if (document.getElementById('oa-konami')) return;

  const el = document.createElement('div');
  el.id = 'oa-konami';
  el.innerHTML = `
  <style>
  #oa-konami{
    position:fixed;inset:0;z-index:10010;background:#000;
    display:flex;flex-direction:column;align-items:center;justify-content:center;
    cursor:pointer;
  }
  #oa-konami canvas{position:absolute;inset:0;width:100%;height:100%;opacity:.35;}
  #oa-konami .kn-card{
    position:relative;z-index:1;
    font-family:'IBM Plex Mono',monospace;
    background:rgba(0,8,0,.85);
    border:1px solid #00ff41;
    border-radius:4px;
    padding:clamp(16px,5vw,32px) clamp(14px,6vw,40px);
    max-width:min(540px,92vw);
    max-height:85dvh;overflow-y:auto;
    text-align:center;
    box-shadow:0 0 60px rgba(0,255,65,.25), inset 0 0 40px rgba(0,255,65,.04);
    animation:kn-pulse 2s ease-in-out infinite;
  }
  @keyframes kn-pulse{0%,100%{box-shadow:0 0 60px rgba(0,255,65,.25)}50%{box-shadow:0 0 90px rgba(0,255,65,.45)}}
  .kn-badge{
    font-size:10px;letter-spacing:.14em;color:#00ff41;text-transform:uppercase;
    margin-bottom:10px;opacity:.7;
  }
  .kn-title{
    font-size:clamp(18px,6vw,30px);font-weight:600;color:#00ff41;letter-spacing:.06em;
    margin-bottom:4px;
    text-shadow:0 0 20px rgba(0,255,65,.8);
  }
  .kn-xp{
    font-size:13px;color:#00cc33;letter-spacing:.08em;margin-bottom:24px;
  }
  .kn-divider{
    height:1px;background:linear-gradient(90deg,transparent,#00ff41,transparent);
    margin:0 0 24px;
  }
  .kn-msg{
    font-size:clamp(10px,2.5vw,12px);line-height:clamp(16px,4vw,20px);color:#aaffaa;text-align:left;
    margin-bottom:clamp(12px,4vw,24px);
  }
  .kn-msg b{color:#00ff41;}
  .kn-contact{
    background:rgba(0,255,65,.06);border:1px solid rgba(0,255,65,.3);
    border-radius:2px;padding:16px;margin-bottom:20px;text-align:left;
  }
  .kn-contact-name{font-size:14px;font-weight:600;color:#00ff41;margin-bottom:4px;}
  .kn-contact-role{font-size:10px;color:#66cc77;letter-spacing:.06em;text-transform:uppercase;}
  .kn-contact-email{font-size:11px;color:#aaffaa;margin-top:8px;}
  .kn-btn{
    height:clamp(34px,6vw,40px);width:100%;border:1px solid #00ff41;border-radius:2px;
    background:rgba(0,255,65,.1);color:#00ff41;cursor:pointer;
    font-family:'IBM Plex Mono',monospace;font-size:clamp(9px,2vw,11px);font-weight:600;
    letter-spacing:.08em;text-transform:uppercase;
    transition:all .15s;margin-bottom:8px;
    display:flex;align-items:center;justify-content:center;gap:8px;
  }
  .kn-btn:hover{background:rgba(0,255,65,.2);box-shadow:0 0 20px rgba(0,255,65,.3);}
  .kn-dismiss{
    font-size:9px;color:#336633;letter-spacing:.06em;text-transform:uppercase;
    cursor:pointer;margin-top:4px;
  }
  .kn-dismiss:hover{color:#00ff41;}
  .kn-seq{
    font-size:10px;color:#336633;letter-spacing:.12em;margin-bottom:20px;
  }
  </style>
  <canvas id="oa-konami-canvas"></canvas>
  <div class="kn-card">
    <div class="kn-badge">🎩 Achievement Unlocked</div>
    <div class="kn-title">ACCESS GRANTED</div>
    <div class="kn-xp">+1337 XP  //  HACKER RANK ACHIEVED</div>
    <div class="kn-seq">↑ ↑ ↓ ↓ ← → ← → B A</div>
    <div class="kn-divider"></div>
    <div class="kn-msg">
      You just found a secret that most people never look for.<br><br>
      That means you're <b>curious</b>, you <b>read code</b>, and you notice things that others scroll past.<br><br>
      Those are exactly the people we want to talk to.
    </div>
    <div class="kn-contact">
      <div class="kn-contact-name">Łukasz Kapuśniak</div>
      <div class="kn-contact-role">onAudience · Data Partnerships</div>
      <div class="kn-contact-email">lukasz.kapusniak@ct.pl</div>
    </div>
    <button class="kn-btn" id="kn-email-btn">
      📧 Send Meeting Request
    </button>
    <button class="kn-btn" onclick="document.getElementById('oa-konami').remove();window._oaDoom&&window._oaDoom();" style="border-color:#c00;color:#c00;background:rgba(200,0,0,.08)">
      💀 PLAY DOOM
    </button>
    <div class="kn-dismiss" onclick="document.getElementById('oa-konami').remove()">
      [ press ESC or click anywhere to close ]
    </div>
  </div>`;
  document.body.appendChild(el);

  // Matrix rain
  const canvas = document.getElementById('oa-konami-canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const chars = 'アイウエオカキクケコサシスセソタチツテト0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ<>{}[]|/\#$%@'.split('');
  const fontSize = 14;
  const cols = Math.floor(canvas.width / fontSize);
  const drops = Array.from({length: cols}, () => Math.random() * -canvas.height / fontSize);

  const rain = setInterval(() => {
    ctx.fillStyle = 'rgba(0,0,0,.05)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#00ff41';
    ctx.font = fontSize + 'px monospace';
    drops.forEach((y, i) => {
      const char = chars[Math.floor(Math.random() * chars.length)];
      ctx.fillText(char, i * fontSize, y * fontSize);
      if (y * fontSize > canvas.height && Math.random() > .975) drops[i] = 0;
      drops[i] += .5;
    });
  }, 33);

  // Email button — prefill mailto
  document.getElementById('kn-email-btn').addEventListener('click', () => {
    const sub = encodeURIComponent('I found the Konami Code in your hub');
    const body = encodeURIComponent(
      'Hi %C5%81ukasz,%0A%0AI was exploring the onAudience Sales Intelligence Hub and found the Konami Code easter egg.%0A%0AI would love to connect.%0A%0ABest,'
    );
    window.open(`mailto:lukasz.kapusniak@ct.pl?subject=${sub}&body=${body}`);
  });

  // Close on click outside card or ESC
  el.addEventListener('click', (e) => {
    if (e.target === el) { clearInterval(rain); el.remove(); }
  });
  document.addEventListener('keydown', function _esc(e) {
    if (e.key === 'Escape') { clearInterval(rain); el?.remove(); document.removeEventListener('keydown', _esc); }
  });

  // Auto-stop rain after 30s to save CPU (overlay stays)
  setTimeout(() => clearInterval(rain), 30000);
}

/* ── State ───────────────────────────────────────────────────────────── */
let _step = 0;
let _xp = 0;
let _level = 0;
let _achievements = [];
let _achvQueue = [];
let _achvTimer = null;
let _active = false;
let _lang = localStorage.getItem('oaTutLang') || 'en';

function _load() {
  _xp = parseInt(localStorage.getItem(TKEY_XP) || '0');
  _level = _xpToLevel(_xp);
  try { _achievements = JSON.parse(localStorage.getItem(TKEY_ACHV) || '[]'); } catch { _achievements = []; }
  _step = parseInt(localStorage.getItem(TKEY_STEP) || '0');
}

function _save() {
  localStorage.setItem(TKEY_XP, String(_xp));
  localStorage.setItem(TKEY_ACHV, JSON.stringify(_achievements));
  localStorage.setItem(TKEY_STEP, String(_step));
}

function _xpToLevel(xp) {
  for (let i = XP_LEVELS.length - 1; i >= 0; i--) {
    if (xp >= XP_LEVELS[i]) return i;
  }
  return 0;
}

function _xpInLevel(xp, level) {
  const lo = XP_LEVELS[level] || 0;
  const hi = XP_LEVELS[level + 1] || XP_LEVELS[level] + 500;
  return Math.min(1, (xp - lo) / (hi - lo));
}


/* ── i18n: localise a step for the current language ─────────────────── */
function _L(step) {
  if (_lang === 'en' || !STEP_I18N[_lang]) return step;
  const ov = STEP_I18N[_lang][step.id] || {};
  const result = { ...step, ...ov };
  if (step.achievement && ov.achievement) {
    result.achievement = { ...step.achievement, ...ov.achievement };
  }
  return result;
}

function _setLang(code) {
  if (_lang === code) return;
  _lang = code;
  localStorage.setItem('oaTutLang', code);
  SFX.cursor();
  _renderCard();
}

function _langSwitcherHTML() {
  return `<div class="oa-tut-langs">` +
    Object.entries(LANG_META).map(([code, m]) =>
      `<button class="oa-tut-lang-btn ${_lang === code ? 'active' : ''}"
        onclick="window._tutLang('${code}')" title="${m.name}">${m.flag} ${m.label}</button>`
    ).join('') +
  `</div>`;
}

/* ── DOM creation ─────────────────────────────────────────────────────── */
function _injectStyles() {
  if (document.getElementById('oa-tut-style')) return;
  const s = document.createElement('style');
  s.id = 'oa-tut-style';
  s.textContent = `
#oa-tut-spotlight{
  position:fixed;z-index:9997;pointer-events:none;
  transition:top .35s cubic-bezier(.4,0,.2,1),left .35s cubic-bezier(.4,0,.2,1),
             width .35s cubic-bezier(.4,0,.2,1),height .35s cubic-bezier(.4,0,.2,1);
  border-radius:4px;
  /* JRPG: dark overlay + animated border */
  box-shadow:0 0 0 9999px rgba(0,0,0,.78);
  border:2px solid var(--g);
  animation:oa-sp-pulse 1.8s ease-in-out infinite;
}
@keyframes oa-sp-pulse{
  0%,100%{border-color:var(--g);box-shadow:0 0 0 9999px rgba(0,0,0,.78),0 0 0 3px rgba(23,128,102,.2),0 0 20px 2px rgba(23,128,102,.4);}
  50%{border-color:#2dd4a7;box-shadow:0 0 0 9999px rgba(0,0,0,.78),0 0 0 5px rgba(23,128,102,.15),0 0 32px 6px rgba(45,212,167,.55);}
}
/* Corner brackets — JRPG cursor style */
#oa-tut-spotlight::before,#oa-tut-spotlight::after{
  content:'';position:absolute;width:12px;height:12px;
  border-color:var(--g);border-style:solid;
  animation:oa-sp-corner 1.8s ease-in-out infinite;
}
#oa-tut-spotlight::before{top:-5px;left:-5px;border-width:3px 0 0 3px;border-radius:2px 0 0 0;}
#oa-tut-spotlight::after{bottom:-5px;right:-5px;border-width:0 3px 3px 0;border-radius:0 0 2px 0;}
@keyframes oa-sp-corner{
  0%,100%{border-color:var(--g);opacity:1;}
  50%{border-color:#2dd4a7;opacity:.7;}
}
/* Step-transition flash: briefly white when spotlight moves */
#oa-tut-spotlight.flash{
  animation:none;
  border-color:#fff;
  box-shadow:0 0 0 9999px rgba(0,0,0,.78),0 0 0 4px rgba(255,255,255,.3),0 0 24px 8px rgba(255,255,255,.6);
}
/* "▶ FOCUS" label that appears below the spotlight */
#oa-tut-sp-label{
  position:fixed;z-index:9998;pointer-events:none;
  font-family:'IBM Plex Mono',monospace;font-size:clamp(7px,1.5vw,9px);
  font-weight:600;letter-spacing:.1em;text-transform:uppercase;
  color:var(--g);opacity:0;
  transition:opacity .3s;
  white-space:nowrap;
  text-shadow:0 0 8px rgba(23,128,102,.8);
  animation:oa-sp-label-blink 1.8s ease-in-out infinite;
}
#oa-tut-sp-label.vis{opacity:1;}
@keyframes oa-sp-label-blink{0%,100%{opacity:.9;}50%{opacity:.5;}}

#oa-tut-card{
  position:fixed;z-index:9999;
  font-family:'IBM Plex Mono',monospace;
  background:var(--surf);
  border:1px solid var(--rule);
  border-radius:4px;
  box-shadow:0 8px 32px rgba(0,0,0,.22);
  width:min(560px,92vw);
  max-height:90dvh;
  overflow-y:auto;
  transition:top .35s cubic-bezier(.4,0,.2,1),left .35s cubic-bezier(.4,0,.2,1),
             opacity .2s;
  overflow:hidden;
}
.oa-tut-stripe{
  height:4px;background:var(--g);position:relative;overflow:hidden;
}
.oa-tut-stripe-inner{
  position:absolute;left:0;top:0;height:100%;background:#fff;opacity:.4;
  animation:oa-tut-shimmer 1.8s infinite;width:60px;
}
@keyframes oa-tut-shimmer{0%{left:-60px}100%{left:400px}}
.oa-tut-header{
  padding:clamp(8px,2.5vw,14px) clamp(10px,3vw,18px) 0;display:flex;align-items:center;gap:clamp(6px,1.5vw,10px);
}
.oa-tut-step-badge{
  font-size:clamp(8px,2vw,11px);font-weight:600;letter-spacing:.08em;text-transform:uppercase;
  color:var(--g);background:var(--gb,rgba(23,128,102,.08));
  border:1px solid var(--gr,rgba(23,128,102,.28));border-radius:2px;
  padding:2px 6px;white-space:nowrap;flex-shrink:0;
}
.oa-tut-title{
  font-size:clamp(10px,2.5vw,13px);font-weight:600;letter-spacing:.06em;color:var(--t1);
  text-transform:uppercase;flex:1;
}
.oa-tut-close{
  width:clamp(22px,4vw,28px);height:clamp(22px,4vw,28px);border:none;background:none;cursor:pointer;
  color:var(--t3);font-size:clamp(16px,3.5vw,20px);display:flex;align-items:center;justify-content:center;
  flex-shrink:0;padding:0;
}
.oa-tut-close:hover{color:var(--t1);}
.oa-tut-sub{
  font-size:clamp(7px,1.8vw,10px);letter-spacing:.06em;color:var(--t3);text-transform:uppercase;
  padding:2px clamp(10px,3vw,18px) 0;
}
.oa-tut-body{
  padding:clamp(8px,2.5vw,14px) clamp(10px,3vw,18px);font-size:clamp(10px,2.5vw,13px);line-height:clamp(16px,4vw,22px);color:var(--t2);
  white-space:pre-wrap;
}
.oa-tut-body b{color:var(--t1);}
.oa-tut-hint{
  margin:0 clamp(10px,3vw,18px) 8px;padding:6px 10px;background:var(--surf2);
  border-left:2px solid var(--g);font-size:clamp(8px,2vw,11px);color:var(--t3);
  border-radius:0 2px 2px 0;
}
.oa-tut-footer{padding:0 18px 18px;display:flex;flex-direction:column;gap:8px;}
.oa-tut-btn{
  height:clamp(32px,6vw,40px);padding:0 clamp(10px,3vw,18px);border:none;border-radius:2px;cursor:pointer;
  font-family:'IBM Plex Mono',monospace;font-size:clamp(9px,2vw,11px);font-weight:600;
  letter-spacing:.06em;text-transform:uppercase;
  background:var(--g);color:#fff;transition:background .15s;
  display:flex;align-items:center;justify-content:center;gap:6px;
}
.oa-tut-btn:hover{background:var(--gd);}
.oa-tut-btn.alt{
  background:var(--surf2);color:var(--t2);border:1px solid var(--rule);
}
.oa-tut-btn.alt:hover{background:var(--surf3);color:var(--t1);}
.oa-tut-xp-row{
  display:flex;align-items:center;gap:8px;
  padding:8px clamp(10px,3vw,18px);border-top:1px solid var(--rule);background:var(--surf2);
}
.oa-tut-level{
  font-size:clamp(8px,2vw,11px);font-weight:600;color:var(--g);letter-spacing:.04em;
  white-space:nowrap;flex-shrink:0;
}
.oa-tut-xp-bar{
  flex:1;height:4px;background:var(--rule);border-radius:2px;overflow:hidden;
}
.oa-tut-xp-fill{
  height:100%;background:var(--g);border-radius:2px;
  transition:width .6s cubic-bezier(.4,0,.2,1);
}
.oa-tut-xp-num{
  font-size:clamp(7px,1.8vw,10px);color:var(--t3);letter-spacing:.04em;white-space:nowrap;flex-shrink:0;
}

/* ── Achievement toast ─────────────────────── */
#oa-tut-achv{
  position:fixed;top:60px;right:16px;z-index:10001;
  font-family:'IBM Plex Mono',monospace;
  background:var(--surf);
  border:1px solid var(--g);border-radius:4px;
  box-shadow:0 4px 20px rgba(0,0,0,.2);
  width:min(380px,88vw);overflow:hidden;
  transform:translateX(400px);
  transition:transform .4s cubic-bezier(.4,0,.2,1);
}
#oa-tut-achv.vis{transform:translateX(0);}
.oa-achv-bar{height:3px;background:var(--g);}
.oa-achv-inner{padding:clamp(8px,2.5vw,14px) clamp(10px,3vw,16px);display:flex;gap:clamp(8px,2vw,14px);align-items:flex-start;}
.oa-achv-icon{font-size:clamp(22px,5vw,32px);flex-shrink:0;line-height:1;}
.oa-achv-text{}
.oa-achv-label{font-size:clamp(7px,2vw,10px);color:var(--t3);letter-spacing:.08em;text-transform:uppercase;}
.oa-achv-name{font-size:clamp(10px,2.5vw,14px);font-weight:600;color:var(--t1);margin:2px 0;}
.oa-achv-desc{font-size:clamp(8px,2vw,11px);color:var(--t2);}
.oa-achv-xp{
  margin-left:auto;font-size:clamp(9px,2.5vw,12px);font-weight:600;color:var(--g);
  white-space:nowrap;flex-shrink:0;
}

/* ── Level-up flash ────────────────────────── */
#oa-tut-levelup{
  position:fixed;inset:0;z-index:10002;
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  pointer-events:none;opacity:0;
  background:rgba(23,128,102,.08);
  transition:opacity .2s;
}
#oa-tut-levelup.vis{opacity:1;}
.oa-lu-badge{
  font-family:'IBM Plex Mono',monospace;
  font-size:clamp(12px,3.5vw,18px);letter-spacing:.12em;color:var(--g);text-transform:uppercase;
  margin-bottom:6px;
}
.oa-lu-name{
  font-family:'IBM Plex Mono',monospace;
  font-size:clamp(28px,8vw,52px);font-weight:600;letter-spacing:.04em;color:var(--g);
  text-shadow:0 0 60px rgba(23,128,102,.5);
}
.oa-lu-icon{font-size:clamp(40px,10vw,72px);margin-bottom:8px;}

/* ── Progress dots ─────────────────────────── */
.oa-tut-dots{
  display:flex;gap:5px;align-items:center;padding:8px clamp(10px,3vw,18px) 0;
}
.oa-tut-dot{
  width:9px;height:9px;border-radius:50%;background:var(--rule);
  transition:background .3s,transform .3s;
}
.oa-tut-dot.done{background:var(--g);}
.oa-tut-dot.current{background:var(--g);transform:scale(1.4);}

/* ── Finale ──────────────────────────────────  */
.oa-tut-finale{
  padding:clamp(12px,4vw,24px) clamp(10px,3vw,18px) clamp(8px,2vw,12px);text-align:center;
}
.oa-tut-finale-icon{font-size:clamp(32px,8vw,60px);margin-bottom:8px;}
.oa-tut-finale-level{
  font-size:clamp(8px,2vw,11px);letter-spacing:.1em;color:var(--t3);text-transform:uppercase;
  margin-bottom:4px;
}
.oa-tut-finale-name{
  font-size:clamp(16px,5vw,28px);font-weight:600;color:var(--g);letter-spacing:.04em;
  margin-bottom:10px;
}
.oa-tut-achv-grid{
  display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin-bottom:12px;
}
.oa-tut-achv-chip{
  font-size:clamp(8px,2vw,11px);padding:4px 8px;background:var(--surf2);
  border:1px solid var(--rule);border-radius:2px;color:var(--t2);
  display:flex;align-items:center;gap:4px;
}
.oa-tut-achv-chip.unlocked{
  background:var(--gb,rgba(23,128,102,.08));border-color:var(--gr,rgba(23,128,102,.28));
  color:var(--g);
}

.oa-tut-langs{
  display:flex;gap:4px;align-items:center;padding:6px clamp(10px,3vw,18px);
  border-top:1px solid var(--rule);background:var(--surf2);flex-wrap:wrap;
}
.oa-tut-lang-btn{
  height:clamp(20px,4vw,24px);padding:0 6px;border-radius:2px;border:1px solid var(--rule);
  background:var(--surf3);color:var(--t2);cursor:pointer;
  font-family:'IBM Plex Mono',monospace;font-size:clamp(8px,1.8vw,10px);font-weight:500;
  transition:all .15s;white-space:nowrap;
}
.oa-tut-lang-btn:hover{background:var(--surf);color:var(--t1);border-color:var(--g);}
.oa-tut-lang-btn.active{background:var(--g);color:#fff;border-color:var(--g);}

/* ── JRPG bouncing arrow ── */
#oa-tut-arrow{position:fixed;z-index:9998;pointer-events:none;display:none;font-size:clamp(18px,3vw,24px);line-height:1;color:var(--g);animation:oa-arrow-bounce .55s ease-in-out infinite alternate;filter:drop-shadow(0 0 6px rgba(23,128,102,.9));}
#oa-tut-arrow.vis{display:block;}
@keyframes oa-arrow-bounce{0%{transform:translateY(0);}100%{transform:translateY(9px);}}

/* ── Mobile: card snaps to bottom, spotlight hidden ── */
@media (max-width:600px){
  #oa-tut-card{
    position:fixed !important;
    left:4vw !important;
    right:4vw !important;
    width:auto !important;
    top:auto !important;
    bottom:20px !important;
    max-height:75dvh;
    border-radius:4px;
  }
  #oa-tut-spotlight{ display:none !important; }
  .oa-tut-dots{ flex-wrap:wrap; }
}
  `;
  document.head.appendChild(s);
}

function _getEl(id) { return document.getElementById(id); }

function _ensureDom() {
  // JRPG FOCUS label
  if (!document.getElementById('oa-tut-sp-label')) {
    const lbl = document.createElement('div');
    lbl.id = 'oa-tut-sp-label';
    document.body.appendChild(lbl);
  }
  if (!_getEl('oa-tut-spotlight')) {
    const sp = document.createElement('div');
    sp.id = 'oa-tut-spotlight';
    sp.style.display = 'none';
    document.body.appendChild(sp);
  }
  if (!_getEl('oa-tut-card')) {
    const c = document.createElement('div');
    c.id = 'oa-tut-card';
    c.style.display = 'none';
    document.body.appendChild(c);
  }
  if (!_getEl('oa-tut-achv')) {
    const a = document.createElement('div');
    a.id = 'oa-tut-achv';
    a.innerHTML = '<div class="oa-achv-bar"></div><div class="oa-achv-inner"><div class="oa-achv-icon" id="oa-achv-icon">🏆</div><div class="oa-achv-text"><div class="oa-achv-label">Achievement Unlocked</div><div class="oa-achv-name" id="oa-achv-name"></div><div class="oa-achv-desc" id="oa-achv-desc"></div></div><div class="oa-achv-xp" id="oa-achv-xp"></div></div>';
    document.body.appendChild(a);
  }
  if (!_getEl('oa-tut-levelup')) {
    const lu = document.createElement('div');
    lu.id = 'oa-tut-levelup';
    lu.innerHTML = '<div class="oa-lu-icon" id="oa-lu-icon"></div><div class="oa-lu-badge">RANK UP</div><div class="oa-lu-name" id="oa-lu-name"></div>';
    document.body.appendChild(lu);
  }
}

/* ── Spotlight ────────────────────────────────────────────────────────── */
function _spotlight(selector, label) {
  const sp = _getEl('oa-tut-spotlight');
  const lb = document.getElementById('oa-tut-sp-label');
  { const _arC=document.getElementById('oa-tut-arrow'); if(_arC)_arC.classList.remove('vis'); }
  if (!selector) {
    sp.style.display = 'none';
    if (lb) lb.classList.remove('vis');
    return;
  }
  const el = document.querySelector(selector);
  if (!el) {
    sp.style.display = 'none';
    if (lb) lb.classList.remove('vis');
    return;
  }
  const r = el.getBoundingClientRect();
  if (!r.width) {
    sp.style.display = 'none';
    if (lb) lb.classList.remove('vis');
    return;
  }
  // Flash on each new target
  sp.classList.add('flash');
  setTimeout(() => sp.classList.remove('flash'), 220);
  const pad = 6;
  const bc2 = _bottomClearance();
  const maxBottom = window.innerHeight - bc2 - pad;
  const spotTop = r.top - pad;
  const spotH   = Math.min(r.height + pad * 2, maxBottom - spotTop);
  sp.style.display = 'block';
  sp.style.top    = spotTop + 'px';
  sp.style.left   = (r.left - pad) + 'px';
  sp.style.width  = (r.width + pad * 2) + 'px';
  sp.style.height = spotH + 'px';
  sp._targetLeft = r.left + r.width / 2;

  // FOCUS label — positioned below spotlight, or above if too low
  if (lb && label) {
    const lbBottom = spotTop + spotH + 6;
    const lbTop = lbBottom > window.innerHeight - 60 - _bottomClearance()
      ? spotTop - 22 : lbBottom;
    lb.style.top  = lbTop + 'px';
    lb.style.left = (r.left - pad) + 'px';
    lb.textContent = '▶ ' + label;
    lb.classList.add('vis');
  } else if (lb) {
    lb.classList.remove('vis');
  }
}

/* ── Card positioning ─────────────────────────────────────────────────── */

/* ── Bottom clearance — demo bar / any fixed bottom bar ─────────── */
function _bottomClearance() {
  const bar = document.getElementById('oa-demo-bar');
  return bar && bar.offsetHeight > 0 ? bar.offsetHeight + 4 : 0;
}

function _positionCard(card, position, target) {
  if (card._userDragged) return; // user moved it — respect their choice
  const vw = window.innerWidth, rawVh = window.innerHeight;
  const bc = _bottomClearance();
  const vh = rawVh - bc;
  const cw = 560, ch = card.offsetHeight || 400;

  if (vw <= 600) { card.style.bottom = (20 + bc) + 'px'; return; }

  if (position === 'center' || !target) {
    card.style.top  = Math.round((vh - ch) / 2) + 'px';
    card.style.left = Math.round((vw - cw) / 2) + 'px';
    return;
  }
  const el = document.querySelector(target);
  if (!el) {
    card.style.top  = Math.round((vh - ch) / 2) + 'px';
    card.style.left = Math.round((vw - cw) / 2) + 'px';
    return;
  }
  const r = el.getBoundingClientRect();
  const gap = 16;

  if (position === 'right') {
    // If coPanel is open there won't be room — float top-right instead
    const coPanel = document.getElementById('coPanel');
    const coPanelOpen = coPanel && coPanel.style.display !== 'none';
    const spaceAvail = vw - r.right - cw - 24;
    if (coPanelOpen && spaceAvail < 60) {
      card.style.left = Math.max(r.right + 8, vw - cw - 12) + 'px';
      card.style.top  = '48px';
    } else {
      card.style.left = Math.min(r.right + gap, vw - cw - 8) + 'px';
      card.style.top  = Math.max(8, Math.min(r.top, vh - ch - 8)) + 'px';
    }
  } else if (position === 'below') {
    card.style.top  = Math.min(r.bottom + gap, vh - ch - 8) + 'px';
    card.style.left = Math.max(8, Math.min(r.left, vw - cw - 8)) + 'px';
  } else if (position === 'above') {
    const cardBtm = r.top - gap;
    card.style.top  = Math.max(52, cardBtm - ch) + 'px';
    card.style.left = Math.max(8, Math.min(r.left, vw - cw - 8)) + 'px';
    const arEl = document.getElementById('oa-tut-arrow');
    const spEl = document.getElementById('oa-tut-spotlight');
    if (arEl) {
      arEl.style.top  = (cardBtm + 4) + 'px';
      arEl.style.left = ((spEl && spEl._targetLeft) || (r.left + r.width/2)) - 12 + 'px';
      arEl.classList.add('vis');
    }
  }
}

/* ── Drag to move tutorial card ──────────────────────────────────── */
function _initTutDrag(card) {
  const handle = card.querySelector('.oa-tut-stripe');
  if (!handle || handle._dragBound) return;
  handle._dragBound = true;
  let sx, sy, sl, st, active = false;
  const xy = e => e.touches ? [e.touches[0].clientX, e.touches[0].clientY] : [e.clientX, e.clientY];
  const down = e => {
    if (card.classList.contains('oa-tut-mini')) return;
    [sx, sy] = xy(e);
    sl = parseInt(card.style.left) || card.getBoundingClientRect().left;
    st = parseInt(card.style.top)  || card.getBoundingClientRect().top;
    active = true; card.classList.add('oa-tut-dragging'); e.preventDefault();
  };
  const move = e => {
    if (!active) return;
    const [cx, cy] = xy(e);
    const vw = window.innerWidth, vh = window.innerHeight;
    card.style.left = Math.max(4, Math.min(vw - card.offsetWidth  - 4, sl + cx - sx)) + 'px';
    card.style.top  = Math.max(4, Math.min(vh - 60,                    st + cy - sy)) + 'px';
    e.preventDefault();
  };
  const up = () => {
    if (!active) return;
    active = false; card.classList.remove('oa-tut-dragging'); card._userDragged = true;
  };
  handle.addEventListener('mousedown',  down);
  handle.addEventListener('touchstart', down, {passive:false});
  document.addEventListener('mousemove',  move);
  document.addEventListener('touchmove',  move, {passive:false});
  document.addEventListener('mouseup',   up);
  document.addEventListener('touchend',  up);
}

/* ── Mini / expand toggle ────────────────────────────────────────── */
function _tutToggleMiniCard() {
  const card = document.getElementById('oa-tut-card');
  if (!card) return;
  const isMini = card.classList.toggle('oa-tut-mini');
  if (isMini) {
    const bc = _bottomClearance();
    card.style.cssText = `position:fixed;z-index:9999;bottom:${bc + 8}px;right:12px;left:auto;top:auto;`;
  } else {
    card._userDragged = false;
    _renderCard();
  }
}

/* ── Render card ──────────────────────────────────────────────────────── */
function _renderCard() {
  const s = _L(STEPS[_step]);
  if (!s) return;
  const card = _getEl('oa-tut-card');
  card.style.display = 'block';

  // Progress dots
  const dots = STEPS.map((st, i) =>
    `<div class="oa-tut-dot ${i < _step ? 'done' : i === _step ? 'current' : ''}"></div>`
  ).join('');

  // Language switcher + XP bar
  const langBar = _langSwitcherHTML();
  const pct = Math.round(_xpInLevel(_xp, _level) * 100);
  const xpBar = `
    <div class="oa-tut-xp-row">
      <div class="oa-tut-level">${LEVEL_ICONS[_level]} ${LEVEL_NAMES[_level]}</div>
      <div class="oa-tut-xp-bar"><div class="oa-tut-xp-fill" style="width:${pct}%"></div></div>
      <div class="oa-tut-xp-num">${_xp} XP</div>
    </div>`;

  let inner = '';

  if (s.isFinale) {
    const _allAchvDefs = [
      ...STEPS.flatMap(st => st.achievement ? [st.achievement] : []),
      ...Object.values(typeof LANG_ACHIEVEMENTS !== 'undefined' ? LANG_ACHIEVEMENTS : {}),
      ...( typeof LANG_MILESTONE_ACHVS !== 'undefined' ? LANG_MILESTONE_ACHVS : []),
      {id:'hacker', icon:'🎩', name:'HACKER'},
    ];
    const achvGrid = _achievements.map(id => {
      const found = _allAchvDefs.find(a => a.id === id);
      return found ? `<div class="oa-tut-achv-chip unlocked">${found.icon} ${found.name}</div>` : '';
    }).join('');
    inner = `
      <div class="oa-tut-stripe"><div class="oa-tut-stripe-inner"></div></div>
      <div class="oa-tut-finale">
        <div class="oa-tut-finale-icon">🏆</div>
        <div class="oa-tut-finale-level">LEVEL ${_level} — ${LEVEL_NAMES[_level]}</div>
        <div class="oa-tut-finale-name">${_xp} XP EARNED</div>
        <div class="oa-tut-body" style="text-align:left;font-size:12px">${s.body.replace(/\n/g,'<br/>')}</div>
        ${achvGrid ? `<div class="oa-tut-achv-grid">${achvGrid}</div>` : ''}
        <div class="oa-tut-footer">
          <button class="oa-tut-btn" onclick="window._tutNext()">🎖️ ${s.btn}</button>
        </div>
      </div>
      ${langBar}${xpBar}`;
  } else if (s.isGmail) {
    const gmailConnected = !!localStorage.getItem('oaGmailToken');
    inner = `
      <div class="oa-tut-stripe"><div class="oa-tut-stripe-inner"></div></div>
      <div class="oa-tut-dots">${dots}</div>
      <div class="oa-tut-header">
        <div class="oa-tut-step-badge">STEP ${_step + 1}/${STEPS.length}</div>
        <div class="oa-tut-title">${s.title}</div>
        <button class="oa-tut-close" onclick="window._tutClose()" title="Skip tutorial">✕</button>
      </div>
      ${s.sub ? `<div class="oa-tut-sub">${s.sub}</div>` : ''}
      <div class="oa-tut-body">${s.body.replace(/\n/g,'<br/>')}</div>
      <div class="oa-tut-footer">
        ${gmailConnected
          ? `<button class="oa-tut-btn" onclick="window._tutNext()">✓ GMAIL CONNECTED  →</button>`
          : `<button class="oa-tut-btn" onclick="window._tutGmail()">⚡ CONNECT GMAIL</button>
             <button class="oa-tut-btn alt" onclick="window._tutNext()">${s.btnAlt}</button>`}
      </div>
      ${langBar}${xpBar}`;
  } else {
    inner = `
      <div class="oa-tut-stripe"><div class="oa-tut-stripe-inner"></div></div>
      <div class="oa-tut-dots">${dots}</div>
      <div class="oa-tut-header">
        <div class="oa-tut-step-badge">STEP ${_step + 1}/${STEPS.length}</div>
        <div class="oa-tut-title">${s.title}</div>
        <button class="oa-tut-close" onclick="window._tutClose()" title="Skip tutorial">✕</button>
      </div>
      ${s.sub ? `<div class="oa-tut-sub">${s.sub}</div>` : ''}
      <div class="oa-tut-body">${s.body.replace(/\n/g,'<br/>')}</div>
      ${s.hint ? `<div class="oa-tut-hint">${s.hint}</div>` : ''}
      <div class="oa-tut-footer">
        <button class="oa-tut-btn" onclick="window._tutNext()">${s.btn}</button>
      </div>
      ${langBar}${xpBar}`;
  }

  // Mini pill — visible only when .oa-tut-mini
  card.innerHTML = `<div class="oa-tut-mini-pill" onclick="window._tutToggleMini()">
    <div class="oa-tut-mini-dot"></div>STEP ${_step + 1}/${STEPS.length} ▲</div>` + inner;

  // Add — minimise button next to ✕ close
  const _xBtn = card.querySelector('.oa-tut-close');
  if (_xBtn && !card.querySelector('.oa-tut-min-btn')) {
    const _mBtn = document.createElement('button');
    _mBtn.className = 'oa-tut-close oa-tut-min-btn';
    _mBtn.title = 'Minimise — move out of the way';
    _mBtn.textContent = '—';
    _mBtn.onclick = e => { e.stopPropagation(); window._tutToggleMini(); };
    _xBtn.parentNode.insertBefore(_mBtn, _xBtn);
  }

  // Attach drag to green stripe (idempotent)
  _initTutDrag(card);

  // Position after render
  requestAnimationFrame(() => {
    const _spLabel = {
      company_list:'Company List',stats_bar:'Pipeline Filters',
      company_panel:'Left Panel',outreach_angle:'Left Panel',
      ai_bar:'AI Query Bar',compose:'Compose Button'
    }[s.id] || null;
    _spotlight(s.target, _spLabel);
    if (!card.classList.contains('oa-tut-mini')) _positionCard(card, s.card, s.target);
  });
}

/* ── XP + level up ────────────────────────────────────────────────────── */
function _addXP(amount, targetLevel) {
  const prevLevel = _level;
  _xp += amount;
  SFX.xpTick();
  _level = _xpToLevel(_xp);
  _save();

  // Animate XP bar update
  const fill = document.querySelector('.oa-tut-xp-fill');
  const num  = document.querySelector('.oa-tut-xp-num');
  const lvl  = document.querySelector('.oa-tut-level');
  if (fill) fill.style.width = Math.round(_xpInLevel(_xp, _level) * 100) + '%';
  if (num)  num.textContent = _xp + ' XP';
  if (lvl)  lvl.textContent = LEVEL_ICONS[_level] + ' ' + LEVEL_NAMES[_level];

  if (targetLevel && _level >= targetLevel && prevLevel < targetLevel) {
    _showLevelUp(targetLevel);
  }
}

function _showLevelUp(level) {
  const lu = _getEl('oa-tut-levelup');
  _getEl('oa-lu-icon').textContent = LEVEL_ICONS[level];
  _getEl('oa-lu-name').textContent = LEVEL_NAMES[level];
  SFX.levelUp();
  lu.classList.add('vis');
  setTimeout(() => lu.classList.remove('vis'), 2200);
}

/* ── Achievements ─────────────────────────────────────────────────────── */
function _unlock(achievement) {
  if (!achievement || _achievements.includes(achievement.id)) return;
  _achievements.push(achievement.id);
  _save();
  _achvQueue.push(achievement);
  if (!_achvTimer) _showNextAchv();
}

function _showNextAchv() {
  if (!_achvQueue.length) { _achvTimer = null; return; }
  const a = _achvQueue.shift();
  const el = _getEl('oa-tut-achv');
  _getEl('oa-achv-icon').textContent = a.icon;
  _getEl('oa-achv-name').textContent = a.name;
  _getEl('oa-achv-desc').textContent = a.desc;
  _getEl('oa-achv-xp').textContent = '+' + (a.xp || 0) + ' XP';
  el.classList.add('vis');
  SFX.achievement();
  if (a.xp) _addXP(a.xp);
  _achvTimer = setTimeout(() => {
    el.classList.remove('vis');
    setTimeout(_showNextAchv, 400);
  }, 3000);
}

/* ── Navigation ───────────────────────────────────────────────────────── */
function _tutNext() {
  const s = STEPS[_step];
  if (!s) return;
  if (s.isFinale) { SFX.victory(); } else { SFX.next(); }

  // Award XP for this step
  _addXP(s.xp, s.levelUp);

  // Unlock achievement if any
  if (s.achievement) {
    setTimeout(() => _unlock(s.achievement), 400);
  }

  if (s.isFinale) {
    _tutFinish();
    return;
  }

  _step++;
  _save();

  // Brief delay then render next
  setTimeout(() => {
    _renderCard();
  }, 150);
}

function _tutGmail() {
  SFX.gmail();
  const s = STEPS[_step];
  // Call hub's gmail connect
  if (typeof window.oaGmailConnect === 'function') {
    window.oaGmailConnect();
    // Poll for connection
    let tries = 0;
    const check = setInterval(() => {
      if (localStorage.getItem('oaGmailToken') || tries++ > 30) {
        clearInterval(check);
        if (s.achievement && localStorage.getItem('oaGmailToken')) {
          _unlock(s.achievement);
        }
        _addXP(s.xp, s.levelUp);
        _step++;
        _save();
        setTimeout(_renderCard, 500);
      }
    }, 1000);
  } else {
    // Fallback: just advance
    _tutNext();
  }
}

function _tutClose() {
  SFX.close();
  _active = false;
  const card = _getEl('oa-tut-card');
  const sp = _getEl('oa-tut-spotlight');
  if (card) { card.style.opacity = '0'; setTimeout(() => { card.style.display = 'none'; card.style.opacity = ''; }, 200); }
  if (sp) sp.style.display = 'none';
}

function _tutFinish() {
  localStorage.setItem(TKEY_DONE, '1');
  _active = false;
  const card = _getEl('oa-tut-card');
  const sp = _getEl('oa-tut-spotlight');
  if (card) { card.style.display = 'none'; }
  if (sp) sp.style.display = 'none';
}

/* ── Public API ───────────────────────────────────────────────────────── */
export function initKonami() { _initKonami(); _initShake(); }

export function startTutorial(force = false) {
  if (!force && localStorage.getItem(TKEY_DONE)) return;
  _load();
  if (!force) _step = 0; // always start fresh unless explicit resume
  _active = true;
  _injectStyles();
  _ensureDom();
  SFX.start();
  _renderCard();
}

export function resetTutorial() {
  localStorage.removeItem(TKEY_DONE);
  localStorage.removeItem(TKEY_XP);
  localStorage.removeItem(TKEY_ACHV);
  localStorage.removeItem(TKEY_STEP);
  _xp = 0; _level = 0; _achievements = []; _step = 0;
  startTutorial(true);
}

export function isTutorialDone() {
  return !!localStorage.getItem(TKEY_DONE);
}

/* window exports (onclick handlers) */
window._tutNext  = _tutNext;
window._tutClose = _tutClose;
window._tutToggleMini = _tutToggleMiniCard;
window._tutToggleMiniCard = _tutToggleMiniCard;
window._tutGmail = _tutGmail;
window._tutLang  = _setLang;
