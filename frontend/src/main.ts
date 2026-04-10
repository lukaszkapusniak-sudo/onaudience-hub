import { createPinia } from 'pinia';
import { createApp } from 'vue';

import { hydrateAuthFromUrl } from './lib/supabaseApp';
import App from './App.vue';
import { router } from './router';

import './style.css';

hydrateAuthFromUrl().finally(() => {
  const app = createApp(App);
  app.use(createPinia());
  app.use(router);
  app.mount('#app');
});
