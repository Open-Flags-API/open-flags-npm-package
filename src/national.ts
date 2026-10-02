// open-flags/national: registers every national flag (238 small files), so getFlagSvg() serves country flags
// synchronously, and exposes the same API as the main entry. Subdivisions and coats of arms stay lazy.
import { nationalFlags } from './generated/national';
import { registerFlags } from './registry';

registerFlags(nationalFlags);

export * from './index';
