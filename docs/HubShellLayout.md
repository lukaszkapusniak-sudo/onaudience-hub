# `HubShellLayout.vue` — app chrome (Phase 2)

**Path:** [`frontend/src/layouts/HubShellLayout.vue`](../frontend/src/layouts/HubShellLayout.vue)

**Route:** wraps **`/`** and nested routes (`/data`, `/lemlist`, `/about`, `/migrate`, `/demo/contact-drawer`).

## Role

- Top bar: brand, quick links, **theme** toggle (`data-theme` + `localStorage` `oaTheme`, same keys as [`www/hub/app.js`](../www/hub/app.js)), **Supabase** session email + **Sign out** ([`supabaseApp.ts`](../frontend/src/lib/supabaseApp.ts)).
- Stats strip: companies loaded / DB total + relations (from [`stores/hub.ts`](../frontend/src/stores/hub.ts)); loads first page + relations on layout mount.
- Left rail: same primary destinations as the top links.
- **`<RouterView />`** for child views — legacy iframe ([`HubAppView.vue`](HubAppView.md)), [`HubDataView.vue`](HubDataView.md), etc.

## Related

- [`VUE_MIGRATION.md`](VUE_MIGRATION.md) Phase 2
- [`HubAppView.md`](HubAppView.md)
