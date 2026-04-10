# `style.css` — hub global styles

**Path:** [`www/hub/style.css`](../www/hub/style.css)

Single large stylesheet for the **legacy hub** loaded by [`index.html`](../www/hub/index.html) (with cache-bust query from the build stamp).

## Contents (conceptual)

- **CSS variables** for themes (`data-theme` light/dark), typography (IBM Plex), colours, borders
- **Layout**: `.app`, `.nav`, `.left`, `#listScroll`, `#coPanel`, `.ib` info box, modals, drawers
- **Components**: buttons (`.btn`), tags (`.tag`, `.t-pill`), AI bar, console, audience panels, TCF list, Lemlist modal, tutorial overlays

Changing visual design for `/hub/` almost always means editing this file (plus occasional inline styles in JS-generated HTML).
