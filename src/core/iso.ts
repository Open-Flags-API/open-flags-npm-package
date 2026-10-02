/**
 * Turns the many ways of naming a flag (ISO codes, extras, 0.0.5 legacy names, localized names) into the
 * artwork to serve. Each package binds its own mappings with createResolver().
 */
import { findIsoCodes, getName, listIsoCodes, resolveLocale } from './i18n';
import { normalizeIso } from './normalize';
import type { FlagOptions, FlagTarget, FlagVariant, IsoLocation, IsoMapping, IsoStatus, ResolvedFlag } from './types';

export interface ResolverConfig {
  flag: IsoMapping; // ISO code -> flag artwork (an iso-mapping.json)
  coat: IsoMapping; // ISO code -> coat of arms artwork (an iso-coa-mapping.json)
  named: IsoMapping; // named-mapping.json: upper-case English names and 0.0.5 legacy names -> location
  extras?: Iterable<string>; // non-ISO artwork keys served as-is, e.g. 'CA-governor-general'
}

export interface FlagResolver {
  /** The canonical target for an input; throws the 0.0.5 `SVG not found for …` error when nothing matches. */
  parse(country: string, region?: string | null, options?: FlagOptions): FlagTarget;
  /** The artwork to serve, from the variant's mapping; throws `SVG not found for …` when there is none. */
  resolve(country: string, region?: string | null, options?: FlagOptions): ResolvedFlag;
}

const COUNTRY_CODE = /^[A-Z]{2}$/;
const isCountryCode = (code: string): boolean => COUNTRY_CODE.test(code);
const own = (obj: object, key: string): boolean => Object.prototype.hasOwnProperty.call(obj, key);

/** Key of the artwork at a location: 'US/CA' / 'US' for flags, 'US/CA-COA' / 'DE-COA' for coats of arms. */
export function artworkKey(location: IsoLocation, variant: FlagVariant = 'flag'): string {
  const key = location.subdivision != null ? `${location.country}/${location.subdivision}` : location.country;
  return variant === 'coat' ? `${key}-COA` : key;
}

/** True for an extra flag key (top-level `<CC>-<slug>`, slug other than COA), e.g. 'CA-governor-general'. */
export function isExtraKey(key: string): boolean {
  const m = /^[A-Z]{2}-([^/]+)$/.exec(key);
  return !!m && m[1] !== 'COA';
}

/** The 0.0.5 error message (a missing region is printed as `null`). */
function notFound(country: unknown, region: unknown): Error {
  return new Error(`SVG not found for ${country}-${region === undefined ? null : region}`);
}

/** Upper-case English name keys ('UNITED STATES-CALIFORNIA', 'MEXICO') -> ISO codes, built like named-mapping.json. */
let englishKeys: Map<string, string[]> | undefined;
function englishKeyIndex(): Map<string, string[]> {
  if (!englishKeys) {
    const index = new Map<string, string[]>();
    for (const code of listIsoCodes()) {
      const dash = code.indexOf('-');
      const countryName = getName(dash === -1 ? code : code.slice(0, dash), 'en');
      const name = getName(code, 'en');
      if (!countryName || !name) continue;
      const key = (dash === -1 ? countryName : `${countryName}-${name}`).toUpperCase();
      const codes = index.get(key);
      if (codes) codes.push(code);
      else index.set(key, [code]);
    }
    englishKeys = index;
  }
  return englishKeys;
}

function checkOptions(options: FlagOptions | undefined): FlagOptions {
  const { variant, polyfill, locale } = options ?? {};
  if (variant !== undefined && variant !== 'flag' && variant !== 'coat') {
    throw new RangeError(`Unknown variant '${variant}': expected 'flag' or 'coat'`);
  }
  return { variant, polyfill, locale: locale === undefined || locale === 'all' ? locale : resolveLocale(locale) };
}

/**
 * Binds the resolver to one package's mappings. Inputs (case-insensitive, trimmed), tried in this order:
 *   1. ISO code or pair: ('US-CA'), ('US', 'CA'), ('US'), ('US', null), ('US', 'US-CA')
 *   2. extras: ('CA-governor-general'), ('CA', 'governor-general')
 *   3. named-mapping.json keys `${country}-${region}`.toUpperCase() (or `${country}`): English names and
 *      0.0.5 legacy names ('usa', 'california'). A legacy name that points at a coat of arms or an extra
 *      ('mexico', 'michoacán' -> MX/MIC-COA) is an exact key, served as-is whatever the variant.
 *   4. localized names, via the i18n tables (requested locale first, then all, then English aliases): the
 *      country first, then the subdivision within it (by name, ISO suffix or full code);
 *      ('Estados Unidos', 'California'), ('美国', '加利福尼亚州', { locale: 'zh-CN' }). A name alone may
 *      also be a subdivision ('California').
 * Codes sharing a name are ranked like named-mapping.json ranks them: own artwork in the requested
 * variant's mapping, then current status, then code order (so 'Madrid' is ES-MD, not the province ES-M).
 */
export function createResolver(config: ResolverConfig): FlagResolver {
  const { flag, coat, named } = config;
  let extras: Map<string, string> | undefined;

  const isKnown = (code: string): boolean => own(flag, code) || own(coat, code) || getName(code, 'en') !== undefined;
  const isCountry = (code: string): boolean => isCountryCode(code) && isKnown(code);
  const entry = (mapping: IsoMapping, code: string): IsoLocation | undefined =>
    own(mapping, code) ? mapping[code] : undefined;

  const extraKey = (input: string): string | undefined => {
    if (!extras) {
      extras = new Map<string, string>();
      for (const key of config.extras ?? []) if (!extras.has(key.toLowerCase())) extras.set(key.toLowerCase(), key);
    }
    return extras.get(input.toLowerCase());
  };

  /** What an exact key shows: 'US/CA' -> flag of US-CA, 'MX/MIC-COA' -> coat of MX-MIC, 'DE-COA' -> coat of DE. */
  const keyArtwork = (key: string): { iso: string; variant: FlagVariant } | undefined => {
    const slash = key.indexOf('/');
    if (slash === -1) {
      if (isCountryCode(key)) return isKnown(key) ? { iso: key, variant: 'flag' } : undefined;
      const cc = key.slice(0, 2);
      return key === `${cc}-COA` && isCountry(cc) ? { iso: cc, variant: 'coat' } : undefined;
    }
    const cc = key.slice(0, slash);
    const base = key.slice(slash + 1);
    if (!isCountryCode(cc)) return undefined;
    const coatOf = base.endsWith('-COA') ? `${cc}-${base.slice(0, -'-COA'.length)}` : undefined;
    if (coatOf && isKnown(coatOf)) return { iso: coatOf, variant: 'coat' };
    return isKnown(`${cc}-${base}`) ? { iso: `${cc}-${base}`, variant: 'flag' } : undefined;
  };

  /** Own artwork first, then current status, then code order; codes the mapping lacks come last. */
  const best = (codes: readonly string[], mapping: IsoMapping): string | undefined => {
    let found: string | undefined;
    let rank = Infinity;
    for (const code of codes) {
      const loc = entry(mapping, code);
      const r = loc ? (loc.polyfill ? 2 : 0) + (loc.status ? 1 : 0) : 4;
      if (r < rank) {
        found = code;
        rank = r;
      }
    }
    return found;
  };

  const isoTarget = (iso: string): FlagTarget => {
    const dash = iso.indexOf('-');
    return { iso, country: dash === -1 ? iso : iso.slice(0, dash), key: null };
  };

  const exactTarget = (key: string): FlagTarget => ({
    iso: keyArtwork(key)?.iso ?? null,
    country: /^([A-Z]{2})(?=$|[/-])/.exec(key)?.[1] ?? null,
    key,
  });

  /** A named-mapping.json hit: an exact key (coat of arms, extra, other non-ISO key) or an ISO place. */
  const fromNamed = (namedKey: string, loc: IsoLocation, mapping: IsoMapping): FlagTarget | undefined => {
    const key = artworkKey(loc);
    const art = loc.polyfill ? undefined : keyArtwork(key);
    if (!loc.polyfill && (!art || art.variant === 'coat')) return exactTarget(key);
    // English names (polyfilled ones always are) are re-ranked for the requested variant; a legacy name
    // keeps the place it pointed at.
    const candidates = englishKeyIndex().get(namedKey);
    if (candidates && (!art || candidates.includes(art.iso))) {
      const hit = best(candidates, mapping);
      if (hit) return isoTarget(hit);
    }
    return art ? isoTarget(art.iso) : undefined;
  };

  /** The subdivision of country `cc` that `region` names as an ISO suffix ('CA') or full code ('US-CA'). */
  const isoSubdivision = (cc: string, region: string): string | undefined => {
    const prefix = `${cc}-`;
    const sub = normalizeIso(region);
    if (isKnown(prefix + sub)) return prefix + sub;
    return sub.startsWith(prefix) && isKnown(sub) ? sub : undefined;
  };

  const find = (country: unknown, region: unknown, options: FlagOptions): FlagTarget | undefined => {
    const c = country == null ? '' : String(country).trim();
    const r = region == null ? '' : String(region).trim();
    if (!c) return undefined;
    const mapping = options.variant === 'coat' ? coat : flag;
    const code = normalizeIso(c);

    // 1. ISO code or pair
    if (!r && isKnown(code)) return isoTarget(code);
    const isoSub = r && isCountry(code) ? isoSubdivision(code, r) : undefined;
    if (isoSub) return isoTarget(isoSub);

    // 2. extras
    const extra = r ? extraKey(`${c}-${r}`) ?? extraKey(`${c}/${r}`) : extraKey(c);
    if (extra) return exactTarget(extra);

    // 3. named-mapping.json: English names and 0.0.5 legacy names
    const namedKey = (r ? `${c}-${r}` : c).toUpperCase();
    if (own(named, namedKey)) {
      const target = fromNamed(namedKey, named[namedKey], mapping);
      if (target) return target;
    }

    // 4. localized names: the country first, then the subdivision within it
    if (!r) {
      const hit = best(findIsoCodes(c, options.locale), mapping);
      return hit ? isoTarget(hit) : undefined;
    }
    const cc = isCountry(code) ? code : best(findIsoCodes(c, options.locale, isCountryCode), mapping);
    if (!cc) return undefined;
    const prefix = `${cc}-`;
    const byName = (): string | undefined =>
      best(findIsoCodes(r, options.locale, candidate => candidate.startsWith(prefix)), mapping);
    const sub = isoSubdivision(cc, r) ?? byName();
    return sub ? isoTarget(sub) : undefined;
  };

  const statusOf = (iso: string): IsoStatus => (entry(flag, iso) ?? entry(coat, iso))?.status ?? 'current';

  return {
    parse(country: string, region?: string | null, options?: FlagOptions): FlagTarget {
      const target = find(country, region, checkOptions(options));
      if (!target) throw notFound(country, region);
      return target;
    },

    resolve(country: string, region?: string | null, options?: FlagOptions): ResolvedFlag {
      const opts = checkOptions(options);
      const target = find(country, region, opts);
      if (target && target.key != null) {
        const art = keyArtwork(target.key);
        return {
          iso: target.iso,
          key: target.key,
          resolvedIso: art ? art.iso : null,
          variant: art ? art.variant : 'flag',
          polyfill: null,
          status: target.iso ? statusOf(target.iso) : 'current',
        };
      }
      if (target && target.iso) {
        const variant = opts.variant ?? 'flag';
        const loc = entry(variant === 'coat' ? coat : flag, target.iso);
        if (loc && !(loc.polyfill && opts.polyfill === false)) {
          return {
            iso: target.iso,
            key: artworkKey(loc, variant),
            resolvedIso: loc.subdivision != null ? `${loc.country}-${loc.subdivision}` : loc.country,
            variant,
            polyfill: loc.polyfill ?? null,
            status: loc.status ?? 'current',
          };
        }
      }
      throw notFound(country, region);
    },
  };
}
