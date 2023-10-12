'use strict';

const _ = require('lodash');

module.exports = async (app, lando) => {
  // get our healthchecks
  const healthchecks = _.get(app, 'checks', []).filter(check => check.type === 'healthcheck');
  // map into promises
  const promises = healthchecks.map(async healthcheck => {
    // the runner command
    const runner = async (command, container, {service, user = 'root'} = {}) => {
      try {
        await app.engine.run({
          id: container,
          cmd: command,
          compose: app.compose,
          project: app.project,
          opts: {
            user,
            cstdio: 'pipe',
            silent: true,
            noTTY: true,
            services: [service],
          },
        });
      } catch (error) {
        console.log('Waiting until %s service is ready...', service);
        app.log.debug('running healthcheck %s for %s...', command, service);
        throw error;
      }
    };

    // wrap in a promise
    try {
      const options = {max: healthcheck.retry, backoff: healthcheck.delay};
      await lando.Promise.retry(async () => await runner(...healthcheck.args), options);
    } catch (error) {
      // set the service info as unhealthy if we get here
      const service = _.find(app.info, {service: healthcheck.service});
      service.healthy = false;
      // parse the message
      const message = _.trim(_.get(error, 'message', 'UNKNOWN ERROR'));
      // add the warning
      app.addWarning({
          title: `The service "${service.service}" failed its healthcheck`,
          detail: [
            `Failed with "${message}"`,
            'This may be ok but we recommend you run the command below to investigate:',
          ],
          command: `lando logs -s ${service.service}`,
        },
        Error(`${service.service} reported as unhealthy.`,
      ));
    }
  });

  await Promise.all(promises);
};
