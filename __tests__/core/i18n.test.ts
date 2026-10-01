import {
  findIsoCodes,
  getCountryCode,
  getDefaultLocale,
  getIsoCode,
  getName,
  getNames,
  listIsoCodes,
  locales,
  resolveLocale,
  setDefaultLocale,
} from '../../src/core/i18n';
import type { Locale } from '../../src/core/types';

afterEach(() => setDefaultLocale('en'));

describe('locales', () => {
  test('lists the supported locales, read-only', () => {
    expect(locales).toEqual(['en', 'es', 'zh-CN', 'zh-TW']);
    expect(Object.isFrozen(locales)).toBe(true);
  });

  test('default locale is en and can be changed (aliases accepted)', () => {
    expect(getDefaultLocale()).toBe('en');
    expect(getName('US')).toBe('United States');
    setDefaultLocale('es');
    expect(getDefaultLocale()).toBe('es');
    expect(getName('US')).toBe('Estados Unidos');
    setDefaultLocale('zh-Hant' as Locale);
    expect(getDefaultLocale()).toBe('zh-TW');
    expect(getName('US')).toBe('美國');
  });

  test('an unsupported default locale throws a RangeError and changes nothing', () => {
    setDefaultLocale('es');
    expect(() => setDefaultLocale('fr' as Locale)).toThrow(RangeError);
    expect(getDefaultLocale()).toBe('es');
  });
});

describe('resolveLocale', () => {
  test('accepts the supported locales, case-insensitively', () => {
    expect(resolveLocale('en')).toBe('en');
    expect(resolveLocale('ES')).toBe('es');
    expect(resolveLocale('zh-cn')).toBe('zh-CN');
    expect(resolveLocale('ZH-TW')).toBe('zh-TW');
  });

  test('maps Chinese aliases onto zh-CN / zh-TW', () => {
    expect(resolveLocale('zh')).toBe('zh-CN');
    expect(resolveLocale('zh-Hans')).toBe('zh-CN');
    expect(resolveLocale('zh-SG')).toBe('zh-CN');
    expect(resolveLocale('zh-hans-cn')).toBe('zh-CN');
    expect(resolveLocale('zh-Hant')).toBe('zh-TW');
    expect(resolveLocale('zh-HK')).toBe('zh-TW');
    expect(resolveLocale('zh-MO')).toBe('zh-TW');
    expect(resolveLocale('ZH-HANT-HK')).toBe('zh-TW');
  });

  test('maps regional English and Spanish onto en / es', () => {
    expect(resolveLocale('es-MX')).toBe('es');
    expect(resolveLocale('es-419')).toBe('es');
    expect(resolveLocale('en-GB')).toBe('en');
    expect(resolveLocale('EN-us')).toBe('en');
    expect(resolveLocale(' en_US ')).toBe('en');
  });

  test('throws a RangeError for anything else', () => {
    for (const input of ['fr', 'de-DE', 'pt-BR', 'zh-Latn', 'zh-US', 'eng', 'english', 'all', '', '  ']) {
      expect(() => resolveLocale(input)).toThrow(RangeError);
    }
    expect(() => resolveLocale('fr')).toThrow("Unsupported locale 'fr'");
  });
});

describe('getName', () => {
  test('2-letter codes give country names, longer codes subdivision names', () => {
    expect(getName('US')).toBe('United States');
    expect(getName('us', 'es')).toBe('Estados Unidos');
    expect(getName('US', 'zh-CN')).toBe('美国');
    expect(getName('US', 'zh-TW')).toBe('美國');
    expect(getName('US-CA')).toBe('California');
    expect(getName('us_ca', 'zh-TW')).toBe('加利福尼亞州');
  });

  test('zh-TW falls back to zh-CN (AF-BDS has no zh-TW name)', () => {
    expect(getNames('AF-BDS')['zh-TW']).toBeUndefined();
    expect(getNames('AF-BDS')['zh-CN']).toBe('巴达赫尚省');
    expect(getName('AF-BDS', 'zh-TW')).toBe('巴达赫尚省');
  });

  test('zh-TW falls back to en when zh-CN is missing too (AM-AG)', () => {
    const names = getNames('AM-AG');
    expect(names['zh-TW']).toBeUndefined();
    expect(names['zh-CN']).toBeUndefined();
    expect(getName('AM-AG', 'zh-TW')).toBe(names.en);
  });

  test('zh-CN falls back to en, not to zh-TW (CH-ZH only has zh-TW)', () => {
    expect(getNames('CH-ZH')['zh-TW']).toBe('蘇黎世');
    expect(getName('CH-ZH', 'zh-CN')).toBe('Zürich');
  });

  test('es falls back to en (BA-03 and the country CS have no Spanish name)', () => {
    expect(getNames('BA-03').es).toBeUndefined();
    expect(getName('BA-03', 'es')).toBe('Tuzla Canton');
    expect(getNames('CS').es).toBeUndefined();
    expect(getName('CS', 'es')).toBe('Serbia and Montenegro');
  });

  test('unknown codes give undefined', () => {
    expect(getName('XX')).toBeUndefined();
    expect(getName('US-XX')).toBeUndefined();
    expect(getName('')).toBeUndefined();
    expect(getName('_countries')).toBeUndefined();
  });

  test('an unsupported locale throws a RangeError', () => {
    expect(() => getName('US', 'fr' as Locale)).toThrow(RangeError);
  });
});

describe('getNames', () => {
  test('returns every locale that has a name', () => {
    expect(getNames('US')).toEqual({ en: 'United States', es: 'Estados Unidos', 'zh-CN': '美国', 'zh-TW': '美國' });
    expect(Object.keys(getNames('BA-03'))).toEqual(['en']);
  });

  test('unknown codes give an empty object; the result is a copy', () => {
    expect(getNames('XX')).toEqual({});
    const names = getNames('US');
    names.en = 'changed';
    expect(getName('US')).toBe('United States');
  });
});

describe('getIsoCode', () => {
  test('matches English names exactly after normalization', () => {
    expect(getIsoCode('United States')).toBe('US');
    expect(getIsoCode('california')).toBe('US-CA');
    expect(getIsoCode('  NEW   york ')).toBe('US-NY');
    expect(getIsoCode('Cal')).toBeUndefined();
  });

  test('matches Spanish names, accents typed or not', () => {
    expect(getIsoCode('Alemania', { locale: 'es' })).toBe('DE');
    expect(getIsoCode('Japón', { locale: 'es' })).toBe('JP');
    expect(getIsoCode('japon', { locale: 'es' })).toBe('JP');
    expect(getIsoCode('belgica', { locale: 'es' })).toBe('BE');
    expect(getIsoCode('Ciudad de Mexico', { locale: 'es' })).toBe('MX-CMX');
    expect(getIsoCode('Pais Vasco', { locale: 'es' })).toBe('ES-PV');
  });

  test('matches Chinese names (simplified and traditional)', () => {
    expect(getIsoCode('美国', { locale: 'zh-CN' })).toBe('US');
    expect(getIsoCode('美國', { locale: 'zh-TW' })).toBe('US');
    expect(getIsoCode('加利福尼亚州', { locale: 'zh-CN' })).toBe('US-CA');
    expect(getIsoCode('加利福尼亞州', { locale: 'zh-TW' })).toBe('US-CA');
    expect(getIsoCode('加泰隆尼亞', { locale: 'zh-TW' })).toBe('ES-CT');
  });

  test('tries the requested locale first, then every locale', () => {
    // 'Granada' is the Spanish name of Grenada (GD) and the English name of a Spanish province (ES-GR).
    expect(getIsoCode('Granada')).toBe('ES-GR');
    expect(getIsoCode('Granada', { locale: 'es' })).toBe('GD');
    expect(getIsoCode('San Martin')).toBe('PE-SAM');
    expect(getIsoCode('San Martin', { locale: 'es' })).toBe('FR-MF');
    // Not an English name: found in the other tables.
    expect(getIsoCode('美国')).toBe('US');
    expect(getIsoCode('Alemania', { locale: 'all' })).toBe('DE');
    setDefaultLocale('es');
    expect(getIsoCode('Granada')).toBe('GD');
  });

  test('country restricts the match to that country’s subdivisions', () => {
    expect(getIsoCode('Georgia')).toBe('GE');
    expect(getIsoCode('Georgia', { country: 'US' })).toBe('US-GA');
    expect(getIsoCode('georgia', { country: 'us' })).toBe('US-GA');
    expect(getIsoCode('Georgia', { country: 'United States' })).toBe('US-GA');
    expect(getIsoCode('Georgia', { country: 'Estados Unidos', locale: 'es' })).toBe('US-GA');
    expect(getIsoCode('Granada', { country: 'NI' })).toBe('NI-GR');
    expect(getIsoCode('United States', { country: 'US' })).toBeUndefined();
    expect(getIsoCode('California', { country: 'MX' })).toBeUndefined();
    expect(getIsoCode('California', { country: 'Atlantis' })).toBeUndefined();
  });

  test('matches English aliases', () => {
    expect(getIsoCode('usa')).toBe('US');
    expect(getIsoCode('Deutschland')).toBe('DE');
    expect(getIsoCode('golden state')).toBe('US-CA');
    expect(getIsoCode('GOLDEN_STATE', { country: 'US' })).toBe('US-CA');
    expect(getIsoCode('golden state', { country: 'MX' })).toBeUndefined();
  });

  test('unknown or empty names give undefined', () => {
    expect(getIsoCode('Atlantis')).toBeUndefined();
    expect(getIsoCode('')).toBeUndefined();
    expect(getIsoCode('   ')).toBeUndefined();
  });

  test('builds each reverse index lazily, once per locale', () => {
    jest.isolateModules(() => {
      const normalize = require('../../src/core/normalize') as typeof import('../../src/core/normalize');
      const i18n = require('../../src/core/i18n') as typeof import('../../src/core/i18n');
      const spy = jest.spyOn(normalize, 'normalizeText');
      expect(i18n.getName('US-CA', 'es')).toBe('California');
      expect(spy).not.toHaveBeenCalled();
      expect(i18n.getIsoCode('Alemania', { locale: 'es' })).toBe('DE');
      expect(spy.mock.calls.length).toBeGreaterThan(1000); // the term + every Spanish name
      spy.mockClear();
      expect(i18n.getIsoCode('Francia', { locale: 'es' })).toBe('FR');
      expect(spy).toHaveBeenCalledTimes(1); // the term only
      spy.mockRestore();
    });
  });
});

describe('findIsoCodes / getCountryCode / listIsoCodes', () => {
  test('findIsoCodes lists every candidate: countries first, then code order', () => {
    expect(findIsoCodes('Luxembourg')).toEqual(['LU', 'BE-WLX', 'LU-LU']);
    expect(findIsoCodes('Madrid', 'es', code => code.startsWith('ES-'))).toEqual(['ES-M', 'ES-MD']);
    expect(findIsoCodes('nowhere')).toEqual([]);
  });

  test('getCountryCode takes a code, a name in any locale or an alias', () => {
    expect(getCountryCode('us')).toBe('US');
    expect(getCountryCode('Estados Unidos')).toBe('US');
    expect(getCountryCode('美国')).toBe('US');
    expect(getCountryCode('usa')).toBe('US');
    expect(getCountryCode('California')).toBeUndefined();
    expect(getCountryCode('XX')).toBeUndefined();
  });

  test('listIsoCodes lists every named code in code order', () => {
    const codes = listIsoCodes();
    expect(codes.length).toBeGreaterThan(5000);
    expect(codes).toContain('US');
    expect(codes).toContain('US-CA');
    expect([...codes].sort()).toEqual(codes);
  });
});
