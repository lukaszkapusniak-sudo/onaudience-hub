<script setup lang="ts">
import { onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { relTime } from '../../../lib/relTime';
import { useHubStore } from '../../../stores/hub';
import { useCompanyDetailStore } from '../store';
import CompanyAngleBlock from '../components/CompanyAngleBlock.vue';
import CompanyContactsBlock from '../components/CompanyContactsBlock.vue';
import CompanyFactsTable from '../components/CompanyFactsTable.vue';
import CompanyHeader from '../components/CompanyHeader.vue';
import CompanyIntelBlock from '../components/CompanyIntelBlock.vue';
import CompanyRelationsBlock from '../components/CompanyRelationsBlock.vue';

const route = useRoute();
const router = useRouter();
const hub = useHubStore();
const store = useCompanyDetailStore();

function slug() {
  return String(route.params.slug ?? '');
}

async function load() {
  const s = slug();
  if (!s) return;
  // First try to find the company in the already-loaded hub store (fast)
  const fromCache = hub.companies.find((c) => c.id === s);
  if (fromCache) {
    store.currentCompany = fromCache;
    store.loadStatus = 'ok';
    void store.loadDetail(s); // still fetch fresh contacts + relations
  } else {
    await store.loadDetail(s);
  }
}

onMounted(() => {
  void load();
});

watch(
  () => route.params.slug,
  () => {
    store.clear();
    void load();
  },
);

function goBack() {
  router.push('/data');
}
</script>

<template>
  <div class="cdv">
    <!-- Back nav -->
    <div class="cdv__nav">
      <button type="button" class="cdv__back" @click="goBack">← Companies</button>
      <span v-if="store.currentCompany?.updated_at" class="cdv__updated">
        Updated {{ relTime(store.currentCompany.updated_at) }}
      </span>
    </div>

    <!-- Loading / error states -->
    <div v-if="store.loadStatus === 'loading'" class="cdv__msg">Loading…</div>
    <div v-else-if="store.loadStatus === 'error'" class="cdv__msg cdv__msg--err">
      {{ store.loadError }}
    </div>

    <!-- Panel -->
    <div v-else-if="store.currentCompany" class="cdv__panel">
      <CompanyHeader
        :company="store.currentCompany"
        @find-dms="store.findDecisionMakers()"
        @gen-angle="store.angleStatus = 'idle' /* opens picker in AngleBlock */"
        @refresh-news="store.refreshNews(store.currentCompany?.name ?? '')"
      />
      <CompanyFactsTable :company="store.currentCompany" />
      <CompanyAngleBlock />
      <CompanyContactsBlock @find-dms="store.findDecisionMakers()" />
      <CompanyRelationsBlock />
      <CompanyIntelBlock @refresh-news="store.refreshNews(store.currentCompany?.name ?? '')" />
    </div>
  </div>
</template>

<style scoped>
.cdv {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  background: #0c0c0a;
  color: #f0efe8;
  font-family: 'IBM Plex Sans', system-ui, sans-serif;
}

.cdv__nav {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.6rem 1.25rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
  position: sticky;
  top: 0;
  background: rgba(12, 12, 10, 0.9);
  backdrop-filter: blur(4px);
  z-index: 10;
}

.cdv__back {
  background: none;
  border: none;
  color: #7dd3fc;
  font-size: 0.8rem;
  cursor: pointer;
  font-family: inherit;
  padding: 0;
}

.cdv__back:hover {
  text-decoration: underline;
}

.cdv__updated {
  font-size: 0.72rem;
  color: #555550;
  margin-left: auto;
}

.cdv__msg {
  padding: 2rem 1.25rem;
  font-size: 0.85rem;
  color: #8a8a82;
}

.cdv__msg--err {
  color: #f87171;
}

.cdv__panel {
  display: flex;
  flex-direction: column;
}
</style>
