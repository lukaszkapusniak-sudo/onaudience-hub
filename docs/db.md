# `db.js` — Supabase REST accessors

**Path:** [`www/hub/db.js`](../www/hub/db.js)

Centralizes **`fetch`** calls to the Supabase REST API with consistent [`authHdr()`](../www/hub/utils.js) and `Prefer` headers (`UPSERT` / `REPR`).

## Exported namespaces

| Export                 | Tables / endpoints                                                                                  |
| ---------------------- | --------------------------------------------------------------------------------------------------- |
| **`companies`**        | `list` (range + order), `get`, `search`, `upsert`, `patch`, `patchByName`                           |
| **`contacts`**         | `listAll`, `byCompany` (slug + name dual query, deduped), `byCompanyName`, `byCompanyIds`, `upsert` |
| **`audiences`**        | `list`, `upsert`, `patch`, `delete`                                                                 |
| **`relations`**        | `listAll`, `byCompany` (union from/to), `upsert`                                                    |
| **`intelligence`**     | `get`, `upsert`                                                                                     |
| **`mergeSuggestions`** | `pending`, `pendingCount`, `patch`                                                                  |
| **`enrichCache`**      | `get`, `upsert`                                                                                     |
| **`userProfiles`**     | `get`                                                                                               |

Internal `_req` throws on non-OK responses with a short error body for debugging.

## Related

- [api.md](api.md) — orchestration and `loadFromSupabase`
- [loader.md](loader.md) — pagination strategy
