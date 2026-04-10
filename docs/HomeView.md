# `HomeView.vue` — landing shell

**Path:** [`frontend/src/views/HomeView.vue`](../frontend/src/views/HomeView.vue)

Default route **`/`** (see [`frontend/src/router/index.ts`](../frontend/src/router/index.ts)). Marketing-style **hero** explaining that the Vue app is a thin shell and the **legacy hub** remains under `/hub/`.

## Script

| Symbol     | Meaning                                                                                             |
| ---------- | --------------------------------------------------------------------------------------------------- |
| `year`     | Current year for footer.                                                                            |
| `hubEntry` | `` `${import.meta.env.BASE_URL}hub/index.html` `` — works with dev `/` and prod `/onaudience-hub/`. |

## Template

- Header: eyebrow “onAudience”, title, explanatory lead.
- Primary CTA: **Open legacy hub** → static `hub/index.html`.
- Footer: copyright + “built with Vite”.

## Styles

Scoped block: dark radial gradient, IBM Plex Sans, blue primary button. Largely independent of [`frontend/src/style.css`](../frontend/src/style.css) though global `:root` / `#app` rules still apply from that file.

## Related

- [`App.md`](App.md)
- Hub elaboration: [`hub-app.md`](hub-app.md), [`components.md`](components.md)
