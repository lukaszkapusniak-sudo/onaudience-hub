import { createRouter, createWebHistory } from 'vue-router';

import HubShellLayout from '../layouts/HubShellLayout.vue';
import ContactDrawerDemoView from '../views/ContactDrawerDemoView.vue';
import HomeView from '../views/HomeView.vue';
import HubAppView from '../views/HubAppView.vue';
import HubDataView from '../views/HubDataView.vue';
import LemlistView from '../views/LemlistView.vue';
import MigrationHomeView from '../views/MigrationHomeView.vue';

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/companies', redirect: '/data' },
    {
      path: '/',
      component: HubShellLayout,
      children: [
        { path: '', name: 'hub', component: HubAppView },
        {
          path: 'migrate',
          name: 'migrate',
          component: MigrationHomeView,
        },
        {
          path: 'about',
          name: 'about',
          component: HomeView,
        },
        {
          path: 'data',
          name: 'hub-data',
          component: HubDataView,
        },
        {
          path: 'lemlist',
          name: 'lemlist',
          component: LemlistView,
        },
        {
          path: 'demo/contact-drawer',
          name: 'contact-drawer-demo',
          component: ContactDrawerDemoView,
        },
      ],
    },
  ],
});
