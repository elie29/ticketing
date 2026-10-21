const assert = require('node:assert/strict');
const path = require('node:path');
const { selectEngine, runCompose } = require('../scripts/compose.cjs');

const root = path.resolve(__dirname, '..');
const quiet = () => {};
const compose = (options, { available = name => name === 'docker', status = () => 0 } = {}) => {
  const calls = [];
  const run = (command, args, settings) => { calls.push({ command, args, settings }); return status(calls.length); };
  return { status: runCompose(options, root, { available, run, log: quiet }), calls };
};

test('prefers docker when both are present', () => {
  assert.equal(selectEngine(() => true).command, 'docker');
});

test('uses podman when docker is absent', () => {
  assert.equal(selectEngine(name => name === 'podman').command, 'podman');
});

test('fails when neither engine is present', () => {
  assert.throws(() => selectEngine(() => false), /Neither docker nor podman/);
  const errors = [];
  vi.spyOn(console, 'error').mockImplementation(message => errors.push(message));
  const { status, calls } = compose(['up'], { available: () => false });
  assert.notEqual(status, 0);
  assert.deepEqual(calls, []);
  assert.match(errors.join('\n'), /Neither docker nor podman/);
});

test('forwards arguments, cwd and exit status', () => {
  const { status, calls } = compose(['config', '--env-file', 'path with spaces.env'], { status: () => 23 });
  assert.equal(status, 23);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].command, 'docker');
  assert.deepEqual(calls[0].args, ['compose', 'config', '--env-file', 'path with spaces.env']);
  assert.equal(calls[0].settings.cwd, root);
});

test('actions use the dev overlay, except acceptance on the plain prod stack', () => {
  const dev = ['compose', '-f', 'docker-compose.yaml', '-f', 'docker-compose.dev.yaml'];
  const args = action => compose([action]).calls.map(call => call.args);
  assert.deepEqual(args('up'), [[...dev, 'up', '--build', '-d']]);
  assert.deepEqual(args('acceptance'), [
    ['compose', 'up', '--build', '-d'],
    ['compose', 'up', '-d', '--force-recreate', '--no-deps', 'orders'],
  ]);
  assert.deepEqual(args('infra'), [
    [...dev, 'stop', 'nginx', 'auth', 'tickets', 'orders', 'expiration'],
    [...dev, 'up', '-d', 'mongo', 'redis', 'nats', 'redisinsight', 'nui'],
  ]);
  assert.deepEqual(args('down'), [[...dev, 'down']]);
  assert.equal(compose(['acceptance']).calls[0].settings.env.ORDER_EXPIRATION_SECONDS, '15');
});

test('stops infra and acceptance after a failing first call', () => {
  for (const action of ['infra', 'acceptance']) {
    const { status, calls } = compose([action], { status: () => 1 });
    assert.equal(status, 1, action);
    assert.equal(calls.length, 1, action);
  }
});
