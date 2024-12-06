'use strict';

const groupBy = require('lodash/groupBy');
const merge = require('lodash/merge');
const sortBy = require('lodash/sortBy');

const {color, figures} = require('listr2');

const defaultStatus = {
  'CANNOT INSTALL': 0,
  'INSTALLED': 0,
  'NOT INSTALLED': 0,
};

// helper to get a status groupings
const getStatusGroups = (status = {}) => {
  const results = Object.fromEntries(Object.entries(groupBy(status, 'state'))
    .map(([state, items]) => ([state, items.length])));
  return merge({}, defaultStatus, results);
};

// get not installed message
const getNotInstalledMessage = item => {
  // start with the action and fallbacks`
  const message = [item.comment || `Will install ${item.version}` || 'Will install'];
  // add a restart message if applicable
  if (item.restart) message.push('[Requires restart]');
  // return
  return message.join(' ');
};

// helper to get a renderable status table
const getStatusTable = items => ({
  rows: items.map(item => {
    switch (item.state) {
      case 'INSTALLED':
        return merge({}, item, {
          description: item.description,
          status: `${color.green(`${figures.tick} Installed`)}`,
          comment: color.dim('Dialed'),
          weight: -1,
        });
      case 'NOT INSTALLED':
        return merge({}, item, {
          description: item.description,
          status: `${color.yellow(`${figures.warning} Not Installed`)}`,
          comment: color.dim(getNotInstalledMessage(item)),
          weight: 0,
        });
      case 'CANNOT INSTALL':
        return merge({}, item, {
          description: item.description,
          status: `${color.red(`${figures.cross} Cannot Install!`)}`,
          comment: item.comment,
          weight: 1,
        });
    }
  }),
  columns: {
    description: {header: 'THING'},
    status: {header: 'STATUS'},
    comment: {header: 'COMMENT'},
  },
});

module.exports = lando => {
  // get defaults from the lando config
  const defaults = lando.config.setup;
  // determine label for build engine
  const buildEngine = process.landoPlatform === 'linux' || process.platform === 'linux' ? 'docker-engine' : 'docker-desktop';
  // default options
  const options = {
    'build-engine': {
      describe: `Sets the version of the build engine (${buildEngine}) to install`,
      default: defaults.buildEngine,
      string: true,
    },
    'orchestrator': {
      describe: 'Sets the version of the orchestrator (docker-compose) to install',
      default: defaults.orchestrator,
      string: true,
    },
    'plugin': {
      describe: 'Sets additional plugin(s) to install',
      default: require('../utils/parse-to-plugin-strings')(defaults.plugins),
      array: true,
    },
    'skip-common-plugins': {
      describe: 'Disables the installation of common Lando plugins',
      default: defaults.skipCommonPlugins,
      boolean: true,
    },
    'skip-install-ca': {
      describe: 'Disables the installation of the Lando Certificate Authority (CA)',
      default: defaults.skipInstallCa,
      boolean: true,
    },
    'skip-networking': {
      describe: 'Disables the installation of the Landonet',
      default: defaults.skipNetworking,
      boolean: true,
      hidden: true,
    },
    'yes': {
      describe: 'Runs non-interactively with all accepted default answers',
      alias: ['y'],
      default: !lando.config.isInteractive,
      boolean: true,
    },
  };

  // if docker-desktop then we need to add the accept license option
  if (buildEngine === 'docker-desktop') {
    options['build-engine-accept-license'] = {
      describe: 'Accepts the Docker Desktop license during install instead of later',
      default: defaults.buildEngineAcceptLicense,
      boolean: true,
    };
  }

  // allow plugins to contribute options to setup
  // @NOTE: ideally we'd dynamically add in setup options but this is not easily possible in Lando 3 so
  // we are going to kick it to Lando 4 and just hardcode all the options we need
  // await lando.events.emit('setup-options', options);

  return {
    command: 'setup',
    usage: `$0 setup
    [--build-engine <version>]
    [--build-engine-accept-license]
    [--orchestrator <version>]
    [--plugin <plugin>...]
    [--skip-common-plugins]
    [--skip-install-ca]
    [--yes]`,
    examples: [
      '$0 setup --skip-common-plugins --plugin @lando/php --plugin @lando/mysql --yes',
      '$0 setup --skip-install-ca --build-engine 4.31.0 --build-engine-accept-license',
    ],
    options,
    run: async options => {
      // @TODO: conditional visibility for lando setup re first time run succesfully?
      const parsePkgName = require('../utils/parse-package-name');
      const ux = lando.cli.getUX();

      // setup header
      console.log(lando.cli.makeArt('setupHeader'));

      // ensure plguins/tasks is an empty object if not passed in somehow?
      options.plugins = options.plugins ?? {};
      options.tasks = options.tasks ?? [];

      // start by looping through option.plugin and object merging
      // this should allow us to skip plugin-resolution because its just going to always use the "last" version
      for (const plugin of options.plugin) {
        const {name, peg} = parsePkgName(plugin);
        options.plugins[name] = peg === '*' ? 'latest' : peg;
      }

      // attempt to get the status and status summary of our plugins
      ux.action.start('Generating plugin installation matrix');
      const pstatus = await lando.getInstallPluginsStatus(options);
      const pstatusSummary = getStatusGroups(pstatus);
      options.installPlugins = pstatusSummary['NOT INSTALLED'] + pstatusSummary['CANNOT INSTALL'] > 0;
      ux.action.stop(options.installPlugins ? `${color.green('done')} ${color.dim('[see table below]')}`
        : `${color.green('done')} ${color.dim('[nothing to install]')}`);

      // filter out any plugins that are alrady installed
      for (const plugin of pstatus) {
        if (plugin.state === 'INSTALLED') {
          delete options.plugins[plugin.id];
        }
      }

      // show plugin install status/summary and prompt if needed
      if (options.installPlugins && options.yes === false) {
        const {rows, columns} = getStatusTable(pstatus);
        // print table
        console.log('');
        ux.table(sortBy(rows, ['row', 'weight']), columns);
        console.log('');

        // things are good!
        if (pstatusSummary['CANNOT INSTALL'] === 0) {
          console.log(`Lando would like to install the ${pstatusSummary['NOT INSTALLED']} plugins listed above.`);
          const answer = await ux.confirm(color.bold('DO YOU CONSENT?'));
          if (!answer) throw new Error('Setup terminated!');

        // things are probably not ok
        } else {
          console.log(`Lando has detected that ${pstatusSummary['CANNOT INSTALL']} plugins listed above cannot install correctly.`); // eslint-disable-line max-len
          console.log(color.magenta('It may be wise to resolve their issues before continuing!'));
          console.log('');
          const answer = await ux.confirm(color.bold('DO YOU STILL WISH TO CONTINUE?'));
          if (!answer) throw new Error('Setup terminated!');
        }
      }

      // actually install plugins that are not already installed
      const presults = await lando.installPlugins(options);

      // handle plugin install errors
      // @NOTE: should a plugin install error stop the rest of setup?
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
        ux.table(sortBy(rows, ['description', 'weight']), columns);
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
    },
  };
};
