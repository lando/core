'use strict';

// Modules
const _ = require('lodash');
const buildTask = require('./lib/build');
const utils = require('./lib/utils');

module.exports = (app, lando) => {
  // Compose cache key
  const composeCache = `${app.name}.compose.cache`;

  // If we have an app with a tooling section let's do this
  app.events.on('post-init', () => {
    if (!_.isEmpty(_.get(app, 'config.tooling', {}))) {
      app.log.verbose('additional tooling detected');
      // Add the tasks after we init the app
      _.forEach(utils.getToolingTasks(app.config.tooling, app), task => {
        app.log.debug('adding app cli task %s', task.name);
        const injectable = _.has(app, 'engine') ? app : lando;
        app.tasks.push(buildTask(task, injectable));
      });
    }
  });

  // ensure we override the ssh tooling command with a good default
  app.events.on('ready', 1, () => {
    if (_.find(lando.tasks, {command: 'ssh'})) {
      const sshTask = _.cloneDeep(_.find(lando.tasks, {command: 'ssh'}));
      _.set(sshTask, 'options.service.default', app._defaultService);
      app._coreToolingOverrides.push(sshTask);
    }
  });


  // Save a compose cache every time the app is ready, this allows us to
  // run faster tooling commands and set better per-app defaults
  app.events.on('ready', () => {
    lando.cache.set(composeCache, {
      name: app.name,
      project: app.project,
      compose: app.compose,
      root: app.root,
      info: app.info,
      overrides: {
        tooling: app._coreToolingOverrides,
      },
    }, {persist: true});
  });

  // Remove compose cache on uninstall
  app.events.on('post-uninstall', () => {
    lando.cache.remove(composeCache);
  });
};
