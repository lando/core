'use strict';

module.exports = async lando => {
  // Ensure we munge plugin stuff together appropriately
  lando.events.on('pre-install-plugins', async options => await require('./hooks/lando-setup-common-plugins')(lando, options)); // eslint-disable-line max-len

  // Ensure we setup docker-compose if needed
  lando.events.on('pre-setup', async options => await require('./hooks/lando-setup-orchestrator')(lando, options)); // eslint-disable-line max-len

  // Ensure we setup docker if needed
  lando.events.on('pre-setup', async options => {
    switch (process.platform) {
      case 'darwin':
        return await require('./hooks/lando-setup-build-engine-darwin')(lando, options);
      case 'win32':
        return await require('./hooks/lando-setup-build-engine-win32')(lando, options);
    }
  });

  // Return some default things
  return {};
};
