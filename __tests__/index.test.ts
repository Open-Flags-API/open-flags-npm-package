import '../src/national'; // open-flags/national: every national flag, synchronously
import '../src/generated/countries/US';
import '../src/generated/countries/AZ';
import { flagLoaders } from '../flags';
import isoMapping from '../src/iso-mapping.json';
import coaMapping from '../src/iso-coa-mapping.json';
import namedMapping from '../src/named-mapping.json';
import { artworkKey } from '../src/core/iso';
import {
  getAllFlags,
  getCoatOfArmsSvg,
  getFlagSvg,
  getFlagsByCountry,
  isFlagLoaded,
  resolveFlag,
} from '../src/index';
import type { FlagVariant, IsoMapping, Locale } from '../src/index';
import { DATA_URI, decodeSvg, keyArgs } from './helpers';

describe('getFlagSvg function', () => {
  test('should return correct SVG for a given flag', () => {
    const svg = getFlagSvg('usa', 'california');
    expect(svg).toMatch(DATA_URI);
    expect(decodeSvg(svg)).toContain('<svg');
  });

  test('should throw an error for an unknown flag', () => {
    expect(() => {
      getFlagSvg('unknown', 'flag');
    }).toThrow('SVG not found for unknown-flag');
  });
});

describe('getFlagSvg: inputs', () => {
  test('ISO pair or code, in any case, padded or underscored', () => {
    const svg = getFlagSvg('US', 'CA');
    expect(getFlagSvg('US-CA')).toBe(svg);
    expect(getFlagSvg('US-CA', null)).toBe(svg);
    expect(getFlagSvg('us', 'ca')).toBe(svg);
    expect(getFlagSvg(' us_ca ')).toBe(svg);
    expect(getFlagSvg('US', 'US-CA')).toBe(svg);
    expect(resolveFlag('US', 'CA')).toEqual({
      iso: 'US-CA',
      key: 'US/CA',
      resolvedIso: 'US-CA',
      variant: 'flag',
      polyfill: null,
      status: 'current',
    });
  });

  test('0.0.5 legacy names', () => {
    expect(getFlagSvg('usa', 'california')).toBe(getFlagSvg('US', 'CA'));
    expect(getFlagSvg('USA', 'USA')).toBe(getFlagSvg('US'));
    expect(resolveFlag('brazil', 'acre').key).toBe('BR/AC');
    expect(resolveFlag('germany', 'bayern').key).toBe('DE/BY');
    expect(resolveFlag('england', 'cornwall').key).toBe('GB/CON');
  });

  test('English and localized names', () => {
    const svg = getFlagSvg('US', 'CA');
    expect(getFlagSvg('United States', 'California')).toBe(svg);
    expect(getFlagSvg('Estados Unidos', 'California')).toBe(svg);
    expect(getFlagSvg('美国', '加利福尼亚州', { locale: 'zh-CN' })).toBe(svg);
    expect(getFlagSvg('美國', '加利福尼亞州', { locale: 'zh-Hant' as Locale })).toBe(svg);
    expect(getFlagSvg('California')).toBe(svg);
  });

  test('national flags once open-flags/national is imported', () => {
    expect(isFlagLoaded('FR')).toBe(true); // registered by open-flags/national; open-flags/countries/FR is not imported
    expect(getFlagSvg('FR')).toMatch(DATA_URI);
    expect(getFlagSvg('France')).toBe(getFlagSvg('fr', null));
    expect(getFlagSvg('Francia')).toBe(getFlagSvg('FR'));
  });

  test('extras are exact keys', () => {
    const extra = {
      iso: null,
      key: 'CA-governor-general',
      resolvedIso: null,
      variant: 'flag',
      polyfill: null,
      status: 'current',
    };
    expect(resolveFlag('CA-governor-general')).toEqual(extra);
    expect(resolveFlag('ca', 'Governor-General')).toEqual(extra);
    expect(resolveFlag('CA-governor-general', null, { variant: 'coat' })).toEqual(extra);
    expect(resolveFlag('england', 'bedfordshire').key).toBe('GB-bedfordshire'); // 0.0.5 name of an extra
  });

  test('subdivision variants are exact keys', () => {
    expect(resolveFlag('US', 'GA-Classic')).toEqual({
      iso: null,
      key: 'US/GA-Classic',
      resolvedIso: null,
      variant: 'flag',
      polyfill: null,
      status: 'current',
    });
    expect(getFlagSvg('us/ga-classic')).toBe(getFlagSvg('US', 'GA-Classic'));
    expect(getFlagSvg('usa', 'georgiaClassic')).toBe(getFlagSvg('US', 'GA-Classic')); // 0.0.5 name
    expect(getFlagSvg('US', 'GA-Classic')).not.toBe(getFlagSvg('US', 'GA'));
    expect(resolveFlag('KR', '26-pre-2023').key).toBe('KR/26-pre-2023');
  });

  test('Windows-reserved file names keep the ISO key', () => {
    expect(resolveFlag('GB', 'CON').key).toBe('GB/CON'); // stored as flags/GB/CON_.svg
    expect(getAllFlags()).toContain('GB/CON');
    expect(getAllFlags()).not.toContain('GB/CON_');
  });
});

describe('polyfills', () => {
  const mapping = isoMapping as IsoMapping;

  test('regional: the closest ancestor region with artwork', () => {
    // src/iso-mapping.json: Babək (AZ-BAB) has no flag; its parent region Naxçıvan (AZ-NX) has one.
    expect(mapping['AZ-BAB']).toEqual({ country: 'AZ', subdivision: 'NX', polyfill: 'regional' });
    expect(resolveFlag('AZ', 'BAB')).toEqual({
      iso: 'AZ-BAB',
      key: 'AZ/NX',
      resolvedIso: 'AZ-NX',
      variant: 'flag',
      polyfill: 'regional',
      status: 'current',
    });
    expect(getFlagSvg('AZ-BAB')).toBe(getFlagSvg('AZ', 'NX'));
  });

  test('national: the country flag', () => {
    // src/iso-mapping.json: Canillo (AD-02) has no artwork and no parent region.
    expect(mapping['AD-02']).toEqual({ country: 'AD', subdivision: null, polyfill: 'national' });
    expect(resolveFlag('AD-02')).toEqual({
      iso: 'AD-02',
      key: 'AD',
      resolvedIso: 'AD',
      variant: 'flag',
      polyfill: 'national',
      status: 'current',
    });
    expect(getFlagSvg('Andorra', 'Canillo')).toBe(getFlagSvg('AD'));
  });

  test('codes that are not current report their status', () => {
    expect(resolveFlag('AL-MM')).toMatchObject({ key: 'AL', polyfill: 'national', status: 'withdrawn' });
    expect(resolveFlag('BA-01')).toMatchObject({ key: 'BA/01', polyfill: null, status: 'withdrawn' });
  });

  test('polyfill: false treats a polyfilled code as missing', () => {
    expect(() => getFlagSvg('AD-02', null, { polyfill: false })).toThrow('SVG not found for AD-02-null');
    expect(() => getFlagSvg('AZ', 'BAB', { polyfill: false })).toThrow('SVG not found for AZ-BAB');
    expect(() => resolveFlag('AZ-BAB', undefined, { polyfill: false })).toThrow('SVG not found for AZ-BAB-null');
    expect(getFlagSvg('US', 'CA', { polyfill: false })).toBe(getFlagSvg('US', 'CA'));
  });
});

describe('coats of arms', () => {
  test('getCoatOfArmsSvg is the coat variant', () => {
    const coat = getCoatOfArmsSvg('US', 'AK');
    expect(coat).toMatch(DATA_URI);
    expect(coat).not.toBe(getFlagSvg('US', 'AK'));
    expect(getFlagSvg('US', 'AK', { variant: 'coat' })).toBe(coat);
    expect(getCoatOfArmsSvg('Estados Unidos', 'Alaska')).toBe(coat);
    expect(resolveFlag('US', 'AK', { variant: 'coat' })).toEqual({
      iso: 'US-AK',
      key: 'US/AK-COA',
      resolvedIso: 'US-AK',
      variant: 'coat',
      polyfill: null,
      status: 'current',
    });
  });

  test('regional coat polyfill and national coats', () => {
    expect(resolveFlag('AZ-BAB', null, { variant: 'coat' })).toMatchObject({ key: 'AZ/NX-COA', polyfill: 'regional' });
    expect(getCoatOfArmsSvg('AZ-BAB')).toBe(getCoatOfArmsSvg('AZ', 'NX'));
    expect(resolveFlag('DE', null, { variant: 'coat' })).toMatchObject({ key: 'DE-COA', resolvedIso: 'DE', polyfill: null });
  });

  test('a code without a coat of arms', () => {
    expect(() => getCoatOfArmsSvg('US')).toThrow('SVG not found for US-null');
    expect(() => getCoatOfArmsSvg('US', 'CA')).toThrow('SVG not found for US-CA');
  });

  test('0.0.5 names of coats of arms are served as-is', () => {
    const michoacan = { iso: 'MX-MIC', key: 'MX/MIC-COA', resolvedIso: 'MX-MIC', variant: 'coat', polyfill: null };
    expect(resolveFlag('mexico', 'michoacán')).toMatchObject(michoacan);
    expect(resolveFlag('mexico', 'michoacán', { variant: 'coat', polyfill: false })).toMatchObject(michoacan);
    expect(resolveFlag('MX', 'MIC')).toMatchObject({ key: 'MX', polyfill: 'national' }); // no flag of its own
  });

  test('unknown variant', () => {
    expect(() => getFlagSvg('US', null, { variant: 'banner' as FlagVariant })).toThrow(RangeError);
  });
});

describe('flags that are not loaded', () => {
  test('known but not loaded: names the key and how to load it', () => {
    expect(isFlagLoaded('CA', 'AB')).toBe(false);
    expect(() => getFlagSvg('CA', 'AB')).toThrow(
      "Flag 'CA/AB' is not loaded: load it with loadFlagSvg() first, or import 'open-flags/countries/CA' or 'open-flags/all' to make it available synchronously"
    );
    expect(() => getCoatOfArmsSvg('DE', 'BY')).toThrow(/^Flag 'DE\/BY-COA' is not loaded: .*'open-flags\/countries\/DE'/);
    expect(() => getFlagSvg('CA-governor-general')).toThrow(/^Flag 'CA-governor-general' is not loaded/);
  });

  test('isFlagLoaded', () => {
    expect(isFlagLoaded('US', 'CA')).toBe(true);
    expect(isFlagLoaded('US', 'AK', { variant: 'coat' })).toBe(true);
    expect(isFlagLoaded('AD-02')).toBe(true); // polyfilled by the national flag
    expect(isFlagLoaded('AD-02', null, { polyfill: false })).toBe(false);
    expect(isFlagLoaded('unknown', 'flag')).toBe(false);
    expect(() => isFlagLoaded('US', null, { variant: 'banner' as FlagVariant })).toThrow(RangeError);
    expect(() => isFlagLoaded('US', null, { locale: 'fr' as Locale })).toThrow(RangeError);
  });
});

describe('open-flags/countries/<CC>', () => {
  test('registers every key of the country', () => {
    const keys = getFlagsByCountry('US');
    expect(keys).toContain('US/GA-Classic');
    const missing = keys.filter(key => !isFlagLoaded(...keyArgs(key)));
    expect(missing).toEqual([]);
    for (const key of keys) expect(decodeSvg(getFlagSvg(...keyArgs(key)))).toMatch(/<(\w+:)?svg[\s>]/); // US/MS: <svg:svg>
  });
});

describe('catalog', () => {
  test('getAllFlags lists every key, sorted, as a copy', () => {
    const flags = getAllFlags();
    expect(flags).toHaveLength(Object.keys(flagLoaders).length);
    expect(flags).toEqual([...flags].sort());
    expect(flags).toEqual(expect.arrayContaining(['US', 'US/CA', 'US/AK-COA', 'DE-COA', 'CA-governor-general', 'US/GA-Classic']));
    flags.length = 0;
    expect(getAllFlags()).toHaveLength(Object.keys(flagLoaders).length);
  });

  test('getFlagsByCountry matches the country code exactly', () => {
    expect(getFlagsByCountry('C')).toEqual([]); // 0.0.5 matched every key starting with 'C' (CA, CH, CN, ...)
    const canada = getFlagsByCountry('CA');
    expect(canada).toEqual(expect.arrayContaining(['CA', 'CA/AB', 'CA/AB-COA', 'CA-governor-general']));
    expect(canada.every(key => key === 'CA' || key.startsWith('CA/') || key.startsWith('CA-'))).toBe(true);
    expect(canada).toEqual(getAllFlags().filter(key => /^CA($|[/-])/.test(key)));
  });

  test('getFlagsByCountry accepts names in any locale and aliases', () => {
    const canada = getFlagsByCountry('CA');
    expect(getFlagsByCountry('ca')).toEqual(canada);
    expect(getFlagsByCountry('Canada')).toEqual(canada);
    expect(getFlagsByCountry('Canadá')).toEqual(canada);
    expect(getFlagsByCountry('加拿大')).toEqual(canada);
    expect(getFlagsByCountry('uk')).toEqual(getFlagsByCountry('GB'));
    expect(getFlagsByCountry('Atlantis')).toEqual([]);
    expect(getFlagsByCountry('US-CA')).toEqual([]);
  });

  test('every key is reachable through the public API', () => {
    const unreachable = getAllFlags().filter(key => resolveFlag(...keyArgs(key)).key !== key);
    expect(unreachable).toEqual([]);
  });

  test('every mapping location is a key with a loader', () => {
    const missing: string[] = [];
    const check = (mapping: IsoMapping, variant: FlagVariant) => {
      for (const [code, location] of Object.entries(mapping)) {
        if (!(artworkKey(location, variant) in flagLoaders)) missing.push(`${code} -> ${artworkKey(location, variant)}`);
      }
    };
    check(isoMapping as IsoMapping, 'flag');
    check(coaMapping as IsoMapping, 'coat');
    check(namedMapping as IsoMapping, 'flag');
    expect(missing).toEqual([]);
  });
});
