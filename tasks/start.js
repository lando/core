'use strict';

const _ = require('lodash');
const utils = require('./../lib/utils');

module.exports = lando => {
  return {
    command: 'start',
    describe: 'Starts your app',
    usage: '$0 start',
    run: async options => {
      // Try to get our app
      const app = lando.getApp(options._app.root);

      // Start it if we can!
      if (app) {
        console.log(lando.cli.makeArt('appStart', {name: app.name, phase: 'pre'}));

        // run setup if we need to
        await require('../hooks/lando-run-setup')(lando);

        // Normal bootup
        try {
          // then start up
          await app.start();
          // determine legacy settings
          const legacyScanner = _.get(lando, 'config.scanner', true) === 'legacy';
          // get scanner stuff
          const type = !_.isEmpty(app.messages) ? 'report' : 'post';
          const phase = legacyScanner ? `${type}_legacy` : type;
          const scans = _.find(app.checks, {type: 'url-scan-tasks'});

          // print post start table
          console.log(lando.cli.makeArt('appStart', {name: app.name, phase, messages: app.messages}));
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
