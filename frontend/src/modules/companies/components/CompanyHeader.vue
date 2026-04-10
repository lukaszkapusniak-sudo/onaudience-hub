<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';

import { getAvatarColors, contactInitials } from '../../../lib/hubDisplay';
import type { HubCompanyRow } from '../../../types/company';
import { useComposerStore } from '../../composer/store';

const props = defineProps<{ company: HubCompanyRow }>();
const emit = defineEmits<{
  'find-dms': [];
  'gen-angle': [];
  'refresh-news': [];
}>();

const router = useRouter();
const composer = useComposerStore();

const av = computed(() => getAvatarColors(props.company.name ?? ''));
const initials = computed(() => contactInitials(props.company.name ?? '').slice(0, 2));

const stars = computed(() => {
  const n = props.company.icp ?? 0;
  return '★'.repeat(Math.max(0, Math.min(5, n))) + '☆'.repeat(Math.max(0, 5 - Math.min(5, n)));
});

const typeClass: Record<string, string> = {
  client: 'tc',
  partner: 'tp',
  prospect: 'tpr',
  poc: 'tpo',
  nogo: 'tn',
};

function openComposer() {
  composer.open({
    company: props.company.name,
    companyId: props.company.id,
    note: props.company.note,
    description: props.company.description,
    angle: props.company.outreach_angle,
    category: props.company.category,
    region: props.company.region,
  });
}

function openLinkedIn() {
  window.open(
    `https://linkedin.com/search/results/companies/?keywords=${encodeURIComponent(props.company.name ?? '')}`,
    '_blank',
  );
}

function openMerge() {
  router.push('/merge');
}
</script>

<template>
  <div class="ch">
    <div class="ch__top">
      <div class="ch__av" :style="{ background: av.bg, color: av.fg }" aria-hidden="true">
        {{ initials }}
      </div>
      <div class="ch__info">
        <h2 class="ch__name">{{ company.name }}</h2>
        <div class="ch__meta">
          <span v-if="company.type" class="ch__type tag" :class="typeClass[company.type] ?? 'tpr'">
            {{ company.type }}
          </span>
          <span v-if="company.icp" class="ch__stars">{{ stars }}</span>
          <span v-if="company.category" class="ch__cat">{{ company.category }}</span>
        </div>
      </div>
    </div>

    <!-- CTA bar: 7 actions -->
    <div class="ch__cta" role="group" aria-label="Company actions">
      <button type="button" class="ch__btn" title="Draft outreach email" @click="openComposer">
        ✉ Draft Email
      </button>
      <button type="button" class="ch__btn" title="Find decision makers" @click="emit('find-dms')">
        👤 Find DMs
      </button>
      <button
        type="button"
        class="ch__btn"
        title="Generate outreach angle"
        @click="emit('gen-angle')"
      >
        ✦ Gen Angle
      </button>
      <button type="button" class="ch__btn" title="Refresh news" @click="emit('refresh-news')">
        ↻ News
      </button>
      <a
        v-if="company.website"
        :href="company.website.startsWith('http') ? company.website : 'https://' + company.website"
        target="_blank"
        rel="noopener"
        class="ch__btn"
        title="Website"
      >
        ↗ Website
      </a>
      <button type="button" class="ch__btn" title="Search LinkedIn" @click="openLinkedIn">
        in LinkedIn
      </button>
      <button
        type="button"
        class="ch__btn ch__btn--merge"
        title="Merge companies"
        @click="openMerge"
      >
        ⇒ Merge
      </button>
    </div>
  </div>
</template>

<style scoped>
.ch {
  padding: 1rem 1.25rem 0.75rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
}

.ch__top {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.ch__av {
  width: 42px;
  height: 42px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  font-weight: 700;
  flex-shrink: 0;
}

.ch__info {
  min-width: 0;
}

.ch__name {
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0 0 0.25rem;
  color: #f0efe8;
}

.ch__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem;
}

.ch__stars {
  font-size: 0.72rem;
  color: #f59e0b;
  letter-spacing: 0.05em;
}

.ch__cat {
  font-size: 0.72rem;
  color: #6b6b63;
}

.tag {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.62rem;
  text-transform: uppercase;
  padding: 0.15rem 0.4rem;
  border-radius: 3px;
}

.tc {
  background: rgba(74, 222, 128, 0.1);
  color: #4ade80;
}
.tp {
  background: rgba(125, 211, 252, 0.1);
  color: #7dd3fc;
}
.tpr {
  background: rgba(192, 132, 252, 0.1);
  color: #c084fc;
}
.tpo {
  background: rgba(251, 191, 36, 0.1);
  color: #fbbf24;
}
.tn {
  background: rgba(248, 113, 113, 0.1);
  color: #f87171;
}

.ch__cta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
}

.ch__btn {
  height: 26px;
  padding: 0 0.55rem;
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: #1a1a18;
  color: #c0c0b8;
  font-size: 0.72rem;
  cursor: pointer;
  font-family: inherit;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
}

.ch__btn:hover {
  background: #242421;
  color: #f0efe8;
}

.ch__btn--merge {
  border-color: rgba(248, 113, 113, 0.2);
  color: #f87171;
}
</style>
