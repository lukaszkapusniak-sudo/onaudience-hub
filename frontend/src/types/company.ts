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
  hq_country?: string | null;
  description?: string | null;
  website?: string | null;
  linkedin_url?: string | null;
  size?: string | null;
  founded?: string | null;
  outreach_angle?: string | null;
  tech_stack?: string | null;
  gvl_id?: number | null;
  data_richness?: number | null;
  updated_at?: string | null;
}
