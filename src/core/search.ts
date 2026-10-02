/**
 * Flag search, mirroring the Open Flags API search (Cache.search in lib/open_flags/flags/cache.ex: a
 * case-insensitive substring match over the ISO code, region names, the country's name and code, and
 * aliases including translations). Each package binds it to its own ISO mapping with createSearch().
 */
import aliasData from '../i18n/aliases.json';
import { getCountryCode, getDefaultLocale, getName, getNames, resolveLocale } from './i18n';
import { normalizeIso, normalizeText } from './normalize';
import type { IsoMapping, Locale, SearchOptions, SearchResult } from './types';

export type SearchFlags = (term: string, options?: SearchOptions) => SearchResult[];

interface Field {
  text: string; // normalizeText(raw)
  raw: string;
}

/** A code and everything it can be found by. */
interface Searchable {
  iso: string;
  code: string; // normalizeText(iso)
  fields: Field[]; // names in the searched locale(s) and English aliases
}

interface Index {
  entries: (Searchable & { country: string })[]; // every code of the mapping, in code order
  countries: Map<string, Searchable>;
}

interface Match {
  quality: number;
  matched: string;
}

const ALIASES: Record<string, string[]> = aliasData;
const EXACT = 3;
const PREFIX = 2;
const SUBSTRING = 1;

/** EXACT, PREFIX, SUBSTRING or 0 for `term` in `text`. */
function quality(text: string, term: string): number {
  const at = text.indexOf(term);
  return at < 0 ? 0 : at > 0 ? SUBSTRING : text.length === term.length ? EXACT : PREFIX;
}

/** Best match of a code: its ISO code against `iso`, its names and aliases against `text`. */
function bestMatch(target: Searchable, iso: string, text: string): Match {
  let best: Match = { quality: iso ? quality(target.code, iso) : 0, matched: target.iso };
  for (const field of target.fields) {
    const q = quality(field.text, text);
    if (q > best.quality) best = { quality: q, matched: field.raw };
  }
  return best;
}

/**
 * Builds searchFlags(term, options?) over every ISO code of `mapping` (so codes without artwork of their
 * own are searchable too; they resolve via polyfill). A code matches on its ISO code, its names (the
 * selected locale with fallback, or every locale for 'all', the default) and English aliases — or through
 * its country's code, names and aliases, so a country-name match also returns that country's
 * subdivisions, like the API. Matching is a substring match after normalizeText (`_` in a code term is
 * read as `-`, so 'us_ca' finds US-CA). Ranking: exact > prefix > substring; at the same level a match on
 * the code itself outranks a match through its country; ties by ISO code. Score: 6 / 4 / 2 for an exact /
 * prefix / substring match on the code itself, 5 / 3 / 1 through its country. Indexes are built lazily,
 * once per locale.
 */
export function createSearch(mapping: IsoMapping): SearchFlags {
  const indexes: Partial<Record<Locale | 'all', Index>> = {};

  const searchable = (iso: string, locale: Locale | 'all'): Searchable => {
    const names = locale === 'all' ? Object.values(getNames(iso)) : [getName(iso, locale)];
    const fields: Field[] = [];
    for (const raw of [...names, ...(ALIASES[iso] ?? [])]) {
      if (!raw) continue;
      const text = normalizeText(raw);
      if (text && !fields.some(field => field.text === text)) fields.push({ text, raw });
    }
    return { iso, code: normalizeText(iso), fields };
  };

  const indexFor = (locale: Locale | 'all'): Index => {
    let index = indexes[locale];
    if (!index) {
      const countries = new Map<string, Searchable>();
      const country = (code: string): Searchable => {
        let entry = countries.get(code);
        if (!entry) countries.set(code, (entry = searchable(code, locale)));
        return entry;
      };
      const entries = Object.keys(mapping)
        .sort()
        .map(iso => {
          const dash = iso.indexOf('-');
          const cc = dash === -1 ? iso : iso.slice(0, dash);
          const countryEntry = country(cc); // also what the country's subdivisions match through
          return { ...(dash === -1 ? countryEntry : searchable(iso, locale)), country: cc };
        });
      index = indexes[locale] = { entries, countries };
    }
    return index;
  };

  return function searchFlags(term: string, options: SearchOptions = {}): SearchResult[] {
    const locale = options.locale === undefined || options.locale === 'all' ? 'all' : resolveLocale(options.locale);
    const text = normalizeText(term);
    if (!text) return [];
    let only: string | undefined;
    if (options.country != null) {
      only = getCountryCode(options.country, { locale });
      if (!only) return [];
    }
    const iso = normalizeText(normalizeIso(term));
    const index = indexFor(locale);
    const countryMatches = new Map<string, Match>();
    const countryMatch = (code: string): Match => {
      let match = countryMatches.get(code);
      if (!match) {
        const country = index.countries.get(code);
        match = country ? bestMatch(country, iso, text) : { quality: 0, matched: '' };
        countryMatches.set(code, match);
      }
      return match;
    };

    const hits: { iso: string; country: string; matched: string; score: number }[] = [];
    for (const entry of index.entries) {
      if (only && entry.country !== only) continue;
      const own = bestMatch(entry, iso, text);
      let score = own.quality * 2;
      let matched = own.matched;
      if (entry.iso !== entry.country && score < EXACT * 2) {
        const viaCountry = countryMatch(entry.country);
        if (viaCountry.quality && viaCountry.quality * 2 - 1 > score) {
          score = viaCountry.quality * 2 - 1;
          matched = viaCountry.matched;
        }
      }
      if (score > 0) hits.push({ iso: entry.iso, country: entry.country, matched, score });
    }

    // Entries are in code order and the sort is stable, so equal scores stay ordered by ISO code.
    hits.sort((a, b) => b.score - a.score);
    const { limit } = options;
    if (typeof limit === 'number' && limit >= 0 && limit < hits.length) hits.length = Math.floor(limit);
    const display = locale === 'all' ? getDefaultLocale() : locale;
    return hits.map(hit => ({
      iso: hit.iso,
      name: getName(hit.iso, display) ?? hit.iso,
      country: hit.country,
      matched: hit.matched,
      score: hit.score,
    }));
  };
}
