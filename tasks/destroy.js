'use strict';

module.exports = lando => {
  return {
    command: 'destroy',
    describe: 'Destroys your app and all its data',
    usage: '$0 destroy [--service <service>...] [--yes]',
    examples: [
      '$0 destroy --service database --yes',
    ],
    options: {
      service: {
        describe: 'Destroys only the specified services',
        alias: ['s'],
        array: true,
      },
      yes: lando.cli.confirm('Are you sure you want to DESTROY?'),
    },
    run: async options => {
      // Stop destroy if user decides its a nogo
      if (!options.yes) {
        console.log(lando.cli.makeArt('appDestroy', {phase: 'abort'}));
        return;
      }
      // Try to get our app
      const app = lando.getApp(options._app.root);
      // Destroy the app
      if (app) {
        // If user has given us options then set those
        if (options.service?.length) {
          app.opts = Object.assign({}, app.opts, {services: options.service});
        }

        console.log(lando.cli.makeArt('appDestroy', {name: app.name, phase: 'pre'}));
        await app.destroy();
        console.log(lando.cli.makeArt('appDestroy', {name: app.name, phase: 'post'}));
      }
    },
  };
};
