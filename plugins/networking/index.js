'use strict';

// Modules
const _ = require('lodash');
const fs = require('fs');
const getDockerDesktopBin = require('../../utils/get-docker-desktop-x');

/*
 * Helper to clean out any old networks when we hit the limit
 */
const cleanNetworks = lando => lando.engine.getNetworks()
  .then(networks => {
    if (_.size(networks) >= lando.config.networkLimit) {
      // Warn user about this action
      lando.log.warn('Lando has detected you are at Docker\'s network limit!');
      lando.log.warn('Give us a moment as we try to make space by cleaning up old networks...');
      // Go through lando containers and add in networks
      return lando.engine.list()
      .filter(container => container.kind === 'app')
      // And add them to our default list
      .map(container => `${container.app}_default`)
      .then(networks => {
        const nets = _.uniq(networks).concat(['bridge', 'host', 'none', lando.config.networkBridge]);
        if (_.has(lando, 'config.proxyNet')) nets.push(lando.config.proxyNet);
        return nets;
      })
      // Filter out landoy ones
      .then(nets => _.filter(networks, network => !_.includes(nets, network.Name)))
      // Inspect remaining networks to make sure we don't remove any with attached containers
      .map(network => lando.engine.getNetwork(network.Id))
      .map(network => network.inspect())
      // Filter out any with containers
      .filter(network => _.isEmpty(network.Containers))
      // Return the oldest 5 unused networks
      // @TODO: what is the best assumption here?
      .then(networks => _.slice(_.orderBy(networks, 'Created', 'asc'), 0, 5))
      // Get the Network object
      .map(network => lando.engine.getNetwork(network.Id))
      // and remove it
      .each(net => {
        lando.log.warn('Removing old network %s', net.id);
        net.remove();
      });
    }
  });

module.exports = lando => {
  const debug = require('../../utils/debug-shim')(lando.log);

  // Preemptively make sure we have enough networks and if we don't smartly prune some of them
  lando.events.on('pre-engine-start', 1, () => cleanNetworks(lando));

  // Add network add task
  lando.events.once('pre-setup', async options => {
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
        return !require('../../utils/is-group-member')('docker');
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
        const LandoDaemon = require('../../lib/daemon');
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
  });

  // Return our default config
  return {
    config: {
      networkBridge: 'lando_bridge_network',
    },
  };
};
