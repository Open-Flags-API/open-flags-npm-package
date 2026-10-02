import { configure, createClient, OpenFlagsApiError } from '../src/index';
import type { ApiFlag, FetchLike, FetchLikeInit, FetchLikeResponse } from '../src/index';

const BASE = 'https://api.openflags.net';

// A record as GET /api/v1/flags/US-CA returns it (trimmed aliases).
const US_CA: ApiFlag = {
  aliases: ['golden state', 'cali', 'California', '加利福尼亚州'],
  coat: { source: null, svg: null },
  country_aliases: ['usa', 'america'],
  country_display_name: 'United States',
  country_iso: 'US',
  country_name: 'usa',
  data_source: 'out',
  display_name: 'California',
  flag: { source: 'Flag of California.svg', svg: 'US/US-CA/flag.svg' },
  iso_code: 'US-CA',
  region_name: 'california',
  region_normalized: 'us-ca',
};

function response(body: unknown, status = 200): FetchLikeResponse {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
  };
}

/** A fetch mock answering every request with `body` (or with each of `bodies` in turn). */
function mockFetch(...bodies: { body: unknown; status?: number }[]) {
  const fn = jest.fn<Promise<FetchLikeResponse>, [string, FetchLikeInit]>();
  for (const { body, status } of bodies) fn.mockResolvedValueOnce(response(body, status));
  return fn;
}

afterEach(() => configure({}));

describe('endpoints', () => {
  test('health() -> GET /api/v1/health', async () => {
    const health = { status: 'ok', timestamp: '2026-10-01T22:47:11.872268Z', version: '1.0.0' };
    const fetch = mockFetch({ body: health });
    await expect(createClient({ fetch }).health()).resolves.toEqual(health);
    expect(fetch).toHaveBeenCalledWith(`${BASE}/api/v1/health`, {
      method: 'GET',
      headers: { accept: 'application/json' },
    });
  });

  test('listFlags() -> GET /api/v1/flags?page=&page_size=, returns { data, meta }', async () => {
    const page = {
      data: [US_CA],
      meta: { current_page: 2, page_size: 1, total_count: 5757, total_pages: 5757, has_next: true, has_prev: true },
    };
    const fetch = mockFetch({ body: page }, { body: page });
    const client = createClient({ fetch });
    await expect(client.listFlags({ page: 2, pageSize: 1 })).resolves.toEqual(page);
    expect(fetch.mock.calls[0][0]).toBe(`${BASE}/api/v1/flags?page=2&page_size=1`);
    await client.listFlags();
    expect(fetch.mock.calls[1][0]).toBe(`${BASE}/api/v1/flags`);
  });

  test('getFlag(iso) -> GET /api/v1/flags/:iso_code, returns data; the code is normalized', async () => {
    const fetch = mockFetch({ body: { data: US_CA } });
    await expect(createClient({ fetch }).getFlag(' us_ca ')).resolves.toEqual(US_CA);
    expect(fetch.mock.calls[0][0]).toBe(`${BASE}/api/v1/flags/US-CA`);
  });

  test('randomFlag() -> GET /api/v1/flags/random, returns data', async () => {
    const fetch = mockFetch({ body: { data: US_CA } });
    await expect(createClient({ fetch }).randomFlag()).resolves.toEqual(US_CA);
    expect(fetch.mock.calls[0][0]).toBe(`${BASE}/api/v1/flags/random`);
  });

  test('search(q) -> GET /api/v1/search?q=, returns { data, count }', async () => {
    const results = { data: [US_CA], count: 1 };
    const fetch = mockFetch({ body: results });
    await expect(createClient({ fetch }).search('são paulo & co')).resolves.toEqual(results);
    expect(fetch.mock.calls[0][0]).toBe(`${BASE}/api/v1/search?q=s%C3%A3o%20paulo%20%26%20co`);
  });

  test('countryFlags(iso) -> GET /api/v1/countries/:iso/flags, returns { data, count }', async () => {
    const results = { data: [US_CA], count: 1 };
    const fetch = mockFetch({ body: results });
    await expect(createClient({ fetch }).countryFlags('us')).resolves.toEqual(results);
    expect(fetch.mock.calls[0][0]).toBe(`${BASE}/api/v1/countries/US/flags`);
  });

  test('languages() -> GET /api/v1/languages, returns the languages', async () => {
    const languages = [
      { code: 'en', name: 'English', native: 'English' },
      { code: 'zh-TW', name: '繁體中文', native: '繁體中文' },
    ];
    const fetch = mockFetch({ body: { languages } });
    await expect(createClient({ fetch }).languages()).resolves.toEqual(languages);
    expect(fetch.mock.calls[0][0]).toBe(`${BASE}/api/v1/languages`);
  });

  test('translations(lang) -> GET /api/v1/translations/:lang; locale aliases resolved, other tags kept', async () => {
    const es = { _meta: { language: 'es', language_name: 'Español' }, 'US-CA': 'California' };
    const fetch = mockFetch({ body: es }, { body: es }, { body: es }, { body: es });
    const client = createClient({ fetch });
    await expect(client.translations('es')).resolves.toEqual(es);
    await client.translations('zh-Hant');
    await client.translations('ES-mx');
    await client.translations('fr');
    expect(fetch.mock.calls.map(call => call[0])).toEqual([
      `${BASE}/api/v1/translations/es`,
      `${BASE}/api/v1/translations/zh-TW`,
      `${BASE}/api/v1/translations/es`,
      `${BASE}/api/v1/translations/fr`,
    ]);
  });
});

describe('options', () => {
  test('apiKey is sent as the x-api-key header', async () => {
    const fetch = mockFetch({ body: { data: US_CA } });
    await createClient({ fetch, apiKey: 'of_live_123' }).getFlag('US-CA');
    expect(fetch.mock.calls[0][1]).toEqual({
      method: 'GET',
      headers: { accept: 'application/json', 'x-api-key': 'of_live_123' },
    });
  });

  test('baseUrl option, trailing slashes trimmed', async () => {
    const fetch = mockFetch({ body: { languages: [] } });
    await createClient({ fetch, baseUrl: 'http://localhost:4000/' }).languages();
    expect(fetch.mock.calls[0][0]).toBe('http://localhost:4000/api/v1/languages');
  });

  test('without a baseUrl the client follows configure(), at request time', async () => {
    const fetch = mockFetch({ body: { languages: [] } }, { body: { languages: [] } });
    const client = createClient({ fetch });
    configure({ baseUrl: 'https://flags.example.com' });
    await client.languages();
    configure({});
    await client.languages();
    expect(fetch.mock.calls.map(call => call[0])).toEqual([
      'https://flags.example.com/api/v1/languages',
      `${BASE}/api/v1/languages`,
    ]);
  });

  test('a baseUrl that is not a string throws a TypeError', () => {
    expect(() => createClient({ baseUrl: 42 as unknown as string })).toThrow(TypeError);
  });

  describe('fetch', () => {
    const originalFetch = globalThis.fetch;
    afterEach(() => {
      globalThis.fetch = originalFetch;
    });

    test('defaults to the global fetch, read at request time', async () => {
      const client = createClient();
      const fetch = mockFetch({ body: { data: US_CA } });
      globalThis.fetch = fetch as unknown as typeof globalThis.fetch;
      await expect(client.randomFlag()).resolves.toEqual(US_CA);
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    test('no fetch at all -> a clear error', async () => {
      globalThis.fetch = undefined as unknown as typeof globalThis.fetch;
      await expect(createClient().health()).rejects.toThrow(/no fetch implementation found/);
    });

    // window.fetch throws "Illegal invocation" when it is called as a method of another object.
    test('is called as a plain function', async () => {
      let self: unknown = 'not called';
      const fetch: FetchLike = function (this: unknown) {
        self = this;
        return Promise.resolve(response({ languages: [] }));
      };
      await createClient({ fetch }).languages();
      expect(self).toBeUndefined();
    });

    test('works with real Response objects', async () => {
      const fetch: FetchLike = async () =>
        new Response(JSON.stringify({ data: US_CA }), { status: 200, headers: { 'content-type': 'application/json' } });
      await expect(createClient({ fetch }).getFlag('US-CA')).resolves.toEqual(US_CA);
    });
  });
});

describe('errors', () => {
  test('a non-2xx response rejects with OpenFlagsApiError (status, url, body)', async () => {
    const fetch = mockFetch({ body: { error: 'Flag not found' }, status: 404 });
    const error: OpenFlagsApiError = await createClient({ fetch }).getFlag('XX-XX').catch(e => e);
    expect(error).toBeInstanceOf(OpenFlagsApiError);
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('OpenFlagsApiError');
    expect(error.status).toBe(404);
    expect(error.url).toBe(`${BASE}/api/v1/flags/XX-XX`);
    expect(error.body).toEqual({ error: 'Flag not found' });
    expect(error.message).toBe(`Open Flags API responded 404: Flag not found (GET ${BASE}/api/v1/flags/XX-XX)`);
  });

  test('an error body that is not JSON is kept as text', async () => {
    const html = '<!DOCTYPE html><html><body>Not Found</body></html>';
    const fetch = mockFetch({ body: html, status: 404 });
    const error: OpenFlagsApiError = await createClient({ fetch }).listFlags().catch(e => e);
    expect(error).toBeInstanceOf(OpenFlagsApiError);
    expect(error.body).toBe(html);
    expect(error.message).toBe(`Open Flags API responded 404 (GET ${BASE}/api/v1/flags)`);
  });

  test('health() while the API is degraded (503) rejects with the health body', async () => {
    const degraded = {
      status: 'degraded',
      timestamp: '2026-10-01T00:00:00Z',
      version: '1.0.0',
      checks: { flags_loaded: 0 },
    };
    const fetch = mockFetch({ body: degraded, status: 503 });
    await expect(createClient({ fetch }).health()).rejects.toMatchObject({ status: 503, body: degraded });
  });

  test('rate limiting (429) and bad requests (400) carry the API message', async () => {
    const fetch = mockFetch(
      { body: { error: 'Rate limit exceeded. Please try again later.' }, status: 429 },
      { body: { error: 'page_size must be a positive integer' }, status: 400 }
    );
    const client = createClient({ fetch });
    await expect(client.search('x')).rejects.toThrow('429: Rate limit exceeded. Please try again later.');
    await expect(client.listFlags({ pageSize: 0 })).rejects.toMatchObject({
      status: 400,
      message: expect.stringContaining('page_size must be a positive integer'),
    });
  });

  test('a 2xx response that is not JSON rejects with OpenFlagsApiError', async () => {
    const fetch = mockFetch({ body: 'not json', status: 200 });
    await expect(createClient({ fetch }).health()).rejects.toMatchObject({
      name: 'OpenFlagsApiError',
      status: 200,
      body: 'not json',
    });
  });

  test('network errors are passed through', async () => {
    const failure = new TypeError('fetch failed');
    const fetch: FetchLike = () => Promise.reject(failure);
    await expect(createClient({ fetch }).health()).rejects.toBe(failure);
  });

  test('missing arguments reject without a request', async () => {
    const fetch = mockFetch();
    const client = createClient({ fetch });
    await expect(client.getFlag('')).rejects.toThrow(RangeError);
    await expect(client.countryFlags('  ')).rejects.toThrow(RangeError);
    await expect(client.translations('')).rejects.toThrow(RangeError);
    await expect(client.search(undefined as unknown as string)).rejects.toThrow(TypeError);
    expect(fetch).not.toHaveBeenCalled();
  });
});
