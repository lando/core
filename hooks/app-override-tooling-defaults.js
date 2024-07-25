'use strict';

const merge = require('lodash/merge');

module.exports = async (app, lando) => {
  for (const task of lando.tasks.filter(task => task.override)) {
    app.log.debug('overriding task %s with dynamic app options', task.command);
    app._coreToolingOverrides = merge({}, app._coreToolingOverrides, {[task.command]: require(task.file)(lando, app)});
  }
};
