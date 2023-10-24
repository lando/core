'use strict';

// if we at engine level bootsrap level or above then autostart the engine if we need to
// @NOTE: for some reason _SOMETIMES_ autostarting before lando start produces an error but we are just
// not going to address it in favor of lando 4 stuff
module.exports = async lando => {
  if (lando._bootstrapLevel >= 3 && await lando.engine.daemon.isUp() === false) {
    const tasks = [{
      title: 'It seems Docker is not running, trying to start it up...',
      retry: 10,
      delay: 1000,
      task: async (ctx, task) => {
        try {
          await lando.engine.daemon.up(false);
          await lando.shell.sh([`"${lando.engine.daemon.docker}"`, 'network', 'ls']);
        } catch (error) {
          ctx.errors.push(error);
          throw error;
        }
      },
    }];
    await lando.runTasks(tasks, {
      ctx: {errors: []},
      listrOptions: {exitOnError: true},
    });
  }
};
