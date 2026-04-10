#!/usr/bin/env node
/**
 * validate.js — run BEFORE every push: node validate.js
 *
 * Catches the 3 patterns that cause blank screens or broken buttons:
 *   1. Duplicate identifier in import {} (→ ES module SyntaxError → blank screen)
 *   2. JS SyntaxError in any file      (→ module fails to load   → blank screen)
 *   3. JSON.stringify inside onclick="" (→ broken HTML attribute  → silent buttons)
 */
const fs = require('fs');
const vm = require('vm');
const HUB = 'www/hub/';
const FILES = [
  'app.js',
  'hub.js',
  'audiences.js',
  'api.js',
  'gnews.js',
  'gnews-worker.js',
  'gnews-parse.js',
  'auth.js',
  'meeseeks.js',
  'utils.js',
  'state.js',
  'lemlist.js',
  'drawer.js',
  'aud-icp.js',
  'aud-campaign.js',
  'list.js',
  'db.js',
  'vibe.js',
];
let issues = 0;

for (const f of FILES) {
  const path = HUB + f;
  if (!fs.existsSync(path)) continue;
  const src = fs.readFileSync(path, 'utf8');
  const lines = src.split('\n');

  // ── Check 1: duplicate identifiers in import { ... } blocks ────────────
  let inImport = false,
    importBuf = '';
  for (const line of lines) {
    if (line.trim().match(/^import\s*\{/)) {
      inImport = true;
      importBuf = '';
    }
    if (inImport) {
      importBuf += ' ' + line;
      if (line.includes('}')) {
        inImport = false;
        const ids = importBuf.match(/\b[a-zA-Z_]\w*\b/g) || [];
        const seen = {},
          dups = [];
        ids.forEach((id) => {
          if (!['import', 'from', 'as', 'default', 'type'].includes(id)) {
            seen[id] = (seen[id] || 0) + 1;
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
      // Strip multi-line import { ... } from '...' blocks first (non-greedy, no 's' flag needed with [\s\S])
      .replace(/import\s*\{[\s\S]*?\}\s*from\s*['"][^'"]+['"]\s*;?/g, '/* import */')
      // Strip single-identifier imports: import S from '...'
      .replace(/^import\s+\w+\s+from\s+['"][^'"]+['"]\s*;?\s*$/gm, '/* import */')
      // Strip side-effect imports: import '...'
      .replace(/^import\s+['"][^'"]+['"]\s*;?\s*$/gm, '/* import */')
      // Dynamic import() → Promise.resolve()
      .replace(/\bimport\s*\(/g, 'Promise.resolve(')
      .replace(/^export\s+default\s+/gm, 'var _default = ')
      .replace(/^export\s+(async\s+)?(function|class|const|let|var)\s+/gm, '$1$2 ')
      // Strip export { ... } (local)
      .replace(/^export\s*\{[^}]*\}\s*;?\s*$/gm, '/* export */')
      // Strip multi-line re-exports: export { ... } from '...'
      .replace(/export\s*\{[\s\S]*?\}\s*from\s*['"][^'"]+['"]\s*;?/g, '/* re-export */');
    new vm.Script(stripped, { filename: f });
  } catch (e) {
    console.error(`FAIL ${f} — SyntaxError: ${e.message.split('\n')[0]}`);
    issues++;
  }

  // ── Check 3: JSON.stringify inside onclick="" (breaks HTML attribute) ───
  const badOnclick = [...src.matchAll(/onclick="[^"]*JSON\.stringify[^"]*"/g)];
  if (badOnclick.length) {
    badOnclick.forEach((m) =>
      console.error(`FAIL ${f} — JSON.stringify in onclick attr: ${m[0].slice(0, 90)}`),
    );
    issues += badOnclick.length;
  }
}

// ── Check 4: cross-module exports — each imported name must be exported ──
// Build export map for all hub files
const exportMap = {};
for (const f of FILES) {
  const path = HUB + f;
  if (!fs.existsSync(path)) continue;
  const src = fs.readFileSync(path, 'utf8');
  const exports = new Set();
  // Named exports
  for (const m of src.matchAll(/^export\s+(?:async\s+)?(?:function|class|const|let|var)\s+(\w+)/gm))
    exports.add(m[1]);
  // Re-export { a, b } from '...'
  for (const m of src.matchAll(/^export\s*\{([^}]+)\}/gm))
    for (const name of m[1].split(',').map((n) =>
      n
        .trim()
        .split(/\s+as\s+/)
        .pop()
        .trim(),
    ))
      if (name) exports.add(name);
  exportMap[f] = exports;
}

// Check each file's imports against exportMap
for (const f of FILES) {
  const path = HUB + f;
  if (!fs.existsSync(path)) continue;
  const src = fs.readFileSync(path, 'utf8');
  // Split into lines, strip comment lines, then check imports
  const srcNoComments = src
    .split('\n')
    .filter((l) => !l.trim().startsWith('//'))
    .join('\n');
  for (const m of srcNoComments.matchAll(/import\s*\{([^}]+)\}\s*from\s*['"]\.\/([^'"?]+)/g)) {
    const names = m[1]
      .split(',')
      .map((n) =>
        n
          .trim()
          .split(/\s+as\s+/)[0]
          .trim(),
      )
      .filter(Boolean);
    const fromFile = m[2].replace(/\.js$/, '') + '.js';
    const available = exportMap[fromFile];
    if (!available) continue; // external module
    for (const name of names) {
      if (name === 'default') continue;
      if (!available.has(name)) {
        console.error(`FAIL ${f} — imports '${name}' from ${fromFile} but it is not exported`);
        issues++;
      }
    }
  }
}

// ── Check 5: undeclared utils function calls ─────────────────────────────
const UTILS_EXPORTS = new Set([
  'classify',
  '_slug',
  'getCoTags',
  'getAv',
  'ini',
  'tClass',
  'tLabel',
  'stars',
  'esc',
  'relTime',
  'authHdr',
  'safeUrl',
]);

for (const cf of FILES) {
  const cpath = HUB + cf;
  if (!fs.existsSync(cpath) || cf === 'utils.js') continue;
  const csrc = fs.readFileSync(cpath, 'utf8');
  const csnc = csrc
    .split('\n')
    .filter((l) => !l.trim().startsWith('//'))
    .join('\n');
  const uiMatch = csnc.match(/import\s*\{([^}]+)\}\s*from\s*['"]\.\/utils\.js/);
  const imported5 = new Set(uiMatch ? uiMatch[1].split(',').map((x) => x.trim()) : []);
  for (const fn of UTILS_EXPORTS) {
    if (imported5.has(fn)) continue;
    if (new RegExp('(?<![.\\w])' + fn + '\\s*[(`]').test(csnc)) {
      console.error('FAIL ' + cf + " — uses '" + fn + "' but not imported from utils.js");
      issues++;
    }
  }
}

// ── Check 5b: undeclared db.js symbol usage ─────────────────────────────
// Only checks the canonical alias names we actually use — avoids false positives
// like `dbStatus` (DOM element id) or `dbSummary` (local variable).
const DB_KNOWN = new Set([
  'dbCo',
  'dbCompanies',
  'dbContacts',
  'dbRelations',
  'dbIntel',
  'dbEnrich',
  'dbMerge',
  'dbAud',
  'dbMergeSugg',
]);

for (const cf of FILES) {
  const cpath = HUB + cf;
  if (!fs.existsSync(cpath) || cf === 'db.js') continue;
  const csrc = fs.readFileSync(cpath, 'utf8');
  const csnc = csrc
    .split('\n')
    .filter((l) => !l.trim().startsWith('//'))
    .join('\n');
  const dbImp = csnc.match(/import\s*\{([^}]+)\}\s*from\s*['"]\.\/db\.js/);
  const importedDb = new Set();
  if (dbImp) {
    for (const part of dbImp[1].split(',')) {
      const m = part.trim().match(/\bas\s+(\w+)$|^(\w+)$/);
      if (m) importedDb.add(m[1] || m[2]);
    }
  }
  // Only flag symbols in our known set that are used but not imported
  for (const sym of DB_KNOWN) {
    if (importedDb.has(sym)) continue;
    if (new RegExp('\\b' + sym + '\\b').test(csnc)) {
      console.error('FAIL ' + cf + " — uses '" + sym + "' but not imported from db.js");
      issues++;
    }
  }
}

// ── Check 6: cache-bust token consistency (see scripts/stamp-hub-asset-version.mjs) ──
const EXPECTED_ASSET_V = '__OA_ASSET_VERSION__';
const hubFiles = [
  'app.js',
  'hub.js',
  'audiences.js',
  'api.js',
  'auth.js',
  'state.js',
  'utils.js',
  'config.js',
  'style.css',
  'index.html',
].map((f) => HUB + f);
const badAssetTokens = new Set();
for (const fp of hubFiles) {
  if (!fs.existsSync(fp)) continue;
  const src = fs.readFileSync(fp, 'utf8');
  for (const m of src.matchAll(/\?v=([^'"&\s]+)/g)) {
    const tok = m[1];
    if (tok !== EXPECTED_ASSET_V) badAssetTokens.add(`${fp.split('/').pop()}: ?v=${tok}`);
  }
}
if (badAssetTokens.size) {
  for (const line of badAssetTokens)
    console.error(`FAIL cache-bust token in source — expected ?v=${EXPECTED_ASSET_V} only: ${line}`);
  issues += badAssetTokens.size;
}

// ── Check 7: CSS audit via audit_css.py (Python via uv) ─────────────────
const { execSync } = require('child_process');
try {
  execSync('uv run python scripts/audit_css.py', { stdio: 'inherit', cwd: __dirname });
} catch {
  issues++;
}

if (issues === 0) {
  console.log(
    `✓ All ${FILES.length} files pass (JS checks + asset token + CSS audit via uv)`,
  );
  process.exit(0);
} else {
  console.error(`\n✗ ${issues} issue(s) — fix before pushing`);
  process.exit(1);
}
