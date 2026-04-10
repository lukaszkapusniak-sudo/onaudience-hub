# `demo.js` — guest demo mode

**Path:** [`www/hub/demo.js`](../www/hub/demo.js)

Provides **DEMO_COMPANIES** and related **fictional** contacts (poets/writers naming) so visitors can explore the UI **without Supabase auth**. Demo mode restricts writes and AI features per checks in [`hub.js`](hub.md) and [`auth.js`](auth.md).

## Exports

| Export                               | Role                                   |
| ------------------------------------ | -------------------------------------- |
| `isDemoMode`                         | Predicate used across hub.             |
| `loadDemoData`                       | Hydrates `S` with demo rows.           |
| `showDemoBanner` / `patchNavForDemo` | UI affordances.                        |
| `enterDemoMode` / `exitDemoMode`     | Toggle + storage.                      |
| `demoGuard`                          | Blocks actions that need real backend. |
| `initDoom`                           | Easter-egg / joke hook (see source).   |

When demo is active, [`hub.js`](hub.md) `_loadCompanyContacts` uses local `S.contacts` instead of `dbContacts.byCompany`.
