# `hub.js` — company detail, AI bar, orchestration

**Path:** [`www/hub/hub.js`](../www/hub/hub.js)

Largest module in the legacy hub. Owns **company detail** (`.ib` / `#coPanel`), **AI search** (`runAI`, `aiQuick`, edge `ai-search`), **intel/news** (`bgRefreshIntel`), **relations** (`loadRelationsBrief`), **console** (`clog`, `toggleConsole`), **modals** (research, similar companies), **Lemlist** hooks, and coordinates with [`list.js`](list.md), [`drawer.js`](drawer.md), [`lemlist.js`](lemlist.js).

## Key areas

| Area                    | Notes                                                                                                                                                                                                                                   |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`openCompany(c)`**    | Builds full detail HTML; sets `window.currentCompany`, `window._currentEmailSlug`; schedules `_loadCompanyContacts`, `_loadCompanyProducts`, intel, Lemlist section. Supports string alias via `resolveAlias` ([`merge.md`](merge.md)). |
| **`closePanel()`**      | Clears selection, restores empty state + list.                                                                                                                                                                                          |
| **`runAI` / `clearAI`** | Uses `ai-search` edge function + `S.aiSet` to highlight matching companies in the list.                                                                                                                                                 |
| **Status & tags**       | `setCompanyStatus`, `coAddTag` / `coRemoveTag`, pipeline buttons.                                                                                                                                                                       |
| **Re-exports**          | At file end: Lemlist modal API from `lemlist.js`; drawer functions from `drawer.js`; list/tag helpers from `list.js`.                                                                                                                   |

## Dependencies

Imports [`config.js`](config.md), [`state.js`](state.md), [`utils.js`](utils.md), [`api.js`](api.md), [`db.js`](db.js), [`merge.js`](merge.js) (`resolveAlias`).

## Related docs

- [company.md](company.md) — conceptual overview of the company panel
- [loader.md](loader.md) — async section loads after `openCompany`
- [contact.md](contact.md) — drawer bridge (`drGmail`, etc.)
