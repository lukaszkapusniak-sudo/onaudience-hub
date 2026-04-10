# `aud-icp.js` — ICP audience finder

**Path:** [`www/hub/aud-icp.js`](../www/hub/aud-icp.js)

**ICP (ideal customer profile)** flow: user describes a profile in natural language; the app uses **Claude** to score or match companies against [`S.companies`](state.md), then save results as an audience.

## Flow

1. **`icpFindByIcp`** — Opens modal (`icp-prompt` textarea) showing how many companies will be considered.
2. **`icpMatch`** — Runs matching (guarded by internal `_scoutPending` so it only runs from explicit button).
3. **Save steps** — `icpSaveStep`, `icpSaveAudience`, `icpEditModal`, `icpRegenHook`, `icpPatchAudience` manage wizard UI and persistence via `sbSaveAudience` / `renderAudiencesPanel` imported from [`audiences.js`](audiences.md).

## Dependencies

[`anthropicFetch`](api.md), [`db.js`](db.md) `audiences`, [`hub.js`](hub.md) `clog`.
