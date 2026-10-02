import type { ConfigureOptions } from './types';

export const DEFAULT_BASE_URL = 'https://api.openflags.net';

let baseUrl = DEFAULT_BASE_URL;

/** 'https://example.com/api/ ' -> 'https://example.com/api'. An empty string means the current origin. */
export function normalizeBaseUrl(url: string): string {
  if (typeof url !== 'string') {
    throw new TypeError(`baseUrl must be a string, got ${url === null ? 'null' : typeof url}`);
  }
  return url.trim().replace(/\/+$/, '');
}

/**
 * Points every URL builder, and every client created without a baseUrl of its own, at an Open Flags API.
 * Options left out take their defaults, so configure({}) restores https://api.openflags.net.
 */
export function configure(options: ConfigureOptions = {}): void {
  const url = (options ?? {}).baseUrl;
  baseUrl = url === undefined ? DEFAULT_BASE_URL : normalizeBaseUrl(url);
}

export function getBaseUrl(): string {
  return baseUrl;
}
