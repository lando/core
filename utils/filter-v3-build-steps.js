'use strict';

const _ = require('lodash');

module.exports = (services, app, rootSteps = [], buildSteps= [], prestart = false) => {
  const getUser = require('../utils/get-user');
  // compute stdid based on compose major version
  const cstdio = _.get(app, '_config.orchestratorMV', 2) ? 'inherit' : ['inherit', 'pipe', 'pipe'];
  // Start collecting them
  const build = [];
  // Go through each service
  _.forEach(services, service => {
    // Loop through all internal, legacy and user steps
    _.forEach(rootSteps.concat(buildSteps), section => {
      // If the service has build sections let's loop through and run some commands
      if (!_.isEmpty(_.get(app, `config.services.${service}.${section}`, []))) {
        // Run each command
        _.forEach(app.config.services[service][section], cmd => {
          // if array then just join it together
          // @NOTE: this cant possibly work correctly in many situations?
          if (_.isArray(cmd)) cmd = cmd.join(' ');

          build.push({
            id: app.containers[service],
            cmd: ['/helpers/exec-multiliner.sh', Buffer.from(cmd, 'utf8').toString('base64')],
            compose: app.compose,
            project: app.project,
            opts: {
              mode: 'attach',
              cstdio,
              prestart,
              user: (_.includes(rootSteps, section)) ? 'root' : getUser(service, app.info),
              services: [service],
            },
          });
        });
      }
    });
  });
  // Let's silent run user-perm stuff and add a "last" flag
  if (!_.isEmpty(build)) {
    const permsweepers = _(build)
      .map(command => ({id: command.id, services: _.get(command, 'opts.services', [])}))
      .uniqBy('id')
      .value();
    _.forEach(permsweepers, ({id, services}) => {
      build.unshift({
        id,
        cmd: '/helpers/user-perms.sh --silent',
        compose: app.compose,
        project: app.project,
        opts: {
          mode: 'attach',
          prestart,
          user: 'root',
          services,
        },
      });
    });
    // Denote the last step in the build if its happening before start
    const last = _.last(build);
    last.opts.last = prestart;
  }
  // Return
  return build;
};
