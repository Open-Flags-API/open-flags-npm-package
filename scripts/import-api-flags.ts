/**
 * Imports flag and coat-of-arms SVGs from the Open Flags API repo into flags/, using the package's
 * ISO file pattern:
 *
 *   flags/<CC>.svg          national flag          flags/<CC>-COA.svg          national coat of arms
 *   flags/<CC>/<SUB>.svg    subdivision flag       flags/<CC>/<SUB>-COA.svg    subdivision coat of arms
 *
 * Only codes listed in data/iso-codes.json are imported (current ISO 3166 codes plus the withdrawn /
 * user-assigned codes the API has artwork for). The API's name-derived pseudo-codes (data_source
 * "public", e.g. US-GE) are skipped. Files that already exist in flags/ are never overwritten unless
 * --overwrite is passed, so artwork that was already in the package wins.
 *
 * Every imported SVG is optimized with SVGO (preset-default); the original is kept when SVGO fails
 * or would make the file bigger.
 *
 * Also writes data/api-availability.json: which ISO codes the API serves a flag / coat of arms for.
 * The open-flags-api package uses it to resolve polyfills against what the API actually has.
 *
 * Usage:
 *   npm run import:api-flags -- [--api-repo ../openflagsapi/open_flags_API_ex] [--overwrite] [--dry-run]
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { Worker } from 'worker_threads';

interface Manifest {
  iso_code: string;
  country_iso: string;
  data_source?: string;
  flag?: { svg?: string | null };
  coat?: { svg?: string | null };
}

interface IsoData {
  countries: Record<string, unknown>;
  subdivisions: Record<string, unknown>;
}

interface Job {
  code: string;
  kind: 'flag' | 'coat';
  src: string;
  target: string;
}

interface OptimizeResult {
  target: string;
  before: number;
  after: number;
  kept: boolean;
  error?: string;
}

const ROOT = path.resolve(__dirname, '..');
const FLAGS_DIR = path.join(ROOT, 'flags');
const ISO_DATA = path.join(ROOT, 'data/iso-codes.json');
const AVAILABILITY_FILE = path.join(ROOT, 'data/api-availability.json');

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

function targetFor(code: string, kind: 'flag' | 'coat'): string {
  const suffix = kind === 'coat' ? '-COA' : '';
  const dash = code.indexOf('-');
  return dash === -1 ? `${code}${suffix}.svg` : `${code.slice(0, dash)}/${code.slice(dash + 1)}${suffix}.svg`;
}

/** SVGO runs in plain-JS worker threads so the import finishes in minutes rather than an hour. */
const WORKER_SOURCE = `
const { parentPort } = require('worker_threads');
const fs = require('fs');
const path = require('path');
const { optimize } = require(${JSON.stringify(require.resolve('svgo'))});
parentPort.on('message', ({ src, dest }) => {
  const raw = fs.readFileSync(src, 'utf8');
  let out = null;
  let error;
  try { out = optimize(raw, { path: src, multipass: false }).data; } catch (e) { error = String((e && e.message) || e).slice(0, 200); }
  const kept = !out || Buffer.byteLength(out) >= Buffer.byteLength(raw);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, kept ? raw : out);
  parentPort.postMessage({ target: dest, before: Buffer.byteLength(raw), after: Buffer.byteLength(kept ? raw : out), kept, error });
});
`;

function optimizeAll(items: { src: string; dest: string }[]): Promise<OptimizeResult[]> {
  return new Promise(resolve => {
    const results: OptimizeResult[] = [];
    if (items.length === 0) return resolve(results);
    const queue = [...items].sort((a, b) => fs.statSync(b.src).size - fs.statSync(a.src).size);
    let alive = 0;
    const workers = Math.max(1, Math.min(os.cpus().length - 1, queue.length));
    for (let i = 0; i < workers; i++) {
      alive++;
      const w = new Worker(WORKER_SOURCE, { eval: true, resourceLimits: { maxOldGenerationSizeMb: 4096 } });
      const feed = () => {
        const next = queue.shift();
        if (next) w.postMessage(next);
        else void w.terminate();
      };
      w.on('message', (r: OptimizeResult) => {
        results.push(r);
        if (results.length % 500 === 0) console.log(`  optimized ${results.length}/${items.length}`);
        feed();
      });
      w.on('error', err => console.error('  worker error:', err.message));
      w.on('exit', () => {
        if (--alive === 0) resolve(results);
      });
      feed();
    }
  });
}

async function main(): Promise<void> {
  const apiRepo = path.resolve(
    arg('api-repo') ?? process.env.OPEN_FLAGS_API_REPO ?? path.resolve(ROOT, '../openflagsapi/open_flags_API_ex')
  );
  const apiFlags = path.join(apiRepo, 'priv/flags');
  if (!fs.existsSync(apiFlags)) throw new Error(`API flags not found at ${apiFlags} (pass --api-repo <path>)`);
  const overwrite = process.argv.includes('--overwrite');
  const dryRun = process.argv.includes('--dry-run');

  const iso = JSON.parse(fs.readFileSync(ISO_DATA, 'utf8')) as IsoData;
  const known = (code: string) => code in iso.countries || code in iso.subdivisions;

  const manifests: Manifest[] = [];
  const walk = (dir: string) => {
    for (const f of fs.readdirSync(dir)) {
      const p = path.join(dir, f);
      if (fs.statSync(p).isDirectory()) walk(p);
      else if (f === 'manifest.json') manifests.push(JSON.parse(fs.readFileSync(p, 'utf8')) as Manifest);
    }
  };
  walk(apiFlags);

  const jobs: Job[] = [];
  const availability = { flags: [] as string[], coats: [] as string[] };
  let skippedPseudo = 0;
  let skippedUnknown = 0;
  for (const m of manifests) {
    if (m.data_source === 'public') {
      skippedPseudo++;
      continue;
    }
    if (!known(m.iso_code)) {
      if (m.flag?.svg || m.coat?.svg) skippedUnknown++;
      continue;
    }
    for (const kind of ['flag', 'coat'] as const) {
      const rel = m[kind]?.svg;
      if (!rel) continue;
      const src = path.join(apiFlags, rel);
      if (!fs.existsSync(src)) continue;
      (kind === 'flag' ? availability.flags : availability.coats).push(m.iso_code);
      jobs.push({ code: m.iso_code, kind, src, target: targetFor(m.iso_code, kind) });
    }
  }
  availability.flags.sort();
  availability.coats.sort();

  const toImport = jobs.filter(j => overwrite || !fs.existsSync(path.join(FLAGS_DIR, j.target)));
  const kept = jobs.length - toImport.length;
  console.log(
    `API corpus: ${manifests.length} manifests -> ${jobs.length} ISO-pattern files (${availability.flags.length} flags, ${availability.coats.length} coats of arms)`
  );
  console.log(`  skipped: ${skippedPseudo} name-derived pseudo-codes, ${skippedUnknown} codes not in data/iso-codes.json`);
  console.log(`  already in flags/ (kept as-is): ${kept} | to import: ${toImport.length}`);

  if (!dryRun) {
    fs.writeFileSync(
      AVAILABILITY_FILE,
      JSON.stringify(
        {
          _meta: {
            description:
              'ISO codes the Open Flags API serves a flag / coat of arms for. Generated by scripts/import-api-flags.ts - do not edit by hand.',
            generated: new Date().toISOString().slice(0, 10),
          },
          ...availability,
        },
        null,
        2
      ) + '\n'
    );
    const results = await optimizeAll(toImport.map(j => ({ src: j.src, dest: path.join(FLAGS_DIR, j.target) })));
    const mb = (n: number) => (n / 1048576).toFixed(1);
    const before = results.reduce((a, r) => a + r.before, 0);
    const after = results.reduce((a, r) => a + r.after, 0);
    console.log(
      `Imported ${results.length} files: ${mb(before)}MB -> ${mb(after)}MB after SVGO (${results.filter(r => r.kept).length} kept unoptimized, ${results.filter(r => r.error).length} SVGO errors)`
    );
  }
}

main().catch(err => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
