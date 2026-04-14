'use strict';

// Modules
const _ = require('lodash');
const describeContext = require('../utils/describe-context');
const extractDetach = require('../utils/extract-detach');
const buildEnvironment = require('../utils/build-exec-environment');

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
};

// Default options nad things
const defaultOptions = {
  build: {noCache: false, pull: true},
  down: {removeOrphans: true, volumes: true},
  exec: {detach: false},
  kill: {},
  logs: {follow: false, timestamps: false},
  ps: {q: true},
  pull: {},
  rm: {force: true, volumes: true},
  up: {background: true, noRecreate: true, recreate: false, removeOrphans: true},
};

/*
 * Helper to merge options with default
 */
const mergeOpts = (run, opts = {}) => _.merge({}, defaultOptions[run], opts);

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
const buildCmd = (run, name, compose, {services, cmd}, opts = {}) => {
  if (!name) throw new Error('Need to give this composition a project name!');
  // @TODO: we need to strip out opts.user on start/stop because we often get it as part of run
  const project = ['--project-name', name];
  const files = _.flatten(_.map(compose, unit => ['--file', unit]));
  const options = parseOptions(opts);
  const argz = _.flatten(_.compact([services, cmd]));
  return _.flatten([project, files, run, options, argz]);
};

/*
 *  Helper to build build object needed by lando.shell.sh
 */
const buildShell = (run, name, compose, opts = {}) => ({
  cmd: buildCmd(run, name, compose, {services: opts.services, cmd: opts.cmd}, mergeOpts(run, opts)),
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
  // Extract detach intent from trailing '&' in the command
  if (opts.detach !== true && opts.cmd) {
    const result = extractDetach(opts.cmd);
    if (result.detach) {
      opts.cmd = result.cmd;
      opts.detach = true;
    }
  }

  const context = describeContext();

  // Detached execs should never allocate a TTY. Otherwise compute TTY
  // at call time so the decision reflects the current terminal state.
  if (opts.detach === true) {
    opts.noTTY = true;
  } else if (opts.noTTY === undefined) {
    opts.noTTY = !(context.stdin.isTTY && context.stdout.isTTY);
  }

  // Use the shared buildEnvironment utility to inject terminal-size
  // and color hints, ensuring the compose exec path gets the same
  // treatment as the docker exec path.  Caller-provided environment
  // vars always win via the spread order.
  const envDefaults = buildEnvironment(context);
  opts.environment = {...envDefaults, ...(opts.environment || {})};

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
