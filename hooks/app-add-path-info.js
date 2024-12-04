'use strict';

const {color} = require('listr2');

const {bold} = color;

module.exports = async (app, lando) => {
  // snag cli config
  const config = lando?.config?.cli;

  // push a message if the install path is not in the bin or is
  if (config?.installPath && require('../utils/get-bin-paths')(config).includes(config.installPath)) {
    app.addMessage({
      title: 'Lando update location not in PATH!',
      type: 'warning',
      detail: [
        `Lando cannot detect ${bold(config.installPath)} in ${bold('PATH')}!`,
        'This can prevent the CLI from updating correctly which in turn can',
        `cause other strange behavior like commands ${bold('disappearing')}.`,
        `We recommend you run the command below and ${bold('DO WHAT IT SAYS.')}`,
      ],
      command: 'lando shellenv --add',
    });
  }
};
