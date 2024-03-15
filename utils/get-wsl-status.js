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

  // lets try to sus things out by first making sure we have something parseable
  const data = !stdout.includes('Default Version') ? Buffer.from(stdout, 'utf8').toString('utf16le') : stdout;

  // try to get version
  const versionLine = data.split('\n').filter(line => line.includes('Default Version'))[0];
  const versionString = versionLine ?? '';
  const version = typeof versionString.split(':')[1] === 'string' ? versionString.split(':')[1].trim() : undefined;

  // debug
  debug('discovered wsl version %o with code %o', version, code);

  return {
    installed: (code === 0 || code === 1) && version !== undefined,
    features: !data.includes('"Virtual Machine Platform"') && !data.includes('"Windows Subsystem for Linux"'),
    version,
  };
};

