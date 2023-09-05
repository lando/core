'use strict';

// Modules
const _ = require('lodash');
const getUser = require('./../../../lib/utils').getUser;

// Helper to find the default service
const getDefaultService = (data = {}, defaultService = 'appserver') => {
  if (_.has(data, 'service')) {
    if (_.startsWith(data.service, ':')) {
      const option = _.trimStart(data.service, ':');
      return _.get(data, `options.${option}.default`, defaultService);
    } else {
      return _.get(data, 'service');
    }
  } else {
    return defaultService;
  }
};

// Helper to find a command
const getCommand = cmd => typeof cmd === 'object' ? cmd[getFirstKey(cmd)] : cmd;

// Key find helper
const getFirstKey = obj => _.first(_.keys(obj));

// Helper to find a service
const getService = (cmd, data = {}, defaultService = 'appserver') => {
  return typeof cmd === 'object' ? getFirstKey(cmd) : getDefaultService(data, defaultService);
};

/*
 * Translate events into run objects
 */
exports.events2Runz = (cmds, app, data = {}) => _.map(cmds, cmd => {
  // Discover the service
  const command = getCommand(cmd);
  const service = getService(cmd, data, app._defaultService);
  // Validate the service if we can
  // @NOTE fast engine runs might not have this data yet
  if (app.services && !_.includes(app.services, service)) {
    throw new Error(`This app has no service called ${service}`);
  }
  const separator = app._config.composeSeparator;
  // Add the build command
  return {
    id: `${app.project}${separator}${service}${separator}1`,
    cmd: ['/bin/sh', '-c', _.isArray(command) ? command.join(' ') : command],
    compose: app.compose,
    project: app.project,
    api: _.includes(_.get(app, 'v4.servicesList', []), service) ? 4 : 3,
    opts: {
      cstdio: ['inherit', 'pipe', 'pipe'],
      mode: 'attach',
      user: getUser(service, app.info),
      services: [service],
    },
  };
});
