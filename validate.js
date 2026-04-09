#!/usr/bin/env node
// node validate.js — run before every push to catch blank-screen bugs
const fs = require('fs');
const vm = require('vm');
const HUB = 'www/hub/';
const FILES = ['app.js','hub.js','audiences.js','api.js','auth.js','meeseeks.js','utils.js','state.js'];
let issues = 0;

for (const f of FILES) {
  const path = HUB + f;
  if (!fs.existsSync(path)) continue;
  const src = fs.readFileSync(path, 'utf8');
  const lines = src.split('\n');

  // ── Check 1: duplicate identifiers in any import { ... } block ──────────
  // Collect the full import block (may span lines)
  let inImport = false, importBuf = '';
  for (const line of lines) {
    if (line.trim().match(/^import\s*\{/)) { inImport = true; importBuf = ''; }
    if (inImport) {
      importBuf += ' ' + line;
      if (line.includes('}')) {
        inImport = false;
        const ids = importBuf.match(/\b[a-zA-Z_]\w*\b/g) || [];
        const seen = {}, dups = [];
        ids.forEach(id => {
          if (!['import','from','as','default','type'].includes(id)) {
            seen[id] = (seen[id]||0)+1;
            if (seen[id] === 2) dups.push(id);
          }
        });
        if (dups.length) {
          console.error(`FAIL ${f} — duplicate in import {}: ${dups.join(', ')}`);
          issues++;
        }
      }
    }
  }

  // ── Check 2: syntax check via vm (strip all import/export) ──────────────
  try {
    const stripped = src
      // Remove multi-line import { ... } from '...'
      .replace(/import\s*\{[^}]*\}\s*from\s*['"][^'"]+['"]\s*;?/gs, '/* import */')
      // Remove single-line imports
      .replace(/^import\s+.*?from\s+['"][^'"]+['"]\s*;?\s*$/gm, '/* import */')
      .replace(/^import\s+['"][^'"]+['"]\s*;?\s*$/gm, '/* import */')
      // Dynamic import() → Promise.resolve()
      .replace(/\bimport\s*\(/g, 'Promise.resolve(')
      // export default
      .replace(/^export\s+default\s+/gm, 'var _default = ')
      // export function/class/const/let/var
      .replace(/^export\s+(async\s+)?(function|class|const|let|var)\s+/gm, '$1$2 ')
      // export { ... }
      .replace(/^export\s*\{[^}]*\}\s*;?\s*$/gm, '/* export */');
    new vm.Script(stripped, { filename: f });
  } catch(e) {
    console.error(`FAIL ${f} — SyntaxError: ${e.message.split('\n')[0]}`);
    issues++;
  }
}

if (issues === 0) {
  console.log(`✓ All ${FILES.length} files pass syntax check`);
  process.exit(0);
} else {
  console.error(`\n✗ ${issues} issue(s) found — fix before pushing`);
  process.exit(1);
}
