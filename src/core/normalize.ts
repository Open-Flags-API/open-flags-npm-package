const COMBINING_MARKS = /\p{M}/gu;
const SPACES = /[\s_]+/g;

/**
 * Normalizes text for name lookups and search: NFKD, combining marks stripped, lowercase, `_` read as
 * a space, whitespace trimmed and collapsed. `'  São_Paulo '` -> `'sao paulo'`, `'MÉXICO'` -> `'mexico'`.
 */
export function normalizeText(text: string): string {
  if (typeof text !== 'string') return '';
  return text.normalize('NFKD').replace(COMBINING_MARKS, '').toLowerCase().replace(SPACES, ' ').trim();
}

/** Normalizes an ISO 3166 code: trimmed, uppercase, `_` -> `-`. `' us_ca '` -> `'US-CA'`. */
export function normalizeIso(code: string): string {
  if (typeof code !== 'string') return '';
  return code.trim().toUpperCase().replace(/_/g, '-');
}
