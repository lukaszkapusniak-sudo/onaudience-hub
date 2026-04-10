<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { onMounted } from 'vue';
import { RouterLink } from 'vue-router';

import { relTime } from '../lib/relTime';
import { useHubStore } from '../stores/hub';
import { useLemlistStore } from '../stores/lemlist';
import type { LemlistLead } from '../types/lemlist';

const hub = useHubStore();
const ll = useLemlistStore();
const { toast } = storeToRefs(ll);

onMounted(async () => {
  await Promise.all([hub.loadContacts(), hub.loadCompaniesFirstPage()]);
  await ll.loadAudiences();
  await ll.refreshCampaigns();
});

function leadName(l: LemlistLead): string {
  const a = (l.firstName as string) || '';
  const b = (l.lastName as string) || '';
  const n = `${a} ${b}`.trim();
  return n || '—';
}

function detailStats(leads: LemlistLead[]) {
  const n = leads.length || 1;
  const sent = leads.filter((x) => x.status && x.status !== 'pending').length;
  const opened = leads.filter(
    (x) =>
      x.openedAt ||
      x.status === 'opened' ||
      x.status === 'clicked' ||
      x.status === 'replied' ||
      x.status === 'interested',
  ).length;
  const replied = leads.filter(
    (x) => x.repliedAt || x.status === 'replied' || x.status === 'interested',
  ).length;
  const clicked = leads.filter((x) => x.clickedAt || x.status === 'clicked').length;
  const bounced = leads.filter((x) => x.status === 'bounced' || x.status === 'unsubscribed').length;
  return { n, sent: sent || 1, opened, replied, clicked, bounced };
}
</script>

<template>
  <div class="ll-page">
    <p v-if="toast" class="ll-toast">{{ toast }}</p>

    <header class="ll-top">
      <div>
        <h1>Lemlist</h1>
        <p class="ll-sub">Vue + Pinia port of <code>www/hub/lemlist.js</code></p>
      </div>
      <nav class="ll-nav">
        <RouterLink to="/">Hub shell</RouterLink>
        <RouterLink to="/data">Companies</RouterLink>
        <RouterLink to="/about">About</RouterLink>
      </nav>
    </header>

    <div class="ll-header">
      <div class="ll-key-row">
        <span class="ll-key-status" :class="ll.connected ? 'ok' : 'bad'">{{ ll.keyHint }}</span>
        <template v-if="ll.connected">
          <button type="button" class="btn sm" @click="ll.promptConnect()">Change</button>
          <button type="button" class="btn sm danger" @click="ll.disconnect()">✕</button>
        </template>
        <button v-else type="button" class="btn sm primary" @click="ll.promptConnect()">
          ⚙ Connect Lemlist
        </button>
      </div>
      <div v-if="ll.connected" class="ll-sync-row">
        <button
          type="button"
          class="btn sm"
          :disabled="ll.syncing !== 'idle'"
          @click="ll.syncContactsFromLemlist()"
        >
          {{ ll.syncing === 'contacts' ? '⟳ Syncing…' : '📥 Sync Contacts' }}
        </button>
        <button
          type="button"
          class="btn sm"
          :disabled="ll.syncing !== 'idle'"
          @click="ll.syncCompaniesFromLemlist()"
        >
          {{ ll.syncing === 'companies' ? '⟳ Syncing…' : '🏢 Sync Companies' }}
        </button>
        <span v-if="ll.lastSync" class="ll-sync-meta"
          >· synced {{ Math.round((Date.now() - ll.lastSync) / 60000) }}m ago</span
        >
      </div>
    </div>

    <div class="ll-toolbar">
      <span class="ll-count">{{
        ll.connected
          ? `${ll.campaigns.length} campaign${ll.campaigns.length !== 1 ? 's' : ''}`
          : '—'
      }}</span>
      <button
        v-if="ll.connected"
        type="button"
        class="btn sm"
        :disabled="ll.panelLoading"
        @click="ll.refreshCampaigns()"
      >
        ↺ Refresh
      </button>
    </div>

    <div v-if="ll.panelLoading" class="ll-loading">Loading campaigns…</div>
    <div v-else class="ll-layout">
      <aside class="ll-list">
        <div v-if="!ll.connected" class="ll-empty">
          Connect your Lemlist API key to load campaigns.
        </div>
        <div v-else-if="!ll.campaigns.length" class="ll-empty">
          No campaigns. Create one in
          <a href="https://app.lemlist.com" target="_blank" rel="noopener">lemlist ↗</a> then
          refresh.
        </div>
        <template v-else>
          <button
            v-for="c in ll.campaigns"
            :key="c._id"
            type="button"
            class="ll-row"
            :class="{ active: ll.selected?._id === c._id }"
            @click="ll.selectCampaign(c._id)"
          >
            <div class="ll-row-head">
              <span class="ll-row-name">{{ c.name }}</span>
              <span class="tag" :class="ll.statusTagClass(c.status)">{{
                c.status || 'draft'
              }}</span>
            </div>
            <div class="ll-row-meta">{{ c.createdAt ? relTime(c.createdAt) : '' }}</div>
            <div v-if="ll.campaignStats(c._id).tot > 0" class="ll-row-stats">
              <span class="ll-stat">👥 {{ ll.campaignStats(c._id).tot }}</span>
              <span
                v-if="ll.campaignStats(c._id).sent && ll.campaignStats(c._id).opened"
                class="ll-stat open"
                >👁
                {{
                  Math.round((ll.campaignStats(c._id).opened / ll.campaignStats(c._id).sent) * 100)
                }}%</span
              >
              <span
                v-if="ll.campaignStats(c._id).sent && ll.campaignStats(c._id).replied"
                class="ll-stat reply"
                >💬
                {{
                  Math.round(
                    (ll.campaignStats(c._id).replied / ll.campaignStats(c._id).sent) * 100,
                  )
                }}%</span
              >
            </div>
          </button>
        </template>
      </aside>

      <main v-if="ll.selected" class="ll-detail-wrap">
        <div class="ll-detail">
          <div class="ll-detail-header">
            <button type="button" class="ll-back" @click="ll.clearDetail()">← BACK</button>
            <span class="ll-detail-name">{{ ll.selected.name }}</span>
            <span class="tag" :class="ll.statusTagClass(ll.selected.status)">{{
              ll.selected.status || 'draft'
            }}</span>
          </div>
          <div class="ll-detail-stats">
            <span>{{ ll.leads.length }} LEADS</span>
            <span v-if="ll.selected.createdAt"
              >CREATED {{ relTime(ll.selected.createdAt).toUpperCase() }}</span
            >
            <template v-if="detailStats(ll.leads).sent">
              <span title="Sent">📤 {{ detailStats(ll.leads).sent }}</span>
              <span v-if="detailStats(ll.leads).opened" title="Open rate" class="c-g"
                >👁
                {{
                  Math.round((detailStats(ll.leads).opened / detailStats(ll.leads).sent) * 100)
                }}%</span
              >
              <span v-if="detailStats(ll.leads).replied" title="Reply rate" class="c-b"
                >💬
                {{
                  Math.round((detailStats(ll.leads).replied / detailStats(ll.leads).sent) * 100)
                }}%</span
              >
              <span v-if="detailStats(ll.leads).clicked" title="Click rate" class="c-o"
                >🖱
                {{
                  Math.round((detailStats(ll.leads).clicked / detailStats(ll.leads).sent) * 100)
                }}%</span
              >
              <span v-if="detailStats(ll.leads).bounced" title="Bounced" class="c-r"
                >⚠ {{ detailStats(ll.leads).bounced }}</span
              >
            </template>
          </div>
          <div class="ll-detail-actions">
            <select v-model="ll.pushAudienceId" class="inp">
              <option value="">— push from audience —</option>
              <option v-for="a in ll.audiences" :key="a.id" :value="a.id">
                {{ a.name }} ({{ (a.company_ids || []).length }} co)
              </option>
            </select>
            <button type="button" class="btn sm primary" @click="ll.pushFromAudience()">
              📤 Push
            </button>
            <button type="button" class="btn sm" @click="ll.selectCampaign(ll.selected._id)">
              ↺
            </button>
          </div>
          <input
            v-model="ll.leadSearch"
            class="inp search"
            type="search"
            placeholder="Search leads…"
            autocomplete="off"
          />
          <div v-if="ll.leadsLoading" class="ll-loading">Loading leads…</div>
          <div v-else-if="!ll.filteredLeads.length" class="ll-empty">
            {{ ll.leads.length === 0 ? 'No leads yet.' : 'No results.' }}
          </div>
          <div v-else class="ll-table-scroll">
            <table class="ll-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Company</th>
                  <th>Status</th>
                  <th>Added</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, idx) in ll.filteredLeads" :key="idx">
                  <td>{{ leadName(row) }}</td>
                  <td class="dim">{{ row.email || '—' }}</td>
                  <td class="dim">{{ row.companyName || '—' }}</td>
                  <td>
                    <span class="tag" :class="ll.leadStatusClass(row.status as string)">{{
                      row.status || '—'
                    }}</span>
                  </td>
                  <td class="dim sm">{{ row.addedAt ? relTime(row.addedAt as string) : '—' }}</td>
                  <td>
                    <button
                      type="button"
                      class="btn sm danger"
                      title="Unsubscribe"
                      @click="ll.unsubLead(ll.selected!._id, (row.email as string) || '')"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped>
.ll-page {
  min-height: 100vh;
  background: #0c0c0a;
  color: #f0efe8;
  font-family: 'IBM Plex Sans', system-ui, sans-serif;
  padding: 1rem 1.25rem 2rem;
}
.ll-toast {
  position: fixed;
  bottom: 1rem;
  right: 1rem;
  z-index: 10000;
  margin: 0;
  padding: 0.5rem 0.75rem;
  background: #1c1c1a;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 6px;
  font-size: 0.8rem;
  max-width: 22rem;
}
.ll-top {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1rem;
}
h1 {
  font-size: 1.25rem;
  margin: 0 0 0.25rem;
}
.ll-sub {
  margin: 0;
  font-size: 0.8rem;
  color: #8a8a82;
}
.ll-sub code {
  font-size: 0.75em;
  color: #7dd3fc;
}
.ll-nav {
  display: flex;
  gap: 0.75rem;
}
.ll-nav a {
  color: #60a5fa;
  font-size: 0.85rem;
  text-decoration: none;
}
.ll-nav a:hover {
  text-decoration: underline;
}
.ll-header {
  margin-bottom: 0.75rem;
}
.ll-key-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}
.ll-key-status {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.75rem;
}
.ll-key-status.ok {
  color: #4ade80;
}
.ll-key-status.bad {
  color: #9ca3af;
}
.ll-sync-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
}
.ll-sync-meta {
  font-size: 0.7rem;
  color: #6b7280;
}
.ll-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
}
.ll-count {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.65rem;
  letter-spacing: 0.08em;
  color: #555550;
}
.btn {
  height: 26px;
  padding: 0 10px;
  border-radius: 2px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: #1a1a18;
  color: #f0efe8;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 9px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  cursor: pointer;
}
.btn:hover:not(:disabled) {
  background: #242421;
}
.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.btn.primary {
  border-color: #178066;
  color: #1fa882;
}
.btn.danger {
  color: #f87171;
}
.btn.sm {
  height: 26px;
  font-size: 9px;
}
.ll-loading {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.75rem;
  color: #8a8a82;
  padding: 1rem 0;
}
.ll-layout {
  display: grid;
  grid-template-columns: minmax(240px, 320px) 1fr;
  gap: 1rem;
  align-items: start;
}
@media (max-width: 900px) {
  .ll-layout {
    grid-template-columns: 1fr;
  }
}
.ll-list {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}
.ll-row {
  text-align: left;
  width: 100%;
  padding: 0.5rem 0.65rem;
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: #141412;
  cursor: pointer;
  color: inherit;
}
.ll-row:hover {
  background: #1c1c1a;
}
.ll-row.active {
  border-color: rgba(31, 168, 130, 0.4);
  background: rgba(31, 168, 130, 0.06);
}
.ll-row-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.35rem;
}
.ll-row-name {
  font-size: 0.8rem;
  font-weight: 500;
}
.ll-row-meta {
  font-size: 0.65rem;
  color: #555550;
  margin-top: 0.2rem;
}
.ll-row-stats {
  margin-top: 0.35rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  font-size: 0.65rem;
}
.ll-stat.open {
  color: #4ade80;
}
.ll-stat.reply {
  color: #60a5fa;
}
.tag {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 8px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 1px 5px;
  border-radius: 2px;
  border: 1px solid;
}
.tag.tc {
  color: #4ade80;
  background: rgba(74, 222, 128, 0.1);
  border-color: rgba(74, 222, 128, 0.25);
}
.tag.tpo {
  color: #c084fc;
  background: rgba(192, 132, 252, 0.1);
  border-color: rgba(192, 132, 252, 0.25);
}
.tag.tpr {
  color: #fbbf24;
  background: rgba(251, 191, 36, 0.1);
  border-color: rgba(251, 191, 36, 0.25);
}
.tag.tn {
  color: #9ca3af;
  background: rgba(85, 85, 78, 0.15);
  border-color: rgba(85, 85, 78, 0.25);
}
.tag.tp {
  color: #60a5fa;
  background: rgba(96, 165, 250, 0.1);
  border-color: rgba(96, 165, 250, 0.25);
}
.ll-empty {
  font-size: 0.8rem;
  color: #8a8a82;
  padding: 1rem 0;
}
.ll-empty a {
  color: #1fa882;
}
.ll-detail-wrap {
  min-width: 0;
}
.ll-detail {
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  background: #141412;
  padding: 0.75rem 1rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: calc(100vh - 12rem);
}
.ll-detail-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
}
.ll-back {
  background: none;
  border: none;
  color: #60a5fa;
  cursor: pointer;
  font-size: 0.7rem;
  font-family: 'IBM Plex Mono', monospace;
}
.ll-detail-name {
  font-weight: 600;
  font-size: 0.95rem;
}
.ll-detail-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.6rem;
  color: #8a8a82;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.c-g {
  color: #4ade80 !important;
}
.c-b {
  color: #60a5fa !important;
}
.c-o {
  color: #fbbf24 !important;
}
.c-r {
  color: #f87171 !important;
}
.ll-detail-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
}
.inp {
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  background: #0c0c0a;
  color: #f0efe8;
  font-size: 10px;
  padding: 4px 8px;
  height: 26px;
  min-width: 160px;
}
.inp.search {
  width: 100%;
  min-width: 0;
}
.ll-table-scroll {
  overflow: auto;
  flex: 1;
  min-height: 120px;
}
.ll-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.75rem;
}
.ll-table th {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.55rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #555550;
  text-align: left;
  padding: 0.35rem 0.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}
.ll-table td {
  padding: 0.4rem 0.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  vertical-align: middle;
}
.dim {
  color: #8a8a82;
}
td.sm {
  font-size: 0.7rem;
  color: #555550;
}
</style>
