'use strict';

// Modules
const merge = require('lodash/merge');

// get the bosmang
const defaults = {
  debug: require('debug')('@lando/get-wsl-status'),
  ignoreReturnCode: true,
  env: {...process.env, WSL_UTF8: 1},
};

module.exports = async (options = {}) => {
  const args = ['-Command', 'wsl --status'];
  const opts = merge({}, defaults, options);
  const {debug} = opts;
  const {code, stdout} = await require('./run-command')('powershell', args, opts);
  debug('wsl status %O', opts.env);

  return {code, stdout};
};

