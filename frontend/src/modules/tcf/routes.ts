import type { RouteRecordRaw } from 'vue-router';

export const tcfRoutes: RouteRecordRaw[] = [
  {
    path: 'tcf',
    name: 'tcf',
    component: () => import('./views/TcfView.vue'),
  },
];
