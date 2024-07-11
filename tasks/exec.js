'use strict';

// Modules
const _ = require('lodash');

module.exports = (lando, app) => {
  // console.log(app);
  // console.log(Object.keys(app?.services))

  return {
    command: 'exec',
    describe: 'Runs commands on a service',
    usage: '$0 exec <service> [--user <user>] -- <command>',
    override: true,
    positionals: {
      service: {
        describe: 'Runs on this service',
        type: 'string',
        choices: Object.keys(app?.services ?? {}),
      },
    },
    options: {
      user: {
        describe: 'Runs as a specific user',
        alias: ['u'],
      },
    },
    run: async options => {
      // Try to get our app
      const app = lando.getApp(options._app.root, false);


      // console.log(options._app.services)

      // If we have it then init and DOOOO EEEET
      if (app) {
        return app.init().then(() => {
          // validate service|command stuff
          const service = options._[1];
          const command = options['--'];

          console.log(options, service, command);


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
  };
};
