import * as api from '../src/index';
import apiFlagMapping from '../src/generated/iso-mapping.json';
import apiCoatMapping from '../src/generated/iso-coa-mapping.json';
import availability from '../../../data/api-availability.json';
import type { IsoMapping } from '../src/index';

describe('public API', () => {
  test('exports exactly the documented functions', () => {
    expect(Object.keys(api).sort()).toEqual([
      'OpenFlagsApiError',
      'configure',
      'createClient',
      'getCoatOfArmsUrl',
      'getDefaultLocale',
      'getFlagSvg',
      'getFlagUrl',
      'getIsoCode',
      'getName',
      'getNames',
      'getPngUrl',
      'getRandomFlagImageUrl',
      'locales',
      'resolveFlag',
      'searchFlags',
      'setDefaultLocale',
    ]);
  });
});

describe('generated API mappings', () => {
  const mappings: [string, IsoMapping, string[]][] = [
    ['flags', apiFlagMapping as IsoMapping, availability.flags],
    ['coats', apiCoatMapping as IsoMapping, availability.coats],
  ];

  test.each(mappings)('%s: codes with artwork of their own are exactly the API availability', (_, mapping, served) => {
    const own = Object.keys(mapping).filter(code => !mapping[code].polyfill);
    expect(own.sort()).toEqual([...served].sort());
  });

  test.each(mappings)('%s: every code resolves to artwork the API serves', (_name, mapping) => {
    for (const [code, location] of Object.entries(mapping)) {
      const target = location.subdivision === null ? location.country : `${location.country}-${location.subdivision}`;
      const targetLocation = mapping[target];
      expect([code, targetLocation && !targetLocation.polyfill]).toEqual([code, true]);
    }
  });
});
