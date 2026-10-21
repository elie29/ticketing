const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const launcher = path.join(root, 'scripts/manage-packages.cjs');
// Windows variable names are case-insensitive and Vitest workers may see them uppercased (NPM_EXECPATH);
// drop every spelling so the child cannot inherit the real npm next to the stub.
const envWithNpm = execPath => {
  const env = Object.fromEntries(Object.entries(process.env).filter(([name]) => name.toLowerCase() !== 'npm_execpath'));
  return execPath ? { ...env, npm_execpath: execPath } : env;
};
const recorder = (status = () => 0) => {
  const calls = [];
  return { calls, fn: (...call) => { calls.push(call); return status(calls.length); } };
};

test('createNpm runs the launching npm CLI through node', () => {
  const { createNpm } = require('../scripts/lib/process.cjs');
  const run = recorder();
  const npm = createNpm({ env: { npm_execpath: '/x/npm-cli.js' }, execPath: '/node', run: run.fn });
  assert.equal(npm(['ci'], { cwd: 'C:/a b' }), 0);
  assert.deepEqual(run.calls, [['/node', ['/x/npm-cli.js', 'ci'], { cwd: 'C:/a b' }]]);
});

test('createNpm refuses to run outside npm', () => {
  const { createNpm } = require('../scripts/lib/process.cjs');
  assert.throws(() => createNpm({ env: {}, run: () => 0 }), /npm_execpath is not set/);
});

test('createNpm refuses another package manager', () => {
  const { createNpm } = require('../scripts/lib/process.cjs');
  for (const other of ['/x/pnpm.cjs', '/x/yarn.js', 'C:/bun/bun.exe']) {
    assert.throws(() => createNpm({ env: { npm_execpath: other }, run: () => 0 }), /is not npm: run this command through npm/, other);
  }
});

test('exitStatus reports signals as 128 + their number, like a shell', () => {
  const { exitStatus } = require('../scripts/lib/process.cjs');
  assert.equal(exitStatus({ status: 3, signal: null }), 3);
  assert.equal(exitStatus({ status: null, signal: 'SIGTERM' }), 143);
  assert.equal(exitStatus({ status: null, signal: 'SIGINT' }), 130);
  assert.equal(exitStatus({ status: null, signal: null }), 1);
});

test('runSteps stops at the first failure', () => {
  const { runSteps } = require('../scripts/lib/process.cjs');
  const called = [];
  const step = (index, status) => () => { called.push(index); return status; };
  assert.equal(runSteps([step(1, 0), step(2, 7), step(3, 0)]), 7);
  assert.deepEqual(called, [1, 2]);
});

describe('package actions', () => {
  const R = 'R';
  const prefix = directory => ['--prefix', path.join(R, directory)];
  const services = ['backend/auth', 'backend/tickets', 'backend/orders', 'backend/expiration', 'client'];
  const act = (name, { status, exists } = {}) => {
    const npm = recorder(status);
    const run = recorder(status);
    const logs = [];
    const action = require(`../scripts/actions/${name}.cjs`);
    const result = action({ root: R, options: ['--x'], npm: npm.fn, run: run.fn, log: message => logs.push(message), exists });
    return { result, npm: npm.calls.map(([args]) => args), run: run.calls, logs };
  };

  test('install runs ci for root, common (then builds it) and each package in order', () => {
    const { result, npm, logs } = act('install');
    assert.equal(result, 0);
    assert.deepEqual(npm, [
      ['--prefix', R, 'ci', '--ignore-scripts', '--x'],
      [...prefix('backend/common'), 'ci', '--x'],
      [...prefix('backend/common'), 'run', 'build'],
      ...services.map(service => [...prefix(service), 'ci', '--x']),
    ]);
    assert.deepEqual(logs, services.map(service => `Installing ${service} dependencies`));
  });

  test('install stops after a failing step', () => {
    const { result, npm } = act('install', { status: count => (count === 3 ? 1 : 0) });
    assert.equal(result, 1);
    assert.equal(npm.length, 3);
  });

  test('update runs update in the same order and reminds to restart', () => {
    const { result, npm, logs } = act('update');
    assert.equal(result, 0);
    assert.deepEqual(npm, [
      ['--prefix', R, 'update', '--ignore-scripts', '--x'],
      [...prefix('backend/common'), 'update', '--x'],
      [...prefix('backend/common'), 'run', 'build'],
      ...services.map(service => [...prefix(service), 'update', '--x']),
    ]);
    assert.deepEqual(logs, [
      ...services.map(service => `Updating ${service} dependencies`),
      'Packages updated. Restart affected services to load the changes.',
    ]);
  });

  test('test checks common, each backend (options only to test:ci), then lints and builds the client', () => {
    const { result, npm, logs } = act('test');
    assert.equal(result, 0);
    const backends = ['auth', 'tickets', 'orders', 'expiration'];
    assert.deepEqual(npm, [
      [...prefix('backend/common'), 'run', 'typecheck'],
      [...prefix('backend/common'), 'run', 'test:ci'],
      ...backends.flatMap(service => [
        [...prefix(`backend/${service}`), 'run', 'typecheck'],
        [...prefix(`backend/${service}`), 'run', 'test:ci', '--x'],
      ]),
      [...prefix('client'), 'run', 'lint'],
      [...prefix('client'), 'run', 'build'],
    ]);
    assert.deepEqual(logs, backends.map(service => `Checking and testing ${service}`));
  });

  test('vitest runs the root and client projects with node from the root', () => {
    const { result, run } = act('vitest', { exists: () => true });
    assert.equal(result, 0);
    assert.deepEqual(run, [[
      process.execPath,
      [path.join(R, 'node_modules/vitest/vitest.mjs'), 'run', '--project', 'root', '--project', 'client', '--x'],
      { cwd: R },
    ]]);
  });

  test('vitest without root dependencies asks for an install', () => {
    const { result, run, logs } = act('vitest', { exists: () => false });
    assert.equal(result, 1);
    assert.deepEqual(run, []);
    assert.deepEqual(logs, ['Root dependencies are missing: run "npm install" first.']);
  });
});

describe('dev', () => {
  test('parseEnvFile keeps valid NAME=value lines, CRLF-safe, value after the first =', () => {
    const { parseEnvFile } = require('../scripts/lib/env-file.cjs');
    assert.deepEqual(parseEnvFile('A=1\r\nB=x=y\r\n# c\r\n1BAD=2\r\n'), [['A', '1'], ['B', 'x=y']]);
  });

  test('devEnvironment lets the shell win over .env and applies the dev defaults', () => {
    const { devEnvironment } = require('../scripts/actions/dev.cjs');
    const merged = devEnvironment({ A: 'shell', NODE_ENV: 'production' }, 'A=file\nB=file');
    assert.equal(merged.A, 'shell');
    assert.equal(merged.B, 'file');
    assert.equal(merged.NODE_ENV, 'development');
    assert.equal(devEnvironment({}, 'C=first\nC=second').C, 'first');
    assert.equal(devEnvironment({}, 'MONGO_ROOT_USERNAME=admin').MONGO_USR, 'admin');
    const defaults = devEnvironment({}, null);
    assert.equal(defaults.MONGO_USR, 'root');
    assert.equal(defaults.MONGO_PWD, 'local-dev-password');
    assert.equal(defaults.NATS_URL, 'nats://127.0.0.1:4222');
    assert.equal(defaults.JWT_KEY, 'local-development-only-change-me');
    assert.equal(defaults.TSC_WATCHFILE, 'DynamicPriorityPolling');
    assert.equal(defaults.CHOKIDAR_USEPOLLING, 'true');
  });

  test('devCommands start the six watchers with their own environment and no shell helpers', () => {
    const { devCommands } = require('../scripts/actions/dev.cjs');
    const commands = devCommands();
    assert.deepEqual(commands.map(command => command.name), ['common', 'auth', 'tickets', 'orders', 'expiration', 'client']);
    const env = name => commands.find(command => command.name === name).env;
    assert.deepEqual(env('auth'), { MONGO_URI: 'mongodb://127.0.0.1:27017/auth', SERVER_PORT: '3001' });
    assert.deepEqual(env('tickets'), { MONGO_URI: 'mongodb://127.0.0.1:27017/tickets', SERVER_PORT: '3003', NATS_CLIENT: 'tickets-dev' });
    assert.deepEqual(env('orders'), { MONGO_URI: 'mongodb://127.0.0.1:27017/orders', SERVER_PORT: '3002', NATS_CLIENT: 'orders-dev' });
    assert.deepEqual(env('expiration'), { NATS_CLIENT: 'expiration-dev' });
    assert.equal(commands.find(command => command.name === 'client').command, 'npm --prefix client run dev');
    assert.ok(commands.every(({ command }) => !/\benv |bash/.test(command)));
  });

  const startDev = async ({ build = 0, outcome = Promise.resolve([]), envFile = 'FROM_FILE=yes' } = {}) => {
    const dev = require('../scripts/actions/dev.cjs');
    const npm = recorder(() => build);
    const started = [];
    const concurrently = (commands, options) => { started.push({ commands, options }); return { result: outcome }; };
    const read = [];
    const status = await dev({
      root: 'R', npm: npm.fn,
      readFile: file => { read.push(file); return envFile; },
      loadConcurrently: async () => concurrently,
    });
    return { status, npm: npm.calls, started, read };
  };

  test('dev stops before the watchers when the common build fails', async () => {
    const { status, npm, started } = await startDev({ build: 2 });
    assert.equal(status, 2);
    assert.deepEqual(npm.map(([args]) => args), [['--prefix', path.join('R', 'backend/common'), 'run', 'build']]);
    assert.deepEqual(started, []);
  });

  test('dev starts every watcher from the root with the merged environment and kill-others', async () => {
    const { status, started, read } = await startDev();
    assert.equal(status, 0);
    assert.deepEqual(read, [path.join('R', '.env')]);
    const [{ commands, options }] = started;
    assert.deepEqual(options, { cwd: 'R', killOthersOn: ['failure', 'success'] });
    assert.equal(commands.length, 6);
    const auth = commands.find(command => command.name === 'auth');
    assert.equal(auth.env.FROM_FILE, 'yes');
    assert.equal(auth.env.NODE_ENV, 'development');
    assert.equal(auth.env.SERVER_PORT, '3001');
  });

  test('dev returns the failing watcher exit code, or 1 when none is known', async () => {
    assert.equal((await startDev({ outcome: Promise.reject([{ exitCode: 0 }, { exitCode: 3 }]) })).status, 3);
    assert.equal((await startDev({ outcome: Promise.reject([{ exitCode: 'SIGTERM' }]) })).status, 1);
  });

  test('dev works without a root .env', async () => {
    const { status, started } = await startDev({ envFile: null });
    assert.equal(status, 0);
    assert.equal(started[0].commands[0].env.FROM_FILE, undefined);
  });
});

describe('manage-packages end to end', () => {
  let directory, log, stub;
  beforeEach(() => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), 'ticketing launcher '));
    log = path.join(directory, 'calls.jsonl');
    fs.mkdirSync(path.join(directory, 'stub npm'));
    stub = path.join(directory, 'stub npm', 'npm-cli.js');
    fs.writeFileSync(stub, `const args = process.argv.slice(2);
require('fs').appendFileSync(${JSON.stringify(log)}, JSON.stringify({ args, cwd: process.cwd() }) + '\\n');
process.exit(args.includes('--fail') ? 23 : 0);`);
  });
  afterEach(() => fs.rmSync(directory, { recursive: true, force: true }));

  test('forwards real arguments, cwd and exit status', () => {
    const result = spawnSync(process.execPath, [launcher, 'install', '--fail', 'path with spaces.env'], {
      cwd: directory, encoding: 'utf8', env: envWithNpm(stub),
    });
    assert.equal(result.status, 23, result.stderr);
    const calls = fs.readFileSync(log, 'utf8').trim().split('\n').map(line => JSON.parse(line));
    assert.deepEqual(calls, [{
      args: ['--prefix', root, 'ci', '--ignore-scripts', '--fail', 'path with spaces.env'],
      cwd: fs.realpathSync(directory),
    }]);
  });

  test('exits non-zero with the npm error when not launched through npm', () => {
    const result = spawnSync(process.execPath, [launcher, 'install'], { cwd: directory, encoding: 'utf8', env: envWithNpm() });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /npm_execpath is not set/);
    assert.ok(!fs.existsSync(log));
  });
});
