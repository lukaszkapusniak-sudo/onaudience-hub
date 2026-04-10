# `app.js` — hub bootstrap and `window` bridge

**Path:** [`www/hub/app.js`](../www/hub/app.js)

Entry module loaded from [`index.html`](../www/hub/index.html). Wires authentication, theme, tab switching, and exposes dozens of functions on **`window`** so inline HTML (`onclick="…"`) can call into ES modules.

## Responsibilities

1. **Theme** — `applyTheme` / `toggleTheme` read/write `localStorage.oaTheme` and `data-theme` on `<html>`.
2. **Shared token bridge** — `window._oaToken` is primed from the Supabase session so `api.js` fetch calls can attach the user JWT without circular imports. `window._oaState = S` mirrors [`state.js`](state.md) for cross-version script access.
3. **Audit helpers** — `oaLogCompany`, `oaLogContact`, `oaLogAudience` wrap `logActivity` from [`auth.js`](auth.md).
4. **`switchTab(t)`** — Coordinates visibility of company list, contacts, audiences panel, TCF center, Lemlist area, empty state vs detail panel (`#coPanel`). Delegates list logic to `hub.js`’s `_switchTab`.
5. **Prospect / Company Finder** — `openProspectFinder`, `_openVibeFinder`, `vibeDoSearch` build the `#vibeFinder` panel and call [`vibe.js` / `vibe.md`](vibe.md) search helpers on `window`.
6. **`bootHub(session)`** — Idempotent post-login routine: domain email gate (non-`@onaudience.pl` users may be rejected depending on config), sets `window._oaToken`, calls `loadFromSupabase`, `renderStats`, `renderList`, `updateGmailNavBtn`, merge suggestion badge, tutorial hooks, etc.
7. **Mass `window` export** — Assigns imports from `hub.js`, `gmail.js`, `auth.js`, `audiences.js`, `vibe.js`, `demo.js`, `tutorial.js` so legacy HTML and tests can invoke `openCompany`, `gmailScanCompany`, `renderAudiencesPanel`, etc., without a bundler.

## Related

- [`hub.md`](hub.md) — core company panel and AI console
- [`api.md`](api.md) — `loadFromSupabase`
- [`auth.md`](auth.md) — session and login UI
