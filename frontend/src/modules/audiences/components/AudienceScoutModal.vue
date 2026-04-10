<script setup lang="ts">
import { computed, ref } from 'vue';

import { useHubStore } from '../../../stores/hub';
import { useAudiencesStore } from '../store';

const hub = useHubStore();
const aud = useAudiencesStore();

const nameDraft = ref(aud.scoutAudience?.name ?? '');
const descDraft = ref(aud.scoutAudience?.description ?? '');
const aiPrompt = ref('');

/** Company names already in the audience (from AI build or manual) */
const selectedNames = ref<string[]>(
  aud.scoutAudience?.company_ids
    ? hub.companies
        .filter((c) => aud.scoutAudience!.company_ids!.includes(c.id))
        .map((c) => c.name ?? '')
    : aud.aiBuildIds,
);

const searchQ = ref('');
const filteredAll = computed(() => {
  const q = searchQ.value.toLowerCase().trim();
  if (!q) return hub.companies.slice(0, 50);
  return hub.companies.filter((c) => (c.name ?? '').toLowerCase().includes(q)).slice(0, 30);
});

function toggleCompany(name: string) {
  const idx = selectedNames.value.indexOf(name);
  if (idx >= 0) selectedNames.value = selectedNames.value.filter((n) => n !== name);
  else selectedNames.value = [...selectedNames.value, name];
}

async function runAiBuild() {
  if (!aiPrompt.value.trim()) return;
  await aud.aiBuild(
    aiPrompt.value,
    hub.companies.map((c) => c.name ?? ''),
  );
  selectedNames.value = aud.aiBuildIds;
}

async function saveAudience() {
  const companyIds = hub.companies
    .filter((c) => selectedNames.value.includes(c.name ?? ''))
    .map((c) => c.id);
  const existing = aud.scoutAudience;
  await aud.save({
    ...(existing?.id ? { id: existing.id } : {}),
    name: nameDraft.value,
    description: descDraft.value,
    company_ids: companyIds,
  });
  aud.closeScout();
}
</script>

<template>
  <div class="asm-overlay" @click.self="aud.closeScout()">
    <div class="asm" role="dialog" aria-modal="true" aria-label="Scout audience">
      <div class="asm__head">
        <span class="asm__title">{{ aud.scoutAudience?.id ? 'Edit' : 'New' }} Audience</span>
        <button type="button" class="asm__close" @click="aud.closeScout()">✕</button>
      </div>

      <div class="asm__body">
        <!-- Name + description -->
        <div class="asm__field">
          <label class="asm__lbl">Name</label>
          <input v-model="nameDraft" type="text" class="asm__inp" placeholder="Audience name…" />
        </div>
        <div class="asm__field">
          <label class="asm__lbl">Description</label>
          <textarea
            v-model="descDraft"
            class="asm__ta"
            rows="2"
            placeholder="What is this audience?"
          />
        </div>

        <!-- AI build -->
        <div class="asm__field">
          <label class="asm__lbl">AI Build</label>
          <div class="asm__row">
            <input
              v-model="aiPrompt"
              type="text"
              class="asm__inp"
              placeholder="Describe the audience (e.g. 'European DSP platforms')…"
              @keydown.enter="runAiBuild"
            />
            <button
              type="button"
              class="asm__btn asm__btn--ai"
              :disabled="aud.aiBuildStatus === 'loading'"
              @click="runAiBuild"
            >
              {{ aud.aiBuildStatus === 'loading' ? '✦ Building…' : '✦ Build' }}
            </button>
          </div>
          <div v-if="aud.aiBuildError" class="asm__err">{{ aud.aiBuildError }}</div>
          <div v-if="aud.aiBuildStatus === 'ok'" class="asm__ai-result">
            {{ selectedNames.length }} companies selected from AI
          </div>
        </div>

        <!-- Company search + selection -->
        <div class="asm__field">
          <label class="asm__lbl">Companies ({{ selectedNames.length }} selected)</label>
          <input v-model="searchQ" type="text" class="asm__inp" placeholder="Filter companies…" />
          <div class="asm__co-list">
            <button
              v-for="co in filteredAll"
              :key="co.id"
              type="button"
              class="asm__co-row"
              :class="{ 'asm__co-row--sel': selectedNames.includes(co.name ?? '') }"
              @click="toggleCompany(co.name ?? '')"
            >
              <span class="asm__co-check">{{
                selectedNames.includes(co.name ?? '') ? '✓' : ' '
              }}</span>
              <span class="asm__co-name">{{ co.name }}</span>
              <span class="asm__co-type">{{ co.type }}</span>
            </button>
          </div>
        </div>
      </div>

      <div class="asm__foot">
        <button type="button" class="asm__btn" @click="aud.closeScout()">Cancel</button>
        <button
          type="button"
          class="asm__btn asm__btn--primary"
          :disabled="!nameDraft.trim()"
          @click="saveAudience"
        >
          Save Audience
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.asm-overlay {
  position: fixed;
  inset: 0;
  z-index: 800;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.asm {
  background: #111110;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  width: min(620px, 100%);
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.asm__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
}

.asm__title {
  font-size: 0.9rem;
  font-weight: 600;
  color: #f0efe8;
}

.asm__close {
  background: none;
  border: none;
  color: #8a8a82;
  font-size: 1rem;
  cursor: pointer;
  padding: 0.2rem 0.4rem;
}

.asm__body {
  flex: 1;
  overflow-y: auto;
  padding: 0.75rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.asm__field {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.asm__lbl {
  font-size: 0.65rem;
  font-family: 'IBM Plex Mono', monospace;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #555550;
}

.asm__inp {
  height: 32px;
  padding: 0 0.6rem;
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: #1a1a18;
  color: #f0efe8;
  font-size: 0.8rem;
  font-family: inherit;
}

.asm__ta {
  padding: 0.4rem 0.6rem;
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: #1a1a18;
  color: #f0efe8;
  font-size: 0.8rem;
  font-family: inherit;
  resize: vertical;
}

.asm__row {
  display: flex;
  gap: 0.4rem;
}

.asm__row .asm__inp {
  flex: 1;
}

.asm__btn {
  height: 30px;
  padding: 0 0.75rem;
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: #1a1a18;
  color: #f0efe8;
  font-size: 0.78rem;
  cursor: pointer;
  font-family: inherit;
  white-space: nowrap;
}

.asm__btn:hover:not(:disabled) {
  background: #242421;
}

.asm__btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.asm__btn--ai {
  border-color: rgba(192, 132, 252, 0.3);
  color: #c084fc;
}

.asm__btn--primary {
  background: #c084fc;
  border-color: transparent;
  color: #fff;
  font-weight: 600;
}

.asm__err {
  font-size: 0.72rem;
  color: #f87171;
}

.asm__ai-result {
  font-size: 0.72rem;
  color: #4ade80;
}

.asm__co-list {
  max-height: 220px;
  overflow-y: auto;
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 4px;
  background: #0d0d0b;
}

.asm__co-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  width: 100%;
  padding: 0.3rem 0.5rem;
  background: none;
  border: none;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  color: #c0c0b8;
  font-size: 0.75rem;
  cursor: pointer;
  font-family: inherit;
  text-align: left;
}

.asm__co-row:last-child {
  border-bottom: none;
}

.asm__co-row:hover {
  background: rgba(255, 255, 255, 0.04);
  color: #f0efe8;
}

.asm__co-row--sel {
  background: rgba(192, 132, 252, 0.07);
  color: #f0efe8;
}

.asm__co-check {
  width: 1rem;
  color: #4ade80;
  font-size: 0.7rem;
  flex-shrink: 0;
  font-family: 'IBM Plex Mono', monospace;
}

.asm__co-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.asm__co-type {
  font-size: 0.65rem;
  color: #555550;
  font-family: 'IBM Plex Mono', monospace;
  flex-shrink: 0;
}

.asm__foot {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  padding: 0.65rem 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.07);
}
</style>
