# `tcf.js` — TCF / GVL privacy analyser

**Path:** [`www/hub/tcf.js`](../www/hub/tcf.js)

**TCF** tab: compares **IAB GVL** vendor entries with your CRM companies, computes a simple **privacy risk** score, supports multi-select comparison (up to **4** slugs in `S.tcfSelected`).

## GVL loading

`loadGVL()` fetches **vendor-list v3** JSON (primary URL via cors proxy, fallback direct). Caches on `window.gvlData`; failed loads degrade to empty vendor map. `getVendor(id)` looks up a vendor record.

## Risk model

`calcPrivacyRisk` inspects leg-int purposes, special purposes/features, retention days → score 1–5. `saveRiskScore` PATCHes `companies.privacy_risk_score`. `riskBar` renders inline HTML for the UI.

## UI exports

`renderTCFList`, `renderTCFCenter`, `tcfSelectRow`, `tcfClearSel`, `doGVLMatch`, GVL confirm modal (`promptGVLConfirm`, `executeGVLConfirm`, …).

## Config

Purpose/label maps **`TCF_P`**, **`TCF_SP`**, **`TCF_F`**, **`TCF_SF`**, and **`OA_GVL`** (onAudience’s own GVL entry) live in [`config.js`](config.md).
