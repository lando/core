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
  // pieces of you
  const rn = item.rnt ? item.rnt.replace('${version}', item.update.version) : undefined;
  const update = `${item.update.version}-${item.update.channel}`;
  // it no release notes template then
  return rn || update;
};

// get not installed message
const getCannotUpdateMessage = item => {
  if (item.source) return 'Running from source. Please update manually.';
  if (item.legacyPlugin) {
    return 'Legacy plugin. Please see: https://docs.lando.dev/guides/updating-plugins-v4.html#lando-3-21-0';
  }

  return 'Please update manually.';
};

// helper to get a renderable status table
const getStatusTable = items => ({
  rows: items.map(item => {
    switch (item.state) {
      case 'NO UPDATE':
        return merge({}, item, {
          description: item.description,
          status: `${color.green(`${figures.tick} Up to date`)}`,
          comment: color.dim('All good'),
        });
      case 'HAS UPDATE':
        return merge({}, item, {
          description: item.description,
          status: `${color.yellow(`${figures.warning} Update available`)}`, // eslint-disable-line max-len
          comment: getUpdateMessage(item),
        });
      case 'CANNOT UPDATE':
        return merge({}, item, {
          description: item.description,
          status: `${color.dim(`${figures.warning} Cannot update`)}`,
          comment: color.dim(getCannotUpdateMessage(item)),
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
      default: !lando.config.isInteractive,
      boolean: true,
    },
  };

  return {
    command: 'update',
    describe: 'Updates lando',
    usage: '$0 update [--yes]',
    examples: [
      '$0 update --yes',
    ],
    options,
    run: async options => {
      const sortBy = require('lodash/sortBy');
      const ux = lando.cli.getUX();

      // add the plugins and install dir
      const dir = lando.config.pluginDirs.find(dir => dir.type === require('../utils/get-plugin-type')());
      lando.updates.plugins = lando.config.plugins;
      lando.updates.dir = dir ? dir.dir : undefined;

      // get updatable items
      ux.action.start('Generating update matrix');
      const checks = await lando.updates.check();
      const updatesAvailable = checks.some(result => result.updateAvailable !== false);
      ux.action.stop(updatesAvailable ? `${color.green('done')} ${color.dim('[see table below]')}`
        : `${color.green('done')} ${color.dim('[nothing to update]')}`);

      // map into things for tabular display
      const items = checks.map(item => {
        if (item.update && item.update.error) item.state = 'ERROR';
        else if (!item.isUpdateable) item.state = 'CANNOT UPDATE';
        else if (item.updateAvailable === false) item.state = 'NO UPDATE';
        else item.state = 'HAS UPDATE';
        return item;
      });

      // show plugin install status summary unless non-interactive
      if (options.yes === false) {
        const {rows, columns} = getStatusTable(items);
        // print table
        console.log('');
        ux.ux.table(sortBy(rows, ['row', 'name']), columns);
        console.log('');
      }

      // show prompts if needed
      if (updatesAvailable && options.yes === false) {
        const summary = getStatusGroups(items);
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

      // try to update the plugins
      const {errors, results} = await lando.runTasks(tasks, {
        renderer: 'lando',
        rendererOptions: {
          level: 0,
        },
      });

      await lando.events.emit('post-install-plugins', {errors, results});
      // flush relevant caches
      lando.cli.clearTaskCaches();
      lando.cache.remove('updates-2');

      // throw an error if there is an update error
      if (items.filter(item => item.state === 'ERROR').length > 0) {
        const badcheck = items.find(item => item.state === 'ERROR');
        lando.log.debug('an update error check occured with %o', badcheck.update);
        lando.exitCode = 14;
      }

      // we didnt have to do anything
      if (errors.length === 0 && results.length === 0) {
        console.log(`As far as ${color.bold('lando update')} can tell you are already ${color.green('up to date!')}`);
        return;
      }

      // if we had errors
      if (errors.length > 0) {
        const error = new Error(`An update error occured! Rerun with ${color.bold('lando update --debug')} for more info.`); // eslint-disable-line max-len
        lando.log.debug('%j', errors[0]);
        throw error;
      }

      // success!
      if (errors.length === 0 && results.length > 0) {
        console.log(`Updated ${color.green(results.length)} of ${color.bold(results.length)} packages successfully!`);
        console.log(`You are now ${color.green('up to date!')} with the latest and greatest!`);
      }
    },
  };
};
