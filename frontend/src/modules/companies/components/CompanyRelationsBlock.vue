<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';

import { useCompanyDetailStore } from '../store';

const store = useCompanyDetailStore();
const router = useRouter();

const dirArrow: Record<string, string> = {
  from_target: '←',
  to_target: '→',
  bidirectional: '↔',
};

const sorted = computed(() =>
  [...store.companyRelations].sort((a, b) =>
    (a.relation_type ?? '').localeCompare(b.relation_type ?? ''),
  ),
);

function openOther(slug: string) {
  router.push(`/companies/${encodeURIComponent(slug)}`);
}
</script>

<template>
  <div class="crb">
    <div class="crb__head">
      <span class="crb__title">Relations</span>
      <span class="crb__count">{{ store.companyRelations.length }}</span>
    </div>

    <div v-if="sorted.length" class="crb__list">
      <div v-for="(r, i) in sorted" :key="r.id ?? i" class="crb__row">
        <span class="crb__arrow">{{ dirArrow[r.direction ?? ''] ?? '—' }}</span>
        <button
          type="button"
          class="crb__name"
          @click="
            openOther(r.from_company === store.currentCompany?.id ? r.to_company : r.from_company)
          "
        >
          {{ r.from_company === store.currentCompany?.id ? r.to_company : r.from_company }}
        </button>
        <span class="crb__type">{{ r.relation_type }}</span>
        <span class="crb__str tag" :class="r.strength === 'confirmed' ? 'tc' : 'tpr'">{{
          r.strength ?? '—'
        }}</span>
      </div>
    </div>
    <div v-else class="crb__empty">No relations.</div>
  </div>
</template>

<style scoped>
.crb {
  padding: 0.6rem 1.25rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.crb__head {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.45rem;
}

.crb__title {
  font-size: 0.72rem;
  font-family: 'IBM Plex Mono', monospace;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #555550;
}

.crb__count {
  font-size: 0.7rem;
  color: #6b6b63;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 3px;
  padding: 0 0.35rem;
  font-family: 'IBM Plex Mono', monospace;
}

.crb__list {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.crb__row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  padding: 0.15rem 0.2rem;
  border-radius: 3px;
}

.crb__row:hover {
  background: rgba(255, 255, 255, 0.03);
}

.crb__arrow {
  color: #555550;
  width: 1.2rem;
  text-align: center;
  flex-shrink: 0;
}

.crb__name {
  background: none;
  border: none;
  color: #7dd3fc;
  font-size: 0.75rem;
  cursor: pointer;
  padding: 0;
  font-family: inherit;
  text-align: left;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.crb__name:hover {
  text-decoration: underline;
}

.crb__type {
  color: #6b6b63;
  font-size: 0.68rem;
  flex-shrink: 0;
}

.tag {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.6rem;
  text-transform: uppercase;
  padding: 0.1rem 0.3rem;
  border-radius: 3px;
  flex-shrink: 0;
}

.tc {
  background: rgba(74, 222, 128, 0.1);
  color: #4ade80;
}
.tpr {
  background: rgba(192, 132, 252, 0.1);
  color: #c084fc;
}

.crb__empty {
  font-size: 0.75rem;
  color: #555550;
}
</style>
