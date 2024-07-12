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

  // Assess the intention to detach
  if (datum.cmd[0] === '/etc/lando/exec.sh' && datum.cmd[datum.cmd.length - 1] === '&') {
    datum.cmd.pop();
    exec.push('--detach');
  } else if (datum.cmd[0] === '/bin/sh' && datum.cmd[1] === '-c' && datum.cmd[2].endsWith('&')) {
    datum.cmd[2] = datum.cmd[2].slice(0, -1).trim();
    exec.push('--detach');
  }

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
