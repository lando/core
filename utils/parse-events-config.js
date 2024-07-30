'use strict';

// Modules
const _ = require('lodash');

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

// adds required methods to ensure the lando v3 debugger can be injected into v4 things
module.exports = (cmds, app, data = {}) => _.map(cmds, cmd => {
  // Discover the service
  const command = getCommand(cmd);
  const service = getService(cmd, data, app._defaultService);
  // compute stdio based on compose major version
  const cstdio = _.get(app, '_config.orchestratorMV', 2) ? 'inherit' : ['inherit', 'pipe', 'pipe'];

  // try to get a list of v4 services a few ways, we have to look at different places because the event could
  // run at various points in the bootstrap
  const v4s = _([
    _(app.info).filter(service => service.api === 4).map('service').value(),
    _.get(app, 'v4.servicesList', []),
  ]).flatten().compact().uniq().value();

  // attempt to ascertain whether this is a v4 "exec" service
  const canExec = _.get(app, 'v4.services', []).find(s => s.id === service)?.canExec
    ?? _.get(app, `executors.${service}`, undefined)
    ?? _.get(data, `executors.${service}`, undefined)
    ?? false;

  // reset the cmd based on exec situation
  // @TODO: replace this with better command scripting stuff when command scripting is done?
  if (canExec) {
    cmd = ['/etc/lando/exec.sh', 'sh', '-c', _.isArray(command) ? command.join(' ') : command];
  } else {
    cmd = ['/bin/sh', '-c', _.isArray(command) ? command.join(' ') : command];
  }

  // Validate the service if we can
  // @NOTE fast engine runs might not have this data yet
  if (
    (Array.isArray(app.services) && !_.includes(app.services, service)) &&
    (Array.isArray(v4s) && !_.includes(v4s, service))
  ) {
    throw new Error(`This app has no service called ${service}`);
  }
  // Add the build command
  return {
    id: app.containers[service],
    cmd,
    compose: app.compose,
    project: app.project,
    api: _.includes(v4s, service) ? 4 : 3,
    opts: {
      cstdio,
      mode: 'attach',
      user: require('./get-user')(service, app.info),
      services: [service],
      environment: {
        DEBUG: app.debuggy ? '1' : '',
        LANDO_DEBUG: app.debuggy ? '1' : '',
      },
    },
  };
});
