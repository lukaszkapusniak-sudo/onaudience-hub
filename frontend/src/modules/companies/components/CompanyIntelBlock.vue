<script setup lang="ts">
import { useCompanyDetailStore } from '../store';

const emit = defineEmits<{ 'refresh-news': [] }>();
const store = useCompanyDetailStore();
</script>

<template>
  <div class="cib">
    <div class="cib__head">
      <span class="cib__title">Intelligence</span>
      <button
        type="button"
        class="cib__btn"
        :disabled="store.newsStatus === 'loading'"
        @click="emit('refresh-news')"
      >
        {{ store.newsStatus === 'loading' ? '↻ Loading…' : '↻ Refresh' }}
      </button>
    </div>

    <div v-if="store.newsStatus === 'loading'" class="cib__loading">Fetching news…</div>
    <div v-else-if="store.newsStatus === 'error'" class="cib__err">Could not fetch news.</div>

    <div v-if="store.news.length" class="cib__list">
      <div class="cib__source-label">
        <span class="cib__dot cib__dot--live" />
        Live — Google News
      </div>
      <a
        v-for="(item, i) in store.news"
        :key="i"
        :href="item.url ?? '#'"
        target="_blank"
        rel="noopener"
        class="cib__item"
      >
        <div class="cib__item-title">{{ item.title }} ↗</div>
        <div class="cib__item-meta">
          <span class="cib__src">{{ item.source }}</span>
          <span class="cib__date">{{ item.date }}</span>
        </div>
      </a>
    </div>

    <div v-else-if="store.newsStatus === 'ok' && !store.news.length" class="cib__empty">
      No recent news.
    </div>
  </div>
</template>

<style scoped>
.cib {
  padding: 0.6rem 1.25rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.cib__head {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.45rem;
}

.cib__title {
  font-size: 0.72rem;
  font-family: 'IBM Plex Mono', monospace;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #555550;
  flex: 1;
}

.cib__btn {
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

.cib__btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.cib__loading,
.cib__empty {
  font-size: 0.75rem;
  color: #555550;
}

.cib__err {
  font-size: 0.75rem;
  color: #f87171;
}

.cib__source-label {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.65rem;
  color: #6b6b63;
  margin-bottom: 0.35rem;
}

.cib__dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #555550;
}

.cib__dot--live {
  background: #ef4444;
  box-shadow: 0 0 4px rgba(239, 68, 68, 0.5);
}

.cib__list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.cib__item {
  display: block;
  text-decoration: none;
  padding: 0.3rem 0;
}

.cib__item:hover .cib__item-title {
  color: #f0efe8;
}

.cib__item-title {
  font-size: 0.78rem;
  color: #c0c0b8;
  line-height: 1.3;
  margin-bottom: 0.15rem;
}

.cib__item-meta {
  display: flex;
  gap: 0.5rem;
  font-size: 0.65rem;
  color: #555550;
}

.cib__src {
  color: #6b6b63;
}
</style>
