'use strict';

module.exports = lando => {
  return {
    command: 'poweroff',
    describe: 'Spins down all lando related containers',
    usage: '$0 poweroff',
    level: 'engine',
    run: async () => {
      console.log(lando.cli.makeArt('poweroff', {phase: 'pre'}));
      // Get all our containers
      const containers = await lando.engine.list();

      // SHUT IT ALL DOWN
      if (containers.length > 0) {
        const tasks = containers.map(container => ({
          title: `Container ${container.name}`,
          task: async () => await lando.engine.stop({id: container.id}),
        }));

        await lando.runTasks(tasks, {
          renderer: 'dc2',
          rendererOptions: {
            header: 'Stopping',
            states: {
              COMPLETED: 'Stopped',
              STARTED: 'Stopping',
            },
          },
        });
      }

      // Emit poweroff
      await lando.events.emit('poweroff');
      // Finish up
      console.log(lando.cli.makeArt('poweroff', {phase: 'post'}));
    },
  };
};
