# `utils.js` — shared pure helpers

**Path:** [`www/hub/utils.js`](../www/hub/utils.js)

Stateless utilities imported almost everywhere.

## Highlights

| Export              | Role                                                                          |
| ------------------- | ----------------------------------------------------------------------------- |
| `classify`          | Infer `type` from free-text notes (`nogo`, `poc`, `client`, …).               |
| `_slug`             | Normalise company/person names to URL-safe slugs.                             |
| `getCoTags`         | Match company text against [`TAG_RULES`](config.md) keywords.                 |
| `getAv` / `ini`     | Deterministic avatar background + two-letter initials.                        |
| `tClass` / `tLabel` | CSS class + label for company type.                                           |
| `stars`             | Unicode star display for ICP 1–5.                                             |
| `esc`               | HTML entity escape for injected strings.                                      |
| `safeUrl`           | Prefix `https://` when missing.                                               |
| `relTime`           | Short relative timestamps.                                                    |
| `authHdr`           | Merge Supabase anon key + user JWT from `window._oaToken` into fetch headers. |

Imports **`TAG_RULES`**, **`PAL`** (avatar colours), **`SB_KEY`** from [`config.js`](config.md).
