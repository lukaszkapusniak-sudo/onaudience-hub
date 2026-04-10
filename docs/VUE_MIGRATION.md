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

| Step | Task                                                                                                                                                                                                                                             |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1.1  | Companies: background pages after first 200 (mirror `_loadRemainingPages`) — **done** in [`hubRest.ts`](../frontend/src/lib/hubRest.ts) (`fetchCompaniesRange`) + [`stores/hub.ts`](../frontend/src/stores/hub.ts) (`loadRemainingCompanyPages`) |
| 1.2  | Contacts: paginate beyond 5k if needed                                                                                                                                                                                                           |
| 1.3  | `company_relations` + merge into store                                                                                                                                                                                                           |
| 1.4  | Optional: `enrich_cache` reads for ported panels                                                                                                                                                                                                 |

---

## Phase 2 — App shell (replace iframe)

**Goal:** One Vue layout with nav / stats / tabs like [`index.html`](../www/hub/index.html) + [`app.js`](../www/hub/app.js) chrome.

| Step | Task                                                                        |
| ---- | --------------------------------------------------------------------------- |
| 2.1  | `HubShellLayout.vue` — nav, stats bar, left tabs (Companies / Contacts / …) |
| 2.2  | Child `<RouterView />` for tab content                                      |
| 2.3  | Theme toggle (`data-theme`) — match hub CSS variables                       |
| 2.4  | Wire auth badge / sign-out using existing Supabase client                   |

---

## Phase 3 — Companies list

**Goal:** Replace [`list.js`](../www/hub/list.js) behaviour in Vue.

| Step | Task                                                  |
| ---- | ----------------------------------------------------- |
| 3.1  | Search, filter chips, tag panel + OR/AND, sort        |
| 3.2  | Keyboard nav (j/k, Enter) if desired                  |
| 3.3  | Merge `/data` into main companies route or keep alias |

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
