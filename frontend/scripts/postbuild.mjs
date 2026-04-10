/**
 * GitHub Pages: SPA fallback (copy index.html → 404.html).
 * Also copy legacy vanilla hub into dist so /onaudience-hub/hub/* keeps working during migration.
 */
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dist = path.resolve(__dirname, '../dist');
const legacyHub = path.resolve(__dirname, '../../www/hub');

const indexHtml = path.join(dist, 'index.html');
if (!existsSync(indexHtml)) {
  console.error('postbuild: dist/index.html missing — run vite build first');
  process.exit(1);
}

writeFileSync(path.join(dist, '404.html'), readFileSync(indexHtml));

if (existsSync(legacyHub)) {
  const dest = path.join(dist, 'hub');
  mkdirSync(dest, { recursive: true });
  cpSync(legacyHub, dest, { recursive: true });
  console.log('postbuild: copied legacy www/hub → dist/hub');
} else {
  console.warn('postbuild: ../www/hub not found — skipping legacy copy');
}

console.log('postbuild: wrote 404.html for GitHub Pages SPA routing');
