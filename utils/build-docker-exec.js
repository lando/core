'use strict';

const _ = require('lodash');

/*
 * Build docker exec opts
 */
const getExecOpts = (docker, datum) => {
  const exec = [docker, 'exec'];
  // Should only use this if we have to
  if (process.stdin.isTTY) exec.push('--tty');
  // Should only set interactive in node mode
  if (process.lando === 'node') exec.push('--interactive');
  // add workdir if we can
  if (datum.opts.workdir) {
    exec.push('--workdir');
    exec.push(datum.opts.workdir);
  }
  // Add user
  exec.push('--user');
  exec.push(datum.opts.user);
  // Add envvvars
  _.forEach(datum.opts.environment, (value, key) => {
    exec.push('--env');
    exec.push(`${key}=${value}`);
  });
  // Add id
  exec.push(datum.id);
  return exec;
};

module.exports = (injected, stdio, datum = {}) => {
  // Depending on whether injected is the app or lando
  const dockerBin = injected.config.dockerBin || injected._config.dockerBin;
  const opts = {mode: 'attach', cstdio: stdio};

  // Run run run
  return injected.shell.sh(getExecOpts(dockerBin, datum).concat(datum.cmd), opts);
};
