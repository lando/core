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
  app.v4.preLockfile = `${app.name}.v4.build.lock`;
  app.v4.postLockfile = `${app.name}.v4.build.lock`;
  app.v4.services = [];
  app.v4.composeCache = `${app.name}.compose.cache`;

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

  // The v4 version of v3 service loading
  app.events.on('pre-init', () => {
    // add parsed services to app object so we can use them downstream
    app.v4.parsedConfig = _(utils.parseConfig(_.get(app, 'config.services', {})))
      .filter(service => service.api === 4)
      .value();
    app.v4.servicesList = app.v4.parsedConfig.map(service => service.name);
    app.v4.cachedInfo = _.get(lando.cache.get(app.v4.composeCache), 'info', []);

    // if no service is set as the primary one lets set the first one as primary
    if (_.find(app.v4.parsedConfig, service => service.primary === true) === undefined) {
      if (_.has(app, 'v4.parsedConfig[0.name')) {
        app.v4.parsedConfig[0].primary = true;
        app.log.debug('could not find a primary v4 service, setting to first service=%s', app.v4.parsedConfig[0].name);
      }
    }

    // instantiate each service
    _.forEach(app.v4.parsedConfig, config => {
      // Throw a warning if service is not supported
      if (_.isEmpty(_.find(lando.factory.get(), {api: 4, name: config.type}))) {
        app.log.warn('%s is not a supported v4 service type.', config.type);
      }

      // add some other important stuff we need to inject
      config.appRoot = app.root;
      config.context = path.join(app.v4._dir, 'build-contexts', config.name);
      config.tag = `${_.get(lando, 'product', 'lando')}/${app.name}-${app.id}-${config.name}:latest`;
      const info = _(_.find(app.v4.cachedInfo, {service: config.name, api: 4}))
        .pick(['image', 'lastBuild', 'tag'])
        .value();

      // retrieve the correct class and mimic-ish v4 patterns to ensure faster loads
      const Service = lando.factory.get(config.type, config.api);
      Service.bengineConfig = lando.config.engineConfig;

      // instantiate
      const service = new Service(config.name, {...config, debug: app.v4._debugShim, info, app, lando});

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

      // finish with the version, as long as we are mixing streams with v3 this cannot be updated until v3 is
      app.add({id: 'version', info: {}, data: [{version: app.v4.orchestratorVersion}]}, true);
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

  // Save a compose cache every time the app is ready, we have to duplicate this for v4 because we modify the
  // composeData after the v3 app.ready event
  app.events.on('ready-v4', () => {
    lando.cache.set(app.v4.composeCache, {
      name: app.name,
      project: app.project,
      compose: app.compose,
      root: app.root,
      info: app.info,
    }, {persist: true});
  });

  // we need to temporarily set app.compose to be V3 only and then restore it post-rebuild
  // i really wish thre was a better way to do this but alas i do not think there is
  app.events.on('pre-rebuild', 10, () => {
    // get local services
    const locals = _.get(app, 'opts.local', []);
    // get v4 services
    const v4s = _.get(app, 'v4.servicesList', []);
    // reset opts.local to only be v3 services
    app.opts.local = _.difference(locals, v4s);
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
        // filter out any services that dont need to be built
        const services = _(app.v4.services)
          .filter(service => _.includes(buildV4Services, service.id))
          .value();
        app.log.debug('going to build v4 services', services.map(service => service.id));

        // now build an array of promises with our services
        const buildSteps = services.map(async service => {
          // @TODO: replace entire line so it looks more like docker compose?
          // @TODO: better ux for building, listr? simple throbber ex?
          process.stdout.write(`Building v4 image ${service.id} ...\n`);
          try {
            const success = await service.buildImage();
            process.stdout.write(`Building v4 image ${service.id} ... ${chalk.green('done')}\n`);
            return success;
          } catch (e) {
            process.stdout.write(`Building v4 image ${service.id} ... ${chalk.red('ERROR')}\n`);
            return e;
          }
        });

        // and then run them in parallel
        const results = await Promise.all(buildSteps);
        // get failures and successes
        const failures = _(results).filter(service => service.exitCode !== 0).value();
        // write build lock if we have no failures
        if (_.isEmpty(failures)) lando.cache.set(app.v4.preLockfile, app.configHash, {persist: true});

        // go through failures and add warnings as needed, rebase on base image
        _.forEach(failures, failure => {
          app.addWarning({
            title: `Could not build v4 image "${_.get(failure, 'context.id')}!"`,
            detail: [
              `Failed with "${_.get(failure, 'short')}"`,
              `Rerun with "lando rebuild -vvv" to see the entire build log and look for errors. When fixed run:`,
            ],
            command: 'lando rebuild',
          }, failure);
        });

        // merge rebuild success results into app.info for downstream usage for api 4 services
        _.forEach(services, service => {
          const info = _.find(app.info, {service: service.id, api: 4});
          if (info) {
            Object.assign(info, {
              image: service.info.image,
              lastBuild: service.info.image === undefined ? 'failed' : 'succeeded',
              tag: service.tag,
            });
          }
        });
      }

      // at this point we should have the tags of successfull images and can iterate and app.add as needed
      _.forEach(app.info, service => {
        if (service.api === 4 && service.lastBuild === 'succeeded' && service.image) {
          app.add({
            id: service.service,
            info: {},
            data: [{services: {[service.service]: {image: service.tag}}}],
          });
        }
      });

      // and reset app.compose
      app.compose = dumpComposeData(app.composeData, app._dir);
      // and reset the compose cache as well
      lando.cache.set(app.v4.composeCache, {
        name: app.name,
        project: app.project,
        compose: app.compose,
        root: app.root,
        info: app.info,
      }, {persist: true});
    });
  });

  // Remove build locks on an uninstall
  app.events.on('post-uninstall', () => {
    lando.cache.remove(app.v4.preLockfile);
    lando.cache.remove(app.v4.postLockfile);
    app.log.debug('removed v4 build locks');
  });
};
