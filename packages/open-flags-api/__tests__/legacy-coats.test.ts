// A 0.0.5 legacy name pointing at a coat of arms is an exact key: served as-is or not at all. Today the
// API either has such a coat or has no entry for it; this pins the case where it only has a polyfill.
jest.mock('../src/generated/iso-coa-mapping.json', () => ({
  ...jest.requireActual('../src/generated/iso-coa-mapping.json'),
  MX: { country: 'MX', subdivision: null },
  'MX-HID': { country: 'MX', subdivision: null, polyfill: 'national' },
}));

import { getCoatOfArmsUrl, getFlagUrl } from '../src/index';

test('a legacy coat-of-arms name is not polyfilled when the API only has a polyfill for it', () => {
  expect(() => getFlagUrl('mexico', 'hidalgo')).toThrow(
    new Error('SVG not found for mexico-hidalgo: the Open Flags API does not serve MX/HID-COA')
  );
  // The ISO code itself follows the polyfill rule.
  expect(getCoatOfArmsUrl('MX', 'HID')).toBe('https://api.openflags.net/flags/MX/coat.svg');
  expect(getFlagUrl('mexico', 'michoacán')).toBe('https://api.openflags.net/flags/MX/MX-MIC/coat.svg');
});
