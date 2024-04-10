'use strict';

// Modules
const _ = require('lodash');
const path = require('path');

const {nanoid} = require('nanoid');

// Helper to set the LANDO_LOAD_KEYS var
const getKeys = (keys = true) => {
  if (_.isArray(keys)) return keys.join(' ');
  return keys.toString();
};

module.exports = async (app, lando) => {
  // Compose cache key
  app.composeCache = `${app.name}.compose.cache`;
  // Tooling cache key
  app.toolingCache = `${app.name}.tooling.cache`;
  // Build step locl files
  app.preLockfile = `${app.name}.build.lock`;
  app.postLockfile = `${app.name}.post-build.lock`;

  // Add v4 stuff to the app object
  app.v4 = {};
  app.v4._debugShim = require('./utils/debug-shim')(app.log);
  app.v4._dir = path.join(lando.config.userConfRoot, 'v4', `${app.name}-${app.id}`);
  app.v4.preLockfile = `${app.name}.v4.build.lock`;
  app.v4.postLockfile = `${app.name}.v4.build.lock`;
  app.v4.services = [];
  app.v4.composeCache = `${app.name}.compose.cache`;

  // front load top level networks
  app.v4.addNetworks = (data = {}) => {
    app.add({
      id: `v4-${nanoid()}`,
      info: {},
      data: [{networks: data}],
    }, true);
  };
  // front load top level volumes
  app.v4.addVolumes = (data = {}) => {
    app.add({
      id: `v4-${nanoid()}`,
      info: {},
      data: [{volumes: data}],
    }, true);
  };

  // load in and parse recipes
  app.events.on('pre-init', 4, async () => await require('./hooks/app-add-recipes')(app, lando));

  // load in and parse v3 services
  app.events.on('pre-init', async () => await require('./hooks/app-add-v3-services')(app, lando));

  // load in and parse v4 services
  app.events.on('pre-init', async () => await require('./hooks/app-add-v4-services')(app, lando));

  // run v3 build steps
  app.events.on('post-init', async () => await require('./hooks/app-run-v3-build-steps')(app, lando));

  // run v4 build steps
  app.events.on('post-init', async () => await require('./hooks/app-run-v4-build-steps')(app, lando));

  // Add localhost info to our containers if they are up
  app.events.on('post-init', async () => await require('./hooks/app-find-localhosts')(app, lando));

  // refresh all out v3 certs
  app.events.on('post-init', async () => await require('./hooks/app-refresh-v3-certs')(app, lando));

  // Run a secondary user perm sweep on services that cannot run as root eg mysql
  app.events.on('post-init', async () => await require('./hooks/app-run-v3-secondary-sweep')(app, lando));

  // Assess our key situation so we can warn users who may have too many
  app.events.on('post-init', async () => await require('./hooks/app-check-ssh-keys')(app, lando));

  // Flag legacy plugins
  app.events.on('post-init', async () => await require('./hooks/app-check-legacy-plugins')(app, lando));

  // Add tooling if applicable
  app.events.on('post-init', async () => await require('./hooks/app-add-tooling')(app, lando));

  // Collect info so we can inject LANDO_INFO
  // @NOTE: this is not currently the full lando info because a lot of it requires the app to be on
  app.events.on('post-init', 10, async () => await require('./hooks/app-set-lando-info')(app, lando));

  // Analyze an apps compose files so we can set the default bind addres correctly
  // @TODO: i feel like there has to be a better way to do this than this mega loop right?
  app.events.on('post-init', 9999, async () => await require('./hooks/app-set-bind-address')(app, lando));

  // override the ssh tooling command with a good default
  app.events.on('ready', 1, async () => await require('./hooks/app-override-ssh-defaults')(app, lando));

  // Discover portforward true info
  app.events.on('ready', async () => await require('./hooks/app-set-portforwards')(app, lando));

  // set tooling compose cache
  app.events.on('ready', async () => await require('./hooks/app-set-compose-cache')(app, lando));

  // v4 parts of the app are ready
  app.events.on('ready', 6, async () => await require('./hooks/app-v4-ready')(app, lando));

  // Save a compose cache every time the app is ready, we have to duplicate this for v4 because we modify the
  // composeData after the v3 app.ready event
  app.events.on('ready-v4', async () => await require('./hooks/app-set-v4-compose-cache')(app, lando));

  // Otherwise set on rebuilds
  // NOTE: We set this pre-rebuild because post-rebuild runs after post-start because you would need to
  // do two rebuilds to remove the warning since appWarning is already set by the time we get here.
  // Running pre-rebuild ensures the warning goes away but concedes a possible warning tradeoff between
  // this and a build step failure
  app.events.on('pre-rebuild', async () => await require('./hooks/app-update-built-against')(app, lando));

  // Determine pullable and locally built images
  app.events.on('pre-rebuild', async () => await require('./hooks/app-set-pullables')(app, lando));

  // we need to temporarily set app.compose to be V3 only and then restore it post-rebuild
  // i really wish thre was a better way to do this but alas i do not think there is
  app.events.on('pre-rebuild', 10, async () => await require('./hooks/app-shuffle-locals')(app, lando));

  // Check for updates if the update cache is empty
  app.events.on('pre-start', 1, async () => await require('./hooks/app-check-for-updates')(app, lando));

  // If the app already is installed but we can't determine the builtAgainst, then set it to something bogus
  app.events.on('pre-start', async () => await require('./hooks/app-update-built-against-pre')(app, lando));

  // Add update tip if needed
  app.events.on('post-start', async () => await require('./hooks/app-add-updates-info')(app, lando));

  // If we don't have a builtAgainst already then we must be spinning up for the first time and its safe to set this
  app.events.on('post-start', async () => await require('./hooks/app-update-built-against-post')(app, lando));

  // Add localhost info to our containers if they are up
  app.events.on('post-start', async () => await require('./hooks/app-find-localhosts')(app, lando));

  // Check for docker compat warnings and surface them nicely as well
  app.events.on('post-start', async () => await require('./hooks/app-check-docker-compat')(app, lando));

  // throw service not start errors
  app.events.on('post-start', 9999, async () => await require('./hooks/app-check-v4-service-running')(app, lando));

  // Reset app info on a stop, this helps prevent wrong/duplicate information being reported on a restart
  app.events.on('post-stop', async () => require('./utils/get-app-info-defaults')(app));

  // Remove meta cache on destroy
  app.events.on('post-destroy', async () => await require('./hooks/app-purge-metadata-cache')(app, lando));

  // remove v3 build locks
  app.events.on('post-uninstall', async () => await require('./hooks/app-purge-v3-build-locks')(app, lando));

  // remove v4 build locks
  app.events.on('post-uninstall', async () => await require('./hooks/app-purge-v4-build-locks')(app, lando));

  // remove compose cache
  app.events.on('post-uninstall', async () => await require('./hooks/app-purge-compose-cache')(app, lando));

  // remove tooling cache
  app.events.on('post-uninstall', async () => await require('./hooks/app-purge-tooling-cache')(app, lando));

  // process events
  if (!_.isEmpty(_.get(app, 'config.events', []))) {
    _.forEach(app.config.events, (cmds, event) => {
      app.events.on(event, 9999, async data => await require('./hooks/app-run-events')(app, lando, cmds, data, event));
    });
  }

  // LEGACY healthchecks
  if (_.get(lando, 'config.healthcheck', true) === 'legacy') {
    app.events.on('post-start', 2, async () => await require('./hooks/app-run-legacy-healthchecks')(app, lando));
  }

  // LEGACY URL Scanner urls
  if (_.get(lando, 'config.scanner', true) === 'legacy') {
    app.events.on('post-start', 10, async () => await require('./hooks/app-run-legacy-scanner')(app, lando));
  };

  // REturn defualts
  return {
    env: {
      LANDO_APP_PROJECT: app.project,
      LANDO_APP_NAME: app.name,
      LANDO_APP_ROOT: app.root,
      LANDO_APP_ROOT_BIND: app.root,
      LANDO_APP_COMMON_NAME: _.truncate(app.project, {length: 64}),
      LANDO_LOAD_KEYS: getKeys(_.get(app, 'config.keys')),
      BITNAMI_DEBUG: 'true',
    },
    labels: {
      'io.lando.src': app.configFiles.join(','),
      'io.lando.http-ports': '80,443',
    },
  };
};
