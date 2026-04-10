# onAudience Sales Intelligence Hub — agent reference

**Source:** Field Manual FM-OA-2026 (Rev. b6, 09 Apr 2026), `docs/onAudience_Hub_Field_Manual.pdf`.  
**Audience:** Coding agents and operators working on or explaining the hub.  
**Confidentiality:** The PDF is marked internal use only — do not treat as public documentation.

This file distills the field manual into facts, terminology, and workflows agents need to answer questions, implement features, or debug behavior without re-reading the PDF.

---

## 1. What the hub is

Single-page B2B sales intelligence UI: curated companies + contacts, AI-assisted outreach (angles, emails, hooks), audience lists, TCF/GDPR vendor analysis, and Lemlist integration. **Not** a full CRM or open web search — it operates on a tracked list; new companies enter via **Prospect Finder** (⊕ Find) and enrichment.

**Stated mission:** From “never heard of this company” to “personalised email drafted + contact pushed to Lemlist” in **under five minutes**.

**Rough scale (from manual):** 2,062+ companies, 4,228+ contacts; b2b “Find Similar” searches ~21.9M companies (external DB).

**Access (manual):** Google account at `cloudtechnologies.pl` or `onaudience.com`. Browser-only; example URL in manual: `https://lukaszkapusniak-sudo.github.io/onaudience-hub/hub/` — treat deployment URLs as environment-specific; this repo uses GitHub Pages with base `/onaudience-hub/` per `CLAUDE.md`.

---

## 2. Layout and navigation

| Zone                    | Role                                                                                                          |
| ----------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Nav bar (~42px)**     | Logo, title, sync status, API key, Gmail, Find (⊕), Compose (✉), Research (+), theme                          |
| **Stats bar**           | Filters: All, Clients, POC, Partners, Prospects, No Outreach, Fresh                                           |
| **Left panel (~320px)** | Tabs: Companies, Contacts, Audiences, TCF, Lemlist; search; filters; sort; list; **AI bar** + chips + console |
| **Center**              | Empty: spoke diagram. Company selected: profile sections. TCF mode: vendor analysis                           |
| **Drawers/modals**      | Contact drawer (~380px), Meeseeks Composer (~840px), Lemlist full-screen modal                                |

---

## 3. Company types and ICP

**Types (colour tags):**

- **Client** — paying customer
- **Partner** — active data/tech partnership
- **POC** — proof of concept
- **Prospect** — target, not yet engaged / not converted
- **No outreach** — competitor, investor, declined, etc.

**ICP stars (1–5):** Manual defines 5 as “perfect fit”, 4 “strong — this week”, 3 “decent — angle research”, 2 “marginal”, 1 “weak — don’t waste time”.

**Sort options:** ICP score ↓ (default), Recently updated, Company name A–Z, Data richness, Relationship status.

**Pipeline status (company header):** Contacted · Meeting · Proposal · Partner · Paused — persists to DB; active state visible in list as signal.

---

## 4. Company panel (center) — sections

When a company is selected, sections load in parallel; manual quotes ~150ms for some DB fetches.

| Section        | Purpose                                                                                                     |
| -------------- | ----------------------------------------------------------------------------------------------------------- |
| Company        | Category, HQ, size, funding, TCF vendor ID, data richness, last updated; links (site, LinkedIn, Crunchbase) |
| Outreach Angle | AI angle; **Regen** + persona (~3s); editable                                                               |
| Privacy / TCF  | GVL/GDPR; **GVL** runs full analysis                                                                        |
| Contacts       | DB contacts; **Find DMs** = AI research for decision-makers                                                 |
| Intelligence   | Google News + press; **Refresh**                                                                            |
| Email History  | Gmail scan for domain; **Scan Gmail**                                                                       |
| Lemlist        | Who is in campaigns (✓); **Push N**                                                                         |
| Products       | From tech scan / enrichment                                                                                 |
| Segment Mapper | Taxonomy (Web / CTV / Brands); auto on open                                                                 |
| Relations      | Partnerships, integrations, M&A; add via right-click                                                        |
| Quick Links    | LinkedIn search, News, Crunchbase                                                                           |

**AI bar quick actions (company context):** Draft Email (Meeseeks), Find DMs, Gen Angle, News, Similar (Find Similar modal; needs Anthropic key for b2b MCP).

**Right-click company row (8 options):** Full contact report, Find decision makers (`bgFindDMs`), Draft outreach email, LinkedIn message, Find similar, Email history, Why no outreach?, Prioritize.

---

## 5. Contacts

**Finding:** Contacts tab (search by name/company); or company → Contacts (~120ms manual). **Find DMs** saves AI-found people to DB. **Email History → Scan Gmail** pulls from threads.

**Contact drawer:** Title, email, phone, LinkedIn, dept, seniority, location, outreach status, relationship strength, last contacted, warm intro, notes. Actions: ✉ Email (Meeseeks), LinkedIn, Gmail, + Research.

---

## 6. Lemlist push (typical flow)

1. Open company → **Lemlist** section
2. See ✓ in Lemlist vs not yet pushed
3. **Push N** → modal, campaigns from API
4. **Push** → refresh shows ✓ + campaign + timestamp

**Audience:** **Push to Lemlist** can push all contacts from audience companies in one go.

If Push is missing: Lemlist API key not set (manual: set in Lemlist tab key panel).

---

## 7. AI systems (do not conflate)

1. **AI bar (left panel bottom)** — Filters/highlights rows in the **already loaded** list; does not import new companies. Enter query or use chips. **⊕ Find Companies** opens Prospect Finder.
2. **Meeseeks Composer (✉ Compose)** — Full email workflow: company, contact, optional context, persona, **Generate Email** (~3s), copy/edit.
3. **Find Similar (b2b MCP)** — Right-click → Find similar; embedding similarity over 21.9M cos.; hub matches highlighted; **requires personal Anthropic API key** (nav key control).

**AI bar chips (examples):** EU DSPs, CTV, Cookieless, **No angle** (high ICP, no angle yet), Marketplace. Pro tip in manual: “high ICP no outreach” for Monday prospecting.

---

## 8. Personas (all generation paths)

Pick by **recipient**, not sender. Every angle / hook / template / email goes through a persona.

| Name     | Vibe       | Notes                         |
| -------- | ---------- | ----------------------------- |
| Steve    | Visionary  | Bold, minimal, magnetic       |
| Barack   | Inspiring  | Warm, “we”, builds to a point |
| Margaret | Conviction | Precise, authoritative        |
| Winston  | Rallying   | Gravitas, memorable close     |
| David    | Research   | Evidence-first, structured    |
| Jeff     | Metrics    | Numbers, scale, efficiency    |
| Gary     | No-BS      | Blunt, direct                 |
| Maya     | Story      | Narrative, imagery            |
| Elon     | Disruptive | First principles, contrarian  |
| Oprah    | Authentic  | Personal, connective          |

**Rule of thumb (manual):** B2B data partnerships → Jeff or Gary for technical buyers; Steve or Barack for C-suite; Maya if origin story matters.

---

## 9. Audiences

Saved company groups for **batch** campaigns, not one-off emails.

**Create:** Audiences tab → New Audience; or Prospect Finder → select → Save as Audience; or **AI ICP builder** (describe ideal partner → criteria → populate).

**AI features:**

- **Generate Hook** — 2–3 sentences; campaign opening
- **Draft Campaign** — Subject + body + CTA; `{{first_name}}` etc.
- **Export CSV** — name, type, ICP, category, HQ, website
- **Push to Lemlist** — bulk contacts

**Golden rule:** Generate **hook first** — the email template’s first line builds on the hook.

---

## 10. TCF / privacy analyser

IAB TCF / **Global Vendor List v3**: lookup by name or ID; single-vendor profile (purposes, special purposes, features, data categories, consent); multi-vendor compare (up to **10**); auto-match from company panel TCF/GVL.

**Risk score:** Green / Amber / Red from purposes and legitimate-interest use.

Company **TCF vendor ID** auto-feeds analysis; GVL registration is a meaningful signal for data-partnership discussions.

---

## 11. Field scenarios (condensed)

| #   | Goal                          | Essence                                                                          |
| --- | ----------------------------- | -------------------------------------------------------------------------------- |
| 1   | Monday prospecting, no angles | AI bar / No angle chip → sort ICP ↓ → Generate angle ×5                          |
| 2   | Quick pre-call intel          | Search company → Company + Intelligence + Contacts + Privacy                     |
| 3   | First cold email              | Contacts / Find DMs → Meeseeks → persona → Generate → copy                       |
| 4   | Batch Lemlist                 | Audience → Hook → Draft Campaign → Push to Lemlist                               |
| 5   | Lookalikes                    | Right-click → Find similar → Anthropic key → + Research new rows → Save Audience |
| 6   | TCF for legal                 | Privacy/TCF → GVL → compare to known partner → export                            |

---

## 12. Quick reference and shortcuts

- **Enter** in AI bar: run query
- **Esc:** close modal/drawer
- **Right-click company:** context menu
- Click row: company panel; click contact: drawer; click section header: expand/collapse

**Troubleshooting (manual):**

| Symptom                      | Likely cause                               |
| ---------------------------- | ------------------------------------------ |
| List stuck “LOADING…”        | Supabase timeout; auto-retry ~3s or reload |
| “Key needed” on Find Similar | Set Anthropic key in nav                   |
| Contacts show 0              | Expand Contacts (fetch on expand)          |
| No Lemlist Push              | Lemlist API key                            |
| AI error                     | Rate limit / network; retry                |
| Company not in search        | Use ⊕ Find / Prospect Finder to add        |
| Gmail empty                  | Reconnect Gmail (nav)                      |

**Closing principle (manual):** Hub multiplies judgment; AI produces first drafts; operators ship final copy.

---

## 13. Agent usage notes

- When suggesting UX or copy, respect **persona** and **company type** semantics above.
- Distinguish **AI bar** (filter loaded list) from **Find** (add companies) from **Meeseeks** (draft email).
- Lemlist and Gmail are integrations; failures are often **keys/tokens**, not logic bugs.
- Numbers (company counts, DB size) may drift; treat PDF date as stale if the app shows different figures.
- For full narrative, scenarios, and tone, read `docs/onAudience_Hub_Field_Manual.pdf`.
