import { flags, flagList } from '../flags';


export function getFlagSvg(country: string, region: string | null): string {
  const key = `${region != null ? country + '/' + region : country}`;

  const svg = flags[key];
  if (!svg) {
    throw new Error(`SVG not found for ${country}-${region}`);
  }
  return svg;
}

export function getAllFlags(): string[] {
  return flagList;
}

export function getFlagsByCountry(country: string): string[] {
  return flagList.filter(flag => flag.startsWith(country));
}

