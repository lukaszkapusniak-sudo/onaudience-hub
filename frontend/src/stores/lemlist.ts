import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import {
  clearLemlistKey,
  getLemlistKey,
  isLemlistConnected,
  lemlistAddLead,
  lemlistCampaigns,
  lemlistFetch,
  lemlistWriteBack,
  setLemlistKey,
} from '../lib/lemlistApi';
import {
  fetchAudiences,
  fetchContactIdByEmail,
  postCompanyMerge,
  upsertContact,
} from '../lib/hubRest';
import { useHubStore } from './hub';
import type { HubContact } from '../types/contact';
import type { LemlistCampaign, LemlistLead } from '../types/lemlist';

interface AudienceRow {
  id: string;
  name: string;
  company_ids?: string[];
  is_system?: boolean;
}

export const useLemlistStore = defineStore('lemlist', () => {
  const campaigns = ref<LemlistCampaign[]>([]);
  const selected = ref<LemlistCampaign | null>(null);
  const leads = ref<LemlistLead[]>([]);
  const leadSearch = ref('');
  const audiences = ref<AudienceRow[]>([]);
  const pushAudienceId = ref('');

  const panelLoading = ref(false);
  const leadsLoading = ref(false);
  const syncing = ref<'idle' | 'contacts' | 'companies'>('idle');
  const lastSync = ref<number | null>(null);
  const toast = ref<string | null>(null);

  const filteredLeads = computed(() => {
    const q = leadSearch.value.trim().toLowerCase();
    if (!q) return leads.value;
    return leads.value.filter((l) => {
      const blob = `${l.email ?? ''}${l.firstName ?? ''}${l.lastName ?? ''}${l.companyName ?? ''}`.toLowerCase();
      return blob.includes(q);
    });
  });

  function showToast(msg: string) {
    toast.value = msg;
    setTimeout(() => {
      toast.value = null;
    }, 4000);
  }

  async function refreshCampaigns(): Promise<void> {
    panelLoading.value = true;
    try {
      campaigns.value = await lemlistCampaigns();
    } catch (e) {
      showToast(e instanceof Error ? e.message : String(e));
      campaigns.value = [];
    } finally {
      panelLoading.value = false;
    }
  }

  async function loadAudiences(): Promise<void> {
    try {
      const rows = await fetchAudiences();
      audiences.value = rows
        .filter((r): r is Record<string, unknown> => r !== null && typeof r === 'object')
        .map((r) => ({
          id: String(r.id ?? ''),
          name: String(r.name ?? ''),
          company_ids: Array.isArray(r.company_ids) ? (r.company_ids as string[]) : [],
          is_system: Boolean(r.is_system),
        }))
        .filter((a) => !a.is_system);
    } catch {
      audiences.value = [];
    }
  }

  async function enrichLead(
    l: LemlistLead,
    campaignId: string,
    hubContacts: HubContact[],
  ): Promise<LemlistLead> {
    const sbMatch = hubContacts.find(
      (c) =>
        c.lemlist_campaign_id === campaignId &&
        c.lemlist_pushed_at &&
        (c.email === l.email || (!l.email && c.lemlist_campaign_id)),
    );
    if (sbMatch) {
      return {
        ...l,
        firstName: sbMatch.full_name?.split(' ')[0] || (l.firstName as string) || '',
        lastName: sbMatch.full_name?.split(' ').slice(1).join(' ') || (l.lastName as string) || '',
        email: sbMatch.email || (l.email as string) || '',
        companyName: sbMatch.company_name || (l.companyName as string) || '',
        jobTitle: sbMatch.title || (l.jobTitle as string) || '',
      };
    }
    const cid = l.contactId as string | undefined;
    if (cid) {
      try {
        const cd = (await lemlistFetch(`/contacts/${cid}`)) as Record<string, unknown>;
        if (cd && (cd.email || cd.firstName)) {
          const fields = (cd.fields as Record<string, string> | undefined) || {};
          return {
            ...l,
            ...cd,
            firstName: (cd.firstName as string) || (l.firstName as string) || '',
            lastName: (cd.lastName as string) || (l.lastName as string) || '',
            email: (cd.email as string) || (l.email as string) || '',
            companyName: (cd.companyName as string) || (l.companyName as string) || '',
            jobTitle: (cd.jobTitle as string) || fields.jobTitle || (l.jobTitle as string) || '',
          };
        }
      } catch {
        /* minimal */
      }
    }
    return l;
  }

  async function selectCampaign(campaignId: string): Promise<void> {
    const c = campaigns.value.find((x) => x._id === campaignId) || null;
    selected.value = c;
    leads.value = [];
    leadSearch.value = '';
    if (!c) return;
    const hub = useHubStore();
    leadsLoading.value = true;
    try {
      const d = await lemlistFetch(`/campaigns/${campaignId}/leads`);
      const raw = Array.isArray(d) ? d : ((d as { leads?: LemlistLead[] }).leads ?? []);
      const enriched = await Promise.all(
        raw.map((row) => enrichLead(row as LemlistLead, campaignId, hub.contacts)),
      );
      leads.value = enriched;
    } catch (e) {
      leads.value = [];
      showToast(e instanceof Error ? e.message : 'Failed to load leads');
    } finally {
      leadsLoading.value = false;
    }
  }

  function clearDetail(): void {
    selected.value = null;
    leads.value = [];
    leadSearch.value = '';
  }

  async function unsubLead(campaignId: string, email: string): Promise<void> {
    if (!globalThis.confirm(`Unsubscribe ${email} from this campaign?`)) return;
    try {
      await lemlistFetch(
        `/campaigns/${campaignId}/leads/${encodeURIComponent(email)}`,
        'DELETE',
      );
      showToast(`Unsubscribed ${email}`);
      await selectCampaign(campaignId);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Unsub failed');
    }
  }

  function promptConnect(): void {
    const k = globalThis.prompt('Enter Lemlist API key:');
    if (!k?.trim()) return;
    setLemlistKey(k);
    showToast('Lemlist key saved');
    void refreshCampaigns();
  }

  function disconnect(): void {
    if (!globalThis.confirm('Disconnect Lemlist?')) return;
    clearLemlistKey();
    campaigns.value = [];
    selected.value = null;
    leads.value = [];
    showToast('Lemlist disconnected');
  }

  async function pushFromAudience(): Promise<void> {
    const audId = pushAudienceId.value;
    const camp = selected.value;
    if (!audId || !camp) {
      globalThis.alert('Select an audience first.');
      return;
    }
    const aud = audiences.value.find((a) => a.id === audId);
    if (!aud) return;
    const hub = useHubStore();
    const coIds = new Set(aud.company_ids || []);
    const list = hub.contacts.filter((c) => c.company_id && coIds.has(c.company_id) && c.email);
    if (!list.length) {
      globalThis.alert('No contacts with email in this audience.');
      return;
    }
    let ok = 0;
    let fail = 0;
    for (const ct of list) {
      try {
        await lemlistAddLead(camp._id, ct);
        ok++;
      } catch {
        fail++;
      }
    }
    const ids = list.map((c) => c.id).filter(Boolean) as string[];
    if (ids.length) {
      try {
        await lemlistWriteBack(ids, camp._id, camp.name);
      } catch {
        /* ignore */
      }
    }
    showToast(`Pushed ${ok}/${list.length}${fail ? ` (${fail} failed)` : ''}`);
    await selectCampaign(camp._id);
    await hub.loadContacts();
  }

  async function syncContactsFromLemlist(): Promise<void> {
    if (syncing.value !== 'idle') return;
    syncing.value = 'contacts';
    try {
      const camps = await lemlistCampaigns();
      const seen = new Set<string>();
      const allLeads: Array<LemlistLead & { campaignId: string; campaignName: string }> = [];
      for (const camp of camps) {
        const d = await lemlistFetch(`/campaigns/${camp._id}/leads`);
        const raw = Array.isArray(d) ? d : ((d as { leads?: LemlistLead[] }).leads ?? []);
        for (const l of raw) {
          const email = (l as LemlistLead).email as string | undefined;
          if (!email || seen.has(email)) continue;
          seen.add(email);
          allLeads.push({
            ...(l as LemlistLead),
            campaignId: camp._id,
            campaignName: camp.name,
          });
        }
      }
      const now = new Date().toISOString();
      let saved = 0;
      for (const l of allLeads) {
        let detail: LemlistLead = l;
        const contactId = l.contactId as string | undefined;
        if (contactId) {
          try {
            const cd = (await lemlistFetch(`/contacts/${contactId}`)) as Record<string, unknown>;
            if (cd && cd.email) detail = { ...l, ...cd };
          } catch {
            /* use minimal */
          }
        }
        const firstName = (detail.firstName as string) || '';
        const lastName = (detail.lastName as string) || '';
        const fullName = `${firstName} ${lastName}`.trim() || (detail.email as string) || '';
        const company = (detail.companyName as string) || '';
        const email = (detail.email as string) || '';
        let cid: string | null = null;
        if (email) {
          cid = await fetchContactIdByEmail(email);
        }
        if (!cid) {
          const clean = (s: string) =>
            s
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/^-|-$/g, '');
          cid =
            `${clean(fullName)}${company ? `-${clean(company)}` : ''}`.slice(0, 80) ||
            email.replace('@', '--at--').replace(/\./g, '-') ||
            (contactId as string);
        }
        const llStatus = (l.status as string) || (detail.status as string) || null;
        const openedAt = (l.openedAt as string) || (detail.openedAt as string) || null;
        const repliedAt = (l.repliedAt as string) || (detail.repliedAt as string) || null;
        const clickedAt = (l.clickedAt as string) || (detail.clickedAt as string) || null;
        const rec = {
          id: cid,
          full_name: fullName || email,
          email: (detail.email as string) || '',
          company_name: company,
          company_id: company
            ? company
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-|-$/g, '')
            : null,
          title: (detail.jobTitle as string) || ((detail.fields as { jobTitle?: string })?.jobTitle ?? '') || '',
          linkedin_url: (detail.linkedinUrl as string) || '',
          source: 'lemlist',
          lemlist_campaign_id: l.campaignId,
          lemlist_campaign_name: l.campaignName,
          lemlist_pushed_at: (detail.addedAt as string) || now,
          lemlist_status: llStatus,
          lemlist_opened_at: openedAt ? new Date(openedAt).toISOString() : null,
          lemlist_replied_at: repliedAt ? new Date(repliedAt).toISOString() : null,
          lemlist_clicked_at: clickedAt ? new Date(clickedAt).toISOString() : null,
        };
        try {
          await upsertContact(rec);
          saved++;
        } catch {
          /* skip */
        }
      }
      lastSync.value = Date.now();
      showToast(`Synced ${saved} contacts from ${camps.length} campaigns`);
      await useHubStore().loadContacts();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Sync failed');
    } finally {
      syncing.value = 'idle';
    }
  }

  async function syncCompaniesFromLemlist(): Promise<void> {
    if (syncing.value !== 'idle') return;
    syncing.value = 'companies';
    try {
      const camps = await lemlistCampaigns();
      const seen = new Set<string>();
      let saved = 0;
      for (const camp of camps) {
        const d = await lemlistFetch(`/campaigns/${camp._id}/leads`);
        const raw = Array.isArray(d) ? d : ((d as { leads?: LemlistLead[] }).leads ?? []);
        for (const l of raw) {
          const name = String((l as LemlistLead).companyName || '').trim();
          if (!name || seen.has(name.toLowerCase())) continue;
          seen.add(name.toLowerCase());
          const slug = name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');
          const ok = await postCompanyMerge({
            id: slug,
            name,
            source: 'lemlist',
            lemlist_campaign_id: camp._id,
            lemlist_campaign_name: camp.name,
            lemlist_pushed_at: new Date().toISOString(),
          });
          if (ok) saved++;
        }
      }
      lastSync.value = Date.now();
      showToast(`Synced ${saved} companies`);
      await useHubStore().loadCompaniesFirstPage();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Company sync failed');
    } finally {
      syncing.value = 'idle';
    }
  }

  function campaignStats(campaignId: string): { tot: number; sent: number; opened: number; replied: number } {
    const hub = useHubStore();
    const cc = hub.contacts.filter((x) => x.lemlist_campaign_id === campaignId);
    const tot = cc.length;
    const sent = cc.filter((x) => x.lemlist_status && x.lemlist_status !== 'pending').length || tot;
    const opened = cc.filter((x) => x.lemlist_opened_at).length;
    const replied = cc.filter((x) => x.lemlist_replied_at).length;
    return { tot, sent: sent || 1, opened, replied };
  }

  function statusTagClass(status: string | undefined): string {
    return { active: 'tc', paused: 'tpo', draft: 'tpr', stopped: 'tn' }[status || ''] || 'tpr';
  }

  function leadStatusClass(status: string | undefined): string {
    return (
      {
        sent: 'tpr',
        opened: 'tp',
        clicked: 'tc',
        replied: 'tc',
        bounced: 'tn',
        unsubscribed: 'tn',
        interested: 'tc',
      }[status || ''] || 'tpr'
    );
  }

  return {
    campaigns,
    selected,
    leads,
    leadSearch,
    filteredLeads,
    audiences,
    pushAudienceId,
    panelLoading,
    leadsLoading,
    syncing,
    lastSync,
    toast,
    connected: computed(() => isLemlistConnected()),
    keyHint: computed(() => {
      const k = getLemlistKey();
      return k ? `● ${k.slice(0, 8)}…` : 'not connected';
    }),
    refreshCampaigns,
    loadAudiences,
    selectCampaign,
    clearDetail,
    unsubLead,
    promptConnect,
    disconnect,
    pushFromAudience,
    syncContactsFromLemlist,
    syncCompaniesFromLemlist,
    campaignStats,
    statusTagClass,
    leadStatusClass,
  };
});
