<script setup lang="ts">
import { ref } from 'vue';
import { RouterLink } from 'vue-router';
import ContactDrawer from '../components/ContactDrawer.vue';
import type { HubContact } from '../types/contact';

const sample: HubContact = {
  id: 'demo-1',
  full_name: 'Alex Morgan',
  title: 'VP Partnerships',
  email: 'alex@example.com',
  phone: '+44 20 7946 0958',
  linkedin_url: 'https://www.linkedin.com/in/example',
  department: 'Business Development',
  seniority: 'director',
  location: 'London, UK',
  company_name: 'Acme Data Ltd',
  outreach_status: 'contacted',
  relationship_strength: 'warm',
  last_contacted_at: '2025-04-01T12:00:00Z',
  warm_intro_path: 'Intro via J. Smith',
  notes: 'Met at Programmatic IO. Interested in EU data partnership.',
  lemlist_campaign_name: 'Q2 Partners EU',
  lemlist_status: 'opened',
  lemlist_pushed_at: '2025-04-02T09:15:00Z',
  lemlist_opened_at: '2025-04-02T14:22:00Z',
  lemlist_clicked_at: '2025-04-03T08:01:00Z',
};

const open = ref(false);
const contact = ref<HubContact | null>(null);

function showDrawer() {
  contact.value = { ...sample };
  open.value = true;
}

function onClose() {
  open.value = false;
}

function log(action: string) {
  console.info(`[ContactDrawer demo] ${action}`);
}
</script>

<template>
  <div class="demo">
    <header class="demo-head">
      <p class="eyebrow">Vue port</p>
      <h1>Contact drawer</h1>
      <p class="lead">
        First hub UI piece migrated from
        <code>www/hub/drawer.js</code>
        — presentational panel with typed fields and Lemlist block. Actions emit events for future
        wiring to Supabase / meeseeks / Gmail.
      </p>
      <nav class="actions">
        <button type="button" class="btn primary" @click="showDrawer">Open drawer</button>
        <RouterLink class="btn" to="/">Hub (Vue shell)</RouterLink>
        <RouterLink class="btn" to="/about">About</RouterLink>
      </nav>
    </header>

    <ContactDrawer
      :open="open"
      :contact="contact"
      @close="onClose"
      @draft-email="log('draft-email')"
      @linkedin="log('linkedin')"
      @gmail-history="log('gmail-history')"
      @research="log('research')"
    />
  </div>
</template>

<style scoped>
.demo {
  min-height: 100vh;
  padding: 2rem;
  font-family: 'IBM Plex Sans', system-ui, sans-serif;
  background: radial-gradient(ellipse at top, #0f1419 0%, #0a0c0f 50%);
  color: #e8eaed;
}
.demo-head {
  max-width: 40rem;
}
.eyebrow {
  font-size: 0.75rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #7dd3fc;
  margin: 0 0 0.75rem;
}
h1 {
  font-size: 1.75rem;
  font-weight: 600;
  margin: 0 0 1rem;
}
.lead {
  margin: 0 0 1.5rem;
  line-height: 1.55;
  color: #b8bcc4;
  font-size: 0.95rem;
}
.lead code {
  font-size: 0.85em;
  padding: 0.1em 0.35em;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.06);
}
.actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  align-items: center;
}
.btn {
  display: inline-flex;
  align-items: center;
  padding: 0.55rem 1rem;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  text-decoration: none;
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #e8eaed;
  background: transparent;
  cursor: pointer;
  font-family: inherit;
}
.btn.primary {
  background: #2563eb;
  border-color: #3b82f6;
  color: #fff;
}
.btn.primary:hover {
  background: #1d4ed8;
}
</style>
