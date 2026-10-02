// Lazy loading. Only the main entry is imported here, and it registers no artwork: nothing starts out loaded.
import {
  getCoatOfArmsSvg,
  getFlagSvg,
  getFlagsByCountry,
  isFlagLoaded,
  loadCoatOfArmsSvg,
  loadFlagSvg,
  preloadCountry,
  resolveFlag,
} from '../src/index';
import { DATA_URI, decodeSvg, keyArgs } from './helpers';

const notLoaded = (country: string) => getFlagsByCountry(country).filter(key => !isFlagLoaded(...keyArgs(key)));

describe('loadFlagSvg', () => {
  test('loads one flag on demand, then getFlagSvg() serves it synchronously', async () => {
    expect(isFlagLoaded('FR', '01')).toBe(false);
    expect(() => getFlagSvg('FR', '01')).toThrow(/^Flag 'FR\/01' is not loaded/);
    const svg = await loadFlagSvg('FR', '01');
    expect(svg).toMatch(DATA_URI);
    expect(decodeSvg(svg)).toContain('<svg');
    expect(isFlagLoaded('FR', '01')).toBe(true);
    expect(getFlagSvg('fr-01')).toBe(svg);
    expect(await loadFlagSvg('FR', '01')).toBe(svg);
    expect(isFlagLoaded('FR', '02')).toBe(false); // only the requested flag
    expect(isFlagLoaded('FR', '01', { variant: 'coat' })).toBe(false);
  });

  test('the main entry bundles no artwork: national flags load on demand too', async () => {
    expect(isFlagLoaded('JP')).toBe(false);
    expect(() => getFlagSvg('JP')).toThrow(
      "Flag 'JP' is not loaded: load it with loadFlagSvg() first, or import 'open-flags/national', 'open-flags/countries/JP' or 'open-flags/all' to make it available synchronously"
    );
    const svg = await loadFlagSvg('Japan');
    expect(svg).toMatch(DATA_URI);
    expect(getFlagSvg('JP')).toBe(svg);
    expect(isFlagLoaded('DE')).toBe(false); // only the requested flag
  });

  test('a polyfilled code loads the artwork it resolves to', async () => {
    expect(isFlagLoaded('AZ', 'NX')).toBe(false);
    const svg = await loadFlagSvg('AZ', 'BAB'); // regional polyfill: AZ-NX
    expect(isFlagLoaded('AZ', 'NX')).toBe(true);
    expect(getFlagSvg('AZ-NX')).toBe(svg);
  });

  test('rejects for input that names nothing', async () => {
    await expect(loadFlagSvg('unknown', 'flag')).rejects.toThrow('SVG not found for unknown-flag');
    await expect(loadFlagSvg('AD-02', null, { polyfill: false })).rejects.toThrow('SVG not found for AD-02-null');
  });

  test('Windows-reserved file names (flags/GB/CON_.svg) load under the ISO key', async () => {
    const svg = await loadFlagSvg('GB', 'CON');
    expect(decodeSvg(svg)).toContain('<svg');
    expect(resolveFlag('GB-CON').key).toBe('GB/CON');
    expect(getFlagSvg('england', 'cornwall')).toBe(svg); // 0.0.5 name
  });

  test('extras, variants and 0.0.5 names of coats of arms', async () => {
    expect(await loadFlagSvg('CA-governor-general')).toBe(getFlagSvg('CA', 'governor-general'));
    expect(await loadFlagSvg('KR', '26-pre-2023')).toBe(getFlagSvg('KR/26-pre-2023'));
    const michoacan = await loadFlagSvg('mexico', 'michoacán');
    expect(getCoatOfArmsSvg('MX', 'MIC')).toBe(michoacan); // the same artwork: MX/MIC-COA
  });

  test('concurrent loads of one flag', async () => {
    const [a, b] = await Promise.all([loadFlagSvg('BR', 'AC'), loadFlagSvg('brazil', 'acre')]);
    expect(a).toMatch(DATA_URI);
    expect(b).toBe(a);
  });
});

describe('loadCoatOfArmsSvg', () => {
  test('loads the coat of arms only', async () => {
    const coat = await loadCoatOfArmsSvg('DE', 'BY');
    expect(coat).toMatch(DATA_URI);
    expect(getCoatOfArmsSvg('DE', 'BY')).toBe(coat);
    expect(isFlagLoaded('DE', 'BY', { variant: 'coat' })).toBe(true);
    expect(isFlagLoaded('DE', 'BY')).toBe(false);
    expect(await loadFlagSvg('DE', 'BY')).not.toBe(coat);
  });
});

describe('preloadCountry', () => {
  test('loads every key of a country, given by code or by name in any locale', async () => {
    expect(notLoaded('LI').length).toBeGreaterThan(0);
    await preloadCountry('Liechtenstein');
    expect(notLoaded('LI')).toEqual([]);

    expect(notLoaded('CH').length).toBeGreaterThan(0);
    await preloadCountry('瑞士'); // Switzerland, zh-CN
    expect(notLoaded('CH')).toEqual([]);
    expect(getFlagSvg('CH', 'ZH')).toMatch(DATA_URI);
  });

  test('a known country without artwork loads nothing', async () => {
    expect(getFlagsByCountry('BV')).toEqual([]);
    await expect(preloadCountry('BV')).resolves.toBeUndefined();
  });

  test('rejects for an unknown country', async () => {
    await expect(preloadCountry('Atlantis')).rejects.toThrow('SVG not found for Atlantis-null');
  });
});
