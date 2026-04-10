<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';

import { useMergeStore } from '../store';

const merge = useMergeStore();
const router = useRouter();

onMounted(() => {
  void merge.loadSuggestions();
});
</script>

<template>
  <div class="mv">
    <div class="mv__head">
      <h1>Merge Suggestions</h1>
      <button type="button" class="mv__btn" @click="merge.loadSuggestions()">↻ Refresh</button>
    </div>

    <p v-if="merge.loadStatus === 'loading'" class="mv__msg">Loading suggestions…</p>
    <p v-else-if="merge.loadStatus === 'error'" class="mv__msg mv__msg--err">
      {{ merge.loadError }}
    </p>
    <p v-else-if="merge.loadStatus === 'ok' && !merge.suggestions.length" class="mv__msg">
      No pending merge suggestions. 🎉
    </p>

    <div v-if="merge.loadStatus === 'ok'" class="mv__list">
      <div v-for="s in merge.suggestions" :key="s.id" class="mv__row">
        <div class="mv__pair">
          <button
            type="button"
            class="mv__co"
            @click="router.push(`/companies/${encodeURIComponent(s.company_a)}`)"
          >
            {{ s.company_a }}
          </button>
          <span class="mv__arrow">⇔</span>
          <button
            type="button"
            class="mv__co"
            @click="router.push(`/companies/${encodeURIComponent(s.company_b)}`)"
          >
            {{ s.company_b }}
          </button>
        </div>

        <div class="mv__meta">
          <span v-if="s.similarity != null" class="mv__sim">
            {{ Math.round(s.similarity * 100) }}% similar
          </span>
          <span v-if="s.reason" class="mv__reason">{{ s.reason }}</span>
        </div>

        <div class="mv__actions">
          <button
            type="button"
            class="mv__btn mv__btn--merge"
            :disabled="merge.merging === s.id"
            @click="merge.executeMerge(s.id, s.company_a, s.company_b)"
          >
            {{ merge.merging === s.id ? 'Merging…' : 'Merge (A wins)' }}
          </button>
          <button
            type="button"
            class="mv__btn mv__btn--merge"
            :disabled="merge.merging === s.id"
            @click="merge.executeMerge(s.id, s.company_b, s.company_a)"
          >
            Merge (B wins)
          </button>
          <button
            type="button"
            class="mv__btn mv__btn--dismiss"
            :disabled="merge.merging === s.id"
            @click="merge.dismissSuggestion(s.id)"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.mv {
  flex: 1;
  overflow-y: auto;
  padding: 1rem 1.25rem 2rem;
  background: #0c0c0a;
  color: #f0efe8;
  font-family: 'IBM Plex Sans', system-ui, sans-serif;
}

.mv__head {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

h1 {
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0;
  flex: 1;
}

.mv__btn {
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

.mv__btn:hover:not(:disabled) {
  background: #242421;
}

.mv__btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.mv__btn--merge {
  border-color: rgba(192, 132, 252, 0.3);
  color: #c084fc;
}

.mv__btn--dismiss {
  color: #8a8a82;
}

.mv__msg {
  font-size: 0.85rem;
  color: #8a8a82;
}

.mv__msg--err {
  color: #f87171;
}

.mv__list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.mv__row {
  padding: 0.75rem 1rem;
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 6px;
  background: #141412;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.mv__pair {
  display: flex;
  align-items: center;
  gap: 0.65rem;
}

.mv__co {
  background: none;
  border: none;
  color: #7dd3fc;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  padding: 0;
  font-family: inherit;
  text-decoration: underline;
  text-decoration-color: transparent;
}

.mv__co:hover {
  text-decoration-color: currentColor;
}

.mv__arrow {
  color: #555550;
  font-size: 0.9rem;
}

.mv__meta {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.mv__sim {
  font-size: 0.72rem;
  font-family: 'IBM Plex Mono', monospace;
  color: #c084fc;
}

.mv__reason {
  font-size: 0.72rem;
  color: #6b6b63;
}

.mv__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}
</style>
