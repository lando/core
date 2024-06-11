'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

/*
 * Helper to get mkcert download url
 */
const getMkCertDownloadUrl = (version = '1.4.4') => {
  const arch = process.arch === 'arm64' ? 'arm64' : 'amd64';
  switch (process.platform) {
    case 'darwin':
      return `https://github.com/FiloSottile/mkcert/releases/download/v${version}/mkcert-v${version}-darwin-${arch}`;
    case 'linux':
      return `https://github.com/FiloSottile/mkcert/releases/download/v${version}/mkcert-v${version}-linux-${arch}`;
    case 'win32':
      return `https://github.com/FiloSottile/mkcert/releases/download/v${version}/mkcert-v${version}-windows-${arch}.exe`; // eslint-disable-line
  }
};

/*
 * Helper to get mkcert download destination
 */
const getMkCertDownloadDest = (base, version = '1.4.4') => {
  switch (process.platform) {
    case 'linux':
    case 'darwin':
      return path.join(base, `mkcert-v${version}`);
    case 'win32':
      return path.join(base, `mkcert-v${version}.exe`);
  }
};

module.exports = async (lando, options) => {
  const debug = require('../utils/debug-shim')(lando.log);
  const {color} = require('listr2');

  const {caCert, caKey} = lando.config;

  // create CA
  options.tasks.push({
    title: `Creating Lando Development CA`,
    id: 'create-ca',
    description: '@lando/create-ca',
    comments: {
      'NOT INSTALLED': 'Will create Lando Development Certificate Authority (CA)',
    },
    hasRun: async () => [caCert, caKey].every(file => fs.existsSync(file)),
    task: async (ctx, task) => {
      const write = require('../utils/write-file');
      const {createCA} = require('mkcert');

      // generate the CA and KEY
      const {cert, key} = await createCA({
        organization: 'Lando Development CA',
        countryCode: 'US',
        state: 'California',
        locality: 'Oakland',
        validity: 8675,
      });

      // write the cert and key
      write(caCert, cert);
      write(caKey, key);
    },
  });

  // get stuff from config/opts
  const {mkcert} = options;
  const dest = getMkCertDownloadDest(path.join(lando.config.userConfRoot, 'bin'), mkcert);
  const url = getMkCertDownloadUrl(mkcert);

  // skip the installation of the CA if set
  if (options.skipInstallCA) return;

  // download mkcert
  options.tasks.push({
    title: `Downloading mkcert`,
    id: 'install-ca',
    dependsOn: ['create-ca'],
    description: '@lando/install-ca',
    version: `mkcert v${mkcert}`,
    hasRun: async () => {
      return !!dest && typeof mkcert === 'string' && fs.existsSync(dest);
    },
    canRun: async () => {
      const online = await require('is-online')();
      // throw error if not online
      if (!online) throw new Error('Cannot detect connection to internet!');
      if (!await require('../utils/is-admin-user')()) {
        throw new Error([
          `User "${lando.config.username}" does not have permission to install the Lando Certificate Authority (CA)!`,
          'Contact your system admin for permission and then rerun setup.',
        ].join(os.EOL));
      }
      return true;
    },
    task: async (ctx, task) => new Promise((resolve, reject) => {
      const download = require('../utils/download-x')(url, {debug, dest, test: ['-version']});

      // prompt for password if interactive and we dont have it
      // if (ctx.password === undefined && lando.config.isInteractive) {
      //   ctx.password = await task.prompt({
      //     type: 'password',
      //     name: 'password',
      //     message: `Enter computer password for ${lando.config.usernam} to install Lando Certificate Authority (CA)`,
      //     validate: async (input, state) => {
      //       const options = {debug, ignoreReturnCode: true, password: input};
      //       const response = await require('../utils/run-elevated')(['echo', 'hello there'], options);
      //       if (response.code !== 0) return response.stderr;
      //       return true;
      //     },
      //   });
      // }

      // success
      download.on('done', async data => {
        task.title = `Installed mkcert to ${dest}`;
        resolve(data);
      });
      // handle errors
      download.on('error', error => {
        reject(error);
      });
      // update title to reflect download progress
      download.on('progress', progress => {
        task.title = `Downloading mkcert ${color.dim(`[${progress.percentage}%]`)}`;
      });
    }),
  });
};
