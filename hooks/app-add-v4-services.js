'use strict';

const _ = require('lodash');
const path = require('path');

module.exports = async (app, lando) => {
  // add parsed services to app object so we can use them downstream
  app.v4.parsedConfig = _(require('../utils/parse-v4-services')(_.get(app, 'config.services', {})))
    .filter(service => service.api === 4)
    .value();
  app.v4.servicesList = app.v4.parsedConfig.map(service => service.name);
  app.v4.cachedInfo = _.get(lando.cache.get(app.v4.composeCache), 'info', []);

  // if no service is set as the primary one lets set the first one as primary
  if (_.find(app.v4.parsedConfig, service => service.primary === true) === undefined) {
    if (_.has(app, 'v4.parsedConfig[0.name')) app.v4.parsedConfig[0].primary = true;
  }

  // note the primary service in a more convenient place so we dont have to search for it all the time
  if (app.v4.servicesList.length > 0) {
    app.v4.primaryService = _.find(app.v4.parsedConfig, service => service.primary === true);
    app.log.debug('%s is the primary v4 service', app.v4.primaryService.name);
  }

  // instantiate each service
  _.forEach(app.v4.parsedConfig, config => {
    // Throw a warning if service is not supported
    if (_.isEmpty(_.find(lando.factory.get(), {api: 4, name: config.type}))) {
      app.log.warn('%s is not a supported v4 service type.', config.type);
    }

    // get any cached info so we can set that as a base in the service
    const info = _(_.find(app.v4.cachedInfo, {service: config.name, api: 4}))
      .pick(['healthy', 'image', 'state', 'tag'])
      .value();

    // retrieve the correct class and mimic-ish v4 patterns to ensure faster loads
    const Service = lando.factory.get(config.type, config.api);
    Service.bengineConfig = lando.config.engineConfig;
    Service.builder = lando.config.dockerBin;
    Service.orchestrator = lando.config.orchestratorBin;

    // instantiate
    const service = new Service(config.name, {
      ...{
        appRoot: app.root,
        context: path.join(app.v4._dir, 'build-contexts', config.name),
        debug: app.v4._debugShim,
        info,
        tag: `${_.get(lando, 'product', 'lando')}/${app.name}-${app.id}-${config.name}:latest`,
      },
      ...config,
    }, app, lando);

    // push
    app.v4.services.push(service);
    app.info.push(service.info);
  });

  // emit an event so other plugins can augment the servies with additonal things before we get their data
  return app.events.emit('pre-services-generate', app.v4.services).then(services => {
    // handle top level volumes and networks here
    if (!_.isEmpty(app.config.volumes)) app.v4.addVolumes(app.config.volumes);
    if (!_.isEmpty(app.config.networks)) app.v4.addNetworks(app.config.networks);

    // then generate the orchestrator files for each service
    _.forEach(app.v4.services, service => {
      app.add(service.generateOrchestorFiles());
      // Log da things
      app.log.debug('generated v4 %s service %s', service.type, service.name);
    });
  });
};
