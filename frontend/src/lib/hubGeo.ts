/**
 * Nominatim geocoding — parity with `www/hub/api.js` `geocodeCity` / `saveGeocode`.
 * Default URL matches `scripts/generate-hub-config.mjs` when `NOMINATIM_URL` is unset.
 */

import { upsertCompany } from './hubRest';

const DEFAULT_NOMINATIM = 'https://nominatim.openstreetmap.org/search';

export async function geocodeCity(
  cityStr: string,
): Promise<{ lat: number; lng: number } | null> {
  try {
    const url = `${DEFAULT_NOMINATIM}?q=${encodeURIComponent(cityStr)}&format=json&limit=1`;
    const r = await fetch(url, { headers: { 'User-Agent': 'onAudience-Hub/2' } });
    if (!r.ok) return null;
    const data = (await r.json()) as Array<{ lat?: string; lon?: string }>;
    if (!data.length) return null;
    return { lat: parseFloat(data[0].lat || ''), lng: parseFloat(data[0].lon || '') };
  } catch {
    return null;
  }
}

export async function saveCompanyGeocode(
  companyId: string,
  lat: number,
  lng: number,
): Promise<void> {
  try {
    await upsertCompany({ id: companyId, hq_lat: lat, hq_lng: lng });
  } catch (e) {
    console.warn('saveCompanyGeocode', e);
  }
}
