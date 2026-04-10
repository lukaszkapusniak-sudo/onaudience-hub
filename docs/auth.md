# `auth.js` — Supabase Auth and profile

**Path:** [`www/hub/auth.js`](../www/hub/auth.js)

Uses the **Supabase JS client** from the UMD script in `index.html`. Client is created with `storageKey: 'oaHubSession'`, `detectSessionInUrl: true` (OAuth redirect fragments), and a small **async mutex** for auth operations.

## Exports

| Export                                           | Role                                                                                   |
| ------------------------------------------------ | -------------------------------------------------------------------------------------- |
| `getSession` / `getAuthToken` / `getCurrentUser` | Session helpers.                                                                       |
| `signInWithGoogle`                               | OAuth redirect (production redirect URL embedded in code for GitHub Pages deployment). |
| `signIn`                                         | Email/password — intended for CI test accounts.                                        |
| `signOut`                                        | Clears session.                                                                        |
| `onAuthStateChange`                              | Subscription wrapper.                                                                  |
| `getUserProfile`                                 | Reads `user_profiles` via REST.                                                        |
| `logActivity`                                    | Inserts audit rows (used by `oaLog*` in [`hub-app.md`](hub-app.md)).                   |
| `renderLoginScreen` / `hideLoginScreen`          | Gate the `.app` shell until authenticated.                                             |
| `renderUserBadge`                                | Nav user chip.                                                                         |

## Demo mode

Imports [`demo.js`](demo.md) `enterDemoMode` / `isDemoMode` where guest access must bypass strict checks.

## Security note

RLS and policies are **server-side**; the client only holds the anon key + user JWT.
