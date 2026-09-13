import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./test-setup.ts'],
    include: ['src/**/*.spec.ts'],
    testTimeout: 20_000,
    coverage: {
      enabled: true,
      provider: 'v8',
      reporter: ['text-summary', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/index.ts', 'src/**/*.spec.ts', 'src/**/*.mock.ts'],
      thresholds: { statements: 100, branches: 100, functions: 100, lines: 100 },
    },
  },
  resolve: {
    alias: {
      '@engine': fileURLToPath(new URL('./src', import.meta.url)),
      '@hexrace/commons': fileURLToPath(new URL('../commons/src/index.ts', import.meta.url)),
      '@commons': fileURLToPath(new URL('../commons/src', import.meta.url)),
    },
  },
});
