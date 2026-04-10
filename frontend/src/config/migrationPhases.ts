/**
 * Single source for /migrate UI. Keep in sync with docs/VUE_MIGRATION.md (manual).
 */
export type MigrationStatus = 'done' | 'partial' | 'planned';

export interface MigrationPhase {
  id: string;
  title: string;
  summary: string;
  status: MigrationStatus;
  legacyFiles: string[];
  vueRoutes: string[];
}

export const MIGRATION_PHASES: MigrationPhase[] = [
  {
    id: 'p0',
    title: 'Foundation',
    summary: 'Pinia, Supabase bridge, iframe host, /data, /lemlist, hub store contacts.',
    status: 'done',
    legacyFiles: ['app.js', 'auth.js', 'state.js'],
    vueRoutes: ['/', '/data', '/lemlist', '/about', '/demo/contact-drawer'],
  },
  {
    id: 'p1',
    title: 'Data layer parity',
    summary:
      'Company background pagination (200-row pages) done; relations + enrich_cache still TODO.',
    status: 'partial',
    legacyFiles: ['api.js', 'db.js'],
    vueRoutes: ['/data'],
  },
  {
    id: 'p2',
    title: 'App shell',
    summary: 'Replace iframe: nav, stats, tabs, theme — HubShellLayout.',
    status: 'planned',
    legacyFiles: ['app.js', 'index.html'],
    vueRoutes: ['/'],
  },
  {
    id: 'p3',
    title: 'Companies list',
    summary: 'Search, filters, tags, sort — list.js parity.',
    status: 'planned',
    legacyFiles: ['list.js'],
    vueRoutes: ['/data'],
  },
  {
    id: 'p4',
    title: 'Company detail',
    summary: 'Centre panel: company route, intel blocks, CRM actions.',
    status: 'planned',
    legacyFiles: ['hub.js'],
    vueRoutes: [],
  },
  {
    id: 'p5',
    title: 'Contacts + drawer',
    summary: 'Production ContactDrawer, list tab, actions.',
    status: 'partial',
    legacyFiles: ['drawer.js'],
    vueRoutes: ['/demo/contact-drawer'],
  },
  {
    id: 'p6',
    title: 'Audiences',
    summary: 'audiences.js, aud-campaign, aud-icp.',
    status: 'planned',
    legacyFiles: ['audiences.js', 'aud-campaign.js', 'aud-icp.js'],
    vueRoutes: [],
  },
  {
    id: 'p7',
    title: 'Integrations',
    summary: 'Gmail, meeseeks, merge, vibe, TCF, tutorial, demo.',
    status: 'planned',
    legacyFiles: ['gmail.js', 'meeseeks.js', 'merge.js', 'vibe.js', 'tcf.js', 'tutorial.js', 'demo.js'],
    vueRoutes: ['/lemlist'],
  },
  {
    id: 'p8',
    title: 'Cutover',
    summary: 'E2E on Vue; remove iframe; trim or delete www/hub JS.',
    status: 'planned',
    legacyFiles: ['www/hub/*'],
    vueRoutes: ['/'],
  },
];
