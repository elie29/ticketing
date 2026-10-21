const path = require('node:path');
const { parseEnvFile } = require('../lib/env-file.cjs');

// Only HTTP_PORT comes from the root .env, so acceptance targets the port Compose publishes and secrets stay out.
// The shell wins over the file; a repeated name keeps its first value; an empty value adds nothing.
function vitestEnvironment(base, envFileText) {
  const env = { ...base };
  if ('HTTP_PORT' in base) return env;
  const port = (envFileText ? parseEnvFile(envFileText) : []).find(([name]) => name === 'HTTP_PORT');
  if (port && port[1]) env.HTTP_PORT = port[1];
  return env;
}

// Root and client suites only; packages run their own projects with their own Vitest.
function vitest({ root, options, run, log, exists, readFile }) {
  const vitestCli = path.join(root, 'node_modules/vitest/vitest.mjs');
  if (!exists(vitestCli)) {
    log('Root dependencies are missing: run "npm install" first.');
    return 1;
  }
  const env = vitestEnvironment(process.env, readFile(path.join(root, '.env')));
  return run(process.execPath, [vitestCli, 'run', '--project', 'root', '--project', 'client', ...options], { cwd: root, env });
}

module.exports = Object.assign(vitest, { vitestEnvironment });
