import type { FlagOptions } from '../../../src/core/types';

/** PNG sizes the Open Flags API renders (pixels, longest side). */
export type PngSize = 32 | 64 | 128 | 256 | 512;

export type ImageFormat = 'svg' | 'png';

export interface FlagUrlOptions extends FlagOptions {
  /** Default 'svg'. */
  format?: ImageFormat;
  /** PNG only. Default 128. */
  size?: PngSize;
}

export type CoatOfArmsUrlOptions = Omit<FlagUrlOptions, 'variant'>;

export interface PngUrlOptions extends FlagOptions {
  /** Default 128. */
  size?: PngSize;
}

export interface ConfigureOptions {
  /** Default 'https://api.openflags.net'. Trailing slashes are trimmed; '' means the current origin. */
  baseUrl?: string;
}

/** The part of the Fetch API the client uses. The global fetch (browsers, Node >= 18) satisfies it. */
export type FetchLike = (url: string, init: FetchLikeInit) => Promise<FetchLikeResponse>;

export interface FetchLikeInit {
  method: string;
  headers: Record<string, string>;
}

export interface FetchLikeResponse {
  ok: boolean;
  status: number;
  text(): Promise<string>;
}

export interface ClientOptions {
  /** Default: the base URL set with configure(), read at request time. */
  baseUrl?: string;
  /** Sent as the x-api-key header (the API then rate-limits per key instead of per IP address). */
  apiKey?: string;
  /** Default: the global fetch, read at request time. */
  fetch?: FetchLike;
}

export interface ListFlagsOptions {
  /** Default 1. */
  page?: number;
  /** Default 20; the API caps it at 100. */
  pageSize?: number;
}

/** One artwork of a flag record. */
export interface ApiArtwork {
  /** Path below `${baseUrl}/flags/`, e.g. 'US/US-CA/flag.svg'; null when the API has no such artwork. */
  svg: string | null;
  /** Where the artwork came from, e.g. 'Flag of California.svg'. */
  source: string | null;
}

/** A flag record as the Open Flags API returns it (its priv/flags manifests, enriched with names and aliases). */
export interface ApiFlag {
  /** ISO 3166 code, e.g. 'US-CA' or 'US'. */
  iso_code: string;
  /** ISO 3166-1 code of the country, e.g. 'US'. */
  country_iso: string;
  /** Country name or code from the source data, e.g. 'usa' or 'US'. */
  country_name: string;
  /** Lowercase region name, e.g. 'california'. */
  region_name: string;
  region_normalized: string;
  /** English name, when the API knows it, e.g. 'California'. */
  display_name?: string;
  /** English country name, when the API knows it, e.g. 'United States'. */
  country_display_name?: string;
  /** Nicknames and translations the API's search matches. */
  aliases: string[];
  country_aliases?: string[];
  flag: ApiArtwork;
  coat: ApiArtwork;
  /** 'out', 'flagcdn' or 'public'. */
  data_source: string;
}

export interface ApiPageMeta {
  current_page: number;
  page_size: number;
  total_count: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

/** GET /api/v1/flags */
export interface ApiFlagPage {
  data: ApiFlag[];
  meta: ApiPageMeta;
}

/** GET /api/v1/search and GET /api/v1/countries/:iso/flags */
export interface ApiFlagResults {
  data: ApiFlag[];
  count: number;
}

/** GET /api/v1/health */
export interface ApiHealth {
  status: 'ok' | 'degraded';
  timestamp: string;
  version: string;
  /** Newer API releases only. */
  checks?: { flags_loaded: number };
}

/** An entry of GET /api/v1/languages */
export interface ApiLanguage {
  /** e.g. 'zh-CN' */
  code: string;
  name: string;
  native: string;
}

/**
 * GET /api/v1/translations/:lang — the API's i18n file for a language: `_meta`, `_ui` (interface strings),
 * `_countries` ({ CC: name }) and one string per subdivision code ('US-CA': 'California').
 */
export interface ApiTranslations {
  _meta: { language: string; language_name?: string; language_native?: string; [key: string]: unknown };
  _ui?: Record<string, string>;
  _countries?: Record<string, string>;
  [key: string]: unknown;
}

/** A client for the Open Flags API's JSON endpoints. Every method rejects with OpenFlagsApiError on a non-2xx. */
export interface OpenFlagsClient {
  /** GET /api/v1/health (503 while the API's flag cache is empty: rejects, with the body in `error.body`). */
  health(): Promise<ApiHealth>;
  /** GET /api/v1/flags?page=&page_size= */
  listFlags(options?: ListFlagsOptions): Promise<ApiFlagPage>;
  /** GET /api/v1/flags/:iso_code — the flag record (`data`); the code is trimmed and upper-cased. */
  getFlag(iso: string): Promise<ApiFlag>;
  /** GET /api/v1/flags/random — a random flag record (`data`). */
  randomFlag(): Promise<ApiFlag>;
  /** GET /api/v1/search?q= — the API's own substring search (an empty q matches every flag). */
  search(q: string): Promise<ApiFlagResults>;
  /** GET /api/v1/countries/:iso/flags — every flag record of a country. */
  countryFlags(iso: string): Promise<ApiFlagResults>;
  /** GET /api/v1/languages — the languages the API has names for (`languages`). */
  languages(): Promise<ApiLanguage[]>;
  /** GET /api/v1/translations/:lang — locale aliases are accepted ('zh-Hant' -> 'zh-TW'). */
  translations(lang: string): Promise<ApiTranslations>;
}
