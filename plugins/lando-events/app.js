'use strict';

// Modules
const _ = require('lodash');
const utils = require('./lib/utils');
const serviceFromContainerName = require('./../../lib/utils').serviceFromContainerName;

/*
 * @TODO
 */
module.exports = (app, lando) => {
  if (!_.isEmpty(_.get(app, 'config.events', []))) {
    _.forEach(app.config.events, (cmds, name) => {
      app.events.on(name, 9999, data => {
        // determine the default service
        // default to appserver if the app has at least one v3 service
        // default to primary service if app has only v4 services
        // @NOTE: we have to do this

        const eventCommands = utils.events2Runz(cmds, app, data);
        if (!_.isEmpty(eventCommands)) {
          _.forEach(_.uniq(_.map(eventCommands, 'id')), container => {
            eventCommands.unshift({
              id: container,
              cmd: '/helpers/user-perms.sh --silent',
              compose: app.compose,
              project: app.project,
              opts: {
                mode: 'attach',
                user: 'root',
                services: [serviceFromContainerName(app, container)],
              },
            });
          });
        }
        const injectable = _.has(app, 'engine') ? app : lando;
        return injectable.engine.run(eventCommands).catch(err => {
          if (app.addWarning) {
            app.addWarning({
              title: `One of your events failed`,
              detail: [
                'This **MAY** prevent your app from working.',
                'Check for errors above, fix them in your Landofile, and run the command again:',
              ],
            }, err);
          } else {
            lando.exitCode = 12;
          }
        });
      });
    });
  }
};
