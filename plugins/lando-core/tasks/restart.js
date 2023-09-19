'use strict';

const _ = require('lodash');
const utils = require('./../lib/utils');

module.exports = lando => {
  return {
    command: 'restart',
    describe: 'Restarts your app',
    run: async options => {
      // Try to get our app
      const app = lando.getApp(options._app.root);

      // Restart it if we can!
      if (app) {
        console.log(lando.cli.makeArt('appRestart', {name: app.name, phase: 'pre'}));

        // Normal bootup
        try {
          await app.restart();

          // @TODO: healthcheck?

          // print table and determine scanner func
          const legacyScanner = _.get(lando, 'config.scanner', true) === 'legacy';
          const type = !_.isEmpty(app.warnings) ? 'report' : 'post';
          const phase = legacyScanner ? `${type}_legacy` : type;
          console.log(lando.cli.makeArt('appStart', {name: app.name, phase, warnings: app.warnings}));
          console.log(lando.cli.formatData(utils.startTable(app, {legacyScanner}), {format: 'table'}, {border: false}));

          // if we are not in legacy mode we have more work to do
          // @TODO: only tun if we have post start scan tasks?
          if (!legacyScanner) {
            // if verbose or debug mode is on then use the verbose renderer
            const renderer = options.debug || options.verbose > 0 ? 'verbose' : lando.cli.getRenderer();
            // run the listr
            await lando.cli.processTasks(lando.cli.listrTasks['post-start-scan'], renderer);
          }

        // print error message and reject
        } catch (error) {
          app.log.error(error.message, error);
          console.log(lando.cli.makeArt('appStart', {phase: 'error'}));
          return lando.Promise.reject(error);

        // plenty of gapp
        } finally {
          console.log(' ');
        }
      }
    },
  };
};
