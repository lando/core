'use strict';

// if we at engine level bootsrap level or above then autostart the engine if we need to
// @NOTE: for some reason _SOMETIMES_ autostarting before lando start produces an error but we are just
// not going to address it in favor of lando 4 stuff
module.exports = async lando => {
  if (lando._bootstrapLevel >= 3 && await lando.engine.daemon.isUp() === false) {
    const debug = require('../utils/debug-shim')(lando.log);
    const tasks = [{
      title: 'It seems Docker is not running, trying to start it up...',
      retry: 25,
      delay: 1000,
      task: async (ctx, task) => {
        // prompt for password if interactive and we dont have it
        if (process.platform === 'linux' && lando.config.isInteractive) {
          ctx.password = await task.prompt({
            type: 'password',
            name: 'password',
            message: `Enter computer password for ${lando.config.username} to start docker`,
            validate: async (input, state) => {
              const options = {debug, ignoreReturnCode: true, password: input};
              const response = await require('../utils/run-elevated')(['echo', 'hello there'], options);
              if (response.code !== 0) return response.stderr;
              return true;
            },
          });
        }

        try {
          await lando.engine.daemon.up(false, ctx.password);
          await lando.shell.sh([`"${lando.engine.daemon.docker}"`, 'network', 'ls']);
        } catch (error) {
          ctx.errors.push(error);
          throw error;
        }
      },
    }];
    await lando.runTasks(tasks, {listrOptions: {exitOnError: true}});
  }
};
