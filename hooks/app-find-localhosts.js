'use strict';

const _ = require('lodash');

// Helper to get http ports
const getHttpPorts = data => _.get(data, 'Config.Labels["io.lando.http-ports"]', '80,443').split(',');
const getHttpsPorts = data => _.get(data, 'Config.Labels["io.lando.https-ports"]', '443').split(',');

module.exports = async (app, lando) => {
  app.log.verbose('attempting to find open services...');
  return app.engine.list({project: app.project})
    // Return running containers
    .filter(container => app.engine.isRunning(container.id))
    // Make sure they are still a defined service (eg if the user changes their lando yml)
    .filter(container => _.includes(app.services, container.service))
    // Inspect each and add new URLS
    .map(container => app.engine.scan(container))
    // Scan all the http ports
    .map(data => require('../utils/get-exposed-localhosts')(
      data, getHttpPorts(data),
      getHttpsPorts(data),
      lando.config.bindAddress,
    ))
    .map(data => _.find(app.info, {service: data.service}).urls = data.urls);
};
