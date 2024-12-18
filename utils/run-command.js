

'use strict';

// Modules
const merge = require('lodash/merge');
const {color} = require('listr2');

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
  const {debug} = options;

  // birth
  const child = spawn(command, args, options);
  debug('running command pid=%o %o %o', child.pid, command, args);


  return require('./merge-promise')(child, async () => {
    return new Promise((resolve, reject) => {
      child.on('error', error => {
        debug('command pid=$o %o error %o', child.pid, command, error?.message);
        stderr += error?.message ?? error;
      });

      child.stdout.on('data', data => {
        debug('stdout %s', color.dim(data.toString().trim()));
        stdout += data;
      });

      child.stderr.on('data', data => {
        debug('stderr %s', color.dim(data.toString().trim()));
        stderr += data;
      });

      child.on('close', code => {
        debug('command pid=%o %o done with code %o', child.pid, command, code);
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
