/**
 * Google News via corsproxy.io — lazy-loaded with a dedicated Web Worker for fetch+parse.
 */
import { parseGoogleNewsRss } from './gnews-parse.js?v=__OA_ASSET_VERSION__';

export function buildGoogleNewsProxyUrl(name) {
  const q = encodeURIComponent(`"${name}" programmatic OR "data partnership" OR adtech`);
  return `https://corsproxy.io/?url=${encodeURIComponent('https://news.google.com/rss/search?q=' + q + '&hl=en-US&gl=US&ceid=US:en')}`;
}

let worker;
let nextId = 1;
const pending = new Map();

function attachWorkerHandlers(w) {
  w.addEventListener('message', (ev) => {
    const { id, result } = ev.data || {};
    if (id == null) return;
    const p = pending.get(id);
    if (!p) return;
    pending.delete(id);
    clearTimeout(p.tid);
    p.resolve(Array.isArray(result) ? result : []);
  });
  w.addEventListener('error', () => {
    for (const [, p] of pending) {
      clearTimeout(p.tid);
      p.resolve([]);
    }
    pending.clear();
    worker = undefined;
  });
}

function getWorker() {
  if (worker) return worker;
  try {
    const w = new Worker(new URL('gnews-worker.js', document.baseURI), { type: 'module' });
    attachWorkerHandlers(w);
    worker = w;
    return w;
  } catch {
    return undefined;
  }
}

async function fetchGoogleNewsViaWorker(name) {
  const proxy = buildGoogleNewsProxyUrl(name);
  const w = getWorker();
  if (!w) return null;
  const id = nextId++;
  const timeoutMs = 7000;
  return new Promise((resolve) => {
    const tid = setTimeout(() => {
      if (pending.has(id)) {
        pending.delete(id);
        resolve([]);
      }
    }, timeoutMs + 500);
    pending.set(id, { resolve, tid });
    try {
      w.postMessage({ id, proxy, timeoutMs });
    } catch {
      pending.delete(id);
      clearTimeout(tid);
      resolve([]);
    }
  });
}

async function fetchGoogleNewsMainThread(name) {
  const proxy = buildGoogleNewsProxyUrl(name);
  try {
    const res = await fetch(proxy, { signal: AbortSignal.timeout(7000) });
    if (!res.ok) throw new Error('proxy ' + res.status);
    const xml = await res.text();
    return parseGoogleNewsRss(xml);
  } catch (e) {
    console.warn('Google News error', e.message);
    return [];
  }
}

/**
 * Fetches live Google News for a company name. Uses a Web Worker when available.
 */
export async function fetchGoogleNews(name) {
  const viaWorker = await fetchGoogleNewsViaWorker(name);
  if (viaWorker !== null) return viaWorker;
  return fetchGoogleNewsMainThread(name);
}
