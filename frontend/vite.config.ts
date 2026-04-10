import path from 'node:path';
import { fileURLToPath } from 'node:url';

import vue from '@vitejs/plugin-vue';
import { defineConfig, loadEnv } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

const DEFAULT_SB_URL = 'https://nyzkkqqjnkctcmxoirdj.supabase.co';
const DEFAULT_SB_ANON =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55emtrcXFqbmtjdGNteG9pcmRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4NzMxMzYsImV4cCI6MjA4OTQ0OTEzNn0.jhAq_C68klOp4iTyj9HmsyyvoxsOI6ACld7t_87TAk0';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, repoRoot, '');
  const sbUrl = env.SB_URL || DEFAULT_SB_URL;
  const sbAnon = env.SB_ANON_KEY || DEFAULT_SB_ANON;
  const lemlistProxy = `${String(sbUrl).replace(/\/$/, '')}/functions/v1/lemlist-proxy`;

  return {
    base: mode === 'production' ? '/onaudience-hub/' : '/',
    envDir: repoRoot,
    define: {
      'import.meta.env.VITE_OA_SB_URL': JSON.stringify(sbUrl),
      'import.meta.env.VITE_OA_SB_ANON_KEY': JSON.stringify(sbAnon),
      'import.meta.env.VITE_LEMLIST_PROXY': JSON.stringify(lemlistProxy),
    },
    plugins: [vue()],
  };
});
