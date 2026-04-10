<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';

import { getAvatarColors, contactInitials } from '../../../lib/hubDisplay';
import { useHubStore } from '../../../stores/hub';
import { useComposerStore } from '../store';
import PersonaGrid from './PersonaGrid.vue';

const composer = useComposerStore();
const hub = useHubStore();

const coSearch = ref('');
const coResults = computed(() => {
  const q = coSearch.value.toLowerCase().trim();
  if (!q) return [];
  return hub.companies.filter((c) => (c.name ?? '').toLowerCase().includes(q)).slice(0, 8);
});

function pickCompany(name: string, id: string) {
  coSearch.value = '';
  composer.open({
    company: name,
    companyId: id,
    note: hub.companies.find((c) => c.id === id)?.note ?? null,
    description: hub.companies.find((c) => c.id === id)?.description ?? null,
    category: hub.companies.find((c) => c.id === id)?.category ?? null,
    region: hub.companies.find((c) => c.id === id)?.region ?? null,
  });
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape' && composer.isOpen) {
    e.stopPropagation();
    composer.close();
  }
}

onMounted(() => window.addEventListener('keydown', onKey));
onUnmounted(() => window.removeEventListener('keydown', onKey));
</script>

<template>
  <Teleport to="body">
    <div
      id="mcDrawer"
      class="mc-drawer"
      :class="{ 'mc-drawer--open': composer.isOpen }"
      role="dialog"
      aria-modal="true"
      aria-label="Email composer"
    >
      <div class="mc-inner">
        <!-- Left panel -->
        <div class="mc-left">
          <div class="mc-header">
            <span class="mc-title">✉ Compose</span>
            <button
              type="button"
              class="mc-close"
              aria-label="Close composer"
              @click="composer.close()"
            >
              ✕
            </button>
          </div>

          <!-- Company block -->
          <div class="mc-section">
            <div class="mc-label">Company</div>
            <div v-if="composer.payload.company" class="mc-company-row">
              <span class="mc-company-name">{{ composer.payload.company }}</span>
              <button type="button" class="mc-link" @click="composer.payload.company = undefined">
                Change
              </button>
            </div>
            <div v-else class="mc-co-search">
              <input
                v-model="coSearch"
                type="text"
                class="mc-inp"
                placeholder="Search company…"
                autocomplete="off"
              />
              <div v-if="coResults.length" class="mc-co-results">
                <button
                  v-for="co in coResults"
                  :key="co.id"
                  type="button"
                  class="mc-co-item"
                  @click="pickCompany(co.name ?? '', co.id)"
                >
                  {{ co.name }}
                </button>
              </div>
            </div>
          </div>

          <!-- Contact picker -->
          <div v-if="composer.contacts.length" class="mc-section">
            <div class="mc-label">Contact</div>
            <div class="mc-contacts">
              <button
                v-for="(ct, i) in composer.contacts"
                :key="ct.id ?? i"
                type="button"
                class="mc-ct-row"
                :class="{ 'mc-ct-row--sel': composer.selectedContactIdx === i }"
                @click="composer.selectedContactIdx = composer.selectedContactIdx === i ? -1 : i"
              >
                <div
                  class="mc-ct-av"
                  :style="{
                    background: getAvatarColors(ct.full_name ?? '').bg,
                    color: getAvatarColors(ct.full_name ?? '').fg,
                  }"
                >
                  {{ contactInitials(ct.full_name ?? '') }}
                </div>
                <div class="mc-ct-info">
                  <div class="mc-ct-name">{{ ct.full_name }}</div>
                  <div class="mc-ct-title">{{ ct.title }}</div>
                </div>
              </button>
            </div>
          </div>

          <!-- Context fields -->
          <div class="mc-section">
            <div class="mc-label">Context</div>
            <textarea
              v-model="composer.contextNote"
              class="mc-ta"
              rows="2"
              placeholder="Company description or context…"
            />
          </div>
          <div class="mc-section">
            <div class="mc-label">Angle</div>
            <textarea
              v-model="composer.angleNote"
              class="mc-ta"
              rows="2"
              placeholder="Outreach angle or hook…"
            />
          </div>

          <!-- Personas -->
          <div class="mc-section">
            <div class="mc-label">Style</div>
            <PersonaGrid />
          </div>

          <button
            id="mcGenBtn"
            type="button"
            class="mc-gen-btn"
            :disabled="!composer.payload.company || composer.generating"
            @click="composer.generate()"
          >
            <span v-if="composer.generating" class="mc-spin">⟳</span>
            <span v-else>✉</span>
            <span>{{ composer.generating ? 'Generating…' : 'Generate Email' }}</span>
          </button>
        </div>

        <!-- Right panel -->
        <div class="mc-right">
          <div class="mc-out-label">
            <span v-if="composer.generating">Generating…</span>
            <span v-else-if="composer.generatedEmail">Ready</span>
            <span v-else class="mc-out-dim">Output will appear here</span>
          </div>

          <div v-if="composer.generateError" class="mc-error">{{ composer.generateError }}</div>

          <div v-if="composer.generatedEmail" id="mcOutContent" class="mc-out-content">
            <div v-if="composer.generatedEmail.subject" class="mc-subject">
              {{ composer.generatedEmail.subject }}
            </div>
            <pre class="mc-body">{{ composer.generatedEmail.body }}</pre>
            <div class="mc-actions">
              <button type="button" class="mc-action-btn" @click="composer.copy()">⎘ Copy</button>
            </div>
          </div>

          <div v-else-if="!composer.generating" id="mcEmpty" class="mc-empty">
            Pick a company, choose a style, then click Generate Email.
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.mc-drawer {
  position: fixed;
  inset: 0;
  z-index: 900;
  display: flex;
  align-items: stretch;
  pointer-events: none;
  transform: translateX(100%);
  transition: transform 0.2s ease;
}

.mc-drawer--open {
  pointer-events: all;
  transform: translateX(0);
}

.mc-inner {
  display: flex;
  width: min(90vw, 900px);
  margin-left: auto;
  height: 100%;
  background: #111110;
  border-left: 1px solid rgba(255, 255, 255, 0.1);
  overflow: hidden;
}

.mc-left {
  width: 340px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 0;
  overflow-y: auto;
  border-right: 1px solid rgba(255, 255, 255, 0.07);
  padding: 0 0 1rem;
}

.mc-right {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  padding: 1rem;
  overflow-y: auto;
}

.mc-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem 0.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
  position: sticky;
  top: 0;
  background: #111110;
  z-index: 1;
}

.mc-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: #f0efe8;
}

.mc-close {
  background: none;
  border: none;
  color: #8a8a82;
  font-size: 1rem;
  cursor: pointer;
  padding: 0.2rem 0.4rem;
  border-radius: 3px;
}

.mc-close:hover {
  color: #f0efe8;
  background: rgba(255, 255, 255, 0.06);
}

.mc-section {
  padding: 0.6rem 1rem 0.4rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.mc-label {
  font-size: 0.65rem;
  font-family: 'IBM Plex Mono', monospace;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #555550;
  margin-bottom: 0.35rem;
}

.mc-company-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.mc-company-name {
  font-size: 0.85rem;
  font-weight: 500;
  color: #f0efe8;
}

.mc-link {
  background: none;
  border: none;
  color: #7dd3fc;
  font-size: 0.72rem;
  cursor: pointer;
  text-decoration: underline;
  font-family: inherit;
  padding: 0;
}

.mc-inp {
  width: 100%;
  box-sizing: border-box;
  height: 30px;
  padding: 0 0.5rem;
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: #1a1a18;
  color: #f0efe8;
  font-size: 0.8rem;
  font-family: inherit;
}

.mc-co-results {
  margin-top: 0.25rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  background: #1a1a18;
  overflow: hidden;
}

.mc-co-item {
  display: block;
  width: 100%;
  text-align: left;
  padding: 0.35rem 0.6rem;
  background: none;
  border: none;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  color: #c0c0b8;
  font-size: 0.78rem;
  cursor: pointer;
  font-family: inherit;
}

.mc-co-item:last-child {
  border-bottom: none;
}

.mc-co-item:hover {
  background: rgba(255, 255, 255, 0.06);
  color: #f0efe8;
}

.mc-contacts {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  max-height: 140px;
  overflow-y: auto;
}

.mc-ct-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.3rem 0.4rem;
  border-radius: 4px;
  border: 1px solid transparent;
  background: none;
  cursor: pointer;
  font-family: inherit;
}

.mc-ct-row:hover {
  background: rgba(255, 255, 255, 0.04);
}

.mc-ct-row--sel {
  border-color: rgba(192, 132, 252, 0.4);
  background: rgba(192, 132, 252, 0.07);
}

.mc-ct-av {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.65rem;
  font-weight: 600;
  flex-shrink: 0;
}

.mc-ct-info {
  text-align: left;
  min-width: 0;
}

.mc-ct-name {
  font-size: 0.78rem;
  color: #f0efe8;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mc-ct-title {
  font-size: 0.68rem;
  color: #6b6b63;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mc-ta {
  width: 100%;
  box-sizing: border-box;
  padding: 0.4rem 0.5rem;
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: #1a1a18;
  color: #f0efe8;
  font-size: 0.78rem;
  font-family: inherit;
  resize: vertical;
  min-height: 46px;
}

.mc-gen-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  margin: 0.75rem 1rem 0;
  height: 36px;
  border-radius: 5px;
  border: none;
  background: #c084fc;
  color: #fff;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  transition: opacity 0.15s;
}

.mc-gen-btn:hover:not(:disabled) {
  opacity: 0.9;
}

.mc-gen-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.mc-spin {
  display: inline-block;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.mc-out-label {
  font-size: 0.7rem;
  font-family: 'IBM Plex Mono', monospace;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #555550;
  margin-bottom: 0.75rem;
}

.mc-error {
  color: #f87171;
  font-size: 0.8rem;
  padding: 0.5rem;
  border-radius: 4px;
  border: 1px solid rgba(248, 113, 113, 0.2);
  background: rgba(248, 113, 113, 0.07);
}

.mc-out-dim {
  color: #3a3a38;
}

.mc-out-content {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.mc-subject {
  font-size: 0.9rem;
  font-weight: 600;
  color: #f0efe8;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.mc-body {
  font-family: 'IBM Plex Sans', system-ui, sans-serif;
  font-size: 0.82rem;
  color: #d4d4cc;
  white-space: pre-wrap;
  line-height: 1.6;
  margin: 0;
}

.mc-actions {
  display: flex;
  gap: 0.5rem;
}

.mc-action-btn {
  height: 28px;
  padding: 0 0.65rem;
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: #1a1a18;
  color: #f0efe8;
  font-size: 0.75rem;
  cursor: pointer;
  font-family: inherit;
}

.mc-action-btn:hover {
  background: #242421;
}

.mc-empty {
  font-size: 0.8rem;
  color: #3a3a38;
  margin-top: 2rem;
  text-align: center;
  line-height: 1.5;
}
</style>
