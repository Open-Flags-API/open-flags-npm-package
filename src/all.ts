// open-flags/all: registers every flag, so getFlagSvg() serves all of them synchronously, and exposes the
// same API as the main entry. Bundles all of the artwork; prefer open-flags/countries/<CC> or loadFlagSvg().
import './generated/all';
export * from './index';
