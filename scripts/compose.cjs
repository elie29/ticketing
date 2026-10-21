const { hasCommand, run } = require('./lib/process.cjs');

// Same order on every platform: Docker, then Podman, otherwise a clear error. No override, no fallback after a failure.
function selectEngine(available) {
  for (const command of ['docker', 'podman']) {
    if (available(command)) return { command, label: `${command} compose` };
  }
  throw new Error('Neither docker nor podman was found on PATH. Install one of them to use the compose commands.');
}

function runCompose(options, root, { available = hasCommand, run: runner = run, log = console.log } = {}) {
  let engine;
  try { engine = selectEngine(available); }
  catch (error) { console.error(error.message); return 1; }
  log(`Compose engine: ${engine.label}`);
  const [action = 'up', ...args] = options;
  const env = { ...process.env };
  if (action === 'acceptance') env.ORDER_EXPIRATION_SECONDS = '15';
  const execute = commandArgs => runner(engine.command, ['compose', ...commandArgs], { cwd: root, env });
  // The dev overlay publishes the infra ports on 127.0.0.1 and defines the Redis Insight and NUI (NATS) UIs.
  // up, infra and down use it; acceptance tests the plain production stack.
  const dev = ['-f', 'docker-compose.yaml', '-f', 'docker-compose.dev.yaml'];
  if (action === 'infra') {
    const status = execute([...dev, 'stop', 'nginx', 'auth', 'tickets', 'orders', 'expiration']);
    return status || execute([...dev, 'up', '-d', ...args, 'mongo', 'redis', 'nats', 'redisinsight', 'nui']);
  }
  if (action === 'acceptance') {
    const status = execute(['up', '--build', '-d', ...args]);
    return status || execute(['up', '-d', '--force-recreate', '--no-deps', 'orders']);
  }
  if (action === 'up') return execute([...dev, 'up', '--build', '-d', ...args]);
  if (action === 'down') return execute([...dev, 'down', ...args]);
  return execute([action, ...args]);
}

module.exports = { selectEngine, runCompose };
