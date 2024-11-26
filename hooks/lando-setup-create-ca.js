'use strict';

const fs = require('fs');
const getWinEnvar = require('../utils/get-win32-envvar-from-wsl');
const path = require('path');
const wslpath = require('../utils/winpath-2-wslpath');

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

        // otherwise we are good
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

  // on wsl we also want to copy the ca to the windows side
  if (lando.config.os.landoPlatform === 'wsl') {
    options.tasks.push({
      title: `Copy Lando Development CA`,
      id: 'install-ca',
      dependsOn: ['create-ca'],
      description: '@lando/copy-ca',
      comments: {
        'NOT INSTALLED': 'Will copy Lando Development Certificate Authority (CA) to Windows',
      },
      hasRun: async () => {
        const home = await getWinEnvar('USERPROFILE');
        const certs = await wslpath(path.join(home, '.lando', 'certs'));

        const wcaCert = path.join(certs, path.basename(caCert));
        const wcaKey = path.join(certs, path.basename(caKey));

        // here is the easy cehck
        if ([caCert, caKey, wcaCert, wcaKey].some(file => !fs.existsSync(file))) return false;

        // if we get here we need to check if the file are the same
        const certCompare = Buffer.compare(fs.readFileSync(caCert), fs.readFileSync(wcaCert));
        const keyCompare = Buffer.compare(fs.readFileSync(caKey), fs.readFileSync(wcaKey));
        return certCompare === 0 && keyCompare == 0;
      },
      task: async (ctx, task) => {
        try {
          task.title = 'Copying Lando Development Certificate Authority (CA) to Windows';

          // wsl windows home
          const home = await getWinEnvar('USERPROFILE');
          const certs = await wslpath(path.join(home, '.lando', 'certs'));

          // windows certs
          const wcaCert = path.join(certs, path.basename(caCert));
          const wcaKey = path.join(certs, path.basename(caKey));
          debug('copying cert from %o to %o', caCert, wcaCert);
          debug('copying key from %o to %o', caKey, wcaKey);

          // copyops
          fs.copyFileSync(caCert, wcaCert);
          fs.copyFileSync(caKey, wcaKey);

          // Update task title on successful installation
          task.title = 'Copied Lando Development Certificate Authority (CA) to Windows';
        } catch (error) {
          throw error;
        }
      },
    });
  }
};
