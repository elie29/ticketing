const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

function hasCommand(name) {
  const extensions = process.platform === 'win32' ? (process.env.PATHEXT || '.EXE;.CMD').split(';') : [''];
  return (process.env.PATH || '').split(path.delimiter).some(directory => extensions.some(extension => {
    try { fs.accessSync(path.join(directory, name + extension), fs.constants.X_OK); return true; }
    catch { return false; }
  }));
}

function selectEngine(platform, env, available, root) {
  if (env.COMPOSE_BIN) {
    const parts = env.COMPOSE_BIN.startsWith('[') ? JSON.parse(env.COMPOSE_BIN) : [env.COMPOSE_BIN];
    if (!Array.isArray(parts) || !parts.length || parts.some(value => typeof value !== 'string' || !value)) {
      throw new Error('COMPOSE_BIN must be an executable path or JSON command array');
    }
    return { command: parts[0], prefix: parts.slice(1), label: 'explicit override' };
  }
  if (platform === 'win32' && !available('docker')) {
    return { command: 'wsl.exe', prefix: ['--cd', root, '--exec', '/bin/bash', '-lic', 'exec podman compose "$@"', 'ticketing'], label: 'Podman Compose inside WSL' };
  }
  const command = platform !== 'win32' && available('podman') ? 'podman' : 'docker';
  return { command, prefix: ['compose'], label: `${command} compose natively (${platform})` };
}

function runCompose(options, root) {
  const engine = selectEngine(process.platform, process.env, hasCommand, root);
  console.log(`Compose engine: ${engine.label}`);
  const [action = 'up', ...args] = options;
  const env = { ...process.env };
  if (action === 'acceptance') env.ORDER_EXPIRATION_SECONDS = '15';
  if (engine.command === 'wsl.exe') {
    const forwarded = ['ORDER_EXPIRATION_SECONDS', 'COMPOSE_PROJECT_NAME', 'COMPOSE_PROFILES', 'COMPOSE_FILE'];
    env.WSLENV = [env.WSLENV, ...forwarded.filter(name => env[name])].filter(Boolean).join(':');
  }
  function execute(commandArgs) {
    const result = spawnSync(engine.command, [...engine.prefix, ...commandArgs], { cwd: root, env, stdio: 'inherit' });
    if (result.error) console.error(`${engine.label}: ${result.error.message}. Check the selected engine and Compose provider.`);
    return result.status ?? (result.signal === 'SIGINT' ? 130 : 1);
  }
  // The dev overlay publishes the infra ports on 127.0.0.1 and defines the Redis Insight UI.
  const dev = ['-f', 'docker-compose.yaml', '-f', 'docker-compose.dev.yaml'];
  if (action === 'infra') {
    const status = execute([...dev, 'stop', 'nginx', 'auth', 'tickets', 'orders', 'expiration']);
    return status || execute([...dev, 'up', '-d', ...args, 'mongo', 'redis', 'nats', 'redisinsight']);
  }
  if (action === 'acceptance') {
    const status = execute(['up', '--build', '-d', ...args]);
    return status || execute(['up', '-d', '--force-recreate', '--no-deps', 'orders']);
  }
  if (action === 'up') return execute(['up', '--build', '-d', ...args]);
  if (action === 'down') return execute([...dev, 'down', ...args]);
  return execute([action, ...args]);
}

module.exports = { selectEngine, runCompose };