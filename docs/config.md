# `config.js` — constants and taxonomy

**Path:** [`www/hub/config.js`](../www/hub/config.js)

## Environment re-exports

Re-exports from [`config.generated.md`](config.generated.md): **`SB_URL`**, **`SB_KEY`**, **`HDR`**, **`LEMLIST_PROXY`**, **`GMAIL_CLIENT_ID`**, **`NOMINATIM_URL`**.

## Models

- **`MODEL_RESEARCH`** — Claude model id for factual / research tasks.
- **`MODEL_CREATIVE`** — Claude model id for email / creative tasks.

## Product data

- **`TAG_RULES`** — Keyword → tag labels for DSP, SSP, regions, etc. (drives [`list.md`](list.md) tag panel).
- **`SEED_RAW`** — Legacy seed name list for imports / reference.
- **`PAL`** — Avatar colour pairs for [`utils.md`](utils.md).
- **`MC_PERSONAS`** — Meeseeks composer personas ([`meeseeks.md`](meeseeks.md)).
- **`OA_GVL`**, **`TCF_P`**, **`TCF_SP`**, **`TCF_F`**, **`TCF_SF`** — TCF copy and onAudience vendor stub ([`tcf.md`](tcf.md)).
