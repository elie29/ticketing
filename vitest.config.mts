import { resolve } from 'node:path';
// Type-only: packages load this file with their own Vitest, even without the root install.
import type { TestProjectInlineConfiguration, ViteUserConfig } from 'vitest/config';

type ProjectTest = NonNullable<TestProjectInlineConfiguration['test']>;

const project = (name: string, directory: string, test: ProjectTest): TestProjectInlineConfiguration => ({
  extends: true,
  test: { name, root: resolve(import.meta.dirname, directory), ...test },
});

const service = (name: string, setupFiles: string[]) =>
  project(name, name, {
    include: ['test/**/*.test.ts'],
    setupFiles,
    testTimeout: 60000,
    hookTimeout: 60000,
  });

const rootSuite: ProjectTest = {
  include: ['test/**/*.test.cjs'],
  restoreMocks: true,
  testTimeout: 15000,
  hookTimeout: 90000,
};

export default {
  test: {
    environment: 'node',
    globals: true,
    fileParallelism: false,
    projects: [
      project('root', '.', rootSuite),
      project('client', 'client', rootSuite),
      project('common', 'common', {
        include: ['test/**/*.test.cjs'],
        exclude: ['test/broker/**'],
        testTimeout: 15000,
      }),
      project('common-broker', 'common', {
        include: ['test/broker/**/*.test.cjs'],
        testTimeout: 20000,
        hookTimeout: 15000,
      }),
      service('auth', ['./test/setup.ts']),
      service('tickets', ['./test/setup.ts']),
      service('orders', ['./test/setup.ts']),
      service('expiration', []),
    ],
  },
} satisfies ViteUserConfig;
