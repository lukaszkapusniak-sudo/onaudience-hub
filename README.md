# onAudience Sales Intelligence Hub

> Developed by **[Kapoost](https://kapoost.com)**

A browser-based B2B sales intelligence platform built for the onAudience team. It centralises company research, contact management, outreach, and audience building in a single, AI-augmented hub — powered by Supabase and Claude.

---

## Feature overview

### Company list & search

The main view shows the full CRM company list with real-time filtering and sorting.

- **Full-text search** across company names, tags, and notes
- **Tag panel** — AND / OR multi-tag filtering; tag pills show live counts for the current filtered pool
- **Smart filters** — by company type, ICP tier, data freshness, pipeline status
- **Sort options** — alphabetical, ICP score, recently updated, completeness
- **Completeness scoring** — each row shows a data-quality indicator so gaps are immediately visible
- **AI highlight** — companies matched by the AI search are visually distinguished in the list

### AI search (2-pass semantic search)

A dedicated AI bar drives semantic company discovery across the full database.

- Natural-language queries ("ad-tech DSPs with strong programmatic focus")
- Runs against a **Supabase Edge Function** (`ai-search`) that performs a 2-pass search: fast pre-screen on metadata, then Claude for semantic ranking
- Returns named matches that are highlighted live in the company list
- Requires a personal Anthropic API key stored in `localStorage`

### Company detail panel

Clicking any company opens a full detail panel without leaving the page.

- **At-a-glance header** — avatar initials, company type badge, ICP stars, optional note, system-audience membership
- **Pipeline & status** — mark companies through sales pipeline stages; status chips lock in demo mode
- **CTA toolbar** — Draft Email, Find DMs, Generate Angle, Latest News, Find Similar, LinkedIn, Merge
- **Intelligence section** — AI-written company summary with background refresh via `bgRefreshIntel`; backed by Google News
- **Contacts grid** — contacts loaded from Supabase, merged with in-memory state; shows title, email, LinkedIn, outreach status, Lemlist activity
- **Products section** — products/services associated with the company
- **Relations** — brief relationship graph loaded after panel open
- **Email / Gmail section** — full Gmail integration panel (see below)
- **Lemlist section** — campaign history and lead status per company
- **Segment / audience membership** — shows which audiences include this company

### Contact drawer

A right-side drawer for inspecting a single contact without leaving the company view.

- Resolves contact by id or name slug
- Shows full contact profile: title, email, phone, LinkedIn, department, seniority, location
- Outreach status, relationship strength, last contacted date, warm intro path, notes
- Lemlist outreach strip when campaign/activity data exists
- **Actions from the drawer:**
  - `Draft email` → opens Meeseeks composer pre-filled with contact context
  - `LinkedIn` → opens LinkedIn profile in a new tab
  - `Gmail` → navigates to the parent company's Gmail / intel section and triggers a background refresh
  - `Research` → fires an AI quick-search scoped to the person's name and company

### Gmail integration

A read-only Gmail bridge for surfacing relationship context from email history.

- **OAuth via Google Identity Services** — `gmail.readonly` scope; token stored in `localStorage`
- **Scan Gmail** — searches up to 20 message threads matching the company's domain and name; renders thread rows with links to Gmail web
- **Update Contacts** — deeper scan (up to 50 messages, 20 fetched); parses `From / To / Cc` for domain-matching addresses; surfaces new contacts or fills in missing emails for existing CRM contacts; save flow uses Supabase upsert with `merge-duplicates`
- **Summarize** — sends thread subjects and snippets to Claude to generate a relationship summary; persisted via Supabase helper
- Connect / Disconnect managed from the company panel's Email section header

### Meeseeks email composer

An AI-powered outbound email composer with persona support.

- Searchable company picker and contact selector (combines CRM contacts with AI-suggested names)
- Multiple configurable **personas** (`MC_PERSONAS` in `config.js`) each with their own system prompt
- Generate button calls Claude (`MODEL_CREATIVE`) to produce copy in the selected persona's voice
- Character counter and clipboard copy
- Accessible from the contact drawer, audience detail, or directly from the company toolbar

### Audience management

Named, saveable company segments with map view and AI-assisted building.

- **System audiences** — shared, read-only lists visible to all users
- **User audiences** — personal segments with custom names and filter criteria
- **AI build** (`audAIBuild`) — describe a target in natural language; Claude scores the current company pool and populates the audience
- **Map view** — Leaflet-based geographic distribution of audience members
- **CSV export** and **contact discovery** within an audience
- **ICP finder** (natural language → audience):
  1. User types an ICP description ("Series B SaaS companies in DACH")
  2. Claude scores every company in `S.companies` against the criteria
  3. Results are previewed in a wizard; user names and saves the audience
- **Campaign generation** — per-audience outreach hooks and email templates written by Claude using `MODEL_CREATIVE` and optional Meeseeks persona prompts; templates are persisted on the audience row
- **Lemlist launch** — push the audience's contacts directly into a Lemlist campaign from the audience detail panel

### Lemlist integration

Two-way sync between the hub's CRM and Lemlist campaigns.

- API key stored in `localStorage`; all Lemlist calls routed through a Supabase proxy to keep keys server-side
- Browse, search, and select campaigns from within the hub
- Push contacts from a company panel or audience directly into a campaign (`lemlistPush`)
- Dedicated **Lemlist tab** showing campaigns, lead status, and sync controls
- `llSyncContacts` / `llSyncCompanies` — pull Lemlist activity (opened, replied, clicked) back into CRM contact rows
- `llUnsubLead` — mark a lead unsubscribed from within the hub
- 429 rate-limit retry logic built in

### Vibe / Explorium prospecting

AI-powered firmographic and people enrichment via the Vibe MCP server.

- Powered by Claude calling `https://mcp.vibe.ai/mcp` as an MCP server
- **Company enrichment** — domain + name → tech stack, funding stage, workforce data
- **Contact enrichment** — email or name + company → LinkedIn profile, title, work history
- **Company finder** — drives the Prospect Finder panel; search by criteria and surface new targets outside the existing CRM
- Requires a personal Anthropic API key

### Company duplicate merge

Identifies and resolves duplicate company records.

- `merge_suggestions` table populated by a Supabase backend process
- Badge in the nav shows the count of pending suggestions
- Merge modal lets users review candidates, pick a winner and loser, and execute
- `merge_companies` RPC moves all related contacts, relations, and intelligence to the winner before deleting the duplicate
- Alias resolution (`resolveAlias`) means any deep link or inline reference to an old slug automatically follows to the canonical record

### TCF / GVL privacy analyser

A built-in tool for assessing ad-tech vendor privacy posture against IAB TCF standards.

- Loads the **IAB Global Vendor List v3** (with CORS proxy fallback)
- Matches GVL vendor entries to companies already in the CRM
- Computes a **privacy risk score (1–5)** from leg-int purposes, special purposes/features, and retention days
- Score is persisted back to the `companies` table (`privacy_risk_score`)
- Side-by-side **comparison mode** — select up to 4 companies and compare their TCF profiles simultaneously
- onAudience's own GVL entry is highlighted separately (`OA_GVL` in config)

### Google News intelligence

Automatic background news fetching per company.

- Queries Google News RSS via a CORS proxy (`corsproxy.io`)
- Parsing runs in a **Web Worker** (`gnews-worker.js`) to keep the main thread responsive; falls back to main-thread parsing when Workers are unavailable
- Intel sections show dated news items with source links; refreshed when the user opens a company or calls `bgRefreshIntel`
- Summaries and key items are persisted to Supabase (`saveIntelligence`)

### Authentication & access control

- **Google OAuth** via Supabase Auth with redirect back to the hub
- **ALLOWED_EMAILS** per-address allowlist — external users can be granted access without giving them an `@onaudience.pl` email
- All RLS policies enforced server-side; the browser holds only the anon key and user JWT
- Activity logging (`logActivity`) records company, contact, and audience opens for audit
- **Demo mode** — a locked, read-only state for presentations; pipeline buttons and status changes are disabled

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | Vanilla JS ES modules, served as static files from `www/hub/` |
| Backend | [Supabase](https://supabase.com) — Postgres, Auth, RLS, Edge Functions |
| AI | [Anthropic Claude](https://anthropic.com) via Supabase Edge Function proxy |
| Email intelligence | Gmail API (read-only OAuth) |
| Outreach | [Lemlist](https://lemlist.com) via Supabase proxy |
| Prospecting enrichment | [Vibe](https://vibe.ai) MCP server via Claude |
| News | Google News RSS + CORS proxy + Web Worker |
| Maps | Leaflet (audience geography view) |
| Tests | [Playwright](https://playwright.dev) |
| Scripts | Python / uv (company enrichment, CSS audit) |

## Project structure

```
www/hub/            # Frontend app — JS modules + CSS
  app.js            # Bootstrap, auth gate, window bridge
  hub.js            # Company detail panel, AI bar, orchestration
  list.js           # Company list, filters, tags, sort
  audiences.js      # Audience management
  aud-icp.js        # ICP natural-language finder
  aud-campaign.js   # Campaign hooks and Lemlist launch
  lemlist.js        # Lemlist CRM integration
  gmail.js          # Gmail read-only integration
  meeseeks.js       # AI email composer
  vibe.js           # Vibe / Explorium prospecting
  tcf.js            # TCF / GVL privacy analyser
  merge.js          # Duplicate company merge
  gnews.js          # Google News RSS with worker
  drawer.js         # Contact drawer
  auth.js           # Supabase Auth helpers
  state.js          # Shared mutable store (S)
  api.js            # Network layer: Supabase, Anthropic, Lemlist
  db.js             # Supabase table helpers
  config.js         # Feature flags, model IDs, tag rules
  utils.js          # Shared utilities

supabase/
  functions/
    claude-proxy/   # Supabase Edge Function — proxies Anthropic calls
  config.toml

scripts/
  enrich_companies.py   # Bulk company enrichment script
  audit_css.py          # CSS audit utility

tests/              # Playwright end-to-end tests
```

## Development

Copy `.env` with your Supabase credentials, then open `www/hub/index.html` in a browser or serve the `www/` directory with any static file server.

To run Playwright tests:

```bash
npx playwright test
```

---

Built by [Kapoost](https://kapoost.com)
