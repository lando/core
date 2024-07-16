'use strict';

const _ = require('lodash');

module.exports = async (app, lando) => {
  if (!_.isEmpty(_.get(app, 'config.tooling', {}))) {
    app.log.verbose('additional tooling detected');

    // Add the tasks after we init the app
    _.forEach(require('../utils/get-tooling-tasks')(app.config.tooling, app), task => {
      app.log.debug('adding app cli task %s', task.name);
      const injectable = _.has(app, 'engine') ? app : lando;
      app.tasks.push(require('../utils/build-tooling-task')(task, injectable));
    });
  }
};
