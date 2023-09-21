'use strict';

// Modules
const _ = require('lodash');
const debug = require('debug')('@lando/core:healthcheck');

module.exports = async (app, lando) => {
  const exec = (command, container, {service, log = debug, user = 'root'} = {}) => {
    log('running %o healthcheck %o...', service, command);
    return app.engine.run({
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
    })
    .then(response => {
      log('%o healthcheck passed with output %o', service, command, response);
      return response;
    })
    .catch(error => {
      error.code = 1;
      error.service = service;
      log('%o healthcheck failed with error %o, code %o', service, error.message, error.code);
      throw error;
    });
  };

  // ensure that checks exists and is an array
  app.events.on('post-init', () => {
    if (!_.isArray(app.checks)) app.checks = [];
  });

  // Add URL scan checks
  app.events.on('post-start', 1, () => {
    // construct our healthcheck array
    const healthchecks = _(_.get(app, 'parsedV3Services', []))
      .filter(service => _.has(service, 'healthcheck'))
      .map(service => ({
        container: app.containers[service.name],
        name: service.name,
        service: service.name,
        ...require('./utils/normalize-healthcheck')(service.healthcheck),
      }))
      .value();

    // put into checks format
    const checks = _(healthchecks).map(healthcheck => ({
      type: 'healthcheck',
      test: exec,
      container: healthcheck.container,
      service: healthcheck.service,
      delay: healthcheck.delay,
      retry: healthcheck.retry,
      title: healthcheck.service,
      args: [healthcheck.command, healthcheck.container, {
        log: app.log.debug,
        service: healthcheck.service,
        user: healthcheck.user,
      }],
    }))
    .value();

    // combine our checks into app.checks
    app.checks = [...app.checks, ...checks].filter(Boolean);

    // if we have the CLI then add some listr tasks as a check as well
    if (_.has(lando, 'cli') && lando.cli.runTaskList) {
      // fitler checks to get healthchecks
      const healthchecks = _(app.checks).filter(checks => checks.type === 'healthcheck').value();
      // for UX purposes compute the max title length
      const mtl = _.max(healthchecks.map(healthcheck => healthcheck.container.length));
      const getSpacer = size => _.range(size).map(size => '').join(' ');
      // generate tasks
      const tasks = _(healthchecks).map(healthcheck => ({
        title: `Healthcheck ${healthcheck.container}${getSpacer(mtl - healthcheck.container.length + 3)}`,
        retry: healthcheck.retry,
        task: async (ctx, task) => {
          // compute an equal length title prefix
          const prefix = `Healthcheck ${healthcheck.container}${getSpacer(mtl - healthcheck.container.length + 3)}`;
          // Set the initial title
          task.title = `${prefix}${lando.cli.chalk.green('Started')}`;

          // attempt
          try {
            task.title = `${prefix}${lando.cli.chalk.green('Running')}`;
            await healthcheck.test(...healthcheck.args);
            task.title = `${prefix}${lando.cli.chalk.green('Passed')}`;

          // handle errors
          } catch (error) {
            // assess retry situation
            const {count} = task.isRetrying();

            // do different things depending on whether a retry is pending
            if (count === healthcheck.retry) {
              task.title = `${prefix}${lando.cli.chalk.red('FAILED')}`;
              ctx.errors.push(error);
            } else {
              task.title = `${prefix}${lando.cli.chalk.green('Running')}`;
              await require('delay')(healthcheck.delay + (100 * count));
            }

            throw error;
          }
        },
      }))
      .value();

      // add our listr2 check tasklist
      app.checks.push({
        type: 'healthcheck-listr2',
        test: async (tasks, options) => {
          if (tasks && tasks.length > 0) {
            console.log(lando.cli.chalk.blue(`[+] Healthchecking ${tasks.length}/${tasks.length}`));
            const {errors} = await lando.cli.runTaskList(tasks, options);

            // if we have errors lets add relevant warnings
            if (errors && errors.length > 0) {
              _.forEach(errors, error => {
                // set the service info to unhealthy
                const service = _.find(app.info, {service: error.service});
                service.healthy = false;
                // parse the message
                const message = _.trim(_.get(error, 'message', 'UNKNOWN ERROR'));
                // add the warning
                app.addWarning({
                  title: `The service "${error.service}" failed its healthcheck`,
                  detail: [
                    `Failed with "${message}"`,
                    'This may be ok but we recommend you run the command below to investigate:',
                  ],
                  command: `lando logs -s ${error.service}`,
                }, error);
              });
            }
          }
        },
        args: [tasks, {
          ctx: {errors: []},
          renderer: 'lando',
          rendererOptions: {level: 0.5},
          rendererDebugOptions: {log: app.log.debug},
        }],
      });
    }
  });
};
