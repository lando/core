'use strict';

const _ = require('lodash');

module.exports = async app => {
  // get buildable services
  const buildV4Services = _(app.v4.parsedConfig)
    .filter(service => _.includes(_.get(app, 'opts.services', app.services), service.name))
    .map(service => service.name)
    .value();

  // filter out any services that dont need to be built
  const services = _(app.v4.services)
    .filter(service => _.includes(buildV4Services, service.id))
    .filter(service => typeof service.buildApp === 'function')
    .filter(service => service?.info?.state?.IMAGE === 'BUILT')
    .filter(service => service?.info?.state?.APP !== 'BUILT')
    .value();

  app.log.debug('going to build v4 apps', services.map(service => service.id));

  // and then run them in parallel
  await Promise.all(services.map(async service => {
    try {
      await service.buildApp();
    } catch (error) {
      // @TODO: improve this?
      app.log.debug('app build error %o %o', error.message, error);
      app.addMessage(require('../messages/app-build-v4-error')(error), error, true);
    }
  }));
};
