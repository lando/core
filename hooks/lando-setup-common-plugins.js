'use strict';

const merge = require('lodash/merge');

module.exports = async (lando, options) => {
  if (!options.skipCommonPlugins) {
    lando.log.debug('rebased install plugins %o on common ones %o', options.plugins, lando.config.setup.commonPlugins);
    options.plugins = merge({}, lando.config.setup.commonPlugins, options.plugins);
  }
};
