'use strict';

const _ = require('lodash');
const remove = require('../utils/remove');
const path = require('path');

module.exports = async (app, lando, cmds, data, event) => {
  const eventCommands = require('./../utils/parse-events-config')(cmds, app, data, lando);
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
  }).finally(() => {
    const run = _.first(
      _.filter(eventCommands, eventCommand => true === eventCommand.isInitEventCommand),
    );

    run.opts = {purge: true, mode: 'attach'};
    return injectable.engine.stop(run)
      .then(() => injectable.engine.destroy(run))
      .then(() => remove(path.dirname(run.compose[0])));
  });
};
