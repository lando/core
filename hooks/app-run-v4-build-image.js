'use strict';

const _ = require('lodash');

module.exports = async (app, lando) => {
  // get buildable services
  const buildV4Services = _(app.v4.parsedConfig)
    .filter(service => _.includes(_.get(app, 'opts.services', app.services), service.name))
    .map(service => service.name)
    .value();

  // filter out any services that dont need to be built
  const services = _(app.v4.services)
    .filter(service => _.includes(buildV4Services, service.id))
    .filter(service => typeof service.buildImage === 'function')
    .value();

  app.log.debug('going to build v4 images', services.map(service => service.id));

  // now build an array of promises with our services
  const tasks = services.map(service => {
    const container = [app.project, service.id, '1'].join(lando.config.orchestratorSeparator);
    return {
      title: `Image for ${container}`,
      task: async ctx => {
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
  await app.runTasks(tasks, {
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
};
