import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'SvgCountryAssets',
      fileName: (format) => `svg-country-assets.${format}.js`,
    },
    rollupOptions: {
      // Ensure to externalize deps that shouldn't be bundled into your library
      external: ['path', 'fs'],
      output: {
        globals: {
          'path': 'path',
          'fs': 'fs'
        },
        assetFileNames: 'assets/[name].[ext]',
      },
    },
  },
  resolve: {
    alias: {
      'path': 'path-browserify',
    },
  },
});
