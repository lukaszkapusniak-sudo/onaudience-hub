# `App.vue` — Vue root shell

**Path:** [`frontend/src/App.vue`](../frontend/src/App.vue)

Single-file component that wraps the entire Vue SPA. It contains **no business logic** from the legacy hub.

## Script

`<script setup lang="ts">` imports only `RouterView` from `vue-router`.

## Template

A single `<RouterView />` — child routes (currently only [`HomeView.md`](HomeView.md)) render in place.

## Build / deploy

Bundled by Vite with [`frontend/vite.config.ts`](../frontend/vite.config.ts): production **`base`** is `/onaudience-hub/`. The legacy hub is **not** part of this component; it is served/copied separately under `/hub/`.

## Related

- [`HomeView.md`](HomeView.md)
- [`hub-app.md`](hub-app.md) — real product UI in `www/hub/`
