import { normalizeIso, normalizeText } from '../../src/core/normalize';

describe('normalizeText', () => {
  test('strips accents (combining marks) and lowercases', () => {
    expect(normalizeText('México')).toBe('mexico');
    expect(normalizeText('Bādghīs')).toBe('badghis');
    expect(normalizeText('ÎLE-DE-FRANCE')).toBe('ile-de-france');
    expect(normalizeText('Cataluña')).toBe('cataluna');
  });

  test('trims, collapses whitespace and reads _ as a space', () => {
    expect(normalizeText('  São_Paulo  ')).toBe('sao paulo');
    expect(normalizeText('New\t\n   York')).toBe('new york');
    expect(normalizeText('__golden__state__')).toBe('golden state');
  });

  test('applies compatibility decomposition (NFKD)', () => {
    expect(normalizeText('Ｔｏｋｙｏ')).toBe('tokyo');
    expect(normalizeText('ﬁnland')).toBe('finland');
  });

  test('leaves CJK text as it is', () => {
    expect(normalizeText(' 加利福尼亚州 ')).toBe('加利福尼亚州');
    expect(normalizeText('美國')).toBe('美國');
  });

  test('empty and blank input give an empty string', () => {
    expect(normalizeText('')).toBe('');
    expect(normalizeText(' _ \t ')).toBe('');
  });
});

describe('normalizeIso', () => {
  test('trims, uppercases and maps _ to -', () => {
    expect(normalizeIso(' us_ca ')).toBe('US-CA');
    expect(normalizeIso('fr-01')).toBe('FR-01');
    expect(normalizeIso('gb')).toBe('GB');
    expect(normalizeIso('US-CA')).toBe('US-CA');
  });

  test('empty input gives an empty string', () => {
    expect(normalizeIso('   ')).toBe('');
  });
});
