const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

test('selects the agreed platform engine without silent fallback', () => {
  const file = path.resolve(__dirname, '../scripts/compose.cjs');
  assert.ok(fs.existsSync(file), 'Compose dispatcher is missing');
  const { selectEngine } = require(file);
  const root = path.resolve(__dirname, '..');
  assert.equal(selectEngine('win32', {}, name => name === 'docker', root).command, 'docker');
  const fallback = selectEngine('win32', {}, () => false, root);
  assert.equal(fallback.command, 'wsl.exe');
  assert.ok(fallback.prefix.includes(root));
  assert.equal(selectEngine('linux', {}, name => name === 'podman', root).command, 'podman');
  assert.equal(selectEngine('linux', {}, () => false, root).command, 'docker');
  assert.deepEqual(selectEngine('win32', { COMPOSE_BIN: '/path with spaces/compose' }, () => { throw Error('Override must win'); }, root).prefix, []);
});

test('native override forwards arguments, cwd and nonzero exit status', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'ticketing compose '));
  const file = path.join(directory, 'stub with spaces.cjs');
  fs.writeFileSync(file, 'console.log(JSON.stringify({args:process.argv.slice(2),cwd:process.cwd()}));process.exit(23);');
  try {
    const root = path.resolve(__dirname, '..');
    const result = spawnSync(process.execPath, ['--', path.join(root, 'scripts/manage-packages.cjs'), 'compose', 'config', '--env-file', 'path with spaces.env'], {
      cwd: directory, encoding: 'utf8', env: { ...process.env, COMPOSE_BIN: JSON.stringify([process.execPath, '--', file]) },
    });
    assert.equal(result.status, 23, result.stderr);
    assert.match(result.stdout, /override/);
    const report = JSON.parse(result.stdout.trim().split('\n').at(-1));
    assert.deepEqual(report.args, ['config', '--env-file', 'path with spaces.env']);
    assert.equal(report.cwd, root);
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});

test('actions use the dev overlay, except acceptance on the plain prod stack', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'ticketing compose actions '));
  const log = path.join(directory, 'calls.jsonl');
  const file = path.join(directory, 'stub.cjs');
  fs.writeFileSync(file, `require('fs').appendFileSync(${JSON.stringify(log)}, JSON.stringify(process.argv.slice(2)) + '\\n');`);
  const root = path.resolve(__dirname, '..');
  const calls = action => {
    fs.rmSync(log, { force: true });
    const result = spawnSync(process.execPath, ['--', path.join(root, 'scripts/manage-packages.cjs'), 'compose', action], {
      encoding: 'utf8', env: { ...process.env, COMPOSE_BIN: JSON.stringify([process.execPath, '--', file]) },
    });
    assert.equal(result.status, 0, result.stderr);
    return fs.readFileSync(log, 'utf8').trim().split('\n').map(line => JSON.parse(line));
  };
  const dev = ['-f', 'docker-compose.yaml', '-f', 'docker-compose.dev.yaml'];
  try {
    assert.deepEqual(calls('up'), [[...dev, 'up', '--build', '-d']]);
    assert.deepEqual(calls('acceptance'), [['up', '--build', '-d'], ['up', '-d', '--force-recreate', '--no-deps', 'orders']]);
    assert.deepEqual(calls('infra'), [
      [...dev, 'stop', 'nginx', 'auth', 'tickets', 'orders', 'expiration'],
      [...dev, 'up', '-d', 'mongo', 'redis', 'nats', 'redisinsight', 'nui'],
    ]);
    assert.deepEqual(calls('down'), [[...dev, 'down']]);
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});
