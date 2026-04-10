# `merge.js` — duplicate company merge

**Path:** [`www/hub/merge.js`](../www/hub/merge.js)

Handles **merge suggestions** (`merge_suggestions` table) and the **`merge_companies`** RPC: pick a winner/loser, move relations/contacts, delete duplicate.

## Exports

| Export                      | Role                                                                                     |
| --------------------------- | ---------------------------------------------------------------------------------------- |
| `loadMergeSuggestionsCount` | Badge count for pending suggestions.                                                     |
| `openMergeModal`            | Full UI to review and execute merges.                                                    |
| `loadMergeSuggestions`      | Fetches pending rows.                                                                    |
| `executeMerge`              | POST RPC with winner/loser ids.                                                          |
| **`resolveAlias`**          | Used by [`hub.js`](hub.md) `openCompany(string)` to map alias id → canonical company id. |

## Logging

Uses `clog` imported from [`api.js`](api.md) (not `hub.js`) for this module.
