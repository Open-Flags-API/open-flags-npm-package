/**
 * Locales and ISO <-> name lookups over src/i18n/<locale>.json (the Open Flags API i18n format) and
 * src/i18n/aliases.json. The locale key picks which ISO <-> name table a lookup uses; reverse indexes
 * are built lazily, once per locale.
 */
import en from '../i18n/en.json';
import es from '../i18n/es.json';
import zhCN from '../i18n/zh-CN.json';
import zhTW from '../i18n/zh-TW.json';
import aliasData from '../i18n/aliases.json';
import { normalizeIso, normalizeText } from './normalize';
import type { IsoCodeOptions, Locale } from './types';

type Names = Partial<Record<Locale, string>>;

/** A src/i18n/<locale>.json file: `_meta`, `_countries` ({ CC: name }) and one key per subdivision code. */
type Table = { _countries: Record<string, string> } & Record<string, unknown>;

export const locales: readonly Locale[] = /*#__PURE__*/ Object.freeze(['en', 'es', 'zh-CN', 'zh-TW']);

const TABLES: Record<Locale, Table> = { en, es, 'zh-CN': zhCN, 'zh-TW': zhTW };
const ALIASES: Record<string, string[]> = aliasData;

/** Name fallbacks: zh-TW -> zh-CN -> en, zh-CN -> en, es -> en. */
const FALLBACKS: Record<Locale, readonly Locale[]> = {
  en: ['en'],
  es: ['es', 'en'],
  'zh-CN': ['zh-CN', 'en'],
  'zh-TW': ['zh-TW', 'zh-CN', 'en'],
};

const COUNTRY_CODE = /^[A-Z]{2}$/;
const isCountryCode = (code: string): boolean => COUNTRY_CODE.test(code);

let defaultLocale: Locale = 'en';
let namesByCode: Map<string, Names> | undefined;
let sortedCodes: string[] | undefined;
const nameIndexes: Partial<Record<Locale, Map<string, string[]>>> = {};
let aliasIndex: Map<string, string[]> | undefined;

/**
 * Maps a locale tag onto a supported locale, case-insensitively: `en`, `en-*` -> 'en'; `es`, `es-*` -> 'es';
 * `zh`, `zh-CN`, `zh-SG`, `zh-Hans(-*)` -> 'zh-CN'; `zh-TW`, `zh-HK`, `zh-MO`, `zh-Hant(-*)` -> 'zh-TW'.
 * Throws a RangeError for anything else.
 */
export function resolveLocale(input: string): Locale {
  const tag = typeof input === 'string' ? input.trim().replace(/_/g, '-').toLowerCase() : '';
  if (/^[a-z]{2,3}(-[a-z0-9]{1,8})*$/.test(tag)) {
    const [language, ...subtags] = tag.split('-');
    if (language === 'en') return 'en';
    if (language === 'es') return 'es';
    if (language === 'zh') {
      const script = subtags[0]?.length === 4 ? subtags[0] : undefined;
      if (script === 'hans') return 'zh-CN';
      if (script === 'hant') return 'zh-TW';
      if (!script) {
        const region = subtags[0];
        if (region === undefined || region === 'cn' || region === 'sg') return 'zh-CN';
        if (region === 'tw' || region === 'hk' || region === 'mo') return 'zh-TW';
      }
    }
  }
  throw new RangeError(
    `Unsupported locale '${input}': expected ${locales.join(', ')} or an alias such as zh-Hans, zh-Hant, es-MX or en-GB`
  );
}

/** Sets the locale used when none is given (aliases accepted, see resolveLocale). */
export function setDefaultLocale(locale: Locale): void {
  defaultLocale = resolveLocale(locale);
}

export function getDefaultLocale(): Locale {
  return defaultLocale;
}

/** ISO code -> its name in every locale that has one. */
function codeNames(): Map<string, Names> {
  if (!namesByCode) {
    const index = new Map<string, Names>();
    const add = (locale: Locale, code: string, name: unknown) => {
      if (typeof name !== 'string' || !name) return;
      let names = index.get(code);
      if (!names) index.set(code, (names = {}));
      names[locale] = name;
    };
    for (const locale of locales) {
      const table = TABLES[locale];
      for (const code of Object.keys(table._countries)) add(locale, code, table._countries[code]);
      for (const code of Object.keys(table)) if (!code.startsWith('_')) add(locale, code, table[code]);
    }
    namesByCode = index;
  }
  return namesByCode;
}

/**
 * Name of an ISO code (`'US'` -> country name, `'US-CA'` -> subdivision name) in `locale` (default: the
 * default locale), falling back zh-TW -> zh-CN -> en, zh-CN -> en, es -> en. Unknown code -> undefined.
 */
export function getName(iso: string, locale?: Locale): string | undefined {
  const chain = FALLBACKS[locale === undefined ? defaultLocale : resolveLocale(locale)];
  const names = codeNames().get(normalizeIso(iso));
  if (names) {
    for (const l of chain) {
      const name = names[l];
      if (name !== undefined) return name;
    }
  }
  return undefined;
}

/** Names of an ISO code in every locale that has one (no fallbacks); {} for an unknown code. */
export function getNames(iso: string): Partial<Record<Locale, string>> {
  return { ...codeNames().get(normalizeIso(iso)) };
}

/** Every ISO code (countries and subdivisions) that has a name, in code-unit order. */
export function listIsoCodes(): string[] {
  if (!sortedCodes) sortedCodes = [...codeNames().keys()].sort();
  return sortedCodes.slice();
}

function addTo(index: Map<string, string[]>, text: unknown, code: string): void {
  if (typeof text !== 'string') return;
  const key = normalizeText(text);
  if (!key) return;
  const codes = index.get(key);
  if (!codes) index.set(key, [code]);
  else if (!codes.includes(code)) codes.push(code);
}

/** normalizeText(name) -> ISO codes with that name in `locale`: countries first, then subdivisions, code order. */
function nameIndex(locale: Locale): Map<string, string[]> {
  let index = nameIndexes[locale];
  if (!index) {
    index = new Map<string, string[]>();
    const table = TABLES[locale];
    for (const code of Object.keys(table._countries).sort()) addTo(index, table._countries[code], code);
    for (const code of Object.keys(table).filter(key => !key.startsWith('_')).sort()) addTo(index, table[code], code);
    nameIndexes[locale] = index;
  }
  return index;
}

/** normalizeText(alias) -> ISO codes with that English alias: countries first, then subdivisions, code order. */
function aliases(): Map<string, string[]> {
  if (!aliasIndex) {
    const index = new Map<string, string[]>();
    const codes = Object.keys(ALIASES).sort();
    for (const countries of [true, false]) {
      for (const code of codes) {
        if (isCountryCode(code) !== countries) continue;
        for (const alias of ALIASES[code]) addTo(index, alias, code);
      }
    }
    aliasIndex = index;
  }
  return aliasIndex;
}

/** Locale tables in lookup order: the requested locale and its fallbacks first, then every other locale. */
function lookupOrder(locale: Locale | 'all' | undefined): readonly Locale[] {
  if (locale === 'all') return locales;
  const first = FALLBACKS[locale === undefined ? defaultLocale : resolveLocale(locale)];
  return [...first, ...locales.filter(l => !first.includes(l))];
}

/**
 * Every ISO code whose name matches `name` exactly after normalizeText. The first table with a match
 * decides — `locale` (default: the default locale) and its fallbacks, then every other locale, then the
 * English aliases — and lists countries first, then subdivisions, in code order. `filter` narrows the
 * candidates before a table counts as a match. getIsoCode() returns the first entry.
 */
export function findIsoCodes(name: string, locale?: Locale | 'all', filter?: (code: string) => boolean): string[] {
  const order = lookupOrder(locale);
  const term = normalizeText(name);
  if (!term) return [];
  const pick = (codes: string[] | undefined): string[] =>
    codes ? (filter ? codes.filter(filter) : codes.slice()) : [];
  for (const l of order) {
    const hits = pick(nameIndex(l).get(term));
    if (hits.length) return hits;
  }
  return pick(aliases().get(term));
}

/** ISO 3166-1 code of a country given by code (any case) or by name / alias in any locale; else undefined. */
export function getCountryCode(input: string, options: { locale?: Locale | 'all' } = {}): string | undefined {
  const code = normalizeIso(input);
  if (isCountryCode(code) && codeNames().has(code)) return code;
  return findIsoCodes(input, options.locale, isCountryCode)[0];
}

/**
 * ISO code for a name: exact match after normalizeText, in `locale` (default: the default locale) first,
 * then in every locale, then the English aliases. With `country` (ISO code or name), only that country's
 * subdivisions match. Returns undefined when nothing matches.
 */
export function getIsoCode(name: string, options: IsoCodeOptions = {}): string | undefined {
  if (options.country == null) return findIsoCodes(name, options.locale)[0];
  const country = getCountryCode(options.country, options);
  if (!country) return undefined;
  const prefix = `${country}-`;
  return findIsoCodes(name, options.locale, code => code.startsWith(prefix))[0];
}
