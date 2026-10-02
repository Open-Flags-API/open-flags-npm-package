import { defineConfig } from 'vite';
import fs from 'fs';
import path from 'path';

const flagsDir = path.resolve(__dirname, 'flags');
const countriesDir = path.resolve(__dirname, 'src/generated/countries');
const mainModule = path.resolve(__dirname, 'src/index.ts');

// open-flags/countries/<CC>: one entry per country module written by scripts/generateFlagMap.ts.
const countryEntries = Object.fromEntries(
  fs
    .readdirSync(countriesDir)
    .filter(file => file.endsWith('.ts'))
    .map(file => [`countries/${file.slice(0, -'.ts'.length)}`, path.join(countriesDir, file)])
);

// The modules behind the registering entries (package.json "sideEffects" lists their dist files). That field
// also applies to this build, where it would mark these sources pure and drop `import './generated/all'`.
const registeringModules = /[\\/]src[\\/](?:national|all|generated[\\/](?:all|countries[\\/][A-Z]{2}))\.ts$/;

/**
 * dist/ path of a shared chunk: chunks/flags/US/CA-<hash>.mjs for the artwork of flags/US/CA.svg (every flag
 * is a chunk of its own), chunks/open-flags-<hash>.mjs for the code behind index, national and all, else
 * chunks/<name>-<hash>.mjs.
 */
function chunkFileName(moduleIds: string[]): string {
  const id = moduleIds.length === 1 ? moduleIds[0] : '';
  const file = id.endsWith('.svg') ? path.relative(flagsDir, id).split(path.sep).join('/') : '..';
  if (!file.startsWith('..')) return `chunks/flags/${file.slice(0, -'.svg'.length)}-[hash].mjs`;
  if (moduleIds.some(module => path.resolve(module) === mainModule)) return 'chunks/open-flags-[hash].mjs';
  return 'chunks/[name]-[hash].mjs';
}

export default defineConfig({
  // The ISO, name and i18n tables ship as JSON.parse('…') (faster to parse than object literals); the
  // package only uses default imports of JSON.
  json: { namedExports: false, stringify: true },
  plugins: [
    {
      name: 'open-flags:registering-modules',
      transform: {
        filter: { id: registeringModules },
        handler: () => ({ moduleSideEffects: true }),
      },
    },
  ],
  build: {
    // Library mode inlines every SVG as a data URI. ESM only: a second format would duplicate all of the
    // artwork. Each flag stays its own chunk (flags/index.ts imports every one lazily). dist/index.mjs pulls in
    // no artwork at all, dist/national.mjs the 238 national flags, dist/countries/<CC>.mjs one country.
    lib: {
      entry: {
        index: path.resolve(__dirname, 'src/index.ts'),
        national: path.resolve(__dirname, 'src/national.ts'),
        all: path.resolve(__dirname, 'src/all.ts'),
        ...countryEntries,
      },
      formats: ['es'],
      fileName: (_format, entryName) => `${entryName}.mjs`,
    },
    rolldownOptions: {
      output: {
        chunkFileNames: chunk => chunkFileName(chunk.moduleIds),
      },
    },
    reportCompressedSize: false, // gzipping ~4,000 chunks of artwork takes longer than the build
  },
});
