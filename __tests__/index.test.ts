import { getFlagSvg } from '../src/index';

describe('getFlagSvg function', () => {
  test('should return correct SVG for a given flag', () => {
    const svg = getFlagSvg('usa', 'colorado');
    console.log(svg);
    expect(svg).toContain('<svg');
  });

  test('should throw an error for an unknown flag', () => {
    expect(() => {
      getFlagSvg('unknown', 'flag');
    }).toThrow('SVG not found for unknown-flag');
  });
});
