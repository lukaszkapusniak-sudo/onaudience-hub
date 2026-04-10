# Contacts — legacy hub

**Drawer UI:** `www/hub/drawer.js`  
**State:** `www/hub/state.js` — `S.contacts`, `S.currentContact`  
**Persistence:** `www/hub/api.js` — `saveContact` → `dbContacts.upsert`

## Data model (in-memory)

**`S.contacts`** is populated when **`loadFromSupabase`** runs (initial + paginated fetch beyond 1000 rows — see `docs/loader.md`). Each contact row is a Supabase-shaped object with fields such as:

- Identity: `id`, `full_name`, `email`, `phone`
- Org: `company_id`, `company_name`, `title`, `department`, `seniority`, `location`
- Outreach: `outreach_status`, `relationship_strength`, `last_contacted_at`, `warm_intro_path`, `notes`
- Integrations: Lemlist fields (`lemlist_campaign_id`, `lemlist_status`, opened/replied/clicked timestamps, etc.)
- Links: `linkedin_url`

Company detail **`_loadCompanyContacts`** can refresh the subset for the open company from the DB and merge into **`S.contacts`**.

## Contact drawer

### `openDrawer(ctId)`

Resolves the contact by **`id`** or by **slug of `full_name`** (`_slug`). Sets **`S.currentContact`**, fills `#drAv`, `#drName`, `#drSub`, and builds **`#drBody`** from a filtered list of field tuples (title, email, phone, LinkedIn, dept, seniority, location, status, relationship, last contact, warm intro, notes). Renders a **Lemlist outreach** subsection when campaign or activity fields exist. Adds **`open`** class to `#ctDrawer` and overlay.

### `closeDrawer()`

Removes open state and clears **`S.currentContact`**.

### `openContactFull(ctId)`

If the contact is missing from `S.contacts`, falls back to **`openDrawer(ctId)`**. Otherwise finds the **company** by `company_id` or matching `company_name`, calls **`openCompany(co)`** if found, or shows empty state and clears `currentCompany`. Then opens the drawer — used when navigating from a contact toward full company context **with** the drawer still showing that person.

## Drawer actions (exported)

| Function       | Behavior                                                                                                                                                                    |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `drEmail()`    | Opens Meeseeks **`openComposer`** with company name, contact name/title, LinkedIn.                                                                                          |
| `drLinkedIn()` | Opens `S.currentContact.linkedin_url` in a new tab.                                                                                                                         |
| `drGmail()`    | Resolves company, **`openCompany`**, closes drawer, scrolls intel and **`bgRefreshIntel()`** — ties the person to **Gmail / intel** on the company panel (`docs/gmail.md`). |
| `drResearch()` | **`aiQuick`** with quoted name + company; scrolls to AI input; closes drawer.                                                                                               |

## Saving from the drawer

`saveContact` is imported from `api.js` for edits (pattern in module; inline saves depend on UI wiring in `hub.js` / list).

## Gmail-derived contacts

Scan/enrich flows POST/PATCH via Supabase REST from **`gmail.js`**; new rows often include **`source: 'gmail_scan'`** and synthetic **`id`** when missing. See **`docs/gmail.md`**.

## Related

- **Company panel contacts grid:** `docs/company.md`
- **Supabase load:** `docs/loader.md`
