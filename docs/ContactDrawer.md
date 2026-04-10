# `ContactDrawer.vue` — Vue port of the contact drawer

**Paths:** [`frontend/src/components/ContactDrawer.vue`](../frontend/src/components/ContactDrawer.vue), demo [`ContactDrawerDemoView.vue`](../frontend/src/views/ContactDrawerDemoView.vue)

First **legacy hub** UI migrated from [`www/hub/drawer.js`](../www/hub/drawer.js) + [`drawer.md`](drawer.md).

## Route

- **`/demo/contact-drawer`** — sample contact + opens the drawer (see [`router/index.ts`](../frontend/src/router/index.ts)).

## Props / events

| Prop      | Type                 | Role                                                              |
| --------- | -------------------- | ----------------------------------------------------------------- |
| `open`    | `boolean`            | Panel visibility.                                                 |
| `contact` | `HubContact \| null` | Data from [`types/contact.ts`](../frontend/src/types/contact.ts). |

| Emit            | When                                   |
| --------------- | -------------------------------------- |
| `close`         | Overlay, ×, or parent-driven.          |
| `draft-email`   | Draft Email (wire to meeseeks later).  |
| `linkedin`      | LinkedIn ↗.                            |
| `gmail-history` | Gmail History (wire to company intel). |
| `research`      | Full Research ↗ (wire to AI bar).      |

## Related

- [`HomeView.md`](HomeView.md) — link from `/`
- [`hub-app.md`](hub-app.md) — legacy drawer still used in production hub until full migration
