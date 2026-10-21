const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const backends = ['auth', 'tickets', 'orders', 'expiration'];
const directories = ['.', 'backend/common', ...backends.map(name => `backend/${name}`), 'client'];
const packages = directories.map(directory => ({
  directory,
  manifest: JSON.parse(fs.readFileSync(path.join(root, directory, 'package.json'), 'utf8')),
}));

test('all internal packages are private and target the same Node 24 runtime', () => {
  for (const { directory, manifest } of packages) {
    assert.equal(manifest.engines?.node, '>=24 <25', directory);
    assert.equal(manifest.private, true, directory);
  }
});

test('shared direct dependencies have matching version ranges', () => {
  const versions = new Map();
  for (const { directory, manifest } of packages) {
    for (const [dependency, version] of Object.entries({
      ...manifest.dependencies,
      ...manifest.devDependencies,
    })) {
      if (versions.has(dependency)) {
        assert.equal(version, versions.get(dependency), `${directory}: ${dependency}`);
      } else {
        versions.set(dependency, version);
      }
    }
  }
});

test('backends expose consistent commands and consume common locally', () => {
  for (const backend of backends) {
    const directory = `backend/${backend}`;
    const { manifest } = packages.find(entry => entry.directory === directory);
    for (const [name, command] of Object.entries({
      start: 'tsx src/index.ts',
      dev: 'tsx watch --include "../common/build/**/*.js" src/index.ts',
      typecheck: 'tsc --noEmit',
      test: `vitest run --config ../../vitest.config.mts --project ${backend}`,
      'test:watch': `vitest --config ../../vitest.config.mts --project ${backend}`,
      'test:ci': `vitest run --config ../../vitest.config.mts --project ${backend}`,
    })) {
      assert.equal(manifest.scripts[name], command, `${directory}: ${name}`);
    }
    assert.equal(manifest.dependencies['@elie29/ticketing-common'], 'file:../common');
    const lock = JSON.parse(fs.readFileSync(path.join(root, directory, 'package-lock.json'), 'utf8'));
    const common = packages.find(entry => entry.directory === 'backend/common').manifest;
    assert.deepEqual(lock.packages['../common'].dependencies, common.dependencies, `${directory}: locked common dependencies`);
    assert.ok(!manifest.dependencies['express-async-errors']);
    assert.ok(!manifest.devDependencies['ts-jest']);
  }
});

test('service tests and mocks live outside production source without losing suites', () => {
  for (const [backend, suites] of Object.entries({ auth: 4, tickets: 7, orders: 8, expiration: 1 })) {
    const directory = `backend/${backend}`;
    const source = fs.readdirSync(path.join(root, directory, 'src'), { recursive: true });
    assert.ok(!source.some(file => file.endsWith('.test.ts') || /(?:^|[/\\])(?:test|__mocks__)[/\\].*\.ts$/.test(file)), directory);
    const tests = fs.readdirSync(path.join(root, directory, 'test'), { recursive: true });
    assert.equal(tests.filter(file => file.endsWith('.test.ts')).length, suites, directory);
  }
});