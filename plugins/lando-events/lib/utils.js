'use strict';

// Modules
const _ = require('lodash');
const getUser = require('./../../../lib/utils').getUser;

// Helper to find the default service
const getDefaultService = (data = {}, defaultService = 'appserver') => {
  // if this is an event built on a service-dynamic command
  if (_.has(data, 'service') && _.startsWith(data.service, ':')) {
    // get the option name
    const option = _.trimStart(data.service, ':');
    // get the argv
    const argv = _.get(data, 'app.config.argv', {});
    // return the argv of the option or its default value
    return _.has(argv, option) ? argv[option] : _.get(data, `options.${option}.default`, defaultService);
  }

  // or if the service is explicitly set by a tooling command
  if (_.has(data, 'service')) return _.get(data, 'service');

  // otherwise just return the default
  return defaultService;
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

  // try to get a list of v4 services a few ways, we have to look at different places because the event could
  // run at various points in the bootstrap
  const v4s = _([
    _(app.info).filter(service => service.api === 4).map('service').value(),
    _.get(app, 'v4.servicesList', []),
  ]).flatten().compact().uniq().value();

  // Validate the service if we can
  // @NOTE fast engine runs might not have this data yet
  if (app.services && !_.includes(app.services, service)) {
    throw new Error(`This app has no service called ${service}`);
  }

  // Add the build command
  return {
    id: `${app.project}_${service}_1`,
    cmd: ['/bin/sh', '-c', _.isArray(command) ? command.join(' ') : command],
    compose: app.compose,
    project: app.project,
    api: _.includes(v4s, service) ? 4 : 3,
    opts: {
      cstdio: ['inherit', 'pipe', 'pipe'],
      mode: 'attach',
      user: getUser(service, app.info),
      services: [service],
    },
  };
});
