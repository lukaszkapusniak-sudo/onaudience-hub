# `drawer.js` — contact drawer

**Path:** [`www/hub/drawer.js`](../www/hub/drawer.js)

Right-hand **contact drawer** (`#ctDrawer`) for inspecting a single contact without leaving the page.

## Exports

| Function                | Behavior                                                                                                                                                    |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `openDrawer(ctId)`      | Resolves contact by `id` or name slug; fills avatar, title row, field grid (email, phone, LinkedIn, outreach status, relationship, Lemlist activity block). |
| `closeDrawer()`         | Hides overlay; clears `S.currentContact`.                                                                                                                   |
| `openContactFull(ctId)` | Opens parent **company** in detail when possible, then opens drawer.                                                                                        |
| `drEmail()`             | [`meeseeks.js`](meeseeks.md) `openComposer` with contact + company context.                                                                                 |
| `drLinkedIn()`          | Opens LinkedIn URL.                                                                                                                                         |
| `drGmail()`             | Opens company panel, scrolls to intel, `bgRefreshIntel()` — bridge to Gmail/news context ([gmail.md](gmail.md)).                                            |
| `drResearch()`          | `aiQuick` with name + company; focuses AI bar.                                                                                                              |

## Data

Reads from **`S.contacts`** ([`state.md`](state.md)). Lemlist subsection renders when campaign or activity fields exist.

## Related

- [contact.md](contact.md) — CRM field semantics
- [meeseeks.md](meeseeks.md) — composer
- [ContactDrawer.md](ContactDrawer.md) — Vue + TypeScript port (demo route; production still uses this module)
