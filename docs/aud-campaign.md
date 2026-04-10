# `aud-campaign.js` — campaign hooks and Lemlist launch

**Path:** [`www/hub/aud-campaign.js`](../www/hub/aud-campaign.js)

Generates **outreach hooks** and **email templates** for a saved audience using **`MODEL_CREATIVE`** and optional **Meeseeks persona** prompts, then can **launch** via [`lemlist.md`](lemlist.md).

## Exports

| Function                                 | Role                                                                    |
| ---------------------------------------- | ----------------------------------------------------------------------- |
| `generateCampaignHook`                   | Short hook text in `#aud-hook-ta` from audience ICP + sample companies. |
| `generateEmailTemplate`                  | Longer template body.                                                   |
| `saveCampaignTemplate`                   | Persists template fields on the audience row.                           |
| `launchCampaign`                         | Orchestrates lemlist / export paths.                                    |
| `audDraftEmailToCo` / `audGenAngleForCo` | Per-company shortcuts from audience detail.                             |

Uses `anthropicFetch` and `lemlistFetch` from [`api.md`](api.md), `companies`/`audiences` from [`db.md`](db.md), and `sbSaveAudience` / `renderAudiencesPanel` from [`audiences.js`](audiences.md).
