'use strict';

const _ = require('lodash');

const isNotConnectedError = error => _.includes(error.message, 'is not connected to network')
  || _.includes(error.message, 'network or container is not found');

/**
 * Connects the proxy container to the lando bridge network with DNS aliases
 * for all proxied hostnames in the app.
 *
 * Works with both Docker and containerd backends:
 * - Docker: uses Dockerode's native Network handle via lando.engine.getNetwork()
 * - Containerd: uses ContainerdContainer.getNetwork() which provides a
 *   Dockerode-compatible handle backed by finch-daemon's Docker API
 *
 * For containerd, also ensures the bridge network has a CNI conflist so that
 * the nerdctl OCI hook can configure container networking.
 *
 * @param {Object} app - The Lando app instance.
 * @param {Object} lando - The Lando instance.
 * @return {Promise<void>}
 */
module.exports = async (app, lando) => {
  // If the proxy isnt on then just bail
  if (lando.config.proxy !== 'ON') return;

  // For containerd backend, ensure the bridge network has a CNI config
  if (lando.engine?.engineBackend === 'containerd') {
    const ensureCniNetwork = require('../utils/ensure-cni-network');
    ensureCniNetwork(lando.config.networkBridge, {
      debug: lando.log.debug.bind(lando.log),
    });
  }

  // Get the needed ids
  const bridgeNet = lando.engine.getNetwork(lando.config.networkBridge);
  const proxyContainer = lando.config.proxyContainer;

  // Make sure the proxy container exists before we proceed
  return lando.engine.exists({id: proxyContainer}).then(exists => {
    // if doesnt exist then bail
    if (!exists) return lando.Promise.resolve();

    // Otherwise scan and add as needed
    return lando.engine.scan({id: proxyContainer}).then(data => {
      const containerId = _.get(data, 'Id', proxyContainer);

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
      return bridgeNet.disconnect({Container: containerId, Force: true})
        // Only throw non not connected errors
        .catch(error => {
          if (!isNotConnectedError(error)) throw error;
        })
        // Connect
        .then(() => bridgeNet.connect({Container: containerId, EndpointConfig: {Aliases: aliases}}))
        .then(() => {
          app.log.debug('aliased %j to the proxynet', aliases);
        });
    });
  });
};
