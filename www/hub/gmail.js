/* Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂ gmail.js Ã¢ÂÂ Gmail OAuth (Google Identity Services) + API Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂ
   Uses GIS token model Ã¢ÂÂ no backend, no client_secret needed.
   Token stored in localStorage('oaGmailToken') with expiry.
   Requires <script src="https://accounts.google.com/gsi/client">
   in index.html (added separately).
   Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ */

import { GMAIL_CLIENT_ID } from './config.js?v=20260331d';
import { esc } from './utils.js?v=20260331d';
import { SB_URL } from './config.js?v=20260331d';
import { authHdr, clog } from './api.js?v=20260331d';

const SCOPES = 'https://www.googleapis.com/auth/gmail.readonly';
const GMAIL_BASE = 'https://gmail.googleapis.com/gmail/v1/users/me';

/* Ã¢ÂÂÃ¢ÂÂ Token storage Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ */
function _saveToken(accessToken, expiresIn = 3600) {
  const expiry = Date.now() + (expiresIn - 60) * 1000; // 60s buffer
  localStorage.setItem('oaGmailToken', accessToken);
  localStorage.setItem('oaGmailExpiry', String(expiry));
}

function _getToken() {
  const token = localStorage.getItem('oaGmailToken');
  const expiry = parseInt(localStorage.getItem('oaGmailExpiry') || '0');
  if (!token || Date.now() > expiry) return null;
  return token;
}

function _clearToken() {
  localStorage.removeItem('oaGmailToken');
  localStorage.removeItem('oaGmailExpiry');
  localStorage.removeItem('oaGmailEmail');
  localStorage.removeItem('oaGmailName');
}

export function gmailIsConnected() {
  return !!_getToken();
}

export function gmailGetStoredEmail() {
  return localStorage.getItem('oaGmailEmail') || '';
}

export function gmailGetStoredName() {
  return localStorage.getItem('oaGmailName') || '';
}

/* Ã¢ÂÂÃ¢ÂÂ GIS Token Client Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ */
let _tokenClient = null;
let _pendingResolve = null;
let _pendingReject = null;

function _getTokenClient() {
  if (_tokenClient) return _tokenClient;
  if (!window.google?.accounts?.oauth2) {
    throw new Error('Google Identity Services not loaded');
  }
  _tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: GMAIL_CLIENT_ID,
    scope: SCOPES,
    callback: (response) => {
      if (response.error) {
        _pendingReject?.(new Error(response.error));
      } else {
        _saveToken(response.access_token, response.expires_in);
        _pendingResolve?.(response.access_token);
      }
      _pendingResolve = null;
      _pendingReject = null;
    },
  });
  return _tokenClient;
}

/* Ã¢ÂÂÃ¢ÂÂ Connect / Disconnect Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ */
export function gmailConnect() {
  return new Promise((resolve, reject) => {
    try {
      const client = _getTokenClient();
      _pendingResolve = resolve;
      _pendingReject = reject;
      client.requestAccessToken({ prompt: 'consent' });
    } catch (e) {
      reject(e);
    }
  });
}

export function gmailDisconnect() {
  const token = _getToken();
  if (token && window.google?.accounts?.oauth2) {
    window.google.accounts.oauth2.revoke(token, () => {});
  }
  _clearToken();
  _tokenClient = null;
}

/* Ã¢ÂÂÃ¢ÂÂ Ensure valid token (re-prompt if expired) Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ */
async function _ensureToken() {
  const existing = _getToken();
  if (existing) return existing;
  return new Promise((resolve, reject) => {
    try {
      const client = _getTokenClient();
      _pendingResolve = resolve;
      _pendingReject = reject;
      client.requestAccessToken({ prompt: '' });
    } catch (e) {
      reject(e);
    }
  });
}

async function _gmailFetch(path, params = {}) {
  const token = await _ensureToken();
  const url = new URL(`${GMAIL_BASE}${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) { const txt = await res.text().catch(() => ''); throw new Error(`Gmail API ${res.status}: ${txt.slice(0,100)}`); }
  return res.json();
}

export async function gmailGetProfile() {
  const data = await _gmailFetch('/profile');
  if (data.emailAddress) localStorage.setItem('oaGmailEmail', data.emailAddress);
  return data;
}

export async function gmailSearchCompany(companyName, domain) {
  const domainClean = domain ? domain.replace(/^https?:\/\//i, '').replace(/\/.*$/, '').trim() : '';
  const parts = [];
  if (domainClean) parts.push(`(from:${domainClean} OR to:${domainClean})`);
  if (companyName) {
    const q = companyName.replace(/['"]/g, '').trim();
    if (!domainClean || q.toLowerCase() !== domainClean.split('.')[0].toLowerCase()) parts.push(`"${q}"`);
  }
  const query = parts.join(' OR ');
  if (!query) throw new Error('No search terms');
  const listData = await _gmailFetch('/messages', { q: query, maxResults: 20 });
  const messages = listData.messages || [];
  if (!messages.length) return { threads: [], contacts: [], query };
  const details = await Promise.allSettled(messages.slice(0, 8).map(m => _gmailFetch(`/messages/${m.id}`, { format: 'metadata', metadataHeaders: 'From,To,Subject,Date' })));
  const threads = []; const contactMap = {};
  details.forEach(r => {
    if (r.status !== 'fulfilled') return;
    const msg = r.value;
    const headers = {};
    (msg.payload?.headers || []).forEach(h => { headers[h.name] = h.value; });
    const from = headers['From'] || ''; const subject = headers['Subject'] || '(no subject)';
    const date = headers['Date'] ? new Date(headers['Date']).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' }) : '';
    threads.push({ from, subject, date, id: msg.id });
    const fromMatch = from.match(/^(.+?)\s*<(.+?)>/) || from.match(/^(.+)$/);
    if (fromMatch) {
      const name = (fromMatch[1] || '').trim().replace(/^["']|["']$/g, '');
      const email = (fromMatch[2] || fromMatch[1] || '').trim().toLowerCase();
      if (email.includes('@') && !contactMap[email]) contactMap[email] = { name, email };
    }
  });
  return { threads, contacts: Object.values(contactMap), query, total: listData.resultSizeEstimate || messages.length };
}

export function gmailSectionHTML(slug, companyName) {
  if (!GMAIL_CLIENT_ID || GMAIL_CLIENT_ID === 'YOUR_GOOGLE_CLIENT_ID') return `<div style="font:400 10px 'IBM Plex Mono',monospace;color:var(--prc);padding:8px 0">Gmail not configured Ã¢ÂÂ add GMAIL_CLIENT_ID to config.js</div>`;
  if (!gmailIsConnected()) return `<div style="padding:4px 0"><div style="font:400 10px 'IBM Plex Sans',sans-serif;color:var(--t3);margin-bottom:10px;line-height:1.5">Connect your Gmail to scan email history with <b>${esc(companyName)}</b></div><button class="btn sm p" onclick="window.gmailConnectAndScan('${esc(slug)}','${esc(companyName)}')">Connect Gmail ↗';IBM Plex Mono',monospace;color:var(--g)">Ã¢ÂÂ CONNECTED</span><span style="font:400 9px 'IBM Plex Mono',monospace;color:var(--t2);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(gmailEmail)}</span><button class="btn sm" onclick="window.gmailDisconnectUI()" style="flex-shrink:0">Disconnect</button></div><button class="btn sm p" onclick="window.gmailScanCompany('${esc(slug)}','${esc(companyName)}')">Ã°ÂÂÂ Scan Gmail for ${esc(companyName)}</button><div id="ib-email-results" style="margin-top:8px"></div><div id="ib-email-contacts-strip" style="display:none;margin-top:8px;padding:8px;background:var(--surf3);border-radius:3px;border:1px solid var(--rule)"></div></div>`;
}

export async function gmailConnectAndScan(slug, companyName) {
  const btn = document.querySelector('[onclick*="gmailConnectAndScan"]');
  if (btn) { btn.disabled = true; btn.textContent = 'ConnectingÃ¢ÂÂ¦'; }
  try {
    await gmailConnect();
    try { await gmailGetProfile(); } catch(_) {}
    const body = document.getElementById('ib-email-body');
    if (body) body.innerHTML = gmailSectionHTML(slug, companyName);
    await gmailScanCompany(slug, companyName);
    if (window.clog) window.clog('info', `Gmail connected Ã¢ÂÂ - scanning ${esc(companyName)}`);
  } catch (e) {
    if (btn) { btn.disabled = false; btn.textContent = 'Connect Gmail Ã¢ÂÂ7; }
    if (window.clog) window.clog('info', `Gmail connect failed: ${esc(e.message)}`);
  }
}

export function gmailDisconnectUI() {
  gmailDisconnect();
  const slug = window._currentEmailSlug;
  const companyName = window.currentCompany?.name || '';
  const body = document.getElementById('ib-email-body');
  if (body && slug) body.innerHTML = gmailSectionHTML(slug, companyName);
  if (window.clog) window.clog('info', 'Gmail disconnected');
}

export async function gmailScanCompany(slug, companyName) {
  const resultsEl = document.getElementById('ib-email-results');
  const stripEl   = document.getElementById('ib-email-contacts-strip');
  if (!resultsEl) return;
  resultsEl.innerHTML = `<div style="font:400 9px 'IBM Plex Mono',monospace;color:var(--t3);animation:pulse 1.4s infinite">Ã¢ÂÂ³ Scanning Gmail...</div>`;
  const co = window._oaState?.companies?.find(c => (c.id || window._slug?.(c.name || '')) === slug);
  const domain = co?.website || '';
  try {
    const { threads, contacts, total } = await gmailSearchCompany(companyName, domain);
    if (!threads.length) { resultsEl.innerHTML = `<div style="font:400 9px 'IBM Plex Mono',monospace;color:var(--t3);padding:4px 0">No emails found for <b>${esc(companyName)}</b></div>`; return; }
    resultsEl.innerHTML = `<div style="font:600 8px 'IBM Plex Mono',monospace;text-transform:uppercase;letter-spacing:.06em;color:var(--t3);margin-bottom:6px">${threads.length} emails found${total > threads.length ? ` (of ~${total})` : ''}</div>${threads.map(t => `<div style="display:flex;align-items:flex-start;gap:8px;padding:6px 0;border-bottom:1px solid var(--rule3)"><div style="width:6px;height:6px;border-radius:50%;background:var(--g);flex-shrink:0;margin-top:4px"></div><div style="flex:1;min-width:0"><div style="font:500 11px 'IBM Plex Mono',monospace;color:var(--t1);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(t.subject)}</div><div style="font:400 8px 'IBM Plex Mono',monospace;color:var(--t3);margin-top:2px;display:flex;gap:8px"><span>${esc(t.from.slice(0,40))}${t.from.length>40?'Ã¢ÂÂ¦':''}</span><span style="color:var(--t4)">${t.date}</span></div></div></div>`).join('')}`;
    if (contacts.length) {
      stripEl.style.display = 'block';
      window._gmailFoundContacts = contacts.map(c => ({ full_name: c.name, email: c.email, company_name: companyName, company_id: slug, source: 'gmail_scan' }));
      stripEl.innerHTML = `<div style="font:600 8px 'IBM Plex Mono',monospace;text-transform:uppercase;letter-spacing:.06em;color:var(--t3);margin-bottom:6px">${contacts.length} contact${contacts.length>1?'s':''} found</div>${contacts.map(c => `<div style="display:flex;align-items:center;gap:6px;padding:3px 0;font:400 10px 'IBM Plex Mono',monospace"><span style="color:var(--t1)">${esc(c.name||c.email)}</span><span style="color:var(--t4)">${esc(c.email)}</span></div>`).join('')}<button class="btn sm p" onclick="window.gmailSaveContacts()" style="margin-top:6px">Ã°ÂÂÂ¾ Save ${contacts.length} contact${contacts.length>1?'s':''} to CRM</button>`;
    } else { stripEl.style.display = 'none'; }
    if (window.clog) window.clog('info', `Gmail scan - ${threads.length} emails, ${contacts.length} contacts for ${esc(companyName)}`);
  } catch (e) {
    resultsEl.innerHTML = `<div style="font:400 9px 'IBM Plex Mono',monospace;color:var(--prc)">Ã¢ÂÂ ${esc(e.message)}${e.message.includes('401')||e.message.includes('token')?`<br><button class="btn sm" onclick="window.gmailConnectAndScan('${esc(slug)}','${esc(companyName)}')" style="margin-top:4px">Ã¢ÂÂº Reconnect</button>`:''}</div>`;
    if (window.clog) window.clog('info', `Gmail scan error for ${esc(companyName)}: ${esc(e.message)}`);
  }
}

export async function gmailSaveContacts() {
  const contacts = window._gmailFoundContacts;
  if (!contacts?.length) return;
  const btn = document.querySelector('[onclick="window.gmailSaveContacts()"]');
  if (btn) { btn.disabled = true; btn.textContent = 'SavingÃ¢ÂÂ¦'; }
  let saved = 0;
  for (const ct of contacts) {
    try { const res = await fetch(`${SB_URL}/rest/v1/contacts`, { method: 'POST', headers: authHdr({ Prefer: 'resolution=merge-duplicates,return=minimal' }), body: JSON.stringify(ct) }); if (res.ok||res.status===409) saved++; } catch (_) {}
  }
  const stripEl = document.getElementById('ib-email-contacts-strip');
  if (stripEl) stripEl.innerHTML = `<div style="font:400 9px 'IBM Plex Mono',monospace;color:var(--g)">Ã¢ÂÂ Saved ${saved} contact${saved!==1?'s':''} to CRM</div>`;
  window._gmailFoundContacts = [];
  if (window.clog) window.clog('db', `Gmail contacts saved: <b>${saved}</b>`);
}
