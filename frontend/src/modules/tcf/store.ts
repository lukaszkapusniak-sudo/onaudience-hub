import { defineStore } from 'pinia';
import { ref } from 'vue';

import { patchCompany } from '../../lib/hubRest';
import type { GvlVendor, TcfRisk } from '../../types/tcf';

/** OA's own GVL entry — mirrors `OA_GVL` in `www/hub/config.js`. */
export const OA_GVL: GvlVendor = {
  id: 716,
  name: 'OnAudience Ltd',
  purposes: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  legIntPurposes: [],
  specialPurposes: [1, 3],
  features: [1, 2, 3],
  specialFeatures: [],
  dataRetention: { stdRetention: 365 },
};

/** TCF purpose lookup — mirrors `TCF_P` in `config.js`. */
export const TCF_P: Record<number, string> = {
  1: 'Store/access info on device',
  2: 'Select basic ads',
  3: 'Create personalised ad profiles',
  4: 'Use personalised ad profiles',
  5: 'Create personalised content profiles',
  6: 'Use personalised content profiles',
  7: 'Measure advertising performance',
  8: 'Measure content performance',
  9: 'Understand audiences via statistics',
  10: 'Develop & improve services',
  11: 'Select basic content',
};

export const TCF_SP: Record<number, string> = {
  1: 'Security & fraud prevention',
  2: 'Deliver advertising & content',
};

export const TCF_F: Record<number, string> = {
  1: 'Match offline data sources',
  2: 'Link different devices',
  3: 'Receive & use auto-sent device characteristics',
};

export const TCF_SF: Record<number, string> = {
  1: 'Use precise geolocation data',
  2: 'Actively scan device characteristics',
};

/** `calcPrivacyRisk` from `www/hub/tcf.js` — score 1–10. */
export function calcPrivacyRisk(v: GvlVendor): TcfRisk {
  const purposes = (v.purposes?.length ?? 0) + (v.legIntPurposes?.length ?? 0);
  const sp = v.specialPurposes?.length ?? 0;
  const sf = v.specialFeatures?.length ?? 0;
  const retDays =
    v.dataRetention?.stdRetention ?? Math.max(0, ...Object.values(v.dataRetention?.purposes ?? {}));
  const score = Math.min(
    10,
    Math.max(
      1,
      Math.round(
        (purposes / 2) * 1.5 + sp * 1.2 + sf * 1.5 + (retDays > 365 ? 2 : retDays > 90 ? 1 : 0),
      ),
    ),
  );
  return {
    vendorId: v.id,
    vendorName: v.name,
    score,
    details: {
      purposes,
      legIntPurposes: v.legIntPurposes?.length ?? 0,
      specialPurposes: sp,
      specialFeatures: sf,
      dataRetentionDays: retDays || null,
    },
  };
}

export const useTcfStore = defineStore('tcf', () => {
  const gvlData = ref<Record<number, GvlVendor> | null>(null);
  const gvlStatus = ref<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const gvlError = ref<string | null>(null);
  const selected = ref<Set<number>>(new Set());
  const riskScores = ref<Map<number, TcfRisk>>(new Map());
  const vendorSearch = ref('');

  async function loadGvl(): Promise<void> {
    if (gvlStatus.value === 'ok') return;
    gvlStatus.value = 'loading';
    gvlError.value = null;
    try {
      const res = await fetch('https://vendor-list.consensu.org/v3/vendor-list.json', {
        signal: AbortSignal.timeout(12000),
      });
      if (!res.ok) throw new Error(`GVL ${res.status}`);
      const json = (await res.json()) as { vendors: Record<string, GvlVendor> };
      const vendors: Record<number, GvlVendor> = {};
      for (const [k, v] of Object.entries(json.vendors ?? {})) {
        vendors[Number(k)] = v;
      }
      // Pre-compute risk scores
      for (const v of Object.values(vendors)) {
        riskScores.value.set(v.id, calcPrivacyRisk(v));
      }
      gvlData.value = vendors;
      gvlStatus.value = 'ok';
    } catch (e) {
      gvlStatus.value = 'error';
      gvlError.value = e instanceof Error ? e.message : String(e);
    }
  }

  function toggleVendor(id: number): void {
    const s = new Set(selected.value);
    if (s.has(id)) {
      s.delete(id);
    } else if (s.size < 4) {
      s.add(id);
    }
    selected.value = s;
  }

  async function saveRisk(companyId: string, score: number): Promise<void> {
    await patchCompany(companyId, { gvl_risk_score: score });
  }

  const vendorList = (): GvlVendor[] => {
    if (!gvlData.value) return [];
    return Object.values(gvlData.value);
  };

  return {
    gvlData,
    gvlStatus,
    gvlError,
    selected,
    riskScores,
    vendorSearch,
    loadGvl,
    toggleVendor,
    saveRisk,
    vendorList,
  };
});
