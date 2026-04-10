# `lemlist.js` — Lemlist CRM integration

**Path:** [`www/hub/lemlist.js`](../www/hub/lemlist.js)

Integrates **lemlist** campaigns and leads through the Supabase **edge proxy** [`LEMLIST_PROXY`](config.md) (avoids exposing API keys in the browser). Manages modal UI (`#llModal`), campaign pickers, lead search, sync, and write-back to [`contacts`](db.md).

## Key exports (via `hub.js` re-exports)

| Function                                                                 | Role                                                          |
| ------------------------------------------------------------------------ | ------------------------------------------------------------- |
| `initLemlistModal` / `openLemlistModal` / `closeLemlistModal`            | Push selected contacts to a campaign.                         |
| `lemlistPush`                                                            | Executes push after validation.                               |
| `refreshLemlistCampaigns`, `selectLemlistCampaign`, `renderLemlistPanel` | Dedicated Lemlist tab / panel content.                        |
| `llSearchLeads`, `llUnsubLead`, `llSyncContacts`, `llSyncCompanies`      | Two-way sync helpers.                                         |
| `llSetKey` / `llClearKey` / `llIsConnected`                              | User’s lemlist key stored in `localStorage` (`oaLemlistKey`). |

## Hub coupling

[`hub.js`](hub.md) calls `_loadLemlistSection` when opening a company if a key exists. [`api.js`](api.md) supplies `lemlistFetch`, `lemlistCampaigns`, etc.

## Related

- [drawer.md](drawer.md) — Lemlist history strip on contacts
- [loader.md](loader.md) — “Loading campaigns…” placeholders
