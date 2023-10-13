'use strict';

// Modules
const _ = require('lodash');

// Helper to set the LANDO_LOAD_KEYS var
const getKeys = (keys = true) => {
  if (_.isArray(keys)) return keys.join(' ');
  return keys.toString();
};

module.exports = async (app, lando) => {
  // Build step locl files
  app.preLockfile = `${app.name}.build.lock`;
  app.postLockfile = `${app.name}.post-build.lock`;

  // load in and parse v3 services
  app.events.on('pre-init', async () => await require('./hooks/app-add-v3-services')(app, lando));

  // run v3 build steps
  app.events.on('post-init', async () => await require('./hooks/app-run-v3-build-steps')(app, lando));

  // Add localhost info to our containers if they are up
  app.events.on('post-init', async () => await require('./hooks/app-find-localhosts')(app, lando));

  // refresh all out v3 certs
  app.events.on('post-init', async () => await require('./hooks/app-refresh-v3-certs')(app, lando));

  // Run a secondary user perm sweep on services that cannot run as root eg mysql
  app.events.on('post-init', async () => await require('./hooks/app-run-v3-secondary-sweep')(app, lando));

  // Assess our key situation so we can warn users who may have too many
  app.events.on('post-init', async () => await require('./hooks/app-check-ssh-keys')(app, lando));

  // Collect info so we can inject LANDO_INFO
  // @NOTE: this is not currently the full lando info because a lot of it requires the app to be on
  app.events.on('post-init', 10, async () => await require('./hooks/app-set-lando-info')(app, lando));

  // Analyze an apps compose files so we can set the default bind addres correctly
  // @TODO: i feel like there has to be a better way to do this than this mega loop right?
  app.events.on('post-init', 9999, async () => await require('./hooks/app-set-bind-address')(app, lando));

  // Discover portforward true info
  app.events.on('ready', async () => await require('./hooks/app-set-portforwards')(app, lando));

  // Otherwise set on rebuilds
  // NOTE: We set this pre-rebuild because post-rebuild runs after post-start because you would need to
  // do two rebuilds to remove the warning since appWarning is already set by the time we get here.
  // Running pre-rebuild ensures the warning goes away but concedes a possible warning tradeoff between
  // this and a build step failure
  app.events.on('pre-rebuild', async () => await require('./hooks/app-update-built-against')(app, lando));

  // Determine pullable and locally built images
  app.events.on('pre-rebuild', async () => await require('./hooks/app-set-pullables')(app, lando));

  // If the app already is installed but we can't determine the builtAgainst, then set it to something bogus
  app.events.on('pre-start', async () => await require('./hooks/app-update-built-against-pre')(app, lando));

  // If we don't have a builtAgainst already then we must be spinning up for the first time and its safe to set this
  app.events.on('post-start', async () => await require('./hooks/app-update-built-against-post')(app, lando));

  // Add localhost info to our containers if they are up
  app.events.on('post-start', async () => await require('./hooks/app-find-localhosts')(app, lando));

  // Check for docker compat warnings and surface them nicely as well
  app.events.on('post-start', async () => await require('./hooks/app-check-docker-compat')(app, lando));

  // Reset app info on a stop, this helps prevent wrong/duplicate information being reported on a restart
  app.events.on('post-stop', () => lando.utils.getInfoDefaults(app));

  // Remove meta cache on destroy
  app.events.on('post-destroy', async () => await require('./hooks/app-purge-metadata-cache')(app, lando));

  // remove v3 build locks
  app.events.on('post-uninstall', async () => await require('./hooks/app-purge-v3-build-locks')(app, lando));

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
