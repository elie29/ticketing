import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['test/**/*.test.cjs', 'client/test/**/*.test.cjs'],
    fileParallelism: false,
    restoreMocks: true,
    testTimeout: 15000,
    hookTimeout: 90000,
  },
});