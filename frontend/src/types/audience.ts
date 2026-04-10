/** Audience row — aligns with `www/hub/audiences.js` and Supabase `audiences` table. */
export interface HubAudience {
  id: string;
  name: string;
  description?: string | null;
  /** Slugified company IDs. */
  company_ids?: string[] | null;
  filters?: AudienceFilters | null;
  is_system?: boolean | null;
  outreach_hook?: string | null;
  template_subject?: string | null;
  template_body?: string | null;
  campaign_id?: string | null;
  sort_field?: string | null;
  updated_at?: string | null;
}

export interface AudienceFilters {
  type?: string | null;
  tags?: string[] | null;
  icp_prompt?: string | null;
  icp_min?: number | null;
}

/** Gap card types — mirrors `audiences.js` gap detection. */
export type AudienceGapType = 'contacts' | 'description' | 'geo' | 'angles';
