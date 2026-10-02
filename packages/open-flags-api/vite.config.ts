import { defineConfig } from 'vite';
import path from 'path';

const FILE_NAMES: Record<string, string> = {
  es: 'open-flags-api.mjs',
  cjs: 'open-flags-api.cjs',
  umd: 'open-flags-api.umd.js',
};

// One self-contained file per format: the shared core (../../src/core), the name tables (../../src/i18n)
// and the mappings (../../src/named-mapping.json, src/generated) are bundled in. No runtime dependencies.
export default defineConfig({
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      name: 'OpenFlagsApi',
      formats: ['es', 'cjs', 'umd'],
      fileName: format => FILE_NAMES[format],
    },
    sourcemap: false,
  },
});
