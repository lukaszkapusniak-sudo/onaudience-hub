# `vibe.js` — Vibe / Explorium prospecting (Claude + MCP)

**Path:** [`www/hub/vibe.js`](../www/hub/vibe.js)

Uses **Anthropic** with the **Vibe MCP** server (`https://mcp.vibe.ai/mcp`) to enrich companies and prospects. Requires a **personal Anthropic key** (`localStorage.oaAnthropicKey`).

## Capabilities (documented in source)

- `match-business`, `match-prospects`, `enrich-business`, `enrich-prospects` style workflows
- **Not** implemented: bulk role search without MCP entity fetch (see file header comments).

## Main exports

| Export                                 | Role                                                                   |
| -------------------------------------- | ---------------------------------------------------------------------- |
| `vibeEnrichCompany`                    | Domain + name → firmographics JSON-ish payload.                        |
| `vibeEnrichLead` / `vibeEnrichContact` | Person-level enrichment.                                               |
| `vibeSearchCompanies`                  | Used by Company Finder in [`hub-app.md`](hub-app.md) (`vibeDoSearch`). |

Internal `_vibeFetch` calls [`api.md`](api.md) `anthropicFetch` with `mcp_servers: [VIBE_MCP]` and parses `mcp_tool_result` blocks.

## Cost note

Source comments reference Explorium **credit** usage per call type — treat as product documentation, not enforced in code.
