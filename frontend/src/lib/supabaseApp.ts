/**
 * Browser Supabase client for the Vue app (Vite `base` `/onaudience-hub/` on GitHub Pages).
 * Uses `storageKey: 'oaHubSession'` for continuity with any older hub sessions.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

/** Full URL OAuth providers should redirect to (origin + Vite `BASE_URL`, trailing slash). */
export function getAuthRedirectUrl(): string {
  if (typeof window === 'undefined') return '';
  const base = import.meta.env.BASE_URL || '/';
  const path = base.endsWith('/') ? base : `${base}/`;
  return `${window.location.origin}${path}`;
}

export function getSupabaseApp(): SupabaseClient | null {
  const url = import.meta.env.VITE_OA_SB_URL;
  const key = import.meta.env.VITE_OA_SB_ANON_KEY;
  if (!url || !key) {
    if (import.meta.env.DEV) {
      console.error('[auth] VITE_OA_SB_URL / VITE_OA_SB_ANON_KEY missing — check .env SB_URL / SB_ANON_KEY');
    }
    return null;
  }
  if (!client) {
    client = createClient(url, key, {
      auth: {
        storageKey: 'oaHubSession',
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
      },
    });
  }
  return client;
}

/** Google OAuth via Supabase (enable provider + redirect URLs in project dashboard). */
export async function signInWithGoogle(): Promise<{ error: Error | null }> {
  const sb = getSupabaseApp();
  if (!sb) return { error: new Error('Supabase client unavailable') };
  const redirectTo = getAuthRedirectUrl();
  const { error } = await sb.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });
  return { error: error ? new Error(error.message) : null };
}

/**
 * Run before app mount: exchange PKCE `?code=` from OAuth redirect, then load session.
 * Add the same `redirectTo` URL under Supabase → Authentication → URL configuration → Redirect URLs.
 */
export async function hydrateAuthFromUrl(): Promise<void> {
  const sb = getSupabaseApp();
  if (!sb || typeof window === 'undefined') return;

  const href = window.location.href;
  if (href.includes('code=')) {
    const { error } = await sb.auth.exchangeCodeForSession(href);
    if (error) {
      if (import.meta.env.DEV) console.warn('[auth] exchangeCodeForSession:', error.message);
    } else {
      const u = new URL(href);
      u.search = '';
      window.history.replaceState({}, document.title, `${u.pathname}${u.hash}`);
    }
  }

  await sb.auth.getSession();
}
