'use strict';

const _ = require('lodash');

module.exports = lando => ({
  command: 'logs',
  describe: 'Displays logs for your app',
  usage: '$0 logs [--follow] [--service <service>...] [--timestamps]',
  examples: [
    '$0 logs',
    '$0 logs --tail 10',
    '$0 logs --follow --service appserver',
  ],
  options: {
    follow: {
      describe: 'Follows the logs',
      alias: ['f'],
      default: false,
      boolean: true,
    },
    service: {
      describe: 'Shows logs for the specified services only',
      alias: ['s'],
      array: true,
    },
    tail: {
      describe: 'Number of lines to show from the end of the logs for each service',
      alias: ['n'],
      default: 'all',
      type: 'string',
    },
    timestamps: {
      describe: 'Shows log timestamps',
      alias: ['t'],
      default: false,
      boolean: true,
    },
  },
  run: options => {
    // Try to get our app
    const app = lando.getApp(options._app.root);
    const opts = _.pick(options, ['follow', 'tail', 'timestamps', 'service']);
    opts.services = opts.service;
    if (app) return app.init().then(() => lando.engine.logs(_.merge(app, {opts})));
  },
});
