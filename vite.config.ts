import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';
import svgLoader from 'vite-plugin-svg';
import copy from 'rollup-plugin-copy';

export default defineConfig({
  plugins: [
    svgLoader({ svgo: false }),
    dts({
      insertTypesEntry: true,
      outDir: 'dist/types',
    }),
    copy({
      targets: [
        { src: 'assets/**/*', dest: 'dist/assets' },
      ],
      verbose: true,
    }),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'open-flags',
      fileName: (format) => `open-flags.${format}.js`,
    },
    rollupOptions: {
      output: {
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
