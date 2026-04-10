# Component and module inventory

This repo does **not** use a large shared `components/` tree. **Vue single-file components** exist only in `frontend/src/`. The **Sales Intelligence Hub** product UI is the **legacy static app** under `www/hub/`, built from **ES modules** (not `.vue` files). Those modules are listed here as the functional “components” of the hub.

**Elaboration:** each row links to a dedicated `docs/<name>.md` page (except `app.js` → [`hub-app.md`](hub-app.md) to avoid clashing with [`App.md`](App.md) on case-insensitive filesystems).

---

## Vue 3 (`frontend/src/`)

| File                                                       | Role                                    | Elaboration                  |
| ---------------------------------------------------------- | --------------------------------------- | ---------------------------- |
| [`App.vue`](../frontend/src/App.vue)                       | Root shell; only `<RouterView />`.      | [`App.md`](App.md)           |
| [`views/HomeView.vue`](../frontend/src/views/HomeView.vue) | Landing page; link to `hub/index.html`. | [`HomeView.md`](HomeView.md) |

**No** `frontend/src/components/` directory. Other frontend files: [`main.ts`](../frontend/src/main.ts), [`router/index.ts`](../frontend/src/router/index.ts), [`style.css`](../frontend/src/style.css).

---

## Legacy hub (`www/hub/*.js`)

Boot entry: [`index.html`](../www/hub/index.html) → [`app.js`](../www/hub/app.js). [`hub.js`](../www/hub/hub.js) is the largest module and re-exports from [`list.js`](../www/hub/list.js), [`drawer.js`](../www/hub/drawer.js), [`lemlist.js`](../www/hub/lemlist.js).

| Module                                                  | Responsibility                             | Elaboration                                  |
| ------------------------------------------------------- | ------------------------------------------ | -------------------------------------------- |
| [`app.js`](../www/hub/app.js)                           | Boot, theme, `window` exports, `bootHub`.  | [`hub-app.md`](hub-app.md)                   |
| [`hub.js`](../www/hub/hub.js)                           | Company detail, AI bar, orchestration.     | [`hub.md`](hub.md)                           |
| [`list.js`](../www/hub/list.js)                         | Company list, filters, tags, sort.         | [`list.md`](list.md)                         |
| [`drawer.js`](../www/hub/drawer.js)                     | Contact drawer.                            | [`drawer.md`](drawer.md)                     |
| [`state.js`](../www/hub/state.js)                       | Shared `S` store.                          | [`state.md`](state.md)                       |
| [`api.js`](../www/hub/api.js)                           | Load/save, Anthropic, Lemlist, stats.      | [`api.md`](api.md)                           |
| [`db.js`](../www/hub/db.js)                             | Supabase REST accessors.                   | [`db.md`](db.md)                             |
| [`auth.js`](../www/hub/auth.js)                         | Supabase Auth, login UI, audit.            | [`auth.md`](auth.md)                         |
| [`gmail.js`](../www/hub/gmail.js)                       | Gmail OAuth, scan, CRM sync.               | [`gmail.md`](gmail.md)                       |
| [`meeseeks.js`](../www/hub/meeseeks.js)                 | Email composer.                            | [`meeseeks.md`](meeseeks.md)                 |
| [`lemlist.js`](../www/hub/lemlist.js)                   | Lemlist integration.                       | [`lemlist.md`](lemlist.md)                   |
| [`audiences.js`](../www/hub/audiences.js)               | Audiences CRUD + UI.                       | [`audiences.md`](audiences.md)               |
| [`aud-icp.js`](../www/hub/aud-icp.js)                   | ICP finder wizard.                         | [`aud-icp.md`](aud-icp.md)                   |
| [`aud-campaign.js`](../www/hub/aud-campaign.js)         | Campaign hooks / launch.                   | [`aud-campaign.md`](aud-campaign.md)         |
| [`merge.js`](../www/hub/merge.js)                       | Merge suggestions + RPC.                   | [`merge.md`](merge.md)                       |
| [`tcf.js`](../www/hub/tcf.js)                           | TCF / GVL analyser.                        | [`tcf.md`](tcf.md)                           |
| [`vibe.js`](../www/hub/vibe.js)                         | Vibe / Explorium MCP.                      | [`vibe.md`](vibe.md)                         |
| [`demo.js`](../www/hub/demo.js)                         | Guest demo mode.                           | [`demo.md`](demo.md)                         |
| [`tutorial.js`](../www/hub/tutorial.js)                 | Onboarding tutorial.                       | [`tutorial.md`](tutorial.md)                 |
| [`tutorial-i18n.js`](../www/hub/tutorial-i18n.js)       | Tutorial strings.                          | [`tutorial-i18n.md`](tutorial-i18n.md)       |
| [`utils.js`](../www/hub/utils.js)                       | Pure helpers, `authHdr`.                   | [`utils.md`](utils.md)                       |
| [`config.js`](../www/hub/config.js)                     | Constants, TAG_RULES, personas, TCF maps.  | [`config.md`](config.md)                     |
| [`config.generated.js`](../www/hub/config.generated.js) | Generated env (`generate-hub-config.mjs`). | [`config.generated.md`](config.generated.md) |

---

## Non-module assets in `www/hub/`

| Asset                                                                      | Note               | Elaboration                  |
| -------------------------------------------------------------------------- | ------------------ | ---------------------------- |
| [`style.css`](../www/hub/style.css)                                        | Global hub styles. | [`style.md`](style.md)       |
| [`taxonomy.json`](../www/hub/taxonomy.json)                                | Tag taxonomy data. | [`taxonomy.md`](taxonomy.md) |
| [`test.html`](../www/hub/test.html), [`tests.html`](../www/hub/tests.html) | Ad-hoc test pages. | —                            |

---

## Summary counts

- **Vue `.vue` files:** **2** (`App.vue`, `HomeView.vue`).
- **Hub ES modules (`www/hub/*.js`):** **23** hand-maintained + **`config.generated.js`**.
- **No** React/JSX/Svelte components in the repo.

## Topic guides (cross-cutting)

- [loader.md](loader.md) — loading and spinners
- [gmail.md](gmail.md) — Gmail (also listed above)
- [company.md](company.md) — company panel
- [contact.md](contact.md) — contacts & drawer
