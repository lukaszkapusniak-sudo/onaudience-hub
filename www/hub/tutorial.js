import { LANG_META, STEP_I18N } from './tutorial-i18n.js?v=20260409c2';
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
  box-shadow:0 0 0 9999px rgba(0,0,0,.72);
  border:2px solid var(--g);
}
#oa-tut-card{
  position:fixed;z-index:9999;
  font-family:'IBM Plex Mono',monospace;
  background:var(--surf);
  border:1px solid var(--rule);
  border-radius:4px;
  box-shadow:0 8px 32px rgba(0,0,0,.22);
  width:560px;
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
  padding:14px 18px 0;display:flex;align-items:center;gap:10px;
}
.oa-tut-step-badge{
  font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;
  color:var(--g);background:var(--gb,rgba(23,128,102,.08));
  border:1px solid var(--gr,rgba(23,128,102,.28));border-radius:2px;
  padding:2px 6px;white-space:nowrap;flex-shrink:0;
}
.oa-tut-title{
  font-size:13px;font-weight:600;letter-spacing:.06em;color:var(--t1);
  text-transform:uppercase;flex:1;
}
.oa-tut-close{
  width:28px;height:28px;border:none;background:none;cursor:pointer;
  color:var(--t3);font-size:20px;display:flex;align-items:center;justify-content:center;
  flex-shrink:0;padding:0;
}
.oa-tut-close:hover{color:var(--t1);}
.oa-tut-sub{
  font-size:10px;letter-spacing:.06em;color:var(--t3);text-transform:uppercase;
  padding:4px 18px 0;
}
.oa-tut-body{
  padding:14px 18px;font-size:13px;line-height:22px;color:var(--t2);
  white-space:pre-wrap;
}
.oa-tut-body b{color:var(--t1);}
.oa-tut-hint{
  margin:0 18px 10px;padding:8px 12px;background:var(--surf2);
  border-left:3px solid var(--g);font-size:11px;color:var(--t3);
  border-radius:0 2px 2px 0;
}
.oa-tut-footer{padding:0 18px 18px;display:flex;flex-direction:column;gap:8px;}
.oa-tut-btn{
  height:40px;padding:0 18px;border:none;border-radius:2px;cursor:pointer;
  font-family:'IBM Plex Mono',monospace;font-size:11px;font-weight:600;
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
  padding:10px 18px;border-top:1px solid var(--rule);background:var(--surf2);
}
.oa-tut-level{
  font-size:11px;font-weight:600;color:var(--g);letter-spacing:.04em;
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
  font-size:10px;color:var(--t3);letter-spacing:.04em;white-space:nowrap;flex-shrink:0;
}

/* ── Achievement toast ─────────────────────── */
#oa-tut-achv{
  position:fixed;top:60px;right:16px;z-index:10001;
  font-family:'IBM Plex Mono',monospace;
  background:var(--surf);
  border:1px solid var(--g);border-radius:4px;
  box-shadow:0 4px 20px rgba(0,0,0,.2);
  width:380px;overflow:hidden;
  transform:translateX(400px);
  transition:transform .4s cubic-bezier(.4,0,.2,1);
}
#oa-tut-achv.vis{transform:translateX(0);}
.oa-achv-bar{height:3px;background:var(--g);}
.oa-achv-inner{padding:14px 16px;display:flex;gap:14px;align-items:flex-start;}
.oa-achv-icon{font-size:32px;flex-shrink:0;line-height:1;}
.oa-achv-text{}
.oa-achv-label{font-size:10px;color:var(--t3);letter-spacing:.08em;text-transform:uppercase;}
.oa-achv-name{font-size:14px;font-weight:600;color:var(--t1);margin:3px 0;}
.oa-achv-desc{font-size:11px;color:var(--t2);}
.oa-achv-xp{
  margin-left:auto;font-size:12px;font-weight:600;color:var(--g);
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
  font-size:18px;letter-spacing:.12em;color:var(--g);text-transform:uppercase;
  margin-bottom:10px;
}
.oa-lu-name{
  font-family:'IBM Plex Mono',monospace;
  font-size:52px;font-weight:600;letter-spacing:.04em;color:var(--g);
  text-shadow:0 0 60px rgba(23,128,102,.5);
}
.oa-lu-icon{font-size:72px;margin-bottom:12px;}

/* ── Progress dots ─────────────────────────── */
.oa-tut-dots{
  display:flex;gap:6px;align-items:center;padding:10px 18px 0;
}
.oa-tut-dot{
  width:9px;height:9px;border-radius:50%;background:var(--rule);
  transition:background .3s,transform .3s;
}
.oa-tut-dot.done{background:var(--g);}
.oa-tut-dot.current{background:var(--g);transform:scale(1.4);}

/* ── Finale ──────────────────────────────────  */
.oa-tut-finale{
  padding:24px 18px 12px;text-align:center;
}
.oa-tut-finale-icon{font-size:60px;margin-bottom:12px;}
.oa-tut-finale-level{
  font-size:11px;letter-spacing:.1em;color:var(--t3);text-transform:uppercase;
  margin-bottom:6px;
}
.oa-tut-finale-name{
  font-size:28px;font-weight:600;color:var(--g);letter-spacing:.04em;
  margin-bottom:16px;
}
.oa-tut-achv-grid{
  display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin-bottom:12px;
}
.oa-tut-achv-chip{
  font-size:11px;padding:5px 10px;background:var(--surf2);
  border:1px solid var(--rule);border-radius:2px;color:var(--t2);
  display:flex;align-items:center;gap:4px;
}
.oa-tut-achv-chip.unlocked{
  background:var(--gb,rgba(23,128,102,.08));border-color:var(--gr,rgba(23,128,102,.28));
  color:var(--g);
}

.oa-tut-langs{
  display:flex;gap:4px;align-items:center;padding:8px 18px;
  border-top:1px solid var(--rule);background:var(--surf2);flex-wrap:wrap;
}
.oa-tut-lang-btn{
  height:24px;padding:0 8px;border-radius:2px;border:1px solid var(--rule);
  background:var(--surf3);color:var(--t2);cursor:pointer;
  font-family:'IBM Plex Mono',monospace;font-size:10px;font-weight:500;
  transition:all .15s;white-space:nowrap;
}
.oa-tut-lang-btn:hover{background:var(--surf);color:var(--t1);border-color:var(--g);}
.oa-tut-lang-btn.active{background:var(--g);color:#fff;border-color:var(--g);}
  `;
  document.head.appendChild(s);
}

function _getEl(id) { return document.getElementById(id); }

function _ensureDom() {
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
function _spotlight(selector) {
  const sp = _getEl('oa-tut-spotlight');
  if (!selector) { sp.style.display = 'none'; return; }
  const el = document.querySelector(selector);
  if (!el) { sp.style.display = 'none'; return; }
  const r = el.getBoundingClientRect();
  if (!r.width) { sp.style.display = 'none'; return; }
  const pad = 6;
  sp.style.display = 'block';
  sp.style.top    = (r.top - pad) + 'px';
  sp.style.left   = (r.left - pad) + 'px';
  sp.style.width  = (r.width + pad * 2) + 'px';
  sp.style.height = (r.height + pad * 2) + 'px';
}

/* ── Card positioning ─────────────────────────────────────────────────── */
function _positionCard(card, position, target) {
  const vw = window.innerWidth, vh = window.innerHeight;
  const cw = 560, ch = card.offsetHeight || 400;

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
    card.style.left = Math.min(r.right + gap, vw - cw - 8) + 'px';
    card.style.top  = Math.max(8, Math.min(r.top, vh - ch - 8)) + 'px';
  } else if (position === 'below') {
    card.style.top  = Math.min(r.bottom + gap, vh - ch - 8) + 'px';
    card.style.left = Math.max(8, Math.min(r.left, vw - cw - 8)) + 'px';
  } else if (position === 'above') {
    card.style.top  = Math.max(8, r.top - ch - gap) + 'px';
    card.style.left = Math.max(8, Math.min(r.left, vw - cw - 8)) + 'px';
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
    const achvGrid = _achievements.map(id => {
      const found = STEPS.flatMap(st => st.achievement ? [st.achievement] : []).find(a => a.id === id);
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

  card.innerHTML = inner;

  // Position after render (so offsetHeight is known)
  requestAnimationFrame(() => {
    _spotlight(s.target);
    _positionCard(card, s.card, s.target);
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
window._tutGmail = _tutGmail;
window._tutLang  = _setLang;
