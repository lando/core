'use strict';

const merge = require('lodash/merge');

module.exports = async (lando, options) => {
  // if truthy then skip
  if (options.skipCommonPlugins || options.skipCommonPlugins === 'true' || options.skipCommonPlugins === '1') return;
  // otherwise proceed
  lando.log.debug('rebased install plugins %o on common ones %o', options.plugins, lando.config.setup.commonPlugins);
  options.plugins = merge({}, lando.config.setup.commonPlugins, options.plugins);
};
