'use strict';

// Modules
const merge = require('lodash/merge');

const {spawn} = require('child_process');

// get the bosmang
const defaults = {
  debug: require('debug')('@lando/run-command'),
  ignoreReturnCode: false,
  env: process.env,
};

module.exports = (command, args = [], options = {}, stdout = '', stderr = '') => {
  // @TODO: error handling?
  // merge our options over the defaults
  options = merge({}, defaults, options);
  const debug = options.debug;

  // this is a weirdly odd and specific thing we need to do
  // @TODO: scope to just command = wsl|wsl.exe?
  if (process.platform === 'win32') options.env.WSL_UTF8 = 1;
  // birth
  console.log(options);
  debug('running command %o %o', command, args);

  const child = spawn(command, args, options);

  return require('./merge-promise')(child, async () => {
    return new Promise((resolve, reject) => {
      child.on('error', error => {
        stderr += error?.message ?? error;
      });

      child.stdout.on('data', data => {
        debug('stdout %o', data.toString().trim());
        stdout += data;
      });

      child.stderr.on('data', data => {
        debug('stderr %o', data.toString().trim());
        stderr += data;
      });

      child.on('close', code => {
        // if code is non-zero and we arent ignoring then reject here
        if (code !== 0 && !options.ignoreReturnCode) {
          const error = new Error(stderr);
          error.code = code;
          reject(error);
        }

        // otherwise return
        resolve({stdout, stderr, code});
      });
    });
  });
};
