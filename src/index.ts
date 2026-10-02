import { flagList, flagLoaders } from '../flags';
import isoMapping from './iso-mapping.json';
import coaMapping from './iso-coa-mapping.json';
import namedMapping from './named-mapping.json';
import { getCountryCode } from './core/i18n';
import { createResolver, isExtraKey } from './core/iso';
import { createSearch } from './core/search';
import type { FlagOptions, IsoMapping, ResolvedFlag } from './core/types';
import { getRegisteredFlag, isRegistered, registerFlags } from './registry';

export { locales, setDefaultLocale, getDefaultLocale, getName, getNames, getIsoCode } from './core/i18n';
export type {
  Locale,
  FlagVariant,
  PolyfillLevel,
  IsoStatus,
  IsoLocation,
  IsoMapping,
  FlagOptions,
  ResolvedFlag,
  SearchOptions,
  SearchResult,
  IsoCodeOptions,
  FlagTarget,
} from './core/types';

// This entry bundles no artwork: every flag is a lazily loaded chunk (loadFlagSvg). getFlagSvg() serves what
// is registered, by open-flags/national, open-flags/countries/<CC>, open-flags/all or an earlier load*() call.

/** A subdivision variant key, `<CC>/<SUB>-<variant>` with a variant other than COA: 'US/GA-Classic', 'KR/26-pre-2023'. */
const isVariantKey = (key: string): boolean => /^[A-Z]{2}\/[^/-]+-(?!COA$)[^/]+$/.test(key);

const resolver = createResolver({
  flag: isoMapping as IsoMapping,
  coat: coaMapping as IsoMapping,
  named: namedMapping as IsoMapping,
  // Keys no ISO code names, served as-is: extras ('CA-governor-general') and variants ('US/GA-Classic').
  extras: flagList.filter(key => isExtraKey(key) || isVariantKey(key)),
});

/** Searches every ISO code with local artwork (its own or a polyfill) by code, name in any locale or alias. */
export const searchFlags = createSearch(isoMapping as IsoMapping);

/** The 0.0.5 error for input that names nothing (a missing region is printed as `null`). */
function notFound(country: string, region?: string | null): Error {
  return new Error(`SVG not found for ${country}-${region === undefined ? null : region}`);
}

/** The error for a flag that exists but is neither loaded nor bundled. */
function notLoaded(key: string): Error {
  const cc = /^[A-Z]{2}(?=$|[/-])/.exec(key)?.[0];
  const national = /^[A-Z]{2}$/.test(key) ? `'open-flags/national', ` : '';
  const bundles = cc ? `${national}'open-flags/countries/${cc}' or 'open-flags/all'` : `'open-flags/all'`;
  return new Error(
    `Flag '${key}' is not loaded: load it with loadFlagSvg() first, or import ${bundles} to make it available synchronously`
  );
}

/** Registers and returns the artwork of a flag key, importing its chunk unless it is registered already. */
async function loadKey(key: string): Promise<string> {
  const registered = getRegisteredFlag(key);
  if (registered !== undefined) return registered;
  const svg = (await flagLoaders[key]()).default;
  registerFlags({ [key]: svg });
  return svg;
}

/** Flag keys of a country code: the national flag, its subdivisions (`CC/…`), coat of arms and extras (`CC-…`). */
function countryKeys(cc: string): string[] {
  return flagList.filter(key => key === cc || key.startsWith(`${cc}/`) || key.startsWith(`${cc}-`));
}

/**
 * The SVG of a flag as a data URI, synchronously. Accepts ISO codes ('US', 'CA' or 'US-CA'), extras
 * ('CA-governor-general'), 0.0.5 names ('usa', 'california') and localized names ('Estados Unidos',
 * 'California'). A code without artwork of its own gets its region's or country's flag unless
 * `polyfill: false`. National flags are always available; other flags must be loaded first (loadFlagSvg(),
 * preloadCountry()) or bundled (import 'open-flags/countries/<CC>' or 'open-flags/all').
 */
export function getFlagSvg(country: string, region?: string | null, options?: FlagOptions): string {
  const { key } = resolver.resolve(country, region, options);
  const svg = getRegisteredFlag(key);
  if (svg === undefined) throw notLoaded(key);
  return svg;
}

/** Like getFlagSvg(), but loads the flag (its own chunk) first when it is not available yet. */
export async function loadFlagSvg(country: string, region?: string | null, options?: FlagOptions): Promise<string> {
  return loadKey(resolver.resolve(country, region, options).key);
}

/** getFlagSvg() for coats of arms. */
export function getCoatOfArmsSvg(country: string, region?: string | null, options?: FlagOptions): string {
  return getFlagSvg(country, region, { ...options, variant: 'coat' });
}

/** loadFlagSvg() for coats of arms. */
export function loadCoatOfArmsSvg(country: string, region?: string | null, options?: FlagOptions): Promise<string> {
  return loadFlagSvg(country, region, { ...options, variant: 'coat' });
}

/** Loads every flag of a country (ISO code, name in any locale or alias) so getFlagSvg() serves them synchronously. */
export async function preloadCountry(country: string): Promise<void> {
  const cc = getCountryCode(country);
  if (!cc) throw notFound(country);
  await Promise.all(countryKeys(cc).map(loadKey));
}

/** Whether getFlagSvg() can serve this flag right now; false for input that names nothing. */
export function isFlagLoaded(country: string, region?: string | null, options?: FlagOptions): boolean {
  let key: string;
  try {
    key = resolver.resolve(country, region, options).key;
  } catch (err) {
    if (err instanceof RangeError) throw err; // invalid options
    return false;
  }
  return isRegistered(key);
}

/** What getFlagSvg() would serve: the artwork key, the ISO codes involved, variant, polyfill level and status. */
export function resolveFlag(country: string, region?: string | null, options?: FlagOptions): ResolvedFlag {
  return resolver.resolve(country, region, options);
}

/** Every flag key, e.g. 'US', 'US/CA', 'US/CA-COA', 'CA-governor-general'. */
export function getAllFlags(): string[] {
  return flagList.slice();
}

/** Flag keys of a country (ISO code, name in any locale or alias): `CC`, `CC/…` and `CC-…`; [] when unknown. */
export function getFlagsByCountry(country: string): string[] {
  const cc = getCountryCode(country);
  return cc ? countryKeys(cc) : [];
}
