import isoMapping from '../../src/iso-mapping.json';
import { setDefaultLocale } from '../../src/core/i18n';
import { createSearch } from '../../src/core/search';
import type { IsoMapping } from '../../src/core/types';

const flag = isoMapping as IsoMapping;
const searchFlags = createSearch(flag);
const isos = (term: string, options?: Parameters<typeof searchFlags>[1]) => searchFlags(term, options).map(r => r.iso);

afterEach(() => setDefaultLocale('en'));

describe('searchFlags', () => {
  test('finds a code by name', () => {
    const results = searchFlags('California');
    expect(results[0]).toEqual({ iso: 'US-CA', name: 'California', country: 'US', matched: 'California', score: 6 });
    expect(isos('California')).toContain('MX-BCN'); // Baja California, a substring match
  });

  test('finds a code by English alias', () => {
    expect(searchFlags('golden state')).toEqual([
      { iso: 'US-CA', name: 'California', country: 'US', matched: 'golden state', score: 6 },
    ]);
    expect(searchFlags('Deutschland')[0]).toMatchObject({ iso: 'DE', matched: 'deutschland', score: 6 });
  });

  test('finds a code by Chinese name, simplified or traditional', () => {
    const simplified = searchFlags('加利福尼亚');
    expect(simplified[0]).toMatchObject({ iso: 'US-CA', name: 'California', matched: '加利福尼亚州', score: 4 });
    expect(simplified.map(r => r.iso)).toEqual(['US-CA', 'MX-BCN', 'MX-BCS']); // 下加利福尼亚州, 南下加利福尼亚州
    expect(searchFlags('加利福尼亞州')[0]).toMatchObject({ iso: 'US-CA', matched: '加利福尼亞州', score: 6 });
    const named = searchFlags('加利福尼亚', { locale: 'zh-CN' });
    expect(named[0]).toMatchObject({ iso: 'US-CA', name: '加利福尼亚州' });
  });

  test('finds a code by ISO code, any case or separator', () => {
    expect(searchFlags('US-CA')).toEqual([
      { iso: 'US-CA', name: 'California', country: 'US', matched: 'US-CA', score: 6 },
    ]);
    expect(isos('us_ca')).toEqual(['US-CA']);
    expect(searchFlags('fr-ara')[0]).toMatchObject({ iso: 'FR-ARA', matched: 'FR-ARA', score: 6 });
  });

  test('a country-name match also returns that country’s subdivisions', () => {
    const results = searchFlags('Andorra');
    const subdivisions = Object.keys(flag).filter(code => code.startsWith('AD-'));
    expect(results.map(r => r.iso)).toEqual(['AD', ...subdivisions]);
    expect(results[0]).toMatchObject({ iso: 'AD', matched: 'Andorra', score: 6 });
    // Andorra la Vella (AD-07) also has an own-name prefix match, but the exact country match ranks higher.
    for (const r of results.slice(1)) expect(r).toMatchObject({ country: 'AD', matched: 'Andorra', score: 5 });
    expect(isos('安道尔')).toEqual(['AD', ...subdivisions]);
    expect(searchFlags('AD')[1]).toMatchObject({ iso: 'AD-02', matched: 'AD', score: 5 });
  });

  test('ranks exact > prefix > substring, own names over country names, ties by ISO code', () => {
    const results = searchFlags('saxony');
    expect(results.map(r => [r.iso, r.name, r.score])).toEqual([
      ['DE-SN', 'Saxony', 6], // exact
      ['DE-ST', 'Saxony-Anhalt', 4], // prefix
      ['DE-NI', 'Lower Saxony', 2], // substring
    ]);
    const broad = searchFlags('san');
    for (let i = 1; i < broad.length; i++) {
      const [a, b] = [broad[i - 1], broad[i]];
      expect(a.score > b.score || (a.score === b.score && a.iso < b.iso)).toBe(true);
    }
  });

  test('limit caps the number of results', () => {
    const all = searchFlags('san');
    expect(all.length).toBeGreaterThan(5);
    expect(searchFlags('san', { limit: 5 })).toEqual(all.slice(0, 5));
    expect(searchFlags('san', { limit: 0 })).toEqual([]);
    expect(searchFlags('san', { limit: 10_000 })).toEqual(all);
  });

  test('country filter keeps one country (by code or name)', () => {
    expect(isos('new').length).toBeGreaterThan(4); // New South Wales, New Zealand, ...
    const us = searchFlags('new', { country: 'US' });
    expect(us.map(r => r.iso)).toEqual(['US-NH', 'US-NJ', 'US-NM', 'US-NY']);
    expect(us.every(r => r.country === 'US')).toBe(true);
    expect(searchFlags('new', { country: 'Estados Unidos' })).toEqual(us);
    expect(searchFlags('new', { country: 'us' })).toEqual(us);
    expect(searchFlags('new', { country: 'Atlantis' })).toEqual([]);
  });

  test('empty or blank terms give no results', () => {
    expect(searchFlags('')).toEqual([]);
    expect(searchFlags('   ')).toEqual([]);
    expect(searchFlags('_')).toEqual([]);
  });

  test('locale selects the names searched and the names returned', () => {
    expect(searchFlags('Alemania', { locale: 'es' })[0]).toMatchObject({ iso: 'DE', name: 'Alemania', score: 6 });
    expect(isos('Sajonia', { locale: 'es' })).toEqual(['DE-SN', 'DE-ST', 'DE-NI']);
    expect(isos('Sajonia', { locale: 'en' })).toEqual([]); // English names (and aliases) only
    expect(isos('Sajonia')).toEqual(['DE-SN', 'DE-ST', 'DE-NI']); // default: every locale
    expect(isos('Bavaria', { locale: 'es' })).not.toContain('DE-BY'); // Spanish: Baviera
    // English aliases are searched whatever the locale.
    expect(searchFlags('baviera', { locale: 'zh-CN' })).toEqual([
      { iso: 'DE-BY', name: '巴伐利亚', country: 'DE', matched: 'baviera', score: 6 },
    ]);
    setDefaultLocale('es');
    expect(searchFlags('Germany')[0]).toMatchObject({ iso: 'DE', name: 'Alemania', matched: 'Germany' });
  });

  test('covers every code of the bound mapping, polyfilled ones included', () => {
    expect(flag['AF-BDS'].polyfill).toBe('national');
    expect(isos('Badakhshan')).toContain('AF-BDS');
    expect(flag.LS).toBeUndefined(); // Lesotho has no artwork, so it is not in the mapping
    expect(isos('Lesotho')).toEqual([]);
  });

  test('is bound to the mapping it is created with', () => {
    const tiny = createSearch({ 'US-CA': { country: 'US', subdivision: 'CA' } });
    expect(tiny('cal').map(r => r.iso)).toEqual(['US-CA']);
    expect(tiny('united states')).toEqual([
      { iso: 'US-CA', name: 'California', country: 'US', matched: 'United States', score: 5 },
    ]);
    expect(tiny('saxony')).toEqual([]);
  });

  test('answers in well under 20 ms per query after warm-up', () => {
    const queries = ['a', 'san', 'saxony', 'united', 'new york', '加利福尼亚', 'us-ca', 'golden state', 'zzzz'];
    for (const q of queries) searchFlags(q);
    const rounds = 10;
    const started = performance.now();
    for (let i = 0; i < rounds; i++) for (const q of queries) searchFlags(q);
    const perQuery = (performance.now() - started) / (rounds * queries.length);
    expect(perQuery).toBeLessThan(20);
  });
});
