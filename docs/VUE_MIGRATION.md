# Vue + TypeScript migration — step by step

End state: **no iframe** — the SPA at `/` is the only shell; `www/hub/` can be deleted or reduced to shared assets only.

Use **`/migrate`** in the app for a live checklist (same phases as below). Legacy modules live in [`www/hub/`](../www/hub/); inventory in [`components.md`](components.md).

---

## Phase 0 — Done (foundation)

| Item                             | Notes                                                                                   |
| -------------------------------- | --------------------------------------------------------------------------------------- |
| Vite + Vue + Router + Pinia + TS | `frontend/`                                                                             |
| Supabase session bridge          | `frontend/src/lib/supabaseApp.ts`, `oauthAppBaseUrl` in [`auth.js`](../www/hub/auth.js) |
| Legacy hub in iframe (temporary) | [`HubAppView.vue`](../frontend/src/views/HubAppView.vue) route `/`                      |
| Companies first page             | [`HubDataView.vue`](../frontend/src/views/HubDataView.vue) `/data`                      |
| Contacts in Pinia                | [`stores/hub.ts`](../frontend/src/stores/hub.ts)                                        |
| Lemlist                          | [`LemlistView.vue`](../frontend/src/views/LemlistView.vue) `/lemlist`                   |
| Contact drawer (demo)            | `/demo/contact-drawer`                                                                  |

---

## Phase 1 — Data layer parity

**Goal:** Pinia + REST match [`db.js`](../www/hub/db.js) + [`api.js`](../www/hub/api.js) load paths (pagination, relations, enrich cache where needed).

| Step | Task                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.1  | Companies: background pages after first 200 (mirror `_loadRemainingPages`) — **done** in [`hubRest.ts`](../frontend/src/lib/hubRest.ts) (`fetchCompaniesRange`) + [`stores/hub.ts`](../frontend/src/stores/hub.ts) (`loadRemainingCompanyPages`)                                                                                                                                                                                       |
| 1.2  | Contacts: paginate beyond first chunk — **done** in [`hubRest.ts`](../frontend/src/lib/hubRest.ts) (`fetchContactsFirstPage`, `fetchContactsRange`) + [`stores/hub.ts`](../frontend/src/stores/hub.ts) (`loadRemainingContactPages`)                                                                                                                                                                                                   |
| 1.3  | `company_relations` + merge into store — **done** in [`hubRest.ts`](../frontend/src/lib/hubRest.ts) (`fetchCompanyRelations`) + [`stores/hub.ts`](../frontend/src/stores/hub.ts) (`companyRelations`, `loadCompanyRelations`, `bootstrapLegacyHubData`)                                                                                                                                                                                |
| 1.4  | Optional: `enrich_cache` — **done** in [`hubRest.ts`](../frontend/src/lib/hubRest.ts) (`enrichCacheGet`, `enrichCacheSet`, `enrichCacheInvalidate`, `withEnrichCache`; TTL constants match [`api.js`](../www/hub/api.js))                                                                                                                                                                                                              |
| 1.5  | Remaining [`db.js`](../www/hub/db.js) namespaces for panels — **done** in [`hubRest.ts`](../frontend/src/lib/hubRest.ts): `fetchIntelligenceForCompany` / `upsertIntelligence`, `fetchMergeSuggestionsPending` / `fetchMergeSuggestionsPendingCount` / `patchMergeSuggestion`, `fetchCompanyRelationsForSlug`, `fetchUserProfile`                                                                                                      |
| 1.6  | Rest of [`db.js`](../www/hub/db.js) **CRUD** not covered in 1.1–1.5 — **done** in [`hubRest.ts`](../frontend/src/lib/hubRest.ts): companies (`fetchCompanyById`, `searchCompanies`, `patchCompany`, `patchCompanyByName`, `upsertCompany`), contacts (`fetchContactsByCompany`, `fetchContactsByCompanyName`, `fetchContactsCompanyIdsOnly`), audiences (`upsertAudience`, `patchAudience`, `deleteAudience`), `upsertCompanyRelation` |
| 1.7  | [`api.js`](../www/hub/api.js) **non-REST** orchestration (AI, geocode, intel merge) — **done**: [`anthropicHub.ts`](../frontend/src/lib/anthropicHub.ts) (`getAnthropicApiKey` / `anthropicFetch` / `anthropicMcpFetch` / `researchFetch`), [`hubGeo.ts`](../frontend/src/lib/hubGeo.ts) (`geocodeCity` / `saveCompanyGeocode`), [`intelligenceMerge.ts`](../frontend/src/lib/intelligenceMerge.ts) (`mergePressLinksIntelligence`)    |

---

## Phase 2 — App shell (replace iframe)

**Goal:** One Vue layout with nav / stats / tabs like [`index.html`](../www/hub/index.html) + [`app.js`](../www/hub/app.js) chrome.

| Step | Task                                                                                                                           |
| ---- | ------------------------------------------------------------------------------------------------------------------------------ |
| 2.1  | `HubShellLayout.vue` — nav, stats bar, left rail — **done** [`HubShellLayout.vue`](../frontend/src/layouts/HubShellLayout.vue) |
| 2.2  | Child `<RouterView />` — **done** (nested routes in [`router/index.ts`](../frontend/src/router/index.ts))                      |
| 2.3  | Theme toggle (`data-theme`, `oaTheme`) — **done** in layout                                                                    |
| 2.4  | Auth email + sign-out — **done** (`getSupabaseApp`, `onAuthStateChange`)                                                       |

---

## Phase 3 — Companies list

**Goal:** Replace [`list.js`](../www/hub/list.js) behaviour in Vue.

| Step | Task                                                                                                                                                                                                                                 |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 3.1  | Search, filter chips, tag panel + OR/AND, sort — **done** in [`HubDataView.vue`](../frontend/src/views/HubDataView.vue), [`companyList.ts`](../frontend/src/lib/companyList.ts), [`tagRules.ts`](../frontend/src/config/tagRules.ts) |
| 3.2  | **`/`** focuses search (like legacy); j/k/Enter deferred                                                                                                                                                                             |
| 3.3  | Alias **`/companies` → `/data`** — **done** in [`router/index.ts`](../frontend/src/router/index.ts)                                                                                                                                  |

---

## Phase 4 — Company detail

**Goal:** Replace centre panel from [`hub.js`](../www/hub/hub.js) (company card, intel, actions).

| Step | Task                                                               |
| ---- | ------------------------------------------------------------------ |
| 4.1  | Route ` /company/:slug` (or query) + load company + contacts       |
| 4.2  | Intelligence blocks (press, Gmail hook placeholders until Phase 7) |
| 4.3  | Actions: save, tags, status, Lemlist hooks calling existing APIs   |

---

## Phase 5 — Contacts + drawer

**Goal:** [`drawer.js`](../www/hub/drawer.js) production path — integrate [`ContactDrawer.vue`](../frontend/src/components/ContactDrawer.vue) globally.

| Step | Task                                                            |
| ---- | --------------------------------------------------------------- |
| 5.1  | Open drawer from company + list rows                            |
| 5.2  | Wire `draft-email` / Gmail / research to composables (stubs OK) |

---

## Phase 6 — Audiences

**Goal:** Port [`audiences.js`](../www/hub/audiences.js), [`aud-campaign.js`](../www/hub/aud-campaign.js), [`aud-icp.js`](../www/hub/aud-icp.js) in order (list → detail → ICP wizard).

---

## Phase 7 — Integrations (order flexible)

| Module           | Legacy file                                                              | Notes                                 |
| ---------------- | ------------------------------------------------------------------------ | ------------------------------------- |
| Lemlist (in-tab) | [`lemlist.js`](../www/hub/lemlist.js)                                    | `/lemlist` exists; embed in shell tab |
| Gmail            | [`gmail.js`](../www/hub/gmail.js)                                        | OAuth + scan — high complexity        |
| Meeseeks         | [`meeseeks.js`](../www/hub/meeseeks.js)                                  | Composer                              |
| Merge            | [`merge.js`](../www/hub/merge.js)                                        | Suggestions modal                     |
| Vibe             | [`vibe.js`](../www/hub/vibe.js)                                          | Finder / enrich                       |
| TCF              | [`tcf.js`](../www/hub/tcf.js)                                            | GVL                                   |
| Tutorial / Demo  | [`tutorial.js`](../www/hub/tutorial.js), [`demo.js`](../www/hub/demo.js) | Last                                  |

---

## Phase 8 — Cutover

| Step | Task                                                                                           |
| ---- | ---------------------------------------------------------------------------------------------- |
| 8.1  | E2E tests on Vue routes only                                                                   |
| 8.2  | Change `/` from iframe to `HubShellLayout` (or redirect `/hub/` → new routes)                  |
| 8.3  | Remove `postbuild` copy of `www/hub` **or** keep static `hub/` for bookmarks during transition |
| 8.4  | Delete unused `www/hub/*.js` after parity sign-off                                             |

---

## Module map (legacy → Vue)

| Legacy             | Role                 | Target                                             |
| ------------------ | -------------------- | -------------------------------------------------- |
| `state.js`         | `S` store            | `stores/hub.ts` (+ feature stores)                 |
| `db.js` / `api.js` | REST                 | `lib/hubRest.ts`, `lib/lemlistApi.ts`, composables |
| `app.js`           | Boot, theme, exports | `main.ts`, layout, router                          |
| `hub.js`           | Company UI, AI bar   | views + composables (split)                        |
| `list.js`          | List + filters       | companies list view                                |
| `auth.js`          | Login                | Supabase in Vue (already partial)                  |
| `gnews/*`          | News fetch           | already split in hub; optional composable          |

---

## Related

- [`components.md`](components.md) — Vue + legacy inventory
- [`hub-app.md`](hub-app.md) — legacy boot
- [`CLAUDE.md`](../CLAUDE.md) — repo conventions
