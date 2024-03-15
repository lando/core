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
  const {code, stdout} = await require('./run-command')('powershell', args, opts);
  console.log(code, stdout);
  console.log(opts.env);

  // if code is non zero we can return uninstalled
  if (code !== 0) return {installed: false, features: false, version: undefined};

  // otherwise lets try to sus things out by first making sure we have something parseable
  const data = !stdout.includes('Default Version') ? Buffer.from(stdout, 'utf8').toString('utf16le') : stdout;
  console.log(data);

  // try to get version
  const versionLine = data.split('\n').filter(line => line.includes('Default Version'))[0];
  console.log(versionLine);

  return {
    installed: true,
    features: !data.includes('"Virtual Machine Platform"') && !data.includes('"Windows Subsystem for Linux"'),
  };
};

