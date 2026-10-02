import type { FlagOptions } from '../src/index';

export const DATA_URI = /^data:image\/svg\+xml(;base64)?,/;

/** The SVG markup in a data URI, URL-encoded or base64 (as Vite and jest/svg-transform.cjs write them). */
export function decodeSvg(dataUri: string): string {
  const comma = dataUri.indexOf(',');
  const body = dataUri.slice(comma + 1);
  return dataUri.slice(0, comma).endsWith(';base64') ? Buffer.from(body, 'base64').toString('utf8') : decodeURIComponent(body);
}

/** Public API arguments naming exactly one flag key: 'US/AK-COA' -> ['US', 'AK', { variant: 'coat' }]. */
export function keyArgs(key: string): [string, (string | null)?, FlagOptions?] {
  let m: RegExpExecArray | null;
  if ((m = /^([A-Z]{2})-COA$/.exec(key))) return [m[1], null, { variant: 'coat' }];
  if ((m = /^([A-Z]{2})\/([^/-]+)-COA$/.exec(key))) return [m[1], m[2], { variant: 'coat' }];
  if ((m = /^([A-Z]{2})\/([^/-]+)$/.exec(key))) return [m[1], m[2]];
  return [key]; // national flags, extras ('CA-governor-general') and variants ('US/GA-Classic') are exact keys
}
