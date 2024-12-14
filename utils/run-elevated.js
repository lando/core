'use strict';

// Modules
const fs = require('fs');
const merge = require('lodash/merge');
const os = require('os');
const path = require('path');

const {nanoid} = require('nanoid');
const {spawn} = require('child_process');

// get the bosmang
const defaults = {
  encode: undefined,
  env: process.env,
  debug: require('debug')('@lando/run-elevated'),
  ignoreReturnCode: false,
  isInteractive: require('is-interactive')(),
  method: process.platform === 'win32' ? 'run-elevated' : 'sudo',
  notify: true,
  password: undefined,
  user: 'root',
};

const getChild = (command, options) => {
  switch (options.method) {
    case 'sudo':
      return spawn('sudo', command, options);
    case 'run-elevated': {
      // copy elevation script to tmpfile
      // @NOTE: we do this because if this code is run from a packaged up binary we dont have access to the file
      // from the outside
      const script = path.join(os.tmpdir(), `${nanoid()}.ps1`);
      fs.copyFileSync(path.resolve(__dirname, '..', 'scripts', 'run-elevated.ps1'), script);
      return require('./run-powershell-script')(script, command, options);
    }
    default:
      return spawn('sudo', command, options);
  }
};

module.exports = (command, options, stdout = '', stderr = '') => {
  // @TODO: handle string args with string-argv?
  // merge our options over the defaults
  options = merge({}, defaults, options);
  const {debug} = options;

  // sudo
  if (options.method === 'sudo') {
    command.unshift('--');
    // if we want to notify the user
    if (options.notify) command.unshift('--bell');
    // if this is non-interactive then pass that along to sudo
    if (!options.isInteractive) command.unshift('--non-interactive');
    // if interactive and have a password then add -S so we can write the password to stdin
    if (options.isInteractive && options.password) command.unshift('--stdin');

  // run-elevated
  } else if (options.method === 'run-elevated') {
    // reset args
    command = ['-cmd', command.join(',')];
    // debug mode
    if (options.debug.enabled) command.push('-debug');
  }

  // grab the child
  // @TODO: also debug the options?
  debug('running elevated command %o %o %o', options.method, command);
  const child = getChild(command, options);

  // return the merged thingy
  return require('./merge-promise')(child, async () => {
    return new Promise((resolve, reject) => {
      child.on('error', error => {
        debug('elevated command %o error %o', command, error?.message);
        stderr += error?.message ?? error;
      });

      child.stdout.on('data', data => {
        debug('%o stdout %o', options.method, data.toString().trim());
        stdout += data;
      });

      child.stderr.on('data', data => {
        debug('%o stderr %o', options.method, data.toString().trim());
        stderr += data;
      });

      // write the password to stdin if we can
      if (options.isInteractive && options.password) {
        child.stdin.setEncoding('utf-8');
        child.stdin.write(`${options.password}${os.EOL}`);
        child.stdin.end();
      }

      child.on('close', code => {
        debug('elevated command %o done with code %o', command, code);
        // with run-elevate we want to clean up stderr a bit if we can eg remove the powershell shit
        if (options.method === 'run-elevated') {
          const raw = stderr;

          stderr = stderr.split('. At line')[0];
          stderr = stderr.split(`${os.EOL}At `)[0];

          // add nse if we have one
          if (raw.split('NativeCommandError')[1]) {
            const nse = raw.split('NativeCommandError')[1];
            stderr = `${stderr}. ${nse.trim()}`;
          }

          // simplify the UAC cancel error
          if (stderr.includes('The operation was canceled by the user.')) {
            stderr = 'The operation was canceled by the user.';
          }
        }

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
