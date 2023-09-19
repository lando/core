'use strict';

const _ = require('lodash');
const utils = require('./../lib/utils');

module.exports = lando => {
  return {
    command: 'rebuild',
    describe: 'Rebuilds your app from scratch, preserving data',
    options: {
      service: {
        describe: 'Rebuild only the specified services',
        alias: ['s'],
        array: true,
      },
      yes: lando.cli.confirm('Are you sure you want to rebuild?'),
    },
    run: async options => {
      // abort rebuild if consent is not given
      if (!options.yes) {
        console.log(lando.cli.makeArt('appRebuild', {phase: 'abort'}));
        return;
      }

      // Try to get our app
      const app = lando.getApp(options._app.root);

      // Rebuild the app
      if (app) {
        // If user has given us options then set those
        if (!_.isEmpty(options.service)) {
          app.opts = _.merge({}, app.opts, {services: options.service});
        }

        // rebuild hero
        console.log(lando.cli.makeArt('appRebuild', {name: app.name, phase: 'pre'}));

        // Normal bootup
        await app.rebuild();

        // @TODO: healthcheck?

        // print table and determine scanner func
        const legacyScanner = _.get(lando, 'config.scanner', true) === 'legacy';
        const type = !_.isEmpty(app.warnings) ? 'report' : 'post';
        const phase = legacyScanner ? `${type}_legacy` : type;
        console.log(lando.cli.makeArt('appRebuild', {name: app.name, phase, warnings: app.warnings}));
        console.log(lando.cli.formatData(utils.startTable(app, {legacyScanner}), {format: 'table'}, {border: false}));

        if (!legacyScanner) {
          // if verbose or debug mode is on then use the verbose renderer
          const renderer = options.debug || options.verbose > 0 ? 'verbose' : lando.cli.getRenderer();
          // run the listr
          await lando.cli.processTasks(lando.cli.listrTasks['post-start-scan'], renderer);
        }
      }
    },
  };
};
