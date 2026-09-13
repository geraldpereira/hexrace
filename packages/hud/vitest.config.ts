import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./test-setup.ts'],
    include: ['src/**/*.spec.ts'],
    coverage: {
      enabled: true,
      provider: 'v8',
      reporter: ['text-summary', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/index.ts', 'src/**/*.spec.ts', 'src/**/*.mock.ts'],
      thresholds: { statements: 90, branches: 85, functions: 90, lines: 90 },
    },
  },
  resolve: {
    alias: { '@hud': fileURLToPath(new URL('./src', import.meta.url)) },
  },
});
