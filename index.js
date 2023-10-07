'use strict';

// Modules
const _ = require('lodash');
const axios = require('axios');
const ip = require('ip');
const fs = require('fs');
const mkdirp = require('mkdirp');
const os = require('os');
const path = require('path');

const {nanoid} = require('nanoid');

const env = require('./lib/env');

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
  const mv = version.split('.')[0] > 1 ? '2' : '1';
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
      return path.join(base, `docker-compose-v${version}.exe`);
  }
};

/*
 * Helper to get ca run object
 */
const getCaRunner = (project, files, separator = '_') => ({
  id: [project, 'ca', '1'].join(separator),
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
    const {orchestratorBin, orchestratorVersion, userConfRoot} = lando.config;
    const dest = getComposeDownloadDest(path.join(userConfRoot, 'bin'), orchestratorVersion);
    // if we dont have a orchestratorBin or havent downloaded orchestratorVersion yet
    if (!!!orchestratorBin && typeof orchestratorVersion === 'string' && !fs.existsSync(dest)) {
      lando.log.debug('could not detect docker-compose v%s!', orchestratorVersion);
      let tmpDest = path.join(os.tmpdir(), nanoid());
      tmpDest = process.platform === 'win32' ? `${tmpDest}.exe` : tmpDest;
      // download docker-compose
      return axios({method: 'get', url: getComposeDownloadUrl(orchestratorVersion), responseType: 'stream'})
      // stream it into a file and reset the config
      .then(response => {
        lando.log.debug('downloading %s to %s...', getComposeDownloadUrl(orchestratorVersion), dest);
        const filesize = _.get(response, 'headers.content-length', 60000000);
        const writer = fs.createWriteStream(tmpDest);
        const v = orchestratorVersion;
        let counter = 0;
        response.data.pipe(writer);
        response.data.on('data', () => {
          // only update a reasonanle amount of bytes
          if (writer.bytesWritten / 2500000 > counter) {
            const completion = Math.round((writer.bytesWritten / filesize) * 100);
            if (process.stdout.isTTY) {
              process.stdout.write(`Could not detect docker-compose v${v}! Downloading it... (${completion}%)`);
              process.stdout.cursorTo(0);
            } else {
              lando.log.debug(`downloading %s to %s... (%s%)`, getComposeDownloadUrl(v), dest, completion);
            }
            counter++;
          }
        });

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
      // download success, trust but verify
      .then(async () => {
        const {makeExecutable} = require('./lib/utils');
        const {spawnSync} = require('child_process');
        makeExecutable([path.basename(tmpDest)], path.dirname(tmpDest));
        // see if the thing we downloaded is good
        const {status, stdout, stderr} = spawnSync(tmpDest, ['--version']);
        if (status === 0) {
          lando.log.debug('%s returned %s', tmpDest, _.trim(stdout.toString()));
          fs.copyFileSync(tmpDest, dest);
          lando.log.debug('docker-compose v%s downloaded to %s', orchestratorVersion, dest);
        // something aint right bob
        } else {
          lando.log.debug('verify docker-compose v%s failed, error: ', orchestratorVersion, _.trim(stderr.toString()));
        }
      })

      // if download fails for whatever reason then log it and indicate
      .catch(error => {
        lando.log.debug('could not download docker-compose v%s: %s', orchestratorVersion, error.message);
        lando.log.silly('%j', error);
      })

      // do a final check to log our sitaution
      .finally(() => {
        if (fs.existsSync(dest)) {
          lando.log.debug('using docker-compose %s located at %s', orchestratorVersion, dest);
        } else {
          lando.log.debug(
            'docker-compose setup failed! will attempt to use a system-installed version of docker-compose.',
          );
        }
      });
    }
  });

  // at this point we should be able to set orchestratorBin if it hasnt been set already
  lando.events.on('pre-bootstrap-engine', 2, () => {
    if (!!!lando.config.orchestratorBin) lando.config.orchestratorBin = env.getComposeExecutable(lando.config);
    lando.log.debug('using docker-compose %s', lando.config.orchestratorBin);
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
      return lando.engine.run(getCaRunner(caProject, caFiles, lando.config.orchestratorSeparator));
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
