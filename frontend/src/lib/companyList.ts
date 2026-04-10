/**
 * Companies list filter / sort / tags — parity with `www/hub/list.js` + `hub.js` `sortCompanies`.
 */

import type { TagRule } from '../config/tagRules';
import { TAG_RULES } from '../config/tagRules';
import type { HubCompanyRow } from '../types/company';
import type { HubContact } from '../types/contact';

export type CompanyTypeFilter =
  | 'all'
  | 'client'
  | 'poc'
  | 'partner'
  | 'prospect'
  | 'nogo'
  | 'fresh';

export type CompanySort = 'recent' | 'name' | 'icp';

/** Same slug as `www/hub/utils.js` `_slug` for company-name matching. */
export function slugifyCompanyName(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function getTagsForCompany(c: HubCompanyRow, rules: TagRule[] = TAG_RULES): string[] {
  const hay = [c.name || '', c.note || '', c.category || '', c.region || '', c.description || '']
    .join(' ')
    .toLowerCase();
  return rules.filter((r) => r.kw.some((k) => hay.includes(k))).map((r) => r.tag);
}

function passesTypeFilter(
  c: HubCompanyRow,
  filter: CompanyTypeFilter,
  contactNameSlugs: Set<string>,
): boolean {
  const t30 = Date.now() - 30 * 24 * 60 * 60 * 1000;
  if (filter === 'fresh') {
    if (c.type !== 'prospect') return false;
    if (c.updated_at && new Date(c.updated_at).getTime() >= t30) return false;
    if (contactNameSlugs.has(slugifyCompanyName(c.name || ''))) return false;
    return true;
  }
  if (filter !== 'all' && c.type !== filter) return false;
  return true;
}

/** Main list search — matches `list.js` `renderList` (companies branch). */
function passesSearchFull(c: HubCompanyRow, q: string): boolean {
  if (!q) return true;
  const fields = [c.name, c.note, c.category, c.hq_city, c.region].map((x) =>
    (x || '').toLowerCase(),
  );
  return fields.some((f) => f.includes(q));
}

/** Tag-count pool search — matches `list.js` `countPool` (name + note only). */
function passesSearchPool(c: HubCompanyRow, q: string): boolean {
  if (!q) return true;
  const n = (c.name || '').toLowerCase();
  const note = (c.note || '').toLowerCase();
  return n.includes(q) || note.includes(q);
}

/** Pool for tag counts: type + search only (matches `list.js` `countPool`). */
export function filterPoolForTagCounts(
  companies: HubCompanyRow[],
  contacts: HubContact[],
  filter: CompanyTypeFilter,
  searchQ: string,
): HubCompanyRow[] {
  const q = searchQ.trim().toLowerCase();
  const contactNameSlugs = new Set(contacts.map((c) => slugifyCompanyName(c.company_name || '')));
  return companies.filter(
    (c) => passesTypeFilter(c, filter, contactNameSlugs) && passesSearchPool(c, q),
  );
}

export function tagCountsForPool(
  pool: HubCompanyRow[],
  rules: TagRule[] = TAG_RULES,
): Record<string, number> {
  const m: Record<string, number> = {};
  for (const r of rules) m[r.tag] = 0;
  for (const c of pool) {
    for (const t of getTagsForCompany(c, rules)) {
      m[t] = (m[t] || 0) + 1;
    }
  }
  return m;
}

function matchTags(
  c: HubCompanyRow,
  activeTags: Set<string>,
  tagLogic: 'and' | 'or',
  rules: TagRule[],
): boolean {
  if (!activeTags.size) return true;
  const t = getTagsForCompany(c, rules);
  if (tagLogic === 'and') return [...activeTags].every((x) => t.includes(x));
  return [...activeTags].some((x) => t.includes(x));
}

export function sortCompaniesLikeHub(arr: HubCompanyRow[], sortBy: CompanySort): HubCompanyRow[] {
  if (sortBy === 'recent') {
    return [...arr].sort((a, b) => {
      const ta = a.updated_at ? new Date(a.updated_at).getTime() : 0;
      const tb = b.updated_at ? new Date(b.updated_at).getTime() : 0;
      return tb - ta;
    });
  }
  if (sortBy === 'icp') {
    return [...arr].sort((a, b) => (b.icp || 0) - (a.icp || 0));
  }
  return [...arr].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
}

export function filterAndSortCompanies(
  companies: HubCompanyRow[],
  contacts: HubContact[],
  opts: {
    searchQ: string;
    filter: CompanyTypeFilter;
    sortBy: CompanySort;
    activeTags: Set<string>;
    tagLogic: 'and' | 'or';
    rules?: TagRule[];
  },
): HubCompanyRow[] {
  const q = opts.searchQ.trim().toLowerCase();
  const rules = opts.rules ?? TAG_RULES;
  const contactNameSlugs = new Set(contacts.map((c) => slugifyCompanyName(c.company_name || '')));

  let filt = companies.filter((c) => {
    if (!passesTypeFilter(c, opts.filter, contactNameSlugs)) return false;
    if (!passesSearchFull(c, q)) return false;
    if (!matchTags(c, opts.activeTags, opts.tagLogic, rules)) return false;
    return true;
  });
  filt = sortCompaniesLikeHub(filt, opts.sortBy);
  return filt;
}
