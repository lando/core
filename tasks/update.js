'use strict';

const groupBy = require('lodash/groupBy');
const merge = require('lodash/merge');

const {color, figures} = require('listr2');

const defaultStatus = {
  'NO UPDATE': 0,
  'HAS UPDATE': 0,
  'CANNOT UPDATE': 0,
  'ERROR': 0,
};

// helper to get a status groupings
const getStatusGroups = (status = {}) => {
  const results = Object.fromEntries(Object.entries(groupBy(status, 'state'))
    .map(([state, items]) => ([state, items.length])));
  return merge({}, defaultStatus, results);
};

// get not installed message
const getUpdateMessage = item => {
  // it no release notes template then
  if (!item.rnt) return 'No release notes available!';
  // otherwise
  return `See ${item.rnt.replace('${version}', item.update.version)} for release notes`;
};

// helper to get a renderable status table
const getStatusTable = items => ({
  rows: items.map(item => {
    switch (item.state) {
      case 'NO UPDATE':
        return merge({}, item, {
          description: item.description,
          status: `${color.green(`${figures.tick} Up to date`)}`,
        });
      case 'HAS UPDATE':
        return merge({}, item, {
          description: item.description,
          status: `${color.yellow(`${figures.warning} Update available (${item.update.version}-${item.update.channel})`)}`, // eslint-disable-line max-len
          comment: getUpdateMessage(item),
        });
      case 'CANNOT UPDATE':
        return merge({}, item, {
          description: item.description,
          status: `${color.yellow(`${figures.warning} Cannot update automatically`)}`,
          comment: color.dim('Please update manually'),
        });
      case 'ERROR':
        return merge({}, item, {
          description: item.description,
          status: `${color.red(`${figures.cross} Update check failed!`)}`,
          comment: item.update.error.message,
        });
    }
  }),
  columns: {
    name: {header: 'PACKAGE'},
    status: {header: 'STATUS'},
    comment: {header: 'COMMENT'},
  },
});

module.exports = lando => {
  // default options
  const options = {
    'yes': {
      describe: 'Runs non-interactively with all accepted default answers',
      alias: ['y'],
      default: !require('is-interactive'),
      boolean: true,
    },
  };

  return {
    command: 'update',
    options,
    run: async options => {
      const sortBy = require('lodash/sortBy');
      const ux = lando.cli.getUX();

      // get updatable items
      ux.action.start('Generating plugin/cli update matrix');
      const checks = await lando.updates.check();
      const updatesAvailable = checks.some(result => result.updateAvailable !== false);
      ux.action.stop(updatesAvailable ? `${color.green('done')} ${color.dim('[see table below]')}`
        : `${color.green('done')} ${color.dim('[nothing to update]')}`);

      // show plugin install status/summary and prompt if needed
      if (updatesAvailable && options.yes === false) {
        // map into things for tabular display
        const items = checks.map(item => {
          if (item.update && item.update.error) item.state = 'ERROR';
          else if (!item.isUpdateable) item.state = 'CANNOT UPDATE';
          else if (item.updateAvailable === false) item.state = 'NO UPDATE';
          else item.state = 'HAS UPDATE';
          return item;
        });

        const {rows, columns} = getStatusTable(items);
        const summary = getStatusGroups(items);

        // print table
        console.log('');
        ux.ux.table(sortBy(rows, ['row', 'name']), columns);
        console.log('');

        // things are good!
        if (summary['ERROR'] === 0) {
          console.log(`Lando would like to update ${summary['HAS UPDATE']} package(s) listed above.`);
          const answer = await ux.confirm(color.bold('DO YOU CONSENT?'));
          if (!answer) throw new Error('Update terminated!');

        // things are probably not ok
        } else {
          console.log(`Lando has detected that ${summary['ERROR']} package(s) listed above has update errors.`); // eslint-disable-line max-len
          console.log(color.magenta(`It may be wise to resolve their issues before updating the other ${summary['HAS UPDATE']}!`)); // eslint-disable-line max-len
          console.log('');
          const answer = await ux.confirm(color.bold('DO YOU STILL WISH TO CONTINUE?'));
          if (!answer) throw new Error('Update terminated!');
        }
      }

      // resolve to unique and installable list of items
      const tasks = await lando.updates.getUpdateTasks();
      console.log(tasks);
      process.exit(1);


    // const {dir} = this.config.pluginDirs.find(dir => dir.type === require('../utils/get-plugin-type')());
    // // prep tasks
    // const tasks = require('../utils/parse-to-plugin-strings')(options.plugins)
    //   .map(plugin => require('../utils/get-plugin-update-task')(plugin, {dir, Plugin: lando.updates.Plugin}))


    //   const updateable =

    //   const results = await lando.updates.updates();

      // handle plugin install errors
      // @NOTE: should a plugin install error stop the rest of setup?
      /*
      if (presults.errors.length > 0) {
        const error = new Error(`A setup error occured! Rerun with ${color.bold('lando setup --debug')} for more info.`); // eslint-disable-line max-len
        lando.log.debug('%j', presults.errors[0]);
        throw error;
      }

      // reload with newyl installed plugins and clear caches
      await lando.reloadPlugins();

      // get setup status
      ux.action.start('Generating setup task installation matrix');
      const sstatus = await lando.getSetupStatus(options);
      const sstatusSummary = getStatusGroups(sstatus);
      options.installTasks = sstatusSummary['NOT INSTALLED'] + sstatusSummary['CANNOT INSTALL'] > 0;
      ux.action.stop(options.installTasks ? `${color.green('done')} ${color.dim('[see table below]')}`
        : `${color.green('done')} ${color.dim('[nothing to install]')}`);

      // show setup status/summary and prompt if needed
      if (options.installTasks && options.yes === false) {
        // @TODO: lando plugin header install art
        const {rows, columns} = getStatusTable(sstatus);

        // print table
        console.log('');
        ux.ux.table(sortBy(rows, ['row', 'weight']), columns);
        console.log('');

        // things are good!
        if (sstatusSummary['CANNOT INSTALL'] === 0) {
          console.log(`Lando would like to run the ${sstatusSummary['NOT INSTALLED']} setup tasks listed above.`);
          const answer = await ux.confirm(color.bold('DO YOU CONSENT?'));
          if (!answer) throw new Error('Setup terminated!');

        // things are probably not ok
        } else {
          console.log(`Lando has detected that ${sstatusSummary['CANNOT INSTALL']} setup tasks listed above cannot run correctly.`); // eslint-disable-line max-len
          console.log(color.magenta('It may be wise to resolve their issues before continuing!'));
          console.log('');
          const answer = await ux.confirm(color.bold('DO YOU STILL WISH TO CONTINUE?'));
          if (!answer) throw new Error('Setup terminated!');
        }
      }

      // run setup
      const sresults = await lando.setup(options);

      // combine all our results
      const results = presults.results.concat(sresults.results);
      const errors = presults.errors.concat(sresults.errors);
      // @NOTE: total includes all tasks, even ones that dont need to run so its sort of confusing for UX purposes
      // we will just imrpove this in L4
      // const total = presults.total = sresults.total;
      // padme bro
      console.log('');

      // we didnt have to do anything
      if (errors.length === 0 && results.length === 0) {
        console.log(`As far as ${color.bold('lando setup')} can tell you are ${color.green('good to go')} and do not require additional setup!`); // eslint-disable-line max-len
        return;
      }

      // if we had errors
      if (errors.length > 0) {
        const error = new Error(`A setup error occured! Rerun with ${color.bold('lando setup --debug')} for more info.`); // eslint-disable-line max-len
        lando.log.debug('%j', errors[0]);
        throw error;
      }

      // success!
      if (errors.length === 0 && results.length > 0) {
        // restart logix
        if (sresults.restart) {
          console.log(`Setup installed ${color.green(results.length)} of ${color.bold(results.length)} things successfully!`); // eslint-disable-line max-len
          console.log(color.magenta('However, a restart is required is complete your setup.'));
          if (options.yes === false) {
            try {
              console.log('');
              await ux.anykey(`Press any key to restart or ${color.yellow('q')} to restart later`);
            } catch {
              throw new Error(`Restart cancelled! ${color.yellow('Note that Lando may not work correctly until you restart!')}`); // eslint-disable-line max-len
            }
          }
          ux.action.start('Restarting');
          await require('../utils/shutdown-os')({
            debug: require('../utils/debug-shim')(lando.log),
            message: 'Lando needs to restart to complete setup!',
          });
          ux.action.stop(color.green('done'));

        // otherwise the usual success message
        } else {
          console.log(`Setup installed ${color.green(results.length)} of ${color.bold(results.length)} things successfully!`); // eslint-disable-line max-len
          console.log(`You are now ${color.green('good to go')} and can start using Lando!`);
        }
      }
      */
    },
  };
};
