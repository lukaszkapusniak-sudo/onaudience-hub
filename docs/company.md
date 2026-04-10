# Company (account) detail — legacy hub

**Primary module:** `www/hub/hub.js`  
**Shared state:** `www/hub/state.js` — `S.currentCompany`, `S.companies`, `totalCompaniesInDb`, etc.

## State

- **`S.companies`** — Loaded from Supabase via `loadFromSupabase` in `api.js` (paginated; see `docs/loader.md`).
- **`S.currentCompany`** — The row object for the open detail panel; mirrored to **`window.currentCompany`** for legacy inline handlers.
- **Slug:** Derived with `_slug(c.name)` for DOM ids, email section, and DB keys where applicable.

## Opening a company: `openCompany(c)`

**`hub.js`**

- If `c` is a **string**, treats it as an alias: `resolveAlias(c)` then finds the row in `S.companies` and recurses with the object.
- Hides **`#emptyState`**, shows **`#coPanel`**, sets `S.currentCompany` / `window.currentCompany`.
- Builds the **`.ib` (info box)** HTML: avatar initials, name, type tag, ICP stars, optional note, system-audience snippet when relevant, **status** chips (demo mode locks these), CTA row (Draft Email, Find DMs, Gen Angle, News, Similar, LinkedIn, Merge…), **mark-as** pipeline buttons, then collapsible sections (intelligence, contacts, products, segments, **email/Gmail**, Lemlist, etc. — exact set depends on template branches and demo flags).

After injection, **staggered async loaders** run: relations brief, intelligence, contacts, products, optional Lemlist (`hub.js`).

## Closing: `closePanel()`

Clears `S.currentCompany` / `window.currentCompany`, hides `#coPanel`, shows `#emptyState`, calls **`renderList()`** to refresh the main list.

## Contacts section vs DB

The panel’s contacts grid is populated from in-memory state first; **`_loadCompanyContacts`** replaces/enriches from **`dbContacts.byCompany(slug, name)`** when not in demo mode, merges rows into **`S.contacts`**, and updates the grid and section count.

## Gmail block

Email history / Gmail lives in sections with ids such as **`#ib-email-body`**, **`#ib-email-results`**. HTML is produced by `gmailSectionHTML` (`gmail.js`). Slug for Gmail is stored as **`window._currentEmailSlug`** when the panel opens.

## List and search

**`www/hub/list.js`** renders the main company list, filters, and tags; clicking a row typically calls `openCompany`. Search/filter state is on **`S`** (`searchQ`, `activeTags`, `sortBy`, …).

## Related documentation

- **Loading pipeline:** `docs/loader.md`
- **Gmail:** `docs/gmail.md`
- **Contacts drawer:** `docs/contact.md`
