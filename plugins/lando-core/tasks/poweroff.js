'use strict';

const _ = require('lodash');

module.exports = lando => {
  return {
    command: 'poweroff',
    level: 'engine',
    describe: 'Spins down all lando related containers',
    run: async () => {
      console.log(lando.cli.makeArt('poweroff', {phase: 'pre'}));
      // Get all our containers
      const containers = await lando.engine.list();

      // SHUT IT ALL DOWN
      if (containers.length > 0) {
        const mtl = _.max(containers.map(containers => containers.name.length));
        const getSpacer = size => _.range(size).map(size => '').join(' ');

        console.log(lando.cli.chalk.blue(`[+] Stopping ${containers.length}/${containers.length}`));
        const tasks = containers.map(container => ({
          title: `Container ${container.name}${getSpacer(mtl - container.name.length + 3)}`,
          task: async (ctx, task) => {
            const prefix = `Container ${container.name}${getSpacer(mtl - container.name.length + 3)}`;
            task.title = `${prefix}${lando.cli.chalk.green('Stopping')}`;
            await lando.engine.stop({id: container.id});
            task.title = `${prefix}${lando.cli.chalk.green('Stopped')}`;
          },
        }));

        await lando.cli.runTaskList(tasks, {
          debugRendererOptions: {log: lando.log.info},
          renderer: 'lando',
          rendererOptions: {level: 0.5},
        });
      }

      // Emit poweroff
      await lando.events.emit('poweroff');
      // Finish up
      console.log(lando.cli.makeArt('poweroff', {phase: 'post'}));
    },
  };
};
