import type { App } from 'vue';
import { createApp } from 'vue';
import { createPinia } from 'pinia';

import ComposerDrawer from './components/ComposerDrawer.vue';

/** Vue plugin — mounts `<ComposerDrawer>` into a dedicated `<div>` on `<body>`. */
export const composerPlugin = {
  install(app: App) {
    // Share the same Pinia instance so `useComposerStore` reads the same state
    const pinia = app.config.globalProperties.$pinia as ReturnType<typeof createPinia>;

    const mountEl = document.createElement('div');
    mountEl.id = 'mc-drawer-mount';
    document.body.appendChild(mountEl);

    const drawerApp = createApp(ComposerDrawer);
    if (pinia) drawerApp.use(pinia);
    drawerApp.mount(mountEl);
  },
};
