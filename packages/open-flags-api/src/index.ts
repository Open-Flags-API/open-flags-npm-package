/**
 * open-flags-api: the Open Flags API (https://api.openflags.net), streamlined. Flag, coat of arms and PNG
 * URLs from ISO 3166 codes or names, with polyfills resolved against what the API serves; en / es / zh-CN /
 * zh-TW names and search; and a small client for the API's JSON endpoints. No artwork is bundled: the
 * open-flags package is the offline complement.
 */
export { configure } from './config';
export {
  getCoatOfArmsUrl,
  getFlagSvg,
  getFlagUrl,
  getPngUrl,
  getRandomFlagImageUrl,
  resolveFlag,
  searchFlags,
} from './urls';
export { createClient, OpenFlagsApiError } from './client';
export { getDefaultLocale, getIsoCode, getName, getNames, locales, setDefaultLocale } from '../../../src/core/i18n';

export type {
  FlagOptions,
  FlagVariant,
  IsoCodeOptions,
  IsoLocation,
  IsoMapping,
  IsoStatus,
  Locale,
  PolyfillLevel,
  ResolvedFlag,
  SearchOptions,
  SearchResult,
} from '../../../src/core/types';
export type {
  ApiArtwork,
  ApiFlag,
  ApiFlagPage,
  ApiFlagResults,
  ApiHealth,
  ApiLanguage,
  ApiPageMeta,
  ApiTranslations,
  ClientOptions,
  CoatOfArmsUrlOptions,
  ConfigureOptions,
  FetchLike,
  FetchLikeInit,
  FetchLikeResponse,
  FlagUrlOptions,
  ImageFormat,
  ListFlagsOptions,
  OpenFlagsClient,
  PngSize,
  PngUrlOptions,
} from './types';
