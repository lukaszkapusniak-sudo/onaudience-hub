#!/usr/bin/env node
/**
 * validate.js — run BEFORE every push: node validate.js
 *
 * Catches the 3 patterns that cause blank screens or broken buttons:
 *   1. Duplicate identifier in import {} (→ ES module SyntaxError → blank screen)
 *   2. JS SyntaxError in any file      (→ module fails to load   → blank screen)
 *   3. JSON.stringify inside onclick="" (→ broken HTML attribute  → silent buttons)
 */
const fs   = require('fs');
const vm   = require('vm');
const HUB  = 'www/hub/';
const FILES = ['app.js','hub.js','audiences.js','api.js','auth.js','meeseeks.js','utils.js','state.js','lemlist.js','drawer.js','aud-icp.js','aud-campaign.js'];
let issues = 0;

for (const f of FILES) {
  const path = HUB + f;
  if (!fs.existsSync(path)) continue;
  const src   = fs.readFileSync(path, 'utf8');
  const lines = src.split('\n');

  // ── Check 1: duplicate identifiers in import { ... } blocks ────────────
  let inImport = false, importBuf = '';
  for (const line of lines) {
    if (line.trim().match(/^import\s*\{/)) { inImport = true; importBuf = ''; }
    if (inImport) {
      importBuf += ' ' + line;
      if (line.includes('}')) {
        inImport = false;
        const ids   = importBuf.match(/\b[a-zA-Z_]\w*\b/g) || [];
        const seen  = {}, dups = [];
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

  // ── Check 2: JS SyntaxError via vm.Script ───────────────────────────────
  try {
    const stripped = src
      .replace(/import\s*\{[^}]*\}\s*from\s*['"][^'"]+['"]\s*;?/gs, '/* import */')
      .replace(/^import\s+.*?from\s+['"][^'"]+['"]\s*;?\s*$/gm,      '/* import */')
      .replace(/^import\s+['"][^'"]+['"]\s*;?\s*$/gm,                '/* import */')
      .replace(/\bimport\s*\(/g,                                      'Promise.resolve(')
      .replace(/^export\s+default\s+/gm,                             'var _default = ')
      .replace(/^export\s+(async\s+)?(function|class|const|let|var)\s+/gm, '$1$2 ')
      .replace(/^export\s*\{[^}]*\}\s*;?\s*$/gm,                    '/* export */')
      .replace(/^export\s*\{[^}]*\}\s*from\s*['"][^'"]+['"']\s*;?\s*$/gm, '/* re-export */');
    new vm.Script(stripped, { filename: f });
  } catch(e) {
    console.error(`FAIL ${f} — SyntaxError: ${e.message.split('\n')[0]}`);
    issues++;
  }

  // ── Check 3: JSON.stringify inside onclick="" (breaks HTML attribute) ───
  const badOnclick = [...src.matchAll(/onclick="[^"]*JSON\.stringify[^"]*"/g)];
  if (badOnclick.length) {
    badOnclick.forEach(m =>
      console.error(`FAIL ${f} — JSON.stringify in onclick attr: ${m[0].slice(0, 90)}`)
    );
    issues += badOnclick.length;
  }
}

if (issues === 0) {
  console.log(`✓ All ${FILES.length} files pass (duplicate-import, syntax, onclick checks)`);
  process.exit(0);
} else {
  console.error(`\n✗ ${issues} issue(s) — fix before pushing`);
  process.exit(1);
}
