/* gmail.js -- Gmail OAuth via Google Identity Services */
import { GMAIL_CLIENT_ID } from './config.js?v=20260331d';
import { esc } from './utils.js?v=20260331d';
import { SB_URL } from './config.js?v=20260331d';
import { authHdr } from './api.js?v=20260331d';

const SCOPES = 'https://www.googleapis.com/auth/gmail.readonly';
const GMAIL_BASE = 'https://gmail.googleapis.com/gmail/v1/users/me';

function _saveToken(token, expiresIn) {
  expiresIn = expiresIn || 3600;
  localStorage.setItem('oaGmailToken', token);
  localStorage.setItem('oaGmailExpiry', String(Date.now() + (expiresIn - 60) * 1000));
}
function _getToken() {
  var t = localStorage.getItem('oaGmailToken');
  var e = parseInt(localStorage.getItem('oaGmailExpiry') || '0');
  return (t && Date.now() < e) ? t : null;
}
function _clearToken() {
  ['oaGmailToken','oaGmailExpiry','oaGmailEmail','oaGmailName'].forEach(function(k){ localStorage.removeItem(k); });
}
export function gmailIsConnected() { return !!_getToken(); }
export function gmailGetStoredEmail() { return localStorage.getItem('oaGmailEmail') || ''; }

var _tokenClient = null, _pendingResolve = null, _pendingReject = null;
function _getTokenClient() {
  if (_tokenClient) return _tokenClient;
  if (!window.google || !window.google.accounts || !window.google.accounts.oauth2)
    throw new Error('Google Identity Services not loaded');
  _tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: GMAIL_CLIENT_ID, scope: SCOPES,
    callback: function(res) {
      if (res.error) { if (_pendingReject) _pendingReject(new Error(res.error)); }
      else { _saveToken(res.access_token, res.expires_in); if (_pendingResolve) _pendingResolve(res.access_token); }
      _pendingResolve = null; _pendingReject = null;
    },
  });
  return _tokenClient;
}
export function gmailConnect() {
  return new Promise(function(resolve, reject) {
    try { var c = _getTokenClient(); _pendingResolve = resolve; _pendingReject = reject; c.requestAccessToken({ prompt: 'consent' }); }
    catch(e) { reject(e); }
  });
}
export function gmailDisconnect() {
  var t = _getToken();
  if (t && window.google && window.google.accounts && window.google.accounts.oauth2)
    window.google.accounts.oauth2.revoke(t, function(){});
  _clearToken(); _tokenClient = null;
}
async function _ensureToken() {
  var t = _getToken(); if (t) return t;
  return new Promise(function(resolve, reject) {
    try { var c = _getTokenClient(); _pendingResolve = resolve; _pendingReject = reject; c.requestAccessToken({ prompt: '' }); }
    catch(e) { reject(e); }
  });
}
async function _gFetch(path, params) {
  params = params || {};
  var token = await _ensureToken();
  var url = new URL(GMAIL_BASE + path);
  Object.entries(params).forEach(function(kv){ url.searchParams.set(kv[0], kv[1]); });
  var res = await fetch(url.toString(), { headers: { Authorization: 'Bearer ' + token } });
  if (!res.ok) { var txt = await res.text().catch(function(){ return ''; }); throw new Error('Gmail API ' + res.status + ': ' + txt.slice(0,100)); }
  return res.json();
}
export async function gmailGetProfile() {
  var data = await _gFetch('/profile');
  if (data.emailAddress) localStorage.setItem('oaGmailEmail', data.emailAddress);
  return data;
}
export async function gmailSearchCompany(companyName, domain) {
  var dc = '';
  if (domain) dc = domain.replace(/^https?:\/\//i,'').replace(/\/.*$/,'').trim();
  var parts = [];
  if (dc) parts.push('(from:' + dc + ' OR to:' + dc + ')');
  if (companyName) {
    var q = companyName.replace(/['"]/g,'').trim();
    if (!dc || q.toLowerCase() !== dc.split('.')[0].toLowerCase()) parts.push('"' + q + '"');
  }
  var query = parts.join(' OR ');
  if (!query) throw new Error('No search terms');
  var list = await _gFetch('/messages', { q: query, maxResults: 20 });
  var msgs = list.messages || [];
  if (!msgs.length) return { threads: [], contacts: [], query: query };
  var details = await Promise.allSettled(
    msgs.slice(0,8).map(function(m){ return _gFetch('/messages/' + m.id, { format: 'metadata', metadataHeaders: 'From,To,Subject,Date' }); })
  );
  var threads = [], cmap = {};
  details.forEach(function(r) {
    if (r.status !== 'fulfilled') return;
    var hh = {}; ((r.value.payload && r.value.payload.headers) || []).forEach(function(x){ hh[x.name] = x.value; });
    var from = hh['From'] || '', subject = hh['Subject'] || '(no subject)';
    var date = hh['Date'] ? new Date(hh['Date']).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'2-digit'}) : '';
    threads.push({ from:from, subject:subject, date:date, id:r.value.id });
    var m2 = from.match(/^(.+?)\s*<(.+?)>/) || from.match(/^(.+)$/);
    if (m2) {
      var name = (m2[1]||'').trim().replace(/^["']|["']$/g,'');
      var email = (m2[2]||m2[1]||'').trim().toLowerCase();
      if (email.indexOf('@') !== -1 && !cmap[email]) cmap[email] = { name:name, email:email };
    }
  });
  return { threads:threads, contacts:Object.values(cmap), query:query, total:list.resultSizeEstimate||msgs.length };
}
export function gmailSectionHTML(slug, companyName) {
  if (!GMAIL_CLIENT_ID || GMAIL_CLIENT_ID === 'YOUR_GOOGLE_CLIENT_ID')
    return '<div style="color:var(--prc);padding:8px 0;font-size:10px">Gmail not configured</div>';
  var s = esc(slug), n = esc(companyName);
  if (!gmailIsConnected())
    return '<div style="padding:4px 0"><div style="font-size:10px;color:var(--t3);margin-bottom:10px">Connect Gmail to scan history with <b>' + n + '</b></div>'
      + '<button class="btn sm p" onclick="window.gmailConnectAndScan(\'' + s + '\',\'' + n + '\')">Connect Gmail</button></div>';
  return '<div style="padding:4px 0">'
    + '<div style="display:flex;align-items:center;gap:8px;padding:5px 8px;background:var(--surf3);border-radius:3px;margin-bottom:8px;border:1px solid var(--rule)">'
    + '<span style="font:600 9px monospace;color:var(--g)">CONNECTED</span>'
    + '<span style="font:400 9px monospace;color:var(--t2);flex:1;overflow:hidden;text-overflow:ellipsis">' + esc(gmailGetStoredEmail()) + '</span>'
    + '<button class="btn sm" onclick="window.gmailDisconnectUI()">Disconnect</button></div>'
    + '<button class="btn sm p" onclick="window.gmailScanCompany(\'' + s + '\',\'' + n + '\')">Scan Gmail for ' + n + '</button>'
    + '<div id="ib-email-results" style="margin-top:8px"></div>'
    + '<div id="ib-email-contacts-strip" style="display:none;margin-top:8px;padding:8px;background:var(--surf3);border:1px solid var(--rule)"></div>'
    + '</div>';
}
export async function gmailConnectAndScan(slug, companyName) {
  var btn = document.querySelector('[onclick*="gmailConnectAndScan"]');
  if (btn) { btn.disabled = true; btn.textContent = 'Connecting...'; }
  try {
    await gmailConnect();
    try { await gmailGetProfile(); } catch(e2) {}
    var body = document.getElementById('ib-email-body');
    if (body) body.innerHTML = gmailSectionHTML(slug, companyName);
    await gmailScanCompany(slug, companyName);
    if (window.clog) window.clog('info', 'Gmail connected');
  } catch(e) {
    if (btn) { btn.disabled = false; btn.textContent = 'Connect Gmail'; }
    if (window.clog) window.clog('info', 'Gmail connect failed: ' + esc(e.message));
  }
}
export function gmailDisconnectUI() {
  gmailDisconnect();
  var slug = window._currentEmailSlug, name = (window.currentCompany && window.currentCompany.name) || '';
  var body = document.getElementById('ib-email-body');
  if (body && slug) body.innerHTML = gmailSectionHTML(slug, name);
  if (window.clog) window.clog('info', 'Gmail disconnected');
}
export async function gmailScanCompany(slug, companyName) {
  var el = document.getElementById('ib-email-results');
  var strip = document.getElementById('ib-email-contacts-strip');
  if (!el) return;
  el.innerHTML = '<div style="font-size:9px;color:var(--t3);animation:pulse 1.4s infinite">Scanning Gmail...</div>';
  var co = window._oaState && window._oaState.companies && window._oaState.companies.find(function(c){ return (c.id||(window._slug&&window._slug(c.name||'')))===slug; });
  var domain = (co && co.website) || '';
  try {
    var result = await gmailSearchCompany(companyName, domain);
    var threads = result.threads, contacts = result.contacts, total = result.total;
    if (!threads.length) {
      el.innerHTML = '<div style="font-size:9px;color:var(--t3);padding:4px 0">No emails found for <b>' + esc(companyName) + '</b></div>';
      return;
    }
    el.innerHTML = '<div style="font:600 8px monospace;text-transform:uppercase;color:var(--t3);margin-bottom:6px">'
      + threads.length + ' emails' + (total > threads.length ? ' (~' + total + ' total)' : '') + '</div>'
      + threads.map(function(t){
          return '<div style="display:flex;gap:8px;padding:6px 0;border-bottom:1px solid var(--rule3)">'
            + '<div style="width:6px;height:6px;border-radius:50%;background:var(--g);flex-shrink:0;margin-top:4px"></div>'
            + '<div style="flex:1;min-width:0">'
            + '<div style="font:500 11px monospace;color:var(--t1);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(t.subject) + '</div>'
            + '<div style="font:400 8px monospace;color:var(--t3);margin-top:2px;display:flex;gap:8px">'
            + '<span>' + esc(t.from.slice(0,40)) + (t.from.length>40?'...':'') + '</span>'
            + '<span style="color:var(--t4)">' + t.date + '</span>'
            + '</div></div></div>';
        }).join('');
    if (contacts.length) {
      strip.style.display = 'block';
      window._gmailFoundContacts = contacts.map(function(c){
        return { full_name:c.name, email:c.email, company_name:companyName, company_id:slug, source:'gmail_scan' };
      });
      strip.innerHTML = '<div style="font:600 8px monospace;text-transform:uppercase;color:var(--t3);margin-bottom:6px">'
        + contacts.length + ' contact' + (contacts.length>1?'s':'') + ' found</div>'
        + contacts.map(function(c){
            return '<div style="display:flex;gap:6px;padding:3px 0;font-size:10px">'
              + '<span style="color:var(--t1)">' + esc(c.name||c.email) + '</span>'
              + '<span style="color:var(--t4)">' + esc(c.email) + '</span></div>';
          }).join('')
        + '<button class="btn sm p" onclick="window.gmailSaveContacts()" style="margin-top:6px">Save ' + contacts.length + ' to CRM</button>';
    } else { strip.style.display = 'none'; }
    if (window.clog) window.clog('info', 'Gmail: ' + threads.length + ' emails, ' + contacts.length + ' contacts');
  } catch(e) {
    el.innerHTML = '<div style="font-size:9px;color:var(--prc)">Error: ' + esc(e.message) + '</div>';
    if (window.clog) window.clog('info', 'Gmail scan error: ' + esc(e.message));
  }
}
export async function gmailSaveContacts() {
  var contacts = window._gmailFoundContacts;
  if (!contacts || !contacts.length) return;
  var btn = document.querySelector('[onclick="window.gmailSaveContacts()"]');
  if (btn) { btn.disabled = true; btn.textContent = 'Saving...'; }
  var saved = 0;
  for (var i = 0; i < contacts.length; i++) {
    try {
      var res = await fetch(SB_URL + '/rest/v1/contacts', {
        method: 'POST',
        headers: authHdr({ Prefer: 'resolution=merge-duplicates,return=minimal' }),
        body: JSON.stringify(contacts[i])
      });
      if (res.ok || res.status === 409) saved++;
    } catch(e2) {}
  }
  var strip = document.getElementById('ib-email-contacts-strip');
  if (strip) strip.innerHTML = '<div style="font-size:9px;color:var(--g)">Saved ' + saved + ' contact' + (saved!==1?'s':'') + ' to CRM</div>';
  window._gmailFoundContacts = [];
  if (window.clog) window.clog('db', 'Gmail contacts saved: ' + saved);
}
