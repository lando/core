'use strict';

const _ = require('lodash');

module.exports = async (app, lando) => {
  // scope app.nonRoot to v3 services only since this is not a workaround that v4 needs
  app.nonRoot = _.get(app, 'nonRoot', []).filter(service => app.servicesList.includes(service));

  // perm sweep non root if needed
  if (!_.isEmpty(app.nonRoot)) {
    app.log.verbose('perm sweeping flagged non-root containers ...', app.nonRoot);
    app.events.on('post-start', 1, () => lando.Promise.each(app.nonRoot, service => {
      return app.engine.run({
        id: app.containers[service],
        cmd: '/helpers/user-perms.sh --silent',
        compose: app.compose,
        project: app.project,
        opts: {
          detach: true,
          mode: 'attach',
          user: 'root',
          services: [service],
        },
      })
      .catch(err => {
        app.addMessage(require('../messages/service-not-running-error')(service), err);
      });
    }));
  }
};
