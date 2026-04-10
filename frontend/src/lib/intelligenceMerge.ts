/**
 * Intelligence merge helpers — parity with `www/hub/api.js` `saveIntelligence` (press_links).
 */

import { fetchIntelligenceForCompany, upsertIntelligence } from './hubRest';

export type PressLinkItem = { url: string; [key: string]: unknown };

export async function mergePressLinksIntelligence(
  companySlug: string,
  items: PressLinkItem[],
): Promise<void> {
  if (!items.length) return;
  try {
    const ex = await fetchIntelligenceForCompany(companySlug, 'press_links');
    const rows = Array.isArray(ex) ? ex : [];
    const first = rows[0] as { content?: unknown } | undefined;
    const existing = (Array.isArray(first?.content) ? first.content : []) as PressLinkItem[];
    const seen = new Set(existing.map((l) => l.url).filter(Boolean));
    const merged = [...existing, ...items.filter((i) => i.url && !seen.has(i.url))];
    await upsertIntelligence({
      company_id: companySlug,
      type: 'press_links',
      content: merged,
      updated_at: new Date().toISOString(),
    });
  } catch (e) {
    console.warn('mergePressLinksIntelligence', e);
  }
}
