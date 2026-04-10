<script setup lang="ts">
import { ref } from 'vue';

import { getAvatarColors, contactInitials } from '../../../lib/hubDisplay';
import { useCompanyDetailStore } from '../store';

const emit = defineEmits<{ 'find-dms': [] }>();

const store = useCompanyDetailStore();
const showDms = ref(false);
</script>

<template>
  <div class="ccb">
    <div class="ccb__head">
      <span class="ccb__title">Contacts</span>
      <span class="ccb__count">{{ store.companyContacts.length }}</span>
      <button type="button" class="ccb__btn" @click="emit('find-dms')">👤 Find DMs</button>
      <button
        v-if="store.dmsStatus === 'ok' && store.dmsContacts.length"
        type="button"
        class="ccb__btn ccb__btn--dim"
        @click="showDms = !showDms"
      >
        {{ showDms ? 'Hide' : 'AI suggestions' }} ({{ store.dmsContacts.length }})
      </button>
    </div>

    <!-- DB contacts -->
    <div v-if="store.companyContacts.length" class="ccb__list">
      <div v-for="(ct, i) in store.companyContacts" :key="ct.id ?? i" class="ccb__row">
        <div
          class="ccb__av"
          :style="{
            background: getAvatarColors(ct.full_name ?? '').bg,
            color: getAvatarColors(ct.full_name ?? '').fg,
          }"
        >
          {{ contactInitials(ct.full_name ?? '').slice(0, 2) }}
        </div>
        <div class="ccb__info">
          <div class="ccb__name">{{ ct.full_name }}</div>
          <div class="ccb__sub">
            {{ ct.title }}<span v-if="ct.email"> · {{ ct.email }}</span>
          </div>
        </div>
        <div class="ccb__links">
          <a
            v-if="ct.linkedin_url"
            :href="ct.linkedin_url"
            target="_blank"
            rel="noopener"
            class="ccb__ico"
            title="LinkedIn"
            >in</a
          >
          <a v-if="ct.email" :href="'mailto:' + ct.email" class="ccb__ico" title="Email">✉</a>
        </div>
      </div>
    </div>

    <!-- AI DM suggestions -->
    <div v-if="showDms && store.dmsContacts.length" class="ccb__dms">
      <div class="ccb__dms-label">AI-suggested decision makers</div>
      <div v-for="(ct, i) in store.dmsContacts" :key="i" class="ccb__row ccb__row--ai">
        <div class="ccb__av ccb__av--ai">AI</div>
        <div class="ccb__info">
          <div class="ccb__name">{{ ct.full_name }}</div>
          <div class="ccb__sub">{{ ct.title }}</div>
        </div>
        <div class="ccb__links">
          <a
            v-if="ct.linkedin_url"
            :href="ct.linkedin_url"
            target="_blank"
            rel="noopener"
            class="ccb__ico"
            >in</a
          >
        </div>
      </div>
    </div>

    <!-- DM loading states -->
    <div v-if="store.dmsStatus === 'loading'" class="ccb__loading">
      🔍 Researching decision makers…
    </div>
    <div v-if="store.dmsStatus === 'error'" class="ccb__err">
      {{ store.dmsError }}
    </div>

    <div
      v-if="
        store.contactsStatus === 'ok' && !store.companyContacts.length && store.dmsStatus === 'idle'
      "
      class="ccb__empty"
    >
      No contacts yet.
      <button type="button" class="ccb__btn-link" @click="emit('find-dms')">
        Find DMs with AI
      </button>
    </div>
  </div>
</template>

<style scoped>
.ccb {
  padding: 0.6rem 1.25rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.ccb__head {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.ccb__title {
  font-size: 0.72rem;
  font-family: 'IBM Plex Mono', monospace;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #555550;
}

.ccb__count {
  font-size: 0.7rem;
  color: #6b6b63;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 3px;
  padding: 0 0.35rem;
  font-family: 'IBM Plex Mono', monospace;
}

.ccb__btn {
  height: 22px;
  padding: 0 0.5rem;
  border-radius: 3px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: transparent;
  color: #9c9c94;
  font-size: 0.68rem;
  cursor: pointer;
  font-family: inherit;
}

.ccb__btn:hover {
  color: #f0efe8;
  background: rgba(255, 255, 255, 0.05);
}

.ccb__btn--dim {
  color: #6b6b63;
}

.ccb__list,
.ccb__dms {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.ccb__dms {
  margin-top: 0.5rem;
}

.ccb__dms-label {
  font-size: 0.65rem;
  color: #555550;
  margin-bottom: 0.25rem;
  font-style: italic;
}

.ccb__row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.2rem 0.35rem;
  border-radius: 4px;
}

.ccb__row:hover {
  background: rgba(255, 255, 255, 0.03);
}

.ccb__row--ai {
  opacity: 0.75;
}

.ccb__av {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.62rem;
  font-weight: 700;
  flex-shrink: 0;
}

.ccb__av--ai {
  background: rgba(192, 132, 252, 0.1);
  color: #c084fc;
  font-size: 0.55rem;
}

.ccb__info {
  flex: 1;
  min-width: 0;
}

.ccb__name {
  font-size: 0.78rem;
  color: #f0efe8;
  font-weight: 500;
}

.ccb__sub {
  font-size: 0.68rem;
  color: #6b6b63;
}

.ccb__links {
  display: flex;
  gap: 0.3rem;
}

.ccb__ico {
  font-size: 0.68rem;
  color: #555550;
  text-decoration: none;
  padding: 0.1rem 0.3rem;
  border-radius: 3px;
  border: 1px solid rgba(255, 255, 255, 0.07);
}

.ccb__ico:hover {
  color: #7dd3fc;
  border-color: rgba(125, 211, 252, 0.3);
}

.ccb__loading {
  font-size: 0.72rem;
  color: #7dd3fc;
  padding: 0.4rem 0;
}

.ccb__err {
  font-size: 0.72rem;
  color: #f87171;
  padding: 0.4rem 0;
}

.ccb__empty {
  font-size: 0.75rem;
  color: #555550;
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.ccb__btn-link {
  background: none;
  border: none;
  color: #7dd3fc;
  font-size: inherit;
  cursor: pointer;
  text-decoration: underline;
  font-family: inherit;
  padding: 0;
}
</style>
