'use strict';

const _ = require('lodash');
const debug = require('debug')('@lando/core:healthcheck');
const isStringy = require('../utils/is-stringy');

const {color} = require('listr2');

module.exports = async app => {
  const exec = (command, container, {api = 3, service, log = debug, user = 'root'} = {}) => {
    log('running %o healthcheck %o...', service, command);

    // if is stringy then multipass
    if (isStringy(command)) {
      command = Buffer.from(command, 'utf8').toString('base64');
      command = api === 3 ? ['/helpers/exec-multiliner.sh', command] : ['/etc/lando/exec-multiliner.sh', command];
    }

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
      return {service, command, response};
    })
    .catch(error => {
      error.code = 1;
      error.service = service;
      log('%o healthcheck failed with error %o, code %o', service, error.message, error.code);
      throw error;
    });
  };

  // start by getting "legacy" healthchecks that are expressed in lando.info via the _service builder
  const legacyHealthchecks = _(_.get(app, 'info', []))
    .filter(info => _.has(info, 'healthcheck'))
    .filter(info => info.api === 3)
    .map(info => ({
      container: app.containers[info.service],
      name: info.service,
      service: info.service,
      ...require('../utils/normalize-healthcheck')(info.healthcheck),
    }))
    .value();

  // now get "new" healthchecks
  const newV3Healthchecks = _(_.get(app, 'parsedV3Services', []))
    .filter(service => _.has(service, 'healthcheck'))
    .map(service => ({
      api: 3,
      container: app.containers[service.name],
      name: service.name,
      service: service.name,
      ...require('../utils/normalize-healthcheck')(service.healthcheck),
    }))
    .value();
  const newV4Healthchecks = _(_.get(app, 'v4.services', []))
    .filter(service => _.has(service, 'healthcheck'))
    .filter(service => service.canHealthcheck)
    .map(service => ({
      api: 4,
      container: app.containers[service.name],
      name: service.name,
      service: service.name,
      ...require('../utils/normalize-healthcheck')(service.healthcheck),
    }))
    .value();

  // now combine the two but give priority to the new one
  const healthchecks = _([...newV3Healthchecks, ...newV4Healthchecks, ...legacyHealthchecks])
    .groupBy('container')
    .map(checks => checks[0])
    .filter(check => !require('../utils/is-disabled')(check.command))
    .filter(check => {
      const info = app.info.find(data => data.service === check.service);
      return info.error === undefined;
    })
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
      api: healthcheck.api,
      log: app.log.debug,
      service: healthcheck.service,
      user: healthcheck.user,
    }],
  }))
  .value();

  // combine our checks into app.checks
  app.checks = [...app.checks, ...checks].filter(Boolean);

  // generate tasks
  const tasks = _(checks).map(healthcheck => ({
    title: `Healthcheck ${healthcheck.container}`,
    retry: healthcheck.retry,
    task: async (ctx, task) => {
      // add the metadata
      ctx.data[healthcheck.service] = healthcheck;

      try {
        await healthcheck.test(...healthcheck.args);
      } catch (error) {
        // assess retry situation
        const {count} = task.isRetrying();
        // do different things depending on whether a retry is pending
        if (count === healthcheck.retry) {
          ctx.errors.push(error);
        } else {
          await require('delay')(healthcheck.delay + (100 * count));
        }

        throw error;

      // finally add a slight delay to help post-start events run without failure
      // and to update the service info
      } finally {
        const service = _.find(app.info, {service: healthcheck.service});
        service.healthy = _.find(ctx.errors, {service: healthcheck.service}) === undefined;
        await require('delay')(1000);
      }
    },
  }))
  .value();

  // add our listr2 check tasklist
  app.checks.push({
    type: 'healthcheck-tasks',
    test: async (tasks, options) => {
      if (tasks && tasks.length > 0) {
        // run tasks
        const {errors} = await app.runTasks(tasks, options);

        // if we have errors lets add relevant warnings
        if (errors && errors.length > 0) {
          _.forEach(errors, error => {
            // parse the message
            const message = _.trim(_.get(error, 'message', 'UNKNOWN ERROR'));
            // add the warning
            app.addMessage({
              title: `The service "${error.service}" failed its healthcheck`,
              type: 'warning',
              detail: [
                `Failed with ${color.yellow(message)}`,
                'This may be ok but we recommend you run the command below to investigate:',
              ],
              command: `lando logs -s ${error.service}`,
            }, error, true);
          });
        }

        // reset compose caches with updated healthy info
        app.updateComposeCache();
        app.v4.updateComposeCache();
      }
    },
    args: [tasks, {
      renderer: 'dc2',
      rendererOptions: {
        header: 'Healthchecking',
        states: {
          COMPLETED: 'Passed',
          STARTED: 'Running',
          RETRY: 'Running',
          FAILED: 'FAILED',
        },
      },
    }],
  });
};
