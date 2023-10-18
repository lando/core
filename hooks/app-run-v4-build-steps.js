'use strict';

const _ = require('lodash');

module.exports = async (app, lando) => {
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
      const tasks = services.map(service => {
        const container = [app.project, service.id, '1'].join(lando.config.orchestratorSeparator);
        return {
          title: `Image for ${container}`,
          task: async (ctx, task) => {
            try {
              await service.buildImage();
            } catch (error) {
              ctx.errors.push(error);
              throw error;
            }
          },
        };
      });

      // and then run them in parallel
      const {errors} = await app.runTasks(tasks, {
        ctx: {errors: []},
        debugRendererOptions: {log: app.log.info},
        renderer: 'dc2',
        rendererOptions: {
          header: 'Building',
          states: {
            COMPLETED: 'Built',
            STARTED: 'Building',
          },
        },
      });

      // write build lock if we have no failures
      if (_.isEmpty(errors)) lando.cache.set(app.v4.preLockfile, app.configHash, {persist: true});

      // go through failures and add warnings as needed, rebase on base image
      _.forEach(errors, error => {
        app.addWarning({
          title: `Could not build v4 image "${_.get(error, 'context.id')}!"`,
          detail: [
            `Failed with "${_.get(error, 'short')}"`,
            `Rerun with "lando rebuild -vvv" to see the entire build log and look for errors. When fixed run:`,
          ],
          command: 'lando rebuild',
        }, error);
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
    app.compose = require('../utils/dump-compose-data')(app.composeData, app._dir);

    // and reset the compose cache as well
    lando.cache.set(app.v4.composeCache, {
      name: app.name,
      project: app.project,
      compose: app.compose,
      containers: app.containers,
      root: app.root,
      info: app.info,
      mounts: require('../utils/get-mounts')(_.get(app, 'v4.services', {})),
      overrides: {
        tooling: app._coreToolingOverrides,
      },
    }, {persist: true});
  });
};
