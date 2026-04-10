import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import { classifyNote } from '../lib/classifyNote';
import {
  COMPANIES_PAGE_SIZE,
  fetchCompaniesFirstPage,
  fetchCompaniesRange,
  fetchContactsBulk,
} from '../lib/hubRest';
import type { HubCompanyRow } from '../types/company';
import type { HubContact } from '../types/contact';

export const useHubStore = defineStore('hub', () => {
  const companies = ref<HubCompanyRow[]>([]);
  const contacts = ref<HubContact[]>([]);
  const totalCompaniesInDb = ref(0);
  const loadStatus = ref<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const contactsLoadStatus = ref<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const companiesLoadingMore = ref(false);
  const loadError = ref<string | null>(null);

  let companyPagesInFlight = false;

  const companyCount = computed(() => companies.value.length);
  const contactCount = computed(() => contacts.value.length);

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
      updated_at: (raw.updated_at as string) ?? null,
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

  async function loadContacts(): Promise<void> {
    contactsLoadStatus.value = 'loading';
    try {
      const rows = await fetchContactsBulk();
      contacts.value = rows
        .filter((r): r is Record<string, unknown> => r !== null && typeof r === 'object')
        .map((r) => normalizeContact(r));
      contactsLoadStatus.value = 'ok';
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
    totalCompaniesInDb,
    loadStatus,
    contactsLoadStatus,
    companiesLoadingMore,
    loadError,
    companyCount,
    contactCount,
    loadCompaniesFirstPage,
    loadRemainingCompanyPages,
    loadContacts,
  };
});
