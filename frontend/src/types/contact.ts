/**
 * Contact row shape used by the hub CRM / legacy drawer.
 * Fields optional — mirrors Supabase + Lemlist enrichment.
 */
export interface HubContact {
  id?: string;
  full_name?: string | null;
  title?: string | null;
  email?: string | null;
  phone?: string | null;
  linkedin_url?: string | null;
  department?: string | null;
  seniority?: string | null;
  location?: string | null;
  company_name?: string | null;
  company_id?: string | null;
  outreach_status?: string | null;
  relationship_strength?: string | null;
  last_contacted_at?: string | null;
  warm_intro_path?: string | null;
  notes?: string | null;
  lemlist_campaign_id?: string | null;
  lemlist_campaign_name?: string | null;
  lemlist_status?: string | null;
  lemlist_opened_at?: string | null;
  lemlist_replied_at?: string | null;
  lemlist_clicked_at?: string | null;
  lemlist_pushed_at?: string | null;
}
