const path = require('node:path');
const { runSteps } = require('./process.cjs');

const PACKAGES = ['backend/auth', 'backend/tickets', 'backend/orders', 'backend/expiration', 'client'];

// install and update share one shape: root (lifecycle scripts off, so the root hook does not recurse),
// then common and its build, then every consumer.
function syncPackages({ root, options, npm, log }, { command, message }) {
  const prefix = directory => ['--prefix', path.join(root, directory)];
  return runSteps([
    () => npm(['--prefix', root, command, '--ignore-scripts', ...options]),
    () => npm([...prefix('backend/common'), command, ...options]),
    () => npm([...prefix('backend/common'), 'run', 'build']),
    ...PACKAGES.map(directory => () => {
      log(`${message} ${directory} dependencies`);
      return npm([...prefix(directory), command, ...options]);
    }),
  ]);
}

module.exports = { syncPackages };
