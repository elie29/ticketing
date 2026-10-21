const { syncPackages } = require('../lib/packages.cjs');

module.exports = context => syncPackages(context, { command: 'ci', message: 'Installing' });
