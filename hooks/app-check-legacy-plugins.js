'use strict';

module.exports = async app => {
  const Plugin = require('../components/plugin');
  const legacyPlugins = app.plugins.registry
    .map(plugin => new Plugin(plugin.dir))
    .filter(plugin => plugin.legacyPlugin)
    .map(plugin => plugin.name);

  // add legacy plugin notice if needed:
  if (legacyPlugins.length > 0) {
    app.addMessage(require('../messages/legacy-plugin-notice')(legacyPlugins));
  }
};

// https://docs.lando.dev/guides/updating-plugins-v4.html#lando-3-21-0
