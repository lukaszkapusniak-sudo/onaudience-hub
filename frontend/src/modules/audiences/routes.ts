import type { RouteRecordRaw } from 'vue-router';

export const audienceRoutes: RouteRecordRaw[] = [
  {
    path: 'audiences',
    name: 'audiences',
    component: () => import('./views/AudiencesView.vue'),
  },
  {
    path: 'audiences/:id',
    name: 'audience-detail',
    component: () => import('./views/AudienceDetailView.vue'),
  },
];
