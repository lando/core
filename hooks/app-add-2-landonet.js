'use strict';

const _ = require('lodash');

module.exports = async (app, lando) => {
  // We assume the lando net exists at this point
  const landonet = lando.engine.getNetwork(lando.config.networkBridge);
  // List all our app containers
  return lando.engine.list({project: app.project})
  // Go through each container
  .map(container => {
    // Define the internal aliae
    const internalAlias = `${container.service}.${container.app}.internal`;
    // Sometimes you need to disconnect before you reconnect
    return landonet.disconnect({Container: container.id, Force: true})
    // Only throw non not connected errors
    .catch(error => {
      if (!_.includes(error.message, 'is not connected to network')) throw error;
    })
    // Connect
    .then(() => {
      landonet.connect({Container: container.id, EndpointConfig: {Aliases: [internalAlias]}});
      app.log.debug('connected %s to the landonet', container.name);
    });
  });
};
