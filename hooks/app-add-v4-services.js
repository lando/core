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
    if (_.has(app, 'v4.parsedConfig[0].name')) app.v4.parsedConfig[0].primary = true;
  }

  // note the primary service in a more convenient place so we dont have to search for it all the time
  if (app.v4.servicesList.length > 0) {
    app.v4.primaryService = _.find(app.v4.parsedConfig, service => service.primary === true);
    app.log.debug('%s is the primary v4 service', app.v4.primaryService.name);
  }

  // instantiate each service
  _.forEach(app.v4.parsedConfig, config => {
    // Throw a warning if builder is not supported
    if (_.isEmpty(_.find(lando.factory.get(), {api: 4, name: config.builder}))) {
      app.log.warn('%s is not a supported v4 builder.', config.builder);
    }

    // @TODO:
    // if we have routing information lets pass that through
    // in v3 "type" was parsed into a builder and a version but in v4 we use a more generic "router"
    // concept that lets the "entrypoint builder"

    // get any cached info so we can set that as a base in the service
    const info = _(_.find(app.v4.cachedInfo, {service: config.name, api: 4}))
      .pick(['healthy', 'image', 'state', 'tag'])
      .value();

    // retrieve the correct class and mimic-ish v4 patterns to ensure faster loads
    const Service = lando.factory.get(config.builder, config.api);
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
        project: app.project,
        tag: `${_.get(lando, 'product', 'lando')}/${app.name}-${app.id}-${config.name}:latest`,
        tlvolumes: app.config.volumes,
        tmpdir: path.join(app.v4._dir, 'tmp', config.name),
      },
      ...config,
    }, app, lando);

    // push
    app.v4.services.push(service);
    app.info.push(service.info);
  });

  // handle top level volumes and networks here
  if (!_.isEmpty(app.config.volumes)) app.v4.addVolumes(app.config.volumes);
  if (!_.isEmpty(app.config.networks)) app.v4.addNetworks(app.config.networks);
};
