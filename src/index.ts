// src/index.ts
import { flags } from '../flags';

export function getFlagSvg(country: string, region: string): string {
  const key = `${country}-${region}`;
  const svg = flags[key];
  if (!svg) {
    throw new Error(`SVG not found for ${country}-${region}`);
  }
  return svg;
}
