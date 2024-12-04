'use strict';

// if we at engine level bootsrap level or above then autostart the engine if we need to
// @NOTE: for some reason _SOMETIMES_ autostarting before lando start produces an error but we are just
// not going to address it in favor of lando 4 stuff
module.exports = async lando => {
  if (lando._bootstrapLevel >= 3 && await lando.engine.daemon.isUp() === false) {
    const debug = require('../utils/debug-shim')(lando.log);
    const tasks = [{
      title: 'It seems Docker is not running, trying to start it up...',
      retry: {
        tries: 5,
        delay: 1000,
      },
      task: async ctx => {
        try {
          await lando.engine.daemon.up(false);
          await lando.shell.sh([`"${lando.engine.daemon.docker}"`, 'network', 'ls']);
        } catch (error) {
          ctx.errors.push(error);
          debug('%j', error);
          throw new Error('Could not automatically start Docker. Please manually start it to continue.');
        }
      },
    }];
    await lando.runTasks(tasks, {
      listrOptions: {exitOnError: true},
      rendererOptions: {
        pausedTimer: {condition: false},
      },
    });
  }
};
