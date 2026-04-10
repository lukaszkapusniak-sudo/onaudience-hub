# Component and module inventory

This repo does **not** use a large shared `components/` tree. **Vue single-file components** exist only in `frontend/src/`. The **Sales Intelligence Hub** product UI is the **legacy static app** under `www/hub/`, built from **ES modules** (not `.vue` files). Those modules are listed here as the functional “components” of the hub.

**Elaboration:** each row links to a dedicated `docs/<name>.md` page (except `app.js` → [`hub-app.md`](hub-app.md) to avoid clashing with [`App.md`](App.md) on case-insensitive filesystems).

---

## Vue 3 (`frontend/src/`)

| File                                                                                 | Role                                                                          | Elaboration                              |
| ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- | ---------------------------------------- |
| [`App.vue`](../frontend/src/App.vue)                                                 | Root shell; only `<RouterView />`.                                            | [`App.md`](App.md)                       |
| [`layouts/HubShellLayout.vue`](../frontend/src/layouts/HubShellLayout.vue)           | **Phase 2** — nav, stats, theme, auth, rail; wraps iframe + Vue routes.       | [`HubShellLayout.md`](HubShellLayout.md) |
| [`views/HubAppView.vue`](../frontend/src/views/HubAppView.vue)                       | **Production `/`** — same-origin iframe → `hub/index.html` (child of shell).  | [`HubAppView.md`](HubAppView.md)         |
| [`views/HubDataView.vue`](../frontend/src/views/HubDataView.vue)                     | **`/data`** — Pinia + REST first page of companies (native Vue).              | [`HubDataView.md`](HubDataView.md)       |
| [`views/LemlistView.vue`](../frontend/src/views/LemlistView.vue)                     | **`/lemlist`** — Lemlist campaigns/leads/sync (Vue port of `lemlist.js`).     | [`LemlistView.md`](LemlistView.md)       |
| [`views/MigrationHomeView.vue`](../frontend/src/views/MigrationHomeView.vue)         | **`/migrate`** — roadmap UI (mirrors [`VUE_MIGRATION.md`](VUE_MIGRATION.md)). | [`VUE_MIGRATION.md`](VUE_MIGRATION.md)   |
| [`views/HomeView.vue`](../frontend/src/views/HomeView.vue)                           | **`/about`** migration / marketing copy.                                      | [`HomeView.md`](HomeView.md)             |
| [`views/ContactDrawerDemoView.vue`](../frontend/src/views/ContactDrawerDemoView.vue) | Dev route for the ported contact drawer (`/demo/contact-drawer`).             | [`ContactDrawer.md`](ContactDrawer.md)   |
| [`components/ContactDrawer.vue`](../frontend/src/components/ContactDrawer.vue)       | Hub **contact drawer** UI (TypeScript); first legacy port from `drawer.js`.   | [`ContactDrawer.md`](ContactDrawer.md)   |

[`config/tagRules.ts`](../frontend/src/config/tagRules.ts), [`lib/companyList.ts`](../frontend/src/lib/companyList.ts),

Other frontend: [`main.ts`](../frontend/src/main.ts), [`router/index.ts`](../frontend/src/router/index.ts), [`types/contact.ts`](../frontend/src/types/contact.ts), [`types/company.ts`](../frontend/src/types/company.ts), [`types/relation.ts`](../frontend/src/types/relation.ts), [`types/lemlist.ts`](../frontend/src/types/lemlist.ts), [`stores/hub.ts`](../frontend/src/stores/hub.ts), [`stores/lemlist.ts`](../frontend/src/stores/lemlist.ts), [`lib/hubDisplay.ts`](../frontend/src/lib/hubDisplay.ts), [`lib/hubRest.ts`](../frontend/src/lib/hubRest.ts) (full `db.js` parity incl. Phase 1.6), [`lib/anthropicHub.ts`](../frontend/src/lib/anthropicHub.ts), [`lib/hubGeo.ts`](../frontend/src/lib/hubGeo.ts), [`lib/intelligenceMerge.ts`](../frontend/src/lib/intelligenceMerge.ts), [`lib/lemlistApi.ts`](../frontend/src/lib/lemlistApi.ts), [`lib/classifyNote.ts`](../frontend/src/lib/classifyNote.ts), [`lib/relTime.ts`](../frontend/src/lib/relTime.ts), [`style.css`](../frontend/src/style.css).

---

## Legacy hub (`www/hub/*.js`)

Boot entry: [`index.html`](../www/hub/index.html) → [`app.js`](../www/hub/app.js). [`hub.js`](../www/hub/hub.js) is the largest module and re-exports from [`list.js`](../www/hub/list.js), [`drawer.js`](../www/hub/drawer.js), [`lemlist.js`](../www/hub/lemlist.js).

| Module                                                  | Responsibility                               | Elaboration                                  |
| ------------------------------------------------------- | -------------------------------------------- | -------------------------------------------- |
| [`app.js`](../www/hub/app.js)                           | Boot, theme, `window` exports, `bootHub`.    | [`hub-app.md`](hub-app.md)                   |
| [`hub.js`](../www/hub/hub.js)                           | Company detail, AI bar, orchestration.       | [`hub.md`](hub.md)                           |
| [`list.js`](../www/hub/list.js)                         | Company list, filters, tags, sort.           | [`list.md`](list.md)                         |
| [`drawer.js`](../www/hub/drawer.js)                     | Contact drawer.                              | [`drawer.md`](drawer.md)                     |
| [`state.js`](../www/hub/state.js)                       | Shared `S` store.                            | [`state.md`](state.md)                       |
| [`api.js`](../www/hub/api.js)                           | Load/save, Anthropic, Lemlist, stats.        | [`api.md`](api.md)                           |
| [`gnews.js`](../www/hub/gnews.js)                       | Google News RSS (CORS proxy, lazy + worker). | [`gnews.md`](gnews.md)                       |
| [`db.js`](../www/hub/db.js)                             | Supabase REST accessors.                     | [`db.md`](db.md)                             |
| [`auth.js`](../www/hub/auth.js)                         | Supabase Auth, login UI, audit.              | [`auth.md`](auth.md)                         |
| [`gmail.js`](../www/hub/gmail.js)                       | Gmail OAuth, scan, CRM sync.                 | [`gmail.md`](gmail.md)                       |
| [`meeseeks.js`](../www/hub/meeseeks.js)                 | Email composer.                              | [`meeseeks.md`](meeseeks.md)                 |
| [`lemlist.js`](../www/hub/lemlist.js)                   | Lemlist integration.                         | [`lemlist.md`](lemlist.md)                   |
| [`audiences.js`](../www/hub/audiences.js)               | Audiences CRUD + UI.                         | [`audiences.md`](audiences.md)               |
| [`aud-icp.js`](../www/hub/aud-icp.js)                   | ICP finder wizard.                           | [`aud-icp.md`](aud-icp.md)                   |
| [`aud-campaign.js`](../www/hub/aud-campaign.js)         | Campaign hooks / launch.                     | [`aud-campaign.md`](aud-campaign.md)         |
| [`merge.js`](../www/hub/merge.js)                       | Merge suggestions + RPC.                     | [`merge.md`](merge.md)                       |
| [`tcf.js`](../www/hub/tcf.js)                           | TCF / GVL analyser.                          | [`tcf.md`](tcf.md)                           |
| [`vibe.js`](../www/hub/vibe.js)                         | Vibe / Explorium MCP.                        | [`vibe.md`](vibe.md)                         |
| [`demo.js`](../www/hub/demo.js)                         | Guest demo mode.                             | [`demo.md`](demo.md)                         |
| [`tutorial.js`](../www/hub/tutorial.js)                 | Onboarding tutorial.                         | [`tutorial.md`](tutorial.md)                 |
| [`tutorial-i18n.js`](../www/hub/tutorial-i18n.js)       | Tutorial strings.                            | [`tutorial-i18n.md`](tutorial-i18n.md)       |
| [`utils.js`](../www/hub/utils.js)                       | Pure helpers, `authHdr`.                     | [`utils.md`](utils.md)                       |
| [`config.js`](../www/hub/config.js)                     | Constants, TAG_RULES, personas, TCF maps.    | [`config.md`](config.md)                     |
| [`config.generated.js`](../www/hub/config.generated.js) | Generated env (`generate-hub-config.mjs`).   | [`config.generated.md`](config.generated.md) |

---

## Non-module assets in `www/hub/`

| Asset                                                                      | Note               | Elaboration                  |
| -------------------------------------------------------------------------- | ------------------ | ---------------------------- |
| [`style.css`](../www/hub/style.css)                                        | Global hub styles. | [`style.md`](style.md)       |
| [`taxonomy.json`](../www/hub/taxonomy.json)                                | Tag taxonomy data. | [`taxonomy.md`](taxonomy.md) |
| [`test.html`](../www/hub/test.html), [`tests.html`](../www/hub/tests.html) | Ad-hoc test pages. | —                            |

---

## Summary counts

- **Vue `.vue` files:** **9** (`App.vue`, `layouts/HubShellLayout.vue`, `HubAppView.vue`, `HubDataView.vue`, `LemlistView.vue`, `MigrationHomeView.vue`, `HomeView.vue`, `ContactDrawer.vue`, `ContactDrawerDemoView.vue`).
- **Hub ES modules (`www/hub/*.js`):** **26** hand-maintained + **`config.generated.js`**.
- **No** React/JSX/Svelte components in the repo.

## Topic guides (cross-cutting)

- [loader.md](loader.md) — loading and spinners
- [gmail.md](gmail.md) — Gmail (also listed above)
- [company.md](company.md) — company panel
- [contact.md](contact.md) — contacts & drawer
