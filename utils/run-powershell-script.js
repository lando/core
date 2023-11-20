'use strict';

// Modules
const merge = require('lodash/merge');

const {spawn} = require('child_process');

// get the bosmang
const defaults = {
  debug: require('debug')('@lando/run-elevated'),
  ignoreReturnCode: false,
};

module.exports = (args, options, stdout = '', stderr = '') => {
  // merge our options over the defaults
  options = merge({}, defaults, options);
  const debug = options.debug;

  // birth
  debug('running elevated command %o %o', 'powershell', args);
  const child = spawn('powershell', ['-ExecutionPolicy', 'Bypass', '-File'].concat(args), options);

  child.stdout.on('data', data => {
    debug('powershell %o', data.toString().trim());
    stdout += data;
  });

  child.stderr.on('data', data => {
    debug('powershell stderr %o', data.toString().trim());
    stderr += data;
  });

  return require('./merge-promise')(child, async () => {
    return new Promise((resolve, reject) => {
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
