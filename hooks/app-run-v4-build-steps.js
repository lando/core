'use strict';

const _ = require('lodash');
const os = require('os');
const path = require('path');
const {nanoid} = require('nanoid');

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
        app.log.debug('removed v4 image build locks');
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

      app.log.debug('going to build v4 images', services.map(service => service.id));

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
              app.addMessage(require('../messages/image-build-v4-error')(error), error, true);
              throw error;
            }
          },
        };
      });

      // and then run them in parallel
      const {errors} = await app.runTasks(tasks, {
        renderer: 'dc2',
        rendererOptions: {
          header: 'Building',
          states: {
            COMPLETED: 'Built',
            STARTED: 'Building',
            FAILED: 'FAILED',
          },
        },
      });

      // write build lock if we have no failures
      if (_.isEmpty(errors)) lando.cache.set(app.v4.preLockfile, app.configHash, {persist: true});

      // merge rebuild success results into app.info for downstream usage for api 4 services
      _.forEach(services, service => {
        service.error = errors.find(error => error?.context?.id === service.id);
        const info = _.find(app.info, {service: service.id, api: 4});
        if (info) {
          Object.assign(info, {
            image: service.info.image,
            state: service.state,
            tag: service.tag,
            error: service.error,
          });
        }
      });
    }

    // at this point we should have the tags of successfull images and can iterate and app.add as needed
    _.forEach(app.info, service => {
      if (service.api === 4) {
        const data = {image: service.tag};

        // if image build failed and has  an error lets change the data
        if (service?.state?.IMAGE === 'BUILD FAILURE' && service.error) {
          const dir = service?.error?.context?.context ?? os.tmpdir();
          service.error.logfile = path.join(dir, `error-${nanoid()}.log`);
          data.image = 'busybox';
          data.user = 'root';
          data.command = require('../utils/get-v4-image-build-error-command')(service.error);
          data.volumes = [`${service.error.logfile}:/tmp/error.log`];
        }

        app.add({
          id: service.service,
          info: {},
          data: [{services: {[service.service]: data}}],
        });
      }
    });

    // and reset app.compose
    app.compose = require('../utils/dump-compose-data')(app.composeData, app._dir);

    // and reset the compose cache as well
    app.v4.updateComposeCache();
  });

  // run app build steps
  app.events.on('pre-start', 110, async () => {
    // get buildable services
    const buildV4Services = _(app.v4.parsedConfig)
      .filter(service => _.includes(_.get(app, 'opts.services', app.services), service.name))
      .map(service => service.name)
      .value();

    // filter out any services that dont need to be built
    const services = _(app.v4.services)
      .filter(service => _.includes(buildV4Services, service.id))
      .filter(service => typeof service.buildApp === 'function')
      .filter(service => service?.info?.state?.IMAGE === 'BUILT')
      .filter(service => service?.info?.state?.APP !== 'BUILT')
      .value();

    // and then run them in parallel
    await Promise.all(services.map(async service => {
      try {
        await service.buildApp();
      } catch (error) {
        // @TODO: improve this?
        app.log.debug('app build error %o %o', error.message, error);
        app.addMessage(require('../messages/app-build-v4-error')(error), error, true);
      }
    }));

    // and reset the compose cache as well
    app.v4.updateComposeCache();
  });
};
