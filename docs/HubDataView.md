# `HubDataView.vue` — native company list (first page)

**Path:** [`frontend/src/views/HubDataView.vue`](../frontend/src/views/HubDataView.vue)

**Route:** `/data`

## Role

- Loads the **first 200 companies** + **total count** via [`hubRest.ts`](../frontend/src/lib/hubRest.ts) (same Supabase REST query/order as [`www/hub/db.js`](../www/hub/db.js) + [`api.js`](../www/hub/api.js) initial load).
- Stores rows in Pinia [`stores/hub.ts`](../frontend/src/stores/hub.ts).
- **Does not** replace the iframe hub; it proves the Vue data path until full UI parity.

## Auth

Uses the same **`oaHubSession`** as the legacy hub (`getSupabaseApp` + `hubAuthHeaders`). Sign in through the embedded hub first, then open `/data` in the same browser.

## Related

- [`HubAppView.md`](HubAppView.md)
