'use strict';

const _ = require('lodash');

module.exports = async (app, lando) => {
  // If the proxy isnt on then just bail
  if (lando.config.proxy !== 'ON') return;

  // Get the needed ids
  const bridgeNet = lando.engine.getNetwork(lando.config.networkBridge);
  const proxyContainer = lando.config.proxyContainer;

  // Make sure the proxy container exists before we proceed
  return lando.engine.exists({id: proxyContainer}).then(exists => {
    // if doesnt exist then bail
    if (!exists) return lando.Promise.resolve();

    // Otherwise scan and add as needed
    return lando.engine.scan({id: proxyContainer}).then(data => {
      // Get existing aliases and merge them into our new ones
      // @NOTE: Do we need to handle wildcards and paths?
      const aliasPath = `NetworkSettings.Networks.${lando.config.networkBridge}.Aliases`;
      const aliases = _(_.get(app, 'config.proxy', []))
        .map(route => route)
        .flatten()
        .map(entry => _.isString(entry) ? entry : entry.hostname)
        .map(entry => _.first(entry.split(':')))
        .compact()
        .thru(routes => routes.concat(_.get(data, aliasPath, [])))
        .uniq()
        .value();

      // Disconnect so we can reconnect
      return bridgeNet.disconnect({Container: proxyContainer, Force: true})
        // Only throw non not connected errors
        .catch(error => {
          if (!_.includes(error.message, 'is not connected to network')) throw error;
        })
        // Connect
        .then(() => {
          bridgeNet.connect({Container: proxyContainer, EndpointConfig: {Aliases: aliases}});
          app.log.debug('aliased %j to the proxynet', aliases);
        });
    });
  });
};
