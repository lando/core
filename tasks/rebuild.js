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
        if (!_.isEmpty(options.service)) app.opts = _.merge({}, app.opts, {services: options.service});

        // rebuild hero
        console.log(lando.cli.makeArt('appRebuild', {name: app.name, phase: 'pre'}));
        // rebuild
        await app.rebuild();
        // determine legacy settings
        const legacyScanner = _.get(lando, 'config.scanner', true) === 'legacy';
        // get scanner stuff
        const type = !_.isEmpty(app.warnings) ? 'report' : 'post';
        const phase = legacyScanner ? `${type}_legacy` : type;
        const scans = _.find(app.checks, {type: 'url-scan-listr2'});

        // rebuold tables
        console.log(lando.cli.makeArt('appRebuild', {name: app.name, phase, warnings: app.warnings}));
        console.log(lando.cli.formatData(utils.startTable(app, {legacyScanner}), {format: 'table'}, {border: false}));

        // if we are not in legacy scanner mode then run the scans
        if (!legacyScanner && scans) await scans.test(...scans.args);

        // aesthetics, consistency
        console.log('');
      }
    },
  };
};
