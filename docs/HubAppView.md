# `HubAppView.vue` — production hub shell

**Path:** [`frontend/src/views/HubAppView.vue`](../frontend/src/views/HubAppView.vue)

**Route:** `/` — full-viewport **iframe** with `src` = `${BASE_URL}hub/index.html` (same origin as the Vue app).

## Role

- **Production** entry for users hitting the site root: Vue + Pinia bootstrap runs first; [`supabaseApp.ts`](../frontend/src/lib/supabaseApp.ts) hydrates **`oaHubSession`** when OAuth returns on `/` (hash / PKCE).
- Legacy **www/hub** UI stays in the iframe until modules are ported into `frontend/src/`.

## OAuth

[`auth.js`](../www/hub/auth.js) `oauthAppBaseUrl()` redirects Google sign-in to the **SPA root** (not only `/hub/`). Add that URL in Supabase **Authentication → URL configuration** (see [`config.md`](config.md)).

## Related

- [`App.md`](App.md), [`components.md`](components.md)
