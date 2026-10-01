/**
 * Refreshes data/iso-codes.json — every ISO 3166-1 country and ISO 3166-2 subdivision the package
 * knows about, with its status, subdivision type, parent subdivision (used for regional polyfills)
 * and its name in every supported locale.
 *
 * Name priority for each locale:
 *   1. Open Flags API data (priv/iso_names.json, priv/i18n/*.json) so the package and the API agree
 *   2. Debian iso-codes translations (https://salsa.debian.org/iso-codes-team/iso-codes, LGPL-2.1+)
 *   3. nothing — the runtime falls back zh-TW -> zh-CN -> en, es -> en
 *
 * Withdrawn and user-assigned codes that the API corpus carries flags for (e.g. BA-01, FR-B, XK)
 * are included with status "withdrawn"/"user-assigned". The API's name-derived pseudo-codes
 * (data_source "public", e.g. US-GE) are not ISO codes and are skipped.
 *
 * Usage:
 *   npm run data:iso -- [--api-repo ../openflagsapi/open_flags_API_ex]
 */
import fs from 'fs';
import path from 'path';

type Locale = 'en' | 'es' | 'zh-CN' | 'zh-TW';
type TranslatedLocale = Exclude<Locale, 'en'>;
type Status = 'current' | 'withdrawn' | 'user-assigned';
type Names = Partial<Record<Locale, string>>;

interface CountryRecord {
  status: Status;
  names: Names;
  aliases?: string[];
}

interface SubdivisionRecord {
  country: string;
  status: Status;
  type?: string;
  parent?: string;
  names: Names;
  aliases?: string[];
}

const LOCALES: Locale[] = ['en', 'es', 'zh-CN', 'zh-TW'];
const TRANSLATED: TranslatedLocale[] = ['es', 'zh-CN', 'zh-TW'];
const PO_LANG: Record<TranslatedLocale, string> = { es: 'es', 'zh-CN': 'zh_CN', 'zh-TW': 'zh_TW' };
const ISO_CODES_RAW = 'https://salsa.debian.org/iso-codes-team/iso-codes/-/raw/main';
const OUT_FILE = path.resolve(__dirname, '../data/iso-codes.json');

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

async function fetchText(file: string): Promise<string> {
  const res = await fetch(`${ISO_CODES_RAW}/${file}`);
  if (!res.ok) throw new Error(`Could not download ${file}: HTTP ${res.status}`);
  return res.text();
}

/** Minimal gettext .po parser: { msgid: msgstr } for translated, non-fuzzy entries. */
function parsePo(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  let id: string | null = null;
  let str: string | null = null;
  let mode: 'id' | 'str' | null = null;
  let fuzzy = false;
  const flush = () => {
    if (id && str && !fuzzy) out[id] = str;
    id = null;
    str = null;
    mode = null;
    fuzzy = false;
  };
  const unquote = (s: string): string => JSON.parse(s.trim());
  for (const line of text.split(/\r?\n/)) {
    if (line.startsWith('#,') && line.includes('fuzzy')) {
      fuzzy = true;
      continue;
    }
    if (line.startsWith('msgid ')) {
      if (id !== null || str !== null) flush();
      id = unquote(line.slice(6));
      mode = 'id';
      continue;
    }
    if (line.startsWith('msgstr ')) {
      str = unquote(line.slice(7));
      mode = 'str';
      continue;
    }
    if (line.startsWith('"')) {
      if (mode === 'id') id += unquote(line);
      else if (mode === 'str') str += unquote(line);
      continue;
    }
    if (line.trim() === '') flush();
  }
  flush();
  return out;
}

function readJson<T>(file: string): T {
  return JSON.parse(fs.readFileSync(file, 'utf8')) as T;
}

/** "Flag of Una-Sana.svg" -> "Una-Sana" (used only when no real name exists for a withdrawn code). */
function nameFromSource(source: string | null | undefined): string | undefined {
  if (!source || source.includes('/')) return undefined;
  const name = source
    .replace(/\.svg$/i, '')
    .replace(/_/g, ' ')
    .replace(/^(Flag|Coat of arms|Emblem|Seal|Arms)( of)?( the)? /i, '')
    .trim();
  return name || undefined;
}

function sortObject<T>(obj: Record<string, T>): Record<string, T> {
  return Object.fromEntries(Object.entries(obj).sort(([a], [b]) => a.localeCompare(b)));
}

interface DebCountry { alpha_2: string; name: string; common_name?: string }
interface DebWithdrawn { alpha_2?: string; alpha_4: string; name: string; withdrawal_date?: string }
interface DebSubdivision { code: string; name: string; type: string; parent?: string }
interface ApiName { name: string; aliases?: string[] }
interface ApiNamesFile { _countries?: Record<string, ApiName>; [code: string]: unknown }
interface ApiI18nFile { _countries?: Record<string, string>; [code: string]: unknown }
interface Manifest {
  iso_code: string;
  country_iso: string;
  data_source?: string;
  flag?: { svg?: string | null; source?: string | null };
  coat?: { svg?: string | null; source?: string | null };
}

async function main(): Promise<void> {
  const apiRepo = path.resolve(
    arg('api-repo') ?? process.env.OPEN_FLAGS_API_REPO ?? path.resolve(__dirname, '../../openflagsapi/open_flags_API_ex')
  );
  if (!fs.existsSync(path.join(apiRepo, 'priv'))) {
    throw new Error(`Open Flags API repo not found at ${apiRepo} (pass --api-repo <path>)`);
  }

  // --- Debian iso-codes ---------------------------------------------------
  const iso1 = (JSON.parse(await fetchText('data/iso_3166-1.json')) as { '3166-1': DebCountry[] })['3166-1'];
  const iso2 = (JSON.parse(await fetchText('data/iso_3166-2.json')) as { '3166-2': DebSubdivision[] })['3166-2'];
  const iso3 = (JSON.parse(await fetchText('data/iso_3166-3.json')) as { '3166-3': DebWithdrawn[] })['3166-3'];
  const po1: Partial<Record<TranslatedLocale, Record<string, string>>> = {};
  const po2: Partial<Record<TranslatedLocale, Record<string, string>>> = {};
  for (const locale of TRANSLATED) {
    po1[locale] = parsePo(await fetchText(`iso_3166-1/${PO_LANG[locale]}.po`));
    po2[locale] = parsePo(await fetchText(`iso_3166-2/${PO_LANG[locale]}.po`));
  }

  // --- Open Flags API data ------------------------------------------------
  const apiEn = readJson<ApiNamesFile>(path.join(apiRepo, 'priv/iso_names.json'));
  const apiI18n: Partial<Record<TranslatedLocale, ApiI18nFile>> = {};
  for (const locale of TRANSLATED) {
    const file = path.join(apiRepo, 'priv/i18n', `${locale}.json`);
    if (fs.existsSync(file)) apiI18n[locale] = readJson<ApiI18nFile>(file);
  }
  const apiSubName = (code: string): ApiName | undefined => {
    const v = apiEn[code] as ApiName | undefined;
    return v && typeof v === 'object' && typeof v.name === 'string' ? v : undefined;
  };
  const apiSubTranslation = (locale: TranslatedLocale, code: string): string | undefined => {
    const v = apiI18n[locale]?.[code];
    return typeof v === 'string' ? v : undefined;
  };

  // --- Countries ------------------------------------------------------------
  const countries: Record<string, CountryRecord> = {};
  for (const c of iso1) {
    const api = apiEn._countries?.[c.alpha_2];
    const names: Names = { en: api?.name ?? c.common_name ?? c.name };
    for (const locale of TRANSLATED) {
      const t =
        apiI18n[locale]?._countries?.[c.alpha_2] ??
        (c.common_name ? po1[locale]?.[c.common_name] : undefined) ??
        po1[locale]?.[c.name];
      if (t) names[locale] = t;
    }
    countries[c.alpha_2] = { status: 'current', names, ...(api?.aliases?.length ? { aliases: api.aliases } : {}) };
  }

  // --- Subdivisions ---------------------------------------------------------
  const subdivisions: Record<string, SubdivisionRecord> = {};
  for (const s of iso2) {
    const country = s.code.slice(0, s.code.indexOf('-'));
    const api = apiSubName(s.code);
    const names: Names = { en: api?.name ?? s.name };
    for (const locale of TRANSLATED) {
      const t = apiSubTranslation(locale, s.code) ?? po2[locale]?.[s.name];
      if (t) names[locale] = t;
    }
    const parent = s.parent ? (s.parent.includes('-') ? s.parent : `${country}-${s.parent}`) : undefined;
    subdivisions[s.code] = {
      country,
      status: 'current',
      type: s.type,
      ...(parent ? { parent } : {}),
      names,
      ...(api?.aliases?.length ? { aliases: api.aliases } : {}),
    };
  }

  // --- Withdrawn / user-assigned codes the API corpus has artwork for -------
  const manifests: Manifest[] = [];
  const walk = (dir: string) => {
    for (const f of fs.readdirSync(dir)) {
      const p = path.join(dir, f);
      if (fs.statSync(p).isDirectory()) walk(p);
      else if (f === 'manifest.json') manifests.push(readJson<Manifest>(p));
    }
  };
  walk(path.join(apiRepo, 'priv/flags'));
  const withdrawnCountryName = (cc: string): string | undefined =>
    iso3
      .filter(w => w.alpha_2 === cc)
      .sort((a, b) => (b.withdrawal_date ?? '').localeCompare(a.withdrawal_date ?? ''))[0]?.name;

  let extra = 0;
  for (const m of manifests.sort((a, b) => a.iso_code.localeCompare(b.iso_code))) {
    const code = m.iso_code;
    const hasArt = !!(m.flag?.svg || m.coat?.svg);
    if (!hasArt || m.data_source === 'public') continue;
    const national = /^[A-Z]{2}$/.test(code) && code === m.country_iso;
    const sub = /^[A-Z]{2}-[A-Z0-9]{1,3}$/.test(code);
    if (national && !countries[code]) {
      const api = apiEn._countries?.[code];
      const names: Names = { en: api?.name ?? withdrawnCountryName(code) ?? nameFromSource(m.flag?.source) ?? code };
      for (const locale of TRANSLATED) {
        const t = apiI18n[locale]?._countries?.[code];
        if (t) names[locale] = t;
      }
      countries[code] = { status: code === 'XK' ? 'user-assigned' : 'withdrawn', names };
      extra++;
    } else if (sub && !subdivisions[code]) {
      const cc = code.slice(0, 2);
      if (!countries[cc]) {
        countries[cc] = { status: 'withdrawn', names: { en: withdrawnCountryName(cc) ?? cc } };
        extra++;
      }
      const names: Names = {
        en: apiSubName(code)?.name ?? nameFromSource(m.flag?.source) ?? nameFromSource(m.coat?.source) ?? code,
      };
      for (const locale of TRANSLATED) {
        const t = apiSubTranslation(locale, code);
        if (t) names[locale] = t;
      }
      subdivisions[code] = { country: cc, status: 'withdrawn', names };
      extra++;
    }
  }

  const data = {
    _meta: {
      description:
        'ISO 3166 countries and subdivisions known to open-flags: status, type, parent subdivision and localized names. Generated by scripts/update-iso-data.ts - do not edit by hand.',
      locales: LOCALES,
      sources: {
        'open-flags-api': 'Open Flags API priv/iso_names.json and priv/i18n/{es,zh-CN,zh-TW}.json (preferred)',
        'iso-codes':
          'Debian iso-codes, https://salsa.debian.org/iso-codes-team/iso-codes (LGPL-2.1-or-later): ISO 3166-1/-2/-3 data and es, zh_CN, zh_TW translations',
      },
      generated: new Date().toISOString().slice(0, 10),
    },
    countries: sortObject(countries),
    subdivisions: sortObject(subdivisions),
  };
  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(data, null, 2) + '\n');

  const count = (recs: Record<string, { names: Names }>, l: Locale) => Object.values(recs).filter(r => r.names[l]).length;
  console.log(
    `Wrote ${path.relative(process.cwd(), OUT_FILE)}: ${Object.keys(countries).length} countries, ${Object.keys(subdivisions).length} subdivisions (${extra} withdrawn/user-assigned from the API corpus)`
  );
  for (const l of LOCALES) console.log(`  ${l.padEnd(5)} countries ${count(countries, l)}, subdivisions ${count(subdivisions, l)}`);
  console.log(`  subdivisions with a parent: ${Object.values(subdivisions).filter(s => s.parent).length}`);
}

main().catch(err => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
