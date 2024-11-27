'use strict';

const fs = require('fs');

module.exports = async (lando, options) => {
  const debug = require('../utils/debug-shim')(lando.log);

  const {caCert, caKey} = lando.config;

  // create CA
  options.tasks.push({
    title: 'Creating Lando Development CA',
    id: 'create-ca',
    description: '@lando/ca',
    comments: {
      'NOT INSTALLED': 'Will create Lando Development Certificate Authority (CA)',
    },
    hasRun: async () => {
      if ([caCert, caKey].some(file => !fs.existsSync(file))) return false;

      // check if the ca is valid and has a matching key
      if (!require('../utils/validate-ca')(caCert, caKey, {debug})) {
        fs.unlinkSync(caCert);
        fs.unlinkSync(caKey);
        return false;
      }

      // otherwise we are good
      return true;
    },
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

      task.title = 'Created Lando Development CA';
    },
  });
};
