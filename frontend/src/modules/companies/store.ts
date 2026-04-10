import { defineStore } from 'pinia';
import { ref } from 'vue';

import { anthropicFetch } from '../../lib/anthropicHub';
import {
  enrichCacheGet,
  enrichCacheSet,
  fetchCompanyBySlug,
  fetchCompanyRelationsForSlug,
  fetchContactsByCompany,
  fetchGoogleNewsXml,
  parseGoogleNewsXml,
  patchCompany,
} from '../../lib/hubRest';
import { PERSONAS } from '../../config/personas';
import type { HubCompanyRow } from '../../types/company';
import type { HubContact } from '../../types/contact';
import type { HubCompanyRelation } from '../../types/relation';
import type { NewsItem } from '../../types/news';

/** Model for AI tasks in the company panel. */
const MODEL_RESEARCH = 'claude-opus-4-20250514';
const MODEL_CREATIVE = 'claude-sonnet-4-20250514';

function normalizeContact(raw: Record<string, unknown>): HubContact {
  const s = (k: string) => (raw[k] as string | null | undefined) ?? null;
  return {
    id: raw.id != null ? String(raw.id) : undefined,
    full_name: s('full_name'),
    title: s('title'),
    email: s('email'),
    phone: s('phone'),
    linkedin_url: s('linkedin_url'),
    department: s('department'),
    seniority: s('seniority'),
    location: s('location'),
    company_name: s('company_name'),
    company_id: s('company_id'),
    outreach_status: s('outreach_status'),
    relationship_strength: s('relationship_strength'),
    last_contacted_at: s('last_contacted_at'),
    warm_intro_path: s('warm_intro_path'),
    notes: s('notes'),
    lemlist_campaign_id: s('lemlist_campaign_id'),
    lemlist_campaign_name: s('lemlist_campaign_name'),
    lemlist_status: s('lemlist_status'),
    lemlist_opened_at: s('lemlist_opened_at'),
    lemlist_replied_at: s('lemlist_replied_at'),
    lemlist_clicked_at: s('lemlist_clicked_at'),
    lemlist_pushed_at: s('lemlist_pushed_at'),
  };
}

function normalizeRelation(raw: Record<string, unknown>): HubCompanyRelation {
  const s = (k: string) => (raw[k] as string | null | undefined) ?? null;
  return {
    id: raw.id != null ? String(raw.id) : undefined,
    from_company: String(raw.from_company ?? ''),
    to_company: String(raw.to_company ?? ''),
    relation_type: String(raw.relation_type ?? ''),
    direction: s('direction'),
    strength: s('strength'),
    source: s('source'),
    notes: s('notes'),
  };
}

export const useCompanyDetailStore = defineStore('companyDetail', () => {
  const currentCompany = ref<HubCompanyRow | null>(null);
  const companyContacts = ref<HubContact[]>([]);
  const companyRelations = ref<HubCompanyRelation[]>([]);
  const news = ref<NewsItem[]>([]);
  const loadStatus = ref<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const contactsStatus = ref<'idle' | 'loading' | 'ok'>('idle');
  const newsStatus = ref<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const loadError = ref<string | null>(null);

  const angleStatus = ref<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const angleError = ref<string | null>(null);

  const dmsStatus = ref<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const dmsError = ref<string | null>(null);
  const dmsContacts = ref<HubContact[]>([]);

  async function loadDetail(slug: string): Promise<void> {
    loadStatus.value = 'loading';
    loadError.value = null;
    try {
      const [raw, rels] = await Promise.all([
        fetchCompanyBySlug(slug),
        fetchCompanyRelationsForSlug(slug),
      ]);
      if (!raw) {
        loadError.value = 'Company not found';
        loadStatus.value = 'error';
        return;
      }
      currentCompany.value = raw as HubCompanyRow;
      companyRelations.value = (rels as Record<string, unknown>[]).map(normalizeRelation);
      loadStatus.value = 'ok';
      // Load contacts in background
      void loadContacts(slug, (raw as HubCompanyRow).name ?? '');
    } catch (e) {
      loadStatus.value = 'error';
      loadError.value = e instanceof Error ? e.message : String(e);
    }
  }

  async function loadContacts(slug: string, name: string): Promise<void> {
    contactsStatus.value = 'loading';
    try {
      const rows = await fetchContactsByCompany(slug, name);
      companyContacts.value = (rows as Record<string, unknown>[]).map(normalizeContact);
      contactsStatus.value = 'ok';
    } catch {
      contactsStatus.value = 'ok'; // non-fatal
    }
  }

  async function refreshNews(name: string): Promise<void> {
    newsStatus.value = 'loading';
    try {
      const xml = await fetchGoogleNewsXml(name);
      news.value = parseGoogleNewsXml(xml);
      newsStatus.value = 'ok';
    } catch {
      newsStatus.value = 'error';
      news.value = [];
    }
  }

  async function setType(type: string): Promise<void> {
    const c = currentCompany.value;
    if (!c?.id) return;
    await patchCompany(c.id, { type });
    if (currentCompany.value) currentCompany.value = { ...currentCompany.value, type };
  }

  async function generateAngle(personaId: string): Promise<void> {
    const c = currentCompany.value;
    if (!c) return;
    angleStatus.value = 'loading';
    angleError.value = null;
    const persona = PERSONAS.find((p) => p.id === personaId) ?? PERSONAS[0];
    try {
      const data = (await anthropicFetch({
        model: MODEL_CREATIVE,
        max_tokens: 350,
        system:
          persona.system +
          '\nWrite a concise, specific outreach angle for this company (2–3 sentences). No greeting.',
        messages: [
          {
            role: 'user',
            content: [
              `Company: ${c.name}`,
              `Category: ${c.category ?? 'n/a'}`,
              `Description: ${c.description ?? 'n/a'}`,
              `Note: ${c.note ?? 'n/a'}`,
              `Region: ${c.region ?? 'n/a'}`,
            ].join('\n'),
          },
        ],
      })) as { content?: Array<{ type: string; text?: string }> };
      const angle = (data.content ?? [])
        .filter((b) => b.type === 'text')
        .map((b) => b.text ?? '')
        .join('')
        .trim();
      await patchCompany(c.id, { outreach_angle: angle });
      if (currentCompany.value)
        currentCompany.value = { ...currentCompany.value, outreach_angle: angle };
      angleStatus.value = 'ok';
    } catch (e) {
      angleStatus.value = 'error';
      angleError.value = e instanceof Error ? e.message : String(e);
    }
  }

  async function findDecisionMakers(): Promise<void> {
    const c = currentCompany.value;
    if (!c) return;
    dmsStatus.value = 'loading';
    dmsError.value = null;
    dmsContacts.value = [];
    try {
      const cached = await enrichCacheGet(c.id, 'contact_report');
      if (cached) {
        dmsContacts.value = cached as HubContact[];
        dmsStatus.value = 'ok';
        return;
      }
      const data = (await anthropicFetch({
        model: MODEL_RESEARCH,
        max_tokens: 1500,
        system:
          'You are a B2B sales researcher. Return decision makers as JSON array of objects with keys: full_name, title, linkedin_url (if found), email (if found). Return ONLY valid JSON array, no markdown.',
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: [
          {
            role: 'user',
            content: `Find 3–6 decision makers (VP, Director, Head, C-suite) at ${c.name}${c.hq_city ? ', ' + c.hq_city : ''}. Focus on marketing, data, or programmatic roles.`,
          },
        ],
      })) as { content?: Array<{ type: string; text?: string }> };
      const raw = (data.content ?? [])
        .filter((b) => b.type === 'text')
        .map((b) => b.text ?? '')
        .join('')
        .trim();
      let cts: HubContact[] = [];
      try {
        const arr = JSON.parse(raw.replace(/```json?\n?|```/g, ''));
        cts = Array.isArray(arr) ? arr : [];
      } catch {
        cts = [];
      }
      dmsContacts.value = cts;
      dmsStatus.value = 'ok';
      if (cts.length) await enrichCacheSet(c.id, 'contact_report', cts, 168);
    } catch (e) {
      dmsStatus.value = 'error';
      dmsError.value = e instanceof Error ? e.message : String(e);
    }
  }

  function clear() {
    currentCompany.value = null;
    companyContacts.value = [];
    companyRelations.value = [];
    news.value = [];
    loadStatus.value = 'idle';
    contactsStatus.value = 'idle';
    newsStatus.value = 'idle';
    dmsStatus.value = 'idle';
    dmsContacts.value = [];
    angleStatus.value = 'idle';
  }

  return {
    currentCompany,
    companyContacts,
    companyRelations,
    news,
    loadStatus,
    contactsStatus,
    newsStatus,
    loadError,
    angleStatus,
    angleError,
    dmsStatus,
    dmsError,
    dmsContacts,
    loadDetail,
    refreshNews,
    setType,
    generateAngle,
    findDecisionMakers,
    clear,
  };
});
