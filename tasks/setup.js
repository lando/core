'use strict';

const groupBy = require('lodash/groupBy');
const merge = require('lodash/merge');

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
  // start with the action and fallbacks
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
  const buildEngine = process.platform === 'linux' ? 'docker-engine' : 'docker-desktop';

  // default options
  const options = {
    // 'interactive': {
    //   describe: 'Force setup into an interactive mode',
    //   default: false,
    //   boolean: true,
    // },
    'build-engine': {
      describe: `The version of the build engine (${buildEngine}) to install`,
      default: defaults.buildEngine,
      string: true,
    },
    'orchestrator': {
      describe: 'The version of the orchestrator (docker-compose) to install',
      default: defaults.orchestrator,
      string: true,
    },
    'plugin': {
      describe: 'Additional plugin(s) to install',
      default: require('../utils/parse-to-plugin-strings')(defaults.plugins),
      array: true,
    },
    'skip-common-plugins': {
      describe: 'Disables the installation of common Lando plugins',
      default: defaults.skipCommonPlugins,
      boolean: true,
    },
    'yes': {
      describe: 'Runs non-interactively with all accepted default answers',
      alias: ['y'],
      default: !require('is-interactive'),
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
    options,
    run: async options => {
      const sortBy = require('lodash/sortBy');

      const parsePkgName = require('../utils/parse-package-name');
      const ux = lando.cli.getUX();

      // @TODO: start by showing the setup header unless non-interactive
      // @TODO: assess logging?
      // @TODO: calculating requirements spinner?
      // @TODO:
      // * dep installation art header?
      // * other options like --interactive?
      // * conditional visibility for lando setup re first time run succesfully?

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
      const pstatus = await lando.getInstallPluginsStatus(options);
      const pstatusSummary = getStatusGroups(pstatus);
      options.installPlugins = pstatusSummary['NOT INSTALLED'] + pstatusSummary['CANNOT INSTALL'] > 0;

      // show plugin install status/summary and prompt if needed
      if (options.installPlugins && options.yes === false) {
        // @TODO: lando plugin header install art
        const {rows, columns} = getStatusTable(pstatus);

        // print table
        console.log('');
        ux.ux.table(sortBy(rows, ['row', 'weight']), columns);
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

      // actually install plugins
      const presults = await lando.installPlugins(options);
      // reload with newyl installed plugins and clear caches
      await lando.reloadPlugins();

      // get setup status
      const sstatus = await lando.getSetupStatus(options);
      const sstatusSummary = getStatusGroups(sstatus);
      options.installTasks = sstatusSummary['NOT INSTALLED'] + sstatusSummary['CANNOT INSTALL'] > 0;

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
      const total = presults.total = sresults.total;

      console.log(results, errors, results.length, errors.length, total, sresults.restart);

      // if restart is required then surface that here
      // @TODO: nice art for this?
      // @TODO: catch for anykey?
      if (errors.length === 0 && results.length > 0 && sresults.restart) {
        if (options.yes === false) await ux.anykey(`Press any key to restart or ${color.yellow('q')} to restart later`);
        await require('../utils/shutdown-os')({
          debug: require('../utils/debug-shim')(lando.log),
          message: 'Lando needs to restart to complete setup!',
        });
      }
    },
  };
};
