import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

const here = (path: string): string => fileURLToPath(new URL(path, import.meta.url));

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
      thresholds: { statements: 100, branches: 100, functions: 100, lines: 100 },
    },
  },
  resolve: {
    alias: {
      '@game-commons': here('./src'),
      '@hexrace/commons': here('../commons/src/index.ts'),
      '@commons': here('../commons/src'),
      '@hexrace/engine': here('../engine/src/index.ts'),
      '@engine': here('../engine/src'),
      '@hexrace/inputs': here('../inputs/src/index.ts'),
      '@inputs': here('../inputs/src'),
      '@hexrace/camera': here('../camera/src/index.ts'),
      '@camera': here('../camera/src'),
      '@hexrace/tile': here('../tile/src/index.ts'),
      '@tile': here('../tile/src'),
      '@hexrace/track': here('../track/src/index.ts'),
      '@track': here('../track/src'),
      '@hexrace/car': here('../car/src/index.ts'),
      '@car': here('../car/src'),
    },
  },
});
