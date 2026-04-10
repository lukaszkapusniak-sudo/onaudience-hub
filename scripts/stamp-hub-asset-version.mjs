/**
 * Replaces __OA_ASSET_VERSION__ in hub JS/HTML (cache-bust token).
 * Default: stamp dist/hub after copy so www/hub stays stable in git.
 *
 * Usage: node scripts/stamp-hub-asset-version.mjs [rootDir]
 * Env: HUB_ASSET_VERSION, or GITHUB_SHA (first 12 chars)
 */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDefault = path.resolve(__dirname, '../frontend/dist/hub');

const hubRoot = path.resolve(process.argv[2] || rootDefault);

const version =
  process.env.HUB_ASSET_VERSION ||
  (process.env.GITHUB_SHA ? process.env.GITHUB_SHA.slice(0, 12) : '') ||
  `dev-${Date.now()}`;

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) await walk(full);
    else if (e.isFile() && (e.name.endsWith('.js') || e.name.endsWith('.html'))) {
      let text = await readFile(full, 'utf8');
      if (!text.includes('__OA_ASSET_VERSION__')) continue;
      text = text.split('__OA_ASSET_VERSION__').join(version);
      await writeFile(full, text, 'utf8');
    }
  }
}

try {
  await walk(hubRoot);
  console.log(`stamp-hub-asset-version: ${hubRoot} → v=${version}`);
} catch (err) {
  console.error('stamp-hub-asset-version:', err.message);
  process.exit(1);
}
