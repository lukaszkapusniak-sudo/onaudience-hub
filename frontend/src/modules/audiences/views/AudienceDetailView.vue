<script setup lang="ts">
import { computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { getAvatarColors, contactInitials } from '../../../lib/hubDisplay';
import { relTime } from '../../../lib/relTime';
import { useHubStore } from '../../../stores/hub';
import { useComposerStore } from '../../composer/store';
import { useAudiencesStore } from '../store';
import AudienceScoutModal from '../components/AudienceScoutModal.vue';

const route = useRoute();
const router = useRouter();
const aud = useAudiencesStore();
const hub = useHubStore();
const composer = useComposerStore();

const audience = computed(() => aud.audiences.find((a) => a.id === route.params.id));

const members = computed(() => {
  if (!audience.value?.company_ids?.length) return [];
  return hub.companies.filter((c) => audience.value!.company_ids!.includes(c.id));
});

async function exportCsv() {
  if (!members.value.length) return;
  const headers = ['Name', 'Type', 'Category', 'Region', 'ICP'];
  const rows = members.value.map((c) =>
    [c.name, c.type, c.category, c.region, c.icp].map((v) => `"${v ?? ''}"`).join(','),
  );
  const csv = [headers.join(','), ...rows].join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = `${audience.value?.name ?? 'audience'}.csv`;
  a.click();
}

onMounted(async () => {
  if (aud.loadStatus !== 'ok') await aud.load();
  if (hub.loadStatus !== 'ok') await hub.loadCompaniesFirstPage();
});

watch(
  () => route.params.id,
  async () => {
    if (aud.loadStatus !== 'ok') await aud.load();
  },
);
</script>

<template>
  <div class="adv">
    <div class="adv__nav">
      <button type="button" class="adv__back" @click="router.push('/audiences')">
        ← Audiences
      </button>
    </div>

    <div v-if="!audience" class="adv__msg">Audience not found.</div>

    <template v-else>
      <div class="adv__head">
        <div class="adv__title-row">
          <h2 class="adv__name">{{ audience.name }}</h2>
          <span class="adv__count">{{ members.length }} companies</span>
        </div>
        <p v-if="audience.description" class="adv__desc">{{ audience.description }}</p>
        <div class="adv__actions">
          <button type="button" class="adv__btn" @click="aud.openScout(audience)">✎ Edit</button>
          <button type="button" class="adv__btn" @click="exportCsv">↓ Export CSV</button>
          <button
            type="button"
            class="adv__btn adv__btn--del"
            @click="
              aud.remove(audience.id);
              router.push('/audiences');
            "
          >
            ✕ Delete
          </button>
        </div>
      </div>

      <!-- Company list -->
      <div class="adv__list">
        <div
          v-for="co in members"
          :key="co.id"
          class="adv__co-row"
          role="button"
          tabindex="0"
          @click="router.push(`/companies/${co.id}`)"
          @keydown.enter="router.push(`/companies/${co.id}`)"
        >
          <div
            class="adv__co-av"
            :style="{
              background: getAvatarColors(co.name ?? '').bg,
              color: getAvatarColors(co.name ?? '').fg,
            }"
          >
            {{ contactInitials(co.name ?? '').slice(0, 2) }}
          </div>
          <div class="adv__co-info">
            <div class="adv__co-name">{{ co.name }}</div>
            <div class="adv__co-sub">{{ co.type }} · {{ co.category }}</div>
          </div>
          <div class="adv__co-actions">
            <button
              type="button"
              class="adv__co-btn"
              title="Draft email"
              @click.stop="
                composer.open({
                  company: co.name,
                  companyId: co.id,
                  note: co.note,
                  description: co.description,
                  angle: co.outreach_angle,
                  category: co.category,
                  region: co.region,
                })
              "
            >
              ✉
            </button>
          </div>
          <span v-if="co.updated_at" class="adv__co-date">{{ relTime(co.updated_at) }}</span>
        </div>
      </div>

      <div v-if="!members.length" class="adv__empty">
        No companies in this audience yet. Click <strong>Edit</strong> to add some.
      </div>
    </template>

    <AudienceScoutModal v-if="aud.scoutOpen" />
  </div>
</template>

<style scoped>
.adv {
  flex: 1;
  overflow-y: auto;
  padding: 0;
  background: #0c0c0a;
  color: #f0efe8;
  font-family: 'IBM Plex Sans', system-ui, sans-serif;
}

.adv__nav {
  padding: 0.6rem 1.25rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
}

.adv__back {
  background: none;
  border: none;
  color: #7dd3fc;
  font-size: 0.8rem;
  cursor: pointer;
  font-family: inherit;
  padding: 0;
}

.adv__back:hover {
  text-decoration: underline;
}

.adv__head {
  padding: 1rem 1.25rem 0.75rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
}

.adv__title-row {
  display: flex;
  align-items: baseline;
  gap: 0.75rem;
  margin-bottom: 0.35rem;
}

.adv__name {
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0;
}

.adv__count {
  font-size: 0.75rem;
  color: #c084fc;
  font-family: 'IBM Plex Mono', monospace;
}

.adv__desc {
  font-size: 0.82rem;
  color: #8a8a82;
  margin: 0 0 0.6rem;
}

.adv__actions {
  display: flex;
  gap: 0.35rem;
  flex-wrap: wrap;
}

.adv__btn {
  height: 26px;
  padding: 0 0.6rem;
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: #1a1a18;
  color: #c0c0b8;
  font-size: 0.72rem;
  cursor: pointer;
  font-family: inherit;
}

.adv__btn:hover {
  background: #242421;
  color: #f0efe8;
}

.adv__btn--del:hover {
  border-color: rgba(248, 113, 113, 0.3);
  color: #f87171;
}

.adv__msg {
  padding: 1.5rem 1.25rem;
  font-size: 0.85rem;
  color: #8a8a82;
}

.adv__list {
  display: flex;
  flex-direction: column;
}

.adv__co-row {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.5rem 1.25rem;
  cursor: pointer;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}

.adv__co-row:hover {
  background: rgba(255, 255, 255, 0.03);
}

.adv__co-av {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.62rem;
  font-weight: 700;
  flex-shrink: 0;
}

.adv__co-info {
  flex: 1;
  min-width: 0;
}

.adv__co-name {
  font-size: 0.82rem;
  font-weight: 500;
  color: #f0efe8;
}

.adv__co-sub {
  font-size: 0.68rem;
  color: #6b6b63;
}

.adv__co-actions {
  display: flex;
  gap: 0.25rem;
}

.adv__co-btn {
  width: 24px;
  height: 24px;
  border-radius: 3px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: transparent;
  color: #555550;
  font-size: 0.7rem;
  cursor: pointer;
  font-family: inherit;
  display: flex;
  align-items: center;
  justify-content: center;
}

.adv__co-btn:hover {
  color: #c084fc;
  border-color: rgba(192, 132, 252, 0.3);
}

.adv__co-date {
  font-size: 0.65rem;
  color: #555550;
}

.adv__empty {
  padding: 1.5rem 1.25rem;
  font-size: 0.82rem;
  color: #555550;
}
</style>
