/** Pending merge suggestion from `merge_suggestions` table. */
export interface MergeSuggestion {
  id: string;
  company_a: string;
  company_b: string;
  similarity?: number | null;
  reason?: string | null;
  status?: string | null;
}

export interface MergeResult {
  winnerId: string;
  loserId: string;
  ok: boolean;
  error?: string;
}
