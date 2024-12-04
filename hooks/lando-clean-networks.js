'use strict';

// Modules
const _ = require('lodash');

module.exports = async lando => lando.engine.getNetworks().then(networks => {
  if (_.size(networks) >= 32) {
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
