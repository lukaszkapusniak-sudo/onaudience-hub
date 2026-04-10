import { defineStore } from 'pinia';
import { ref } from 'vue';

import { PERSONAS } from '../../config/personas';
import { anthropicFetch } from '../../lib/anthropicHub';
import { fetchContactsByCompanyName } from '../../lib/hubRest';
import { TAG_RULES } from '../../config/tagRules';
import type { HubContact } from '../../types/contact';
import type { ComposerPayload, GeneratedEmail } from '../../types/composer';

/** Model used for creative email generation — mirrors `MODEL_CREATIVE` in `config.js`. */
const MODEL_CREATIVE = 'claude-sonnet-4-20250514';

function getCoTags(payload: ComposerPayload): string[] {
  const haystack = [payload.category, payload.region, payload.note, payload.description]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return TAG_RULES.filter((r) => r.kw.some((k) => haystack.includes(k))).map((r) => r.tag);
}

export const useComposerStore = defineStore('composer', () => {
  const isOpen = ref(false);
  const payload = ref<ComposerPayload>({});
  const activePId = ref('steve');
  const contacts = ref<HubContact[]>([]);
  const selectedContactIdx = ref(-1);
  const contextNote = ref('');
  const angleNote = ref('');
  const generatedEmail = ref<GeneratedEmail | null>(null);
  const generating = ref(false);
  const generateError = ref<string | null>(null);

  function open(p: ComposerPayload) {
    payload.value = p;
    generatedEmail.value = null;
    generateError.value = null;
    selectedContactIdx.value = -1;
    contextNote.value = p.description ?? '';
    angleNote.value = p.angle ?? '';
    isOpen.value = true;
    if (p.company) void loadContacts(p.company);
  }

  function close() {
    isOpen.value = false;
    contacts.value = [];
  }

  async function loadContacts(companyName: string) {
    try {
      const rows = await fetchContactsByCompanyName(companyName);
      contacts.value = (rows as HubContact[]).filter((c) => c.full_name);
    } catch {
      contacts.value = [];
    }
  }

  async function generate() {
    const persona = PERSONAS.find((p) => p.id === activePId.value) ?? PERSONAS[0];
    const company = payload.value.company ?? 'the company';
    const ct = selectedContactIdx.value >= 0 ? contacts.value[selectedContactIdx.value] : null;
    const contactName = ct?.full_name ?? 'there';
    const contactTitle = ct?.title ?? '';
    const tags = getCoTags(payload.value);
    const ctx = contextNote.value.trim();
    const angle = angleNote.value.trim();

    const prompt = [
      `Write a cold outreach email FROM a sales person at onAudience TO ${contactName}${contactTitle ? ` (${contactTitle})` : ''} at ${company}.`,
      '',
      'onAudience: European first-party audience data company. 500M+ profiles, demographic+behavioral+purchase-intent segments across 30+ EU countries, Web + Mobile + CTV coverage, GDPR-compliant, TCF v2.0 certified. Direct integrations with major DSPs.',
      '',
      `Company signals: ${tags.length ? tags.join(', ') : 'n/a'}`,
      `Company context: ${ctx || 'n/a'}`,
      `Outreach angle: ${angle || 'n/a'}`,
      '',
      'Respond with:',
      'SUBJECT: [subject line]',
      '---',
      '[email body only — no sign-off name]',
      '',
      'Keep it 3–4 short paragraphs. End with a low-friction CTA.',
    ].join('\n');

    generating.value = true;
    generateError.value = null;
    generatedEmail.value = null;
    try {
      const data = (await anthropicFetch({
        model: MODEL_CREATIVE,
        max_tokens: 700,
        system: persona.system,
        messages: [{ role: 'user', content: prompt }],
      })) as { content?: Array<{ type: string; text?: string }>; error?: { message: string } };
      if (data.error) throw new Error(data.error.message ?? 'API error');
      const raw = (data.content ?? [])
        .filter((b) => b.type === 'text')
        .map((b) => b.text ?? '')
        .join('')
        .trim();
      let subject = '';
      let body = raw;
      const sm = raw.match(/^SUBJECT:\s*(.+?)(?:\n---|\n\n)/is);
      if (sm) {
        subject = sm[1].trim();
        body = raw.replace(/^SUBJECT:.+?\n(?:---\n)?/is, '').trim();
      }
      generatedEmail.value = { subject, body };
    } catch (e) {
      generateError.value = e instanceof Error ? e.message : String(e);
    } finally {
      generating.value = false;
    }
  }

  async function copy(): Promise<void> {
    if (!generatedEmail.value) return;
    const text = generatedEmail.value.subject
      ? `${generatedEmail.value.subject}\n\n${generatedEmail.value.body}`
      : generatedEmail.value.body;
    await navigator.clipboard.writeText(text).catch(() => undefined);
  }

  return {
    isOpen,
    payload,
    activePId,
    contacts,
    selectedContactIdx,
    contextNote,
    angleNote,
    generatedEmail,
    generating,
    generateError,
    open,
    close,
    generate,
    copy,
  };
});
