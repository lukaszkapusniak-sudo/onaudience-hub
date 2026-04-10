# Loading and async data (`loader` patterns)

This document describes **how the legacy hub shows progress and streams data**. Implementation lives mainly under `www/hub/` (not the Vue `frontend/` shell).

## Supabase: companies + contacts + relations

**Module:** `www/hub/api.js` — `loadFromSupabase(renderStats, renderList, renderTagPanel)`

- **First paint:** Fetches in parallel:
  - Companies **rows 0–199** (page size `_PAGE = 200`), ordered by ICP / richness / `updated_at`.
  - Contacts: initial batch via `dbContacts.listAll()` (first 1000 rows per Supabase limits).
  - Relations: `dbRelations.listAll()`.
- **Contacts beyond 1000:** `_loadAllContacts` pages with `Range: 1000-1999`, etc., and merges into `S.contacts` in the background (does not block the first list render).
- **Remaining companies:** If `total > 200`, `_loadRemainingPages` fetches additional 200-row chunks, deduplicates by `id`, appends to `S.companies`, and re-renders stats/list until all rows are loaded. Guarded by `_loadingPages` so two background loads do not run twice.
- **Status UI:** `setStatus(live)` updates `#dbStatus` in the nav: `● Live · N / total` while partial load, then a completion log via `window.clog` when done.
- **Retries:** On transient errors (`522`, network, `companies load failed`), schedules a **single retry** after 3 seconds.

## Company panel: deferred section loads

**Module:** `www/hub/hub.js` — `openCompany(c)`

After the HTML for the detail panel is injected, several loaders run on **timeouts** (staggered 60–200 ms) so the shell appears before network work:

| Delay   | Call                                 | Purpose                                                       |
| ------- | ------------------------------------ | ------------------------------------------------------------- |
| ~60 ms  | `loadRelationsBrief(slug)`           | Relationship summary for the account                          |
| ~80 ms  | `loadIntelligence(slug, c.name)`     | News / intel block                                            |
| ~120 ms | `_loadCompanyContacts(slug, c.name)` | Fresh contacts from DB for this company                       |
| ~150 ms | `_loadCompanyProducts(slug, c)`      | `products` JSON from `companies` row if not already in memory |
| ~200 ms | `_loadLemlistSection`                | Only if `localStorage.oaLemlistKey` is set                    |

`_loadCompanyContacts` uses `dbContacts.byCompany`; in **demo mode** it filters `S.contacts` locally instead of hitting Supabase.

## Inline “loading” affordances (not a global spinner)

- **Gmail:** While scanning or summarizing, `#ib-email-results` is set to text with `animation: pulse 1.4s infinite` (“Scanning Gmail…”, “Summarizing with Claude…”). See `docs/gmail.md`.
- **Lemlist:** Campaign and lead lists show “Loading campaigns…” / “Loading leads…” placeholders (`www/hub/lemlist.js`).
- **Merge suggestions:** Modal body uses `.mrg-loading` (“Loading suggestions…”) while `loadMergeSuggestions()` runs (`www/hub/merge.js`).
- **TCF / GVL:** `www/hub/tcf.js` — `loadGVL()` shows “Loading GVL v3…” on first fetch; empty-state visibility is coordinated when switching tabs.
- **Hub intel / GVL:** If GVL is not ready for a vendor row, a small inline message can offer “↺ retry” (`hub.js`).

## Mental model

There is **no single app-wide loader component**. Instead:

1. **Nav** reflects DB connectivity and row counts (`api.js` + `#dbStatus`).
2. **Company detail** hydrates sections asynchronously after `openCompany`.
3. **Feature modules** (Gmail, Lemlist, merge, TCF) use **inline text + pulse animation** or module-specific placeholders.
