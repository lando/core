'use strict';

// Modules
const _ = require('lodash');

module.exports = async (app, lando) => {
  // add healthchecks
  app.events.on('post-start', 1, async () => await require('./hooks/app-add-healthchecks')(app, lando));

  // run healthchecks
  if (_.get(lando, 'config.healthcheck', true) !== 'legacy') {
    app.events.on('post-start', 2, async () => {
      const healthchecks = _.find(app.checks, {type: 'healthcheck-tasks'});
      if (healthchecks) await healthchecks.test(...healthchecks.args);
    });
  }
};
