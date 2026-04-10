# Vue + TypeScript migration — complete

Migration is **done**. All legacy `www/hub/` modules have been ported to Vue 3 + TypeScript. The `www/hub/` directory has been deleted. The app at `/` is the Vue SPA only.

See [`components.md`](components.md) for the current module inventory.

---

## What was migrated

| Legacy file                                       | Vue replacement                                                                      |
| ------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `app.js`                                          | `main.ts`, `layouts/HubShellLayout.vue`, `router/index.ts`                           |
| `state.js`                                        | `stores/hub.ts` + feature `store.ts` files                                           |
| `db.js` / `api.js`                                | `lib/hubRest.ts`, `lib/anthropicHub.ts`, `lib/hubGeo.ts`, `lib/intelligenceMerge.ts` |
| `list.js`                                         | `views/HubDataView.vue`, `lib/companyList.ts`, `config/tagRules.ts`                  |
| `hub.js` (company detail)                         | `modules/companies/`                                                                 |
| `drawer.js`                                       | `components/ContactDrawer.vue`, `modules/contacts/`                                  |
| `audiences.js` + `aud-icp.js` + `aud-campaign.js` | `modules/audiences/`                                                                 |
| `meeseeks.js`                                     | `modules/composer/`                                                                  |
| `tcf.js`                                          | `modules/tcf/`                                                                       |
| `merge.js`                                        | `modules/merge/`                                                                     |
| `lemlist.js`                                      | `views/LemlistView.vue`, `stores/lemlist.ts`, `lib/lemlistApi.ts`                    |
| `auth.js`                                         | `lib/supabaseApp.ts` (Supabase JS client, `detectSessionInUrl: true`)                |
| `config.js`                                       | `config/tagRules.ts`, `config/personas.ts`                                           |
| `utils.js`                                        | `lib/hubDisplay.ts`, `lib/relTime.ts`, `lib/classifyNote.ts`                         |
| `gnews.js`                                        | `lib/hubRest.ts` (news fetch via Supabase edge)                                      |

Not ported (no current equivalent needed):

- `gmail.js` — Gmail OAuth integration
- `vibe.js` — Explorium MCP finder
- `tutorial.js` / `demo.js` — onboarding / demo mode

---

## Supabase OAuth redirect

Supabase is configured with `https://lukaszkapusniak-sudo.github.io/onaudience-hub/hub/` as the allowed redirect URL. **Do not change this.** The `dist/hub/index.html` shim (emitted by `frontend/scripts/postbuild.mjs`) bridges the registered URL to the Vue app root, forwarding both `location.search` (PKCE `?code=...`) and `location.hash` (implicit `#access_token=...`).

---

## Phases (historical reference)

All phases are complete:

- **Phase 0** — Vite + Vue + Router + Pinia + TS foundation
- **Phase 1** — Data layer parity (`hubRest.ts` full `db.js` + `api.js` coverage)
- **Phase 2** — App shell (`HubShellLayout.vue`, no iframe)
- **Phase 3** — Companies list (`HubDataView.vue`)
- **Phase 4** — Company detail (`modules/companies/`)
- **Phase 5** — Contacts + drawer (`modules/contacts/`, `ContactDrawer.vue`)
- **Phase 6** — Audiences (`modules/audiences/`)
- **Phase 7** — Composer, TCF, Merge (`modules/composer/`, `modules/tcf/`, `modules/merge/`)
- **Phase 8** — Cutover: iframe removed, `www/hub/` deleted, Playwright tests on Vue routes

---

## Related

- [`components.md`](components.md) — full Vue file inventory
- [`CLAUDE.md`](../CLAUDE.md) — repo conventions
