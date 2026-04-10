# Component and module inventory

All UI is **Vue 3 SFCs** in `frontend/src/`. The legacy `www/hub/` static app has been removed; historical module descriptions remain in `docs/` for reference but the implementation lives here.

---

## App shell

| File                                                                       | Role                                                 | Route |
| -------------------------------------------------------------------------- | ---------------------------------------------------- | ----- |
| [`App.vue`](../frontend/src/App.vue)                                       | Root; only `<RouterView />`.                         | —     |
| [`layouts/HubShellLayout.vue`](../frontend/src/layouts/HubShellLayout.vue) | Nav, stats bar, rail, auth, theme; wraps all routes. | `/`   |

---

## Views (`frontend/src/views/`)

| File                                                                                 | Role                                          | Route                       |
| ------------------------------------------------------------------------------------ | --------------------------------------------- | --------------------------- |
| [`views/HubDataView.vue`](../frontend/src/views/HubDataView.vue)                     | Companies list — search, filters, tags, sort. | `/data` (also `/companies`) |
| [`views/LemlistView.vue`](../frontend/src/views/LemlistView.vue)                     | Lemlist campaigns / leads / sync.             | `/lemlist`                  |
| [`views/HomeView.vue`](../frontend/src/views/HomeView.vue)                           | About / marketing copy.                       | `/about`                    |
| [`views/ContactDrawerDemoView.vue`](../frontend/src/views/ContactDrawerDemoView.vue) | Dev sandbox for `ContactDrawer`.              | `/demo/contact-drawer`      |

---

## Shared components (`frontend/src/components/`)

| File                                                                           | Role                                                             |
| ------------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| [`components/ContactDrawer.vue`](../frontend/src/components/ContactDrawer.vue) | Contact detail drawer; used by contacts list and company detail. |

---

## Feature modules (`frontend/src/modules/`)

Each module owns `index.ts` (Vue plugin), optional `store.ts`, `routes.ts`, `views/`, and `components/`.

### `modules/companies/` — company detail

Route: `/companies/:slug`

| File                                   | Role                                                                                      |
| -------------------------------------- | ----------------------------------------------------------------------------------------- |
| `views/CompanyDetailView.vue`          | Full detail page; loads store on mount.                                                   |
| `components/CompanyHeader.vue`         | Avatar, name, type badge, ICP stars, CTA bar.                                             |
| `components/CompanyFactsTable.vue`     | Category, region, HQ, website, description.                                               |
| `components/CompanyContactsBlock.vue`  | Contacts list + Find DMs trigger.                                                         |
| `components/CompanyRelationsBlock.vue` | Relations list + D3 force graph.                                                          |
| `components/CompanyIntelBlock.vue`     | Google News + cached press links.                                                         |
| `components/CompanyAngleBlock.vue`     | AI outreach angle card with persona picker.                                               |
| `store.ts`                             | `useCompanyDetailStore` — currentCompany, contacts, relations, news, intel, load actions. |

### `modules/contacts/` — contacts list

Route: `/contacts`

| File                         | Role                                           |
| ---------------------------- | ---------------------------------------------- |
| `views/ContactsListView.vue` | Contacts with search; click → `ContactDrawer`. |

### `modules/audiences/` — audience CRUD + AI build

Routes: `/audiences`, `/audiences/:id`

| File                                | Role                                                                         |
| ----------------------------------- | ---------------------------------------------------------------------------- |
| `views/AudiencesView.vue`           | Audience list + search + New button.                                         |
| `views/AudienceDetailView.vue`      | Audience header, company rows, gap cards, export/push.                       |
| `components/AudienceScoutModal.vue` | Form, AI build, company selection, B2B lookup.                               |
| `store.ts`                          | `useAudiencesStore` — audiences[], activeAudience, load/save/delete/aiBuild. |

### `modules/composer/` — email composer drawer (global, no route)

Open via `useComposerStore().open(payload)` from anywhere.

| File                            | Role                                                                                       |
| ------------------------------- | ------------------------------------------------------------------------------------------ |
| `components/ComposerDrawer.vue` | Two-panel: company/contact picker + persona grid on left; generated email + copy on right. |
| `components/PersonaGrid.vue`    | 10 persona tiles.                                                                          |
| `store.ts`                      | `useComposerStore` — isOpen, payload, generatedEmail, open/close/generate/copy.            |

### `modules/tcf/` — TCF / GVL analyser

Route: `/tcf`

| File                | Role                                                            |
| ------------------- | --------------------------------------------------------------- |
| `views/TcfView.vue` | Left: vendor list; right: comparison panel.                     |
| `store.ts`          | `useTcfStore` — gvlData, selected vendors (max 4), risk scores. |

### `modules/merge/` — company merge management

Route: `/merge`

| File                  | Role                                                                               |
| --------------------- | ---------------------------------------------------------------------------------- |
| `views/MergeView.vue` | Pending suggestions list + merge / dismiss actions.                                |
| `store.ts`            | `useMergeStore` — suggestions[], loadSuggestions, executeMerge, dismissSuggestion. |

---

## Stores (`frontend/src/stores/`)

| File                                                     | Role                                                                      |
| -------------------------------------------------------- | ------------------------------------------------------------------------- |
| [`stores/hub.ts`](../frontend/src/stores/hub.ts)         | Shared: companies[], contacts[], allRelations[], auth, stats, pagination. |
| [`stores/lemlist.ts`](../frontend/src/stores/lemlist.ts) | Lemlist campaigns + leads.                                                |

---

## Libraries (`frontend/src/lib/`)

| File                                                                   | Role                                                                                   |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| [`lib/hubRest.ts`](../frontend/src/lib/hubRest.ts)                     | All Supabase REST accessors (companies, contacts, audiences, intel, merge, relations). |
| [`lib/anthropicHub.ts`](../frontend/src/lib/anthropicHub.ts)           | `anthropicFetch`, `anthropicMcpFetch`, `researchFetch`.                                |
| [`lib/companyList.ts`](../frontend/src/lib/companyList.ts)             | `filterAndSortCompanies()`.                                                            |
| [`lib/hubDisplay.ts`](../frontend/src/lib/hubDisplay.ts)               | `getInitials()`, `getAvatarColors()`.                                                  |
| [`lib/hubGeo.ts`](../frontend/src/lib/hubGeo.ts)                       | `geocodeCity()`, `saveCompanyGeocode()`.                                               |
| [`lib/intelligenceMerge.ts`](../frontend/src/lib/intelligenceMerge.ts) | `mergePressLinksIntelligence()`.                                                       |
| [`lib/lemlistApi.ts`](../frontend/src/lib/lemlistApi.ts)               | Lemlist REST wrappers.                                                                 |
| [`lib/classifyNote.ts`](../frontend/src/lib/classifyNote.ts)           | Company type from note text.                                                           |
| [`lib/relTime.ts`](../frontend/src/lib/relTime.ts)                     | Relative time formatting.                                                              |
| [`lib/supabaseApp.ts`](../frontend/src/lib/supabaseApp.ts)             | `getSupabaseApp()` singleton, `detectSessionInUrl: true`.                              |

---

## Types (`frontend/src/types/`)

`company.ts`, `contact.ts`, `relation.ts`, `lemlist.ts`, `audience.ts`, `news.ts`, `composer.ts`, `tcf.ts`, `merge.ts`

---

## Config (`frontend/src/config/`)

| File                                                                     | Role                                               |
| ------------------------------------------------------------------------ | -------------------------------------------------- |
| [`config/tagRules.ts`](../frontend/src/config/tagRules.ts)               | `TAG_RULES` — tag display logic.                   |
| [`config/personas.ts`](../frontend/src/config/personas.ts)               | Persona definitions for email composer.            |
| [`config/migrationPhases.ts`](../frontend/src/config/migrationPhases.ts) | Phase data (used by now-removed `/migrate` route). |

---

## Summary

- **Vue `.vue` files:** App.vue + HubShellLayout + 4 views + ContactDrawer + 7 company components + ContactsListView + 3 audiences components + 2 composer components + TcfView + MergeView = **~22 SFCs**
- **Legacy `www/hub/`:** removed — see `docs/VUE_MIGRATION.md` for historical module map
- **No** React/JSX/Svelte components in the repo

## Topic guides

- [loader.md](loader.md) — loading and spinners
- [company.md](company.md) — company panel
- [contact.md](contact.md) — contacts & drawer
- [VUE_MIGRATION.md](VUE_MIGRATION.md) — migration history and legacy module map
