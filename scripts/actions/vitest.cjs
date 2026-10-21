const path = require('node:path');

// Root and client suites only; packages run their own projects with their own Vitest.
module.exports = ({ root, options, run, log, exists }) => {
  const vitest = path.join(root, 'node_modules/vitest/vitest.mjs');
  if (!exists(vitest)) {
    log('Root dependencies are missing: run "npm install" first.');
    return 1;
  }
  return run(process.execPath, [vitest, 'run', '--project', 'root', '--project', 'client', ...options], { cwd: root });
};
