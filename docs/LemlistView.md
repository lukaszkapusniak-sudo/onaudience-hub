# `LemlistView.vue` — Lemlist in Vue

**Path:** [`frontend/src/views/LemlistView.vue`](../frontend/src/views/LemlistView.vue)

**Route:** `/lemlist`

## Stack

| Piece                                                    | Role                                                                        |
| -------------------------------------------------------- | --------------------------------------------------------------------------- |
| [`stores/lemlist.ts`](../frontend/src/stores/lemlist.ts) | Campaigns, lead load/enrich, sync contacts/companies, audience push, unsub. |
| [`lib/lemlistApi.ts`](../frontend/src/lib/lemlistApi.ts) | Proxy fetch, campaigns pagination, add lead, write-back (patches contacts). |
| [`lib/hubRest.ts`](../frontend/src/lib/hubRest.ts)       | Supabase REST: contacts upsert/patch, audiences list, company merge.        |
| [`stores/hub.ts`](../frontend/src/stores/hub.ts)         | Shared `contacts` (for campaign row stats + enrich).                        |

## Not ported from legacy (yet)

- Push modal as a separate flow (`openLemlistModal` / `audPushLemlist` full parity) — audience **Push** on the detail panel covers the common path.
- Vibe enrich per-lead button, `openDrawer` / `openCompany` deep links — can be wired later.

## Related

- [`lemlist.md`](lemlist.md) — legacy module
