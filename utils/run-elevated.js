'use strict';

// Modules
const merge = require('lodash/merge');

const {EOL} = require('os');
const {spawn} = require('child_process');

// get the bosmang
const defaults = {
  notify: true,
  debug: require('debug')('@lando/run-elevated'),
  ignoreReturnCode: false,
  isInteractive: require('is-interactive'),
  password: undefined,
  prompt: 'sudo',
};

module.exports = (args, options, stdout = '', stderr = '') => {
  // merge our options over the defaults
  options = merge({}, defaults, options);

  // @NOTE: windows should automatically prompt via UAC so no prompt is needed?
  const cmd = process.platform === 'win32' ? 'powershell' : 'sudo';
  const debug = options.debug;

  // on posix we need to add special options to sudo
  // determine elevations options
  // start by delimiting between sudo args and others
  if (process.platform === 'darwin' || process.platform === 'linux') {
    args.unshift('--');
    // if we want to notify the user
    if (options.notify) args.unshift('--bell');
    // if this is non-interactive then pass that along to sudo
    if (!options.isInteractive) args.unshift('--non-interactive');
    // if interactive and have a password then add -S so we can write the password to stdin
    if (options.isInteractive && options.password) args.unshift('--stdin');
  }

  // also on windows we need to unshift some args
  if (process.platform === 'win32') {
    args.unshift('-File');
    args.unshift('Bypass');
    args.unshift('-ExecutionPolicy');
  }

  // birth
  debug('running elevated command %o %o', cmd, args);
  const child = spawn(cmd, args, options);

  child.stdout.on('data', data => {
    debug('sudo stdout %o', data.toString().trim());
    stdout += data;
  });

  child.stderr.on('data', data => {
    debug('sudo stderr %o', data.toString().trim());
    stderr += data;
  });

  // write the password to stdin if we can
  if (options.isInteractive && options.password) {
    child.stdin.setEncoding('utf-8');
    child.stdin.write(`${options.password}${EOL}`);
    child.stdin.end();
  }

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
