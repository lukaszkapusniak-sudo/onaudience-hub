# `meeseeks.js` — Meeseeks composer

**Path:** [`www/hub/meeseeks.js`](../www/hub/meeseeks.js)

**Meeseeks** is the outbound **email composer** UI: pick company, contacts, persona, generate copy via Claude ([`api.md`](api.md)), copy to clipboard.

## Config

Personas come from **`MC_PERSONAS`** in [`config.js`](config.md) (re-exported to `window` for HTML). Model defaults to **`MODEL_CREATIVE`**.

## Key exports

| Area               | Functions                                                                                                     |
| ------------------ | ------------------------------------------------------------------------------------------------------------- |
| **Composer shell** | `openComposer`, `closeComposer`, character counter `mcHint`                                                   |
| **Company picker** | `mcToggleCoSearch`, `mcFilterCos`, `mcPickCo`, `mcCoSearchKey`                                                |
| **Contacts**       | `mcPickContact`, `mcAllContacts` — merges DB contacts (`S.mcDbContacts`) with AI-suggested (`S.mcAiContacts`) |
| **Generation**     | `mcGenerate`, `mcCopy` — `anthropicFetch` with selected persona system prompt                                 |
| **Panel**          | `openPanel` / persona picker integration with [`hub.js`](hub.md)                                              |

## Dependencies

[`db.js`](db.md) `contacts` for resolving recipients; [`utils.js`](utils.md) for avatars and escaping.
