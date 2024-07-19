'use strict';

// Modules
const _ = require('lodash');

module.exports = lando => {
  return {
    command: 'list',
    describe: 'Lists all running lando apps and containers',
    usage: '$0 list [--all] [--filter <key=value>] [--format <default|json|table>] [--path <path>]',
    examples: [
      '$0 config',
      '$0 config --format table --path env',
    ],
    level: 'engine',
    options: _.merge({}, lando.cli.formatOptions(), {
      all: {
        describe: 'Shows all containers, even those not running',
        alias: ['a'],
        boolean: true,
      },
      app: {
        describe: 'Shows containers for only a particular app',
        string: true,
      },
    }),
    run: async options => {
      // if options is a table then map it over to the new otable
      if (options.format === 'table') options.format = 'otable';

      // List all the apps
      const containers = await lando.engine.list(options)
        .map(container => _.omit(container, ['lando', 'id', 'instance']));

      // we want to do a slightly different thing for otable
      if (options.format === 'otable') {
        for (const container of containers) console.log(lando.cli.formatData(container, options));
      // and then everything else
      } else console.log(lando.cli.formatData(containers, options));
    },
  };
};
