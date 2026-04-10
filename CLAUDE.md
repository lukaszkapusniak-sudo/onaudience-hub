# CLAUDE.md

OnAudience hub: **Vue 3 + Vite + TypeScript** SPA in `frontend/` — `HubShellLayout` wraps the app (default `/` → `/data`); feature areas live under `frontend/src/modules/`. Production build outputs **`frontend/dist/`** (GitHub Pages, base `/onaudience-hub/`). Playwright tests at repo root target the **Vue** app. Legacy `www/hub/` sources are **gone**; migration notes and module write-ups remain under **`docs/`**.

## Agent-first helpers

Skim these **before** deep work — they prevent wrong assumptions and duplicate docs:

| Read first                                  | Why                                                                                   |
| ------------------------------------------- | ------------------------------------------------------------------------------------- |
| **`AGENTS.md`**                             | Repo-specific preferences (Vue, commits, fixtures) and workspace facts.               |
| **`docs/FIELD_MANUAL_AGENT.md`**            | CRM / Supabase / outreach semantics — use before changing fields, copy, or workflows. |
| **`docs/VUE_MIGRATION.md`**                 | Phases, parity goals, legacy → Vue module map.                                        |
| **`docs/components.md`**                    | Inventory of Vue files and doc links — update when you add routes or SFCs.            |
| **`tests/env.ts`** + **`tests/helpers.ts`** | Canonical test env and shared Playwright helpers.                                     |

## Project map

- **npm workspaces:** `frontend/` (Vue app), `tooling/` (repo-root ESLint / Prettier / `tsc` — Turborepo)
- `frontend/` — Vite (`vite.config.ts`); routes in `frontend/src/router/`; shared UI in `frontend/src/views/`, `frontend/src/components/`, `frontend/src/layouts/`; product slices in `frontend/src/modules/` (`routes.ts`, views, local stores)
- `tests/` — Playwright; `tests/fixtures/` — auth (`auth.setup.ts`; generated `.auth.json` gitignored)
- `tests/env.ts` — env keys; **`VUE_URL`** / **`HUB_URL`** for browser tests (see file)
- `supabase/` — edge code (Deno); not typechecked by root `tsc`
- `.github/workflows/` — `e2e.yml`, `deploy.yml`
- `docs/` — product and module notes; **`docs/components.md`** index; **`docs/VUE_MIGRATION.md`** migration plan. Historical **`www/hub/`** references in docs describe the old static hub — implementation now lives in Vue.

## Tech

Vue 3, Vue Router, Vite 8; Playwright + TypeScript. **Turborepo** (`turbo run …`). `@onaudience/tooling` drives ESLint / Prettier / root `tsc` from the repo root via `tooling/run-root.mjs`. Editor: `.vscode/settings.json`, `extensions.json`.

<important if="you need to run commands to build, test, lint, or generate code">

From the repo root (Node 20 as in CI):

| Command                                                       | What it does                                                                                              |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `npm ci`                                                      | Install all deps (workspaces: `frontend/`, `tooling/`)                                                    |
| `npm run dev`                                                 | Vite dev server (`frontend` workspace)                                                                    |
| `npm run build`                                               | `turbo run build` → `frontend`: `vue-tsc`, `vite build`, `postbuild` (writes `404.html` for GitHub Pages) |
| `npm run check`                                               | `turbo run lint format:check typecheck`                                                                   |
| `npm run lint` / `npm run format:check` / `npm run typecheck` | Same via Turborepo (cached)                                                                               |
| `npm run lint:fix`                                            | `eslint . --fix` at repo root                                                                             |
| `npm run format`                                              | `prettier --write .` at repo root                                                                         |
| `npm test`                                                    | `playwright test`                                                                                         |
| `npm run test:api`                                            | `playwright test --project=api-only`                                                                      |
| `npm run test:ui`                                             | Playwright UI mode                                                                                        |
| `npx playwright install --with-deps chromium`                 | Install Chromium for Playwright                                                                           |
| `npx playwright test`                                         | All projects (`setup` / `chromium` / `api-only`)                                                          |
| `npx playwright test --project=setup`                         | Auth fixture only                                                                                         |
| `npm run prepare` (on `npm ci`)                               | Husky hooks (`.husky/pre-commit` → `lint-staged`)                                                         |

</important>

<important if="you are adding or changing test secrets, env vars, or API URLs used in tests">

- Use `tests/env.ts` as the single place for keys and URLs — do not scatter across specs. **`PLAYWRIGHT_BASE_URL`** / **`HUB_BASE_URL`** feed into **`VUE_URL`** for browser tests (see `tests/env.ts`, `playwright.config.ts`).
- Local: copy `.env.example` to `.env` and fill values (loaded via `dotenv` in config and `tests/env.ts`).
- CI: GitHub Secrets — see `.github/workflows/e2e.yml` for which job sets what.

</important>

<important if="you are writing or modifying Playwright tests or config">

- Projects: `setup` (auth), `chromium` (depends on `setup`, uses `tests/fixtures/.auth.json`), `api-only` (no auth; matches `lemlist.spec.ts`, `*.api.spec.ts`, `*.unit.spec.ts`).
- `baseURL` is the **Vue app** (`VUE_URL` from `tests/env.ts`), not a legacy `/hub/` HTML shell.
- Shared helpers: `tests/helpers.ts`; env: import from `./env` or `tests/env` as existing specs do.

</important>

<important if="you are working on the Vue app (frontend/)">

- Vite `base` in production is `/onaudience-hub/` (GitHub Pages). Add or extend routes in `frontend/src/router/index.ts`; child routes can live in `frontend/src/modules/*/routes.ts`.
- New top-level views: `frontend/src/views/`; larger features: `frontend/src/modules/<area>/`.
- `frontend/scripts/postbuild.mjs` copies `index.html` → `404.html` for client-side routing on Pages.

</important>

<important if="you are updating documentation to match code or route changes">

When behavior or structure shifts meaningfully, update docs in the same PR (avoid drift on large refactors).

| Change                                                               | Update                                                                                                 |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Docs still referring to **`www/hub/*.js`** (historical) vs Vue ports | Keep **`docs/components.md`** and topic docs accurate; point implementation at `frontend/src/` paths.  |
| Add/remove a **Vue SFC** or **layout/module** under `frontend/src/`  | **`docs/components.md`** + the relevant **`docs/<Name>.md`**                                           |
| Move logic between files                                             | Adjust affected **`docs/<name>.md`** and cross-links                                                   |
| **Hub loading**, **Gmail**, **company panel**, **contacts** behavior | **`docs/loader.md`**, **`docs/gmail.md`**, **`docs/company.md`**, **`docs/contact.md`** as appropriate |
| **Env vars** / Vite `import.meta.env`                                | **`.env.example`**; user-facing keys in **`docs/config.md`** if needed                                 |
| **Supabase tables**, field meanings, CRM semantics                   | **`docs/FIELD_MANUAL_AGENT.md`** plus **`docs/db.md`**, **`docs/api.md`**, etc.                        |

Prefer short tables and bullet “Role / Exports / Related” sections. Link paths as `docs/foo.md`; point to `frontend/…` for source. After refactors, skim **`docs/components.md`**.

</important>
