/**
 * Run repo-root tooling (eslint, prettier, tsc for tests) from the `tooling/` workspace.
 * Keeps cwd at the monorepo root so flat configs resolve correctly.
 */
import { execSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(root);

const task = process.argv[2];
const runners = {
  lint: () => execSync('npx eslint .', { stdio: 'inherit' }),
  'format:check': () => execSync('npx prettier --check .', { stdio: 'inherit' }),
  /** Playwright + root configs only — Vue app uses `frontend` workspace `typecheck`. */
  'typecheck:root': () => execSync('npx tsc --noEmit', { stdio: 'inherit' }),
};

const run = runners[task];
if (!run) {
  console.error(`run-root: unknown task "${task}"`);
  process.exit(1);
}
run();
