<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { relTime } from '../../../lib/relTime';
import { useHubStore } from '../../../stores/hub';
import { useAudiencesStore } from '../store';
import AudienceScoutModal from '../components/AudienceScoutModal.vue';

const aud = useAudiencesStore();
const hub = useHubStore();
const router = useRouter();

const searchQ = ref('');

const filtered = computed(() => {
  const q = searchQ.value.toLowerCase().trim();
  if (!q) return aud.audiences;
  return aud.audiences.filter((a) => a.name.toLowerCase().includes(q));
});

function coverage(companyIds: string[] | null | undefined): string {
  if (!companyIds?.length) return '0';
  return String(companyIds.length);
}

onMounted(async () => {
  if (aud.loadStatus !== 'ok') await aud.load();
  if (hub.loadStatus !== 'ok') await hub.loadCompaniesFirstPage();
});
</script>

<template>
  <div class="av">
    <div class="av__bar">
      <h1>Audiences</h1>
      <div class="av__actions">
        <input v-model="searchQ" type="search" class="av__search" placeholder="Filter audiences…" />
        <button type="button" class="av__btn av__btn--new" @click="aud.openScout()">+ New</button>
      </div>
    </div>

    <p v-if="aud.loadStatus === 'loading'" class="av__msg">Loading audiences…</p>
    <p v-else-if="aud.loadStatus === 'error'" class="av__msg av__msg--err">{{ aud.loadError }}</p>
    <p v-else-if="aud.loadStatus === 'ok' && !filtered.length" class="av__msg">
      No audiences yet. Create one with <strong>+ New</strong>.
    </p>

    <div v-if="aud.loadStatus === 'ok'" class="av__list">
      <div
        v-for="a in filtered"
        :key="a.id"
        class="aud-row"
        role="button"
        tabindex="0"
        @click="router.push(`/audiences/${a.id}`)"
        @keydown.enter="router.push(`/audiences/${a.id}`)"
      >
        <div class="aud-row__info">
          <div class="aud-row__name">{{ a.name }}</div>
          <div v-if="a.description" class="aud-row__desc">{{ a.description }}</div>
        </div>
        <div class="aud-row__meta">
          <span class="aud-row__count">{{ coverage(a.company_ids) }} co</span>
          <span v-if="a.updated_at" class="aud-row__date">{{ relTime(a.updated_at) }}</span>
        </div>
        <div class="aud-row__actions">
          <button type="button" class="aud-row__btn" title="Edit" @click.stop="aud.openScout(a)">
            ✎
          </button>
          <button
            type="button"
            class="aud-row__btn aud-row__btn--del"
            title="Delete"
            @click.stop="aud.remove(a.id)"
          >
            ✕
          </button>
        </div>
      </div>
    </div>

    <AudienceScoutModal v-if="aud.scoutOpen" />
  </div>
</template>

<style scoped>
.av {
  flex: 1;
  padding: 1rem 1.25rem 2rem;
  background: #0c0c0a;
  color: #f0efe8;
  font-family: 'IBM Plex Sans', system-ui, sans-serif;
  overflow-y: auto;
}

.av__bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

h1 {
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0;
  flex: 1;
}

.av__actions {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.av__search {
  height: 30px;
  padding: 0 0.6rem;
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: #141412;
  color: #f0efe8;
  font-size: 0.78rem;
  font-family: inherit;
}

.av__btn {
  height: 30px;
  padding: 0 0.75rem;
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: #1a1a18;
  color: #f0efe8;
  font-size: 0.78rem;
  cursor: pointer;
  font-family: inherit;
}

.av__btn--new {
  border-color: rgba(192, 132, 252, 0.4);
  color: #c084fc;
}

.av__msg {
  font-size: 0.85rem;
  color: #8a8a82;
}

.av__msg--err {
  color: #f87171;
}

.av__list {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.aud-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.6rem 0.75rem;
  border-radius: 5px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  cursor: pointer;
  background: #141412;
  transition: border-color 0.12s;
}

.aud-row:hover {
  border-color: rgba(192, 132, 252, 0.25);
  background: #1a1a18;
}

.aud-row__info {
  flex: 1;
  min-width: 0;
}

.aud-row__name {
  font-size: 0.85rem;
  font-weight: 500;
  color: #f0efe8;
}

.aud-row__desc {
  font-size: 0.72rem;
  color: #6b6b63;
  margin-top: 0.1rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.aud-row__meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.1rem;
}

.aud-row__count {
  font-size: 0.72rem;
  font-family: 'IBM Plex Mono', monospace;
  color: #c084fc;
}

.aud-row__date {
  font-size: 0.65rem;
  color: #555550;
}

.aud-row__actions {
  display: flex;
  gap: 0.25rem;
}

.aud-row__btn {
  width: 24px;
  height: 24px;
  border-radius: 3px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: transparent;
  color: #555550;
  font-size: 0.72rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: inherit;
}

.aud-row__btn:hover {
  background: rgba(255, 255, 255, 0.07);
  color: #f0efe8;
}

.aud-row__btn--del:hover {
  border-color: rgba(248, 113, 113, 0.3);
  color: #f87171;
}
</style>
