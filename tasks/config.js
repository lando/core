'use strict';

const _ = require('lodash');

module.exports = lando => ({
  command: 'config',
  level: 'tasks',
  describe: 'Displays the lando configuration',
  usage: '$0 config [--format <default|json|table>] [--path <path>]',
  examples: [
    '$0 config --format table --path env',
  ],
  options: _.merge({}, lando.cli.formatOptions(['filter']), {
    field: {
      describe: 'Shows only a specific field',
      hidden: true,
      string: true,
    },
  }),
  run: options => {
    // if options is a table then map it over to the new otable
    if (options.format === 'table') options.format = 'otable';

    // render
    if (!_.isNil(options.field)) options.path = options.field;
    console.log(lando.cli.formatData(lando.config, options, {sort: true}));
  },
});
