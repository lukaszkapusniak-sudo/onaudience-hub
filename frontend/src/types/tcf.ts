/** GVL Vendor entry from IAB TCF Global Vendor List. */
export interface GvlVendor {
  id: number;
  name: string;
  purposes?: number[];
  legIntPurposes?: number[];
  flexiblePurposes?: number[];
  specialPurposes?: number[];
  features?: number[];
  specialFeatures?: number[];
  dataRetention?: {
    stdRetention?: number;
    purposes?: Record<string, number>;
    specialPurposes?: Record<string, number>;
  };
  urls?: { langId: string; privacy: string; legIntClaim?: string }[];
}

/** Computed risk score — matches `calcPrivacyRisk` in `www/hub/tcf.js`. */
export interface TcfRisk {
  vendorId: number;
  vendorName: string;
  score: number;
  details: {
    purposes: number;
    legIntPurposes: number;
    specialPurposes: number;
    specialFeatures: number;
    dataRetentionDays: number | null;
  };
}
