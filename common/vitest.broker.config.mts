import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['test/broker/**/*.test.cjs'],
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 15000,
  },
});