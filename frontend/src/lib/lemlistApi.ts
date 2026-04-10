import { patchContact } from './hubRest';
import type { LemlistCampaign } from '../types/lemlist';

const LL_KEY = 'oaLemlistKey';

export function getLemlistKey(): string | null {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem(LL_KEY)?.trim() || null;
}

export function setLemlistKey(key: string): void {
  localStorage.setItem(LL_KEY, key.trim());
}

export function clearLemlistKey(): void {
  localStorage.removeItem(LL_KEY);
}

export function isLemlistConnected(): boolean {
  return !!getLemlistKey();
}

export async function lemlistFetch(
  path: string,
  method = 'GET',
  body: unknown = null,
  retry = 0,
): Promise<unknown> {
  const apiKey = getLemlistKey();
  if (!apiKey) {
    throw new Error('Lemlist not connected — add your API key first');
  }
  const proxy = import.meta.env.VITE_LEMLIST_PROXY;
  const r = await fetch(proxy, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, method, body, apiKey }),
  });
  if (r.status === 429) {
    if (retry < 3) {
      const wait = (retry + 1) * 2000;
      await new Promise((res) => setTimeout(res, wait));
      return lemlistFetch(path, method, body, retry + 1);
    }
    throw new Error('Lemlist rate limit reached — wait a minute and try again');
  }
  if (r.status === 401) throw new Error('Lemlist API key is invalid');
  if (r.status === 403) throw new Error('Lemlist access denied');
  if (r.status === 404) throw new Error(`Lemlist resource not found: ${path}`);
  if (!r.ok) {
    let detail = '';
    try {
      const t = await r.text();
      const j = JSON.parse(t) as { error?: string; message?: string };
      detail = j.error || j.message || t;
    } catch {
      /* ignore */
    }
    throw new Error(`Lemlist error ${r.status}${detail ? ` — ${detail}` : ''}`);
  }
  return r.json();
}

export async function lemlistCampaigns(): Promise<LemlistCampaign[]> {
  const all: LemlistCampaign[] = [];
  let offset = 0;
  const limit = 100;
  while (true) {
    const d = await lemlistFetch(`/campaigns?limit=${limit}&offset=${offset}`);
    const page = Array.isArray(d) ? d : ((d as { campaigns?: LemlistCampaign[] }).campaigns ?? []);
    all.push(...page);
    if (page.length < limit) break;
    offset += limit;
  }
  return all;
}

export async function lemlistAddLead(
  campaignId: string,
  contact: {
    full_name?: string | null;
    name?: string | null;
    email?: string | null;
    company_name?: string | null;
    title?: string | null;
    linkedin_url?: string | null;
    linkedin?: string | null;
  },
): Promise<unknown> {
  const name = contact.full_name || contact.name || '';
  const parts = name.split(/\s+/);
  return lemlistFetch(`/campaigns/${campaignId}/leads/`, 'POST', {
    email: contact.email || '',
    firstName: parts[0] || '',
    lastName: parts.slice(1).join(' ') || '',
    companyName: contact.company_name || '',
    jobTitle: contact.title || '',
    linkedinUrl: contact.linkedin_url || contact.linkedin || '',
  });
}

export async function lemlistWriteBack(
  contactIds: string[],
  campaignId: string,
  campaignName: string,
): Promise<void> {
  const now = new Date().toISOString();
  await Promise.all(
    contactIds.map((id) =>
      patchContact(id, {
        lemlist_campaign_id: campaignId,
        lemlist_campaign_name: campaignName,
        lemlist_pushed_at: now,
      }),
    ),
  );
}
