'use strict';

module.exports = lando => {
  return {
    command: 'plugin-logout',
    level: 'tasks',
    run: async options => {
      const write = require('../../../utils/write-file');
      const {color} = require('listr2');

      // write an empty config file
      write(lando.config.pluginConfigFile, {});
      lando.log.debug('wrote empty config to %s', lando.config.pluginConfigFile);

      // tell the user what happened
      console.log(`All ${color.bold('managed sessions')} have been ${color.red('destroyed')}!`);
    },
  };
};
