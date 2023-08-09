'use strict';

// Modules
const _ = require('lodash');
const utils = require('./lib/utils');

// Build keys
const preRootSteps = [
  'build_as_root_internal',
  'build_as_root',
  'install_dependencies_as_root_internal',
  'install_dependencies_as_root',
];
const preBuildSteps = [
  'build_internal',
  'build',
  'install_dependencies_as_me_internal',
  'install_dependencies_as_me',
];
// Post app start build steps
const postRootSteps = [
  'run_as_root_internal',
  'run_as_root',
  'extras',
];
const postBuildSteps = [
  'run_internal',
  'run_as_me_internal',
  'run',
  'run_as_me',
];

/*
 * @TODO
 */
module.exports = (app, lando) => {
  // Build step locl files
  app.preLockfile = `${app.name}.build.lock`;
  app.postLockfile = `${app.name}.post-build.lock`;

  // Init this early on but not before our recipes
  app.events.on('pre-init', () => {
    // add parsed services to app object so we can use them downstream
    app.parsedServices = utils.parseConfig(_.get(app, 'config.services', {}), app);
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
      // add da data
      app.add(data);
      app.info.push(data.info);
    });
  });

  // Handle V3 build steps
  app.events.on('post-init', () => {
    // Add in build hashes
    app.meta.lastPreBuildHash = _.trim(lando.cache.get(app.preLockfile));
    app.meta.lastPostBuildHash = _.trim(lando.cache.get(app.postLockfile));

    // get v3 buildable services
    const buildServices = _.get(app, 'opts.services', app.services);
    const buildV3Services = _(app.parsedV3Services)
      .filter(service => _.includes(buildServices, service.name))
      .map(service => service.name)
      .value();
    app.log.debug('going to build v3 services if applicable', buildV3Services);

    // Make sure containers for this app exist; if they don't and we have build locks, we need to kill them
    // @NOTE: this is need to make sure containers rebuild on a lando rebuild, its also for general cleanliness
    app.events.on('pre-start', () => {
      return lando.engine.list({project: app.project, all: true}).then(data => {
        if (_.isEmpty(data)) {
          lando.cache.remove(app.preLockfile);
          lando.cache.remove(app.postLockfile);
          app.log.debug('removed v3 build locks');
        }
      });
    });

    // Queue up both legacy and new build steps
    app.events.on('pre-start', 100, () => {
      const preBuild = utils.filterBuildSteps(buildV3Services, app, preRootSteps, preBuildSteps, true);
      return utils.runBuild(app, preBuild, app.preLockfile, app.configHash);
    });
    app.events.on('post-start', 100, () => {
      const postBuild = utils.filterBuildSteps(buildV3Services, app, postRootSteps, postBuildSteps);
      return utils.runBuild(app, postBuild, app.postLockfile, app.configHash);
    });
  });

  // Discover portforward true info
  app.events.on('ready', () => {
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
  });

  // Determine pullable and locally built images
  app.events.on('pre-rebuild', () => {
    app.log.verbose('determining pullable services...');
    // Determine local vs pullable services
    const whereats = _(_.get(app, 'config.services', {}))
      .map((data, service) => ({
        service,
        isLocal: _.has(data, 'overrides.build') || _.has(data, 'services.build') || _.get(data, 'api', 3) === 4,
      }))
      .value();

    // Set local and pullys for downstream concerns
    app.log.debug('determined pullable services', whereats);
    app.opts = _.merge({}, app.opts, {
      pullable: _(whereats).filter(service => !service.isLocal).map('service').value(),
      local: _(whereats).filter(service => service.isLocal).map('service').value(),
    });
  });

  // Remove build locks on an uninstall
  app.events.on('post-uninstall', () => {
    lando.cache.remove(app.preLockfile);
    lando.cache.remove(app.postLockfile);
    app.log.debug('removed v3 build locks');
  });
};
