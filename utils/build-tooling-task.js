'use strict';

const _ = require('lodash');
const remove = require('./remove');
const path = require('path');

module.exports = (config, injected) => {
  // Get our defaults and such
  const getToolingDefaults = require('./get-tooling-defaults');
  const {name, app, appMount, cmd, describe, dir, env, options, service, user} = getToolingDefaults(config);

  // add debug stuff if debuggy
  env.DEBUG = injected.debuggy ? '1' : '';
  env.LANDO_DEBUG = injected.debuggy ? '1' : '';

  // service api 4 services that canExec
  const canExec = Object.fromEntries((config?.app?.info ?? [])
    .map(service => ([service.service, config?.app?.executors?.[service.service] ?? false])));

  // Handle dynamic services and passthrough options right away
  // Get the event name handler
  const eventName = name.split(' ')[0];
  const run = answers => {
    let initToolingRunner = null;

    return injected.Promise.try(() => (_.isEmpty(app.compose)) ? app.init() : true)
      // Kick off the pre event wrappers
      .then(() => app.events.emit(`pre-${eventName}`, config, answers))
      // Get an interable of our commandz
      .then(() => _.map(require('./parse-tooling-config')(cmd, service, name, options, answers, canExec)))
      // Build run objects
      .map(
        ({command, service}) => {
          if ('_init' === service) {
            initToolingRunner = _.merge(
              {},
              require('./build-init-runner')(_.merge(
                {},
                require('./get-init-runner-defaults')(app._lando, {destination: app.root, name: app.project}),
                {cmd: command, workdir: '/app', env},
              )),
            );

            return initToolingRunner;
          }

          return require('./build-tooling-runner')(
            app, command, service, user, env, dir, appMount, !answers?.deps ?? false, answers?.autoRemove ?? true,
          );
        })
      // Try to run the task quickly first and then fallback to compose launch
      .each(runner => injected.engine.run(runner).catch(composeError => {
              composeError.hide = true;
              throw composeError;
          }),
      )
      // Post event
      .then(() => app.events.emit(`post-${eventName}`, config, answers))
      .finally(() => {
        if (null === initToolingRunner) {
          return;
        }

        initToolingRunner.opts = {purge: true, mode: 'attach'};
        return injected.engine.stop(initToolingRunner)
          .then(() => injected.engine.destroy(initToolingRunner))
          .then(() => remove(path.dirname(initToolingRunner.compose[0])));
      });
  };

  // Return our tasks
  return {
    command: name,
    describe,
    run,
    options,
  };
};
