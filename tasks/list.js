'use strict';

// Modules
const _ = require('lodash');

module.exports = lando => {
  return {
    command: 'list',
    describe: 'Lists all running lando apps and containers',
    usage: '$0 list [--all] [--filter <key=value>...] [--format <default|json|table>] [--path <path>]',
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

      // List all the apps but avoid lists built-in filtering for this one
      options.data = await lando.engine.list({...options, filter: []})
        .map(container => _.omit(container, ['lando', 'id', 'instance']));

      // if filters then do the filters first
      if (options.filter) {
        for (const filter of options.filter) {
          options.data = _.filter(options.data, item => {
            return String(_.get(item, filter.split('=')[0])) == filter.split('=')[1];
          });
        }
        delete options.filter;
      }

      // if we have a path and a single service then just do that
      if (options.path && options.data.length === 1) {
        console.log(lando.cli.formatData(options.data[0], options));

      // if we do not have an otable then just print
      } else if (options.format !== 'otable') {
        console.log(lando.cli.formatData(options.data, options));

      // otherwise iterate and print table info
      } else {
        for (const datum of options.data) console.log(lando.cli.formatData(datum, options));
      }
    },
  };
};
