'use strict';

// Modules
const _ = require('lodash');
const chalk = require('chalk');
const path = require('path');
const utils = require('./lib/utils');

const {dumpComposeData} = require('./../../lib/utils');
const {nanoid} = require('nanoid');

/*
 * @TODO
 */
module.exports = (app, lando) => {
  // add core v4 classes to factory
  lando.factory.registry.unshift({api: 4, name: '_compose', builder: require('./lib/_compose-v4')});

  // Add v4 stuff to the app object
  app.v4 = {};
  app.v4._debugShim = require('./lib/debug-shim')(app.log);
  app.v4._dir = path.join(lando.config.userConfRoot, 'v4', `${app.name}-${app.id}`);
  app.v4.orchestratorVersion = '3.6';
  app.v4.buildContexts = [];
  app.v4.preLockfile = `${app.name}.v4.build.lock`;
  app.v4.postLockfile = `${app.name}.v4.build.lock`;
  app.v4.services = [];

  // add a v4 build context to the app
  // @NOTE: does the order of these matter eg will there ever be image FROM dependencies among the build contexts here?
  // @TODO: librarify these
  app.v4.addBuildContext = (data, front = false) => {
    if (front) app.v4.buildContexts.unshift(data);
    else app.v4.buildContexts.push(data);
  };
  // front load top level networks
  app.v4.addNetworks = (data = {}) => {
    app.add({
      id: `v4-${nanoid()}`,
      info: {},
      data: [{networks: data, version: app.v4.orchestratorVersion}],
    }, true);
  };
  // front load top level volumes
  app.v4.addVolumes = (data = {}) => {
    app.add({
      id: `v4-${nanoid()}`,
      info: {},
      data: [{volumes: data, version: app.v4.orchestratorVersion}],
    }, true);
  };

  // Init this early on but not before our recipes
  app.events.on('pre-init', () => {
    // add parsed services to app object so we can use them downstream
    app.v4.parsedConfig = _(utils.parseConfig(_.get(app, 'config.services', {})))
      .filter(service => service.api === 4)
      .value();

    // build each service
    _.forEach(app.v4.parsedConfig, config => {
      // Throw a warning if service is not supported
      if (_.isEmpty(_.find(lando.factory.get(), {api: 4, name: config.type}))) {
        app.log.warn('%s is not a supported v4 service type.', config.type);
      }

      // add some other important stuff to config
      config.appRoot = app.root;
      config.context = path.join(app.v4._dir, 'build-contexts', config.name);
      config.tag = `${_.get(lando, 'product', 'lando')}/${app.name}-${app.id}-${config.name}`;

      // retrieve the correct class and instance
      const Service = lando.factory.get(config.type, config.api);
      const service = new Service(config.name, {...config, debug: app.v4._debugShim, app, lando});
      app.v4.services.push(service);
    });

    // emit an event so other plugins can augment the servies with additonal things before we get their data
    return app.events.emit('pre-services-generate', app.v4.services).then(services => {
      _.forEach(app.v4.services, service => {
        app.v4.addBuildContext(service.generateImageFiles());
        app.add(service.generateOrchestorFiles());
        app.info.push(service.info);

        // handle top level volumes and networks here
        if (!_.isEmpty(app.config.volumes)) app.v4.addVolumes(app.config.volumes);
        if (!_.isEmpty(app.config.networks)) app.v4.addNetworks(app.config.networks);

        // finish with the version, as long as we are mixing streams with v3 this cannot be updated until v3 is
        app.add({id: 'version', info: {}, data: [{version: app.v4.orchestratorVersion}]}, true);

        // Log da things
        app.log.debug('generated v4 %s service %s', service.type, service.name);
      });
    });
  });

  app.events.on('pre-services-generate', services => {
    // console.log(services);
  });


  // wipe hardcoded assumptioms from v3 that we want to handle on our own
  app.events.on('ready', () => {
    _.forEach(app.v4.services.map(service => service.id), id => {
      // remove v3 app mount
      const mounts = _.find(app.composeData, compose => compose.id === 'mounts');
      mounts.data = mounts.data.map(datum => {
        if (datum.services && datum.services[id]) datum.services[id] = {volumes: []};
        return datum;
      });

      // remove v3 scripts mounts
      // @TODO: other globals we should blow away?
      const globals = _.find(app.composeData, compose => compose.id === 'globals');
      globals.data = globals.data.map(datum => {
        if (datum.services && datum.services[id]) datum.services[id] = {...datum.services[id], volumes: []};
        return datum;
      });
    });

    // Log
    app.initialized = false;
    app.compose = dumpComposeData(app.composeData, app._dir);
    app.log.verbose('v4 app is ready!');
    app.log.silly('v4 app has compose files', app.compose);
    app.log.silly('v4 app has config  ', app.config);
    app.initialized = true;
    return app.events.emit('ready-v4');
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
        const bengine = new DockerEngine(lando.config.engineConfig, {debug: app.v4._debugShim});

        // filter out any services that dont need to be built
        const contexts = _(app.v4.buildContexts)
          .filter(context => _.includes(buildV4Services, context.id))
          .value();

        app.log.debug('going to build v4 services', contexts.map(context => context.id));

        // now build an array of promises
        const buildSteps = contexts.map(async context => {
          // @TODO: replace entire line so it looks more like docker compose?
          // @TODO: better ux for building, listr? simple throbber ex?
          process.stdout.write(`Building v4 image ${context.id} ...\n`);
          try {
            const success = await bengine.build(context.dockerfile, context);
            process.stdout.write(`Building v4 image ${context.id} ... ${chalk.green('done')}\n`);
            app.log.debug('built image %s successfully', context.id);
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
            title: `Could not build v4 service "${_.get(failure, 'context.id')}"`,
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
