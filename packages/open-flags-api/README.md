# open-flags-api

`open-flags-api` streamlines the [Open Flags API](https://api.openflags.net). It turns ISO 3166 codes and place names into flag, coat of arms and PNG URLs. Polyfills are resolved against what the API actually serves. It also gives you English, Spanish and Chinese names, an offline search, and a small typed client for the API's JSON endpoints.

The package depends entirely on the API and bundles no artwork. It complements [`open-flags`](https://www.npmjs.com/package/open-flags), which bundles every SVG for offline use. Both packages take the same inputs, so you can switch between them.

- No runtime dependencies. Builds: ESM, CommonJS and UMD (global `OpenFlagsApi`). TypeScript types included.
- Node >= 18 (the client uses the global `fetch`) and every modern browser.

## Installation

```sh
npm install open-flags-api
```
or yarn
```sh
yarn add open-flags-api
```

## Quick start

```js
import { getFlagUrl, getCoatOfArmsUrl, getPngUrl } from 'open-flags-api';

getFlagUrl('US');                       // https://api.openflags.net/flags/US/flag.svg
getFlagUrl('US', 'CA');                 // https://api.openflags.net/flags/US/US-CA/flag.svg
getFlagUrl('US-CA');                    // same
getFlagUrl('usa', 'california');        // same (open-flags 0.0.5 names)
getFlagUrl('Estados Unidos', 'California');
getFlagUrl('美国', '加利福尼亚州', { locale: 'zh-CN' });

getCoatOfArmsUrl('MX', 'BCS');          // https://api.openflags.net/flags/MX/MX-BCS/coat.svg
getPngUrl('US-CA', null, { size: 256 }); // https://api.openflags.net/api/v1/flags/US-CA/png?variant=flag&size=256
```

Use the URLs anywhere an image URL works:

```jsx
<img src={getFlagUrl('FR', 'IDF')} alt="Île-de-France" />
```

CommonJS:

```js
const { getFlagUrl } = require('open-flags-api');
```

In the browser without a bundler:

```html
<script src="https://unpkg.com/open-flags-api"></script>
<script>
  document.querySelector('img').src = OpenFlagsApi.getFlagUrl('JP', '13');
</script>
```

## What you can pass

These are the same inputs `open-flags` accepts. They are case-insensitive and trimmed:

| Input | Example |
|---|---|
| ISO 3166-2 pair or code | `('US', 'CA')`, `('US-CA')`, `('us_ca')` |
| ISO 3166-1 country | `('US')`, `('US', null)` |
| open-flags 0.0.5 names | `('usa', 'california')`, `('brazil', 'acre')` |
| Names in en / es / zh-CN / zh-TW | `('United States', 'California')`, `('España', 'Cataluña')`, `('美國', '加利福尼亞州', { locale: 'zh-TW' })` |
| A subdivision name on its own | `('California')` |

Options (`FlagOptions`):

- `variant`: `'flag'` (default) or `'coat'`.
- `polyfill`: default `true`. See below.
- `locale`: the locale tried first when a name is looked up.

## Polyfills

Many subdivisions have no flag of their own on the API. For such a code the URL points at the nearest artwork that does exist:

- a parent region that has a flag (`polyfill: 'regional'`), for example FR-13 Bouches-du-Rhône gets FR-PAC Provence-Alpes-Côte d'Azur;
- otherwise the national flag (`polyfill: 'national'`), for example AF-BDS Badakhshān gets AF.

Polyfills are worked out from what **the API** serves. They can differ from `open-flags`, which bundles some artwork the API lacks. For example, GB-BIR Birmingham gets England's flag here and its own flag in `open-flags`. Pass `{ polyfill: false }` to treat polyfilled codes as missing. `resolveFlag()` tells you what will be served:

```js
import { resolveFlag } from 'open-flags-api';

resolveFlag('FR-13');
// { iso: 'FR-13', key: 'FR/PAC', resolvedIso: 'FR-PAC', variant: 'flag', polyfill: 'regional', status: 'current' }
```

`status` is `'withdrawn'` or `'user-assigned'` for codes that are not current ISO 3166 codes.

## Coats of arms

Use `getCoatOfArmsUrl(country, region?, options?)`, or `getFlagUrl(..., { variant: 'coat' })`. Coats of arms follow the same polyfill rules. Many places have no coat of arms on the API, and asking for one throws the not-found error.

Some open-flags 0.0.5 names pointed at a coat of arms, because that was the artwork the old package had. `('mexico', 'michoacán')` is one example. Such a name keeps meaning that artwork: it is served as-is when the API has it, whatever `variant` you ask for, and it is never polyfilled.

## PNG

`getPngUrl(country, region?, { size })` or `getFlagUrl(..., { format: 'png', size })` builds `/api/v1/flags/<ISO>/png?variant=flag|coat&size=<size>`.

- Sizes: 32, 64, 128 (default), 256 or 512. Any other size throws a `RangeError`.
- `size` is ignored for SVG URLs.

> **Note:** the `/api/v1/flags/<ISO>/png` route needs the Open Flags API release from 2026-09-22. As of 2026-10-01, api.openflags.net still runs the older build, where this route returns 404 and only the legacy `/flags-png/<CC>/<ISO>/flag.svg?size=<size>` route exists. Use SVG URLs until the API is redeployed.

## Other helpers

- `getFlagSvg(country, region?, options?)` has the same name as in `open-flags`, for drop-in use. It returns the SVG URL where `open-flags` returns a data URI. Both work as an `<img>` `src`.
- `getRandomFlagImageUrl()` returns `https://api.openflags.net/api/v1/flags/random/image`, a different random flag SVG on every request.

## Errors

- Input that matches nothing throws `Error('SVG not found for <country>-<region>')`, the same message as open-flags 0.0.5. A missing region is printed as `null`.
- The API only serves ISO 3166 flags and coats of arms. Extra flags such as `'CA-governor-general'` or `('england', 'bedfordshire')`, and alternate designs such as `US/GA-Classic`, throw an `Error` that names the artwork and points to `open-flags`.
- An invalid `variant`, `locale`, `format` or `size` throws a `RangeError`.

## Names and search (offline)

The name tables ship with the package, so these calls never touch the network:

```js
import { getName, getNames, getIsoCode, searchFlags, setDefaultLocale, locales } from 'open-flags-api';

locales;                                    // ['en', 'es', 'zh-CN', 'zh-TW']
getName('US-CA', 'zh-TW');                  // '加利福尼亞州'
getNames('US');                             // { en: 'United States', es: 'Estados Unidos', 'zh-CN': '美国', 'zh-TW': '美國' }
getIsoCode('Cataluña', { locale: 'es' });   // 'ES-CT'
getIsoCode('Georgia', { country: 'US' });   // 'US-GA'
searchFlags('california', { limit: 3 });
// [{ iso: 'US-CA', name: 'California', country: 'US', matched: 'California', score: 6 }, ...]
setDefaultLocale('es');                     // at runtime, aliases such as 'zh-Hant' or 'es-MX' work too
```

- **Name fallbacks:** zh-TW → zh-CN → en, zh-CN → en, es → en.
- **`searchFlags()` matches:** it searches ISO codes, names in every locale, English aliases, and the country's names, case- and accent-insensitively. A match on a country name also returns that country's subdivisions.
- **`searchFlags()` coverage:** it covers every code the API has artwork for, directly or through a polyfill.
- **Separate state:** `setDefaultLocale()` here does not change the default locale of `open-flags`, and the reverse is also true.

## API client

```js
import { createClient, OpenFlagsApiError } from 'open-flags-api';

const client = createClient({ apiKey: process.env.OPEN_FLAGS_API_KEY }); // every option is optional

const { data, meta } = await client.listFlags({ page: 1, pageSize: 50 });
const california = await client.getFlag('US-CA');
// california.flag.svg === 'US/US-CA/flag.svg', a path below https://api.openflags.net/flags/

try {
  await client.getFlag('XX-XX');
} catch (error) {
  if (error instanceof OpenFlagsApiError) {
    console.log(error.status, error.body); // 404 { error: 'Flag not found' }
  }
}
```

| Method | Request | Resolves to |
|---|---|---|
| `health()` | `GET /api/v1/health` | `{ status, timestamp, version, checks? }` |
| `listFlags({ page, pageSize })` | `GET /api/v1/flags?page=&page_size=` | `{ data: ApiFlag[], meta }` (`pageSize` default 20, max 100) |
| `getFlag(iso)` | `GET /api/v1/flags/:iso_code` | `ApiFlag` |
| `randomFlag()` | `GET /api/v1/flags/random` | `ApiFlag` |
| `search(q)` | `GET /api/v1/search?q=` | `{ data: ApiFlag[], count }` |
| `countryFlags(iso)` | `GET /api/v1/countries/:iso/flags` | `{ data: ApiFlag[], count }` |
| `languages()` | `GET /api/v1/languages` | `[{ code, name, native }]` |
| `translations(lang)` | `GET /api/v1/translations/:lang` | The API's i18n file for that language |

Options for `createClient({ baseUrl, apiKey, fetch })`:

- `baseUrl` defaults to the base URL set with `configure()`, read at request time.
- `apiKey` is sent as the `x-api-key` header. The API then rate-limits per key (100 requests per minute) instead of per IP address.
- `fetch` defaults to the global `fetch`. Pass your own for older runtimes or for tests.

**Errors.** Any non-2xx response rejects with an `OpenFlagsApiError` that has `status`, `url` and `body`. `body` is the parsed JSON, or the raw text when the response is not JSON. A 2xx response that is not JSON rejects the same way. Network errors from `fetch` are passed through unchanged.

**Input handling.** `getFlag()` and `countryFlags()` trim and upper-case the code. `translations()` accepts locale aliases (`'zh-Hant'` → `'zh-TW'`) and sends other tags unchanged.

**API behavior to know about:**

- `health()` rejects with status 503 while the API's flag cache is empty.
- `search('')` matches every flag. Use `searchFlags()` for local search.
- The API has no English translation file, so `translations('en')` returns 404. English names are built in: use `getName()`.

## Configuration

```js
import { configure } from 'open-flags-api';

configure({ baseUrl: 'https://flags.example.com' }); // a self-hosted API or a proxy
configure({ baseUrl: '' });                          // root-relative URLs (/flags/US/flag.svg)
configure({});                                       // back to https://api.openflags.net
```

`configure()` changes the base URL for every URL builder, and for every client created without its own `baseUrl`. Trailing slashes are trimmed.

## TypeScript

Types ship with the package and work with every `moduleResolution` mode (`node16`/`nodenext`, `bundler` and `node`):

- Core types: `FlagOptions`, `FlagVariant`, `PolyfillLevel`, `IsoStatus`, `ResolvedFlag`, `Locale`, `SearchOptions`, `SearchResult`, `IsoCodeOptions`, `IsoLocation`, `IsoMapping`.
- URL options: `FlagUrlOptions`, `CoatOfArmsUrlOptions`, `PngUrlOptions`, `PngSize`, `ImageFormat`, `ConfigureOptions`.
- Client: `ClientOptions`, `OpenFlagsClient`, `ListFlagsOptions`, `FetchLike`.
- API responses: `ApiFlag`, `ApiArtwork`, `ApiFlagPage`, `ApiPageMeta`, `ApiFlagResults`, `ApiHealth`, `ApiLanguage`, `ApiTranslations`.

## Bundle size

The code itself is about 12 KB minified. The rest of each build is data the package bundles: the en / es / zh-CN / zh-TW name tables, the name and legacy-name mapping, and the maps of what the API serves. That comes to about 1 MB minified, or 220 KB gzipped.

The ESM build is tree-shakeable, so your bundle only keeps what you import:

| You import | What your bundle keeps |
|---|---|
| `createClient` only | about 3 KB |
| `getName` / `getIsoCode` | the name tables, about 300 KB (125 KB gzipped) |
| The URL builders | everything |

## Known limitations

- Extra flags and alternate designs are only in `open-flags` (see Errors).
- 14 country codes have no national flag artwork (BV, CS, EH, GF, GS, HM, IO, LS, SH, SJ, SZ, TF, WF, YU, including current Lesotho and Eswatini). These codes, and their subdivisions that have no artwork of their own, cannot be resolved.
- zh-TW names cover 789 subdivisions. The rest fall back to zh-CN, then English.
- What the API serves is fixed when the package is built. As of 2026-10-01, the national coats of arms of KY, SX, VG and VI return 404 on api.openflags.net, because production still stores them under an older path. They work once the API is redeployed.

## Documentation

Visit [Open Flags Docs](https://docs.openflags.net/) for the API documentation.

## License

GPL-3.0-only
