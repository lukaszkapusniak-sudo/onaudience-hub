/* ═══ auth.js — onAudience Hub v2.4 ═══
   Google OAuth (any Google account) + CI email/password fallback.
   Access control is enforced by Supabase RLS — not client-side.
   ════════════════════════════════════════════════════ */

import { enterDemoMode, isDemoMode } from './demo.js?v=20260409c1';
import { SB_URL, SB_KEY } from './config.js?v=20260409c1';
import { authHdr } from './utils.js?v=20260409c1';

/* ── JS mutex ──────────────────────────────────────── */
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
      detectSessionInUrl: true,   // reads #access_token from URL after OAuth redirect
      lock:               _lock,
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

/* ── Sign in with Google (production) ──────────────── */
export async function signInWithGoogle() {
  const { error } = await sb().auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: 'https://lukaszkapusniak-sudo.github.io/onaudience-hub/hub/',
      queryParams: {
        // Hints to Google to show accounts from these domains first
        // (not a hard restriction — enforcement is in bootHub)
        hd: 'onaudience.pl',
      },
    },
  });
  if (error) throw error;
}

/* ── Sign in with email/password (CI test accounts only) ── */
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
      headers: { ...authHdr(), Prefer: 'return=minimal' },
      body: JSON.stringify({
        user_id: user.id, user_email: user.email,
        action, entity_type, entity_id, entity_name, diff,
        created_at: new Date().toISOString(),
      })
    });
  } catch (_) { /* silent */ }
}

/* ── Login screen ───────────────────────────────────── */
export function renderLoginScreen() {
  const app = document.querySelector('.app');
  if (app) app.style.display = 'none';
  const _pill = document.getElementById('signOutPill');
  if (_pill) _pill.style.display = 'none';

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
  padding:40px 44px;width:340px;box-shadow:var(--sh);text-align:center;
}
.oa-logo{
  font-family:'IBM Plex Mono',monospace;font-weight:600;font-size:13px;
  background:var(--g);color:#fff;width:36px;height:36px;border-radius:2px;
  display:flex;align-items:center;justify-content:center;margin:0 auto 20px;
}
.oa-title{
  font-family:'IBM Plex Mono',monospace;font-size:11px;font-weight:500;
  text-transform:uppercase;letter-spacing:.08em;color:var(--t1);margin-bottom:4px;
}
.oa-sub{
  font-family:'IBM Plex Sans',sans-serif;font-size:11px;color:var(--t3);margin-bottom:30px;
}
/* Google sign-in button */
.oa-google{
  display:flex;align-items:center;justify-content:center;gap:10px;
  width:100%;height:44px;border:1px solid var(--rule);border-radius:2px;
  background:var(--surf2);cursor:pointer;
  font-family:'IBM Plex Mono',monospace;font-size:10px;font-weight:600;
  text-transform:uppercase;letter-spacing:.08em;color:var(--t1);
  transition:border-color .15s,background .15s;
}
.oa-google:hover{ border-color:var(--g);background:var(--surf3); }
.oa-google:disabled{ opacity:.5;cursor:default; }
.oa-google svg{ flex-shrink:0; }
.oa-err{
  font-family:'IBM Plex Mono',monospace;font-size:9px;
  color:#F87171;margin-top:12px;min-height:16px;
}
.oa-ver{
  font-family:'IBM Plex Mono',monospace;font-size:7px;color:var(--t4);
  margin-top:20px;letter-spacing:.04em;
}
</style>
<div class="oa-lb">
  <div class="oa-logo">oA</div>
  <div class="oa-title">Sales Intelligence Hub</div>
  <div class="oa-sub">cloudtechnologies.pl &nbsp;·&nbsp; onaudience.com</div>
  <button class="oa-google" id="oa-google-btn" onclick="window.oaGoogleSignIn()">
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
    Sign in with Google
  </button>
  <div style="margin:10px 0;display:flex;align-items:center;gap:8px;">
    <div style="flex:1;height:1px;background:var(--rule)"></div>
    <div style="font-family:'IBM Plex Mono',monospace;font-size:7px;color:var(--t4);letter-spacing:.06em">OR</div>
    <div style="flex:1;height:1px;background:var(--rule)"></div>
  </div>
  <button class="oa-google" id="oa-demo-btn" onclick="window.oaEnterDemo()"
    style="background:var(--surf3);border-color:rgba(122,66,0,.3);color:#7A4200;">
    <span style="font-size:16px">👁</span>
    Try Demo — No sign-in required
  </button>
  <div class="oa-err" id="oa-err"></div>
  <div class="oa-ver">Hub v2.4 · onAudience · Demo available without account</div>
</div>`;
}

export function hideLoginScreen() {
  const el = document.getElementById('oaLoginScreen');
  if (el) el.style.display = 'none';
  const app = document.querySelector('.app');
  if (app) app.style.display = '';
}

/* ── Google sign-in action (called via window.oaGoogleSignIn) ── */
export async function doGoogleSignIn() {
  const btn = document.getElementById('oa-google-btn');
  const err = document.getElementById('oa-err');
  if (btn) { btn.disabled = true; btn.textContent = 'Redirecting to Google…'; }
  if (err) err.textContent = '';
  try {
    await signInWithGoogle();
    // Page will redirect to Google — no further code runs here
  } catch (e) {
    if (err) err.textContent = e.message || 'Sign-in failed — try again';
    if (btn) { btn.disabled = false; btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/><path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/><path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/><path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/></svg> Sign in with Google`; }
  }
}

/* ── Nav user badge ─────────────────────────────────── */
export function renderUserBadge(profile) {
  const el = document.getElementById('nav-user-badge');
  if (!el || !profile) return;
  const initials = (profile.full_name || profile.email || '?')
    .split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const displayName = profile.full_name
    ? profile.full_name.split(' ')[0]
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

/* ── Demo mode entry (called from login screen button) ── */
export function oaEnterDemoMode() {
  enterDemoMode();
  const el = document.getElementById('oaLoginScreen');
  if (el) el.style.display = 'none';
  const app = document.querySelector('.app');
  if (app) app.style.display = '';
  // Signal app.js to load demo data
  window.dispatchEvent(new CustomEvent('oa-demo-enter'));
}
