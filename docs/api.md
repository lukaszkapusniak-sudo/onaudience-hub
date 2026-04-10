# `api.js` — Supabase load, Anthropic, Lemlist proxy, stats

**Path:** [`www/hub/api.js`](../www/hub/api.js)

Cross-cutting **network and AI** layer: bridges [`db.js`](db.md) with UI concerns, caching, and third-party APIs.

## Major blocks

| Block                      | Purpose                                                                                                                                                                                                                                                                                    |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **`clog`**                 | Proxies to `window.clog` from `hub.js` so modules can log without importing `hub.js` directly.                                                                                                                                                                                             |
| **Anthropic key UI**       | `getApiKey`, `promptApiKey`, `toggleKeyPanel`, `saveKeyPanel` — personal key in `localStorage.oaAnthropicKey`.                                                                                                                                                                             |
| **`anthropicFetch` / MCP** | Calls shared proxy or direct API for Claude; used by audiences, vibe, meeseeks, etc.                                                                                                                                                                                                       |
| **`loadFromSupabase`**     | Paginated companies + contacts + relations; see [loader.md](loader.md).                                                                                                                                                                                                                    |
| **`setStatus`**            | Nav `#dbStatus` live/offline counts.                                                                                                                                                                                                                                                       |
| **Intelligence**           | `fetchGoogleNews` (lazy [`gnews.js`](gnews.md) + worker), `saveIntelligence`, cache helpers (`cacheGet`/`cacheSet`/`withCache`). Vue: [`hubRest.ts`](../frontend/src/lib/hubRest.ts) + [`intelligenceMerge.ts`](../frontend/src/lib/intelligenceMerge.ts) (`mergePressLinksIntelligence`). |
| **Anthropic / research**   | `anthropicFetch`, `researchFetch`, API key in `localStorage`. Vue: [`anthropicHub.ts`](../frontend/src/lib/anthropicHub.ts).                                                                                                                                                               |
| **Geocoding**              | `geocodeCity` / `saveGeocode` using `NOMINATIM_URL`. Vue: [`hubGeo.ts`](../frontend/src/lib/hubGeo.ts) (default URL matches generated hub config).                                                                                                                                         |
| **Lemlist**                | `lemlistFetch`, `lemlistCampaigns`, `lemlistAddLead`, `lemlistWriteBack` via [`LEMLIST_PROXY`](config.md).                                                                                                                                                                                 |
| **Stats**                  | Aggregate helpers for nav / dashboards.                                                                                                                                                                                                                                                    |

## Saves

`saveCompany` / `saveContact` delegate to `db.js` upserts; activity logging is typically triggered via `window.oaLog*` from [`hub-app.md`](hub-app.md).
