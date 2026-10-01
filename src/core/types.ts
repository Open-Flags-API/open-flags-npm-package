/** Locales with an ISO <-> name table in src/i18n/. */
export type Locale = 'en' | 'es' | 'zh-CN' | 'zh-TW';
export type FlagVariant = 'flag' | 'coat';
export type PolyfillLevel = 'regional' | 'national';
export type IsoStatus = 'current' | 'withdrawn' | 'user-assigned';

/**
 * Where the artwork served for a code lives: key = subdivision ? `${country}/${subdivision}` : country
 * (plus `-COA` for coats of arms). The value shape of iso-mapping.json, iso-coa-mapping.json and
 * named-mapping.json.
 */
export interface IsoLocation {
  country: string;
  subdivision: string | null;
  polyfill?: PolyfillLevel; // only when the code has no artwork of its own
  status?: 'withdrawn' | 'user-assigned'; // only when the code is not current
}

/** ISO code (or name, for named-mapping.json) -> location of the artwork served for it. */
export type IsoMapping = Record<string, IsoLocation>;

export interface FlagOptions {
  variant?: FlagVariant; // default 'flag'
  polyfill?: boolean; // default true; false: a polyfilled entry counts as missing
  locale?: Locale | 'all'; // locale tried first when a name is looked up (default: the default locale)
}

export interface ResolvedFlag {
  iso: string | null; // requested ISO code (null for non-ISO extras)
  key: string; // key of the artwork that will be served, e.g. 'FR/ARA'
  resolvedIso: string | null; // ISO code of that artwork, e.g. 'FR-ARA' (null for extras)
  variant: FlagVariant; // variant of that artwork (a legacy coat-of-arms alias is 'coat' whatever was requested)
  polyfill: PolyfillLevel | null;
  status: IsoStatus;
}

export interface SearchOptions {
  locale?: Locale | 'all'; // names searched (default 'all'); results are named in this locale or the default one
  limit?: number;
  country?: string; // ISO code or name: only that country and its subdivisions
}

export interface SearchResult {
  iso: string;
  name: string; // in the requested (or default) locale, with fallback
  country: string; // ISO 3166-1 code of the country
  matched: string; // the string that matched: ISO code, name, alias, or the country's name / code / alias
  score: number; // 6 / 4 / 2: exact / prefix / substring match on the code itself; 5 / 3 / 1: through its country
}

export interface IsoCodeOptions {
  locale?: Locale | 'all'; // locale tried first (default: the default locale), then every other one
  country?: string; // ISO code or name: only that country's subdivisions
}

/**
 * What a resolver's parse() recognised: an ISO code, resolved later through the requested variant's
 * mapping, or an exact artwork key (extras, 0.0.5 coat-of-arms aliases) that is served as-is.
 */
export interface FlagTarget {
  iso: string | null; // ISO code of the requested place (null for non-ISO keys such as extras)
  country: string | null; // its ISO 3166-1 country code
  key: string | null; // exact artwork key, served regardless of variant and never polyfilled; null for ISO targets
}
