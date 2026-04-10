<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';

import { getAvatarColors, contactInitials } from '../../../lib/hubDisplay';
import { useHubStore } from '../../../stores/hub';
import ContactDrawer from '../../../components/ContactDrawer.vue';
import type { HubContact } from '../../../types/contact';
import { useComposerStore } from '../../composer/store';

const hub = useHubStore();
const composer = useComposerStore();

const searchQ = ref('');
const drawerOpen = ref(false);
const activeContact = ref<HubContact | null>(null);

const filtered = computed(() => {
  const q = searchQ.value.toLowerCase().trim();
  if (!q) return hub.contacts;
  return hub.contacts.filter(
    (c) =>
      (c.full_name ?? '').toLowerCase().includes(q) ||
      (c.title ?? '').toLowerCase().includes(q) ||
      (c.company_name ?? '').toLowerCase().includes(q) ||
      (c.email ?? '').toLowerCase().includes(q),
  );
});

function openContact(ct: HubContact) {
  activeContact.value = ct;
  drawerOpen.value = true;
}

function closeDrawer() {
  drawerOpen.value = false;
  activeContact.value = null;
}

function openLinkedIn() {
  const url = activeContact.value?.linkedin_url;
  if (url) window.open(url, '_blank');
}

function draftEmail() {
  if (!activeContact.value) return;
  composer.open({
    company: activeContact.value.company_name,
    contactName: activeContact.value.full_name,
    contactTitle: activeContact.value.title,
    linkedin: activeContact.value.linkedin_url,
  });
  closeDrawer();
}

onMounted(async () => {
  if (hub.contactsLoadStatus !== 'ok') {
    await hub.loadContacts();
  }
});
</script>

<template>
  <div class="clv">
    <div class="clv__bar">
      <h1>Contacts</h1>
      <label class="clv__search">
        <span class="sr-only">Search contacts</span>
        <input
          v-model="searchQ"
          type="search"
          class="clv__inp"
          placeholder="Search name, title, company, email…"
          autocomplete="off"
        />
      </label>
    </div>

    <p class="clv__meta">
      <span v-if="hub.contactsLoadStatus === 'loading'" class="clv__loading"
        >Loading contacts…</span
      >
      <template v-else>
        Showing <strong>{{ filtered.length }}</strong> of <strong>{{ hub.contactCount }}</strong>
        <span v-if="hub.contactsLoadingMore" class="clv__more"> · loading more…</span>
      </template>
    </p>

    <div class="clv__list">
      <button
        v-for="ct in filtered"
        :key="ct.id ?? ct.email ?? ct.full_name ?? ''"
        type="button"
        class="ct-row"
        @click="openContact(ct)"
      >
        <div
          class="ct-row__av"
          :style="{
            background: getAvatarColors(ct.full_name ?? '').bg,
            color: getAvatarColors(ct.full_name ?? '').fg,
          }"
        >
          {{ contactInitials(ct.full_name ?? '').slice(0, 2) }}
        </div>
        <div class="ct-row__info">
          <div class="ct-row__name">{{ ct.full_name || '—' }}</div>
          <div class="ct-row__sub">
            {{ ct.title }}
            <span v-if="ct.company_name"> · {{ ct.company_name }}</span>
          </div>
        </div>
        <div v-if="ct.lemlist_status" class="ct-row__status">
          {{ ct.lemlist_status }}
        </div>
      </button>
    </div>

    <ContactDrawer
      :open="drawerOpen"
      :contact="activeContact"
      @close="closeDrawer"
      @draft-email="draftEmail"
      @linkedin="openLinkedIn"
      @gmail-history="closeDrawer"
      @research="closeDrawer"
    />
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

.clv {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 1rem 1.25rem 2rem;
  background: #0c0c0a;
  color: #f0efe8;
  font-family: 'IBM Plex Sans', system-ui, sans-serif;
  min-height: 0;
  overflow-y: auto;
}

.clv__bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem 1.25rem;
  margin-bottom: 0.75rem;
}

h1 {
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0;
}

.clv__search {
  flex: 1;
  min-width: 12rem;
}

.clv__inp {
  width: 100%;
  box-sizing: border-box;
  height: 32px;
  padding: 0 0.65rem;
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: #141412;
  color: #f0efe8;
  font-size: 0.82rem;
  font-family: inherit;
}

.clv__meta {
  font-size: 0.8rem;
  color: #8a8a82;
  margin: 0 0 0.75rem;
}

.clv__meta strong {
  color: #c084fc;
}

.clv__loading,
.clv__more {
  color: #7dd3fc;
}

.clv__list {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.ct-row {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.45rem 0.5rem;
  border-radius: 5px;
  background: none;
  border: none;
  cursor: pointer;
  font-family: inherit;
  text-align: left;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  width: 100%;
}

.ct-row:hover {
  background: rgba(255, 255, 255, 0.04);
}

.ct-row__av {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.65rem;
  font-weight: 700;
  flex-shrink: 0;
}

.ct-row__info {
  flex: 1;
  min-width: 0;
}

.ct-row__name {
  font-size: 0.82rem;
  color: #f0efe8;
  font-weight: 500;
}

.ct-row__sub {
  font-size: 0.72rem;
  color: #6b6b63;
}

.ct-row__status {
  font-size: 0.65rem;
  font-family: 'IBM Plex Mono', monospace;
  color: #4ade80;
  text-transform: uppercase;
}
</style>
