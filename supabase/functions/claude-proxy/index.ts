/**
 * claude-proxy — Supabase Edge Function
 *
 * Proxies requests to the Anthropic API so the browser never needs
 * a user-supplied API key.  The key lives in Supabase secrets as
 * ANTHROPIC_API_KEY.
 *
 * POST /functions/v1/claude-proxy
 * Body: { body: <Anthropic /v1/messages request body>, beta?: string }
 *
 * Returns: raw Anthropic /v1/messages JSON response.
 *
 * Security: only requests from the onAudience hub origin are allowed
 *           (CORS restricted).  No user data is logged.
 */

const ALLOWED_ORIGINS = [
  'https://lukaszkapusniak-sudo.github.io',
  'http://localhost', // local dev
  'http://127.0.0.1',
];

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';
const MAX_RETRIES = 3;

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin') ?? '';

  // ── CORS preflight ──────────────────────────────────────────────
  const allowed = ALLOWED_ORIGINS.some((o) => origin.startsWith(o));
  const corsHeaders: Record<string, string> = {
    'Access-Control-Allow-Origin': allowed ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
  }

  // ── Parse request ───────────────────────────────────────────────
  let payload: { body: Record<string, unknown>; beta?: string };
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!payload?.body) {
    return new Response(JSON.stringify({ error: 'Missing "body" field' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // ── Read key from Supabase secret ───────────────────────────────
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'Proxy not configured — ANTHROPIC_API_KEY secret missing' }),
      {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }

  // ── Forward to Anthropic with retries on 429/529 ────────────────
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-api-key': apiKey,
    'anthropic-version': ANTHROPIC_VERSION,
  };
  if (payload.beta) headers['anthropic-beta'] = payload.beta;

  let lastStatus = 0;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const res = await fetch(ANTHROPIC_API, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload.body),
    });

    lastStatus = res.status;

    if (res.status === 429 || res.status === 529) {
      const wait = Math.min(2000 * Math.pow(2, attempt), 10000);
      console.warn(
        `[claude-proxy] ${res.status} — retry ${attempt + 1}/${MAX_RETRIES} in ${wait}ms`,
      );
      await new Promise((r) => setTimeout(r, wait));
      continue;
    }

    // Pass through response (ok or error) with CORS headers
    const body = await res.text();
    return new Response(body, {
      status: res.status,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  }

  return new Response(
    JSON.stringify({
      error: `Anthropic API overloaded after ${MAX_RETRIES} retries (status ${lastStatus})`,
    }),
    {
      status: 503,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    },
  );
});
