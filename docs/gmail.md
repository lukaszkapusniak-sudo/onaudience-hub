# `gmail.js` — Gmail integration

**Source:** [`www/hub/gmail.js`](../www/hub/gmail.js)  
**Config:** `GMAIL_CLIENT_ID` from `www/hub/config.js` / `config.generated.js` (build-time via `scripts/generate-hub-config.mjs`).

Gmail uses **Google Identity Services** (`google.accounts.oauth2.initTokenClient`) with scope **`gmail.readonly`**. Tokens are stored in **`localStorage`** (`oaGmailToken`, `oaGmailExpiry`, plus `oaGmailEmail` / `oaGmailName` from profile).

## Connection lifecycle

| Function             | Behavior                                                                                         |
| -------------------- | ------------------------------------------------------------------------------------------------ |
| `gmailIsConnected()` | True if a non-expired access token exists locally.                                               |
| `gmailConnect()`     | Requests token with `prompt: 'consent'`.                                                         |
| `gmailDisconnect()`  | Revokes token via GIS if possible, clears storage, resets internal token client.                 |
| `gmailGetProfile()`  | `GET .../gmail/v1/users/me/profile`; stores `emailAddress` to `oaGmailEmail`.                    |
| `gmailNavToggle()`   | Navbar control: connect or confirm-disconnect; updates `#gmailNavBtn` via `updateGmailNavBtn()`. |

Low-level HTTP uses `_gFetch(path, params)` against `GMAIL_BASE` with `Authorization: Bearer <token>`. `_ensureToken()` re-prompts silently (`prompt: ''`) if the token expired.

## Company Email section UI

`gmailSectionHTML(slug, companyName)` returns HTML for **`#ib-email-body`** inside the company detail panel.

- If **`GMAIL_CLIENT_ID`** is missing or placeholder: shows “Gmail not configured”.
- If not connected: short copy + **Connect Gmail** → `window.gmailConnectAndScan(slug, companyName)` (connects, refreshes section HTML, runs `gmailScanCompany`).
- If connected: shows **CONNECTED** + stored email + **Disconnect**; actions **Scan Gmail**, **Update Contacts**, **Summarize**; containers `#ib-email-results` and `#ib-email-contacts-strip`.

`window._currentEmailSlug` is set when a company is opened (`hub.js` / `openCompany`) so disconnect can re-render the section.

## Scan Gmail (`gmailScanCompany`)

1. Shows pulsing “Scanning Gmail…” in `#ib-email-results`.
2. Resolves the company from `window._oaState.companies` by slug to read **`website`** → **domain** (stripped to hostname).
3. Calls `gmailSearchCompany(companyName, domain)`:
   - Builds a Gmail **`q`** string: optional `(from:domain OR to:domain)` plus quoted company name if it adds information beyond the domain’s first label.
   - Lists up to **20** message ids, fetches **metadata** for up to **8** messages (`From`, `To`, `Subject`, `Date`).
   - Returns **threads** (for display) and **contacts** parsed from `From` headers where the email is **on the company domain** (`@domain`).
4. `gmailRenderResults` writes thread rows with links to Gmail web (`mail.google.com` … `#all/<threadId>`).
5. If domain contacts were found, **`#ib-email-contacts-strip`** lists checkboxes (default checked) and **Save selected to CRM** → `gmailSaveSelectedContacts` / `gmailSaveContacts` path: POST to **`SB_URL/rest/v1/contacts`** with `Prefer: resolution=merge-duplicates`, generating synthetic `id` when missing.

## Update Contacts (`gmailEnrichContacts`)

Deeper pass: up to **50** message ids, metadata for up to **20**, parses **From / To / Cc** for addresses matching the company domain. Compares to existing CRM contacts in `window._oaState.contacts` for that company:

- **New** contacts → queued in `window._gmailFoundContacts` for POST.
- **Existing** rows without email but name-matching a found address → **PATCH** list for `gmailSaveAndEnrichContacts`.

UI distinguishes NEW vs ADD EMAIL rows and uses a combined save button.

## Summarize

Uses last scan’s `window._gmailLastThreads` / slug / name. Requires threads loaded first (otherwise prompts user to scan). Calls Claude (or configured AI) with estimated token budget (`_estimateTokens`); shows “Summarizing with Claude…” while running. Relationship summary can be persisted via Supabase helpers exported from the same file (see `gmailSaveRelationshipSummary` and related in `gmail.js`).

## Integration points

- **`app.js`** imports Gmail exports and attaches many to **`window`** for inline `onclick` handlers in generated HTML.
- **`drawer.js` — `drGmail()`:** From the contact drawer, finds the company, calls `openCompany`, closes drawer, scrolls to **`#ib-intel-body`** and calls `bgRefreshIntel()` — steering the user toward **intel / email** context for that company.
- **`hub.js` — `openClaudeGmail(type, …)`:** e.g. `history` opens the company and scrolls to the Email section; `draft` opens Meeseeks composer with company/contact context.

## Tests

Playwright coverage includes Gmail contact save flows (e.g. `tests/gmail-contacts-save.spec.ts`); rendering helpers like `gmailRenderResults` are written to be test-friendly.
