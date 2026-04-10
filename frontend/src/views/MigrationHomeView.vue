<script setup lang="ts">
import { RouterLink } from 'vue-router';

import { MIGRATION_PHASES } from '../config/migrationPhases';

function statusLabel(s: string): string {
  if (s === 'done') return 'Done';
  if (s === 'partial') return 'Partial';
  return 'Planned';
}

function statusClass(s: string): string {
  return `st st-${s}`;
}
</script>

<template>
  <div class="migrate">
    <header class="head">
      <h1>Hub → Vue migration</h1>
      <p class="lead">
        Step-by-step rewrite. Canonical spec: <code>docs/VUE_MIGRATION.md</code> in the repo (not
        bundled in the SPA — open it in your editor or Git host). The list below mirrors that doc;
        keep them in sync when you complete a phase.
      </p>
    </header>

    <ol class="phases">
      <li v-for="p in MIGRATION_PHASES" :key="p.id" class="phase">
        <div class="phase-top">
          <h2>{{ p.title }}</h2>
          <span :class="statusClass(p.status)">{{ statusLabel(p.status) }}</span>
        </div>
        <p class="sum">{{ p.summary }}</p>
        <div class="meta">
          <span class="label">Legacy</span>
          <code>{{ p.legacyFiles.join(', ') }}</code>
        </div>
        <div v-if="p.vueRoutes.length" class="meta">
          <span class="label">Vue routes</span>
          <span class="routes">
            <RouterLink v-for="r in p.vueRoutes" :key="r" :to="r">{{ r }}</RouterLink>
          </span>
        </div>
      </li>
    </ol>
  </div>
</template>

<style scoped>
.migrate {
  max-width: 44rem;
  margin: 0 auto;
  padding: 2rem 1.25rem 3rem;
  font-family: 'IBM Plex Sans', system-ui, sans-serif;
  background: #0f1419;
  color: #e8eaed;
  min-height: 100vh;
}
.head h1 {
  font-size: 1.5rem;
  margin: 0 0 0.75rem;
}
.lead {
  margin: 0 0 1.25rem;
  line-height: 1.5;
  color: #b8bcc4;
  font-size: 0.95rem;
}
.lead a {
  color: #7dd3fc;
}
.nav {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-bottom: 2rem;
}
.nav a {
  color: #93c5fd;
  font-size: 0.9rem;
}
.phases {
  margin: 0;
  padding: 0;
  list-style: none;
  counter-reset: step;
}
.phase {
  counter-increment: step;
  padding: 1rem 0 1.25rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}
.phase::before {
  content: 'Phase ' counter(step) ' — ';
  font-size: 0.7rem;
  font-family: 'IBM Plex Mono', monospace;
  letter-spacing: 0.06em;
  color: #6b7280;
  text-transform: uppercase;
}
.phase-top {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-top: 0.35rem;
}
.phase h2 {
  font-size: 1.05rem;
  margin: 0;
  font-weight: 600;
}
.sum {
  margin: 0.5rem 0 0.75rem;
  font-size: 0.88rem;
  color: #9ca3af;
  line-height: 1.45;
}
.meta {
  font-size: 0.78rem;
  margin-top: 0.35rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem 0.75rem;
  align-items: baseline;
}
.label {
  font-family: 'IBM Plex Mono', monospace;
  color: #6b7280;
  text-transform: uppercase;
  font-size: 0.65rem;
}
.meta code {
  font-size: 0.72rem;
  color: #d1d5db;
  word-break: break-all;
}
.routes {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.routes a {
  color: #86efac;
  font-size: 0.8rem;
}
.st {
  font-size: 0.65rem;
  font-family: 'IBM Plex Mono', monospace;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 0.15rem 0.45rem;
  border-radius: 4px;
}
.st-done {
  background: rgba(34, 197, 94, 0.15);
  color: #86efac;
}
.st-partial {
  background: rgba(251, 191, 36, 0.12);
  color: #fcd34d;
}
.st-planned {
  background: rgba(148, 163, 184, 0.12);
  color: #94a3b8;
}
</style>
