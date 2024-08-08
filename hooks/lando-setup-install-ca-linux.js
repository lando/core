'use strict';

const path = require('path');
const os = require('os');

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
      // throw error if not online
      if (!await require('is-online')()) throw new Error('Cannot detect connection to internet!');
      // throw if user is not an admin
      if (!await require('../utils/is-admin-user')()) {
        throw new Error([
          `User "${lando.config.username}" does not have permission to trust the CA!`,
          'Contact your system admin for permission and then rerun setup.',
        ].join(os.EOL));
      }

      return true;
    },
    task: async (ctx, task) => {
      try {
        task.title = 'Installing Lando Development Certificate Authority (CA)';

        // prompt for password if interactive and we dont have it
        if (ctx.password === undefined && lando.config.isInteractive) {
          ctx.password = await task.prompt({
            type: 'password',
            name: 'password',
            message: `Enter computer password for ${lando.config.username} to install the CA`,
            validate: async (input, state) => {
              const options = {debug, ignoreReturnCode: true, password: input};
              const response = await require('../utils/run-elevated')(['echo', 'hello there'], options);
              if (response.code !== 0) return response.stderr;
              return true;
            },
          });
        }

        // assemble
        const script = path.join(lando.config.userConfRoot, 'scripts', 'install-system-ca-linux.sh');
        const command = [script, '--ca', caCert];

        // // add optional args
        if (options.debug || options.verbose > 0 || lando.debuggy) command.push('--debug');

        // run
        const result = await require('../utils/run-elevated')(command, {debug, password: ctx.password});

        // finish up
        task.title = 'Installed Lando Development Certificate Authority (CA)';
        return result;
      } catch (error) {
        throw error;
      }
    },
  });
};
