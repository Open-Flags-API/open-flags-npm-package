/**
 * Lays out the declarations `tsc -p tsconfig.build.json` emits into dist/.types for publishing.
 *
 * The sources reach outside the package (../../src/core), so tsc mirrors the repo layout:
 *   dist/.types/packages/open-flags-api/src/<name>.d.ts  ->  dist/<name>.d.ts
 *   dist/.types/src/core/<name>.d.ts                     ->  dist/core/<name>.d.ts
 * Only files reachable from index.d.ts are kept, relative specifiers are rewritten to the new layout, and
 * dist/index.d.mts re-exports dist/index.d.ts for the `import` condition. Fails if a declaration refers
 * to a file that is not published.
 *
 * Usage (after vite build, which empties dist/):
 *   tsc -p tsconfig.build.json && node scripts/build-types.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const PACKAGE_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(PACKAGE_DIR, 'dist');
const EMITTED = path.join(DIST, '.types');
const LAYOUT = [
  ['packages/open-flags-api/src/', ''],
  ['src/core/', 'core/'],
];
// `from './x'`, `import './x'` and `import('./x')`, relative specifiers only.
const SPECIFIER = /(\bfrom\s+|\bimport\s*\(\s*|\bimport\s+)(['"])(\.{1,2}\/[^'"]+)\2/g;

const toPosix = file => file.split(path.sep).join('/');

/** 'packages/open-flags-api/src/urls.d.ts' -> 'urls.d.ts'; undefined outside the published layout. */
function outputPath(emitted) {
  for (const [from, to] of LAYOUT) if (emitted.startsWith(from)) return to + emitted.slice(from.length);
  return undefined;
}

/** The emitted declaration a specifier in `emitted` points at ('../../../src/core/types' -> 'src/core/types.d.ts'). */
function target(emitted, specifier) {
  const base = toPosix(path.posix.join(path.posix.dirname(emitted), specifier)).replace(/\.(m|c)?js$/, '');
  for (const candidate of [`${base}.d.ts`, `${base}/index.d.ts`]) {
    if (fs.existsSync(path.join(EMITTED, candidate))) return candidate;
  }
  throw new Error(`${emitted}: cannot find the declaration for '${specifier}'`);
}

function main() {
  if (!fs.existsSync(EMITTED)) throw new Error('dist/.types not found: run tsc -p tsconfig.build.json first');
  const written = [];
  const queue = ['packages/open-flags-api/src/index.d.ts'];
  const seen = new Set(queue);
  while (queue.length) {
    const emitted = queue.shift();
    const out = outputPath(emitted);
    if (!out) throw new Error(`${emitted} is outside the published layout`);
    const source = fs.readFileSync(path.join(EMITTED, emitted), 'utf8');
    const rewritten = source.replace(SPECIFIER, (_match, keyword, quote, specifier) => {
      const dependency = target(emitted, specifier);
      const dependencyOut = outputPath(dependency);
      if (!dependencyOut) throw new Error(`${emitted} refers to ${dependency}, which is not published`);
      if (!seen.has(dependency)) {
        seen.add(dependency);
        queue.push(dependency);
      }
      let relative = path.posix.relative(path.posix.dirname(out), dependencyOut).replace(/\.d\.ts$/, '');
      if (!relative.startsWith('.')) relative = `./${relative}`;
      return `${keyword}${quote}${relative}${quote}`;
    });
    fs.mkdirSync(path.dirname(path.join(DIST, out)), { recursive: true });
    fs.writeFileSync(path.join(DIST, out), rewritten);
    written.push(out);
  }
  // The `import` condition gets ESM-flavoured types; they re-export the (CommonJS-flavoured) index.d.ts.
  fs.writeFileSync(path.join(DIST, 'index.d.mts'), "export * from './index.js';\n");
  written.push('index.d.mts');
  fs.rmSync(EMITTED, { recursive: true, force: true });
  console.log(`dist: ${written.sort().join(', ')}`);
}

try {
  main();
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}
