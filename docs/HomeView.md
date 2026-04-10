# `HomeView.vue` — About / migration copy

**Path:** [`frontend/src/views/HomeView.vue`](../frontend/src/views/HomeView.vue)

Route **`/about`** (see [`frontend/src/router/index.ts`](../frontend/src/router/index.ts)). Short **marketing / migration** copy: production **hub** is route **`/`** ([`HubAppView.vue`](../frontend/src/views/HubAppView.vue)) embedding legacy `hub/index.html`. Secondary CTA: **Contact drawer (Vue)** → [`/demo/contact-drawer`](ContactDrawer.md).

## Script

| Symbol    | Meaning                                                                                                                          |
| --------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `year`    | Current year for footer.                                                                                                         |
| `hubRoot` | `` `${import.meta.env.BASE_URL}` `` — site root where [`HubAppView.vue`](../frontend/src/views/HubAppView.vue) hosts the iframe. |

## Template

- Header: eyebrow “onAudience”, title, explanatory lead.
- Primary CTA: **Open hub (Vue shell)** → router `/`.
- Secondary: **Contact drawer (Vue)** → [`ContactDrawerDemoView.vue`](../frontend/src/views/ContactDrawerDemoView.vue) ([`ContactDrawer.md`](ContactDrawer.md)).
- Footer: copyright + “built with Vite”.

## Styles

Scoped block: dark radial gradient, IBM Plex Sans, blue primary button. Largely independent of [`frontend/src/style.css`](../frontend/src/style.css) though global `:root` / `#app` rules still apply from that file.

## Related

- [`App.md`](App.md)
- Hub elaboration: [`hub-app.md`](hub-app.md), [`components.md`](components.md)
