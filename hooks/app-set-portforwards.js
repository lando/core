'use strict';

const _ = require('lodash');

module.exports = async (app, lando) => {
  app.log.verbose('discovering dynamic portforward info...');
  const forwarders = _.filter(app.info, service => _.get(service, 'external_connection.port', false));
  return lando.engine.list({project: app.project})
  .filter(service => _.includes(_.flatMap(forwarders, service => service.service), service.service))
  .map(service => ({
    id: service.id,
    service: service.service,
    internal: _.get(_.find(app.info, {service: service.service}), 'internal_connection.port'),
  }))
  .map(service => lando.engine.scan(service).then(data => {
    const key = `NetworkSettings.Ports.${service.internal}/tcp`;
    const port = _.filter(_.get(data, key, []), forward => forward.HostIp === lando.config.bindAddress);
    if (_.has(port[0], 'HostPort')) {
      _.set(_.find(app.info, {service: service.service}), 'external_connection.port', port[0].HostPort);
    }
  }));
};
