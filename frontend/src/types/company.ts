/** Subset of `companies` row used in Vue lists (aligned with legacy hub). */
export interface HubCompanyRow {
  id: string;
  name: string | null;
  type?: string | null;
  category?: string | null;
  icp?: number | null;
  note?: string | null;
  region?: string | null;
  hq_city?: string | null;
  description?: string | null;
  updated_at?: string | null;
}
