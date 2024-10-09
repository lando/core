'use strict';

const _ = require('lodash');

module.exports = async (app, lando) => {
  // add parsed services to app object so we can use them downstream
  app.cachedInfo = _.get(lando.cache.get(app.composeCache), 'info', []);
  app.parsedServices = require('../utils/parse-v3-services')(_.get(app, 'config.services', {}), app);
  app.parsedV3Services = _(app.parsedServices).filter(service => service.api === 3).value();
  app.servicesList = app.parsedV3Services.map(service => service.name);

  // build each service
  _.forEach(app.parsedV3Services, service => {
    // Throw a warning if service is not supported
    if (_.isEmpty(_.find(lando.factory.get(), {api: 3, name: service.type}))) {
      app.log.warn('%s is not a supported service type.', service.type);
    }
    // Log da things
    app.log.verbose('building v3 %s service %s', service.type, service.name);
    // Build da things
    const Service = lando.factory.get(service.type, service.api);
    const data = new Service(service.name, _.merge({}, service, {_app: app}), lando.factory);
    const cachedInfo = _.find(app.cachedInfo, {service: service.name}) ?? {};
    const info = _.merge({}, cachedInfo, data.info);

    // add da data
    app.add(data);
    app.info.push(info);
  });

  // we need to add any "managed" services stealth added by service builders
  const managed = _(app.info)
    .filter(service => service.managed && service.api === 3)
    .filter(service => !_.includes(app.servicesList, service.service))
    .map(service => _.merge({}, service, {
      _app: app,
      app: app.name,
      name: service.service,
      home: lando.config.home,
      project: app.project,
      userConfRoot: lando.config.userConfRoot,
    }))
    .value();


  // add to our lists
  app.parsedServices = app.parsedServices.concat(managed);
  app.parsedV3Services = app.parsedV3Services.concat(managed);
  app.servicesList = app.servicesList.concat(managed.map(service => service.name));
};
