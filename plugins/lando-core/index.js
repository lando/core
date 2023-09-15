'use strict';

// Modules
const _ = require('lodash');
const axios = require('axios');
const env = require('./../../lib/env');
const ip = require('ip');
const fs = require('fs');
const mkdirp = require('mkdirp');
const path = require('path');

// Default env values
const defaults = {
  config: {
    appEnv: {
      COLUMNS: 256,
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
const uc = (uid, gid, username) => ({
  config: {
    appEnv: {
      LANDO_HOST_UID: uid,
      LANDO_HOST_GID: gid,
      LANDO_HOST_USER: username,
    },
    gid,
    uid,
    username,
  },
});

/*
 * Helper to get docker compose v2 download url
 */
const getComposeDownloadUrl = (version = '2.21.0') => {
  const mv = version.split('.')[0];
  const arch = process.arch === 'arm64' ? 'aarch64' : 'x86_64';
  const toggle = `${process.platform}-${mv}`;

  switch (toggle) {
    case 'darwin-2':
      return `https://github.com/docker/compose/releases/download/v${version}/docker-compose-darwin-${arch}`;
    case 'linux-2':
      return `https://github.com/docker/compose/releases/download/v${version}/docker-compose-linux-${arch}`;
    case 'win32-2':
      return `https://github.com/docker/compose/releases/download/v${version}/docker-compose-windows-${arch}.exe`;
    case 'darwin-1':
      return `https://github.com/docker/compose/releases/download/${version}/docker-compose-Darwin-x86_64`;
    case 'linux-1':
      return `https://github.com/docker/compose/releases/download/${version}/docker-compose-Linux-x86_64`;
    case 'win32-1':
      return `https://github.com/docker/compose/releases/download/${version}/docker-compose-Windows-x86_64.exe`;
  }
};

/*
 * Helper to get docker compose v2 download destination
 */
const getComposeDownloadDest = (base, version = '2.21.0') => {
  switch (process.platform) {
    case 'linux':
    case 'darwin':
      return path.join(base, `docker-compose-v${version}`);
    case 'win32':
      return path.join(base, `docker-compose-v${version}`);
  }
};

/*
 * Helper to get ca run object
 */
const getCaRunner = (project, files) => ({
  id: [project, 'ca', '1'].join('_'),
  compose: files,
  project: project,
  cmd: '/setup-ca.sh',
  opts: {
    mode: 'attach',
    services: ['ca'],
    autoRemove: true,
  },
});

module.exports = lando => {
  // Set some stuff and set seom stuff up
  const caDir = path.join(lando.config.userConfRoot, 'certs');
  const caDomain = lando.config.domain;
  const caCert = path.join(caDir, `${caDomain}.pem`);
  const caKey = path.join(caDir, `${caDomain}.key`);
  const caProject = `landocasetupkenobi38ahsoka${lando.config.instance}`;
  const sshDir = path.join(lando.config.home, '.ssh');
  const binDir = path.join(lando.config.userConfRoot, 'bin');

  // Ensure some dirs exist before we start
  _.forEach([binDir, caDir, sshDir], dir => mkdirp.sync(dir));

  // Ensure we download docker-compose if needed
  lando.events.on('pre-bootstrap-engine', 1, () => {
    // get stuff from config
    const {composeBin, composeVersion, userConfRoot} = lando.config;
    const dest = getComposeDownloadDest(path.join(userConfRoot, 'bin'), composeVersion);
    // if we dont have a composeBin or havent downloaded composeVersion yet
    if (!!!composeBin && typeof composeVersion === 'string' && !fs.existsSync(dest)) {
      // log
      lando.log.debug('could not detect docker-compose v%s!');
      lando.log.debug('downloading %s to %s...', getComposeDownloadUrl(composeVersion), dest);
      // download docker-compose
      return axios({method: 'get', url: getComposeDownloadUrl(composeVersion), responseType: 'stream'})
      // stream it into a file and reset the config
      .then(response => {
        const writer = fs.createWriteStream(dest);
        response.data.pipe(writer);
        // wait for the stream to finish
        return new Promise((resolve, reject) => {
          let error = null;
          writer.on('error', err => {
            error = err;
            writer.close();
            reject(err);
          });
          writer.on('close', () => {
            if (!error) resolve(true);
          });
        });
      })
      // success
      .then(() => {
        const {makeExecutable} = require('../../lib/utils');
        makeExecutable([path.basename(dest)], path.dirname(dest));
        lando.log.debug('docker-compose v%s downloaded to %s', composeVersion, dest);
      })
      // if download fails for whatever reason then log it and indicate
      .catch(error => {
        lando.log.debug('could not download docker-compose v%s: %s', composeVersion, error.message);
        lando.log.silly('%j', error);
        lando.log.debug('will attempt to use a system-installed version of docker-compose');
      });
    }
  });

  // at this point we should be able to set composeBin if it hasnt been set already
  lando.events.on('pre-bootstrap-engine', 2, () => {
    if (!!!lando.config.composeBin) lando.config.composeBin = env.getComposeExecutable(lando.config);
    lando.log.debug('using docker-compose %s', lando.config.composeBin);
  });

  // Make sure we have a host-exposed root ca if we don't already
  // NOTE: we don't run this on the caProject otherwise infinite loop happens!
  lando.events.on('pre-engine-start', 2, data => {
    if (!fs.existsSync(caCert) && data.project !== caProject) {
      const LandoCa = lando.factory.get('_casetup');
      const env = _.cloneDeep(lando.config.appEnv);
      const labels = _.cloneDeep(lando.config.appLabels);
      const caData = new LandoCa(lando.config.userConfRoot, env, labels);
      const caFiles = lando.utils.dumpComposeData(caData, caDir);
      lando.log.debug('setting up Lando Local CA at %s', caCert);
      return lando.engine.run(getCaRunner(caProject, caFiles));
    }
  });

  // Let's also make a copy of caCert with the standarized .crt ending for better linux compat
  // See: https://github.com/lando/lando/issues/1550
  lando.events.on('pre-engine-start', 3, data => {
    const caNormalizedCert = path.join(caDir, `${caDomain}.crt`);
    if (fs.existsSync(caCert) && !fs.existsSync(caNormalizedCert)) {
      // @NOTE: we need to use pre node 8.x-isms because pld roles with node 7.9 currently
      fs.writeFileSync(caNormalizedCert, fs.readFileSync(caCert));
    }
  });

  // Return some default things
  return _.merge({}, defaults, uc(lando.user.getUid(), lando.user.getGid(), lando.user.getUsername()), {config: {
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
