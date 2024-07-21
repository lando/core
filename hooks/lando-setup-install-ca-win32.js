'use strict';

const path = require('path');

module.exports = async (lando, options) => {
  const debug = require('../utils/debug-shim')(lando.log);

  const {caCert} = lando.config;

  // skip the installation of the CA if set
  if (options.skipInstallCA) return;

  // install ca
  options.tasks.push({
    title: `Installing Lando Development CA`,
    id: 'install-ca',
    dependsOn: ['create-ca'],
    description: '@lando/install-ca',
    comments: {
      'NOT INSTALLED': 'Will install Lando Development Certificate Authority (CA) to system store',
    },
    hasRun: async () => {
      try {
        const fingerprint = require('../utils/get-fingerprint')(caCert);
        debug('computed sha1 fingerprint %o for ca %o', fingerprint, caCert);
        return require('../utils/get-system-cas')().includes(fingerprint);
      } catch (error) {
        debug('error determining fingerprint of %o: %o %o', caCert, error.message, error.stack);
        return false;
      }
    },
    canRun: async () => {
      return true;
    },
    task: async (ctx, task) => {
      try {
        task.title = 'Installing Lando Development Certificate Authority (CA)';

        // assemble
        const script = path.join(lando.config.userConfRoot, 'scripts', 'install-system-ca-win32.ps1');
        const args = ['-CA', caCert];

        // add optional args
        if (options.debug || options.verbose > 0 || lando.debuggy) args.push('-Debug');
        if (!lando.config.isInteractive) args.push('-NonInteractive');

        // run
        const result = await require('../utils/run-powershell-script')(script, args, {debug});

        // finish up
        task.title = 'Installed Lando Development Certificate Authority (CA)';
        return result;
      } catch (error) {
        throw error;
      }
    },
  });
};
