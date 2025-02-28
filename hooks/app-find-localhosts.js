'use strict';

const _ = require('lodash');

// Helper to get http/https ports
const getHttpPorts = data => {
  return _.uniq([
    ..._.get(data, 'Config.Labels["io.lando.http-ports"]', '80,443').split(','),
    ..._.get(data, 'Config.Labels["dev.lando.http-ports"]', '').split(','),
  ]);
};
const getHttpsPorts = data => {
  return _.uniq([
    ..._.get(data, 'Config.Labels["io.lando.https-ports"]', '443').split(','),
    ..._.get(data, 'Config.Labels["dev.lando.https-ports"]', '').split(','),
  ]);
};

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
      data,
      _.uniq([...getHttpPorts(data), ...getHttpsPorts(data)]),
      getHttpsPorts(data),
      lando.config.bindAddress,
    ))
    // add data to existing info
    .map(data => {
      // get info
      const info = _.find(app.info, {service: data.service});
      // remove existing localhosts because they are probably stale
      _.remove(info.urls, url => url.startsWith('http://localhost'));
      _.remove(info.urls, url => url.startsWith('https://localhost'));
      // and then reset
      info.urls = _.uniq([...info.urls, ...data.urls]);
    });
};
