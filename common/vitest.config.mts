import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['test/**/*.test.cjs'],
    exclude: ['test/broker/**'],
    fileParallelism: false,
    testTimeout: 15000,
  },
});