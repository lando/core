'use strict';

const _ = require('lodash');

module.exports = async (app, lando) => {
  // @TODO: dc tasks
  // @TODO: error message handler ./messages/app-destroy-v4-service-error

  // get destroyable services
  const buildV4Services = _(app.v4.parsedConfig)
    .filter(service => _.includes(_.get(app, 'opts.services', app.services), service.name))
    .map(service => service.name)
    .value();

  // filter out any services that dont need to be destroyed
  const services = _(app.v4.services)
    .filter(service => _.includes(buildV4Services, service.id))
    .filter(service => typeof service.destroy === 'function')
    .value();

  app.log.debug('going to destroy v4 services', services.map(service => service.id));

  // now build an array of promises with our services
  const tasks = services.map(service => {
    const container = [app.project, service.id, '1'].join(lando.config.orchestratorSeparator);
    return {
      title: `Container ${container}`,
      task: async ctx => {
        try {
          await service.destroy();
        } catch (error) {
          const err = require('../utils/make-error')({error});
          err.context = {id: container};
          ctx.errors.push(err);
          throw err;
        }
      },
    };
  });

  await app.runTasks(tasks, {
    renderer: 'dc2',
    rendererOptions: {
      header: 'Clean Up',
      states: {
        COMPLETED: 'Cleaned',
        STARTED: 'Cleaning',
        FAILED: 'FAILED',
      },
    },
  });
};
