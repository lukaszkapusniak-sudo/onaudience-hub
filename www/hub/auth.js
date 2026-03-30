/* ═══ auth.js — onAudience Hub v2.3 ═══
   Password login. Simple, reliable, no redirect issues.
   Audit trail via logActivity().
   ════════════════════════════════════════════════════ */

import { SB_URL, SB_KEY } from './config.js?v=20260330f';
import { authHdr } from './utils.js?v=20260330f';

/* ── JS mutex — replaces navigator.locks to avoid the
   "lock:oaHubSession was released because another request stole it"
   error, while still serializing concurrent auth calls correctly.
   navigator.locks has a bug in Supabase JS v2 when multiple async
   auth operations overlap in a single tab.
   ────────────────────────────────────────────────────────────── */
function makeMutex() {
  let _queue = Promise.resolve();
  return (_name, _timeout, fn) => {
    const result = _queue.then(() => fn());
    _queue = result.catch(() => {});
    return result;
  };
}
const _lock = makeMutex();

/* ── Supabase JS client ─────────────────────────────── */
let _sb = null;
function sb() {
  if (_sb) return _sb;
  if (!window.supabase) throw new Error('Supabase SDK not loaded');
  _sb = window.supabase.createClient(SB_URL, SB_KEY, {
    auth: {
      persistSession:     true,
      storageKey:         'oaHubSession',
      autoRefreshToken:   true,
      detectSessionInUrl: false,
      lock:               _lock,   // JS mutex — safe serialization without navigator.locks
    }
  });
  return _sb;
}

/* ── Session / user ─────────────────────────────────── */

export async function getSession() {
  const { data } = await sb().auth.getSession();
  return data?.session || null;
}

export async function getAuthToken() {
  const s = await getSession();
  return s?.access_token || null;
}

export async function getCurrentUser() {
  const { data } = await sb().auth.getUser();
  return data?.user || null;
}

export async function signIn(email, password) {
  const { data, error } = await sb().auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  await sb().auth.signOut();
}

export function onAuthStateChange(cb) {
  sb().auth.onAuthStateChange(cb);
}

/* ── User profile ───────────────────────────────────── */

export async function getUserProfile(userId) {
  const token = await getAuthToken();
  if (!token) return null;
  const res = await fetch(
    `${SB_URL}/rest/v1/user_profiles?id=eq.${userId}&select=*`,
    { headers: authHdr() }
  );
  if (!res.ok) return null;
  const rows = await res.json();
  return rows[0] || null;
}

/* ── Audit trail ────────────────────────────────────── */

export async function logActivity({ action, entity_type, entity_id, entity_name, diff = null }) {
  try {
    const token = await getAuthToken();
    if (!token) return;
    const user = await getCurrentUser();
    if (!user) return;
    await fetch(`${SB_URL}/rest/v1/activity_log`, {
      method: 'POST',
      headers: {
        ...authHdr(),
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        user_id:     user.id,
        user_email:  user.email,
        action,
        entity_type,
        entity_id,
        entity_name,
        diff,
        created_at:  new Date().toISOString(),
      })
    });
  } catch (_) { /* silent — never break main flow */ }
}

/* ── Login screen ───────────────────────────────────── */

export function renderLoginScreen() {
  const app = document.querySelector('.app');
  if (app) app.style.display = 'none';

  let el = document.getElementById('oaLoginScreen');
  if (!el) {
    el = document.createElement('div');
    el.id = 'oaLoginScreen';
    document.body.appendChild(el);
  }
  el.style.display = 'flex';
  el.innerHTML = `
<style>
#oaLoginScreen{
  position:fixed;inset:0;z-index:99998;
  background:var(--bg);
  display:flex;align-items:center;justify-content:center;
}
.oa-lb{
  background:var(--surf);border:1px solid var(--rule);border-radius:4px;
  padding:36px 40px;width:340px;box-shadow:var(--sh);
}
.oa-logo{
  font-family:'IBM Plex Mono',monospace;font-weight:600;font-size:13px;
  background:var(--g);color:#fff;width:34px;height:34px;border-radius:2px;
  display:flex;align-items:center;justify-content:center;margin:0 auto 22px;
}
.oa-title{
  font-family:'IBM Plex Mono',monospace;font-size:11px;font-weight:500;
  text-transform:uppercase;letter-spacing:.08em;color:var(--t1);
  text-align:center;margin-bottom:4px;
}
.oa-sub{
  font-family:'IBM Plex Sans',sans-serif;font-size:11px;color:var(--t3);
  text-align:center;margin-bottom:28px;
}
.oa-lbl{
  font-family:'IBM Plex Mono',monospace;font-size:8px;font-weight:600;
  text-transform:uppercase;letter-spacing:.07em;color:var(--t3);
  display:block;margin-bottom:5px;margin-top:14px;
}
.oa-inp{
  width:100%;height:38px;padding:0 11px;
  border:1px solid var(--rule);border-radius:2px;
  font-family:'IBM Plex Mono',monospace;font-size:12px;
  background:var(--surf2);color:var(--t1);outline:none;
  transition:border-color .15s;box-sizing:border-box;
}
.oa-inp:focus{border-color:var(--g);}
.oa-inp::placeholder{color:var(--t4);}
.oa-btn{
  width:100%;height:40px;margin-top:22px;border:none;border-radius:2px;
  background:var(--g);color:#fff;
  font-family:'IBM Plex Mono',monospace;font-size:10px;font-weight:600;
  text-transform:uppercase;letter-spacing:.1em;cursor:pointer;
  transition:background .15s;
}
.oa-btn:hover{background:var(--gd);}
.oa-btn:disabled{background:var(--surf4);color:var(--t3);cursor:default;}
.oa-err{
  font-family:'IBM Plex Mono',monospace;font-size:9px;
  color:#F87171;text-align:center;margin-top:12px;min-height:16px;
}
.oa-ver{
  font-family:'IBM Plex Mono',monospace;font-size:7px;color:var(--t4);
  text-align:center;margin-top:22px;letter-spacing:.04em;
}
</style>
<div class="oa-lb">
  <div class="oa-logo">oA</div>
  <div class="oa-title">Sales Intelligence Hub</div>
  <div class="oa-sub">onAudience</div>
  <label class="oa-lbl">Email</label>
  <input id="oa-email" class="oa-inp" type="email"
    placeholder="you@cloudtechnologies.pl" autocomplete="email"/>
  <label class="oa-lbl">Password</label>
  <input id="oa-pwd" class="oa-inp" type="password"
    placeholder="••••••••" autocomplete="current-password"/>
  <button class="oa-btn" id="oa-btn" onclick="oaSignIn()">Sign in →</button>
  <div class="oa-err" id="oa-err"></div>
  <div class="oa-ver">Hub v2.3 · onAudience</div>
</div>`;

  setTimeout(() => document.getElementById('oa-email')?.focus(), 80);
  document.getElementById('oa-email')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('oa-pwd')?.focus();
  });
  document.getElementById('oa-pwd')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') window.oaSignIn?.();
  });
}

export function hideLoginScreen() {
  const el = document.getElementById('oaLoginScreen');
  if (el) el.style.display = 'none';
  const app = document.querySelector('.app');
  if (app) app.style.display = '';
}

/* ── Sign in action (called via window.oaSignIn) ───── */

export async function doSignIn() {
  const email = document.getElementById('oa-email')?.value?.trim();
  const pwd   = document.getElementById('oa-pwd')?.value;
  const btn   = document.getElementById('oa-btn');
  const err   = document.getElementById('oa-err');
  if (!email || !pwd) { if (err) err.textContent = 'Enter email and password'; return; }
  if (btn)  { btn.disabled = true; btn.textContent = 'Signing in…'; }
  if (err)  err.textContent = '';
  try {
    await signIn(email, pwd);
    // onAuthStateChange SIGNED_IN fires → hub boots
  } catch (e) {
    if (err) err.textContent = e.message || 'Invalid email or password';
    if (btn) { btn.disabled = false; btn.textContent = 'Sign in →'; }
  }
}

/* ── Nav user badge ─────────────────────────────────── */

export function renderUserBadge(profile) {
  const el = document.getElementById('nav-user-badge');
  if (!el || !profile) return;
  const initials = (profile.full_name || profile.email || '?')
    .split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const displayName = profile.full_name
    ? profile.full_name.split(' ')[0]          // first name only
    : (profile.email || '').split('@')[0];
  const role = (profile.active_role || 'user').toUpperCase();
  const color = profile.avatar_color || 'var(--g)';

  el.innerHTML = `
    <span style="display:inline-block;width:1px;height:20px;background:var(--rule);margin-right:4px;flex-shrink:0"></span>
    <div style="display:flex;align-items:center;gap:6px;padding:3px 6px 3px 3px;border:1px solid var(--rule);border-radius:2px;background:var(--surf2);cursor:default">
      <span style="font-family:'IBM Plex Mono',monospace;font-size:8px;font-weight:600;
                   background:${color};color:#fff;width:22px;height:22px;border-radius:2px;
                   display:inline-flex;align-items:center;justify-content:center;
                   flex-shrink:0;letter-spacing:.04em">${initials}</span>
      <div style="display:flex;flex-direction:column;gap:0px;line-height:1.1">
        <span style="font-family:'IBM Plex Mono',monospace;font-size:9px;font-weight:500;color:var(--t1);white-space:nowrap">${displayName}</span>
        <span style="font-family:'IBM Plex Mono',monospace;font-size:6px;font-weight:600;color:${color};letter-spacing:.06em;text-transform:uppercase">${role}</span>
      </div>
      <button onclick="oaSignOut()"
        style="margin-left:2px;background:none;border:none;cursor:pointer;padding:2px 4px;
               border-radius:2px;font-family:'IBM Plex Mono',monospace;font-size:8px;
               color:var(--t3);line-height:1;transition:color .15s,background .15s"
        onmouseover="this.style.color='var(--t1)';this.style.background='var(--surf3)'"
        onmouseout="this.style.color='var(--t3)';this.style.background='none'"
        title="Sign out">↪</button>
    </div>`;
}
