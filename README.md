# Open Flags

Flags and coats of arms for every country and ISO 3166-2 subdivision, keyed by ISO codes, with polyfills for
codes that have no artwork of their own and names in English, Spanish and Chinese.

This repository publishes two packages that share one ISO core:

| Package | Images come from | Install size | Use it when |
|---|---|---|---|
| [`open-flags`](#open-flags-local) | SVGs bundled in the package, as data URIs | ~149 MB tarball | you want everything local and offline, loading only the flags your code asks for |
| [`open-flags-api`](packages/open-flags-api/README.md) | the [Open Flags API](https://api.openflags.net) | ~0.7 MB tarball | you want a tiny dependency and are happy to load images from the API |

Both packages accept the same inputs (ISO codes, names in any supported locale, 0.0.5 names), apply the same
polyfills and expose the same name lookup and search, so you can switch between them.

Documentation: [docs.openflags.net](https://docs.openflags.net/implementations/npm/)

## open-flags (local)

### Installation

```sh
npm install open-flags
```

ESM only. Node 20.19 or newer (`require('open-flags')` works through `require(esm)`).

### Quick start

```js
import { loadFlagSvg, getFlagSvg } from 'open-flags';

const svg = await loadFlagSvg('US', 'CA'); // loads one chunk, returns a data:image/svg+xml URI
img.src = svg;

getFlagSvg('US', 'CA'); // synchronous from now on
```

### Choose how much gets bundled

Every flag is its own lazily loaded chunk. The main entry bundles no artwork at all; import an extra entry when
you want flags available synchronously.

| Import | `getFlagSvg()` works synchronously for | Loaded up front |
|---|---|---|
| `open-flags` | flags you already loaded with `loadFlagSvg()` | code and name data only (~1.6 MB) |
| `open-flags/national` | every national flag (238) | ~5.6 MB |
| `open-flags/countries/US` | one country: its flag, coat of arms, subdivisions, variants and extras | depends on the country (US ~20 MB) |
| `open-flags/all` | all 3,804 flags | ~556 MB, not meant for browsers |

```js
import { getFlagSvg } from 'open-flags/national';
getFlagSvg('JP'); // country flags without awaiting

import 'open-flags/countries/MX';
getFlagSvg('MX', 'CHH'); // every Mexican flag, synchronously
```

`getFlagSvg()` throws a message naming the entry to import, or `loadFlagSvg()`, when a flag exists but is not
loaded yet. Bundlers emit one small chunk per flag into your build output (about 3,800 files); a browser only
downloads the ones you load. `preloadCountry('FR')` loads one country on demand.

### What you can pass

```js
getFlagSvg('US', 'CA');                                 // ISO 3166-1 + subdivision suffix
getFlagSvg('US-CA');                                    // full ISO 3166-2 code
getFlagSvg('US');                                       // national flag
getFlagSvg('Estados Unidos', 'California');             // names in any supported locale
getFlagSvg('美国', '加利福尼亚州', { locale: 'zh-CN' });
getFlagSvg('usa', 'california');                        // 0.0.5 names still work
getFlagSvg('CA-governor-general');                      // extras: flags with no ISO code of their own
getFlagSvg('US', 'GA-Classic');                         // variants: alternate or superseded designs
```

`getAllFlags()` lists every key (`'US/CA'`, `'DE-COA'`, `'KR/26-pre-2023'`, ...) and `getFlagsByCountry('MH')`
returns `['MH', 'MH/L', 'MH/MAJ']`.

### Polyfills

5,394 ISO codes resolve to artwork. When a code has no flag of its own, the nearest parent subdivision with a
flag is used (regional polyfill), then the country flag (national polyfill):

```js
resolveFlag('FR-01');   // { key: 'FR/01', polyfill: null, ... }           own flag
resolveFlag('AZ-BAB');  // { key: 'AZ/NX', polyfill: 'regional', ... }      Nakhchivan's flag
resolveFlag('AD', '02');// { key: 'AD',    polyfill: 'national', ... }      Andorra's flag

getFlagSvg('AZ', 'BAB', { polyfill: false }); // throws instead of polyfilling
```

Of the 5,394 codes, 2,048 have their own flag, 445 use a regional polyfill and 2,901 the national flag.
Withdrawn and user-assigned codes the Open Flags API has artwork for are included and report
`status: 'withdrawn'` or `'user-assigned'` (`BA-01`, `FR-B`, `XK`).

### Coats of arms

```js
await loadCoatOfArmsSvg('DE', 'BY');
getCoatOfArmsSvg('DE', 'BY');
getFlagSvg('DE', 'BY', { variant: 'coat' }); // same thing
```

1,717 codes have their own coat of arms; 293 more use a parent's.

### Names, locales and search

Supported locales: `en`, `es`, `zh-CN`, `zh-TW`. Switch with one key, per call or as the default:

```js
getName('US-CA');            // 'California'
getName('US-CA', 'zh-CN');   // '加利福尼亚州'
getName('US-CA', 'zh-TW');   // '加利福尼亞州'
getName('DE-BY', 'es');      // 'Baviera'

setDefaultLocale('es');
getName('MX-CMX');           // 'Ciudad de México'

getIsoCode('Baviera');                           // 'DE-BY'
getIsoCode('巴伐利亚', { locale: 'zh-CN' });       // 'DE-BY'
getIsoCode('California', { country: 'US' });     // 'US-CA'

searchFlags('calif', { limit: 3 });
// [{ iso: 'US-CA', name: 'California', ... }, { iso: 'MX-BCN', ... }, { iso: 'MX-BCS', ... }]
searchFlags('加利福', { locale: 'zh-CN' });
```

Search works like the Open Flags API's search: case- and accent-insensitive, across ISO codes, names in every
locale and aliases ("golden state"). A missing name falls back `zh-TW` -> `zh-CN` -> `en` and `es` -> `en`.
Locale aliases such as `zh`, `zh-Hant` or `es-MX` are accepted.

### Migrating from 0.0.5

- Keys are ISO codes: `'US/CA'` instead of `'usa/california'`. The 0.0.5 names still resolve, to the same
  artwork as before, except where a subdivision now has a real flag instead of the coat of arms 0.0.5 served
  (10 Mexican states), or a superseded design was replaced by the current one (5 South Korean provinces,
  Papua, Penza). The old designs remain available as variants, e.g. `KR/26-pre-2023`.
- `getFlagSvg()` is synchronous only for loaded flags: call `loadFlagSvg()` once, or import
  `open-flags/national`, `open-flags/countries/<CC>` or `open-flags/all`.
- ESM only (`dist/*.mjs`); the UMD build is gone. Node 20.19 or newer.
- `getFlagsByCountry()` matches the exact country code (`'C'` no longer matches `'CA'` and `'CH'`).
- Unknown input still throws `SVG not found for <country>-<region>`.

## open-flags-api

```js
import { getFlagUrl, getPngUrl, createClient } from 'open-flags-api';

getFlagUrl('US', 'CA');                  // https://api.openflags.net/flags/US/US-CA/flag.svg
getFlagUrl('AD', '02');                  // polyfilled: https://api.openflags.net/flags/AD/flag.svg
getPngUrl('FR-01', null, { size: 256 }); // .../api/v1/flags/FR-01/png?variant=flag&size=256

const api = createClient();
await api.search('california');
```

See [packages/open-flags-api/README.md](packages/open-flags-api/README.md).

## Data and artwork

- 3,804 keys: 238 national flags, 5 national coats of arms, 1,810 subdivision flags, 1,712 subdivision coats of
  arms, 13 variants and 26 extras.
- Artwork comes from the Open Flags API corpus (Wikimedia Commons, flagcdn) and the SVGs that were already in
  this package. Imported SVGs are optimized with SVGO; files it could not shrink are kept as they were.
- ISO 3166 codes, subdivision parents and translations come from
  [Debian iso-codes](https://salsa.debian.org/iso-codes-team/iso-codes) (LGPL-2.1-or-later), with the Open Flags
  API's own names preferred.

File layout under `flags/` (a key is the path without `.svg`):

| File | Key | Meaning |
|---|---|---|
| `flags/US.svg` | `US` | national flag |
| `flags/DE-COA.svg` | `DE-COA` | national coat of arms |
| `flags/US/CA.svg` | `US/CA` | flag of ISO 3166-2 `US-CA` |
| `flags/US/CA-COA.svg` | `US/CA-COA` | its coat of arms |
| `flags/US/GA-Classic.svg` | `US/GA-Classic` | a variant of a subdivision flag |
| `flags/CA-governor-general.svg` | `CA-governor-general` | an extra with no ISO code |

Cornwall is stored as `flags/GB/CON_.svg` because Windows reserves `CON` as a file name; its key is `GB/CON`.

## Development

Node 20.19 or newer; the full build needs about 6 GB of RAM.

| Command | What it does |
|---|---|
| `npm run build` | regenerate, build `open-flags` with Vite, emit declarations |
| `npm run build:api` | build `open-flags-api` |
| `npm test` | tests for both packages |
| `npm run gen:flags` | regenerate `flags/index.ts`, `src/generated/**`, the mappings and name tables from `flags/` and `data/` |
| `npm run data:iso` | refresh `data/iso-codes.json` from Debian iso-codes and the API repo's names |
| `npm run import:api-flags` | import new artwork from the API repo into `flags/` |

See [TODO.md](TODO.md) for planned work.

## License

GPL-3.0-only. The artwork's own licenses vary by file (see TODO.md).
