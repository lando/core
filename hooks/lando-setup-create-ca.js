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
      const forge = require('node-forge');
      const read = require('../utils/read-file');

      if ([caCert, caKey].some(file => !fs.existsSync(file))) return false;

      // check if the ca is valid and has a matching key
      try {
        const ca = forge.pki.certificateFromPem(read(caCert));
        const key = forge.pki.privateKeyFromPem(read(caKey));

        // verify the signature using the public key in the CA certificate
        const md = forge.md.sha256.create();
        md.update('taanab', 'utf8');
        const signature = key.sign(md);

        // if they dont match then throw
        if (!ca.publicKey.verify(md.digest().bytes(), signature)) {
          throw new Error('CA and its private key do not match');
        }

        // @TODO: throw error if CA has expired?

        return true;
      } catch (error) {
        debug('Something is wrong with the CA %o %o', error.message, error.stack);
        [caCert, caKey].some(file => !fs.unlinkSync(file));
        return false;
      }
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
