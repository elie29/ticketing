const fs = require('node:fs');
const path = require('node:path');
const { createNpm, run } = require('./lib/process.cjs');

// Each action runs in the shell it was launched from, with that environment's node, npm and tools.
const actions = {
  install: () => require('./actions/install.cjs'),
  update: () => require('./actions/update.cjs'),
  test: () => require('./actions/test.cjs'),
  dev: () => require('./actions/dev.cjs'),
  vitest: () => require('./actions/vitest.cjs'),
  compose: () => ({ root, options }) => require('./compose.cjs').runCompose(options, root),
};

const [name, ...options] = process.argv.slice(2);
if (!Object.hasOwn(actions, name)) {
  console.error('Expected install, update, test, dev, compose, or vitest.');
  process.exit(1);
}

const context = {
  root: path.resolve(__dirname, '..'),
  options,
  run,
  log: console.log,
  exists: fs.existsSync,
  readFile: file => (fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null),
  loadConcurrently: () => import('concurrently').then(module => module.concurrently),
  // Created on first use, so compose and vitest never need npm_execpath.
  get npm() { return createNpm(); },
};

Promise.resolve()
  .then(() => actions[name]()(context))
  .then(status => process.exit(status), error => { console.error(error.message); process.exit(1); });
