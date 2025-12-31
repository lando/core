'use strict';

// Modules
const _ = require('lodash');
const fs = require('fs');
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
    proxy: 'ON',
    proxyName: 'landoproxyhyperion5000gandalfedition',
    proxyCache: 'proxyCache',
    proxyCommand: [
      '/entrypoint.sh',
      '--log.level=DEBUG',
      '--api.insecure=true',
      '--api.dashboard=true',
      '--providers.docker=true',
      '--entrypoints.https.address=:443',
      '--entrypoints.http.address=:80',
      '--providers.docker.exposedbydefault=false',
      '--providers.file.directory=/proxy_config',
      '--providers.file.watch=true',
    ],
    proxyCustom: {},
    proxyDefaultCert: '/certs/cert.crt',
    proxyDefaultKey: '/certs/cert.key',
    proxyHttpPort: '80',
    proxyHttpsPort: '443',
    proxyHttpFallbacks: ['8000', '8080', '8888', '8008'],
    proxyHttpsFallbacks: ['444', '4433', '4444', '4443'],
    proxyPassThru: true,
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
  // set some stuff and set seom stuff up
  const caDir = path.join(lando.config.userConfRoot, 'certs');
  const sshDir = path.join(lando.config.home, '.ssh');
  const binDir = path.join(lando.config.userConfRoot, 'bin');

  // certs stuff
  // @TODO: should this end up elsewhere?
  const caName = `${_.capitalize(lando.config.product)}CA`;
  const caDomain = lando.config.domain;
  const caCert = path.join(caDir, `${caName}.crt`);
  const caKey = path.join(caDir, `${caName}.key`);

  const platform = lando.config.os.landoPlatform;

  // ensure some dirs exist before we start
  _.forEach([binDir, caDir, sshDir], dir => fs.mkdirSync(dir, {recursive: true}));

  // ensure we munge plugin stuff together appropriately
  lando.events.once('pre-install-plugins', async options => await require('./hooks/lando-setup-common-plugins')(lando, options));

  // move v3 scripts directories as needed
  lando.events.on('post-install-plugins', 0, async () => await require('./hooks/lando-copy-v3-scripts')(lando));

  // ensure we setup docker if needed
  lando.events.once('pre-setup', async options => await require(`./hooks/lando-setup-build-engine-${platform}`)(lando, options));

  // do some sepecial handling on wsl
  lando.events.once('pre-setup', async options => await require('./hooks/lando-setup-create-ca-wsl')(lando, options));
  // ensure we create ca
  lando.events.once('pre-setup', async options => await require('./hooks/lando-setup-create-ca')(lando, options));

  // and install ca
  lando.events.once('pre-setup', async options => await require(`./hooks/lando-setup-install-ca-${platform}`)(lando, options));

  // ensure we setup docker-compose if needed
  lando.events.once('pre-setup', async options => await require('./hooks/lando-setup-orchestrator')(lando, options));

  // ensure we setup landonet
  lando.events.once('pre-setup', async options => await require('./hooks/lando-setup-landonet')(lando, options));

  // set proxy config
  lando.events.on('post-bootstrap-config', async () => await require('./hooks/lando-set-proxy-config')(lando));

  // make sure Lando Specification 337 is available to all
  lando.events.on('post-bootstrap-app', async () => await require('./hooks/lando-add-l337-spec')(lando));

  // flush update cache if it needs to be
  lando.events.on('ready', async () => await require('./hooks/lando-flush-updates-cache')(lando));

  // merge in needed legacy init stuff
  lando.events.on('cli-init-answers', async () => await require('./hooks/lando-load-legacy-inits')(lando));

  // this is a gross hack we need to do to reset the engine because the lando 3 runtime has no idea
  lando.events.on('almost-ready', 1, async () => await require('./hooks/lando-reset-orchestrator')(lando));
  lando.events.on('post-setup', 1, async () => await require('./hooks/lando-reset-orchestrator')(lando));

  // run engine compat checks
  lando.events.on('almost-ready', 2, async () => await require('./hooks/lando-get-compat')(lando));

  // throw error if engine is not available
  lando.events.once('pre-engine-autostart', async () => await require('./hooks/lando-setup-check')(lando));

  // autostart docker if we need to
  lando.events.once('engine-autostart', async () => await require('./hooks/lando-autostart-engine')(lando));

  // clean networks
  lando.events.on('pre-engine-start', 1, async () => await require('./hooks/lando-clean-networks')(lando));

  // regen task cache
  lando.events.on('before-end', 9999, async () => await require('./hooks/lando-generate-tasks-cache')(lando));

  lando.events.on('post-bootstrap-config', async () => await require('./hooks/plugin-auth-from-npmrc')(lando));

  // return some default things
  return _.merge({}, defaults, uc(), {config: {
    appEnv: {
      LANDO_CA_CERT: '/lando/certs/' + path.basename(caCert),
      LANDO_CA_KEY: '/lando/certs/' + path.basename(caKey),
      LANDO_CONFIG_DIR: lando.config.userConfRoot,
      LANDO_DOMAIN: lando.config.domain,
      LANDO_HOST_HOME: lando.config.home,
      LANDO_HOST_OS: lando.config.os.platform,
      LANDO_HOST_IP: 'host.lando.internal',
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
    maxKeyWarning: 10,
    networkBridge: 'lando_bridge_network',
    networkLimit: 32,
    proxyBindAddress: _.get(lando, 'config.bindAddress', '127.0.0.1'),
    proxyDomain: lando.config.domain,
    proxyIp: _.get(lando.config, 'engineConfig.host', '127.0.0.1'),
  }});
};
