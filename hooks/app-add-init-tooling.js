'use strict';

const _ = require('lodash');

module.exports = async (app, lando) => {
  if (!_.isEmpty(_.get(app, 'config.tooling', {}))) {
    app.log.verbose('additional tooling detected');

    // Add the _init tasks for the bootstrap event!
    // TODO(flo): They are duplicated through "app-add-tooling" but I do not care for now!
    _.forEach(require('../utils/get-tooling-tasks')(app.config.tooling, app), task => {
      if (task.service !== '_init') {
        return;
      }

      app.log.debug('adding app cli task %s', task.name);
      const injectable = _.has(app, 'engine') ? app : lando;
      app.tasks.push(require('../utils/build-tooling-task')(task, injectable));
    });
  }
};
