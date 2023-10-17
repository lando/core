'use strict';

const _ = require('lodash');

module.exports = prefix => _(process.env)
  // Only muck with prefix_LANDO_CONFIG variables
  .pickBy((value, key) => _.includes(key, `${prefix}_PLUGIN_CONFIG`))
  // reduce into a single object
  .reduce((config, value, key) => {
    _.set(config, key.toLowerCase().replace('lando_plugin_config', 'pluginConfig').split('_').join('.'), value);
    return config;
  }, {pluginConfig: {}});
