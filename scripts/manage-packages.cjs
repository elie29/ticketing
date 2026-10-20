const { spawnSync } = require('node:child_process');
const path = require('node:path');

const [action, ...options] = process.argv.slice(2);
if (!['install', 'update', 'test', 'dev', 'compose', 'vitest'].includes(action)) {
  console.error('Expected install, update, test, dev, compose, or vitest.');
  process.exit(1);
}

const root = path.resolve(__dirname, '..');
let result;

if (action === 'compose') {
  try { process.exit(require('./compose.cjs').runCompose(options, root)); }
  catch (error) { console.error(error.message); process.exit(1); }
}

if (process.platform === 'win32') {
  const converted = spawnSync('wsl.exe', ['--exec', 'wslpath', '-u', root], {
    encoding: 'utf8',
  });
  if (converted.error || converted.status !== 0) {
    console.error(converted.error?.message || converted.stderr || 'WSL is unavailable.');
    process.exit(1);
  }

  result = spawnSync('wsl.exe', [
    '--cd', converted.stdout.trim(),
    '--exec', '/bin/bash', '-lic', 'exec bash "$@"',
    'ticketing', `scripts/${action}.sh`, ...options,
  ], { stdio: 'inherit' });
} else {
  result = spawnSync('bash', [path.join(__dirname, `${action}.sh`), ...options], {
    cwd: root,
    stdio: 'inherit',
  });
}

if (result.error) console.error(result.error.message);
process.exit(result.status ?? 1);