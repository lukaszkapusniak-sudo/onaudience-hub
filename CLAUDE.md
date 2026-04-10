# CLAUDE.md

OnAudience hub: **Vue 3 + Vite + TypeScript** SPA in `frontend/`, with the **legacy vanilla hub** still shipped from `www/hub/` (copied into the Vite build for `/hub/`). Playwright tests; GitHub Pages deploys `frontend/dist`.

## Project map

- **npm workspaces:** `frontend/` (Vue app), `tooling/` (repo-root ESLint / Prettier / `tsc` for tests — used by Turborepo)
- `frontend/` — Vite app (`src/`, `vite.config.ts`); production build → `frontend/dist/`
- `www/hub/` — legacy ES-module hub (being migrated); `scripts/generate-hub-config.mjs` writes `config.generated.js` from env; copied to `dist/hub/` after each build, then `scripts/stamp-hub-asset-version.mjs` rewrites cache-bust tokens in **`dist/hub` only** (`frontend/scripts/postbuild.mjs`)
- `www/index.html` — old root redirect (not deployed alone; Vue is the site root on Pages)
- `tests/` — Playwright specs; `tests/fixtures/` — auth setup (`auth.setup.ts`, generated `.auth.json` gitignored)
- `tests/env.ts` — canonical env keys and derived URLs for tests
- `.github/workflows/` — `e2e.yml` (quality + Playwright on `main`), `deploy.yml` (build Vue + upload `frontend/dist`)
- `docs/` — human-written module and product notes (not linted by ESLint; Prettier may format). **`docs/components.md`** is the index; each legacy module has a matching **`docs/<name>.md`** (Vue: `App.md`, `HomeView.md`; `www/hub/app.js` → **`docs/hub-app.md`** to avoid colliding with `App.md` on case-insensitive filesystems).

## Keeping `docs/` up to date

When you change the codebase, update docs in the same PR when behavior or structure meaningfully shifts (do not let docs drift for large refactors).

| Change                                                                           | Update                                                                                                                                                     |
| -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Add/remove/rename a **`www/hub/*.js`** module, or change its main responsibility | **`docs/components.md`** table + the corresponding **`docs/<module>.md`** (create/rename/delete the elaboration file).                                     |
| Add/remove a **Vue SFC** under `frontend/src/`                                   | **`docs/components.md`** + **`docs/App.md`** / **`docs/HomeView.md`** (or new `docs/<ViewName>.md` if you add views).                                      |
| Move logic between files                                                         | Adjust the affected **`docs/<name>.md`** files and any “Related” / cross-links.                                                                            |
| Change **hub loading**, **Gmail**, **company panel**, or **contacts** behavior   | **`docs/loader.md`**, **`docs/gmail.md`**, **`docs/company.md`**, **`docs/contact.md`** as appropriate (these are topic guides, not 1:1 file names).       |
| Change **env vars** / **`config.generated.js`** shape                            | **`docs/config.generated.md`** and **`.env.example`**; mention new keys in **`docs/config.md`** if they are user-facing.                                   |
| Change **Supabase tables**, field meanings, or CRM semantics                     | **`docs/FIELD_MANUAL_AGENT.md`** (and PDF companion if maintained) plus any module doc that lists data shapes (**`docs/db.md`**, **`docs/api.md`**, etc.). |

**Conventions:** Prefer short tables and bullet “Role / Exports / Related” sections so diffs stay reviewable. Link paths as `docs/foo.md` from other docs; point to `www/hub/…` or `frontend/…` for source. After a big hub refactor, skim **`docs/components.md`** once to ensure the inventory row count and links still match the tree.

## Tech

Vue 3, Vue Router, Vite 8; Playwright + TypeScript for tests. **Turborepo** runs tasks across workspaces (`turbo run build`, `turbo run lint`, etc.). `@onaudience/tooling` runs ESLint / Prettier / root `tsc` from the repo root via `tooling/run-root.mjs`. `npm run check` = `turbo run lint format:check typecheck`. **Husky** + **lint-staged** run ESLint + Prettier on staged files in **pre-commit**. ESLint includes **Vue SFCs** and **`.mdx`** (not plain `.md` — those are Prettier-only). **Cursor** / VS Code: see `.vscode/settings.json` and `extensions.json` (MDX, ESLint, Prettier, Volar). Supabase edge code under `supabase/` is Deno — not typechecked by root `tsc`.

<important if="you need to run commands to install dependencies, run tests, or work with Playwright">

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
| `npm run validate:hub`                                        | `node validate.js` — legacy hub checks (needs local `python3` for CSS audit)                                                  |
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

- Vite `base` in production is `/onaudience-hub/` (GitHub Pages project URL). Add new routes in `frontend/src/router/`, views under `frontend/src/views/`.
- After build, `postbuild` copies `www/hub` → `dist/hub` so existing `/hub/` URLs keep working until features are ported into Vue.

</important>

<important if="you are changing the legacy static hub under www/hub/">

- Source of truth for the old app remains `www/hub/` until migrated; deploy bundles it into `frontend/dist/hub/` automatically.
- Entry points: `www/hub/index.html`, `app.js`, feature modules — see `state.js`, `api.js` for data flow.

</important>
