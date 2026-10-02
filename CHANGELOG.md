# Changelog

## open-flags 0.1.0 — unreleased

### Added

- Every flag and coat of arms from the Open Flags API: 3,804 keys (238 national flags, 5 national coats of
  arms, 1,810 subdivision flags, 1,712 subdivision coats of arms, 13 variants, 26 extras), up from 346 SVGs.
- ISO 3166 keys everywhere (`US`, `US/CA`, `US/CA-COA`), finishing the migration started on
  `adding-iso-map-and-search`.
- Polyfills: a code without a flag of its own resolves to the nearest parent subdivision's flag, then the
  national flag (`resolveFlag()` reports which). `{ polyfill: false }` opts out.
- Code splitting: every flag is its own lazily loaded chunk. `loadFlagSvg()`, `loadCoatOfArmsSvg()`,
  `preloadCountry()`, `isFlagLoaded()`.
- Entry points for synchronous use: `open-flags/national`, `open-flags/countries/<CC>`, `open-flags/all`.
- Names in `en`, `es`, `zh-CN` and `zh-TW` with locale switching: `getName()`, `getNames()`, `getIsoCode()`,
  `setDefaultLocale()`, `locales`. Inputs may be names in any of these locales.
- `searchFlags()`: case- and accent-insensitive search over ISO codes, names and aliases, like the API's search.
- `getCoatOfArmsSvg()`, `resolveFlag()`, TypeScript declarations for every entry point.
- Tooling: `scripts/update-iso-data.ts` (ISO data and translations), `scripts/import-api-flags.ts`
  (artwork import with SVGO), an extended `scripts/generateFlagMap.ts`.

### Changed (breaking)

- `getFlagSvg()` is synchronous only for flags that are loaded or bundled by an entry point; otherwise it
  throws an error that names what to import. The main entry bundles no artwork.
- Keys are ISO codes. 0.0.5 names (`getFlagSvg('usa', 'california')`) still resolve, to the same artwork as
  before, except: 10 Mexican states now return their real flag instead of their coat of arms; Busan, Gangwon,
  Gyeonggi, North Chungcheong, North Jeolla, Papua and Penza return their current flag (the superseded designs
  are variants such as `KR/26-pre-2023`); Yukon is `CA/YT` (the ISO branch had filed it as `CA/YK`).
- ESM only (`dist/*.mjs`), Node 20.19 or newer. The UMD build is removed.
- `getFlagsByCountry()` matches the exact country code; `getAllFlags()` returns a copy.

### Fixed

- Published type declarations (0.0.5 pointed `types` at a file the build never produced).
- `package.json` repository, bugs and homepage point at this repository and docs.openflags.net.

### Removed

- `iso-3166-2` runtime dependency (the package now has none), `@types/iso-3166-2`, `jest-transform-stub`.
- `scripts/convert-svg-names-to-iso.ts` (hard-coded to one folder; the migration it served is done) and the
  unused `tsconfig.esm.json`.

### Maintenance

- TypeScript 5.9, ts-jest 29.4, Vite 8 declared as a devDependency (it was used but never listed),
  `npm audit`: 0 findings (was 9).
- `.gitattributes` pins LF for artwork, generated files and data so builds are identical on every OS.

## open-flags-api 0.1.0 — unreleased

First release. A client for the Open Flags API that shares the ISO core with `open-flags`: flag, coat of arms
and PNG URLs with polyfills resolved against what the API serves, the same inputs and name lookup, and a typed
client for the API's endpoints. See [packages/open-flags-api/README.md](packages/open-flags-api/README.md).

## open-flags 0.0.5 — 2024-07-24

Last release from the original named-folder layout.
