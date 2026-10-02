import { getDefaultLocale, getIsoCode, getName, getNames, locales, searchFlags, setDefaultLocale } from '../src/index';
import type { Locale } from '../src/index';
import apiFlagMapping from '../src/generated/iso-mapping.json';

afterEach(() => setDefaultLocale('en'));

describe('names (re-exported from the shared core)', () => {
  test('locales and the default locale', () => {
    expect(locales).toEqual(['en', 'es', 'zh-CN', 'zh-TW']);
    expect(getDefaultLocale()).toBe('en');
    setDefaultLocale('zh-Hans' as Locale);
    expect(getDefaultLocale()).toBe('zh-CN');
    expect(getName('DE')).toBe('德国');
    expect(() => setDefaultLocale('fr' as Locale)).toThrow(RangeError);
  });

  test('getName per locale, with fallbacks zh-TW -> zh-CN -> en and es -> en', () => {
    expect(getName('US-CA')).toBe('California');
    expect(getName('MX', 'es')).toBe('México');
    expect(getName('US-CA', 'zh-CN')).toBe('加利福尼亚州');
    expect(getName('US-CA', 'zh-TW')).toBe('加利福尼亞州');
    expect(getName('AE-AZ', 'zh-TW')).toBe('阿布扎比'); // no zh-TW name: zh-CN
    expect(getName('BA-01', 'zh-TW')).toBe('Una-Sana'); // English only
    expect(getName('BA-01', 'es')).toBe('Una-Sana');
    expect(getName('XX-YY')).toBeUndefined();
  });

  test('getNames lists every locale that has a name', () => {
    expect(getNames('US-CA')).toEqual({ en: 'California', es: 'California', 'zh-CN': '加利福尼亚州', 'zh-TW': '加利福尼亞州' });
  });

  test('getIsoCode per locale', () => {
    expect(getIsoCode('California')).toBe('US-CA');
    expect(getIsoCode('Cataluña', { locale: 'es' })).toBe('ES-CT');
    expect(getIsoCode('加利福尼亚州', { locale: 'zh-CN' })).toBe('US-CA');
    expect(getIsoCode('加利福尼亞州', { locale: 'zh-TW' })).toBe('US-CA');
    expect(getIsoCode('Georgia', { country: 'US' })).toBe('US-GA');
    expect(getIsoCode('golden state')).toBe('US-CA'); // English alias
    expect(getIsoCode('Atlantis')).toBeUndefined();
  });
});

describe('searchFlags, bound to what the API serves', () => {
  test('name match: exact first, then substring', () => {
    const results = searchFlags('california');
    expect(results[0]).toEqual({ iso: 'US-CA', name: 'California', country: 'US', matched: 'California', score: 6 });
    expect(results.map(r => r.iso)).toEqual(expect.arrayContaining(['MX-BCN', 'MX-BCS']));
  });

  test('aliases, Chinese names and ISO codes', () => {
    expect(searchFlags('golden state')[0]).toMatchObject({ iso: 'US-CA', matched: 'golden state' });
    expect(searchFlags('加利福尼亚州', { locale: 'zh-CN' })[0]).toMatchObject({ iso: 'US-CA', name: '加利福尼亚州' });
    expect(searchFlags('us-ca')[0]).toMatchObject({ iso: 'US-CA', matched: 'US-CA', score: 6 });
  });

  test('a country-name match also returns its subdivisions; country filter and limit', () => {
    const results = searchFlags('andorra');
    expect(results[0]).toMatchObject({ iso: 'AD', score: 6 });
    expect(results.slice(1).every(r => r.country === 'AD' && r.score === 5)).toBe(true);
    expect(searchFlags('san', { country: 'US', limit: 3 }).every(r => r.country === 'US')).toBe(true);
    expect(searchFlags('san', { limit: 2 })).toHaveLength(2);
  });

  test('covers every code of the API mapping, polyfilled ones included, and nothing else', () => {
    expect(searchFlags('GB-BIR')[0]).toMatchObject({ iso: 'GB-BIR' }); // regional polyfill on the API
    expect(searchFlags('Lesotho')).toEqual([]); // no artwork anywhere
    const codes = new Set(Object.keys(apiFlagMapping));
    expect(searchFlags('a').every(r => codes.has(r.iso))).toBe(true);
  });

  test('an empty term finds nothing', () => {
    expect(searchFlags('')).toEqual([]);
    expect(searchFlags('   ')).toEqual([]);
  });
});
