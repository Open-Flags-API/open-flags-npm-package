import fs from 'fs';
import path from 'path';
import isoMapping from '../../src/iso-mapping.json';
import coaMapping from '../../src/iso-coa-mapping.json';
import namedMapping from '../../src/named-mapping.json';
import apiIsoMapping from '../../packages/open-flags-api/src/generated/iso-mapping.json';
import apiCoaMapping from '../../packages/open-flags-api/src/generated/iso-coa-mapping.json';
import { getIsoCode } from '../../src/core/i18n';
import { artworkKey, createResolver, isExtraKey } from '../../src/core/iso';
import type { FlagVariant, IsoMapping } from '../../src/core/types';

const flag = isoMapping as IsoMapping;
const coat = coaMapping as IsoMapping;
const named = namedMapping as IsoMapping;
// Extras as the local package derives them: top-level <CC>-<slug> artwork in flags/.
const extras = fs
  .readdirSync(path.join(__dirname, '../../flags'))
  .filter(file => file.endsWith('.svg'))
  .map(file => file.slice(0, -'.svg'.length))
  .filter(isExtraKey);
const { parse, resolve } = createResolver({ flag, coat, named, extras });

const US_CA = { iso: 'US-CA', key: 'US/CA', resolvedIso: 'US-CA', variant: 'flag', polyfill: null, status: 'current' };

describe('resolve: ISO codes', () => {
  test('ISO pair', () => {
    expect(resolve('US', 'CA')).toEqual(US_CA);
  });

  test('ISO code', () => {
    expect(resolve('US-CA')).toEqual(US_CA);
    expect(resolve('US-CA', null)).toEqual(US_CA);
    expect(resolve('US', 'US-CA')).toEqual(US_CA);
  });

  test('lowercase, padded or underscored input', () => {
    expect(resolve('us', 'ca')).toEqual(US_CA);
    expect(resolve(' us-ca ')).toEqual(US_CA);
    expect(resolve('us_ca')).toEqual(US_CA);
  });

  test('country only', () => {
    const us = { iso: 'US', key: 'US', resolvedIso: 'US', variant: 'flag', polyfill: null, status: 'current' };
    expect(resolve('US')).toEqual(us);
    expect(resolve('us', null)).toEqual(us);
    expect(resolve('US', undefined)).toEqual(us);
  });

  test('numeric suffixes and Windows-reserved suffixes keep the ISO key', () => {
    expect(resolve('FR', '01').key).toBe('FR/01');
    expect(resolve('KR-11').key).toBe('KR/11');
    expect(resolve('GB', 'CON').key).toBe('GB/CON'); // stored as flags/GB/CON_.svg
  });

  test('status is reported for codes that are not current', () => {
    expect(resolve('BA-01')).toMatchObject({ key: 'BA/01', status: 'withdrawn', polyfill: null });
  });
});

describe('resolve: polyfills', () => {
  test('regional polyfill (FR-13 Bouches-du-Rhône -> its region FR-PAC)', () => {
    expect(flag['FR-13']).toEqual({ country: 'FR', subdivision: 'PAC', polyfill: 'regional' });
    expect(resolve('FR', '13')).toEqual({
      iso: 'FR-13',
      key: 'FR/PAC',
      resolvedIso: 'FR-PAC',
      variant: 'flag',
      polyfill: 'regional',
      status: 'current',
    });
  });

  test('national polyfill (AF-BDS Badakhshān -> AF)', () => {
    expect(flag['AF-BDS']).toEqual({ country: 'AF', subdivision: null, polyfill: 'national' });
    expect(resolve('AF-BDS')).toEqual({
      iso: 'AF-BDS',
      key: 'AF',
      resolvedIso: 'AF',
      variant: 'flag',
      polyfill: 'national',
      status: 'current',
    });
  });

  test('polyfill: false treats a polyfilled entry as missing', () => {
    expect(() => resolve('AF-BDS', null, { polyfill: false })).toThrow(new Error('SVG not found for AF-BDS-null'));
    expect(() => resolve('FR', '13', { polyfill: false })).toThrow(new Error('SVG not found for FR-13'));
    expect(resolve('US', 'CA', { polyfill: false })).toEqual(US_CA);
  });
});

describe('resolve: coats of arms', () => {
  test('variant coat uses the coat mapping', () => {
    expect(resolve('MX', 'CAM', { variant: 'coat' })).toEqual({
      iso: 'MX-CAM',
      key: 'MX/CAM-COA',
      resolvedIso: 'MX-CAM',
      variant: 'coat',
      polyfill: null,
      status: 'current',
    });
    expect(resolve('DE', null, { variant: 'coat' }).key).toBe('DE-COA');
    expect(resolve('AZ-BAB', null, { variant: 'coat' })).toMatchObject({ key: 'AZ/NX-COA', polyfill: 'regional' });
  });

  test('a code without a coat of arms is not found', () => {
    expect(() => resolve('US', null, { variant: 'coat' })).toThrow(new Error('SVG not found for US-null'));
  });
});

describe('resolve: extras', () => {
  test('extra flags are served by key, case-insensitively', () => {
    expect(extras).toContain('CA-governor-general');
    const expected = {
      iso: null,
      key: 'CA-governor-general',
      resolvedIso: null,
      variant: 'flag',
      polyfill: null,
      status: 'current',
    };
    expect(resolve('CA-governor-general')).toEqual(expected);
    expect(resolve('ca-GOVERNOR-general')).toEqual(expected);
    expect(resolve('CA', 'governor-general')).toEqual(expected);
    expect(resolve('CA-governor-general', null, { variant: 'coat', polyfill: false })).toEqual(expected);
  });
});

describe('resolve: 0.0.5 legacy names', () => {
  test('usa/california, brazil/brazil, england/bedfordshire', () => {
    expect(resolve('usa', 'california')).toEqual(US_CA);
    expect(resolve('USA', 'California')).toEqual(US_CA);
    expect(resolve('brazil', 'brazil')).toMatchObject({ iso: 'BR', key: 'BR', resolvedIso: 'BR', polyfill: null });
    expect(resolve('england', 'bedfordshire')).toEqual({
      iso: null,
      key: 'GB-bedfordshire',
      resolvedIso: null,
      variant: 'flag',
      polyfill: null,
      status: 'current',
    });
  });

  test('a legacy coat-of-arms alias is served as-is, whatever the variant', () => {
    const michoacan = {
      iso: 'MX-MIC',
      key: 'MX/MIC-COA',
      resolvedIso: 'MX-MIC',
      variant: 'coat',
      polyfill: null,
      status: 'current',
    };
    expect(named['MEXICO-MICHOACÁN']).toEqual({ country: 'MX', subdivision: 'MIC-COA' });
    expect(resolve('mexico', 'michoacán')).toEqual(michoacan);
    expect(resolve('mexico', 'michoacán', { variant: 'flag' })).toEqual(michoacan);
    expect(resolve('mexico', 'michoacán', { variant: 'coat' })).toEqual(michoacan);
    expect(resolve('mexico', 'michoacán', { polyfill: false })).toEqual(michoacan);
    // The ISO code itself has no flag of its own (national polyfill): the legacy hit is not polyfilled.
    expect(resolve('MX', 'MIC')).toMatchObject({ key: 'MX', polyfill: 'national' });
    expect(resolve('germany', 'coa-germany')).toMatchObject({ iso: 'DE', key: 'DE-COA', variant: 'coat' });
  });

  test('a legacy name keeps its 0.0.5 artwork when the English name would only be a polyfill', () => {
    // 0.0.5 served MX/CAM-COA for mexico/campeche. MEXICO-CAMPECHE is also the English name of MX-CAM,
    // which has no flag of its own (national polyfill), so the more specific legacy coat of arms wins.
    expect(named['MEXICO-CAMPECHE']).toEqual({ country: 'MX', subdivision: 'CAM-COA' });
    const campeche = { iso: 'MX-CAM', key: 'MX/CAM-COA', resolvedIso: 'MX-CAM', variant: 'coat', polyfill: null, status: 'current' };
    expect(resolve('mexico', 'campeche')).toEqual(campeche);
    expect(resolve('mexico', 'campeche', { variant: 'coat' })).toEqual(campeche);
    expect(resolve('mexico', 'campeche', { polyfill: false })).toEqual(campeche);
    // The ISO code itself still follows the ISO polyfill rule.
    expect(resolve('MX', 'CAM')).toMatchObject({ key: 'MX', polyfill: 'national' });
  });

  test('a legacy name follows the English name when that name has its own flag', () => {
    // 0.0.5 served the state coat of arms for mexico/chihuahua; MX-CHH now has a real flag.
    expect(named['MEXICO-CHIHUAHUA']).toEqual({ country: 'MX', subdivision: 'CHH' });
    expect(resolve('mexico', 'chihuahua')).toMatchObject({ iso: 'MX-CHH', key: 'MX/CHH', polyfill: null });
    expect(resolve('mexico', 'chihuahua', { variant: 'coat' })).toMatchObject({ iso: 'MX-CHH', key: 'MX/CHH-COA' });
  });
});

describe('resolve: names', () => {
  test('English names', () => {
    expect(resolve('United States', 'California')).toEqual(US_CA);
    expect(resolve('US', 'California')).toEqual(US_CA);
    expect(resolve('california')).toEqual(US_CA);
    expect(resolve('Georgia').key).toBe('GE'); // the country first
    expect(resolve('US', 'Georgia').key).toBe('US/GA');
  });

  test('Spanish names, accents typed or not', () => {
    expect(resolve('Estados Unidos', 'California')).toEqual(US_CA);
    expect(resolve('Estados Unidos', 'CA')).toEqual(US_CA);
    expect(resolve('España', 'Cataluña', { locale: 'es' })).toMatchObject({ iso: 'ES-CT', key: 'ES/CT' });
    expect(resolve('Espana', 'Cataluna')).toMatchObject({ iso: 'ES-CT', key: 'ES/CT' });
    expect(resolve('Mexico', 'Ciudad de Mexico', { locale: 'es' })).toMatchObject({ iso: 'MX-CMX', polyfill: 'national' });
  });

  test('Chinese names', () => {
    expect(resolve('美国', '加利福尼亚州', { locale: 'zh-CN' })).toEqual(US_CA);
    expect(resolve('美國', '加利福尼亞州', { locale: 'zh-TW' })).toEqual(US_CA);
    expect(resolve('美国', '加利福尼亚州')).toEqual(US_CA);
    expect(resolve('西班牙', '加泰罗尼亚', { locale: 'zh' as never })).toMatchObject({ iso: 'ES-CT' });
  });

  test('codes sharing a name are ranked like named-mapping.json: own artwork first', () => {
    // Madrid is both the province ES-M (regional polyfill) and the community ES-MD (own flag).
    expect(getIsoCode('Madrid', { country: 'ES' })).toBe('ES-M');
    expect(resolve('Spain', 'Madrid')).toMatchObject({ iso: 'ES-MD', key: 'ES/MD', polyfill: null });
    expect(resolve('España', 'Madrid', { locale: 'es' })).toMatchObject({ iso: 'ES-MD', polyfill: null });
    expect(resolve('ES-M')).toMatchObject({ iso: 'ES-M', key: 'ES/MD', polyfill: 'regional' });
  });
});

describe('resolve: unknown input', () => {
  test('throws the exact 0.0.5 message', () => {
    expect(() => resolve('unknown', 'flag')).toThrow(new Error('SVG not found for unknown-flag'));
    expect(() => resolve('unknown')).toThrow(new Error('SVG not found for unknown-null'));
    expect(() => resolve('US', 'XX')).toThrow(new Error('SVG not found for US-XX'));
    expect(() => resolve('')).toThrow(new Error('SVG not found for -null'));
    expect(() => parse('unknown', 'flag')).toThrow(new Error('SVG not found for unknown-flag'));
  });

  test('a known ISO code without artwork parses but does not resolve', () => {
    expect(flag.LS).toBeUndefined();
    expect(parse('Lesotho')).toEqual({ iso: 'LS', country: 'LS', key: null });
    expect(() => resolve('LS')).toThrow(new Error('SVG not found for LS-null'));
  });

  test('invalid options throw a RangeError', () => {
    expect(() => resolve('US', 'CA', { variant: 'coa' as FlagVariant })).toThrow(RangeError);
    expect(() => resolve('US', 'CA', { locale: 'fr' as never })).toThrow(RangeError);
  });
});

describe('parse', () => {
  test('returns the canonical target', () => {
    expect(parse('usa', 'california')).toEqual({ iso: 'US-CA', country: 'US', key: null });
    expect(parse('Estados Unidos')).toEqual({ iso: 'US', country: 'US', key: null });
    expect(parse('mexico', 'michoacán')).toEqual({ iso: 'MX-MIC', country: 'MX', key: 'MX/MIC-COA' });
    expect(parse('CA-governor-general')).toEqual({ iso: null, country: 'CA', key: 'CA-governor-general' });
    expect(parse('england', 'bedfordshire')).toEqual({ iso: null, country: 'GB', key: 'GB-bedfordshire' });
  });
});

describe('createResolver binds each package’s mappings', () => {
  test('the API mappings resolve against what the API serves', () => {
    const api = createResolver({ flag: apiIsoMapping as IsoMapping, coat: apiCoaMapping as IsoMapping, named });
    expect(resolve('GB-BIR')).toMatchObject({ key: 'GB/BIR', polyfill: null });
    expect(api.resolve('GB-BIR')).toMatchObject({ key: 'GB/ENG', resolvedIso: 'GB-ENG', polyfill: 'regional' });
    expect(() => api.resolve('CA-governor-general')).toThrow(new Error('SVG not found for CA-governor-general-null'));
  });

  test('a tiny custom mapping', () => {
    const tiny = createResolver({ flag: { 'US-CA': { country: 'US', subdivision: 'CA' } }, coat: {}, named: {} });
    expect(tiny.resolve('United States', 'California')).toEqual(US_CA);
    expect(() => tiny.resolve('US')).toThrow(new Error('SVG not found for US-null'));
  });
});

describe('real data', () => {
  test('every ISO code of both mappings resolves to its own entry', () => {
    for (const [variant, mapping] of [['flag', flag], ['coat', coat]] as [FlagVariant, IsoMapping][]) {
      for (const [code, loc] of Object.entries(mapping)) {
        const resolved = resolve(code, null, { variant });
        expect([code, resolved.key, resolved.polyfill]).toEqual([code, artworkKey(loc, variant), loc.polyfill ?? null]);
      }
    }
  });

  test('every named-mapping.json key resolves to its own location', () => {
    for (const [name, loc] of Object.entries(named)) {
      const resolved = resolve(name);
      expect([name, resolved.key, resolved.polyfill]).toEqual([name, artworkKey(loc), loc.polyfill ?? null]);
    }
  });
});

describe('helpers', () => {
  test('artworkKey', () => {
    expect(artworkKey({ country: 'US', subdivision: 'CA' })).toBe('US/CA');
    expect(artworkKey({ country: 'US', subdivision: null })).toBe('US');
    expect(artworkKey({ country: 'US', subdivision: 'CA' }, 'coat')).toBe('US/CA-COA');
    expect(artworkKey({ country: 'DE', subdivision: null }, 'coat')).toBe('DE-COA');
  });

  test('isExtraKey', () => {
    expect(isExtraKey('CA-governor-general')).toBe(true);
    expect(isExtraKey('GB-bedfordshire')).toBe(true);
    expect(isExtraKey('DE-COA')).toBe(false);
    expect(isExtraKey('US')).toBe(false);
    expect(isExtraKey('US/CA')).toBe(false);
    expect(isExtraKey('US/GA-Classic')).toBe(false);
  });
});
