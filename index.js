'use strict';

// Modules
const _ = require('lodash');
const fs = require('fs');
const ip = require('ip');
const path = require('path');

// Default env values
const defaults = {
  config: {
    appEnv: {
      LANDO: 'ON',
      LANDO_WEBROOT_USER: 'www-data',
      LANDO_WEBROOT_GROUP: 'www-data',
      TERM: 'xterm',
    },
    appLabels: {
      'io.lando.container': 'TRUE',
    },
  },
};

/*
 * Helper to get user conf
 */
const uc = () => ({
  config: {
    appEnv: {
      LANDO_HOST_UID: require('./utils/get-uid')(),
      LANDO_HOST_GID: require('./utils/get-gid')(),
      LANDO_HOST_USER: require('./utils/get-username')(),
    },
    gid: require('./utils/get-gid')(),
    uid: require('./utils/get-uid')(),
    username: require('./utils/get-username')(),
  },
});

module.exports = async lando => {
  // Set some stuff and set seom stuff up
  const caDir = path.join(lando.config.userConfRoot, 'certs');
  const sshDir = path.join(lando.config.home, '.ssh');
  const binDir = path.join(lando.config.userConfRoot, 'bin');

  // certs stuff
  // @TODO: should this end up elsewhere?
  const caDomain = lando.config.domain;
  const caCert = path.join(caDir, `${caDomain}.pem`);
  const caKey = path.join(caDir, `${caDomain}.key`);
  const caProject = `landocasetupkenobi38ahsoka${lando.config.instance}`;
  const certData = {caCert, caDir, caDomain, caKey, caProject};

  // Ensure some dirs exist before we start
  _.forEach([binDir, caDir, sshDir], dir => fs.mkdirSync(dir, {recursive: true}));

  // Ensure we munge plugin stuff together appropriately
  lando.events.once('pre-install-plugins', async options => await require('./hooks/lando-setup-common-plugins')(lando, options)); // eslint-disable-line max-len

  // Ensure we setup docker-compose if needed
  lando.events.once('pre-setup', async options => await require('./hooks/lando-setup-orchestrator')(lando, options)); // eslint-disable-line max-len

  // Ensure we setup docker if needed
  lando.events.once('pre-setup', async options => {
    switch (process.platform) {
      case 'darwin':
        return await require('./hooks/lando-setup-build-engine-darwin')(lando, options);
      case 'linux':
        return await require('./hooks/lando-setup-build-engine-linux')(lando, options);
      case 'win32':
        return await require('./hooks/lando-setup-build-engine-win32')(lando, options);
    }
  });

  // make sure Lando Specification 337 is available to all
  lando.events.on('post-bootstrap-app', async () => await require('./hooks/lando-add-l337-spec')(lando));

  // flush update cache if it needs to be
  lando.events.on('ready', async () => await require('./hooks/lando-flush-updates-cache')(lando));

  // this is a gross hack we need to do to reset the engine because the lando 3 runtime had no idea
  lando.events.on('almost-ready', 1, async () => await require('./hooks/lando-reset-orchestrator')(lando));

  // run engine compat checks
  lando.events.on('almost-ready', 2, async () => await require('./hooks/lando-get-compat')(lando));

  // throw error if engine/orchestrator is not available
  lando.events.once('pre-engine-autostart', async () => await require('./hooks/lando-dep-check')(lando));

  // autostart docker if we need to
  lando.events.once('engine-autostart', async () => await require('./hooks/lando-autostart-engine')(lando));

  // Make sure we have a host-exposed root ca if we don't already
  // NOTE: we don't run this on the caProject otherwise infinite loop happens!
  lando.events.on('pre-engine-start', 2, async data => await require('./hooks/lando-setup-ca')(lando, data, certData));

  // Let's also make a copy of caCert with the standarized .crt ending for better linux compat
  // See: https://github.com/lando/lando/issues/1550
  lando.events.on('pre-engine-start', 3, async () => await require('./hooks/lando-copy-ca')(lando, certData));

  // Return some default things
  return _.merge({}, defaults, uc(), {config: {
    appEnv: {
      LANDO_CA_CERT: '/lando/certs/' + path.basename(caCert),
      LANDO_CA_KEY: '/lando/certs/' + path.basename(caKey),
      LANDO_CONFIG_DIR: lando.config.userConfRoot,
      LANDO_DOMAIN: lando.config.domain,
      LANDO_HOST_HOME: lando.config.home,
      LANDO_HOST_OS: lando.config.os.platform,
      LANDO_HOST_IP: (process.platform === 'linux') ? ip.address() : 'host.docker.internal',
      LANDO_LEIA: _.toInteger(lando.config.leia),
      LANDO_MOUNT: '/app',
    },
    appLabels: {
      'io.lando.id': lando.config.instance,
    },
    bindAddress: '127.0.0.1',
    caCert,
    caDomain,
    caKey,
    caProject,
    maxKeyWarning: 10,
  }});
};
