<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { TAG_RULES } from '../config/tagRules';
import {
  type CompanySort,
  type CompanyTypeFilter,
  filterAndSortCompanies,
  filterPoolForTagCounts,
  tagCountsForPool,
} from '../lib/companyList';
import { useHubStore } from '../stores/hub';

const hub = useHubStore();
const router = useRouter();

const searchQ = ref('');
const searchInput = ref<HTMLInputElement | null>(null);
const activeFilter = ref<CompanyTypeFilter>('all');
const sortBy = ref<CompanySort>('recent');
const tagLogic = ref<'or' | 'and'>('or');
const activeTags = ref<string[]>([]);
const tagPanelOpen = ref(false);

const filterChips: { id: CompanyTypeFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'client', label: 'Clients' },
  { id: 'poc', label: 'POC' },
  { id: 'partner', label: 'Partners' },
  { id: 'prospect', label: 'Prospects' },
  { id: 'nogo', label: 'No outreach' },
  { id: 'fresh', label: 'Fresh' },
];

const displayed = computed(() =>
  filterAndSortCompanies(hub.companies, hub.contacts, {
    searchQ: searchQ.value,
    filter: activeFilter.value,
    sortBy: sortBy.value,
    activeTags: new Set(activeTags.value),
    tagLogic: tagLogic.value,
  }),
);

const tagPool = computed(() =>
  filterPoolForTagCounts(hub.companies, hub.contacts, activeFilter.value, searchQ.value),
);

const tagCounts = computed(() => tagCountsForPool(tagPool.value));

const visibleTagRules = computed(() => TAG_RULES.filter((r) => (tagCounts.value[r.tag] || 0) > 0));

function toggleTag(tag: string) {
  const i = activeTags.value.indexOf(tag);
  if (i >= 0) activeTags.value = activeTags.value.filter((t) => t !== tag);
  else activeTags.value = [...activeTags.value, tag];
}

function clearTags() {
  activeTags.value = [];
}

let removeSearchShortcut: (() => void) | null = null;

onMounted(() => {
  void (async () => {
    if (!(hub.loadStatus === 'ok' && hub.companies.length)) {
      await Promise.all([hub.loadCompaniesFirstPage(), hub.loadCompanyRelations()]);
    }
    if (hub.contactsLoadStatus !== 'ok') {
      await hub.loadContacts();
    }
  })();

  const onKey = (e: KeyboardEvent) => {
    if (e.key !== '/') return;
    const t = e.target as HTMLElement | null;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    e.preventDefault();
    searchInput.value?.focus();
  };
  window.addEventListener('keydown', onKey);
  removeSearchShortcut = () => window.removeEventListener('keydown', onKey);
});

onUnmounted(() => {
  removeSearchShortcut?.();
});

async function refreshData() {
  await hub.bootstrapLegacyHubData();
}
</script>

<template>
  <div class="wrap">
    <header class="bar">
      <div>
        <h1>Companies</h1>
        <p class="sub">
          Search, type filters, tag rules (OR/AND), and sort — aligned with
          <code>www/hub/list.js</code>. Press <kbd>/</kbd> to focus search. Contacts load for Fresh
          + tag pool counts.
        </p>
      </div>
      <nav class="nav">
        <button
          type="button"
          class="btn"
          :disabled="hub.loadStatus === 'loading' || hub.relationsLoadStatus === 'loading'"
          @click="refreshData()"
        >
          Refresh data
        </button>
      </nav>
    </header>

    <div v-if="hub.loadStatus === 'ok'" class="toolbar">
      <label class="search">
        <span class="sr-only">Search companies</span>
        <input
          ref="searchInput"
          v-model="searchQ"
          type="search"
          class="search-inp"
          placeholder="Search name, note, category, region, city…"
          autocomplete="off"
        />
      </label>
      <div class="sort">
        <label for="sortsel">Sort</label>
        <select id="sortsel" v-model="sortBy" class="sort-sel">
          <option value="recent">Recent</option>
          <option value="name">Name</option>
          <option value="icp">ICP</option>
        </select>
      </div>
    </div>

    <div v-if="hub.loadStatus === 'ok'" class="chips" role="group" aria-label="Type">
      <button
        v-for="ch in filterChips"
        :key="ch.id"
        type="button"
        class="chip"
        :class="{ active: activeFilter === ch.id }"
        @click="activeFilter = ch.id"
      >
        {{ ch.label }}
      </button>
    </div>

    <div v-if="hub.loadStatus === 'ok'" class="tag-toolbar">
      <button type="button" class="btn sm" @click="tagPanelOpen = !tagPanelOpen">
        {{ tagPanelOpen ? '▼' : '▶' }} Tags
      </button>
      <span v-if="activeTags.length" class="tag-active"
        >{{ activeTags.length }} tag{{ activeTags.length !== 1 ? 's' : '' }} ·
        {{ tagLogic.toUpperCase() }}</span
      >
      <button v-if="activeTags.length" type="button" class="linkish" @click="clearTags">
        Clear tags
      </button>
    </div>

    <div v-show="tagPanelOpen && hub.loadStatus === 'ok'" class="tag-panel">
      <div class="tag-logic">
        <button
          type="button"
          class="tl"
          :class="{ on: tagLogic === 'or' }"
          @click="tagLogic = 'or'"
        >
          OR
        </button>
        <button
          type="button"
          class="tl"
          :class="{ on: tagLogic === 'and' }"
          @click="tagLogic = 'and'"
        >
          AND
        </button>
      </div>
      <div class="tag-pills">
        <button
          v-for="r in visibleTagRules"
          :key="r.tag"
          type="button"
          class="t-pill"
          :class="{ on: activeTags.includes(r.tag) }"
          @click="toggleTag(r.tag)"
        >
          {{ r.tag }} <span class="tc">{{ tagCounts[r.tag] ?? 0 }}</span>
        </button>
      </div>
    </div>

    <p v-if="hub.loadStatus === 'loading'" class="msg">Loading…</p>
    <p v-else-if="hub.loadStatus === 'error'" class="msg err">{{ hub.loadError }}</p>
    <p v-else-if="hub.loadStatus === 'ok'" class="meta">
      Showing <strong>{{ displayed.length }}</strong> of
      <strong>{{ hub.companyCount }}</strong> loaded
      <span class="dim">({{ hub.totalCompaniesInDb }} in DB)</span>
      <span v-if="hub.companiesLoadingMore" class="meta-loading"> · loading more companies…</span>
      <span v-if="hub.relationsLoadStatus === 'ok'" class="meta-relations">
        · {{ hub.relationCount }} relations
      </span>
    </p>

    <div v-if="hub.loadStatus === 'ok' && displayed.length" class="table-wrap">
      <table class="tbl">
        <thead>
          <tr>
            <th>Name</th>
            <th>Type</th>
            <th>ICP</th>
            <th>Region</th>
            <th>Id</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="c in displayed"
            :key="c.id"
            class="c-row"
            style="cursor: pointer"
            :data-slug="c.id"
            @click="router.push(`/companies/${encodeURIComponent(c.id)}`)"
          >
            <td class="name">{{ c.name || '—' }}</td>
            <td>
              <span class="tag">{{ c.type || '—' }}</span>
            </td>
            <td class="mono">{{ c.icp ?? '—' }}</td>
            <td>{{ c.region || '—' }}</td>
            <td class="mono dim">{{ c.id }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <p v-else-if="hub.loadStatus === 'ok' && !hub.companies.length" class="msg">
      No rows returned.
    </p>
    <p v-else-if="hub.loadStatus === 'ok' && hub.companies.length && !displayed.length" class="msg">
      No companies match the current filters.
    </p>
  </div>
</template>

<style scoped>
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
}
.wrap {
  min-height: 100%;
  padding: 1rem 1.25rem 2rem;
  font-family: 'IBM Plex Sans', system-ui, sans-serif;
  background: #0c0c0a;
  color: #f0efe8;
}
.bar {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
}
h1 {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0 0 0.35rem;
}
.sub {
  margin: 0;
  font-size: 0.85rem;
  color: #8a8a82;
  max-width: 44rem;
  line-height: 1.45;
}
.sub code,
kbd {
  font-size: 0.8em;
  color: #7dd3fc;
}
kbd {
  padding: 0.1em 0.35em;
  border-radius: 3px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: #1a1a18;
}
.nav {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
}
.btn {
  height: 30px;
  padding: 0 12px;
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: #1a1a18;
  color: #f0efe8;
  font-size: 0.8rem;
  cursor: pointer;
  font-family: inherit;
}
.btn.sm {
  height: 26px;
  padding: 0 8px;
  font-size: 0.75rem;
}
.btn:hover:not(:disabled) {
  background: #242421;
}
.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: flex-end;
  margin-bottom: 0.75rem;
}
.search {
  flex: 1;
  min-width: 12rem;
}
.search-inp {
  width: 100%;
  box-sizing: border-box;
  height: 34px;
  padding: 0 0.65rem;
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: #141412;
  color: #f0efe8;
  font-size: 0.85rem;
  font-family: inherit;
}
.sort {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.78rem;
  color: #8a8a82;
}
.sort-sel {
  height: 34px;
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: #141412;
  color: #f0efe8;
  font-size: 0.8rem;
}
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin-bottom: 0.65rem;
}
.chip {
  padding: 0.3rem 0.55rem;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: transparent;
  color: #9c9c94;
  font-size: 0.72rem;
  cursor: pointer;
  font-family: inherit;
}
.chip:hover {
  color: #f0efe8;
  border-color: rgba(255, 255, 255, 0.2);
}
.chip.active {
  color: #f0efe8;
  border-color: rgba(192, 132, 252, 0.55);
  background: rgba(192, 132, 252, 0.1);
}
.tag-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.35rem;
  font-size: 0.78rem;
}
.tag-active {
  color: #c084fc;
}
.linkish {
  background: none;
  border: none;
  color: #7dd3fc;
  cursor: pointer;
  font-size: inherit;
  text-decoration: underline;
  padding: 0;
  font-family: inherit;
}
.tag-panel {
  margin-bottom: 0.75rem;
  padding: 0.65rem 0.75rem;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(0, 0, 0, 0.25);
}
.tag-logic {
  display: flex;
  gap: 0.35rem;
  margin-bottom: 0.5rem;
}
.tl {
  padding: 0.2rem 0.5rem;
  font-size: 0.65rem;
  font-family: 'IBM Plex Mono', monospace;
  border-radius: 3px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: #1a1a18;
  color: #8a8a82;
  cursor: pointer;
}
.tl.on {
  border-color: #c084fc;
  color: #e9d5ff;
}
.tag-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}
.t-pill {
  padding: 0.25rem 0.45rem;
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: transparent;
  color: #a8a89e;
  font-size: 0.72rem;
  cursor: pointer;
  font-family: inherit;
}
.t-pill .tc {
  margin-left: 0.25rem;
  font-size: 0.65rem;
  color: #6b6b63;
  font-family: 'IBM Plex Mono', monospace;
}
.t-pill.on {
  border-color: #4ade80;
  color: #f0efe8;
}
.meta {
  font-size: 0.85rem;
  color: #8a8a82;
  margin: 0 0 1rem;
}
.meta strong {
  color: #c084fc;
}
.meta .dim {
  color: #555550;
  font-weight: normal;
}
.meta-loading {
  color: #7dd3fc;
  font-size: 0.8rem;
}
.meta-relations {
  color: #7dd3fc;
}
.msg {
  color: #8a8a82;
  font-size: 0.9rem;
}
.msg.err {
  color: #f87171;
}
.table-wrap {
  overflow-x: auto;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 6px;
}
.tbl {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8rem;
}
.tbl th,
.tbl td {
  padding: 0.5rem 0.65rem;
  text-align: left;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}
.tbl th {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #555550;
  background: #141412;
}
.tbl tr:hover td {
  background: rgba(255, 255, 255, 0.03);
}
.name {
  font-weight: 500;
  color: #f0efe8;
}
.mono {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.75rem;
}
.dim {
  color: #555550;
  max-width: 12rem;
  overflow: hidden;
  text-overflow: ellipsis;
}
.tag {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.65rem;
  text-transform: uppercase;
  color: #4ade80;
}
</style>
