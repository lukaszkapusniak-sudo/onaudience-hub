# `config.generated.js` — build-time hub secrets

**Path:** [`www/hub/config.generated.js`](../www/hub/config.generated.js) (generated — **do not hand-edit**)

Produced by [`scripts/generate-hub-config.mjs`](../scripts/generate-hub-config.mjs), typically from **`.env`** during `npm run dev` / `npm run build`.

## Variables consumed

| Env / fallback    | Exported constant                                        |
| ----------------- | -------------------------------------------------------- |
| `SB_URL`          | `SB_URL`                                                 |
| `SB_ANON_KEY`     | `SB_KEY`, baked into `HDR`                               |
| `GMAIL_CLIENT_ID` | `GMAIL_CLIENT_ID`                                        |
| `NOMINATIM_URL`   | `NOMINATIM_URL`                                          |
| (derived)         | `LEMLIST_PROXY` = `${SB_URL}/functions/v1/lemlist-proxy` |

## Security

The anon key and OAuth client id are **public in the browser bundle** by design; real protection is **Supabase RLS** and Google OAuth consent screens. Do not commit real **service role** keys to this file.

See [`.env.example`](../.env.example) for the full list of variable names used in the repo.
