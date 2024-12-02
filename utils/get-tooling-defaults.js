'use strict';

const _ = require('lodash');

module.exports = ({
  name,
  app = {},
  appMount,
  cmd = name,
  dir,
  description = `Runs ${name} commands`,
  env = {},
  options = {},
  service = '',
  stdio = 'inherit',
  user = null,
  } = {}) =>
  ({
    name,
    app: app,
    appMount: appMount,
    cmd: !_.isArray(cmd) ? [cmd] : cmd,
    dir,
    env,
    describe: description,
    options: options,
    service: service,
    stdio: stdio,
    user,
  });
