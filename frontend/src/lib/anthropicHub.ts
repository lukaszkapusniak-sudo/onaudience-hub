/**
 * Anthropic calls — parity with `www/hub/api.js` (`_anthropicCall`, `anthropicFetch`, `researchFetch`).
 * Proxy: `{SB_URL}/functions/v1/claude-proxy` + `hubAuthHeaders()`; direct: user key in localStorage `oaAnthropicKey`.
 */

import { hubAuthHeaders } from './hubRest';

/** Same key as legacy `api.js` / `config.js` MODEL_RESEARCH. */
export const MODEL_RESEARCH = 'claude-opus-4-20250514';

const STORAGE_KEY = 'oaAnthropicKey';

export function getAnthropicApiKey(): string {
  if (typeof localStorage === 'undefined') return '';
  return localStorage.getItem(STORAGE_KEY) || '';
}

export function setAnthropicApiKey(k: string | null): void {
  if (typeof localStorage === 'undefined') return;
  if (k) localStorage.setItem(STORAGE_KEY, k);
  else localStorage.removeItem(STORAGE_KEY);
}

export function hasAnthropicApiKey(): boolean {
  return !!getAnthropicApiKey();
}

async function anthropicCall(
  body: Record<string, unknown>,
  beta: string | null,
): Promise<unknown> {
  const key = getAnthropicApiKey();
  const maxRetries = 3;

  if (key) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    };
    if (beta) headers['anthropic-beta'] = beta;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });
      if (res.status === 529 || res.status === 429) {
        const wait = Math.min(2000 * Math.pow(2, attempt), 10000);
        await new Promise((r) => setTimeout(r, wait));
        continue;
      }
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new Error(`API ${res.status}: ${txt.slice(0, 200)}`);
      }
      return res.json();
    }
    throw new Error('API overloaded after 3 retries — try again in a minute');
  }

  const base = import.meta.env.VITE_OA_SB_URL;
  if (!base) throw new Error('VITE_OA_SB_URL missing');
  const h = await hubAuthHeaders();
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const res = await fetch(`${base}/functions/v1/claude-proxy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...h },
      body: JSON.stringify({ body, ...(beta ? { beta } : {}) }),
    });
    if (res.status === 529 || res.status === 429) {
      const wait = Math.min(2000 * Math.pow(2, attempt), 10000);
      await new Promise((r) => setTimeout(r, wait));
      continue;
    }
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(`Proxy ${res.status}: ${txt.slice(0, 200)}`);
    }
    return res.json();
  }
  throw new Error('API overloaded after 3 retries — try again in a minute');
}

export async function anthropicFetch(body: Record<string, unknown>): Promise<unknown> {
  return anthropicCall(body, null);
}

export async function anthropicMcpFetch(body: Record<string, unknown>): Promise<unknown> {
  return anthropicCall(body, 'mcp-client-2025-04-04');
}

export async function researchFetch(
  system: string,
  userPrompt: string,
): Promise<{ raw: unknown; text: string; content: unknown }> {
  const data = (await anthropicFetch({
    model: MODEL_RESEARCH,
    max_tokens: 1600,
    system,
    tools: [{ type: 'web_search_20250305', name: 'web_search' }],
    messages: [{ role: 'user', content: userPrompt }],
  })) as {
    content?: Array<{ type: string; text?: string }>;
  };
  const textParts = (data.content || [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text || '');
  return { raw: data, text: textParts.join('\n').trim(), content: data.content };
}
