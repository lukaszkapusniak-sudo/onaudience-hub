/**
 * Dedicated worker: fetch Google News RSS via corsproxy.io + parse off the main thread.
 */
import { parseGoogleNewsRss } from './gnews-parse.js?v=__OA_ASSET_VERSION__';

self.addEventListener('message', async (e) => {
  const { id, proxy, timeoutMs } = e.data || {};
  if (id == null || !proxy) return;
  const ms = timeoutMs ?? 7000;
  try {
    const res = await fetch(proxy, { signal: AbortSignal.timeout(ms) });
    if (!res.ok) throw new Error('proxy ' + res.status);
    const xml = await res.text();
    const result = parseGoogleNewsRss(xml);
    self.postMessage({ id, result });
  } catch {
    self.postMessage({ id, result: [] });
  }
});
