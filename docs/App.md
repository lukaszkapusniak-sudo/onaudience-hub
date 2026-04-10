# `App.vue` — Vue root shell

**Path:** [`frontend/src/App.vue`](../frontend/src/App.vue)

Single-file component that wraps the entire Vue SPA. It contains **no business logic** from the legacy hub.

## Script

`<script setup lang="ts">` imports only `RouterView` from `vue-router`.

## Template

A single `<RouterView />` — default route **`/`** is [`HubAppView.vue`](HubAppView.md) (iframe host); **`/about`** is [`HomeView.md`](HomeView.md).

## Build / deploy

Bundled by Vite with [`frontend/vite.config.ts`](../frontend/vite.config.ts): production **`base`** is `/onaudience-hub/`. The legacy hub bundle is **embedded** from route `/` and still copied to **`dist/hub/`** for direct URLs and the iframe `src`.

## Related

- [`HomeView.md`](HomeView.md)
- [`hub-app.md`](hub-app.md) — legacy hub source in `www/hub/`
