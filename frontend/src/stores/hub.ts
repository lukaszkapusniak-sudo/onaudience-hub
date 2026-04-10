import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import { classifyNote } from '../lib/classifyNote';
import {
  COMPANIES_PAGE_SIZE,
  CONTACTS_PAGE_SIZE,
  fetchCompaniesFirstPage,
  fetchCompaniesRange,
  fetchCompanyRelations,
  fetchContactsFirstPage,
  fetchContactsRange,
} from '../lib/hubRest';
import type { HubCompanyRow } from '../types/company';
import type { HubContact } from '../types/contact';
import type { HubCompanyRelation } from '../types/relation';

export const useHubStore = defineStore('hub', () => {
  const companies = ref<HubCompanyRow[]>([]);
  const contacts = ref<HubContact[]>([]);
  /** Mirrors legacy `S.allRelations` — full `company_relations` list from one GET. */
  const companyRelations = ref<HubCompanyRelation[]>([]);
  const totalCompaniesInDb = ref(0);
  const totalContactsInDb = ref(0);
  const loadStatus = ref<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const contactsLoadStatus = ref<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const relationsLoadStatus = ref<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const companiesLoadingMore = ref(false);
  const contactsLoadingMore = ref(false);
  const loadError = ref<string | null>(null);

  let companyPagesInFlight = false;
  let contactPagesInFlight = false;
  /** Next Supabase `Range` start for background contact pages (for resume / retry). */
  const contactFetchOffset = ref(0);

  const companyCount = computed(() => companies.value.length);
  const contactCount = computed(() => contacts.value.length);
  const relationCount = computed(() => companyRelations.value.length);

  function normalizeCompany(raw: Record<string, unknown>): HubCompanyRow {
    const note = (raw.note as string) || '';
    const type = (raw.type as string) || classifyNote(note);
    return {
      id: String(raw.id ?? ''),
      name: (raw.name as string) ?? null,
      type,
      category: (raw.category as string) ?? null,
      icp: typeof raw.icp === 'number' ? raw.icp : raw.icp != null ? Number(raw.icp) : null,
      note: note || null,
      region: (raw.region as string) ?? null,
      hq_city: (raw.hq_city as string) ?? null,
      description: (raw.description as string) ?? null,
      updated_at: (raw.updated_at as string) ?? null,
    };
  }

  function contactDedupeKey(c: HubContact): string {
    if (c.id) return `id:${c.id}`;
    if (c.email) return `em:${c.email}`;
    return '';
  }

  function normalizeCompanyRelation(raw: Record<string, unknown>): HubCompanyRelation {
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

  /** Background pages after first chunk — same semantics as `api.js` `_loadAllContacts`. */
  async function loadRemainingContactPages(): Promise<void> {
    const total = totalContactsInDb.value;
    let offset = contactFetchOffset.value;
    if (offset >= total) return;
    if (contactPagesInFlight) return;
    contactPagesInFlight = true;
    contactsLoadingMore.value = true;
    try {
      while (offset < total) {
        const end = Math.min(offset + CONTACTS_PAGE_SIZE - 1, total - 1);
        const page = await fetchContactsRange(offset, end);
        if (!Array.isArray(page) || !page.length) break;
        const incoming = page
          .filter((r): r is Record<string, unknown> => r !== null && typeof r === 'object')
          .map((r) => normalizeContact(r));
        const seen = new Set(contacts.value.map((c) => contactDedupeKey(c)).filter(Boolean));
        const newOnly = incoming.filter((c) => {
          const k = contactDedupeKey(c);
          if (!k || seen.has(k)) return false;
          seen.add(k);
          return true;
        });
        if (!newOnly.length) break;
        contacts.value = [...contacts.value, ...newOnly];
        offset = end + 1;
        contactFetchOffset.value = offset;
      }
    } catch {
      /* first chunk still usable */
    } finally {
      contactPagesInFlight = false;
      contactsLoadingMore.value = false;
    }
  }

  async function loadContacts(): Promise<void> {
    contactsLoadStatus.value = 'loading';
    try {
      const { rows, total, nextOffset } = await fetchContactsFirstPage();
      totalContactsInDb.value = total;
      contactFetchOffset.value = nextOffset;
      contacts.value = rows
        .filter((r): r is Record<string, unknown> => r !== null && typeof r === 'object')
        .map((r) => normalizeContact(r));
      contactsLoadStatus.value = 'ok';
      if (nextOffset < total) {
        void loadRemainingContactPages();
      }
    } catch {
      contactsLoadStatus.value = 'error';
    }
  }

  /** Background pages 200+ — same semantics as `api.js` `_loadRemainingPages`. */
  async function loadRemainingCompanyPages(): Promise<void> {
    const total = totalCompaniesInDb.value;
    if (total <= COMPANIES_PAGE_SIZE) return;
    if (companyPagesInFlight) return;
    companyPagesInFlight = true;
    companiesLoadingMore.value = true;
    let offset = COMPANIES_PAGE_SIZE;
    try {
      while (offset < total) {
        const end = Math.min(offset + COMPANIES_PAGE_SIZE - 1, total - 1);
        const page = await fetchCompaniesRange(offset, end);
        if (!Array.isArray(page) || !page.length) break;
        const incoming = page
          .filter((r): r is Record<string, unknown> => r !== null && typeof r === 'object')
          .map((r) => normalizeCompany(r));
        const existingIds = new Set(companies.value.map((c) => c.id));
        const newOnly = incoming.filter((c) => !existingIds.has(c.id));
        if (!newOnly.length) break;
        companies.value = [...companies.value, ...newOnly];
        offset += COMPANIES_PAGE_SIZE;
      }
    } catch {
      /* stop on error; first page still usable */
    } finally {
      companyPagesInFlight = false;
      companiesLoadingMore.value = false;
    }
  }

  /** Same single fetch as `api.js` `loadFromSupabase` → `dbRelations.listAll()`. */
  async function loadCompanyRelations(): Promise<void> {
    relationsLoadStatus.value = 'loading';
    try {
      const rows = await fetchCompanyRelations();
      companyRelations.value = rows
        .filter((r): r is Record<string, unknown> => r !== null && typeof r === 'object')
        .map((r) => normalizeCompanyRelation(r));
      relationsLoadStatus.value = 'ok';
    } catch {
      relationsLoadStatus.value = 'error';
    }
  }

  /**
   * Orchestrated parallel load matching legacy `loadFromSupabase` first batch:
   * companies (page 0 + background), contacts (+ background), `company_relations` list-all.
   */
  async function bootstrapLegacyHubData(): Promise<void> {
    await Promise.all([
      loadCompaniesFirstPage(),
      loadContacts(),
      loadCompanyRelations(),
    ]);
  }

  async function loadCompaniesFirstPage(): Promise<void> {
    loadStatus.value = 'loading';
    loadError.value = null;
    try {
      const { rows, total } = await fetchCompaniesFirstPage();
      totalCompaniesInDb.value = total;
      companies.value = rows
        .filter((r): r is Record<string, unknown> => r !== null && typeof r === 'object')
        .map((r) => normalizeCompany(r));
      loadStatus.value = 'ok';
      if (total > COMPANIES_PAGE_SIZE) {
        void loadRemainingCompanyPages();
      }
    } catch (e) {
      loadStatus.value = 'error';
      loadError.value = e instanceof Error ? e.message : String(e);
    }
  }

  return {
    companies,
    contacts,
    companyRelations,
    totalCompaniesInDb,
    totalContactsInDb,
    loadStatus,
    contactsLoadStatus,
    relationsLoadStatus,
    companiesLoadingMore,
    contactsLoadingMore,
    loadError,
    companyCount,
    contactCount,
    relationCount,
    loadCompaniesFirstPage,
    loadRemainingCompanyPages,
    loadRemainingContactPages,
    loadContacts,
    loadCompanyRelations,
    bootstrapLegacyHubData,
  };
});
