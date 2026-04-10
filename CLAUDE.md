# CLAUDE.md

OnAudience hub: **Vue 3 + Vite + TypeScript** SPA in `frontend/` — `HubShellLayout` wraps the app (default `/` → `/data`); feature areas live under `frontend/src/modules/`. The legacy ES-module hub remains in `www/hub/` and is copied to `dist/hub/` so `/hub/` URLs keep working during migration. Playwright tests; GitHub Pages deploys `frontend/dist`.

## Project map

- **npm workspaces:** `frontend/` (Vue app), `tooling/` (repo-root ESLint / Prettier / `tsc` for tests — Turborepo)
- `frontend/` — Vite (`vite.config.ts`); routes in `frontend/src/router/`; shared UI in `frontend/src/views/`, `frontend/src/components/`, `frontend/src/layouts/`; product slices in `frontend/src/modules/` (route fragments + views + local stores)
- `www/hub/` — legacy hub (being migrated); `scripts/generate-hub-config.mjs` writes `config.generated.js` from env; after each build, `frontend/scripts/postbuild.mjs` copies `www/hub` → `dist/hub` and `scripts/stamp-hub-asset-version.mjs` rewrites cache-bust tokens in **`dist/hub` only**
- `www/index.html` — old root redirect (not deployed alone; Vue is the site root on Pages)
- `tests/` — Playwright; `tests/fixtures/` — auth (`auth.setup.ts`; generated `.auth.json` gitignored)
- `tests/env.ts` — canonical env keys and derived URLs for tests
- `supabase/` — edge code (Deno); not typechecked by root `tsc`
- `.github/workflows/` — `e2e.yml`, `deploy.yml`
- `docs/` — module and product notes; **`docs/components.md`** is the inventory index; migration plan: **`docs/VUE_MIGRATION.md`**

## Tech

Vue 3, Vue Router, Vite 8; Playwright + TypeScript. **Turborepo** (`turbo run …`). `@onaudience/tooling` drives ESLint / Prettier / root `tsc` from the repo root via `tooling/run-root.mjs`. Editor: `.vscode/settings.json`, `extensions.json`.

<important if="you need to run commands to build, test, lint, or generate code">

From the repo root (Node 20 as in CI):

| Command                                                       | What it does                                                                                                                  |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `npm ci`                                                      | Install all deps (workspaces: `frontend/`, `tooling/`)                                                                        |
| `npm run dev`                                                 | Vite dev server (legacy hub at `/hub/` from `www/hub/` via middleware)                                                        |
| `npm run build`                                               | `turbo run build` → generate hub config, Vite build, postbuild (`404.html`, copy `www/hub` → `dist/hub`, stamp asset version) |
| `npm run generate:hub`                                        | `scripts/generate-hub-config.mjs` only — refresh `www/hub/config.generated.js` from `.env`                                    |
| `npm run check`                                               | `turbo run lint format:check typecheck` (`@onaudience/tooling` + `frontend`)                                                  |
| `npm run lint` / `npm run format:check` / `npm run typecheck` | Same tasks via Turborepo (cached)                                                                                             |
| `npm run lint:fix`                                            | `eslint . --fix` at repo root (not via Turbo)                                                                                 |
| `npm run format`                                              | `prettier --write .` at repo root                                                                                             |
| `npm test`                                                    | `playwright test`                                                                                                             |
| `npm run test:api`                                            | `playwright test --project=api-only`                                                                                          |
| `npm run test:ui`                                             | Playwright UI mode                                                                                                            |
| `npx playwright install --with-deps chromium`                 | Install Chromium for Playwright                                                                                               |
| `npx playwright test`                                         | All projects (`setup` / `chromium` / `api-only`)                                                                              |
| `npx playwright test --project=setup`                         | Auth fixture only                                                                                                             |
| `npm run validate:hub`                                        | `node validate.js` — legacy hub checks; CSS audit via **`uv run python`** ([uv](https://docs.astral.sh/uv/))                  |
| `npm run prepare` (automatic on `npm ci`)                     | Installs Husky git hooks (`.husky/pre-commit` → `lint-staged`)                                                                |

</important>

<important if="you are adding or changing test secrets, env vars, or API URLs used in tests">

- Use `tests/env.ts` as the single place for keys and derived endpoints — do not scatter secrets across specs. **`PLAYWRIGHT_BASE_URL`** / **`HUB_BASE_URL`** set the hub base for browser tests (see `playwright.config.ts`).
- Local: copy `.env.example` to `.env` and fill values (loaded via `dotenv` in config and `tests/env.ts`).
- CI: GitHub Secrets (`OA_EMAIL`, `OA_PASSWORD`, `LEMLIST_API_KEY`, `SB_ANON_KEY`, `SB_URL`, etc.) — see `.github/workflows/e2e.yml` for which job sets what.

</important>

<important if="you are writing or modifying Playwright tests or config">

- Projects: `setup` (auth), `chromium` (depends on `setup`, uses `tests/fixtures/.auth.json`), `api-only` (no auth; matches `lemlist.spec.ts`, `*.api.spec.ts`, `*.unit.spec.ts`).
- Default `baseURL` targets the deployed hub path — see `playwright.config.ts` (legacy hub under `/hub/`).
- Shared helpers: `tests/helpers.ts`; env object: import from `./env` or `tests/env` as existing specs do.
- Hub globals used in `page.evaluate` are declared in `tests/hub-window.d.ts` (adjust when the app gains real types).

</important>

<important if="you are working on the Vue app (frontend/)">

- Vite `base` in production is `/onaudience-hub/` (GitHub Pages project URL). Add or extend routes in `frontend/src/router/index.ts`; register child routes from `frontend/src/modules/*/routes.ts` where a feature slice already exists.
- New top-level views can live in `frontend/src/views/`; larger features prefer `frontend/src/modules/<area>/` (views + store + `routes.ts` + `index.ts` barrel).
- After build, `postbuild` copies `www/hub` → `dist/hub` so existing `/hub/` URLs keep working until features are ported.

</important>

<important if="you are changing the legacy static hub under www/hub/">

- Source of truth for the old app remains `www/hub/` until migrated; deploy bundles it into `frontend/dist/hub/` automatically.
- Entry points: `www/hub/index.html`, `app.js`, feature modules — see `state.js`, `api.js` for data flow.

</important>

<important if="you are updating documentation to match code or route changes">

When behavior or structure shifts meaningfully, update docs in the same PR (avoid drift on large refactors).

| Change                                                                           | Update                                                                                                                                                     |
| -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Add/remove/rename a **`www/hub/*.js`** module, or change its main responsibility | **`docs/components.md`** table + the corresponding **`docs/<module>.md`** (create/rename/delete the elaboration file).                                     |
| Add/remove a **Vue SFC** or **layout/module** under `frontend/src/`              | **`docs/components.md`** + the relevant **`docs/<Name>.md`** (see existing Vue rows in that table).                                                        |
| Move logic between files                                                         | Adjust the affected **`docs/<name>.md`** files and any “Related” / cross-links.                                                                            |
| Change **hub loading**, **Gmail**, **company panel**, or **contacts** behavior   | **`docs/loader.md`**, **`docs/gmail.md`**, **`docs/company.md`**, **`docs/contact.md`** as appropriate (topic guides, not 1:1 file names).                 |
| Change **env vars** / **`config.generated.js`** shape                            | **`docs/config.generated.md`** and **`.env.example`**; mention new keys in **`docs/config.md`** if they are user-facing.                                   |
| Change **Supabase tables**, field meanings, or CRM semantics                     | **`docs/FIELD_MANUAL_AGENT.md`** (and PDF companion if maintained) plus any module doc that lists data shapes (**`docs/db.md`**, **`docs/api.md`**, etc.). |

Prefer short tables and bullet “Role / Exports / Related” sections. Link paths as `docs/foo.md`; point to `www/hub/…` or `frontend/…` for source. After a big hub refactor, skim **`docs/components.md`** so the inventory matches the tree.

</important>
