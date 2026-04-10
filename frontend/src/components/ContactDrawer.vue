<script setup lang="ts">
import { computed } from 'vue';
import type { HubContact } from '../types/contact';
import { contactInitials, escHtml, formatLemlistDate, getAvatarColors } from '../lib/hubDisplay';

const props = defineProps<{
  open: boolean;
  contact: HubContact | null;
}>();

const emit = defineEmits<{
  close: [];
  'draft-email': [];
  linkedin: [];
  'gmail-history': [];
  research: [];
}>();

const REL_COLOR: Record<string, string> = {
  warm: 'var(--cd-cc)',
  cold: 'var(--cd-t3)',
  active: 'var(--cd-gb)',
};

const STATUS_COLOR: Record<string, string> = {
  replied: 'var(--cd-cc)',
  contacted: 'var(--cd-gb)',
  pending: 'var(--cd-prc)',
  bounced: 'var(--cd-cr)',
};

const LEMLIST_TAG: Record<string, string> = {
  sent: 'cd-tpr',
  opened: 'cd-tp',
  clicked: 'cd-tc',
  replied: 'cd-tc',
  bounced: 'cd-tn',
  unsubscribed: 'cd-tn',
  interested: 'cd-tc',
};

const avatar = computed(() => {
  const n = props.contact?.full_name || '';
  const { bg, fg } = getAvatarColors(n);
  return { text: contactInitials(n), bg, fg };
});

const subtitle = computed(() => {
  const c = props.contact;
  if (!c) return '—';
  const t = (c.title || '').trim();
  const co = (c.company_name || '').trim();
  if (t && co) return `${t} · ${co}`;
  return t || co || '—';
});

function cleanTitle(raw: string): string {
  return raw.replace(/ - [^-]+$/, '').trim();
}

type FieldRow =
  | {
      key: string;
      label: string;
      kind: 'title' | 'plain' | 'notes';
      value: string;
      color?: string;
      uppercase?: boolean;
    }
  | { key: string; label: string; kind: 'email'; email: string }
  | { key: string; label: string; kind: 'link'; href: string; text: string };

const fieldRows = computed((): FieldRow[] => {
  const c = props.contact;
  if (!c) return [];
  const rows: FieldRow[] = [];
  const pushPlain = (
    key: string,
    label: string,
    raw: string | null | undefined,
    kind: 'title' | 'plain' | 'notes' = 'plain',
    color?: string,
  ) => {
    const v = (raw ?? '').trim();
    if (!v) return;
    const value = kind === 'title' ? cleanTitle(v) : v;
    rows.push({ key, label, kind, value, color });
  };

  pushPlain('title', 'Title', c.title, 'title');
  if (c.email?.trim()) {
    rows.push({ key: 'email', label: 'Email', kind: 'email', email: c.email.trim() });
  }
  pushPlain('phone', 'Phone', c.phone);
  if (c.linkedin_url?.trim()) {
    rows.push({
      key: 'linkedin',
      label: 'LinkedIn',
      kind: 'link',
      href: c.linkedin_url.trim(),
      text: c.linkedin_url.trim(),
    });
  }
  pushPlain('department', 'Dept', c.department);
  const sen = (c.seniority ?? '').trim();
  if (sen) {
    rows.push({
      key: 'seniority',
      label: 'Seniority',
      kind: 'plain',
      value: sen,
      uppercase: true,
    });
  }
  pushPlain('location', 'Location', c.location);
  if (c.outreach_status?.trim()) {
    rows.push({
      key: 'outreach_status',
      label: 'Status',
      kind: 'plain',
      value: c.outreach_status.trim(),
      color: STATUS_COLOR[c.outreach_status] ?? 'var(--cd-t2)',
    });
  }
  if (c.relationship_strength?.trim()) {
    rows.push({
      key: 'relationship_strength',
      label: 'Relationship',
      kind: 'plain',
      value: c.relationship_strength.trim(),
      color: REL_COLOR[c.relationship_strength] ?? 'var(--cd-t2)',
    });
  }
  if (c.last_contacted_at?.trim()) {
    pushPlain('last_contacted_at', 'Last Contact', c.last_contacted_at.slice(0, 10));
  }
  pushPlain('warm_intro_path', 'Warm Intro', c.warm_intro_path);
  if (c.notes?.trim()) {
    rows.push({ key: 'notes', label: 'Notes', kind: 'notes', value: c.notes.trim() });
  }
  return rows;
});

const lemlistSection = computed(() => {
  const c = props.contact;
  if (!c) return null;
  const hasCampaign = c.lemlist_campaign_id || c.lemlist_campaign_name;
  const hasActivity =
    c.lemlist_status ||
    c.lemlist_opened_at ||
    c.lemlist_replied_at ||
    c.lemlist_clicked_at ||
    c.lemlist_pushed_at;
  if (!hasCampaign && !hasActivity) return null;

  const status = c.lemlist_status?.trim();
  const tagClass = status ? (LEMLIST_TAG[status] ?? 'cd-tpr') : 'cd-tpr';

  return {
    tagClass,
    campaignName: c.lemlist_campaign_name?.trim(),
    status,
    pushed: formatLemlistDate(c.lemlist_pushed_at ?? ''),
    opened: formatLemlistDate(c.lemlist_opened_at ?? ''),
    replied: formatLemlistDate(c.lemlist_replied_at ?? ''),
    clicked: formatLemlistDate(c.lemlist_clicked_at ?? ''),
  };
});

function onOverlayClick() {
  emit('close');
}
</script>

<template>
  <Teleport to="body">
    <div
      v-show="open && contact"
      class="cd-overlay"
      aria-hidden="true"
      @click.self="onOverlayClick"
    />
    <aside
      v-show="open && contact"
      class="cd-panel"
      :class="{ 'cd-panel--open': open && contact }"
      role="dialog"
      aria-modal="true"
      :aria-label="contact?.full_name ? `Contact ${contact.full_name}` : 'Contact'"
    >
      <template v-if="contact">
        <div class="cd-head">
          <div class="cd-av" :style="{ background: avatar.bg, color: avatar.fg }">
            {{ avatar.text }}
          </div>
          <div class="cd-head-text">
            <div class="cd-name">{{ contact.full_name || '—' }}</div>
            <div class="cd-sub">{{ subtitle }}</div>
          </div>
          <button type="button" class="cd-close" aria-label="Close" @click="emit('close')">
            ×
          </button>
        </div>

        <div class="cd-body">
          <div v-for="row in fieldRows" :key="row.key" class="cd-field">
            <label>{{ row.label }}</label>
            <p v-if="row.kind === 'email'">
              <a class="cd-mono cd-link" :href="`mailto:${row.email}`">{{ escHtml(row.email) }}</a>
            </p>
            <p v-else-if="row.kind === 'link'">
              <a class="cd-mono cd-link" :href="row.href" target="_blank" rel="noopener">{{
                escHtml(row.text)
              }}</a>
            </p>
            <p v-else-if="row.kind === 'notes'" class="cd-notes">{{ escHtml(row.value) }}</p>
            <p
              v-else-if="'color' in row && row.color"
              :style="{ color: row.color }"
              class="cd-mono"
            >
              {{ escHtml(row.value) }}
            </p>
            <p v-else class="cd-mono" :class="{ 'cd-mono-up': row.uppercase }">
              {{ escHtml(row.value) }}
            </p>
          </div>

          <template v-if="lemlistSection">
            <div class="cd-ll-head">📤 Lemlist Outreach</div>
            <div v-if="lemlistSection.campaignName" class="cd-field">
              <label>Campaign</label>
              <p class="cd-mono">{{ escHtml(lemlistSection.campaignName) }}</p>
            </div>
            <div v-if="lemlistSection.status" class="cd-field">
              <label>LL Status</label>
              <p>
                <span class="cd-tag" :class="lemlistSection.tagClass">{{
                  escHtml(lemlistSection.status)
                }}</span>
              </p>
            </div>
            <div v-if="lemlistSection.pushed" class="cd-field">
              <label>Pushed</label>
              <p class="cd-mono">{{ lemlistSection.pushed }}</p>
            </div>
            <div v-if="lemlistSection.opened" class="cd-field">
              <label>👁 Opened</label>
              <p class="cd-mono cd-ll-open">{{ lemlistSection.opened }}</p>
            </div>
            <div v-if="lemlistSection.replied" class="cd-field">
              <label>💬 Replied</label>
              <p class="cd-mono cd-ll-reply">{{ lemlistSection.replied }}</p>
            </div>
            <div v-if="lemlistSection.clicked" class="cd-field">
              <label>🖱 Clicked</label>
              <p class="cd-mono cd-ll-click">{{ lemlistSection.clicked }}</p>
            </div>
          </template>
        </div>

        <div class="cd-actions">
          <button type="button" class="cd-btn" @click="emit('draft-email')">✉ Draft Email</button>
          <button type="button" class="cd-btn" @click="emit('linkedin')">LinkedIn ↗</button>
          <button type="button" class="cd-btn" @click="emit('gmail-history')">Gmail History</button>
          <button type="button" class="cd-btn cd-btn--primary" @click="emit('research')">
            Full Research ↗
          </button>
        </div>
      </template>
    </aside>
  </Teleport>
</template>

<style scoped>
/* Hub dark-theme tokens (subset of `www/hub/style.css`) */
.cd-panel {
  --cd-bg: #141412;
  --cd-surf2: #1c1c1a;
  --cd-rule: rgba(255, 255, 255, 0.08);
  --cd-t1: #f0efe8;
  --cd-t2: #8a8a82;
  --cd-t3: #555550;
  --cd-t4: #38382e;
  --cd-g: #1fa882;
  --cd-gb: rgba(31, 168, 130, 0.1);
  --cd-cc: #4ade80;
  --cd-cr: rgba(74, 222, 128, 0.25);
  --cd-pc: #60a5fa;
  --cd-prc: #fbbf24;
  --cd-sh: 0 1px 3px rgba(0, 0, 0, 0.5), 0 6px 20px rgba(0, 0, 0, 0.35);

  position: fixed;
  top: 0;
  right: -390px;
  width: 380px;
  height: 100vh;
  background: var(--cd-bg);
  border-left: 1px solid var(--cd-rule);
  z-index: 9000;
  transition: right 0.25s;
  display: flex;
  flex-direction: column;
  box-shadow: var(--cd-sh);
  font-family: 'IBM Plex Sans', system-ui, sans-serif;
}

.cd-panel--open {
  right: 0;
}

.cd-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
  z-index: 8999;
  display: block;
  backdrop-filter: blur(2px);
}

.cd-head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px;
  border-bottom: 1px solid var(--cd-rule);
  flex-shrink: 0;
}

.cd-av {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 13px;
  font-weight: 600;
}

.cd-head-text {
  min-width: 0;
  flex: 1;
}

.cd-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--cd-t1);
}

.cd-sub {
  font-size: 11px;
  color: var(--cd-t3);
  margin-top: 1px;
}

.cd-close {
  margin-left: auto;
  font-size: 18px;
  cursor: pointer;
  color: var(--cd-t3);
  padding: 4px;
  background: none;
  border: none;
  line-height: 1;
}

.cd-close:hover {
  color: var(--cd-t1);
}

.cd-body {
  flex: 1;
  overflow-y: auto;
  padding: 14px;
}

.cd-field {
  margin-bottom: 12px;
}

.cd-field label {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 8px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--cd-t3);
  display: block;
  margin-bottom: 3px;
}

.cd-field p {
  font-size: 11px;
  color: var(--cd-t1);
  margin: 0;
}

.cd-mono {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 9px;
}

.cd-mono-up {
  text-transform: uppercase;
}

.cd-notes {
  font-size: 10px;
  line-height: 1.5;
  white-space: pre-wrap;
}

.cd-link {
  color: var(--cd-g);
  text-decoration: none;
}

.cd-link:hover {
  text-decoration: underline;
}

.cd-ll-head {
  margin-top: 14px;
  padding: 6px 16px 4px;
  font-size: 8px;
  font-weight: 600;
  letter-spacing: 0.08em;
  color: var(--cd-t4);
  text-transform: uppercase;
  background: var(--cd-surf2);
  border-top: 1px solid var(--cd-rule);
}

.cd-ll-open {
  color: var(--cd-g);
}

.cd-ll-reply {
  color: var(--cd-pc);
}

.cd-ll-click {
  color: var(--cd-prc);
}

.cd-tag {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 8px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 1px 5px;
  border-radius: 2px;
  border: 1px solid;
  white-space: nowrap;
}

.cd-tc {
  color: var(--cd-cc);
  background: rgba(74, 222, 128, 0.1);
  border-color: var(--cd-cr);
}

.cd-tp {
  color: var(--cd-pc);
  background: rgba(96, 165, 250, 0.1);
  border-color: rgba(96, 165, 250, 0.25);
}

.cd-tpr {
  color: var(--cd-prc);
  background: rgba(251, 191, 36, 0.1);
  border-color: rgba(251, 191, 36, 0.25);
}

.cd-tn {
  color: #55554e;
  background: rgba(85, 85, 78, 0.15);
  border-color: rgba(85, 85, 78, 0.25);
}

.cd-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  padding: 14px;
  border-top: 1px solid var(--cd-rule);
  flex-shrink: 0;
}

.cd-btn {
  height: 26px;
  padding: 0 10px;
  border: 1px solid var(--cd-rule);
  border-radius: 2px;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 9px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  cursor: pointer;
  background: transparent;
  color: var(--cd-t1);
}

.cd-btn:hover {
  background: rgba(255, 255, 255, 0.05);
}

.cd-btn--primary {
  border-color: var(--cd-g);
  color: var(--cd-g);
}
</style>
