'use strict';

const LandoError = require('../components/error');

module.exports = ({code = 1, stderr = '', stdout = '', messages = ''} = {}) => {
  // start by getting the buiild lines
  const buildlines = stderr.split('\n').filter(line => line.startsWith('#'));

  // if buildlines is empty then its a pre-build error and handle that
  if (buildlines.length === 0) return new LandoError(stderr.split('\n')[0], {code, stdout, stderr});

  // and the step that failed
  const failstep = buildlines[buildlines.length - 1].split(' ')[0];

  // if we dont have a failstep we should send back an unknown error
  if (!failstep) return new LandoError('Unknown build error!', {code, stderr, stdout});

  // if we get here we should be able ot parse stuff
  const faillines = buildlines.filter(line => line.startsWith(failstep));

  // the first line can be dropped, it just contains the instruction
  faillines.shift();

  // if the last line contains an ERROR and exit code we should be able to sus out a code
  if (faillines[faillines.length - 1].startsWith(`${failstep} ERROR:`)
    && faillines[faillines.length - 1].includes('exit code:')) {
    const errorcode = faillines.pop().split('exit code:')[1];
    code = typeof errorcode === 'string' ? parseInt(errorcode.trim()) : code;
  }

  // now generate a string of the most relevant errors and strip any debug messages
  messages = faillines
    .map(line => line.split(' ').slice(2).join(' '))
    .filter(line => !line.startsWith('debug'));

  // return a lando error
  return new LandoError(messages.join(' '), {code, stdout, stderr});
};
