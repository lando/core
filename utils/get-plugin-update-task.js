'use strict';

const os = require('os');

// checks to see if a setting is disabled
module.exports = (plugin, {
  dir = os.tmpdir(),
  Plugin = require('../components/plugin'),
} = {}) => {
  // parse into a full package
  const pkg = require('./parse-package-name')(plugin);

  return {
    title: `Updating ${pkg.name} to v${pkg.peg}`,
    description: pkg.name,
    canInstall: async () => {
      const online = await require('is-online')();
      // throw error if not online
      if (!online) throw new Error('Cannot detect connection to internet!');
      // or true
      return true;
    },
    task: async (ctx, task) => {
      try {
        // add the plugin
        task.plugin = await require('./fetch-plugin')(plugin, {config: Plugin.config, dest: dir}, Plugin);
        // update and and return
        task.title = `Updated ${task.plugin.name} to v${task.plugin.version}`;
        return task.plugin;

      // if we have an error then add it to the status object and throw
      // @TODO: make sure we force remove any errered plugins?
      } catch (error) {
        error.plugin = task.plugin;
        throw error;
      }
    },
  };
};
