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
          // determine legacy settings
          const legacyScanner = _.get(lando, 'config.scanner', true) === 'legacy';
          // get scanner stuff
          const type = !_.isEmpty(app.warnings) ? 'report' : 'post';
          const phase = legacyScanner ? `${type}_legacy` : type;
          const scans = _.find(app.checks, {type: 'url-scan-listr2'});

          // print post start table
          console.log(lando.cli.makeArt('appStart', {name: app.name, phase, warnings: app.warnings}));
          console.log(lando.cli.formatData(utils.startTable(app, {legacyScanner}), {format: 'table'}, {border: false}));

          // if we are not in legacy scanner mode then run the scans
          if (!legacyScanner && scans) await scans.test(...scans.args);

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
