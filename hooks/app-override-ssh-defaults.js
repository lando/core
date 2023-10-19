'use strict';

const _ = require('lodash');

module.exports = async (app, lando) => {
  if (_.find(lando.tasks, {command: 'ssh'})) {
    const sshTask = _.cloneDeep(_.find(lando.tasks, {command: 'ssh'}));
    _.set(sshTask, 'options.service.default', app._defaultService);
    app._coreToolingOverrides.push(sshTask);
  }
};
