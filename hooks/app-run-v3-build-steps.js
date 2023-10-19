'use strict';

const _ = require('lodash');

// Build keys
const preRootSteps = [
  'build_as_root_internal',
  'build_as_root',
  'install_dependencies_as_root_internal',
  'install_dependencies_as_root',
];
const preBuildSteps = [
  'build_internal',
  'build',
  'install_dependencies_as_me_internal',
  'install_dependencies_as_me',
];
// Post app start build steps
const postRootSteps = [
  'run_as_root_internal',
  'run_as_root',
  'extras',
];
const postBuildSteps = [
  'run_internal',
  'run_as_me_internal',
  'run',
  'run_as_me',
];

module.exports = async (app, lando) => {
  // Add in build hashes
  app.meta.lastPreBuildHash = _.trim(lando.cache.get(app.preLockfile));
  app.meta.lastPostBuildHash = _.trim(lando.cache.get(app.postLockfile));

  // get v3 buildable services
  const buildServices = _.get(app, 'opts.services', app.services);
  const buildV3Services = _(app.parsedV3Services)
    .filter(service => _.includes(buildServices, service.name))
    .map(service => service.name)
    .value();
  app.log.debug('going to build v3 services if applicable', buildV3Services);

  // Make sure containers for this app exist; if they don't and we have build locks, we need to kill them
  // @NOTE: this is need to make sure containers rebuild on a lando rebuild, its also for general cleanliness
  app.events.on('pre-start', () => {
    return lando.engine.list({project: app.project, all: true}).then(data => {
      if (_.isEmpty(data)) {
        lando.cache.remove(app.preLockfile);
        lando.cache.remove(app.postLockfile);
        app.log.debug('removed v3 build locks');
      }
    });
  });

  // Queue up both legacy and new build steps
  app.events.on('pre-start', 100, () => {
    const preBuild = require('../utils/filter-v3-build-steps')(buildV3Services, app, preRootSteps, preBuildSteps, true);
    return require('../utils/run-v3-build')(app, preBuild, app.preLockfile, app.configHash);
  });
  app.events.on('post-start', 100, () => {
    const postBuild = require('../utils/filter-v3-build-steps')(buildV3Services, app, postRootSteps, postBuildSteps);
    return require('../utils/run-v3-build')(app, postBuild, app.postLockfile, app.configHash);
  });
};
