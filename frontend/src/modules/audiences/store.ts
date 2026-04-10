import { defineStore } from 'pinia';
import { ref } from 'vue';

import { anthropicFetch } from '../../lib/anthropicHub';
import { deleteAudience, fetchAudiences, upsertAudience } from '../../lib/hubRest';
import type { HubAudience } from '../../types/audience';

const MODEL_CREATIVE = 'claude-sonnet-4-20250514';

export const useAudiencesStore = defineStore('audiences', () => {
  const audiences = ref<HubAudience[]>([]);
  const activeAudience = ref<HubAudience | null>(null);
  const loadStatus = ref<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const loadError = ref<string | null>(null);

  const scoutOpen = ref(false);
  const scoutAudience = ref<HubAudience | null>(null);
  const aiBuildStatus = ref<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const aiBuildIds = ref<string[]>([]);
  const aiBuildError = ref<string | null>(null);

  async function load(): Promise<void> {
    loadStatus.value = 'loading';
    loadError.value = null;
    try {
      const rows = await fetchAudiences();
      audiences.value = rows as HubAudience[];
      loadStatus.value = 'ok';
    } catch (e) {
      loadStatus.value = 'error';
      loadError.value = e instanceof Error ? e.message : String(e);
    }
  }

  async function save(aud: Partial<HubAudience>): Promise<HubAudience | null> {
    try {
      const result = await upsertAudience(aud as Record<string, unknown>);
      const saved = Array.isArray(result) ? result[0] : result;
      if (saved) {
        const idx = audiences.value.findIndex((a) => a.id === (saved as HubAudience).id);
        if (idx >= 0) audiences.value[idx] = saved as HubAudience;
        else audiences.value = [saved as HubAudience, ...audiences.value];
      }
      return saved as HubAudience;
    } catch {
      return null;
    }
  }

  async function remove(id: string): Promise<void> {
    await deleteAudience(id);
    audiences.value = audiences.value.filter((a) => a.id !== id);
    if (activeAudience.value?.id === id) activeAudience.value = null;
  }

  function openScout(existing: HubAudience | null = null) {
    scoutAudience.value = existing ? { ...existing } : { id: '', name: '', company_ids: [] };
    aiBuildIds.value = existing?.company_ids ?? [];
    aiBuildStatus.value = 'idle';
    scoutOpen.value = true;
  }

  function closeScout() {
    scoutOpen.value = false;
    scoutAudience.value = null;
    aiBuildIds.value = [];
    aiBuildStatus.value = 'idle';
  }

  /** Build audience company list from AI description — mirrors `audAIBuild` in `audiences.js`. */
  async function aiBuild(description: string, existingCompanyNames: string[]): Promise<void> {
    aiBuildStatus.value = 'loading';
    aiBuildError.value = null;
    try {
      const data = (await anthropicFetch({
        model: MODEL_CREATIVE,
        max_tokens: 800,
        system:
          'You are a B2B audience builder. Given a description, return a JSON array of company name strings that match. Return ONLY valid JSON array. Max 30 companies.',
        messages: [
          {
            role: 'user',
            content: [
              `Build a list of companies matching: "${description}"`,
              '',
              'Available companies:',
              existingCompanyNames.slice(0, 200).join(', '),
              '',
              'Return JSON array of company names from the available list only.',
            ].join('\n'),
          },
        ],
      })) as { content?: Array<{ type: string; text?: string }> };
      const raw = (data.content ?? [])
        .filter((b) => b.type === 'text')
        .map((b) => b.text ?? '')
        .join('')
        .trim();
      let names: string[] = [];
      try {
        names = JSON.parse(raw.replace(/```json?\n?|```/g, ''));
        if (!Array.isArray(names)) names = [];
      } catch {
        names = [];
      }
      aiBuildIds.value = names;
      aiBuildStatus.value = 'ok';
    } catch (e) {
      aiBuildStatus.value = 'error';
      aiBuildError.value = e instanceof Error ? e.message : String(e);
    }
  }

  return {
    audiences,
    activeAudience,
    loadStatus,
    loadError,
    scoutOpen,
    scoutAudience,
    aiBuildStatus,
    aiBuildIds,
    aiBuildError,
    load,
    save,
    remove,
    openScout,
    closeScout,
    aiBuild,
  };
});
