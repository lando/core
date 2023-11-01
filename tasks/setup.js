'use strict';

const {color, figures} = require('listr2');

// helper to get install plugin table
const getInstallPluginsStatusTable = plugins => ({
  rows: plugins.map(plugin => {
    switch (plugin.state) {
      case 'INSTALLED':
        return {
          description: plugin.description,
          status: `${color.green(`${figures.tick} Installed`)}`,
          comment: color.dim('Dialed'),
          weight: -1,
        };
      case 'NOT INSTALLED':
        return {
          description: plugin.description,
          status: `${color.yellow(`${figures.warning} Not Installed`)}`,
          comment: `Will install ${plugin.plugin}`,
          weight: 0,
        };
      case 'CANNOT INSTALL':
        return {
          description: plugin.description,
          status: `${color.red(`${figures.cross} Cannot Install!`)}`,
          comment: plugin.reason,
          weight: 1,
        };
    }
  }),
  columns: {
    description: {header: 'PLUGIN'},
    status: {header: 'STATUS'},
    comment: {header: 'COMMENT'},
  },
});

module.exports = lando => {
  // get defaults from the lando config

  const defaults = lando.config.setup;
  // default options
  const options = {
    // 'interactive': {
    //   describe: 'Force setup into an interactive mode',
    //   default: false,
    //   boolean: true,
    // },
    'orchestrator': {
      describe: 'The version of the orchestrator to install',
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
      default: false,
      boolean: true,
    },
  };

  // allow plugins to contribute options to setup
  // @NOTE: ideally we'd dynamically add in setup options but this is not easily possible in Lando 3 so
  // we are going to kick it to Lando 4 and just hardcode all the options we need
  // await lando.events.emit('setup-options', options);

  return {
    command: 'setup',
    options,
    run: async options => {
      const groupBy = require('lodash/groupBy');
      const sortBy = require('lodash/sortBy');

      const parsePkgName = require('../utils/parse-package-name');
      const ux = lando.cli.getUX();

      // @TODO: start by showing the setup header unless non-interactive
      // @TODO: assess logging?
      // rm -rf ~/.lando/plugins/@lando && mkdir -p ~/.lando/plugins/@lando && ln -sf ~/work/core ~/.lando/plugins/@lando/core && ls -lsa ~/.lando/plugins/@lando

      // ensure options.plugins is an empty object if not passed in somehow?
      options.plugins = options.plugins ?? {};

      // start by looping through option.plugin and object merging
      // this should allow us to skip plugin-resolution because its just going to always use the "last" version
      for (const plugin of options.plugin) {
        const {name, peg} = parsePkgName(plugin);
        options.plugins[name] = peg === '*' ? 'latest' : peg;
      }

      // attempt to get the status of our plugins
      const pstatus = await lando.getInstallPluginsStatus(options);
      // determine our situation summary
      const pstatusSummary = Object.fromEntries(Object.entries(groupBy(pstatus, 'state'))
        .map(([state, plugins]) => ([state, plugins.length])));

      // set installPlugins
      options.installPlugins = pstatusSummary['NOT INSTALLED'] > 0 || pstatusSummary['CANNOT INSTALL'] > 0;

      // show plugin install status/summary and prompt if needed
      if (options.installPlugins && options.yes === false) {
        // @TODO: lando plugin header install art
        const {rows, columns} = getInstallPluginsStatusTable(pstatus);

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
      console.log(presults);
      // reload with newyl installed plugins
      await lando.reloadPlugins();

      // @TODO: start by showing the setup header unless non-interactive
      lando.log.debug(errors, results, added);

      // clear caches ?
      lando.cli.clearTaskCaches();

      // @TODO: docker compose install

      // @TODO:
      // * dep installation art header?
      // * other options like --interactive?
      // * conditional visibility for lando setup re first time run succesfully?

      // @TODO:
      // lando setup command
        // show setup summary?
        // show setup results?

      // way to skip a dependency?
      // console.error(a big warning message to run first time setup)?

      // some kind of dependency tree? conditional tasks? paused? pending? skipped?
      // try this out with engine install and networking/ca creation?
      // check if user has admin permission for docker-engine install?
    },
  };
};
