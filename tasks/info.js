'use strict';

const _ = require('lodash');

// Helper to filter services
const filterServices = (service, services = []) => {
  return !_.isEmpty(services) ? _.includes(services, service) : true;
};

module.exports = lando => ({
  command: 'info',
  describe: 'Prints info about your app',
  usage: '$0 info [--deep] [--filter <key=value>] [--format <default|json|table>] [--path <path>] [--service <service>]', // eslint-disable-line max-len
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
    // Get services
    app.opts = (!_.isEmpty(options.service)) ? {services: options.service} : {};
    // Go deep if we need to
    if (app && options.deep) {
      await app.init();
      await lando.engine.list({project: app.project})
        .filter(container => filterServices(container.service, options.service))
        .each(container => lando.engine.scan(container).then(data => console.log(lando.cli.formatData(data, options))));

    // otherwise just do the normal
    } else if (app && !options.deep) {
      // init app
      await app.init();
      // get data
      const services = _.filter(app.info, service => filterServices(service.service, options.service));

      // we want to do a slightly different thing for otable
      if (options.format === 'otable') {
        for (const service of services) console.log(lando.cli.formatData(service, options));
      // and then everything else
      } else console.log(lando.cli.formatData(services, options));
    }
  },
});
