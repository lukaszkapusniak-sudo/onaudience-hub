import { defineStore } from 'pinia';
import { ref } from 'vue';

import {
  callMergeCompaniesRpc,
  fetchMergeSuggestionsPending,
  patchMergeSuggestion,
} from '../../lib/hubRest';
import type { MergeSuggestion } from '../../types/merge';

export const useMergeStore = defineStore('merge', () => {
  const suggestions = ref<MergeSuggestion[]>([]);
  const loadStatus = ref<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const loadError = ref<string | null>(null);
  const merging = ref<string | null>(null); // suggestion id being merged

  async function loadSuggestions(): Promise<void> {
    loadStatus.value = 'loading';
    loadError.value = null;
    try {
      const rows = await fetchMergeSuggestionsPending();
      suggestions.value = rows as MergeSuggestion[];
      loadStatus.value = 'ok';
    } catch (e) {
      loadStatus.value = 'error';
      loadError.value = e instanceof Error ? e.message : String(e);
    }
  }

  async function executeMerge(
    suggestionId: string,
    winnerId: string,
    loserId: string,
  ): Promise<boolean> {
    merging.value = suggestionId;
    try {
      const ok = await callMergeCompaniesRpc(winnerId, loserId);
      if (ok) {
        await patchMergeSuggestion(suggestionId, { status: 'merged' });
        suggestions.value = suggestions.value.filter((s) => s.id !== suggestionId);
      }
      return ok;
    } catch {
      return false;
    } finally {
      merging.value = null;
    }
  }

  async function dismissSuggestion(id: string): Promise<void> {
    await patchMergeSuggestion(id, { status: 'dismissed' });
    suggestions.value = suggestions.value.filter((s) => s.id !== id);
  }

  return {
    suggestions,
    loadStatus,
    loadError,
    merging,
    loadSuggestions,
    executeMerge,
    dismissSuggestion,
  };
});
