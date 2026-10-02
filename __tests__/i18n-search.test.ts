// Locales, names and search through the package entry (searchFlags is bound to src/iso-mapping.json).
import {
  getDefaultLocale,
  getIsoCode,
  getName,
  getNames,
  locales,
  resolveFlag,
  searchFlags,
  setDefaultLocale,
} from '../src/index';
import type { Locale } from '../src/index';

afterEach(() => setDefaultLocale('en'));

describe('locales', () => {
  test('supported locales', () => {
    expect(locales).toEqual(['en', 'es', 'zh-CN', 'zh-TW']);
    expect(getDefaultLocale()).toBe('en');
  });

  test('setDefaultLocale accepts locale aliases', () => {
    const aliases: [string, Locale][] = [
      ['zh', 'zh-CN'],
      ['zh-Hans', 'zh-CN'],
      ['zh-SG', 'zh-CN'],
      ['zh-Hant', 'zh-TW'],
      ['zh-HK', 'zh-TW'],
      ['zh-MO', 'zh-TW'],
      ['zh_tw', 'zh-TW'],
      ['es-MX', 'es'],
      ['EN-gb', 'en'],
    ];
    for (const [alias, locale] of aliases) {
      setDefaultLocale(alias as Locale);
      expect(getDefaultLocale()).toBe(locale);
    }
    expect(() => setDefaultLocale('fr' as Locale)).toThrow(RangeError);
  });

  test('the default locale names things', () => {
    setDefaultLocale('es');
    expect(getName('US')).toBe('Estados Unidos');
    expect(searchFlags('DE-BY')[0]).toMatchObject({ iso: 'DE-BY', name: 'Baviera' });
    setDefaultLocale('zh-TW');
    expect(getName('DE-BY')).toBe('巴伐利亞');
  });
});

describe('getName / getNames', () => {
  test('country and subdivision names per locale', () => {
    expect(getName('US', 'zh-CN')).toBe('美国');
    expect(getName('us', 'zh-TW')).toBe('美國');
    expect(getName('DE-BY', 'es')).toBe('Baviera');
    expect(getName('de_by')).toBe('Bavaria');
    expect(getName('XX-NOPE')).toBeUndefined();
  });

  test('fallbacks: zh-TW -> zh-CN -> en, es -> en', () => {
    expect(getName('AD-08', 'zh-TW')).toBe(getName('AD-08', 'zh-CN')); // no zh-TW name
    expect(getName('AD-08', 'zh-TW')).not.toBe(getName('AD-08', 'en'));
    expect(getName('MW-SA', 'es')).toBe('Salima'); // no es name: en
    expect(getName('AL-MM', 'zh-TW')).toBe(getName('AL-MM', 'en')); // en only
    expect(getName('US', 'zh-Hans' as Locale)).toBe('美国');
  });

  test('getNames lists the locales that have a name', () => {
    expect(getNames('US')).toEqual({ en: 'United States', es: 'Estados Unidos', 'zh-CN': '美国', 'zh-TW': '美國' });
    expect(Object.keys(getNames('MW-SA'))).not.toContain('es');
    expect(getNames('XX-NOPE')).toEqual({});
  });
});

describe('getIsoCode', () => {
  test('per locale', () => {
    expect(getIsoCode('Estados Unidos', { locale: 'es' })).toBe('US');
    expect(getIsoCode('Baviera', { locale: 'es' })).toBe('DE-BY');
    expect(getIsoCode('加利福尼亚州', { locale: 'zh-CN' })).toBe('US-CA');
    expect(getIsoCode('加利福尼亞州', { locale: 'zh-TW' })).toBe('US-CA');
    expect(getIsoCode('巴伐利亞', { locale: 'zh-TW' })).toBe('DE-BY');
  });

  test('falls back to every locale and English aliases, ignoring case and accents', () => {
    expect(getIsoCode('Estados Unidos')).toBe('US');
    expect(getIsoCode('BAVIERA')).toBe('DE-BY');
    expect(getIsoCode('golden state')).toBe('US-CA');
    expect(getIsoCode('Cordoba', { country: 'AR' })).toBe('AR-X');
  });

  test('country restricts the match to its subdivisions', () => {
    expect(getIsoCode('Córdoba', { country: 'AR' })).toBe('AR-X');
    expect(getIsoCode('Córdoba', { country: 'Spain' })).toBe('ES-CO');
    expect(getIsoCode('Córdoba', { country: 'España', locale: 'es' })).toBe('ES-CO');
    expect(getIsoCode('California', { country: 'MX' })).toBeUndefined();
    expect(getIsoCode('Atlantis')).toBeUndefined();
  });

  test('locale option of the flag functions', () => {
    expect(resolveFlag('美国', '加利福尼亚州', { locale: 'zh-CN' }).key).toBe('US/CA');
    expect(resolveFlag('Alemania', 'Baviera', { locale: 'es-ES' as Locale }).key).toBe('DE/BY');
  });
});

describe('searchFlags', () => {
  test('by name', () => {
    const results = searchFlags('California');
    expect(results[0]).toEqual({ iso: 'US-CA', name: 'California', country: 'US', matched: 'California', score: 6 });
    expect(results.map(r => r.iso)).toContain('MX-BCN'); // Baja California
  });

  test('by alias', () => {
    expect(searchFlags('golden state')[0]).toMatchObject({ iso: 'US-CA', matched: 'golden state', score: 6 });
  });

  test('by Chinese name', () => {
    expect(searchFlags('加利福尼亚')[0]).toMatchObject({ iso: 'US-CA', matched: '加利福尼亚州', score: 4 });
    expect(searchFlags('巴伐利亞')[0]).toMatchObject({ iso: 'DE-BY', score: 6 });
    expect(searchFlags('加利福尼亚', { locale: 'zh-CN' })[0]).toMatchObject({ iso: 'US-CA', name: '加利福尼亚州' });
  });

  test('by ISO code', () => {
    expect(searchFlags('us-ca')[0]).toMatchObject({ iso: 'US-CA', matched: 'US-CA', score: 6 });
    expect(searchFlags('DE')[0]).toMatchObject({ iso: 'DE', score: 6 });
  });

  test("a country match returns the country's subdivisions too", () => {
    const results = searchFlags('Andorra');
    expect(results[0]).toMatchObject({ iso: 'AD', score: 6 });
    const subdivisions = results.filter(r => r.country === 'AD' && r.iso !== 'AD');
    expect(subdivisions.map(r => r.iso)).toContain('AD-02');
    expect(subdivisions.every(r => r.score === 5 && r.matched === 'Andorra')).toBe(true);
  });

  test('limit and country filter', () => {
    expect(searchFlags('a', { limit: 5 })).toHaveLength(5);
    expect(searchFlags('a', { limit: 0 })).toEqual([]);
    const cordoba = searchFlags('Córdoba', { country: 'AR' });
    expect(cordoba[0]).toMatchObject({ iso: 'AR-X', score: 6 });
    expect(cordoba.every(r => r.country === 'AR')).toBe(true);
  });

  test('empty term', () => {
    expect(searchFlags('')).toEqual([]);
    expect(searchFlags('   ')).toEqual([]);
  });

  test('covers the codes this package has artwork for (own or polyfilled)', () => {
    expect(searchFlags('Lesotho')).toEqual([]); // no Lesotho artwork in the package
    const results = searchFlags('Naxçıvan');
    expect(results.map(r => r.iso)).toContain('AZ-NX');
    for (const { iso } of results) expect(resolveFlag(iso).key).toBeTruthy();
  });
});
