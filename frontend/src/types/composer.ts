/** Persona — aligns with `MC_PERSONAS` in `www/hub/config.js`. */
export interface Persona {
  id: string;
  emoji: string;
  name: string;
  vibe: string;
  color: string;
  system: string;
}

/** Payload passed to openComposer() — same shape as legacy `S.mcPayload`. */
export interface ComposerPayload {
  company?: string | null;
  companyId?: string | null;
  note?: string | null;
  status?: string | null;
  icp?: number | null;
  description?: string | null;
  angle?: string | null;
  category?: string | null;
  region?: string | null;
  contactName?: string | null;
  contactTitle?: string | null;
  linkedin?: string | null;
}

export interface GeneratedEmail {
  subject: string;
  body: string;
}
