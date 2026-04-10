/**
 * GitHub Pages: SPA fallback (copy index.html → 404.html).
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dist = path.resolve(__dirname, '../dist');

const indexHtml = path.join(dist, 'index.html');
if (!existsSync(indexHtml)) {
  console.error('postbuild: dist/index.html missing — run vite build first');
  process.exit(1);
}

writeFileSync(path.join(dist, '404.html'), readFileSync(indexHtml));
console.log('postbuild: wrote 404.html for GitHub Pages SPA routing');
