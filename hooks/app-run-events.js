'use strict';

const _ = require('lodash');

module.exports = async (app, lando, cmds, data, event) => {
  const eventCommands = require('./../utils/parse-events-config')(cmds, app, data);
  const injectable = _.has(app, 'engine') ? app : lando;
  return injectable.engine.run(eventCommands).catch(err => {
    const command = _.tail(event.split('-')).join('-');
    if (app.addMessage) {
      const message = _.trim(_.get(err, 'message')) || 'UNKNOWN ERROR';
      app.addMessage({
        title: `The ${event} event has command(s) that failed!`,
        type: 'warning',
        detail: [
          `Event failed with: "${message}"`,
          'This **MAY** prevent your app from working.',
          'Check for errors above, fix them in your Landofile, and run the command again:',
        ],
        command: `lando ${command}`,
      }, err);
    } else {
      lando.exitCode = 12;
    }
  });
};
