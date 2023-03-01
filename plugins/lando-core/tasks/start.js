'use strict';

const _ = require('lodash');
const utils = require('./../lib/utils');

const {Manager} = require('listr2');

module.exports = lando => {
  return {
    command: 'start',
    describe: 'Starts your app',
    run: options => {
      // Try to get our app
      const app = lando.getApp(options._app.root);
      const legacyScanner = _.get(lando, 'config.scanner', true) === 'legacy';

      // Start it if we can!
      if (app) {
        console.log(lando.cli.makeArt('appStart', {name: app.name, phase: 'pre'}));
        // Normal bootup
        return app.start().then(() => {
          const type = !_.isEmpty(app.warnings) ? 'report' : 'post';
          const phase = legacyScanner ? `${type}_legacy` : type;
          console.log(lando.cli.makeArt('appStart', {name: app.name, phase, warnings: app.warnings}));
          console.log(lando.cli.formatData(utils.startTable(app, {legacyScanner}), {format: 'table'}, {border: false}));

          // if we are not in legacy mode we have more work to do
          if (!legacyScanner) {
            const scanTasks = _(app.checks)
              .filter(checks => checks.type === 'url-scan')
              .groupBy('service')
              .map((tasks, name) => ({
                title: lando.cli.chalk.cyan(`${_.upperCase(name)} URLS`),
                task: (ctx, task) => {
                  const subtasks = _(tasks).map(subtask => lando.cli.check2task(subtask)).value();
                  return task.newListr(subtasks, {concurrent: true, exitOnError: false});
                },
              }))
              .value();

            // listr things
            // if verbose or debug mode is on then use the verbose renderer
            const renderer = options.debug || options.verbose > 0 ? 'verbose' : lando.cli.getRenderer();
            const rendererOptions = {collapse: false, level: 1, suffixRetries: false, showErrorMessage: false};
            const listrOptions = {renderer, concurrent: true, showErrorMessage: false, rendererOptions};
            const tasks = new Manager(listrOptions);
            tasks.add(scanTasks);

            // run the listr
            return tasks.runAll()
            .then(stuff => {
              console.log('');
            })
            .catch(error => {
              throw error;
            });
          } else console.log(' ');
        })
        // Provide help if there is an error
        .catch(err => {
          app.log.error(err.message, err);
          console.log(lando.cli.makeArt('appStart', {phase: 'error'}));
          return lando.Promise.reject(err);
        });
      }
    },
  };
};
