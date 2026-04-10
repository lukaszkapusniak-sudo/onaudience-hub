/** Single news/press item — aligns with `www/hub/gnews-parse.js` output. */
export interface NewsItem {
  title: string;
  url: string | null;
  source: string;
  date: string;
  snippet?: string | null;
}

/** Intelligence cache entry from `intelligence` table. */
export interface IntelligenceCache {
  company_id: string;
  type: string;
  data: unknown;
  fetched_at?: string | null;
  ttl_hours?: number | null;
}
