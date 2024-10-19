'use strict';

// Modules
const _ = require('lodash');

// Other things
const bashme = ['/bin/sh', '-c', 'if ! type bash > /dev/null; then sh; else bash; fi'];

module.exports = (lando, app) => ({
  command: 'ssh',
  usage: '$0 ssh [--command <command>] [--service <service>] [--user <user>]',
  examples: [
    '$0 ssh --command "env | grep LANDO_ | sort"',
    '$0 ssh --command "apt update -y && apt install vim -y --user root --service appserver"',
  ],
  override: true,
  options: {
    service: {
      describe: 'SSHs into this service',
      alias: ['s'],
      default: app._defaultService ?? 'appserver',
    },
    command: {
      describe: 'Runs a command in the service',
      alias: ['c'],
    },
    user: {
      describe: 'Runs as a specific user',
      alias: ['u'],
    },
  },
  run: ({command = bashme, service = 'appserver', user = null, _app = {}} = {}) => {
    // Try to get our app
    const app = lando.getApp(_app.root, false);

    // If we have it then init and DOOOO EEEET
    if (app) {
      return app.init().then(() => {
        // get the service api if possible
        const api = _.get(_.find(app.info, {service}), 'api', 3);
        // set additional opt defaults if possible
        const opts = [undefined, api === 4 ? undefined : '/app'];
        opts[2] = !app._config.command.deps ?? false;
        opts[3] = app._config.command.autoRemove ?? true;
        // mix any v4 service info on top of app.config.services
        const services = _(_.get(app, 'config.services', {}))
          .map((service, id) => _.merge({}, {id}, service))
          .map(service => _.merge({}, service, _.find(_.get(app, 'v4.services', []), s => s.id === service.id)))
          .value();

        // attempt to get additional information about the service, this means that service.appMount **should** work
        // for v3 services if it is set however it is technically unsupported
        if (_.find(services, s => s.id === service)) {
          const config = _.find(services, s => s.id === service);
          const workdir = config?.config?.overrides?.working_dir ?? config?.config?.working_dir;
          // prefer appmount
          if (config.appMount) opts[1] = config.appMount;
          // fallback to working dir if available
          if (!config.appMount && workdir) opts[0] = workdir;
        }

        // continue
        if (_.isNull(user)) user = require('../utils/get-user')(service, app.info);
        return lando.engine.run(require('../utils/build-tooling-runner')(
          app,
          command,
          service,
          user,
          {
            DEBUG: lando.debuggy ? '1' : '',
            LANDO_DEBUG: lando.debuggy ? '1' : '',
          },
          ...opts,
        )).catch(error => {
          error.hide = true;
          throw error;
        });
      });
    }
  },
});
