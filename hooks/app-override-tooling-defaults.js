'use strict';

const _ = require('lodash');

module.exports = async (app, lando) => {
  for (const task of lando.tasks.filter(task => task.override)) {
    app._coreToolingOverrides.push(_.cloneDeep(_.find(lando.tasks, {command: task.command})));
  }
};
