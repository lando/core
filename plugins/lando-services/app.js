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

  // @NOTES:
  // * NEW build steps are conditional on v4 api and go in same "handle build steps" event
  // * need to make sure that we flag all "locally" build services?

  // Init this early on but not before our recipes
  app.events.on('pre-init', () => {
    const services = utils.parseConfig(_.get(app, 'config.services', {}), app);
    _.forEach(services, service => {
      // Throw a warning if service is not supported
      if (_.isEmpty(_.find(lando.factory.get(), {api: service.api, name: service.type}))) {
        app.log.warn('%s is not a supported service type.', service.type);
      }
      // Log da things
      app.log.verbose('building %s service %s', service.type, service.name);
      // Build da things
      // @NOTE: this also gathers app.info and build steps
      const Service = lando.factory.get(service.type, service.api);

      // service v4 also needs to return dockerfile build context stuff so it is different
      if (service.api === 4) {
        const {buildContext, compose, info} = new Service(service.name, service);
        app.addBuildContext(buildContext);
        app.add(compose);
        app.info.push(info);

      // v3 stays teh same as it was before
      } else {
        const data = new Service(service.name, service, lando.factory);
        app.add(data);
        app.info.push(data.info);
      }
    });
  });

  // Handle build steps
  // Go through each service and run additional build commands as needed
  app.events.on('post-init', () => {
    // Add in build hashes
    app.meta.lastPreBuildHash = _.trim(lando.cache.get(app.preLockfile));
    app.meta.lastPostBuildHash = _.trim(lando.cache.get(app.postLockfile));

    // v4 image build goes here
    // @TODO: only run if the app has a v4 service? is build context empty?
    app.events.on('pre-start', 4, async () => {
      // require our V4 stuff here
      const DockerEngine = require('./lib/docker-engine');
      // @TODO: pass in debug shim for unified debug output in v3?
      const dockerEngine = new DockerEngine(lando.config.engineConfig, require('./lib/debug-shim')(lando.log));

      const build = app.v4.buildContexts[0];

      await dockerEngine.build(build.dockerfile, build);

      // @TODO: iterate through app.v4.buildContexts or wherever app.addBuildCOntext sets things
      // and build images with docker-engine.build
      // @NOTE: we will probably need to override the debugger?
    });

    // Queue up all v3 build steps (image and app) AND v4 app-build steps
    // @TODO: at first we will take "app-build" v4 steps and put them through here just like in v3
    // @TODO: eventually we want to use the image produced above and docker run the app build steps using them
    // eg mutating the mounted app root but not the underlying image
    app.events.on('pre-start', 100, () => {
      const preBuild = utils.filterBuildSteps(buildServices, app, preRootSteps, preBuildSteps, true);
      return utils.runBuild(app, preBuild, app.preLockfile, app.configHash);
    });
    app.events.on('post-start', 100, () => {
      const postBuild = utils.filterBuildSteps(buildServices, app, postRootSteps, postBuildSteps);
      return utils.runBuild(app, postBuild, app.postLockfile, app.configHash);
    });
  });

  // clean up dangling build locks
  const buildServices = _.get(app, 'opts.services', app.services);
  app.events.on('pre-start', () => {
    return lando.engine.list({project: app.project, all: true}).then(data => {
      if (_.isEmpty(data)) {
        lando.cache.remove(app.preLockfile);
        lando.cache.remove(app.postLockfile);
      }
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
      .map((data, service) => ({service, isLocal: _.has(data, 'overrides.build') || _.has(data, 'services.build')}))
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
  });
};
