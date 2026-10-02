// Package metadata the build and its consumers rely on.
import fs from 'fs';
import path from 'path';
import pkg from '../package.json';

const entry = (file: string, types: string) => ({ types, import: file, default: file });

describe('package.json', () => {
  test('no runtime dependencies', () => {
    expect(pkg).not.toHaveProperty('dependencies');
    expect(pkg).not.toHaveProperty('peerDependencies');
    expect(pkg).not.toHaveProperty('optionalDependencies');
  });

  test('ESM entry points with types', () => {
    expect(pkg.exports).toEqual({
      '.': entry('./dist/index.mjs', './dist/types/src/index.d.ts'),
      './national': entry('./dist/national.mjs', './dist/types/src/index.d.ts'),
      './all': entry('./dist/all.mjs', './dist/types/src/index.d.ts'),
      './countries/*': entry('./dist/countries/*.mjs', './dist/types/src/countries.d.ts'),
      './package.json': './package.json',
    });
    expect([pkg.main, pkg.module, pkg.types]).toEqual(['./dist/index.mjs', './dist/index.mjs', './dist/types/src/index.d.ts']);
    // moduleResolution "node" (node10) ignores exports: typesVersions points the subpaths at the same types
    expect(pkg.typesVersions['*']).toEqual({
      national: [pkg.exports['./national'].types],
      all: [pkg.exports['./all'].types],
      'countries/*': [pkg.exports['./countries/*'].types],
    });
  });

  test('the registering entry points are side effects, the main entry and the chunks are not', () => {
    expect(pkg.sideEffects).toEqual(['./dist/countries/*.mjs', './dist/national.mjs', './dist/all.mjs']);
    expect(pkg.files).toEqual(['dist', 'README.md']);
  });

  test('the one-off name conversion script is gone', () => {
    expect(pkg.scripts).not.toHaveProperty('gen:convert-names');
    expect(fs.existsSync(path.join(__dirname, '../scripts/convert-svg-names-to-iso.ts'))).toBe(false);
  });
});
