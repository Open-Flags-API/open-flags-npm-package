/**
 * A small fetch-based client for the Open Flags API's JSON endpoints (lib/open_flags_web/router.ex in the
 * API repo). Responses are returned as the API sends them; single records are unwrapped from `data`.
 */
import { resolveLocale } from '../../../src/core/i18n';
import { normalizeIso } from '../../../src/core/normalize';
import { getBaseUrl, normalizeBaseUrl } from './config';
import type {
  ApiFlag,
  ApiFlagPage,
  ApiFlagResults,
  ApiHealth,
  ApiLanguage,
  ApiTranslations,
  ClientOptions,
  FetchLike,
  ListFlagsOptions,
  OpenFlagsClient,
} from './types';

/** A non-2xx (or non-JSON) response. `body` is the parsed JSON when there is some, else the raw text. */
export class OpenFlagsApiError extends Error {
  readonly status: number;
  readonly url: string;
  readonly body: unknown;

  constructor(message: string, status: number, url: string, body: unknown) {
    super(message);
    this.name = 'OpenFlagsApiError';
    this.status = status;
    this.url = url;
    this.body = body;
  }
}

type Query = Record<string, string | number | undefined>;

function queryString(query: Query | undefined): string {
  const pairs = Object.entries(query ?? {})
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
  return pairs.length ? `?${pairs.join('&')}` : '';
}

/** The API's own message, from its `{ "error": "..." }` error bodies. */
function apiMessage(body: unknown): string {
  const error = body !== null && typeof body === 'object' ? (body as { error?: unknown }).error : undefined;
  return typeof error === 'string' && error ? `: ${error}` : '';
}

function pathCode(method: string, iso: string): string {
  const code = normalizeIso(iso);
  if (!code) throw new RangeError(`${method}() needs an ISO 3166 code, got '${String(iso)}'`);
  return encodeURIComponent(code);
}

/** A supported locale or one of its aliases ('zh-Hant' -> 'zh-TW'); other tags are sent as given. */
function languageTag(lang: string): string {
  const tag = typeof lang === 'string' ? lang.trim() : '';
  if (!tag) throw new RangeError(`translations() needs a language code, got '${String(lang)}'`);
  try {
    return resolveLocale(tag);
  } catch {
    return tag;
  }
}

/**
 * Creates a client for the Open Flags API. Without a baseUrl it uses the one set with configure() (default
 * https://api.openflags.net); without fetch it uses the global fetch (browsers, Node >= 18). `apiKey` is sent
 * as the x-api-key header.
 */
export function createClient(options: ClientOptions = {}): OpenFlagsClient {
  const { apiKey, fetch: customFetch, baseUrl } = options ?? {};
  const fixedBaseUrl = baseUrl === undefined ? undefined : normalizeBaseUrl(baseUrl);

  async function get<T>(path: string, query?: Query): Promise<T> {
    const url = `${fixedBaseUrl ?? getBaseUrl()}${path}${queryString(query)}`;
    const fetchFn: FetchLike | undefined = customFetch ?? (globalThis as { fetch?: FetchLike }).fetch;
    if (typeof fetchFn !== 'function') {
      throw new Error('open-flags-api: no fetch implementation found; pass one with createClient({ fetch })');
    }
    const headers: Record<string, string> = { accept: 'application/json' };
    if (apiKey) headers['x-api-key'] = apiKey;
    const response = await fetchFn(url, { method: 'GET', headers });
    const text = await response.text();
    let body: unknown = text;
    let isJson = false;
    try {
      body = JSON.parse(text);
      isJson = true;
    } catch {
      // not JSON (e.g. an HTML error page): keep the text
    }
    if (!response.ok) {
      throw new OpenFlagsApiError(
        `Open Flags API responded ${response.status}${apiMessage(body)} (GET ${url})`,
        response.status,
        url,
        body
      );
    }
    if (!isJson) {
      throw new OpenFlagsApiError(
        `Open Flags API sent a response that is not JSON (GET ${url})`,
        response.status,
        url,
        body
      );
    }
    return body as T;
  }

  return {
    async health(): Promise<ApiHealth> {
      return get<ApiHealth>('/api/v1/health');
    },

    async listFlags(listOptions?: ListFlagsOptions): Promise<ApiFlagPage> {
      const { page, pageSize } = listOptions ?? {};
      return get<ApiFlagPage>('/api/v1/flags', { page, page_size: pageSize });
    },

    async getFlag(iso: string): Promise<ApiFlag> {
      return (await get<{ data: ApiFlag }>(`/api/v1/flags/${pathCode('getFlag', iso)}`)).data;
    },

    async randomFlag(): Promise<ApiFlag> {
      return (await get<{ data: ApiFlag }>('/api/v1/flags/random')).data;
    },

    async search(q: string): Promise<ApiFlagResults> {
      if (typeof q !== 'string') throw new TypeError(`search() needs a string, got ${q === null ? 'null' : typeof q}`);
      return get<ApiFlagResults>('/api/v1/search', { q });
    },

    async countryFlags(iso: string): Promise<ApiFlagResults> {
      return get<ApiFlagResults>(`/api/v1/countries/${pathCode('countryFlags', iso)}/flags`);
    },

    async languages(): Promise<ApiLanguage[]> {
      return (await get<{ languages: ApiLanguage[] }>('/api/v1/languages')).languages;
    },

    async translations(lang: string): Promise<ApiTranslations> {
      return get<ApiTranslations>(`/api/v1/translations/${encodeURIComponent(languageTag(lang))}`);
    },
  };
}
