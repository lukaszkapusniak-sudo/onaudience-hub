# `audiences.js` — audience management

**Path:** [`www/hub/audiences.js`](../www/hub/audiences.js)

Implements **saved audiences**: named segments of companies with filters, optional **system** lists, **map** view state, AI-assisted **build** (`audAIBuild`), CSV export, contact discovery, and company overlays.

## Data

Persists rows via [`db.js`](db.md) `audiences` (`sbSaveAudience`, load in `renderAudiencesPanel`). [`state.js`](state.md) holds `S.audiences` and `S.activeAudience`.

## UI surfaces

- Left **`#audiencesPanel`** — list of system + user audiences, search (`audFilter`).
- Detail **`#aud-detail-wrap`** — members, ICP prompt, hooks, Lemlist push hooks.
- Map — Leaflet-based audience geography (`_audMap` state inside module).

## Re-exports

Heavy ICP and campaign logic lives in submodules; `audiences.js` **re-exports** at the bottom:

- From [`aud-icp.md`](aud-icp.md): `icpFindByIcp`, `icpMatch`, `icpSaveStep`, `icpSaveAudience`, `icpEditModal`, `icpRegenHook`, `icpPatchAudience`
- From [`aud-campaign.md`](aud-campaign.md): `generateCampaignHook`, `generateEmailTemplate`, `saveCampaignTemplate`, `launchCampaign`, `audDraftEmailToCo`, `audGenAngleForCo`

## Dependencies

[`api.md`](api.md) (`anthropicFetch`, `anthropicMcpFetch`, geocode), [`utils.md`](utils.md), [`config.md`](config.md) (`MODEL_CREATIVE`).
