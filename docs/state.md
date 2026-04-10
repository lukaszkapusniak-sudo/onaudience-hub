# `state.js` — shared mutable store `S`

**Path:** [`www/hub/state.js`](../www/hub/state.js)

Single **default export** object `S` holding all client-side hub state. Not reactive (no Vue); modules read/write fields directly.

## Fields (summary)

| Group         | Keys                                                                                                                                                                                |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Data**      | `companies`, `totalCompaniesInDb`, `contacts`, `allRelations`                                                                                                                       |
| **UI**        | `activeTab`, `activeFilter`, `searchQ`, `activeTags`, `tagLogic`, `sortBy`, `tagPanelOpen`, `currentCompany`, `currentContact`, `consoleLog`, `aiSet`, `_modalMode`, `mcAiContacts` |
| **TCF**       | `tcfSelected` (`Set`, max 4 slugs)                                                                                                                                                  |
| **Audiences** | `audiences`, `activeAudience`, `_audienceBuiltIds`                                                                                                                                  |

## Usage

[`app.js`](hub-app.md) assigns **`window._oaState = S`** so late-loaded or inline code can read the same reference. Prefer importing `S` inside modules when possible.
