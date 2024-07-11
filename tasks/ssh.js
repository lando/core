'use strict';

// Modules
const _ = require('lodash');

// Other things
const bashme = ['/bin/sh', '-c', 'if ! type bash > /dev/null; then sh; else bash; fi'];

module.exports = (lando, app) => ({
  command: 'ssh',
  override: true,
  options: {
    service: {
      describe: 'SSH into this service',
      alias: ['s'],
      default: app.primary ?? 'appserver',
    },
    command: {
      describe: 'Run a command in the service',
      alias: ['c'],
    },
    user: {
      describe: 'Run as a specific user',
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
        // and whether it can exec
        const canExec = api === 4 && _.get(_.find(app?.v4?.services, {id: service}), 'canExec', false);

        // set additional opt defaults if possible
        const opts = [undefined, api === 4 ? undefined : '/app'];
        // mix any v4 service info on top of app.config.services
        const services = _(_.get(app, 'config.services', {}))
          .map((service, id) => _.merge({}, {id}, service))
          .map(service => _.merge({}, service, _.find(_.get(app, 'v4.services', []), s => s.id === service.id)))
          .value();

        // attempt to get additional information about the service, this means that service.appMount **should** work
        // for v3 services if it is set however it is technically unsupported
        if (_.find(services, s => s.id === service)) {
          const config = _.find(services, s => s.id === service);
          // prefer appmount
          if (config.appMount) opts[1] = config.appMount;
          // fallback to working dir if available
          if (!config.appMount && _.has(config, 'config.working_dir')) opts[0] = config.config.working_dir;
        }

        // if this is an api 4 service that canExec then we have special handling
        if (api === 4 && canExec) {
          if (command === bashme) command = 'bash';
          if (typeof command === 'string') command = require('string-argv')(command);
          command = ['/etc/lando/exec.sh', ...command];
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
