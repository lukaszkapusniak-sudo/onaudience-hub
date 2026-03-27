/* ═══════════════════════════════════════════════════════════════
   config.js — Supabase credentials + constants
   ═══════════════════════════════════════════════════════════════ */

export const SB_URL = 'https://nyzkkqqjnkctcmxoirdj.supabase.co';
export const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55emtrcXFqbmtjdGNteG9pcmRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4NzMxMzYsImV4cCI6MjA4OTQ0OTEzNn0.jhAq_C68klOp4iTyj9HmsyyvoxsOI6ACld7t_87TAk0';

export const SB_HEADERS = {
  apikey: SB_KEY,
  Authorization: `Bearer ${SB_KEY}`,
};

export const SB_WRITE_HEADERS = {
  ...SB_HEADERS,
  'Content-Type': 'application/json',
  Prefer: 'resolution=merge-duplicates,return=minimal',
};

export const FETCH_TIMEOUT = 8000;

/* Panel registry — add new panels here, one line each */
export const PANELS = {
  meeseeks: { src: 'meeseeks-composer.html', label: 'Meeseeks Composer' },
  composer: { src: 'email-composer-panel.html', label: 'Email Composer' },
};

/* Type → tag class mapping */
export const TYPE_CLS = {
  client: 'tc', partner: 'tp', prospect: 'tpr', nogo: 'tn', poc: 'tpo',
};

/* Type → avatar background color */
export const TYPE_COLOR = {
  client: '#146B3A', partner: '#1A4F8A', prospect: '#7A4200',
  nogo: '#6B6B64', poc: '#4B2D9E',
};
