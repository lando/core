'use strict';

// Modules
const _ = require('lodash');
const getUser = require('./../../../lib/utils').getUser;
const path = require('path');

const getApiVersion = (version = 3) => {
  // return 4 if its 4ish
  if (version === 4 || version === '4' || version === 'v4') return 4;
  // return 3 if its 3ish
  else if (version === 3 || version === '3' || version === 'v3') return 3;
  // if we have no idea then also return 3
  return 3;
};

/*
 * Helper to get global deps
 * @TODO: this looks pretty testable? should services have libs?
 */
exports.addBuildStep = (steps, app, name, step = 'build_internal', front = false) => {
  const current = _.get(app, `config.services.${name}.${step}`, []);
  const add = (front) ? _.flatten([steps, current]) : _.flatten([current, steps]);
  _.set(app, `config.services.${name}.${step}`, _.uniq(add));
};

/*
 * Helper to get global deps
 * @TODO: this looks pretty testable? should services have libs?
 */
exports.cloneOverrides = (overrides = {}) => {
  const newOverrides = _.cloneDeep(overrides);
  if (_.has(newOverrides, 'image')) delete newOverrides.image;
  if (_.has(newOverrides, 'build')) delete newOverrides.build;
  return newOverrides;
};

/*
 * Helper to get global deps
 * @TODO: this looks pretty testable? should services have libs?
 */
exports.getInstallCommands = (deps, pkger, prefix = []) => _(deps)
  .map((version, pkg) => _.flatten([prefix, pkger(pkg, version)]))
  .map(command => command.join(' '))
  .value();

/*
 * Filter and map build steps
 */
exports.filterBuildSteps = (services, app, rootSteps = [], buildSteps= [], prestart = false) => {
  // Start collecting them
  const build = [];
  // Go through each service
  _.forEach(services, service => {
    // Loop through all internal, legacy and user steps
    _.forEach(rootSteps.concat(buildSteps), section => {
      // If the service has build sections let's loop through and run some commands
      if (!_.isEmpty(_.get(app, `config.services.${service}.${section}`, []))) {
        // Run each command
        _.forEach(app.config.services[service][section], cmd => {
          build.push({
            id: app.containers[service],
            cmd: ['/bin/sh', '-c', _.isArray(cmd) ? cmd.join(' ') : cmd],
            compose: app.compose,
            project: app.project,
            opts: {
              mode: 'attach',
              cstdio: ['inherit', 'pipe', 'pipe'],
              prestart,
              user: (_.includes(rootSteps, section)) ? 'root' : getUser(service, app.info),
              services: [service],
            },
          });
        });
      }
    });
  });
  // Let's silent run user-perm stuff and add a "last" flag
  if (!_.isEmpty(build)) {
    const permsweepers = _(build)
      .map(command => ({id: command.id, services: _.get(command, 'opts.services', [])}))
      .uniqBy('id')
      .value();
    _.forEach(permsweepers, ({id, services}) => {
      build.unshift({
        id,
        cmd: '/helpers/user-perms.sh --silent',
        compose: app.compose,
        project: app.project,
        opts: {
          mode: 'attach',
          prestart,
          user: 'root',
          services,
        },
      });
    });
    // Denote the last step in the build if its happening before start
    const last = _.last(build);
    last.opts.last = prestart;
  }
  // Return
  return build;
};

/*
 * Parse config into raw materials for our factory
 */
exports.parseConfig = (config, app) => _(config)
  // Arrayify
  .map((service, name) => _.merge({}, service, {name}))
  // ensure api is set to something valid
  .map(service => _.merge({}, service, {api: getApiVersion(service.api)}))
  // Filter out any services without a type, this implicitly assumes these
  // services are "managed" by lando eg their type/version details are provided
  // by another service
  .filter(service => _.has(service, 'type'))
  // Build the config
  .map(service => _.merge({}, service, {
    _app: app,
    app: app.name,
    confDest: path.join(app._config.userConfRoot, 'config', service.type.split(':')[0]),
    data: `data_${service.name}`,
    home: app._config.home,
    project: app.project,
    root: app.root,
    type: service.type.split(':')[0],
    userConfRoot: app._config.userConfRoot,
    version: service.type.split(':')[1],
  }))
  .value();

/*
 * Run build
 */
exports.runBuild = (app, steps, lockfile, hash = 'YOU SHALL NOT PASS') => {
  if (!_.isEmpty(steps) && !app._lando.cache.get(lockfile)) {
    app.log.info('running build steps...');
    return app.engine.run(steps)
    // Save the new hash if everything works out ok
    .then(() => {
      app._lando.cache.set(lockfile, hash, {persist: true});
      app.log.info('build steps completed. and locked with %s', lockfile);
    })
    // Make sure we don't save a hash if our build fails
    .catch(error => {
      app.addWarning({
        title: `One of your v3 build steps failed`,
        detail: [
          'This **MAY** prevent your app from working.',
          'Check for errors above, fix them in your Landofile, and try again by running:',
        ],
        command: 'lando rebuild',
      }, error);
    });
  }
};
