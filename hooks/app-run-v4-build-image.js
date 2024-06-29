'use strict';

const _ = require('lodash');

module.exports = async (app, lando) => {
  // get buildable services
  const buildV4Services = _(app.v4.parsedConfig)
    .filter(service => _.includes(_.get(app, 'opts.services', app.services), service.name))
    .map(service => service.name)
    .value();

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
};
