# CLAUDE.md

Static OnAudience hub (vanilla HTML/JS under `www/`), tested with Playwright, deployed to GitHub Pages.

## Project map

- `www/` — site root uploaded to Pages (`index.html`, assets)
- `www/hub/` — main app: `hub.js`, feature modules (`audiences.js`, `gmail.js`, `api.js`, …), `style.css`
- `tests/` — Playwright specs; `tests/fixtures/` — auth setup (`auth.setup.ts`, generated `.auth.json` gitignored)
- `tests/env.ts` — canonical env keys and derived URLs for tests
- `.github/workflows/` — `e2e.yml` (Playwright on `main`), `deploy.yml` (Pages when `www/**` changes)

## Tech

Vanilla JS modules, Supabase client usage and edge function URLs from test env; Playwright with Chromium-oriented projects.

<important if="you need to run commands to install dependencies, run tests, or work with Playwright">

From the repo root (Node 20 as in CI):

| Command | What it does |
|---|---|
| `npm ci` | Install dependencies (CI-style lockfile install) |
| `npx playwright install --with-deps chromium` | Install Chromium for Playwright |
| `npx playwright test` | Run all projects (see `playwright.config.ts` for `setup` / `chromium` / `api-only`) |
| `npx playwright test --project=api-only` | HTTP/unit-style tests (no browser auth) |
| `npx playwright test --project=chromium` | Browser tests (needs auth storage from setup) |
| `npx playwright test --project=setup` | Run auth fixture only |
| `npx playwright test --ui` | Playwright UI mode (local debugging) |

`npm test` in `package.json` is a placeholder; use Playwright commands above for real runs.

</important>

<important if="you are adding or changing test secrets, env vars, or API URLs used in tests">

- Use `tests/env.ts` as the single place for keys and derived endpoints — do not scatter secrets across specs.
- Local: copy `.env.example` to `.env` and fill values (loaded via `dotenv` in config and `tests/env.ts`).
- CI: GitHub Secrets (`OA_EMAIL`, `OA_PASSWORD`, `LEMLIST_API_KEY`, `SB_ANON_KEY`, `SB_URL`, etc.) — see `.github/workflows/e2e.yml` for which job sets what.

</important>

<important if="you are writing or modifying Playwright tests or config">

- Projects: `setup` (auth), `chromium` (depends on `setup`, uses `tests/fixtures/.auth.json`), `api-only` (no auth; matches `lemlist.spec.ts`, `*.api.spec.ts`, `*.unit.spec.ts`).
- Default `baseURL` targets the deployed hub path — see `playwright.config.ts`.
- Shared helpers: `tests/helpers.ts`; env object: import from `./env` or `tests/env` as existing specs do.

</important>

<important if="you are changing the static hub UI or behavior in www/">

- Entry points: `www/hub/index.html`, `www/hub/hub.js`, and feature modules alongside them — follow patterns in `www/hub/` (see `state.js`, `api.js` for data flow).
- Deploy: pushing to `main` with changes under `www/**` triggers GitHub Pages deploy (`.github/workflows/deploy.yml`).

</important>
