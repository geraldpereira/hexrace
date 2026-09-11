import { defineConfig } from 'vitest/config';

export default defineConfig({
    server: {
        port: 5174,
        open: false,
    },
    build: {
        target: 'es2022',
        sourcemap: true,
        rollupOptions: {
            output: {
                manualChunks: (id) => (id.includes('node_modules/three') ? 'three' : undefined),
            },
        },
    },
    test: {
        include: ['src/**/*.test.ts'],
    },
});
