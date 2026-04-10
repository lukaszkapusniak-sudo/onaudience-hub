# `HubDataView.vue` — native company list (first page)

**Path:** [`frontend/src/views/HubDataView.vue`](../frontend/src/views/HubDataView.vue)

**Route:** `/data` (nested under [`HubShellLayout.md`](HubShellLayout.md))

## Role

- Loads the **first 200 companies** + **total count** via [`hubRest.ts`](../frontend/src/lib/hubRest.ts) (same Supabase REST query/order as [`www/hub/db.js`](../www/hub/db.js) + [`api.js`](../www/hub/api.js) initial load).
- Loads **contacts** when needed for Fresh filter + tag pool counts (see [`companyList.ts`](../frontend/src/lib/companyList.ts)).
- In parallel, loads **`company_relations`** like legacy `loadFromSupabase`.
- **Phase 3:** search, type filter chips, [`TAG_RULES`](../frontend/src/config/tagRules.ts) tag panel (OR/AND), sort (recent / name / ICP), **`/`** keyboard shortcut to focus search — parity with [`list.js`](../www/hub/list.js) (rich row UI / AI still TODO).
- Stores rows in Pinia [`stores/hub.ts`](../frontend/src/stores/hub.ts).
- Alias: **`/companies`** redirects to **`/data`** ([`router/index.ts`](../frontend/src/router/index.ts)).

## Auth

Uses the same **`oaHubSession`** as the legacy hub (`getSupabaseApp` + `hubAuthHeaders`). Sign in through the embedded hub first, then open `/data` in the same browser.

## Related

- [`HubAppView.md`](HubAppView.md)
