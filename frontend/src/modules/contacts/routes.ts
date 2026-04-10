import type { RouteRecordRaw } from 'vue-router';

export const contactRoutes: RouteRecordRaw[] = [
  {
    path: 'contacts',
    name: 'contacts',
    component: () => import('./views/ContactsListView.vue'),
  },
];
