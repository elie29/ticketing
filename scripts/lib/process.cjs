const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const THROUGH_NPM = 'run this command through npm, for example "npm run install".';

// A signal maps to 128 + its number, as a shell reports it (SIGINT 130, SIGTERM 143).
function exitStatus({ status, signal }) {
  if (status !== null && status !== undefined) return status;
  const number = signal && os.constants.signals[signal];
  return number ? 128 + number : 1;
}

// Children run without a shell: arguments reach them exactly as given, on every platform.
function run(command, args, options = {}) {
  const result = spawnSync(command, args, { stdio: 'inherit', ...options });
  if (result.error) {
    console.error(`${command}: ${result.error.message}`);
    return 1;
  }
  return exitStatus(result);
}

// npm runs as `node <npm-cli.js>` from the npm that launched us, which avoids the npm.cmd shim on Windows.
function createNpm({ env = process.env, execPath = process.execPath, run: runner = run } = {}) {
  const cli = env.npm_execpath;
  if (!cli) throw new Error(`npm_execpath is not set: ${THROUGH_NPM}`);
  if (path.basename(cli) !== 'npm-cli.js') throw new Error(`npm_execpath (${cli}) is not npm: ${THROUGH_NPM}`);
  return (args, options) => runner(execPath, [cli, ...args], options);
}

function hasCommand(name, env = process.env, platform = process.platform) {
  const extensions = platform === 'win32' ? (env.PATHEXT || '.EXE;.CMD').split(';') : [''];
  return (env.PATH || '').split(path.delimiter).some(directory => extensions.some(extension => {
    try { fs.accessSync(path.join(directory, name + extension), fs.constants.X_OK); return true; }
    catch { return false; }
  }));
}

// Mirrors bash `set -e`: the first non-zero status stops the sequence and becomes the result.
function runSteps(steps) {
  for (const step of steps) {
    const status = step();
    if (status !== 0) return status;
  }
  return 0;
}

module.exports = { run, exitStatus, createNpm, hasCommand, runSteps };
