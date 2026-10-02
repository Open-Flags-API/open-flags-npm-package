import {
  configure,
  getCoatOfArmsUrl,
  getFlagSvg,
  getFlagUrl,
  getPngUrl,
  getRandomFlagImageUrl,
  resolveFlag,
} from '../src/index';
import type { FlagUrlOptions, FlagVariant, PngSize } from '../src/index';

const BASE = 'https://api.openflags.net';
const US_CA_SVG = `${BASE}/flags/US/US-CA/flag.svg`;

afterEach(() => configure({}));

describe('getFlagUrl: SVG URLs of the API static files', () => {
  test('national flag', () => {
    expect(getFlagUrl('US')).toBe(`${BASE}/flags/US/flag.svg`);
    expect(getFlagUrl('us', null)).toBe(`${BASE}/flags/US/flag.svg`);
  });

  test('subdivision flag, from an ISO pair or code', () => {
    expect(getFlagUrl('US', 'CA')).toBe(US_CA_SVG);
    expect(getFlagUrl('US-CA')).toBe(US_CA_SVG);
    expect(getFlagUrl(' us_ca ')).toBe(US_CA_SVG);
    expect(getFlagUrl('US', 'US-CA')).toBe(US_CA_SVG);
  });

  test('0.0.5 legacy names and localized names', () => {
    expect(getFlagUrl('usa', 'california')).toBe(US_CA_SVG);
    expect(getFlagUrl('United States', 'California')).toBe(US_CA_SVG);
    expect(getFlagUrl('Estados Unidos', 'California')).toBe(US_CA_SVG);
    expect(getFlagUrl('美国', '加利福尼亚州', { locale: 'zh-CN' })).toBe(US_CA_SVG);
    expect(getFlagUrl('美國', '加利福尼亞州', { locale: 'zh-TW' })).toBe(US_CA_SVG);
    expect(getFlagUrl('california')).toBe(US_CA_SVG);
  });

  test('numeric and Windows-reserved ISO suffixes', () => {
    expect(getFlagUrl('FR', '01')).toBe(`${BASE}/flags/FR/FR-01/flag.svg`);
    expect(getFlagUrl('JP-13')).toBe(`${BASE}/flags/JP/JP-13/flag.svg`);
    // Cornwall is stored as flags/GB/CON_.svg in open-flags; the API has no such problem.
    expect(getFlagUrl('GB', 'CON')).toBe(`${BASE}/flags/GB/GB-CON/flag.svg`);
  });
});

describe('polyfills, resolved against what the API serves', () => {
  test('regional polyfill: FR-13 Bouches-du-Rhône -> its region FR-PAC', () => {
    expect(getFlagUrl('FR', '13')).toBe(`${BASE}/flags/FR/FR-PAC/flag.svg`);
    expect(resolveFlag('FR-13')).toEqual({
      iso: 'FR-13',
      key: 'FR/PAC',
      resolvedIso: 'FR-PAC',
      variant: 'flag',
      polyfill: 'regional',
      status: 'current',
    });
  });

  test('national polyfill: AF-BDS Badakhshān -> AF', () => {
    expect(getFlagUrl('AF-BDS')).toBe(`${BASE}/flags/AF/flag.svg`);
    expect(resolveFlag('AF-BDS')).toMatchObject({ key: 'AF', resolvedIso: 'AF', polyfill: 'national' });
  });

  test('API availability, not local artwork: GB-BIR (Birmingham) is polyfilled with England', () => {
    // open-flags bundles a Birmingham flag; the API does not serve one.
    expect(getFlagUrl('GB-BIR')).toBe(`${BASE}/flags/GB/GB-ENG/flag.svg`);
    expect(resolveFlag('GB-BIR')).toMatchObject({ iso: 'GB-BIR', resolvedIso: 'GB-ENG', polyfill: 'regional' });
  });

  test('polyfill: false treats a polyfilled code as missing', () => {
    expect(() => getFlagUrl('AF-BDS', null, { polyfill: false })).toThrow(new Error('SVG not found for AF-BDS-null'));
    expect(() => getFlagUrl('FR', '13', { polyfill: false })).toThrow(new Error('SVG not found for FR-13'));
    expect(() => getFlagUrl('GB-BIR', null, { polyfill: false })).toThrow('SVG not found for GB-BIR-null');
    expect(getFlagUrl('US', 'CA', { polyfill: false })).toBe(US_CA_SVG);
  });

  test('status is reported for codes that are not current', () => {
    expect(resolveFlag('BA-01')).toMatchObject({ key: 'BA/01', resolvedIso: 'BA-01', status: 'withdrawn' });
    expect(getFlagUrl('BA-01')).toBe(`${BASE}/flags/BA/BA-01/flag.svg`);
  });
});

describe('coats of arms', () => {
  test('getCoatOfArmsUrl and variant coat', () => {
    expect(getCoatOfArmsUrl('MX', 'BCS')).toBe(`${BASE}/flags/MX/MX-BCS/coat.svg`);
    expect(getFlagUrl('MX-CAM', null, { variant: 'coat' })).toBe(`${BASE}/flags/MX/MX-CAM/coat.svg`);
    expect(getCoatOfArmsUrl('KY')).toBe(`${BASE}/flags/KY/coat.svg`); // a national coat of arms
  });

  test('regional polyfill of a coat of arms', () => {
    expect(getCoatOfArmsUrl('AZ-BAB')).toBe(`${BASE}/flags/AZ/AZ-NX/coat.svg`);
    expect(resolveFlag('AZ-BAB', null, { variant: 'coat' })).toMatchObject({
      key: 'AZ/NX-COA',
      resolvedIso: 'AZ-NX',
      variant: 'coat',
      polyfill: 'regional',
    });
  });

  test('no coat of arms on the API -> not found', () => {
    expect(() => getCoatOfArmsUrl('US')).toThrow(new Error('SVG not found for US-null'));
    expect(() => getCoatOfArmsUrl('DE')).toThrow(new Error('SVG not found for DE-null')); // open-flags has DE-COA
  });

  test('a 0.0.5 legacy name for a coat of arms the API serves is served as-is, whatever the variant', () => {
    const michoacan = `${BASE}/flags/MX/MX-MIC/coat.svg`;
    expect(getFlagUrl('mexico', 'michoacán')).toBe(michoacan);
    expect(getFlagUrl('mexico', 'michoacán', { variant: 'coat', polyfill: false })).toBe(michoacan);
    expect(getFlagSvg('mexico', 'campeche')).toBe(`${BASE}/flags/MX/MX-CAM/coat.svg`);
    expect(resolveFlag('mexico', 'michoacán')).toEqual({
      iso: 'MX-MIC',
      key: 'MX/MIC-COA',
      resolvedIso: 'MX-MIC',
      variant: 'coat',
      polyfill: null,
      status: 'current',
    });
    // The ISO code itself has no flag on the API: national polyfill.
    expect(getFlagUrl('MX', 'MIC')).toBe(`${BASE}/flags/MX/flag.svg`);
  });

  test('a 0.0.5 legacy name for artwork the API lacks is not polyfilled', () => {
    expect(() => getFlagUrl('mexico', 'hidalgo')).toThrow(
      new Error('SVG not found for mexico-hidalgo: the Open Flags API does not serve MX/HID-COA')
    );
    expect(() => getFlagUrl('germany', 'coa-germany')).toThrow('the Open Flags API does not serve DE-COA');
    expect(getFlagUrl('MX', 'HID')).toBe(`${BASE}/flags/MX/flag.svg`);
  });
});

describe('artwork the API does not serve', () => {
  test('extras throw a clear error, however they are named', () => {
    const governorGeneral = /The Open Flags API does not serve 'CA-governor-general'/;
    expect(() => getFlagUrl('CA-governor-general')).toThrow(governorGeneral);
    expect(() => getFlagUrl('ca', 'Governor-General')).toThrow(governorGeneral);
    expect(() => getFlagUrl('canada', 'governor-general-of-canada')).toThrow(governorGeneral);
    expect(() => getFlagUrl('england', 'bedfordshire')).toThrow(/does not serve 'GB-bedfordshire'/);
    expect(() => resolveFlag('GB-royal-standard')).toThrow(/does not serve 'GB-royal-standard'.*open-flags package/);
  });

  test('alternate designs (subdivision variants) throw the same error', () => {
    expect(() => getFlagUrl('usa', 'georgiaclassic')).toThrow(/does not serve 'US\/GA-Classic'/);
    expect(getFlagUrl('US', 'GA')).toBe(`${BASE}/flags/US/US-GA/flag.svg`);
  });

  test('unknown input throws the 0.0.5 message', () => {
    expect(() => getFlagUrl('unknown', 'flag')).toThrow(new Error('SVG not found for unknown-flag'));
    expect(() => getFlagUrl('unknown')).toThrow(new Error('SVG not found for unknown-null'));
    expect(() => getFlagUrl('US', 'XX')).toThrow(new Error('SVG not found for US-XX'));
    expect(() => getPngUrl('unknown')).toThrow(new Error('SVG not found for unknown-null'));
  });

  test('countries without any artwork are not found (Lesotho)', () => {
    expect(() => getFlagUrl('LS')).toThrow(new Error('SVG not found for LS-null'));
    expect(() => getFlagUrl('Lesotho')).toThrow(new Error('SVG not found for Lesotho-null'));
  });
});

describe('PNG URLs', () => {
  test('getPngUrl: default size 128', () => {
    expect(getPngUrl('US', 'CA')).toBe(`${BASE}/api/v1/flags/US-CA/png?variant=flag&size=128`);
    expect(getPngUrl('US')).toBe(`${BASE}/api/v1/flags/US/png?variant=flag&size=128`);
  });

  test('every supported size', () => {
    for (const size of [32, 64, 128, 256, 512] as PngSize[]) {
      expect(getPngUrl('US-CA', null, { size })).toBe(`${BASE}/api/v1/flags/US-CA/png?variant=flag&size=${size}`);
    }
  });

  test('format png on getFlagUrl and getCoatOfArmsUrl', () => {
    expect(getFlagUrl('US-CA', null, { format: 'png', size: 64 })).toBe(
      `${BASE}/api/v1/flags/US-CA/png?variant=flag&size=64`
    );
    expect(getCoatOfArmsUrl('MX', 'BCS', { format: 'png', size: 256 })).toBe(
      `${BASE}/api/v1/flags/MX-BCS/png?variant=coat&size=256`
    );
    expect(getPngUrl('MX-BCS', null, { variant: 'coat' })).toBe(
      `${BASE}/api/v1/flags/MX-BCS/png?variant=coat&size=128`
    );
  });

  test('the PNG is the polyfilled artwork', () => {
    expect(getPngUrl('FR-13')).toBe(`${BASE}/api/v1/flags/FR-PAC/png?variant=flag&size=128`);
    expect(getPngUrl('mexico', 'michoacán')).toBe(`${BASE}/api/v1/flags/MX-MIC/png?variant=coat&size=128`);
  });

  test('an unsupported size throws a RangeError', () => {
    expect(() => getPngUrl('US', null, { size: 100 as PngSize })).toThrow(RangeError);
    expect(() => getPngUrl('US', null, { size: '128' as unknown as PngSize })).toThrow(
      'Unsupported PNG size 128: expected one of 32, 64, 128, 256, 512'
    );
    expect(() => getFlagUrl('US', null, { format: 'png', size: 0 as PngSize })).toThrow(RangeError);
  });

  test('size only applies to PNG', () => {
    expect(getFlagUrl('US', null, { size: 100 as PngSize })).toBe(`${BASE}/flags/US/flag.svg`);
  });
});

describe('other URL helpers', () => {
  test('getFlagSvg is the SVG URL (drop-in for open-flags)', () => {
    expect(getFlagSvg('usa', 'california')).toBe(US_CA_SVG);
    expect(getFlagSvg('MX', 'BCS', { variant: 'coat' })).toBe(`${BASE}/flags/MX/MX-BCS/coat.svg`);
    expect(() => getFlagSvg('US', null, { variant: 'coat' })).toThrow(new Error('SVG not found for US-null'));
    expect(getFlagSvg('US', 'CA', { format: 'png' } as FlagUrlOptions)).toBe(US_CA_SVG);
  });

  test('getCoatOfArmsUrl always asks for the coat of arms', () => {
    const options = { variant: 'flag' } as FlagUrlOptions;
    expect(getCoatOfArmsUrl('MX', 'BCS', options)).toBe(`${BASE}/flags/MX/MX-BCS/coat.svg`);
  });

  test('getRandomFlagImageUrl', () => {
    expect(getRandomFlagImageUrl()).toBe(`${BASE}/api/v1/flags/random/image`);
  });

  test('invalid options throw a RangeError', () => {
    expect(() => getFlagUrl('US', null, { variant: 'coa' as FlagVariant })).toThrow(RangeError);
    expect(() => getFlagUrl('US', null, { locale: 'fr' as never })).toThrow(RangeError);
    expect(() => getFlagUrl('US', null, { format: 'jpg' as never })).toThrow(
      "Unknown format 'jpg': expected 'svg' or 'png'"
    );
  });
});

describe('configure', () => {
  test('changes the base URL of every builder; trailing slashes are trimmed', () => {
    configure({ baseUrl: 'https://flags.example.com/openflags/' });
    expect(getFlagUrl('US', 'CA')).toBe('https://flags.example.com/openflags/flags/US/US-CA/flag.svg');
    expect(getPngUrl('US')).toBe('https://flags.example.com/openflags/api/v1/flags/US/png?variant=flag&size=128');
    expect(getRandomFlagImageUrl()).toBe('https://flags.example.com/openflags/api/v1/flags/random/image');
  });

  test('an empty base URL gives root-relative URLs (same origin as the page)', () => {
    configure({ baseUrl: '' });
    expect(getFlagUrl('US')).toBe('/flags/US/flag.svg');
  });

  test('options left out take their defaults', () => {
    configure({ baseUrl: 'http://localhost:4000' });
    expect(getFlagUrl('US')).toBe('http://localhost:4000/flags/US/flag.svg');
    configure({});
    expect(getFlagUrl('US')).toBe(`${BASE}/flags/US/flag.svg`);
    configure({ baseUrl: 'http://localhost:4000' });
    configure();
    expect(getFlagUrl('US')).toBe(`${BASE}/flags/US/flag.svg`);
  });

  test('a base URL that is not a string throws a TypeError and changes nothing', () => {
    configure({ baseUrl: 'http://localhost:4000' });
    expect(() => configure({ baseUrl: 42 as unknown as string })).toThrow(TypeError);
    expect(getFlagUrl('US')).toBe('http://localhost:4000/flags/US/flag.svg');
  });
});
