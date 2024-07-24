import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      name: 'open-flags',
      fileName: (format) => `open-flags.${format}.js`
    },
    rollupOptions: {
      external: [], // Specify external dependencies here if any
      output: {
        globals: {} // Specify global variable names for external dependencies if any
      }
    }
  }
});
