const { syncPackages } = require('../lib/packages.cjs');

module.exports = context => {
  const status = syncPackages(context, { command: 'update', message: 'Updating' });
  if (status === 0) context.log('Packages updated. Restart affected services to load the changes.');
  return status;
};
