<script setup lang="ts">
import { computed, onMounted } from 'vue';

import { OA_GVL, TCF_F, TCF_P, TCF_SF, TCF_SP, calcPrivacyRisk, useTcfStore } from '../store';
import type { GvlVendor } from '../../../types/tcf';

const tcf = useTcfStore();

const filteredVendors = computed(() => {
  const q = tcf.vendorSearch.toLowerCase().trim();
  const all = tcf.vendorList();
  if (!q) return all.slice(0, 100);
  return all.filter((v) => v.name.toLowerCase().includes(q)).slice(0, 60);
});

const selectedVendors = computed((): GvlVendor[] => {
  if (!tcf.gvlData) return [];
  return [...tcf.selected].map((id) => tcf.gvlData![id]).filter(Boolean);
});

function riskBar(score: number): string {
  const filled = '●'.repeat(Math.min(10, score));
  const empty = '○'.repeat(Math.max(0, 10 - score));
  return filled + empty;
}

function riskColor(score: number): string {
  if (score >= 7) return '#f87171';
  if (score >= 4) return '#fbbf24';
  return '#4ade80';
}

function purposeList(v: GvlVendor): string[] {
  return [
    ...(v.purposes ?? []).map((id) => TCF_P[id] ?? `P${id}`),
    ...(v.legIntPurposes ?? []).map((id) => `[LI] ${TCF_P[id] ?? `P${id}`}`),
    ...(v.specialPurposes ?? []).map((id) => TCF_SP[id] ?? `SP${id}`),
    ...(v.features ?? []).map((id) => TCF_F[id] ?? `F${id}`),
    ...(v.specialFeatures ?? []).map((id) => `[SF] ${TCF_SF[id] ?? `SF${id}`}`),
  ];
}

onMounted(() => {
  void tcf.loadGvl();
});
</script>

<template>
  <div class="tcv">
    <!-- Left: Vendor List -->
    <div class="tcv__left">
      <div class="tcv__lhead">
        <h2 class="tcv__title">TCF Vendors</h2>
        <span v-if="tcf.gvlStatus === 'ok'" class="tcv__total">
          {{ Object.keys(tcf.gvlData ?? {}).length }} vendors
        </span>
      </div>

      <div v-if="tcf.gvlStatus === 'loading'" class="tcv__msg">Loading GVL…</div>
      <div v-else-if="tcf.gvlStatus === 'error'" class="tcv__msg tcv__msg--err">
        {{ tcf.gvlError }}
      </div>

      <input
        v-if="tcf.gvlStatus === 'ok'"
        v-model="tcf.vendorSearch"
        type="search"
        class="tcv__search"
        placeholder="Search vendor…"
      />

      <div v-if="tcf.gvlStatus === 'ok'" class="tcv__vlist">
        <button
          v-for="v in filteredVendors"
          :key="v.id"
          type="button"
          class="tcv__vrow"
          :class="{ 'tcv__vrow--sel': tcf.selected.has(v.id) }"
          @click="tcf.toggleVendor(v.id)"
        >
          <span class="tcv__vname">{{ v.name }}</span>
          <span
            class="tcv__vrisk"
            :style="{ color: riskColor(tcf.riskScores.get(v.id)?.score ?? 0) }"
          >
            {{ tcf.riskScores.get(v.id)?.score ?? '?' }}/10
          </span>
        </button>
      </div>

      <!-- OA entry -->
      <div v-if="tcf.gvlStatus === 'ok'" class="tcv__oa-row" @click="tcf.toggleVendor(OA_GVL.id)">
        <span class="tcv__vname">★ OnAudience (ID {{ OA_GVL.id }})</span>
        <span class="tcv__vrisk" :style="{ color: riskColor(calcPrivacyRisk(OA_GVL).score) }">
          {{ calcPrivacyRisk(OA_GVL).score }}/10
        </span>
      </div>
    </div>

    <!-- Right: Comparison Panel -->
    <div class="tcv__right">
      <div class="tcv__rhead">
        <h2 class="tcv__title">Comparison</h2>
        <span class="tcv__sel-hint">
          {{ tcf.selected.size }}/4 selected
          <button
            v-if="tcf.selected.size"
            type="button"
            class="tcv__clear"
            @click="tcf.selected.clear()"
          >
            Clear
          </button>
        </span>
      </div>

      <div v-if="!tcf.selected.size" class="tcv__empty">
        Select up to 4 vendors from the list to compare.
      </div>

      <div v-else class="tcv__compare">
        <div v-for="v in selectedVendors" :key="v.id" class="tcv__col">
          <div class="tcv__col-head">
            <div class="tcv__col-name">{{ v.name }}</div>
            <div
              class="tcv__col-risk"
              :style="{ color: riskColor(tcf.riskScores.get(v.id)?.score ?? 0) }"
            >
              Risk: {{ riskBar(tcf.riskScores.get(v.id)?.score ?? 0) }}
              {{ tcf.riskScores.get(v.id)?.score ?? '?' }}/10
            </div>
            <div class="tcv__col-ret">
              Retention:
              {{ v.dataRetention?.stdRetention ? v.dataRetention.stdRetention + ' days' : 'n/a' }}
            </div>
          </div>
          <ul class="tcv__purps">
            <li v-for="(p, i) in purposeList(v)" :key="i" class="tcv__purp">
              {{ p }}
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tcv {
  flex: 1;
  display: flex;
  min-height: 0;
  overflow: hidden;
  background: #0c0c0a;
  color: #f0efe8;
  font-family: 'IBM Plex Sans', system-ui, sans-serif;
}

.tcv__left {
  width: 280px;
  flex-shrink: 0;
  border-right: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.tcv__right {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.tcv__lhead,
.tcv__rhead {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  padding: 0.75rem 1rem 0.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
  flex-shrink: 0;
}

.tcv__title {
  font-size: 0.9rem;
  font-weight: 600;
  margin: 0;
  flex: 1;
}

.tcv__total {
  font-size: 0.7rem;
  color: #6b6b63;
  font-family: 'IBM Plex Mono', monospace;
}

.tcv__msg {
  padding: 1rem;
  font-size: 0.8rem;
  color: #8a8a82;
}

.tcv__msg--err {
  color: #f87171;
}

.tcv__search {
  margin: 0.5rem;
  height: 28px;
  padding: 0 0.5rem;
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: #141412;
  color: #f0efe8;
  font-size: 0.75rem;
  font-family: inherit;
  flex-shrink: 0;
}

.tcv__vlist {
  flex: 1;
  overflow-y: auto;
}

.tcv__vrow {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.3rem 0.75rem;
  background: none;
  border: none;
  width: 100%;
  text-align: left;
  cursor: pointer;
  font-family: inherit;
  border-bottom: 1px solid rgba(255, 255, 255, 0.03);
}

.tcv__vrow:hover {
  background: rgba(255, 255, 255, 0.04);
}

.tcv__vrow--sel {
  background: rgba(192, 132, 252, 0.07);
}

.tcv__oa-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.35rem 0.75rem;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  cursor: pointer;
  background: rgba(74, 222, 128, 0.04);
}

.tcv__vname {
  flex: 1;
  font-size: 0.75rem;
  color: #d4d4cc;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tcv__vrisk {
  font-size: 0.68rem;
  font-family: 'IBM Plex Mono', monospace;
  flex-shrink: 0;
}

.tcv__sel-hint {
  font-size: 0.72rem;
  color: #6b6b63;
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.tcv__clear {
  background: none;
  border: none;
  color: #7dd3fc;
  font-size: 0.68rem;
  cursor: pointer;
  padding: 0;
  font-family: inherit;
  text-decoration: underline;
}

.tcv__empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  color: #555550;
  padding: 2rem;
  text-align: center;
}

.tcv__compare {
  flex: 1;
  display: flex;
  overflow-x: auto;
  overflow-y: auto;
  padding: 1rem;
  gap: 1rem;
  align-items: flex-start;
}

.tcv__col {
  min-width: 200px;
  flex: 1;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  padding: 0.75rem;
  background: #141412;
}

.tcv__col-head {
  margin-bottom: 0.75rem;
  padding-bottom: 0.6rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
}

.tcv__col-name {
  font-size: 0.85rem;
  font-weight: 600;
  margin-bottom: 0.25rem;
  color: #f0efe8;
}

.tcv__col-risk {
  font-size: 0.68rem;
  font-family: 'IBM Plex Mono', monospace;
  margin-bottom: 0.15rem;
}

.tcv__col-ret {
  font-size: 0.68rem;
  color: #6b6b63;
}

.tcv__purps {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.tcv__purp {
  font-size: 0.7rem;
  color: #8a8a82;
  padding-left: 0.6rem;
  position: relative;
}

.tcv__purp::before {
  content: '·';
  position: absolute;
  left: 0;
  color: #555550;
}
</style>
