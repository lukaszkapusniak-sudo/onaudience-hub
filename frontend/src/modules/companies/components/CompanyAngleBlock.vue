<script setup lang="ts">
import { ref } from 'vue';

import { PERSONAS } from '../../../config/personas';
import { useCompanyDetailStore } from '../store';

const store = useCompanyDetailStore();
const pickerOpen = ref(false);

function pickPersona(id: string) {
  pickerOpen.value = false;
  void store.generateAngle(id);
}
</script>

<template>
  <div class="cab">
    <div class="cab__head">
      <span class="cab__title">Outreach Angle</span>
      <button
        type="button"
        class="cab__btn"
        :disabled="store.angleStatus === 'loading'"
        @click="pickerOpen = !pickerOpen"
      >
        {{ store.angleStatus === 'loading' ? '✦ Generating…' : '✦ Generate' }}
      </button>
    </div>

    <!-- Persona picker -->
    <div v-if="pickerOpen" class="cab__picker">
      <button
        v-for="p in PERSONAS"
        :key="p.id"
        type="button"
        class="cab__ptile"
        :title="p.vibe"
        @click="pickPersona(p.id)"
      >
        {{ p.emoji }} {{ p.name }}
      </button>
    </div>

    <div v-if="store.angleStatus === 'loading'" class="cab__loading">Generating angle…</div>
    <div v-if="store.angleError" class="cab__err">{{ store.angleError }}</div>

    <div v-if="store.currentCompany?.outreach_angle" class="cab__text">
      {{ store.currentCompany.outreach_angle }}
    </div>
    <div v-else-if="store.angleStatus !== 'loading'" class="cab__empty">
      No angle yet — click Generate to create one.
    </div>
  </div>
</template>

<style scoped>
.cab {
  padding: 0.6rem 1.25rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.cab__head {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.45rem;
}

.cab__title {
  font-size: 0.72rem;
  font-family: 'IBM Plex Mono', monospace;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #555550;
  flex: 1;
}

.cab__btn {
  height: 22px;
  padding: 0 0.5rem;
  border-radius: 3px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: transparent;
  color: #c084fc;
  font-size: 0.68rem;
  cursor: pointer;
  font-family: inherit;
}

.cab__btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.cab__picker {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  margin-bottom: 0.5rem;
}

.cab__ptile {
  height: 24px;
  padding: 0 0.45rem;
  border-radius: 3px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: #1a1a18;
  color: #c0c0b8;
  font-size: 0.7rem;
  cursor: pointer;
  font-family: inherit;
}

.cab__ptile:hover {
  background: #242421;
  color: #f0efe8;
}

.cab__loading {
  font-size: 0.75rem;
  color: #c084fc;
}

.cab__err {
  font-size: 0.75rem;
  color: #f87171;
}

.cab__text {
  font-size: 0.82rem;
  color: #d4d4cc;
  line-height: 1.55;
  padding: 0.5rem;
  border-radius: 4px;
  background: rgba(192, 132, 252, 0.05);
  border: 1px solid rgba(192, 132, 252, 0.15);
}

.cab__empty {
  font-size: 0.75rem;
  color: #555550;
}
</style>
