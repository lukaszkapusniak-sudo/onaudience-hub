/**
 * Browser Supabase client for the Vue shell — same auth storage as `www/hub/auth.js`
 * (`storageKey: 'oaHubSession'`) so OAuth return on `/` hydrates before the legacy iframe loads.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

export function getSupabaseApp(): SupabaseClient | null {
  const url = import.meta.env.VITE_OA_SB_URL;
  const key = import.meta.env.VITE_OA_SB_ANON_KEY;
  if (!url || !key) return null;
  if (!client) {
    client = createClient(url, key, {
      auth: {
        storageKey: 'oaHubSession',
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return client;
}

/** Parse OAuth hash / PKCE on the Vue app URL, persist session for the legacy hub iframe. */
export async function hydrateAuthFromUrl(): Promise<void> {
  const sb = getSupabaseApp();
  if (!sb) return;
  await sb.auth.getSession();
}
