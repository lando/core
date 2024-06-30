'use strict';

// Modules
const _ = require('lodash');

module.exports = async (app, lando) => {
  const buildV4Services = _(app.v4.parsedConfig)
    .filter(service => _.includes(_.get(app, 'opts.services', app.services), service.name))
    .map(service => service.name)
    .value();

  const containers = await lando.engine.list({project: app.project, all: true})
    .filter(container => buildV4Services.includes(container.service))
    .filter(container => {
      const info = app.info.find(service => service.service === container.service);
      return info?.state?.IMAGE === 'BUILT';
    })
    .filter(container => !container.running);

  if (containers.length > 0) {
    for (const container of containers) {
      const err = new Error(`Service ${container.service} not running: ${container.status}`);
      const info = app.info.find(service => service.service === container.service);
      info.error = err.message;
      app.addMessage(require('../messages/service-not-running-error')(container.service), err);
    }
  }
};
