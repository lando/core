'use strict';

const fs = require('fs');

module.exports = async (lando, options) => {
  const debug = require('../utils/debug-shim')(lando.log);

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

  // skip the installation of the CA if set
  if (options.skipInstallCA) return;

  // download mkcert
  options.tasks.push({
    title: `Installing Lando Development CA`,
    id: 'install-ca',
    dependsOn: ['create-ca'],
    description: '@lando/install-ca',
    hasRun: async () => {
      debug('stuff');
      return false;
    },
    canRun: async () => {
      return true;
    },
    task: async (ctx, task) => {},
  });
};
