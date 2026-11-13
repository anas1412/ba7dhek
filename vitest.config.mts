import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@convex': fileURLToPath(new URL('./convex', import.meta.url)),
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    // convex-test runs Convex functions in the same runtime Convex uses.
    environment: 'edge-runtime',
    setupFiles: ['./vitest.setup.ts'],
    server: { deps: { inline: ['convex-test', '@convex-dev/geospatial', '@convex-dev/expo-push-notifications'] } },
    include: ['convex/**/*.test.ts', 'src/**/*.test.ts'],
  },
});
