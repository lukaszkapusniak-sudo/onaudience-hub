import { createRouter, createWebHistory } from 'vue-router';

import HubShellLayout from '../layouts/HubShellLayout.vue';
import { audienceRoutes } from '../modules/audiences';
import { companyRoutes } from '../modules/companies';
import { contactRoutes } from '../modules/contacts';
import { mergeRoutes } from '../modules/merge';
import { tcfRoutes } from '../modules/tcf';
import ContactDrawerDemoView from '../views/ContactDrawerDemoView.vue';
import HomeView from '../views/HomeView.vue';
import HubDataView from '../views/HubDataView.vue';
import LemlistView from '../views/LemlistView.vue';

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    // Legacy redirect kept so old bookmarks still work
    { path: '/companies', redirect: '/data' },
    {
      path: '/',
      component: HubShellLayout,
      children: [
        // Default → companies list
        { path: '', redirect: '/data' },
        { path: 'data', name: 'hub-data', component: HubDataView },
        { path: 'lemlist', name: 'lemlist', component: LemlistView },
        { path: 'about', name: 'about', component: HomeView },
        {
          path: 'demo/contact-drawer',
          name: 'contact-drawer-demo',
          component: ContactDrawerDemoView,
        },
        // Feature modules
        ...companyRoutes,
        ...contactRoutes,
        ...audienceRoutes,
        ...tcfRoutes,
        ...mergeRoutes,
      ],
    },
  ],
});
