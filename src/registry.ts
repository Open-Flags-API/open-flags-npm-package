/**
 * The flags getFlagSvg() can serve synchronously: flag key -> SVG data URI. One store shared by every
 * entry point: the main entry registers the national flags, `open-flags/all` and
 * `open-flags/countries/<CC>` register whole countries, and loadFlagSvg() registers what it loads.
 */
const flags = new Map<string, string>();

/** Makes artwork available synchronously, e.g. `registerFlags({ 'US/CA': 'data:image/svg+xml,...' })`. */
export function registerFlags(record: Record<string, string>): void {
  for (const key of Object.keys(record)) flags.set(key, record[key]);
}

/** The data URI registered for a flag key, or undefined when that flag is not loaded. */
export function getRegisteredFlag(key: string): string | undefined {
  return flags.get(key);
}

export function isRegistered(key: string): boolean {
  return flags.has(key);
}
