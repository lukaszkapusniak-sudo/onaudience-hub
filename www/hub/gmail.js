/* gmail.js -- Gmail OAuth via Google Identity Services */
import { GMAIL_CLIENT_ID } from './config.js?v=20260409f';
import { esc, authHdr } from './utils.js?v=20260409f';
import { SB_URL } from './config.js?v=20260409f';

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
  Object.entries(params).forEach(function(kv){
    if (Array.isArray(kv[1])) {
      kv[1].forEach(function(v){ url.searchParams.append(kv[0], v); });
    } else {
      url.searchParams.set(kv[0], kv[1]);
    }
  });
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
    msgs.slice(0,8).map(function(m){ return _gFetch('/messages/' + m.id, { format: 'metadata', metadataHeaders: ['From','To','Subject','Date'] }); })
  );
  var threads = [], cmap = {};
  details.forEach(function(r) {
    if (r.status !== 'fulfilled') return;
    var hh = {}; ((r.value.payload && r.value.payload.headers) || []).forEach(function(x){ hh[x.name] = x.value; });
    var from = hh['From'] || '', subject = hh['Subject'] || '(no subject)';
    var date = hh['Date'] ? new Date(hh['Date']).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'2-digit'}) : '';
    threads.push({ from:from, subject:subject, date:date, id:r.value.id, threadId:r.value.threadId||r.value.id });
    var m2 = from.match(/^(.+?)\s*<(.+?)>/) || from.match(/^(.+)$/);
    if (m2) {
      var name = (m2[1]||'').trim().replace(/^["']|["']$/g,'');
      var email = (m2[2]||m2[1]||'').trim().toLowerCase();
      // Only suggest contacts from the company domain
      if (email.indexOf('@') !== -1 && dc && email.indexOf('@' + dc) !== -1 && !cmap[email]) {
        cmap[email] = { name:name, email:email };
      }
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
    + '<div style="display:flex;gap:6px;margin-bottom:4px">'
    + '<button class="btn sm p" onclick="window.gmailScanCompany(\'' + s + '\',\'' + n + '\')">Scan Gmail</button>'
    + '<button class="btn sm" onclick="window.gmailEnrichContacts(\'' + s + '\',\'' + n + '\')">Update Contacts</button>'
    + '<button class="btn sm" onclick="window.gmailShowSummarizePrompt(null,null,null)" title="Summarize email relationship">&#10022; Summarize</button>'
    + '</div>'
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

/** Render a list of threads into #ib-email-results (also used by tests). */
export function gmailRenderResults(threads, companyName) {
  var el = document.getElementById('ib-email-results');
  if (!el) return;
  if (!threads || !threads.length) {
    el.innerHTML = '<div style="font-size:9px;color:var(--t3);padding:4px 0">No emails found' + (companyName ? ' for <b>' + esc(companyName) + '</b>' : '') + '</div>';
    return;
  }
  el.innerHTML = '<div style="font:600 8px monospace;text-transform:uppercase;color:var(--t3);margin-bottom:6px">'
    + threads.length + ' email' + (threads.length !== 1 ? 's' : '') + '</div>'
    + threads.map(function(t){
        return '<div class="gmail-row" style="display:flex;gap:8px;padding:6px 0;border-bottom:1px solid var(--rule3)">'
          + '<div style="width:6px;height:6px;border-radius:50%;background:var(--g);flex-shrink:0;margin-top:4px"></div>'
          + '<div style="flex:1;min-width:0">'
          + '<a href="https://mail.google.com/mail/u/0/#all/' + (t.threadId||t.id||'') + '" target="_blank" style="font:500 11px monospace;color:var(--g);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-decoration:none;display:block" title="Open in Gmail">' + esc(t.subject) + ' ↗</a>'
          + '<div style="font:400 8px monospace;color:var(--t3);margin-top:2px;display:flex;gap:8px">'
          + '<span>' + esc((t.from||'').slice(0,40)) + ((t.from||'').length>40?'...':'') + '</span>'
          + '<span style="color:var(--t4)">' + (t.date||'') + '</span>'
          + '</div></div></div>';
      }).join('');
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
    gmailRenderResults(threads, companyName);
    if (contacts.length) {
      strip.style.display = 'block';
      window._gmailFoundContacts = contacts.map(function(c){
        return { full_name:c.name, email:c.email, company_name:companyName, company_id:slug, source:'gmail_scan' };
      });
      strip.innerHTML = '<div style="font:600 8px monospace;text-transform:uppercase;color:var(--t3);margin-bottom:6px">'
        + contacts.length + ' contact' + (contacts.length>1?'s':'') + ' found &mdash; select to save:</div>'
        + contacts.map(function(c, i){
            return '<label style="display:flex;align-items:center;gap:7px;padding:4px 2px;cursor:pointer;border-bottom:1px solid var(--rule3)">'
              + '<input type="checkbox" checked data-i="' + i + '" style="accent-color:var(--g);cursor:pointer"/>'
              + '<span style="flex:1;font:500 10px monospace;color:var(--t1)">' + esc(c.name||c.email) + '</span>'
              + '<span style="font:400 9px monospace;color:var(--t4)">' + esc(c.email) + '</span>'
              + '</label>';
          }).join('')
        + '<button class="btn sm p" onclick="window.gmailSaveSelectedContacts()" style="margin-top:6px;width:100%">Save selected to CRM</button>';
    } else { strip.style.display = 'none'; }
    // Store threads for summarize access
    window._gmailLastThreads = threads;
    window._gmailLastSlug = slug;
    window._gmailLastName = companyName;

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

/* ── Nav bar toggle ──────────────────────────────────────────── */
export function updateGmailNavBtn() {
  var btn = document.getElementById('gmailNavBtn');
  if (!btn) return;
  if (gmailIsConnected()) {
    var email = gmailGetStoredEmail();
    btn.textContent = 'Gmail: ' + (email ? email.split('@')[0] : 'on');
    btn.style.color = 'var(--cc)';
    btn.style.borderColor = 'var(--cr)';
    btn.title = 'Gmail connected as ' + email + ' — click to disconnect';
  } else {
    btn.textContent = 'Gmail';
    btn.style.color = '';
    btn.style.borderColor = '';
    btn.title = 'Connect Gmail';
  }
}

export async function gmailNavToggle() {
  if (gmailIsConnected()) {
    if (!confirm('Disconnect Gmail?')) return;
    gmailDisconnect();
    updateGmailNavBtn();
    if (window.clog) window.clog('info', 'Gmail disconnected');
  } else {
    var btn = document.getElementById('gmailNavBtn');
    if (btn) { btn.textContent = 'Gmail...'; btn.disabled = true; }
    try {
      await gmailConnect();
      try { await gmailGetProfile(); } catch(e2) {}
      updateGmailNavBtn();
      if (window.clog) window.clog('info', 'Gmail connected as ' + gmailGetStoredEmail());
    } catch(e) {
      if (window.clog) window.clog('info', 'Gmail connect failed: ' + e.message);
    } finally {
      if (btn) btn.disabled = false;
      updateGmailNavBtn();
    }
  }
}

/* ── Update CRM contacts from Gmail data ─────────────────────── */
export async function gmailEnrichContacts(slug, companyName) {
  var el = document.getElementById('ib-email-results');
  var strip = document.getElementById('ib-email-contacts-strip');
  if (el) el.innerHTML = '<div style="font-size:9px;color:var(--t3);animation:pulse 1.4s infinite">Scanning Gmail for contacts...</div>';

  var co = window._oaState && window._oaState.companies && window._oaState.companies.find(function(c){ return (c.id||(window._slug&&window._slug(c.name||'')))===slug; });
  var domain = (co && co.website) || '';

  try {
    // Fetch up to 50 messages to find more contacts
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

    var list = await _gFetch('/messages', { q: query, maxResults: 50 });
    var msgs = list.messages || [];
    if (!msgs.length) {
      if (el) el.innerHTML = '<div style="font-size:9px;color:var(--t3)">No emails found for ' + esc(companyName) + '</div>';
      return;
    }

    // Fetch details for up to 20 messages
    var details = await Promise.allSettled(
      msgs.slice(0,20).map(function(m){ return _gFetch('/messages/' + m.id, { format: 'metadata', metadataHeaders: ['From','To','Cc','Subject','Date'] }); })
    );

    // Extract unique contacts from From/To/Cc headers
    var cmap = {};
    details.forEach(function(r) {
      if (r.status !== 'fulfilled') return;
      var hh = {}; ((r.value.payload && r.value.payload.headers) || []).forEach(function(x){ hh[x.name] = x.value; });

      // Parse From, To, Cc headers
      ['From','To','Cc'].forEach(function(hName) {
        var val = hh[hName] || '';
        // Split by comma for multiple recipients
        val.split(',').forEach(function(addr) {
          addr = addr.trim();
          var m2 = addr.match(/^(.+?)\s*<(.+?)>/) || addr.match(/^([^\s@]+@[^\s@]+)$/);
          if (m2) {
            var name = (m2[1]||'').trim().replace(/^["']|["']$/g,'');
            var email = (m2[2]||m2[1]||'').trim().toLowerCase();
            if (email.indexOf('@') !== -1 && email.indexOf(dc||'NOMATCH') !== -1 && !cmap[email]) {
              cmap[email] = { name: name || email.split('@')[0], email: email };
            }
          }
        });
      });
    });

    var contacts = Object.values(cmap);

    // Also check existing CRM contacts and enrich with email if missing
    var existingContacts = window._oaState && window._oaState.contacts && window._oaState.contacts.filter(function(ct){
      return ct.company_id === slug || (ct.company_name||'').toLowerCase() === companyName.toLowerCase();
    }) || [];

    var newContacts = contacts.filter(function(c){
      return !existingContacts.some(function(ec){ return (ec.email||'').toLowerCase() === c.email; });
    });

    var enriched = existingContacts.filter(function(ec){
      if (ec.email) return false; // already has email
      return contacts.some(function(c){ return (ec.full_name||'').toLowerCase().includes(c.name.toLowerCase()) && c.name.length > 2; });
    }).map(function(ec){
      var match = contacts.find(function(c){ return (ec.full_name||'').toLowerCase().includes(c.name.toLowerCase()); });
      return { id: ec.id, email: match.email };
    });

    window._gmailFoundContacts = newContacts.map(function(c){
      return { full_name: c.name, email: c.email, company_name: companyName, company_id: slug, source: 'gmail_scan' };
    });

    if (el) {
      el.innerHTML = '<div style="font:600 8px monospace;text-transform:uppercase;color:var(--t3);margin-bottom:6px">'
        + msgs.length + ' emails scanned · ' + contacts.length + ' unique contacts found</div>'
        + (newContacts.length ? '<div style="font-size:9px;color:var(--g);margin-bottom:4px">' + newContacts.length + ' new contact' + (newContacts.length>1?'s':'') + ' not in CRM</div>' : '')
        + (enriched.length ? '<div style="font-size:9px;color:var(--poc);margin-bottom:4px">' + enriched.length + ' existing contact' + (enriched.length>1?'s':'') + ' can get email added</div>' : '')
        + (!newContacts.length && !enriched.length ? '<div style="font-size:9px;color:var(--t3)">All contacts already in CRM with emails</div>' : '');
    }

    if (strip && (newContacts.length || enriched.length)) {
      strip.style.display = 'block';
      strip.innerHTML = (newContacts.length ? newContacts.map(function(c){
          return '<div style="display:flex;gap:6px;padding:3px 0;font-size:10px">'
            + '<span style="color:var(--t1)">' + esc(c.name) + '</span>'
            + '<span style="color:var(--t4)">' + esc(c.email) + '</span>'
            + '<span style="color:var(--g);font-size:8px">NEW</span></div>';
        }).join('') : '')
        + (enriched.length ? enriched.map(function(e){
          var ct = existingContacts.find(function(ec){ return ec.id === e.id; });
          return '<div style="display:flex;gap:6px;padding:3px 0;font-size:10px">'
            + '<span style="color:var(--t1)">' + esc(ct && ct.full_name || e.id) + '</span>'
            + '<span style="color:var(--t4)">' + esc(e.email) + '</span>'
            + '<span style="color:var(--poc);font-size:8px">ADD EMAIL</span></div>';
        }).join('') : '')
        + '<button class="btn sm p" onclick="window.gmailSaveAndEnrichContacts('+JSON.stringify(enriched)+')" style="margin-top:6px">'
        + 'Save ' + (newContacts.length + enriched.length) + ' update' + (newContacts.length+enriched.length>1?'s':'') + ' to CRM</button>';
    } else if (strip) { strip.style.display = 'none'; }

    if (window.clog) window.clog('db', 'Gmail enrichment: ' + newContacts.length + ' new contacts, ' + enriched.length + ' enriched for ' + esc(companyName));

  } catch(e) {
    if (el) el.innerHTML = '<div style="font-size:9px;color:var(--prc)">Error: ' + esc(e.message) + '</div>';
    if (window.clog) window.clog('info', 'Gmail enrich error: ' + esc(e.message));
  }
}

export async function gmailSaveAndEnrichContacts(enriched) {
  // Save new contacts
  var newContacts = window._gmailFoundContacts || [];
  var saved = 0;
  for (var i = 0; i < newContacts.length; i++) {
    try {
      var res = await fetch(SB_URL + '/rest/v1/contacts', {
        method: 'POST',
        headers: authHdr({ Prefer: 'resolution=merge-duplicates,return=minimal' }),
        body: JSON.stringify(newContacts[i])
      });
      if (res.ok || res.status === 409) saved++;
    } catch(e2) {}
  }
  // Patch existing contacts with email
  var enriched2 = enriched || [];
  var patched = 0;
  for (var j = 0; j < enriched2.length; j++) {
    try {
      var res2 = await fetch(SB_URL + '/rest/v1/contacts?id=eq.' + encodeURIComponent(enriched2[j].id), {
        method: 'PATCH',
        headers: authHdr({ Prefer: 'return=minimal' }),
        body: JSON.stringify({ email: enriched2[j].email })
      });
      if (res2.ok) {
        patched++;
        // Update local state
        var ct = window._oaState && window._oaState.contacts && window._oaState.contacts.find(function(c){ return c.id === enriched2[j].id; });
        if (ct) ct.email = enriched2[j].email;
      }
    } catch(e3) {}
  }
  var strip = document.getElementById('ib-email-contacts-strip');
  if (strip) strip.innerHTML = '<div style="font-size:9px;color:var(--g)">Saved ' + saved + ' new + ' + patched + ' emails added to CRM</div>';
  window._gmailFoundContacts = [];
  if (window.clog) window.clog('db', 'Gmail enrich done: ' + saved + ' new, ' + patched + ' emails patched');
}

/* ── Summarize email relationship with Claude ────────────────── */

function _estimateTokens(threads) {
  // ~80 tokens per email metadata entry + 300 system prompt
  var inputTokens = 300 + threads.length * 80;
  var outputTokens = 450;
  return { input: inputTokens, output: outputTokens, total: inputTokens + outputTokens };
}

function _formatCost(tokens) {
  // Sonnet 4: $3/MTok input, $15/MTok output
  var cost = (tokens.input * 3 + tokens.output * 15) / 1_000_000;
  return cost < 0.01 ? '<$0.01' : '$' + cost.toFixed(3);
}

export function gmailShowSummarizePrompt(slug, companyName, threads) {
  // Use passed params or fall back to last scan data
  threads = threads || window._gmailLastThreads || [];
  slug = slug || window._gmailLastSlug || window._currentEmailSlug || '';
  companyName = companyName || window._gmailLastName || (window.currentCompany && window.currentCompany.name) || '';
  window._gmailSumThreads = threads;
  window._gmailSumSlug = slug;
  window._gmailSumName = companyName;

  if (!threads.length) {
    var el2 = document.getElementById('ib-email-results');
    if (el2) el2.innerHTML = '<div style="font-size:9px;color:var(--prc)">Scan Gmail first to load emails before summarizing.</div>';
    return;
  }

  var est = _estimateTokens(threads);
  var cost = _formatCost(est);

  var el = document.getElementById('ib-email-results');
  if (!el) return;

  // Append confirm box below existing results
  var existing = el.innerHTML;
  el.innerHTML = existing + '<div id="gmail-sum-confirm" style="margin-top:12px;padding:10px 12px;background:var(--surf2);border:1px solid var(--rule);border-radius:2px">'
    + '<div style="font:600 9px monospace;text-transform:uppercase;letter-spacing:.06em;color:var(--t2);margin-bottom:6px">Summarize with Claude?</div>'
    + '<div style="font:400 9px monospace;color:var(--t3);margin-bottom:8px;line-height:1.6">'
    + 'Analyzes ' + threads.length + ' email' + (threads.length > 1 ? 's' : '') + ' (subjects, dates, contacts) to generate a relationship summary.<br>'
    + '<span style="color:var(--t2)">Est. ' + est.total + ' tokens &middot; ' + cost + '</span><br>'
    + '<span style="color:var(--t4);font-size:8px">Uses your Anthropic API key. Metadata only &mdash; no email bodies sent.</span>'
    + '</div>'
    + '<div style="display:flex;gap:6px">'
    + '<button class="btn sm p" onclick="window.gmailRunSummarize()">Run Summary</button>'
    + '<button class="btn sm" onclick="document.getElementById(\'gmail-sum-confirm\').remove()">Cancel</button>'
    + '</div></div>';
}

export async function gmailRunSummarize() {
  var threads = window._gmailSumThreads || [];
  var slug = window._gmailSumSlug || '';
  var companyName = window._gmailSumName || '';

  var confirm = document.getElementById('gmail-sum-confirm');
  if (confirm) confirm.innerHTML = '<div style="font-size:9px;color:var(--t3);animation:pulse 1.4s infinite">Summarizing with Claude...</div>';

  if (!threads.length) {
    if (confirm) confirm.innerHTML = '<div style="font-size:9px;color:var(--prc)">No email data to summarize.</div>';
    return;
  }

  if (!window.anthropicFetch && !window.getApiKey) {
    if (confirm) confirm.innerHTML = '<div style="font-size:9px;color:var(--prc)">Anthropic API key required — click the key icon in nav.</div>';
    return;
  }

  // Build prompt from thread metadata
  var emailList = threads.map(function(t, i) {
    return (i+1) + '. [' + t.date + '] From: ' + t.from.slice(0,60) + ' | Subject: ' + t.subject;
  }).join('\n');

  var systemPrompt = 'You are a B2B sales analyst for onAudience (EU first-party data company). Analyze these email metadata entries and summarize the relationship with the company. Be concise and specific. Format as JSON only.';

  var userPrompt = 'Company: ' + companyName + '\n\nEmail history (metadata only):\n' + emailList + '\n\nReturn JSON: {"relationship_status":"warm/cold/active/dormant","last_contact_date":"...","main_topics":["..."],"relationship_owner":"name if apparent, else unknown","tone":"positive/neutral/negative","recommended_action":"1 sentence","summary":"2-3 sentence overview"}';

  try {
    var key = window.getApiKey ? window.getApiKey() : localStorage.getItem('oaAnthropicKey');
    if (!key) throw new Error('No Anthropic API key set');

    var res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }]
      })
    });

    if (!res.ok) throw new Error('API ' + res.status);
    var data = await res.json();
    var text = (data.content || []).filter(function(b){ return b.type === 'text'; }).map(function(b){ return b.text; }).join('');

    var parsed;
    try {
      var match = text.match(/\{[\s\S]*\}/);
      parsed = match ? JSON.parse(match[0]) : null;
    } catch(e2) { parsed = null; }

    // Actual tokens used
    var inputUsed = data.usage && data.usage.input_tokens || 0;
    var outputUsed = data.usage && data.usage.output_tokens || 0;
    var actualCost = _formatCost({ input: inputUsed, output: outputUsed });

    // Render result
    if (confirm) {
      if (parsed) {
        var statusColor = { warm: 'var(--cc)', cold: 'var(--t3)', active: 'var(--g)', dormant: 'var(--prc)' }[parsed.relationship_status] || 'var(--t2)';
        confirm.innerHTML = '<div style="font:600 9px monospace;text-transform:uppercase;letter-spacing:.06em;color:var(--t2);margin-bottom:8px;display:flex;align-items:center;gap:8px">'
          + 'Relationship Summary'
          + '<span style="font-size:8px;color:var(--t4);font-weight:400;text-transform:none;margin-left:auto">' + inputUsed + '+' + outputUsed + ' tokens &middot; ' + actualCost + '</span>'
          + '</div>'
          + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:8px">'
          + _sumField('Status', '<span style="color:' + statusColor + ';font-weight:600;text-transform:uppercase">' + esc(parsed.relationship_status||'?') + '</span>')
          + _sumField('Last contact', esc(parsed.last_contact_date||'?'))
          + _sumField('Owner', esc(parsed.relationship_owner||'unknown'))
          + _sumField('Tone', esc(parsed.tone||'?'))
          + '</div>'
          + (parsed.main_topics && parsed.main_topics.length ? '<div style="font:400 9px monospace;color:var(--t3);margin-bottom:6px">Topics: ' + parsed.main_topics.map(function(t){ return esc(t); }).join(', ') + '</div>' : '')
          + (parsed.summary ? '<div style="font:400 10px IBM Plex Sans,sans-serif;color:var(--t2);line-height:1.55;margin-bottom:6px;font-style:italic">' + esc(parsed.summary) + '</div>' : '')
          + (parsed.recommended_action ? '<div style="padding:6px 8px;background:var(--gb);border-left:2px solid var(--g);font:400 10px IBM Plex Sans,sans-serif;color:var(--t1)">'
            + '<span style="font:600 8px monospace;color:var(--g);text-transform:uppercase;letter-spacing:.05em">Recommended: </span>'
            + esc(parsed.recommended_action) + '</div>' : '')
          + '<div style="display:flex;gap:5px;margin-top:8px">'
          + '<button class="btn sm" onclick="window.gmailSaveRelationshipSummary(' + JSON.stringify(slug) + ',' + JSON.stringify(parsed) + ')">Save to Intelligence</button>'
          + '<button class="btn sm" onclick="document.getElementById(\'gmail-sum-confirm\').remove()">Close</button>'
          + '</div>';
      } else {
        confirm.innerHTML = '<div style="font-size:9px;color:var(--t2);white-space:pre-wrap">' + esc(text.slice(0, 400)) + '</div>'
          + '<button class="btn sm" style="margin-top:6px" onclick="document.getElementById(\'gmail-sum-confirm\').remove()">Close</button>';
      }
    }

    if (window.clog) window.clog('ai', 'Gmail summary: ' + inputUsed + '+' + outputUsed + ' tokens (' + actualCost + ') for ' + esc(companyName));

  } catch(e) {
    if (confirm) confirm.innerHTML = '<div style="font-size:9px;color:var(--prc)">Error: ' + esc(e.message) + '</div>'
      + '<button class="btn sm" style="margin-top:5px" onclick="document.getElementById(\'gmail-sum-confirm\').remove()">Close</button>';
    if (window.clog) window.clog('info', 'Gmail summarize error: ' + esc(e.message));
  }
}

function _sumField(label, value) {
  return '<div style="padding:5px 7px;background:var(--surf);border:1px solid var(--rule);border-radius:2px">'
    + '<div style="font:600 7px monospace;text-transform:uppercase;letter-spacing:.06em;color:var(--t4);margin-bottom:2px">' + label + '</div>'
    + '<div style="font:400 10px monospace;color:var(--t1)">' + value + '</div>'
    + '</div>';
}

export async function gmailSaveRelationshipSummary(slug, parsed) {
  if (!slug || !parsed) return;
  var btn = document.querySelector('[onclick*="gmailSaveRelationshipSummary"]');
  if (btn) { btn.disabled = true; btn.textContent = 'Saving...'; }
  try {
    var res = await fetch(SB_URL + '/rest/v1/intelligence', {
      method: 'POST',
      headers: authHdr({ Prefer: 'resolution=merge-duplicates,return=minimal' }),
      body: JSON.stringify({
        company_id: slug,
        type: 'gmail_summary',
        content: parsed,
        updated_at: new Date().toISOString()
      })
    });
    if (res.ok) {
      if (btn) { btn.textContent = 'Saved'; btn.style.color = 'var(--g)'; }
      if (window.clog) window.clog('db', 'Gmail summary saved for ' + esc(slug));
    }
  } catch(e2) {
    if (btn) { btn.textContent = 'Error'; }
  }
}

export function gmailSaveSelectedContacts() {
  var strip = document.getElementById('ib-email-contacts-strip');
  if (!strip) return;
  var checkboxes = strip.querySelectorAll('input[type=checkbox]');
  var allContacts = window._gmailFoundContacts || [];
  var selected = [];
  checkboxes.forEach(function(cb) {
    var i = parseInt(cb.getAttribute('data-i'));
    if (cb.checked && allContacts[i]) selected.push(allContacts[i]);
  });
  if (!selected.length) {
    alert('No contacts selected.');
    return;
  }
  // Temporarily override _gmailFoundContacts with selection
  var orig = window._gmailFoundContacts;
  window._gmailFoundContacts = selected;
  gmailSaveContacts().then(function() {
    window._gmailFoundContacts = [];
  });
}
