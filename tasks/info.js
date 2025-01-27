'use strict';

const _ = require('lodash');

module.exports = lando => ({
  command: 'info',
  describe: 'Prints info about your app',
  usage: '$0 info [--deep] [--filter <key=value>...] [--format <default|json|table>] [--path <path>] [--service <service>...]', // eslint-disable-line max-len
  examples: [
    '$0 info --deep',
    '$0 info --format json --service appserver',
  ],
  options: _.merge({}, lando.cli.formatOptions(), {
    deep: {
      describe: 'Gets ALL the info',
      alias: ['d'],
      default: false,
      boolean: true,
    },
    service: {
      describe: 'Gets info for only the specified services',
      alias: ['s'],
      array: true,
    },
  }),
  run: async options => {
    // if options is a table then map it over to the new otable
    if (options.format === 'table') options.format = 'otable';

    // Try to get our app
    const app = lando.getApp(options._app.root);

    // helper to get raw services data
    const getData = async () => {
      // go deep
      if (options.deep) {
        const separator = _.get(app, '_config.orchestratorSeparator', '_');
        return await lando.engine.list({project: app.project})
          .map(async container => await lando.engine.scan(container))
          .filter(container => {
            if (!options.service) return true;
            return options.service.map(service => `/${app.project}${separator}${service}${separator}1`).includes(container.Name);
          });

      // normal info
      } else {
        return app.info.filter(service => options.service ? options.service.includes(service.service) : true);
      }
    };

    // only continue if we have an app
    if (app) {
      // init
      await app.init();
      // get the data
      options.data = await getData();
      // and filter it if needed
      if (options.filter) {
        for (const filter of options.filter) {
          options.data = _.filter(options.data, item => {
            return String(_.get(item, filter.split('=')[0])) == filter.split('=')[1];
          });
        }
        delete options.filter;
      }
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
});
