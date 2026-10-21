const path = require('node:path');
const { runSteps } = require('../lib/process.cjs');

const BACKENDS = ['auth', 'tickets', 'orders', 'expiration'];

// Caller options go only to each backend's test:ci, as before.
module.exports = ({ root, options, npm, log }) => {
  const script = (directory, name, extra = []) => () => npm(['--prefix', path.join(root, directory), 'run', name, ...extra]);
  return runSteps([
    script('backend/common', 'typecheck'),
    script('backend/common', 'test:ci'),
    ...BACKENDS.flatMap(service => [
      () => { log(`Checking and testing ${service}`); return script(`backend/${service}`, 'typecheck')(); },
      script(`backend/${service}`, 'test:ci', options),
    ]),
    script('client', 'lint'),
    script('client', 'build'),
  ]);
};
