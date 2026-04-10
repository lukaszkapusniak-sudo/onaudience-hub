<script setup lang="ts">
import { onMounted } from 'vue';
import { RouterLink } from 'vue-router';

import { useHubStore } from '../stores/hub';

const hub = useHubStore();

onMounted(() => {
  void hub.loadCompaniesFirstPage();
});
</script>

<template>
  <div class="wrap">
    <header class="bar">
      <div>
        <h1>Companies (Vue)</h1>
        <p class="sub">
          Supabase companies — same order as the legacy hub; extra pages load in the background when
          the DB has more than 200 rows. Sign in via the main hub first so
          <code>oaHubSession</code> is present.
        </p>
      </div>
      <nav class="nav">
        <button
          type="button"
          class="btn"
          :disabled="hub.loadStatus === 'loading'"
          @click="hub.loadCompaniesFirstPage()"
        >
          Refresh
        </button>
        <RouterLink class="btn ghost" to="/">Hub shell</RouterLink>
        <RouterLink class="btn ghost" to="/lemlist">Lemlist</RouterLink>
        <RouterLink class="btn ghost" to="/about">About</RouterLink>
      </nav>
    </header>

    <p v-if="hub.loadStatus === 'loading'" class="msg">Loading…</p>
    <p v-else-if="hub.loadStatus === 'error'" class="msg err">{{ hub.loadError }}</p>
    <p v-else-if="hub.loadStatus === 'ok'" class="meta">
      Showing <strong>{{ hub.companyCount }}</strong> of
      <strong>{{ hub.totalCompaniesInDb }}</strong> companies.
      <span v-if="hub.companiesLoadingMore" class="meta-loading">Loading remaining pages…</span>
    </p>

    <div v-if="hub.companies.length" class="table-wrap">
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
          <tr v-for="c in hub.companies" :key="c.id">
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
    <p v-else-if="hub.loadStatus === 'ok'" class="msg">No rows returned.</p>
  </div>
</template>

<style scoped>
.wrap {
  min-height: 100vh;
  padding: 1.25rem 1.5rem 2rem;
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
  margin-bottom: 1.25rem;
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
  max-width: 42rem;
  line-height: 1.45;
}
.sub code {
  font-size: 0.8em;
  color: #7dd3fc;
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
  text-decoration: none;
  display: inline-flex;
  align-items: center;
}
.btn:hover:not(:disabled) {
  background: #242421;
}
.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.btn.ghost {
  background: transparent;
}
.meta {
  font-size: 0.85rem;
  color: #8a8a82;
  margin: 0 0 1rem;
}
.meta strong {
  color: #c084fc;
}
.meta-loading {
  margin-left: 0.5rem;
  font-size: 0.8rem;
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
