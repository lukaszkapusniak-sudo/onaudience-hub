<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { RouterLink, RouterView, useRoute } from 'vue-router';

import { getSupabaseApp } from '../lib/supabaseApp';
import ComposerDrawer from '../modules/composer/components/ComposerDrawer.vue';
import { useComposerStore } from '../modules/composer/store';
import { useHubStore } from '../stores/hub';

const route = useRoute();
const hub = useHubStore();
const composer = useComposerStore();

const userEmail = ref<string | null>(null);
let removeAuthListener: (() => void) | null = null;

const theme = ref<'dark' | 'light'>('dark');

const nav = [
  { to: '/data', label: 'Companies', name: 'hub-data' },
  { to: '/contacts', label: 'Contacts', name: 'contacts' },
  { to: '/audiences', label: 'Audiences', name: 'audiences' },
  { to: '/lemlist', label: 'Lemlist', name: 'lemlist' },
  { to: '/tcf', label: 'TCF', name: 'tcf' },
  { to: '/merge', label: 'Merge', name: 'merge' },
  { to: '/about', label: 'About', name: 'about' },
] as const;

const statsLine = computed(() => {
  if (hub.loadStatus !== 'ok') return null;
  const c = hub.companyCount;
  const t = hub.totalCompaniesInDb;
  const r = hub.relationsLoadStatus === 'ok' ? ` · ${hub.relationCount} relations` : '';
  return `${c} / ${t} companies${r}`;
});

function applyTheme(t: 'dark' | 'light') {
  theme.value = t;
  document.documentElement.setAttribute('data-theme', t);
  localStorage.setItem('oaTheme', t);
}

function toggleTheme() {
  applyTheme(theme.value === 'dark' ? 'light' : 'dark');
}

async function refreshSession() {
  const sb = getSupabaseApp();
  if (!sb) {
    userEmail.value = null;
    return;
  }
  const {
    data: { session },
  } = await sb.auth.getSession();
  userEmail.value = session?.user?.email ?? null;
}

async function signOut() {
  const sb = getSupabaseApp();
  await sb?.auth.signOut();
  userEmail.value = null;
}

onMounted(() => {
  const stored = localStorage.getItem('oaTheme') as 'dark' | 'light' | null;
  applyTheme(stored === 'light' ? 'light' : 'dark');

  void refreshSession();
  const sb = getSupabaseApp();
  if (sb) {
    const { data } = sb.auth.onAuthStateChange((_e, session) => {
      userEmail.value = session?.user?.email ?? null;
    });
    removeAuthListener = () => data.subscription.unsubscribe();
  }

  void Promise.all([hub.loadCompaniesFirstPage(), hub.loadCompanyRelations()]);
});

onUnmounted(() => {
  removeAuthListener?.();
});
</script>

<template>
  <div class="shell">
    <header class="shell__top">
      <div class="shell__brand">
        <span class="shell__logo">onAudience</span>
        <span class="shell__title">Hub</span>
      </div>
      <nav class="shell__quick" aria-label="Quick links">
        <RouterLink
          v-for="item in nav"
          :key="item.to"
          :to="item.to"
          class="shell__quick-link"
          :class="{ 'is-active': route.name === item.name }"
        >
          {{ item.label }}
        </RouterLink>
        <RouterLink
          to="/demo/contact-drawer"
          class="shell__quick-link shell__quick-link--dim"
          :class="{ 'is-active': route.name === 'contact-drawer-demo' }"
        >
          Drawer demo
        </RouterLink>
      </nav>
      <div class="shell__actions">
        <button
          type="button"
          class="shell__compose"
          title="Open email composer"
          @click="composer.open({})"
        >
          ✉ Compose
        </button>
        <button type="button" class="shell__theme" :title="`Theme: ${theme}`" @click="toggleTheme">
          {{ theme === 'dark' ? '◐ Light' : '◑ Dark' }}
        </button>
        <span v-if="userEmail" class="shell__user" :title="userEmail">{{ userEmail }}</span>
        <span v-else class="shell__user shell__user--muted">Not signed in</span>
        <button v-if="userEmail" type="button" class="shell__out" @click="signOut">Sign out</button>
      </div>
    </header>

    <div v-if="statsLine || hub.loadStatus === 'loading'" class="shell__stats" aria-live="polite">
      <span v-if="hub.loadStatus === 'loading'" class="shell__stats-muted">Loading stats…</span>
      <template v-else-if="statsLine">
        <span class="shell__stats-dot" :class="hub.loadStatus === 'ok' ? 'live' : ''" />
        <span>{{ statsLine }}</span>
      </template>
    </div>

    <div class="shell__body">
      <aside class="shell__rail" aria-label="Primary">
        <RouterLink
          v-for="item in nav"
          :key="`r-${item.to}`"
          :to="item.to"
          class="shell__rail-link"
          :class="{ 'is-active': route.name === item.name }"
        >
          {{ item.label }}
        </RouterLink>
      </aside>
      <main class="shell__main">
        <RouterView />
      </main>
    </div>

    <!-- Global composer drawer — rendered via Teleport to body inside component -->
    <ComposerDrawer />
  </div>
</template>

<style scoped>
.shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--shell-bg, #0c0c0a);
  color: var(--shell-fg, #f0efe8);
  font-family: 'IBM Plex Sans', system-ui, sans-serif;
}

.shell__top {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem 1.25rem;
  padding: 0.65rem 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(0, 0, 0, 0.35);
}

.shell__brand {
  display: flex;
  align-items: baseline;
  gap: 0.35rem;
  font-weight: 600;
  letter-spacing: -0.02em;
}

.shell__logo {
  color: #c084fc;
  font-size: 0.95rem;
}

.shell__title {
  font-size: 0.85rem;
  color: #8a8a82;
  font-weight: 500;
}

.shell__quick {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  align-items: center;
  flex: 1;
  min-width: 0;
}

.shell__quick-link {
  padding: 0.35rem 0.65rem;
  border-radius: 4px;
  font-size: 0.8rem;
  color: #b5b5ad;
  text-decoration: none;
  border: 1px solid transparent;
}

.shell__quick-link:hover {
  color: #f0efe8;
  background: rgba(255, 255, 255, 0.06);
}

.shell__quick-link.is-active {
  color: #f0efe8;
  border-color: rgba(192, 132, 252, 0.45);
  background: rgba(192, 132, 252, 0.08);
}

.shell__quick-link--dim {
  opacity: 0.75;
}

.shell__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  margin-left: auto;
}

.shell__compose {
  height: 28px;
  padding: 0 0.6rem;
  border-radius: 4px;
  border: 1px solid rgba(192, 132, 252, 0.35);
  background: rgba(192, 132, 252, 0.08);
  color: #c084fc;
  font-size: 0.75rem;
  cursor: pointer;
  font-family: inherit;
}

.shell__compose:hover {
  background: rgba(192, 132, 252, 0.15);
}

.shell__theme {
  height: 28px;
  padding: 0 0.5rem;
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: #1a1a18;
  color: #e7e7e0;
  font-size: 0.75rem;
  cursor: pointer;
  font-family: inherit;
}

.shell__theme:hover {
  background: #242421;
}

.shell__user {
  font-size: 0.75rem;
  color: #7dd3fc;
  max-width: 12rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.shell__user--muted {
  color: #6b6b63;
}

.shell__out {
  height: 28px;
  padding: 0 0.5rem;
  border-radius: 4px;
  border: 1px solid rgba(248, 113, 113, 0.35);
  background: transparent;
  color: #fca5a5;
  font-size: 0.75rem;
  cursor: pointer;
  font-family: inherit;
}

.shell__out:hover {
  background: rgba(248, 113, 113, 0.12);
}

.shell__stats {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.35rem 1rem;
  font-size: 0.78rem;
  color: #8a8a82;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.shell__stats-muted {
  color: #6b6b63;
}

.shell__stats-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #6b6b63;
}

.shell__stats-dot.live {
  background: #4ade80;
  box-shadow: 0 0 6px rgba(74, 222, 128, 0.5);
}

.shell__body {
  flex: 1;
  display: flex;
  min-height: 0;
}

.shell__rail {
  width: 11rem;
  flex-shrink: 0;
  padding: 0.75rem 0.5rem;
  border-right: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.shell__rail-link {
  padding: 0.45rem 0.65rem;
  border-radius: 4px;
  font-size: 0.8rem;
  color: #9c9c94;
  text-decoration: none;
}

.shell__rail-link:hover {
  color: #f0efe8;
  background: rgba(255, 255, 255, 0.05);
}

.shell__rail-link.is-active {
  color: #f0efe8;
  background: rgba(192, 132, 252, 0.12);
  border-left: 2px solid #c084fc;
  padding-left: calc(0.65rem - 2px);
}

.shell__main {
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.shell__main > :deep(*) {
  flex: 1;
  min-height: 0;
}
</style>
