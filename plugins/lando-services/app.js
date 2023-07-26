'use strict';

// Modules
const _ = require('lodash');
const chalk = require('chalk');
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
  app.v4.preLockfile = `${app.name}.v4.build.lock`;
  app.v4.postLockfile = `${app.name}.v4.build.lock`;

  // Init this early on but not before our recipes
  app.events.on('pre-init', () => {
    // add parsed services to app object so we can use them downstream
    app.parsedServices = utils.parseConfig(_.get(app, 'config.services', {}), app);

    // build each service
    _.forEach(app.parsedServices, service => {
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

    // remove _app from parsed services because its just so gross
    _.forEach(app.parsedServices, service => delete service._app);

    // and add v3 and v4 services separately
    const versionGroupedServices = _.groupBy(app.parsedServices, 'api');
    app.parsedV3Services = _.get(versionGroupedServices, '3', []);
    app.v4.parsedServices = _.get(versionGroupedServices, '4', []);
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

  // Handle V4 build steps
  app.events.on('post-init', () => {
    // get buildable services
    const buildV4Services = _(app.v4.parsedServices)
      .filter(service => _.includes(_.get(app, 'opts.services', app.services), service.name))
      .map(service => service.name)
      .value();

    // @TODO: build locks and hash for v4?
    app.events.on('pre-start', () => {
      return lando.engine.list({project: app.project, all: true}).then(data => {
        if (_.isEmpty(data)) {
          lando.cache.remove(app.v4.preLockfile);
          lando.cache.remove(app.v4.postLockfile);
          app.log.debug('removed v4 build locks');
        }
      });
    });

    // run v4 build steps if applicable
    app.events.on('pre-start', 100, async () => {
      if (!lando.cache.get(app.v4.preLockfile)) {
        // require our V4 stuff here
        const DockerEngine = require('./lib/docker-engine');
        const bengine = new DockerEngine(lando.config.engineConfig, {debug: require('./lib/debug-shim')(lando.log)});

        // filter out any services that dont need to be built
        const contexts = _(app.v4.buildContexts)
          .filter(context => _.includes(buildV4Services, context.id))
          .value();
        app.log.debug('going to build v4 services', contexts.map(context => context.service));

        // now build an array of promises
        const buildSteps = contexts.map(async context => {
          // @TODO: replace entire line so it looks more like docker compose?
          // @TODO: better ux for building, listr? simple throbber ex?
          process.stdout.write(`Building v4 image ${context.service} ...\n`);
          try {
            const success = await bengine.build(context.dockerfile, context);
            process.stdout.write(`Building v4 image ${context.service} ... ${chalk.green('done')}\n`);
            app.log.debug('built image %s successfully', context.service);
            success.context = context;
            return success;
          } catch (e) {
            e.context = context;
            return e;
          }
        });

        // and then run them in parallel
        const results = await Promise.all(buildSteps);
        // get failures and successes
        const failures = _(results).filter(service => service.exitCode !== 0).value();
        // write build lock if we have no failures
        if (_.isEmpty(failures)) lando.cache.set(app.v4.preLockfile, app.configHash, {persist: true});

        // go through failures and add warnings as needed
        _.forEach(failures, failure => {
          app.addWarning({
            title: `Could not build v4 service "${_.get(failure, 'context.service')}"`,
            detail: [
              `Failed with "${_.get(failure, 'short')}"`,
              `Rerun with "lando rebuild -vvv" to see the entire build log and look for errors. When fixed run:`,
            ],
            command: 'lando rebuild',
          }, failure);
        });
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
    lando.cache.remove(app.v4.preLockfile);
    lando.cache.remove(app.v4.postLockfile);
    app.log.debug('removed build locks');
  });
};
