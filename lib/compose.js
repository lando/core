'use strict';

// Modules
const _ = require('lodash');

// Helper object for flags
const composeFlags = {
  background: '--detach',
  detach: '--detach',
  follow: '--follow',
  force: '--force',
  noCache: '--no-cache',
  noRecreate: '--no-recreate',
  noDeps: '--no-deps',
  noTTY: '-T',
  pull: '--pull',
  q: '--quiet',
  recreate: '--force-recreate',
  removeOrphans: '--remove-orphans',
  rm: '--rm',
  timestamps: '--timestamps',
  volumes: '-v',
  outputFilePath: '-o',
};

const composeFlagOptionMapping = {
  build: ['noCache', 'pull', 'q'],
  down: ['removeOrphans', 'volumes'],
  exec: ['background', 'detach', 'noTTY'],
  kill: ['removeOrphans'],
  logs: ['follow', 'timestamps'],
  ps: ['q'],
  pull: ['q'],
  rm: ['force', 'volumes'],
  up: ['background', 'detach', 'noRecreate', 'noDeps', 'pull', 'q', 'recreate', 'removeOrphans', 'timestamps'],
  config: ['outputFilePath', 'q'],
};

// Default options nad things
const defaultOptions = {
  build: {noCache: false, pull: true},
  down: {removeOrphans: true, volumes: true},
  exec: {detach: false, noTTY: !process.stdin.isTTY},
  kill: {},
  logs: {follow: false, timestamps: false},
  ps: {q: true},
  pull: {},
  rm: {force: true, volumes: true},
  up: {background: true, noRecreate: true, recreate: false, removeOrphans: true},
  config: {},
};

/*
 * Helper to merge options with default
 */
const mergeOpts = (run, opts = {}) => _.merge(
  {},
  defaultOptions[run],
  _.pickBy(
    opts,
    (value, index) => (!_.includes(_.keys(composeFlags), index)) || _.includes(composeFlagOptionMapping[run], index),
  ),
);

/*
 * Parse docker-compose options
 */
const parseOptions = (opts = {}) => {
  const flags = _.map(composeFlags, (value, key) => _.get(opts, key, false) ? value : '');
  const environment = _.flatMap(opts.environment, (value, key) => ['--env', `${key}=${value}`]);
  const user = (_.has(opts, 'user')) ? ['--user', opts.user] : [];
  const workdir = (_.has(opts, 'workdir')) ? ['--workdir', opts.workdir] : [];
  const entrypoint = _.map(opts.entrypoint, entrypoint => ['--entrypoint', entrypoint]);
  return _.compact(_.flatten([flags, environment, user, workdir, entrypoint]));
};

/*
 * Helper to standardize construction of docker commands
 */
const buildCmd = (run, name, compose, {services, cmd, envFiles}, opts = {}) => {
  if (!name) throw new Error('Need to give this composition a project name!');
  // @TODO: we need to strip out opts.user on start/stop because we often get it as part of run
  const project = ['--project-name', name];
  const files = _.flatten(_.map(compose, unit => ['--file', unit]));
  const envFile = _.flatten(_.map(envFiles, unit => ['--env-file', unit]));
  const options = parseOptions(opts);
  const argz = _.flatten(_.compact([services, cmd]));
  return _.flatten([project, files, envFile, run, options, argz]);
};

/*
 *  Helper to build build object needed by lando.shell.sh
 */
const buildShell = (run, name, compose, opts = {}) => ({
  cmd: buildCmd(run, name, compose, {services: opts.services, cmd: opts.cmd, envFiles: opts.envFiles ?? []}, mergeOpts(run, opts)),
  opts: {mode: 'spawn', cstdio: opts.cstdio, silent: opts.silent},
});

/*
 * Run docker compose build
 */
exports.build = (compose, project, opts = {}) => {
  const build = _(opts.local).filter(service => {
    return _.isEmpty(opts.services) || _.includes(opts.services, service);
  }).value();
  if (!_.isEmpty(build)) return buildShell('build', project, compose, {pull: _.isEmpty(opts.local), services: build});
  else return buildShell('ps', project, compose, {});
};

/*
 * Run docker compose pull
 */
exports.getId = (compose, project, opts = {}) => buildShell('ps', project, compose, opts);

/*
 * Run docker compose kill
 */
exports.kill = (compose, project, opts = {}) => buildShell('kill', project, compose, opts);

/*
 * Run docker compose logs
 */
exports.logs = (compose, project, opts = {}) => buildShell('logs', project, compose, opts);

/*
 * Run docker compose pull
 */
exports.pull = (compose, project, opts = {}) => {
  const pull = _(opts.pullable).filter(service => {
    return _.isEmpty(opts.services) || _.includes(opts.services, service);
  }).value();
  if (!_.isEmpty(pull)) return buildShell('pull', project, compose, {services: pull});
  else return buildShell('ps', project, compose, {});
};

/*
 * Run docker compose remove
 */
exports.remove = (compose, project, opts = {}) => {
  const subCmd = (opts.purge) ? 'down' : 'rm';
  return buildShell(subCmd, project, compose, opts);
};

/*
 * Run docker compose run
 */
exports.run = (compose, project, opts = {}) => {
  // add some deep handling for detaching
  // @TODO: should we let and explicit set of opts.detach override this?
  // thinking probably not because & is just not going to work the way you want without detach?
  // that said we can skip this if detach is already set to true
  if (opts.detach !== true) {
    if (opts.cmd[0] === '/etc/lando/exec.sh' && opts.cmd[opts.cmd.length - 1] === '&') {
      opts.cmd.pop();
      opts.detach = true;
    } else if (opts.cmd[0].endsWith('sh') && opts.cmd[1] === '-c' && opts.cmd[2].endsWith('&')) {
      opts.cmd[2] = opts.cmd[2].slice(0, -1).trim();
      opts.detach = true;
    } else if (opts.cmd[0].endsWith('bash') && opts.cmd[1] === '-c' && opts.cmd[2].endsWith('&')) {
      opts.cmd[2] = opts.cmd[2].slice(0, -1).trim();
      opts.detach = true;
    } else if (opts.cmd[opts.cmd.length - 1] === '&') {
      opts.cmd.pop();
      opts.detach = true;
    }
  }

  // and return
  return buildShell('exec', project, compose, opts);
};

/*
 * You can do a create, rebuild and start with variants of this
 */
exports.start = (compose, project, opts = {}) => buildShell('up', project, compose, opts);

/*
 * Run docker compose stop
 */
exports.stop = (compose, project, opts = {}) => buildShell('stop', project, compose, opts);

/*
 * Run docker compose config
 */
exports.config = (compose, project, opts = {}) => buildShell('config', project, compose, opts);
