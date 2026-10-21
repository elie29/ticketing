const path = require('node:path');
const { parseEnvFile } = require('../lib/env-file.cjs');

// The root .env (shared with Compose infra mode) fills in only what the shell has not set; a repeated name keeps its first value.
// `name in base` stays case-insensitive on Windows when base is process.env.
function devEnvironment(base, envFileText) {
  const env = { ...base };
  for (const [name, value] of envFileText ? parseEnvFile(envFileText) : []) {
    if (!(name in base) && !(name in env)) env[name] = value;
  }
  const fallback = (name, value) => { env[name] = env[name] || value; };
  env.NODE_ENV = 'development';
  fallback('JWT_KEY', 'local-development-only-change-me');
  fallback('MONGO_USR', env.MONGO_ROOT_USERNAME || 'root');
  fallback('MONGO_PWD', env.MONGO_ROOT_PASSWORD || 'local-dev-password');
  fallback('NATS_URL', 'nats://127.0.0.1:4222');
  fallback('REDIS_HOST', '127.0.0.1');
  fallback('REDIS_PORT', '6379');
  fallback('AUTH_API_URL', 'http://127.0.0.1:3001');
  fallback('ORDERS_API_URL', 'http://127.0.0.1:3002');
  fallback('TICKETS_API_URL', 'http://127.0.0.1:3003');
  env.TSC_WATCHFILE = 'DynamicPriorityPolling';
  env.CHOKIDAR_USEPOLLING = 'true';
  return env;
}

// Fixed command strings with no caller input; per-service variables travel as env, not `env VAR=…`.
function devCommands() {
  const mongo = database => `mongodb://127.0.0.1:27017/${database}`;
  return [
    { name: 'common', command: 'npm --prefix backend/common run dev' },
    { name: 'auth', command: 'npm --prefix backend/auth run dev', env: { MONGO_URI: mongo('auth'), SERVER_PORT: '3001' } },
    { name: 'tickets', command: 'npm --prefix backend/tickets run dev', env: { MONGO_URI: mongo('tickets'), SERVER_PORT: '3003', NATS_CLIENT: 'tickets-dev' } },
    { name: 'orders', command: 'npm --prefix backend/orders run dev', env: { MONGO_URI: mongo('orders'), SERVER_PORT: '3002', NATS_CLIENT: 'orders-dev' } },
    { name: 'expiration', command: 'npm --prefix backend/expiration run dev', env: { NATS_CLIENT: 'expiration-dev' } },
    { name: 'client', command: 'npm --prefix client run dev' },
  ];
}

// File access and concurrently come from the context, so the orchestration is testable like the other actions.
async function dev({ root, npm, readFile, loadConcurrently }) {
  const env = devEnvironment(process.env, readFile(path.join(root, '.env')));
  const status = npm(['--prefix', path.join(root, 'backend/common'), 'run', 'build'], { cwd: root, env });
  if (status !== 0) return status;
  const concurrently = await loadConcurrently();
  const commands = devCommands().map(command => ({ ...command, env: { ...env, ...command.env } }));
  const { result } = concurrently(commands, { cwd: root, killOthersOn: ['failure', 'success'] });
  return result.then(() => 0, events => {
    const failed = (Array.isArray(events) ? events : []).find(event => typeof event.exitCode === 'number' && event.exitCode !== 0);
    return failed ? failed.exitCode : 1;
  });
}

module.exports = Object.assign(dev, { devEnvironment, devCommands });
