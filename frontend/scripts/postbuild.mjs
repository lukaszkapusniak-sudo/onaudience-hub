/**
 * GitHub Pages: SPA fallback (copy index.html → 404.html).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
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
// Disable Jekyll so GitHub Pages serves _plugin-vue_* and other _-prefixed Vite chunks
writeFileSync(path.join(dist, '.nojekyll'), '');

// Redirect legacy /hub/ bookmarks to the Vue app root
const hubDir = path.join(dist, 'hub');
mkdirSync(hubDir, { recursive: true });
writeFileSync(
  path.join(hubDir, 'index.html'),
  `<!doctype html><html><head>
<meta charset="UTF-8">
<meta http-equiv="refresh" content="0;url=/onaudience-hub/">
<title>Redirecting…</title>
</head><body>
<script>location.replace('/onaudience-hub/' + location.search + location.hash);</script>
</body></html>`,
);

console.log('postbuild: wrote 404.html, .nojekyll, and hub/index.html redirect');
