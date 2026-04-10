<script setup lang="ts">
import { PERSONAS } from '../../../config/personas';
import { useComposerStore } from '../store';

const composer = useComposerStore();
</script>

<template>
  <div class="pg" role="group" aria-label="Choose persona">
    <button
      v-for="p in PERSONAS"
      :key="p.id"
      type="button"
      class="pg__tile mc-ptile"
      :class="{ 'pg__tile--active': composer.activePId === p.id }"
      :style="{ borderColor: composer.activePId === p.id ? p.color : undefined }"
      :title="p.vibe"
      @click="composer.activePId = p.id"
    >
      <span class="pg__emoji">{{ p.emoji }}</span>
      <span class="pg__name">{{ p.name }}</span>
      <span class="pg__vibe">{{ p.vibe }}</span>
    </button>
  </div>
</template>

<style scoped>
.pg {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.pg__tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.15rem;
  padding: 0.4rem 0.55rem;
  border-radius: 5px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: #1a1a18;
  cursor: pointer;
  font-family: inherit;
  transition: border-color 0.15s;
  min-width: 52px;
}

.pg__tile:hover {
  background: #242421;
  border-color: rgba(255, 255, 255, 0.2);
}

.pg__tile--active {
  background: rgba(255, 255, 255, 0.07);
  border-color: #c084fc !important;
}

.pg__emoji {
  font-size: 1.1rem;
}

.pg__name {
  font-size: 0.7rem;
  color: #f0efe8;
  font-weight: 500;
}

.pg__vibe {
  font-size: 0.6rem;
  color: #6b6b63;
}
</style>
