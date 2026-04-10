/** Lemlist campaign row from API (subset used in UI). */
export interface LemlistCampaign {
  _id: string;
  name: string;
  status?: string;
  createdAt?: string;
}

/** Loose lead shape from Lemlist + enrichment. */
export type LemlistLead = Record<string, unknown> & {
  email?: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  jobTitle?: string;
  status?: string;
  addedAt?: string;
  openedAt?: string;
  repliedAt?: string;
  clickedAt?: string;
  contactId?: string;
};
