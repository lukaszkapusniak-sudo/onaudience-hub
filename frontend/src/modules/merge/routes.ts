import type { RouteRecordRaw } from 'vue-router';

export const mergeRoutes: RouteRecordRaw[] = [
  {
    path: 'merge',
    name: 'merge',
    component: () => import('./views/MergeView.vue'),
  },
];
