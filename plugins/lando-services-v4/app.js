'use strict';

// Modules
const _ = require('lodash');
const chalk = require('chalk');
const path = require('path');
const utils = require('./lib/utils');

/*
 * @TODO
 */
module.exports = (app, lando) => {
  // add core v4 classes to factory
  lando.factory.registry.unshift({api: 4, name: '_compose', builder: require('./lib/compose-v4')});

  // Add v4 stuff to the app object
  // v4 props
  app.v4 = {};
  app.v4._dir = path.join(lando.config.userConfRoot, 'v4', app.id);
  app.v4.buildContexts = [];
  app.v4.preLockfile = `${app.name}.v4.build.lock`;
  app.v4.postLockfile = `${app.name}.v4.build.lock`;
  app.v4.services = [];

  // v4 methods
  // add a v4 build context to the app
  // @NOTE: does the order of these matter eg will there ever be image FROM dependencies among the build contexts here?
  // @TODO: librarify these
  app.v4.addBuildContext = (data, front = false) => {
    if (front) app.v4.buildContexts.unshift(data);
    else app.v4.buildContexts.push(data);
  };

  // what kinds of app level things do we need?
  // 1. a way to add

  // Init this early on but not before our recipes
  app.events.on('pre-init', () => {
    // add parsed services to app object so we can use them downstream
    app.v4.parsedConfig = _(utils.parseConfig(_.get(app, 'config.services', {}), app))
      .filter(service => service.api === 4)
      .value();

    // build each service
    _.forEach(app.v4.parsedConfig, config => {
      // Throw a warning if service is not supported
      if (_.isEmpty(_.find(lando.factory.get(), {api: 4, name: config.type}))) {
        app.log.warn('%s is not a supported v4 service type.', config.type);
      }

      // Log da things
      app.log.verbose('building v4 %s service %s', config.type, config.name);
      // retrieve the correct class and instance
      const Service = lando.factory.get(config.type, config.api);
      const service = new Service(config.name, config, {app, lando});
      const {buildContext, compose, info} = service.dump();

      // add things
      app.v4.addBuildContext(buildContext);
      app.add(compose);
      app.info.push(info);
    });
  });

  // Handle V4 build steps
  app.events.on('post-init', () => {
    // get buildable services
    const buildV4Services = _(app.v4.parsedConfig)
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


  // Remove build locks on an uninstall
  app.events.on('post-uninstall', () => {
    lando.cache.remove(app.v4.preLockfile);
    lando.cache.remove(app.v4.postLockfile);
    app.log.debug('removed v4 build locks');
  });
};
