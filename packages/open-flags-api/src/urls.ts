/**
 * Flag, coat of arms and PNG URLs on the Open Flags API. Inputs are resolved like open-flags resolves them
 * (ISO codes, 0.0.5 legacy names, localized names), but against what the API serves:
 * src/generated/iso-mapping.json and iso-coa-mapping.json (generated from data/api-availability.json).
 */
import apiFlagMapping from './generated/iso-mapping.json';
import apiCoatMapping from './generated/iso-coa-mapping.json';
import namedMapping from '../../../src/named-mapping.json';
import { createResolver, isExtraKey } from '../../../src/core/iso';
import type { FlagResolver } from '../../../src/core/iso';
import { createSearch } from '../../../src/core/search';
import type { FlagOptions, IsoMapping, ResolvedFlag, SearchOptions, SearchResult } from '../../../src/core/types';
import { getBaseUrl } from './config';
import type { CoatOfArmsUrlOptions, FlagUrlOptions, PngSize, PngUrlOptions } from './types';

const flagMapping = apiFlagMapping as IsoMapping;
const coatMapping = apiCoatMapping as IsoMapping;
const named = namedMapping as IsoMapping;

const PNG_SIZES: readonly PngSize[] = [32, 64, 128, 256, 512];
const DEFAULT_PNG_SIZE: PngSize = 128;

const own = (obj: object, key: string): boolean => Object.prototype.hasOwnProperty.call(obj, key);

let resolver: FlagResolver | undefined;

/** The core resolver bound to the API's mappings, created on first use. */
function apiResolver(): FlagResolver {
  if (!resolver) {
    resolver = createResolver({
      flag: flagMapping,
      coat: coatMapping,
      named,
      // The API serves no extras, but named-mapping.json names every one ('ENGLAND-BEDFORDSHIRE' ->
      // 'GB-bedfordshire'): knowing them lets ('CA-governor-general') get the "not served" error below
      // instead of "not found".
      extras: Object.values(named)
        .filter(location => location.subdivision === null && isExtraKey(location.country))
        .map(location => location.country),
    });
  }
  return resolver;
}

const search = /*#__PURE__*/ createSearch(flagMapping);

/**
 * The artwork the Open Flags API serves for a flag, from the same inputs as open-flags: ISO codes
 * (('US-CA'), ('US', 'CA'), ('US')), 0.0.5 legacy names ('usa', 'california') and localized names
 * ('Estados Unidos', 'California'). Polyfills (`polyfill: 'regional' | 'national'`) are resolved against
 * what the API has, so they can differ from open-flags'. Throws `SVG not found for …` when the API has
 * nothing for the input, and an Error naming the key for non-ISO artwork (extras such as
 * 'CA-governor-general', alternate designs such as 'US/GA-Classic'), which only the open-flags package bundles.
 */
export function resolveFlag(country: string, region?: string | null, options?: FlagOptions): ResolvedFlag {
  const resolved = apiResolver().resolve(country, region, options);
  if (resolved.resolvedIso === null) {
    throw new Error(
      `The Open Flags API does not serve '${resolved.key}': it only serves ISO 3166 flags and coats of arms ` +
        '(the open-flags package bundles this artwork)'
    );
  }
  // ISO codes resolve through the API's mappings, so their artwork is always served. A 0.0.5 legacy name
  // can point at artwork the API lacks ('germany', 'coa-germany' -> DE-COA): it is served as-is or not at all.
  const mapping = resolved.variant === 'coat' ? coatMapping : flagMapping;
  if (!own(mapping, resolved.resolvedIso) || mapping[resolved.resolvedIso].polyfill) {
    const input = `${country}-${region === undefined ? null : region}`;
    throw new Error(`SVG not found for ${input}: the Open Flags API does not serve ${resolved.key}`);
  }
  return resolved;
}

/** `${base}/flags/US/flag.svg`, `${base}/flags/US/US-CA/flag.svg`, `…/coat.svg` (the API's static files). */
function svgUrl(resolved: ResolvedFlag): string {
  const iso = resolved.resolvedIso as string;
  const dash = iso.indexOf('-');
  const country = encodeURIComponent(dash === -1 ? iso : iso.slice(0, dash));
  const dir = dash === -1 ? country : `${country}/${encodeURIComponent(iso)}`;
  return `${getBaseUrl()}/flags/${dir}/${resolved.variant === 'coat' ? 'coat' : 'flag'}.svg`;
}

/** `${base}/api/v1/flags/US-CA/png?variant=flag&size=128` (needs the API release from 2026-09-22). */
function pngUrl(resolved: ResolvedFlag, size: PngSize): string {
  const iso = encodeURIComponent(resolved.resolvedIso as string);
  return `${getBaseUrl()}/api/v1/flags/${iso}/png?variant=${resolved.variant}&size=${size}`;
}

function checkPngSize(size: unknown): PngSize {
  if (size === undefined) return DEFAULT_PNG_SIZE;
  if (!PNG_SIZES.includes(size as PngSize)) {
    throw new RangeError(`Unsupported PNG size ${String(size)}: expected one of ${PNG_SIZES.join(', ')}`);
  }
  return size as PngSize;
}

/**
 * URL of a flag (or, with `variant: 'coat'`, a coat of arms) on the Open Flags API: the SVG by default,
 * the PNG rendering with `format: 'png'` (`size` 32 | 64 | 128 | 256 | 512, default 128). The URL points at
 * the artwork resolveFlag() picks, so a polyfilled code gets its region's or country's artwork.
 */
export function getFlagUrl(country: string, region?: string | null, options?: FlagUrlOptions): string {
  const { format = 'svg', size, ...flagOptions } = options ?? {};
  if (format !== 'svg' && format !== 'png') {
    throw new RangeError(`Unknown format '${String(format)}': expected 'svg' or 'png'`);
  }
  const pngSize = format === 'png' ? checkPngSize(size) : undefined;
  const resolved = resolveFlag(country, region, flagOptions);
  return pngSize === undefined ? svgUrl(resolved) : pngUrl(resolved, pngSize);
}

/** URL of a coat of arms: getFlagUrl() with `variant: 'coat'`. */
export function getCoatOfArmsUrl(country: string, region?: string | null, options?: CoatOfArmsUrlOptions): string {
  return getFlagUrl(country, region, { ...options, variant: 'coat' });
}

/** URL of the PNG rendering: getFlagUrl() with `format: 'png'`. */
export function getPngUrl(country: string, region?: string | null, options?: PngUrlOptions): string {
  return getFlagUrl(country, region, { ...options, format: 'png' });
}

/**
 * Drop-in for open-flags' getFlagSvg(): returns the URL of the SVG on the Open Flags API instead of a data
 * URI. Both work as an <img> src.
 */
export function getFlagSvg(country: string, region?: string | null, options?: FlagOptions): string {
  return getFlagUrl(country, region, { ...options, format: 'svg' });
}

/** `${base}/api/v1/flags/random/image`: a different random flag SVG on every request (sent uncached). */
export function getRandomFlagImageUrl(): string {
  return `${getBaseUrl()}/api/v1/flags/random/image`;
}

/**
 * Searches ISO codes by code, name (en, es, zh-CN, zh-TW) and alias, offline, like the API's search. Covers
 * every code the API serves artwork for, directly or through a polyfill. Use createClient().search() for
 * the API's own search.
 */
export function searchFlags(term: string, options?: SearchOptions): SearchResult[] {
  return search(term, options);
}
