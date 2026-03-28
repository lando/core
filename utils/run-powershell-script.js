'use strict';

// Modules
const merge = require('lodash/merge');
const read = require('./read-file');
const winpath = require('./wslpath-2-winpath');

const {spawn, spawnSync} = require('child_process');

const parseArgs = args => args.map(arg => arg.startsWith('-') ? arg : `"${arg}"`).join(' ');
const isWSLInteropError = stderr => typeof stderr === 'string' && stderr.includes('UtilAcceptVsock:271: accept4 failed 110');
// TODO: Once the UI supports multi-line follow-up guidance, surface a restart-WSL recommendation alongside this error.
const formatWSLInteropError = () => 'Windows interop is unavailable from WSL; restart WSL with `wsl --shutdown` and try again.';

// get the bosmang
const defaults = {
  encode: undefined,
  env: process.env,
  debug: require('debug')('@lando/run-powershell-script'),
  ignoreReturnCode: false,
  toWSLPath: false,
};

module.exports = (script, args = [], options = {}, stdout = '', stderr = '', cargs = []) => {
  // merge our options over the defaults
  options = merge({}, defaults, options);

  // if encode is not explicitly set then we need to pick a good value
  if (options.encode === undefined) {
    const bargs = ['Set-ExecutionPolicy', '-Scope', 'Process', '-ExecutionPolicy', 'Bypass'];
    const {status} = spawnSync('powershell.exe', bargs, options);
    options.encode = status !== 0;
  }

  // if encode is true we need to do a bunch of other stuff
  if (options.encode === true) {
    const command = `& {${read(script)}} ${parseArgs(args)}`;
    cargs.push('-EncodedCommand', Buffer.from(command, 'utf16le').toString('base64'));

  // otherwise its pretty easy but note that we may path translate to a winpath if toWSLPath is on
  } else {
    if (options.toWSLPath) script = winpath(script);
    cargs.push('-ExecutionPolicy', 'Bypass', '-File', script, ...args);
  }

  // pull out debug
  const {debug} = options;

  // birth
  debug('running powershell script %o %o %o', script, args);
  const child = spawn('powershell.exe', ['-NoProfile'].concat(cargs), options);

  return require('./merge-promise')(child, async () => {
    return new Promise((resolve, reject) => {
      child.on('error', error => {
        debug('powershell script %o error %o', script, error?.message);
        stderr += error?.message ?? error;
      });

      child.stdout.on('data', data => {
        debug('powershell stdout %o', data.toString().trim());
        stdout += data;
      });

      child.stderr.on('data', data => {
        debug('powershell stderr %o', data.toString().trim());
        stderr += data;
      });

      child.on('close', code => {
        debug('powershell script %o done with code %o', script, code);
        // if code is non-zero and we arent ignoring then reject here
        if (code !== 0 && !options.ignoreReturnCode) {
          const message = isWSLInteropError(stderr) ? formatWSLInteropError(stderr) : stderr;
          const error = new Error(message);
          error.code = code;
          reject(error);
        }

        // otherwise return
        resolve({stdout, stderr, code});
      });
    });
  });
};

module.exports._isWSLInteropError = isWSLInteropError;
module.exports._formatWSLInteropError = formatWSLInteropError;
