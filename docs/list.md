# `list.js` — company list, filters, tags, sort

**Path:** [`www/hub/list.js`](../www/hub/list.js)

Renders the scrollable **company list** and drives **filtering** from shared [`state.js`](state.md): `activeFilter`, `searchQ`, `activeTags`, `tagLogic`, `sortBy`, plus optional AI match set `S.aiSet`.

## Main exports

| Export                             | Role                                                                                        |
| ---------------------------------- | ------------------------------------------------------------------------------------------- |
| `countPool` / `tagCountsFor`       | Derive visible pool for tag pill counts (respects “fresh” filter, search, type).            |
| `matchTags`                        | AND/OR tag logic using `getCoTags` + `TAG_RULES` from [`config.js`](config.md).             |
| `renderList`                       | Builds rows with avatars, ICP stars, type tags, completeness; calls `openCompany` on click. |
| `renderTagPanel` / `toggleTag*`    | Left tag panel UI.                                                                          |
| `setFilter`, `onSearch`, `setSort` | User input handlers updating `S` and re-rendering.                                          |
| `renderMetaPills`                  | Meta summary chips for the list header region.                                              |

## Dependencies

Uses [`utils.js`](utils.md) (`esc`, `_slug`, `getCoTags`, `getAv`, …), [`config.js`](config.md) (`TAG_RULES`), [`api.js`](api.md) (`anthropicFetch` for some enrichment paths), and [`hub.js`](hub.md) (`openCompany`, `sortCompanies`, `boldKw`, `completeness`, `clog`).

## Vue port

[`HubDataView.vue`](../frontend/src/views/HubDataView.vue) + [`companyList.ts`](../frontend/src/lib/companyList.ts) + [`tagRules.ts`](../frontend/src/config/tagRules.ts) — search, type chips, tag OR/AND, sort; rich rows / AI / `openCompany` still legacy or Phase 4+.
