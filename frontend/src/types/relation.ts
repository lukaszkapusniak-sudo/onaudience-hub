/** Row from `company_relations` (aligned with `www/hub/db.js` + `state.js` `S.allRelations`). */
export interface HubCompanyRelation {
  id?: string;
  from_company: string;
  to_company: string;
  relation_type: string;
  direction?: string | null;
  strength?: string | null;
  source?: string | null;
  notes?: string | null;
}
