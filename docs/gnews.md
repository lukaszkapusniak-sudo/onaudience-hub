# `gnews.js` — Google News RSS (CORS proxy + worker)

**Paths:** [`www/hub/gnews.js`](../www/hub/gnews.js), [`gnews-worker.js`](../www/hub/gnews-worker.js), [`gnews-parse.js`](../www/hub/gnews-parse.js)

| Role          | Detail                                                                                                                         |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **CORS**      | Fetches `news.google.com` RSS via `corsproxy.io` (`buildGoogleNewsProxyUrl`).                                                  |
| **Lazy load** | `api.js` dynamically imports `gnews.js` on first `fetchGoogleNews` call — no worker/parser on initial hub load.                |
| **Worker**    | `gnews-worker.js` (module worker) runs `fetch` + RSS parsing off the main thread; `gnews-parse.js` is DOM-free for worker use. |
| **Fallback**  | If `Worker` is unavailable, `gnews.js` fetches and parses on the main thread.                                                  |

**Related:** [`api.md`](api.md) (`fetchGoogleNews`), [`hub.md`](hub.md) (intelligence panel).
