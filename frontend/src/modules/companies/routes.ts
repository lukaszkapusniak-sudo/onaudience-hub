import type { RouteRecordRaw } from 'vue-router';

export const companyRoutes: RouteRecordRaw[] = [
  {
    path: 'companies/:slug',
    name: 'company-detail',
    component: () => import('./views/CompanyDetailView.vue'),
  },
];
