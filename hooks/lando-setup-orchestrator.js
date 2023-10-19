'use strict';

const _ = require('lodash');
const axios = require('axios');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {nanoid} = require('nanoid');

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

module.exports = async lando => {
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
      const {spawnSync} = require('child_process');
      require('../utils/make-executable')([path.basename(tmpDest)], path.dirname(tmpDest));
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
};
