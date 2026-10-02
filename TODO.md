# TODO

Planned work for `open-flags` and `open-flags-api` after 0.1.0. Numbers are from 2026-10-01.

## Release

- [ ] Decide the published names. `open-flags-api` and `@open-flags/*` were free on npm on 2026-10-01; a scope
      needs an npm org.
- [ ] Do a real `npm publish --dry-run` of `open-flags` (149 MB tarball, 583 MB unpacked, 4,063 files) and
      confirm the registry accepts it. jsDelivr and unpkg will not serve it: jsDelivr's 150 MB limit already
      refuses 0.0.5 (199 MB).
- [ ] CI on pull requests: `npm run gen:flags` must write 0 files, type-check, `npm test`, both builds.
- [ ] Release automation for the two packages (changesets or similar), tags and changelog.
- [ ] Deprecate 0.0.5 on npm with a pointer to the migration notes once 0.1.0 is out.
- [ ] Run the test suite on the lowest supported Node versions (20.19 for `open-flags`, 18 for
      `open-flags-api`); only Node 24.14 was used so far.

## open-flags: size and delivery

- [ ] Split the artwork into per-country or per-region packages so apps install only what they ship; today
      every install carries the whole corpus.
- [ ] Shrink the main entry's ~1.6 MB of mappings, name tables and the loader map (compact encoding, or load
      the name tables lazily).
- [ ] Consumer builds contain one chunk per flag (~3,800 files) even when an app loads a few; offer per-flag
      subpath imports (`open-flags/flags/US/CA`) for fully static, tree-shaken use without the loader map.
- [ ] Offer raw SVG markup as well as data URIs, for inline rendering.
- [ ] Check bundlers other than Vite 8 (webpack 5, esbuild, Next.js, Angular) with ~3,800 lazy chunks.
- [ ] The full build peaks around 4.5 GB RSS (rolldown); keep an eye on it as the corpus grows.

## open-flags-api

- [ ] PNG URLs use `/api/v1/flags/<ISO>/png`, which needs the Open Flags API release from 2026-09-22 in
      production (api.openflags.net still serves only `/flags-png/...`).
- [ ] Production also needs that redeploy for the national coats of arms of KY, SX, VG and VI (404 today).
- [ ] Load the name and mapping data lazily so URL-only users stay small (~222 kB gzip per format today,
      98% of it data).
- [ ] Generate response types from an OpenAPI description of the API instead of hand-written types.
- [ ] Retry, backoff and rate-limit awareness (the API allows 100 requests per minute per IP).

## Open Flags API data (in the API repository)

- [ ] Remove the 174 name-derived pseudo-codes (`data_source: "public"`, e.g. `US-GE`, `MX-AG`, `GB-BE`). They
      duplicate real entries; the packages skip them.
- [ ] Fix the 62 zh-TW names that use "乔" as a corruption placeholder (e.g. CY "乔浦路斯") and the AM alias
      "հայաdelays". The packages filter them out.
- [ ] Add national flags for the 14 codes without one: LS (Lesotho), SZ (Eswatini), EH, GF, SH, SJ, WF, BV, GS,
      HM, IO, TF, and the withdrawn CS and YU. These codes and their art-less subdivisions cannot resolve today.
- [ ] Some designs are still filed under withdrawn codes (`GB-CHS`, `GB-NTH`, `BA-01`...): keep them, or move
      them to a historic namespace.
- [ ] Expose subdivision parents and polyfill information from the API itself.

## Artwork

- [ ] License audit. The artwork comes from Wikimedia Commons and flagcdn under mixed licenses (public domain,
      CC BY-SA, ...) while the packages are GPL-3.0-only. Record the source and license per file (the API's
      manifests have a `source` but no license).
- [ ] Visual regression check of the SVGO output by rendering before and after. 3,460 imported SVGs were
      optimized; 175 were kept as they were, including 5 that exceed SVGO's XML entity limit.
- [ ] Optimize the 346 SVGs that were already in the package (left untouched) once visual checks exist.
- [ ] Where the package's old art and the API's art cover the same ISO code, the old art was kept (289
      cases); review whether the API version is better.
- [ ] Curate the 26 extras and 13 variants (names, metadata such as the years a design was used).
- [ ] Simplified renditions for the heaviest files (TH/95 7.8 MB, RU/IN-COA 7.1 MB, GB/SWK-COA 6.0 MB).
- [ ] PNG renditions: the corpus has no PNG files; the API renders PNGs on request.

## i18n

- [ ] Traditional Chinese covers 789 of 5,170 subdivisions (the rest fall back to Simplified, then English):
      add curated zh-TW names or a conversion step.
- [ ] Spanish covers 3,599 subdivisions. Add more locales (fr, de, pt, ja, ko, ar, ...).
- [ ] Letters that do not decompose (ø, ł, đ, ß) are not folded in search, so "lodz" does not find "Łódź".
- [ ] Re-run `npm run data:iso` whenever the API's name files change, so the packages and the API agree.

## Ecosystem

- [ ] React, Vue and Angular components built on `loadFlagSvg()`.
- [ ] Update docs.openflags.net (vitepress-docs) for 0.1.0 and add an `open-flags-api` page.
- [ ] Bring the Python (`open_flags_py`) and Hex (`hex_open_flags`) packages to the same ISO layout.
