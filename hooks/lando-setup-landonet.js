'use strict';

const _ = require('lodash');
const fs = require('fs');
const getDockerDesktopBin = require('../utils/get-docker-desktop-x');

/**
 * Installs the Lando Development Certificate Authority (CA) on Windows systems.
 * This module is called by `lando setup` to ensure the Lando CA is trusted by the system.
 *
 * @param {Object} lando - The Lando config object
 * @param {Object} options - Options passed to the setup command
 * @return {Promise<void>}
 */
module.exports = async (lando, options) => {
  const debug = require('../utils/debug-shim')(lando.log);

  // skip the installation of the network if set
  if (options.skipNetworking) return;

  // we need access to dat socket for this to work
  const dependsOn = ['linux', 'wsl']
    .includes(lando.config.os.landoPlatform) ? ['setup-build-engine-group', 'setup-build-engine'] : ['setup-build-engine'];

  options.tasks.push({
    title: `Creating Landonet`,
    id: 'create-landonet',
    dependsOn,
    description: '@lando/landonet',
    comments: {
      'NOT INSTALLED': 'Will create LandoNet',
    },
    skip: () => {
      if (!['linux', 'wsl'].includes(lando.config.os.landoPlatform)) return false;
      return !require('../utils/is-group-member')('docker');
    },
    hasRun: async () => {
      // if docker isnt even installed then this is easy
      if (lando.engine.dockerInstalled === false) return false;

      // we also want to do an additional check on docker-destkop
      if (lando.config.os.landoPlatform !== 'linux' && !fs.existsSync(getDockerDesktopBin())) return false;

      // otherwise attempt to sus things out
      try {
        await lando.engine.daemon.up({max: 10, backoff: 1000});
        const landonet = lando.engine.getNetwork(lando.config.networkBridge);
        await landonet.inspect();
        return lando.versions.networking > 1;
      } catch (error) {
        debug('looks like there isnt a landonet yet %o %o', error?.message, error?.stack);
        return false;
      }
    },
    task: async (ctx, task) => {
      // we reinstantiate instead of using lando.engine.daemon so we can ensure an up-to-date docker bin
      const LandoDaemon = require('../lib/daemon');
      const daemon = new LandoDaemon(lando.cache, lando.events, undefined, lando.log);

      // we need docker up for this
      await daemon.up({max: 5, backoff: 1000});

      // if we are v1 then disconnect and remove for upgrade
      if (lando.versions.networking === 1) {
        const landonet = lando.engine.getNetwork(lando.config.networkBridge);
        await landonet.inspect()
          .then(data => _.keys(data.Containers))
          .each(id => landonet.disconnect({Container: id, Force: true}))
          .then(() => landonet.remove())
          .catch(error => {
            debug('error disconnecting from old landonet %o %o', error.message, error.stack);
          });
      }

      // create landonet2
      await lando.engine.getNetworks()
        .then(networks => _.some(networks, network => network.Name === lando.config.networkBridge))
        .then(exists => {
          if (!exists) {
            return lando.engine.createNetwork(lando.config.networkBridge).then(() => {
              lando.cache.set('versions', _.merge({}, lando.versions, {networking: 2}), {persist: true});
              lando.versions = lando.cache.get('versions');
              debug('created %o with version info %o', lando.config.networkBridge, lando.versions.networking);
            });
          }
        });
      task.title = 'Created Landonet';
    },
  });
};
