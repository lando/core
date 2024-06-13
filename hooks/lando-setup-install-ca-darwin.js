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
      'NOT INSTALLED': 'Will install Lando Development Certificate Authority (CA) to relevant stores',
    },
    hasRun: async () => {
      // get CA SHA1 fingerprint
      const fingerprint = require('../utils/get-fingerprint')(caCert);
      debug('computed sha1 fingerprint %o for ca %o', fingerprint, caCert);

      // compute
      return require('../utils/get-system-cas')().includes(fingerprint);
    },
    canRun: async () => {
      if (!await require('../utils/is-admin-user')()) {
        throw new Error([
          `User "${os.userInfo().username}" does not have permission to install the Lando Development Certificate Authority (CA)!`, // eslint-disable-line
          'Contact your system admin for permission and then rerun setup.',
        ].join(os.EOL));
      }

      return true;
    },
    task: async (ctx, task) => {
      try {
        task.title = 'Installing Lando Development Certificate Authority (CA)';

        // assemble
        const fingerprint = require('../utils/get-fingerprint')(caCert);
        const script = path.join(lando.config.userConfRoot, 'scripts', 'install-system-ca-macos.sh');
        const args = ['--ca', caCert, '--fingerprint', fingerprint];

        // add optional args
        if (options.debug || options.verbose > 0 || lando.debuggy) args.push('--debug');
        if (!lando.config.isInteractive) args.push('--non-interactive');

        // run
        const result = await require('../utils/run-command')(script, args, {debug});

        // finish up
        task.title = 'Installed Lando Development Certificate Authority (CA)';
        return result;
      } catch (error) {
        throw error;
      }
    },
  });
};
