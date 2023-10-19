'use strict';

module.exports = lando => ({
  command: 'stop',
  describe: 'Stops your app',
  run: async options => {
    // Try to get our app
    const app = lando.getApp(options._app.root);
    // Stop it if we can!
    if (app) {
      console.log(lando.cli.makeArt('appStop', {name: app.name, phase: 'pre'}));
      await app.stop();
      console.log(' ');
      console.log(lando.cli.makeArt('appStop', {name: app.name, phase: 'post'}));
    }
  },
});
